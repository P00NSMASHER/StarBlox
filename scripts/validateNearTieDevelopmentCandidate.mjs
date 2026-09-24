import fs from 'node:fs';

await import('../src/questionQualityRuntime.js');
await import('../src/semanticQuestionGuardRuntime.js');
await import('../src/diagnosticQuestionGuardRuntime.js');

const { gameModel } = await import('../src/gameModel.js');
const {
  BKT_FSRS_NEAR_TIE_SELECTOR_VERSION,
  BKT_FSRS_NEAR_TIE_MARGIN,
  pickQuestBktFsrsNearTieShadow
} = await import('../src/selectorBktFsrsNearTieShadow.js');

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
      retrievability:Number.isFinite(r)?clamp(r):1
    };
  }
  return out;
}

function profile(bkt,stats,fsrs){
  return {
    skills:Object.fromEntries(Object.keys(bkt).map(skill=>[
      skill,{
        bktMastery:Number(bkt[skill]),
        fsrsRetrievability:Number(fsrs[skill]?.retrievability),
        lastSeenAt:Number(stats[skill]?.lastSeen||0)
      }
    ]))
  };
}

function metrics(quest,truth,fsrs){
  const skills=quest.map(q=>q.skill);
  const weakest=Object.entries(truth)
    .sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]))[0]?.[0]||'';
  const due=Object.entries(fsrs).filter(([,v])=>v.due).map(([s])=>s);
  return {
    meanHiddenNeed:mean(skills.map(s=>1-Number(truth[s]??0.5))),
    weakestSkillHit:skills.includes(weakest)?1:0,
    dueSkillCoverage:due.length?due.filter(s=>skills.includes(s)).length/due.length:1
  };
}
function aggregate(rows){
  return {
    learnerCount:rows.length,
    meanHiddenNeed:mean(rows.map(r=>r.meanHiddenNeed)),
    weakestSkillHitRate:mean(rows.map(r=>r.weakestSkillHit)),
    dueSkillCoverage:mean(rows.map(r=>r.dueSkillCoverage))
  };
}

const manifest=JSON.parse(fs.readFileSync(arg('manifest'),'utf8'));
const evaluation=JSON.parse(fs.readFileSync(arg('evaluation'),'utf8'));
const fsrs=JSON.parse(fs.readFileSync(arg('fsrs'),'utf8'));
const out=arg('out');

if(manifest.status!=='development-validation-no-tuning'||manifest.tuneAgainstThisCohort!==false){
  throw new Error('validation governance invalid');
}
if(Number(evaluation.seed)!==Number(manifest.seed))throw new Error('seed mismatch');
if((manifest.forbiddenFinalHoldoutSeeds||[]).includes(Number(evaluation.seed))){
  throw new Error('locked final holdout seed forbidden');
}
if(BKT_FSRS_NEAR_TIE_SELECTOR_VERSION!==manifest.candidate.selectorVersion)throw new Error('selector version drift');
if(BKT_FSRS_NEAR_TIE_MARGIN!==Number(manifest.candidate.riskMargin))throw new Error('margin drift');

const byPlayer=parseFsrs(fsrs);
const questions=gameModel.buildQuestions();
const now=Date.parse(fsrs.evaluationAt);
const rows={currentHeuristic:[],bktBaseline:[],nearTie3:[]};

for(const learner of evaluation.learners){
  const truth=learner.selectionTruthMastery;
  const bkt=learner.selectionBktMastery;
  const stats=learner.selectionStats;
  if(!truth||!bkt||!stats)throw new Error('missing decision state');
  const states=byPlayer[learner.playerLocalId]||{};
  if(!Object.keys(states).length)throw new Error('missing FSRS state');

  const p=profile(bkt,stats,states);
  const heuristic=gameModel.pickQuest(stats,5,now);
  const baseline=pickQuestBktFsrsNearTieShadow(
    questions,p,5,now,{riskMargin:0}
  );
  const candidate=pickQuestBktFsrsNearTieShadow(questions,p,5,now);

  rows.currentHeuristic.push(metrics(heuristic,truth,states));
  rows.bktBaseline.push(metrics(baseline,truth,states));
  rows.nearTie3.push(metrics(candidate,truth,states));
}

const policies=Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,aggregate(v)]));
const c=policies.nearTie3,b=policies.bktBaseline,h=policies.currentHeuristic;
const deltas={
  candidateVsBkt:{
    meanHiddenNeed:c.meanHiddenNeed-b.meanHiddenNeed,
    weakestSkillHitRate:c.weakestSkillHitRate-b.weakestSkillHitRate,
    dueSkillCoverage:c.dueSkillCoverage-b.dueSkillCoverage
  },
  candidateVsHeuristic:{
    meanHiddenNeed:c.meanHiddenNeed-h.meanHiddenNeed,
    weakestSkillHitRate:c.weakestSkillHitRate-h.weakestSkillHitRate,
    dueSkillCoverage:c.dueSkillCoverage-h.dueSkillCoverage
  }
};
const supportive=(
  deltas.candidateVsBkt.meanHiddenNeed>=0 &&
  deltas.candidateVsBkt.weakestSkillHitRate>=0 &&
  deltas.candidateVsHeuristic.meanHiddenNeed>=0 &&
  deltas.candidateVsHeuristic.weakestSkillHitRate>=0
);

const result={
  schemaVersion:'starblox-near-tie-development-validation-result-v1',
  validationOnly:true,
  tuneAgainstThisCohort:false,
  benchmarkId:manifest.benchmarkId,
  seed:evaluation.seed,
  selectorVersion:BKT_FSRS_NEAR_TIE_SELECTOR_VERSION,
  riskMargin:BKT_FSRS_NEAR_TIE_MARGIN,
  policies,
  deltas,
  validationSupportive:supportive,
  promotionBoundary:{
    liveSelectorAllowed:false,
    note:'Development validation only. A supportive result is not live-promotion evidence.'
  }
};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n','utf8');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
