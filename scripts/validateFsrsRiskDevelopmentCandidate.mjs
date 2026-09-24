import fs from 'node:fs';

await import('../src/questionQualityRuntime.js');
await import('../src/semanticQuestionGuardRuntime.js');
await import('../src/diagnosticQuestionGuardRuntime.js');

const { gameModel } = await import('../src/gameModel.js');

const arg=name=>{
  const p='--'+name+'=';
  const v=process.argv.find(x=>x.startsWith(p));
  return v?v.slice(p.length):'';
};
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));

function parseFsrs(receipt){
  const out={};
  for(const card of receipt.cards||[]){
    const i=String(card.cardId).indexOf(':');
    if(i<0)continue;
    const player=String(card.cardId).slice(0,i);
    const concept=String(card.cardId).slice(i+1);
    const skill=concept.startsWith('skill:')?concept.slice(6):concept;
    const r=Number(card.retrievability);
    out[player]||={};
    out[player][skill]={
      due:Boolean(card.dueAtEvaluation),
      risk:Number.isFinite(r)?1-clamp(r):(card.dueAtEvaluation?1:0)
    };
  }
  return out;
}

function score(question,bkt,stats,fsrs,now,riskWeight){
  const DAY=86400000,HOUR=3600000;
  const mastery=clamp(bkt[question.skill]);
  const risk=clamp(fsrs[question.skill]?.risk);
  const lastSeen=Math.max(0,Number(stats[question.skill]?.lastSeen)||0);
  const age=lastSeen?Math.max(0,(now-lastSeen)/DAY):30;
  const recent=Boolean(lastSeen&&now-lastSeen<12*HOUR);
  return (
    (1-mastery)*50 +
    risk*Number(riskWeight) +
    Math.min(15,age*2) +
    (question.role==='transfer'?8:0) +
    (question.role==='review'?4:0) -
    (recent?40:0)
  );
}
function pick(questions,bkt,stats,fsrs,count,now,riskWeight){
  const ranked=[...questions]
    .map(question=>({question,score:score(question,bkt,stats,fsrs,now,riskWeight)}))
    .sort((a,b)=>b.score-a.score||String(a.question.id).localeCompare(String(b.question.id)));
  const picked=[];
  const take=predicate=>{
    const row=ranked.find(({question})=>
      !picked.some(x=>x.id===question.id)&&predicate(question)
    );
    if(row)picked.push(row.question);
  };
  take(q=>q.role==='transfer');
  ['Lantern Lane','Story Street','Wordwood Garden'].forEach(d=>{
    if(picked.length<count)take(q=>q.district===d&&!picked.some(x=>x.skill===q.skill));
  });
  ranked.forEach(({question})=>{
    if(picked.length<count&&!picked.some(x=>x.id===question.id)&&!picked.some(x=>x.skill===question.skill)){
      picked.push(question);
    }
  });
  ranked.forEach(({question})=>{
    if(picked.length<count&&!picked.some(x=>x.id===question.id))picked.push(question);
  });
  return picked.slice(0,count);
}
function metrics(quest,truth,fsrs){
  const skills=quest.map(q=>q.skill);
  const weakest=Object.entries(truth)
    .sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]))[0]?.[0]||'';
  const due=Object.entries(fsrs).filter(([,v])=>v.due).map(([s])=>s);
  return {
    meanHiddenNeed:mean(skills.map(s=>1-Number(truth[s]??0.5))),
    weakestSkillHit:skills.includes(weakest)?1:0,
    dueSkillCoverage:due.length?due.filter(s=>skills.includes(s)).length/due.length:1,
    meanSelectedForgettingRisk:mean(skills.map(s=>Number(fsrs[s]?.risk)||0))
  };
}
function aggregate(rows){
  return {
    learnerCount:rows.length,
    meanHiddenNeed:mean(rows.map(r=>r.meanHiddenNeed)),
    weakestSkillHitRate:mean(rows.map(r=>r.weakestSkillHit)),
    dueSkillCoverage:mean(rows.map(r=>r.dueSkillCoverage)),
    meanSelectedForgettingRisk:mean(rows.map(r=>r.meanSelectedForgettingRisk))
  };
}

const evaluation=JSON.parse(fs.readFileSync(arg('evaluation'),'utf8'));
const fsrs=JSON.parse(fs.readFileSync(arg('fsrs'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(arg('manifest'),'utf8'));
const out=arg('out');
if(manifest.status!=='development-validation-no-tuning'||manifest.tuneAgainstThisCohort!==false){
  throw new Error('FSRS candidate must be frozen before validation');
}
if(Number(evaluation.seed)!==Number(manifest.seed))throw new Error('seed mismatch');
if(Number(evaluation.seed)===Number(manifest.forbiddenFinalHoldoutSeed))throw new Error('final holdout seed forbidden');
const weight=Number(manifest.frozenFsrsRiskWeight);

const byPlayer=parseFsrs(fsrs);
const questions=gameModel.buildQuestions();
const now=Date.parse(fsrs.evaluationAt);
const rows={currentHeuristic:[],bktNoFsrsRisk:[],frozenBktFsrsRisk:[]};

for(const learner of evaluation.learners){
  if(!learner.selectionTruthMastery||!learner.selectionBktMastery||!learner.selectionStats)continue;
  const states=byPlayer[learner.playerLocalId]||{};
  if(!Object.keys(states).length)continue;
  const heuristic=gameModel.pickQuest(learner.selectionStats,5,now);
  const baseline=pick(questions,learner.selectionBktMastery,learner.selectionStats,states,5,now,0);
  const candidate=pick(questions,learner.selectionBktMastery,learner.selectionStats,states,5,now,weight);
  rows.currentHeuristic.push(metrics(heuristic,learner.selectionTruthMastery,states));
  rows.bktNoFsrsRisk.push(metrics(baseline,learner.selectionTruthMastery,states));
  rows.frozenBktFsrsRisk.push(metrics(candidate,learner.selectionTruthMastery,states));
}
const policies=Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,aggregate(v)]));
const c=policies.frozenBktFsrsRisk,b=policies.bktNoFsrsRisk,h=policies.currentHeuristic;
const result={
  schemaVersion:'starblox-fsrs-risk-development-validation-v1',
  validationOnly:true,
  tuneAgainstThisCohort:false,
  benchmarkId:manifest.benchmarkId,
  seed:evaluation.seed,
  frozenFsrsRiskWeight:weight,
  policies,
  deltas:{
    candidateVsBkt:{
      meanHiddenNeed:c.meanHiddenNeed-b.meanHiddenNeed,
      weakestSkillHitRate:c.weakestSkillHitRate-b.weakestSkillHitRate,
      dueSkillCoverage:c.dueSkillCoverage-b.dueSkillCoverage,
      meanSelectedForgettingRisk:c.meanSelectedForgettingRisk-b.meanSelectedForgettingRisk
    },
    candidateVsHeuristic:{
      meanHiddenNeed:c.meanHiddenNeed-h.meanHiddenNeed,
      weakestSkillHitRate:c.weakestSkillHitRate-h.weakestSkillHitRate,
      dueSkillCoverage:c.dueSkillCoverage-h.dueSkillCoverage
    }
  },
  validationSupportive:(
    c.meanHiddenNeed>=b.meanHiddenNeed &&
    c.weakestSkillHitRate>=b.weakestSkillHitRate &&
    c.meanHiddenNeed>=h.meanHiddenNeed &&
    c.weakestSkillHitRate>=h.weakestSkillHitRate
  ),
  promotionBoundary:{
    liveSelectorV2Allowed:false,
    note:'Independent development validation only. Supportive evidence still requires a new untouched final holdout.'
  }
};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n','utf8');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
