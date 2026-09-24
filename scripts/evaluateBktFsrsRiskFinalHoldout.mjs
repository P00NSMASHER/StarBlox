import fs from 'node:fs';

await import('../src/questionQualityRuntime.js');
await import('../src/semanticQuestionGuardRuntime.js');
await import('../src/diagnosticQuestionGuardRuntime.js');

const { gameModel } = await import('../src/gameModel.js');
const {
  BKT_FSRS_RISK_SELECTOR_VERSION,
  BKT_FSRS_RISK_WEIGHT,
  pickQuestBktFsrsRiskShadow
} = await import('../src/selectorBktFsrsRiskShadow.js');

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
    dueSkillCoverage:due.length?due.filter(s=>skills.includes(s)).length/due.length:1,
    meanSelectedForgettingRisk:mean(skills.map(s=>Number(fsrs[s]?.risk)||0)),
    uniqueSkillCount:new Set(skills).size,
    transferIncluded:quest.some(q=>q.role==='transfer')?1:0
  };
}
function aggregate(rows){
  return {
    learnerCount:rows.length,
    meanHiddenNeed:mean(rows.map(r=>r.meanHiddenNeed)),
    weakestSkillHitRate:mean(rows.map(r=>r.weakestSkillHit)),
    dueSkillCoverage:mean(rows.map(r=>r.dueSkillCoverage)),
    meanSelectedForgettingRisk:mean(rows.map(r=>r.meanSelectedForgettingRisk)),
    meanUniqueSkillCount:mean(rows.map(r=>r.uniqueSkillCount)),
    transferInclusionRate:mean(rows.map(r=>r.transferIncluded))
  };
}

const manifest=JSON.parse(fs.readFileSync(arg('manifest'),'utf8'));
const evaluation=JSON.parse(fs.readFileSync(arg('evaluation'),'utf8'));
const fsrs=JSON.parse(fs.readFileSync(arg('fsrs'),'utf8'));
const out=arg('out');

if(manifest.status!=='locked-evaluation-only'||manifest.finalHoldout!==true||manifest.tuneAgainstThisCohort!==false){
  throw new Error('final holdout governance invalid');
}
if(Number(evaluation.seed)!==Number(manifest.seed))throw new Error('final holdout seed mismatch');
if(BKT_FSRS_RISK_SELECTOR_VERSION!==manifest.candidate.selectorVersion)throw new Error('selector version drift');
if(BKT_FSRS_RISK_WEIGHT!==Number(manifest.candidate.fsrsRiskWeight))throw new Error('risk weight drift');

const byPlayer=parseFsrs(fsrs);
const questions=gameModel.buildQuestions();
const now=Date.parse(fsrs.evaluationAt);
const rows={currentHeuristic:[],bktNoFsrsRisk:[],frozenBktFsrsRisk40:[]};

for(const learner of evaluation.learners){
  if(!learner.selectionTruthMastery||!learner.selectionBktMastery||!learner.selectionStats){
    throw new Error('missing selection-boundary state for '+learner.playerLocalId);
  }
  const states=byPlayer[learner.playerLocalId]||{};
  if(!Object.keys(states).length)throw new Error('missing FSRS state');
  const p=profile(learner.selectionBktMastery,learner.selectionStats,states);
  const heuristic=gameModel.pickQuest(learner.selectionStats,5,now);
  const baseline=pickQuestBktFsrsRiskShadow(questions,p,5,now,{riskWeight:0});
  const candidate=pickQuestBktFsrsRiskShadow(questions,p,5,now);
  rows.currentHeuristic.push(metrics(heuristic,learner.selectionTruthMastery,states));
  rows.bktNoFsrsRisk.push(metrics(baseline,learner.selectionTruthMastery,states));
  rows.frozenBktFsrsRisk40.push(metrics(candidate,learner.selectionTruthMastery,states));
}

const policies=Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,aggregate(v)]));
const c=policies.frozenBktFsrsRisk40,b=policies.bktNoFsrsRisk,h=policies.currentHeuristic;
const deltas={
  candidateVsHeuristic:{
    meanHiddenNeed:c.meanHiddenNeed-h.meanHiddenNeed,
    weakestSkillHitRate:c.weakestSkillHitRate-h.weakestSkillHitRate,
    dueSkillCoverage:c.dueSkillCoverage-h.dueSkillCoverage
  },
  candidateVsBkt:{
    meanHiddenNeed:c.meanHiddenNeed-b.meanHiddenNeed,
    weakestSkillHitRate:c.weakestSkillHitRate-b.weakestSkillHitRate,
    dueSkillCoverage:c.dueSkillCoverage-b.dueSkillCoverage
  }
};
const t=manifest.acceptanceThresholds;
const acceptance={
  meanHiddenNeedVsHeuristic:
    deltas.candidateVsHeuristic.meanHiddenNeed>=Number(t.minMeanHiddenNeedGainVsHeuristic),
  weakestSkillVsHeuristic:
    deltas.candidateVsHeuristic.weakestSkillHitRate>=Number(t.minWeakestSkillHitGainVsHeuristic),
  meanHiddenNeedVsBkt:
    deltas.candidateVsBkt.meanHiddenNeed>=Number(t.minMeanHiddenNeedGainVsBkt),
  weakestSkillVsBkt:
    deltas.candidateVsBkt.weakestSkillHitRate>=Number(t.minWeakestSkillHitGainVsBkt),
  dueCoverageGuardrail:
    deltas.candidateVsHeuristic.dueSkillCoverage>=-Number(t.maxDueSkillCoverageLossVsHeuristic)
};
const finalHoldoutSupportive=Object.values(acceptance).every(Boolean);

const blockers=[
  'synthetic-only-evaluation',
  'abvm-external-original-unverified',
  'real-learner-efficacy-not-evaluated',
  'privacy-review-not-complete'
];
if(!finalHoldoutSupportive)blockers.push('new-final-holdout-not-supportive');

const result={
  schemaVersion:'starblox-bkt-fsrs-risk-final-holdout-result-v1',
  benchmarkId:manifest.benchmarkId,
  authorization:evaluation.authorization,
  seed:evaluation.seed,
  selectorVersion:BKT_FSRS_RISK_SELECTOR_VERSION,
  fsrsRiskWeight:BKT_FSRS_RISK_WEIGHT,
  fsrs:{
    engine:fsrs.engine,
    engineVersion:fsrs.engineVersion,
    commandCount:fsrs.commandCount,
    cardCount:fsrs.cardCount,
    payloadSha256:fsrs.payloadSha256
  },
  policies,
  deltas,
  acceptanceThresholds:t,
  acceptance,
  finalHoldoutSupportive,
  promotionDecision:{
    liveSelectorAllowed:false,
    blockers,
    reason:finalHoldoutSupportive
      ?'Synthetic final holdout is supportive, but synthetic evidence cannot authorize live selection and external provenance/real-learner/privacy blockers remain.'
      :'Frozen candidate failed one or more predeclared final-holdout acceptance thresholds.'
  }
};

fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n','utf8');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
