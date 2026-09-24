import fs from 'node:fs';

await import('../src/questionQualityRuntime.js');
await import('../src/semanticQuestionGuardRuntime.js');
await import('../src/diagnosticQuestionGuardRuntime.js');

const { gameModel } = await import('../src/gameModel.js');

function arg(name){
  const p='--'+name+'=';
  const v=process.argv.find(x=>x.startsWith(p));
  return v?v.slice(p.length):'';
}
function mean(xs){return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;}
function clamp01(v){return Math.max(0,Math.min(1,Number(v)||0));}

function parseFsrs(receipt){
  const byPlayer={};
  for(const card of receipt.cards||[]){
    const first=String(card.cardId).indexOf(':');
    if(first<0) continue;
    const player=String(card.cardId).slice(0,first);
    const concept=String(card.cardId).slice(first+1);
    const skill=concept.startsWith('skill:')?concept.slice(6):concept;
    byPlayer[player]||={};
    const retr=Number(card.retrievability);
    byPlayer[player][skill]={
      due:Boolean(card.dueAtEvaluation),
      retrievability:Number.isFinite(retr)?clamp01(retr):null,
      risk:Number.isFinite(retr)?1-clamp01(retr):(card.dueAtEvaluation?1:0)
    };
  }
  return byPlayer;
}

function score(question,bkt,stats,fsrs,now,riskWeight){
  const DAY=86400000,HOUR=3600000;
  const mastery=clamp01(bkt[question.skill]);
  const risk=clamp01(fsrs[question.skill]?.risk);
  const lastSeen=Math.max(0,Number(stats[question.skill]?.lastSeen)||0);
  const ageDays=lastSeen?Math.max(0,(now-lastSeen)/DAY):30;
  const recent=Boolean(lastSeen&&now-lastSeen<12*HOUR);
  return (
    (1-mastery)*50 +
    risk*Number(riskWeight) +
    Math.min(15,ageDays*2) +
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
  ['Lantern Lane','Story Street','Wordwood Garden'].forEach(district=>{
    if(picked.length<count){
      take(q=>q.district===district&&!picked.some(x=>x.skill===q.skill));
    }
  });
  ranked.forEach(({question})=>{
    if(
      picked.length<count &&
      !picked.some(x=>x.id===question.id) &&
      !picked.some(x=>x.skill===question.skill)
    )picked.push(question);
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
  const dueSkills=Object.entries(fsrs).filter(([,v])=>v.due).map(([s])=>s);
  const risks=skills.map(skill=>Number(fsrs[skill]?.risk)||0);
  return {
    meanHiddenNeed:mean(skills.map(skill=>1-Number(truth[skill]??0.5))),
    weakestSkillHit:skills.includes(weakest)?1:0,
    dueSkillCoverage:dueSkills.length
      ?dueSkills.filter(skill=>skills.includes(skill)).length/dueSkills.length
      :1,
    meanSelectedForgettingRisk:mean(risks)
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
const out=arg('out');
if(Number(evaluation.seed)===20261103)throw new Error('final holdout seed forbidden');

const fsrsByPlayer=parseFsrs(fsrs);
const questions=gameModel.buildQuestions();
const now=Date.parse(fsrs.evaluationAt);
const weights=[0,5,10,20,30,40,60,80];
const rows=Object.fromEntries(weights.map(w=>[String(w),[]]));
const stateRows=[];

for(const learner of evaluation.learners){
  if(!learner.selectionTruthMastery||!learner.selectionBktMastery||!learner.selectionStats)continue;
  const player=learner.playerLocalId;
  const states=fsrsByPlayer[player]||{};
  const stateValues=Object.values(states);
  if(!stateValues.length)continue;
  stateRows.push({
    dueCount:stateValues.filter(v=>v.due).length,
    meanRisk:mean(stateValues.map(v=>v.risk)),
    minRisk:Math.min(...stateValues.map(v=>v.risk)),
    maxRisk:Math.max(...stateValues.map(v=>v.risk))
  });
  for(const weight of weights){
    const quest=pick(
      questions,
      learner.selectionBktMastery,
      learner.selectionStats,
      states,
      5,now,weight
    );
    rows[String(weight)].push(metrics(quest,learner.selectionTruthMastery,states));
  }
}

const candidates=Object.fromEntries(
  weights.map(w=>[String(w),aggregate(rows[String(w)])])
);
const ranked=weights.map(weight=>({weight,...candidates[String(weight)]}))
  .sort((a,b)=>
    b.weakestSkillHitRate-a.weakestSkillHitRate ||
    b.meanHiddenNeed-a.meanHiddenNeed ||
    b.meanSelectedForgettingRisk-a.meanSelectedForgettingRisk ||
    a.weight-b.weight
  );

const result={
  schemaVersion:'starblox-fsrs-risk-development-diagnostic-v1',
  developmentOnly:true,
  seed:evaluation.seed,
  fsrs:{
    engine:fsrs.engine,
    engineVersion:fsrs.engineVersion,
    cardCount:fsrs.cardCount,
    commandCount:fsrs.commandCount
  },
  stateDistribution:{
    learnerCount:stateRows.length,
    meanDueSkills:mean(stateRows.map(r=>r.dueCount)),
    minDueSkills:Math.min(...stateRows.map(r=>r.dueCount)),
    maxDueSkills:Math.max(...stateRows.map(r=>r.dueCount)),
    meanForgettingRisk:mean(stateRows.map(r=>r.meanRisk)),
    meanMinRisk:mean(stateRows.map(r=>r.minRisk)),
    meanMaxRisk:mean(stateRows.map(r=>r.maxRisk))
  },
  riskWeightSweep:{
    interpretation:'BKT mastery fixed. FSRS contributes continuous (1-retrievability) multiplied by riskWeight.',
    candidates,
    bestDevelopmentCandidate:ranked[0]
  },
  promotionBoundary:{
    liveSelectorV2Allowed:false,
    note:'Development-only FSRS ablation. Any frozen candidate needs independent validation and a new untouched final holdout.'
  }
};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n','utf8');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
