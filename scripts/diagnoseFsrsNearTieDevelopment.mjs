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
      retrievability:Number.isFinite(r)?clamp(r):1,
      risk:Number.isFinite(r)?1-clamp(r):0
    };
  }
  return out;
}

function baseScore(question,bkt,stats,now){
  const DAY=86400000,HOUR=3600000;
  const mastery=clamp(bkt[question.skill]);
  const lastSeen=Math.max(0,Number(stats[question.skill]?.lastSeen)||0);
  const age=lastSeen?Math.max(0,(now-lastSeen)/DAY):30;
  const recent=Boolean(lastSeen&&now-lastSeen<12*HOUR);
  return (
    (1-mastery)*50 +
    Math.min(15,age*2) +
    (question.role==='transfer'?8:0) +
    (question.role==='review'?4:0) -
    (recent?40:0)
  );
}

function score(question,bkt,stats,fsrs,now,riskMargin){
  const base=baseScore(question,bkt,stats,now);
  const risk=clamp(fsrs[question.skill]?.risk);
  return base + risk*Number(riskMargin);
}

function pick(questions,bkt,stats,fsrs,count,now,riskMargin){
  const ranked=[...questions]
    .map(question=>({
      question,
      score:score(question,bkt,stats,fsrs,now,riskMargin)
    }))
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
    if(picked.length<count){
      take(q=>q.district===d&&!picked.some(x=>x.skill===q.skill));
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
const out=arg('out');

if(Number(evaluation.seed)===20261103||Number(evaluation.seed)===20270217){
  throw new Error('locked final-holdout seed forbidden in development');
}

const byPlayer=parseFsrs(fsrs);
const questions=gameModel.buildQuestions();
const now=Date.parse(fsrs.evaluationAt);
const margins=[0,1,2,3,5,8,10,15,20];
const rows=Object.fromEntries(margins.map(m=>[String(m),[]]));

for(const learner of evaluation.learners){
  if(!learner.selectionTruthMastery||!learner.selectionBktMastery||!learner.selectionStats)continue;
  const states=byPlayer[learner.playerLocalId]||{};
  if(!Object.keys(states).length)continue;
  for(const margin of margins){
    const quest=pick(
      questions,
      learner.selectionBktMastery,
      learner.selectionStats,
      states,
      5,
      now,
      margin
    );
    rows[String(margin)].push(metrics(quest,learner.selectionTruthMastery,states));
  }
}

const candidates=Object.fromEntries(
  margins.map(m=>[String(m),aggregate(rows[String(m)])])
);
const baseline=candidates['0'];
const ranked=margins
  .filter(m=>m>0)
  .map(m=>({
    riskMargin:m,
    ...candidates[String(m)],
    hiddenNeedDeltaVsBkt:candidates[String(m)].meanHiddenNeed-baseline.meanHiddenNeed,
    weakestSkillDeltaVsBkt:candidates[String(m)].weakestSkillHitRate-baseline.weakestSkillHitRate
  }))
  .sort((a,b)=>
    b.weakestSkillHitRate-a.weakestSkillHitRate ||
    b.meanHiddenNeed-a.meanHiddenNeed ||
    b.meanSelectedForgettingRisk-a.meanSelectedForgettingRisk ||
    a.riskMargin-b.riskMargin
  );

const result={
  schemaVersion:'starblox-fsrs-near-tie-development-diagnostic-v1',
  developmentOnly:true,
  seed:evaluation.seed,
  interpretation:'BKT remains the primary score. Continuous FSRS forgetting risk contributes at most riskMargin points because risk is bounded to [0,1].',
  candidates,
  bestDevelopmentCandidate:ranked[0],
  promotionBoundary:{
    liveSelectorAllowed:false,
    note:'Development tuning only; locked final-holdout seeds are forbidden.'
  }
};

fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n','utf8');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
