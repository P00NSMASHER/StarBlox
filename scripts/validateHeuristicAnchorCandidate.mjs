import fs from 'node:fs';

await import('../src/questionQualityRuntime.js');
await import('../src/semanticQuestionGuardRuntime.js');
await import('../src/diagnosticQuestionGuardRuntime.js');

const { gameModel }=await import('../src/gameModel.js');
const { pickQuestV2Shadow }=await import('../src/selectorV2Shadow.js');
const {
  HEURISTIC_BKT_FSRS_ANCHOR_VERSION,
  HEURISTIC_BKT_FSRS_ANCHOR_MARGIN,
  HEURISTIC_BKT_FSRS_ANCHOR_RISK_WEIGHT,
  pickQuestHeuristicBktFsrsAnchorShadow
}=await import('../src/selectorHeuristicBktFsrsAnchorShadow.js');

function arg(name,fallback=''){
  const prefix='--'+name+'=';
  const found=process.argv.find(value=>value.startsWith(prefix));
  return found?found.slice(prefix.length):fallback;
}
function mean(values){
  return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;
}
function parseFsrs(receipt){
  const byPlayer={};
  for(const card of receipt.cards||[]){
    const separator=String(card.cardId).indexOf(':');
    if(separator<0)continue;
    const player=card.cardId.slice(0,separator);
    const concept=card.cardId.slice(separator+1);
    const skill=concept.startsWith('skill:')
      ?concept.slice('skill:'.length)
      :concept;
    byPlayer[player]||={};
    byPlayer[player][skill]={
      retrievability:Number(card.retrievability),
      due:Boolean(card.dueAtEvaluation)
    };
  }
  return byPlayer;
}
function questMetrics(quest,truth,dueRows={}){
  const skills=quest.map(question=>question.skill);
  const weakestSkill=Object.entries(truth)
    .sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]))[0]?.[0]||'';
  const dueSkills=Object.entries(dueRows)
    .filter(([,row])=>row.due)
    .map(([skill])=>skill);
  return {
    meanHiddenNeed:mean(skills.map(skill=>1-Number(truth[skill]??0.5))),
    weakestSkillHitRate:skills.includes(weakestSkill)?1:0,
    dueSkillCoverage:dueSkills.length
      ?dueSkills.filter(skill=>skills.includes(skill)).length/dueSkills.length
      :1,
    uniqueSkillCount:new Set(skills).size,
    transferInclusionRate:quest.some(question=>question.role==='transfer')?1:0
  };
}
function aggregate(rows){
  return {
    learnerCount:rows.length,
    meanHiddenNeed:mean(rows.map(row=>row.meanHiddenNeed)),
    weakestSkillHitRate:mean(rows.map(row=>row.weakestSkillHitRate)),
    dueSkillCoverage:mean(rows.map(row=>row.dueSkillCoverage)),
    uniqueSkillCount:mean(rows.map(row=>row.uniqueSkillCount)),
    transferInclusionRate:mean(rows.map(row=>row.transferInclusionRate))
  };
}
function delta(candidate,baseline){
  return {
    meanHiddenNeed:candidate.meanHiddenNeed-baseline.meanHiddenNeed,
    weakestSkillHitRate:candidate.weakestSkillHitRate-baseline.weakestSkillHitRate,
    dueSkillCoverage:candidate.dueSkillCoverage-baseline.dueSkillCoverage,
    uniqueSkillCount:candidate.uniqueSkillCount-baseline.uniqueSkillCount,
    transferInclusionRate:candidate.transferInclusionRate-baseline.transferInclusionRate
  };
}

const manifestPath=arg('manifest');
const evaluationPath=arg('evaluation');
const fsrsPath=arg('fsrs');
const outPath=arg('out');
if(!manifestPath||!evaluationPath||!fsrsPath||!outPath){
  throw new Error('--manifest, --evaluation, --fsrs, and --out are required');
}
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const evaluation=JSON.parse(fs.readFileSync(evaluationPath,'utf8'));
const fsrs=JSON.parse(fs.readFileSync(fsrsPath,'utf8'));

if(manifest.tuneAgainstThisCohort!==false){
  throw new Error('validation cohort must be no-tuning');
}
if(Number(manifest.seed)!==Number(evaluation.seed)){
  throw new Error('validation seed mismatch');
}
if((manifest.forbiddenSeeds||[]).includes(Number(evaluation.seed))){
  throw new Error('validation reused a forbidden seed');
}
if(manifest.candidate.selectorVersion!==HEURISTIC_BKT_FSRS_ANCHOR_VERSION){
  throw new Error('selector version drift');
}
if(Number(manifest.candidate.heuristicMargin)!==HEURISTIC_BKT_FSRS_ANCHOR_MARGIN){
  throw new Error('frozen heuristic margin drift');
}
if(Number(manifest.candidate.riskWeight)!==HEURISTIC_BKT_FSRS_ANCHOR_RISK_WEIGHT){
  throw new Error('frozen FSRS risk weight drift');
}
if(fsrs.engineVersion!=='v3.3.1'){
  throw new Error('validation requires pinned actual FSRS v3.3.1');
}

const now=Date.parse(fsrs.evaluationAt);
if(!Number.isFinite(now))throw new Error('invalid FSRS evaluationAt');
const fsrsByPlayer=parseFsrs(fsrs);
const questions=gameModel.dailyPool(now);

const rows={heuristic:[],bkt:[],candidate:[]};
for(const learner of evaluation.learners){
  const player=learner.playerLocalId;
  const truth=learner.selectionTruthMastery;
  const stats=learner.selectionStats;
  const bkt=learner.selectionBktMastery;
  if(!truth||!stats||!bkt)throw new Error('missing selection state for '+player);
  const dueRows=fsrsByPlayer[player]||{};
  const profile={skills:Object.fromEntries(
    evaluation.skills.map(skill=>[
      skill,{
        bktMastery:Number(bkt[skill]),
        psiMastery:Number(bkt[skill]),
        psiUncertainty:0,
        fsrsRetrievability:Number(dueRows[skill]?.retrievability),
        fsrsDue:Boolean(dueRows[skill]?.due),
        lastSeenAt:Number(stats[skill]?.lastSeen||0)
      }
    ])
  )};

  rows.heuristic.push(questMetrics(gameModel.pickQuest(stats,5,now),truth,dueRows));
  rows.bkt.push(questMetrics(pickQuestV2Shadow(questions,profile,5,now),truth,dueRows));
  rows.candidate.push(questMetrics(
    pickQuestHeuristicBktFsrsAnchorShadow(questions,stats,profile,5,now),
    truth,
    dueRows
  ));
}

const policies={
  currentHeuristic:aggregate(rows.heuristic),
  bktBackedShadow:aggregate(rows.bkt),
  frozenCandidate:aggregate(rows.candidate)
};
const deltas={
  candidateVsHeuristic:delta(policies.frozenCandidate,policies.currentHeuristic),
  candidateVsBkt:delta(policies.frozenCandidate,policies.bktBackedShadow)
};
const t=manifest.thresholds;
const checks={
  hiddenNeedVsHeuristic:deltas.candidateVsHeuristic.meanHiddenNeed>=Number(t.hiddenNeedVsHeuristicMin),
  weakestHitVsHeuristic:deltas.candidateVsHeuristic.weakestSkillHitRate>=Number(t.weakestHitVsHeuristicMin),
  hiddenNeedVsBkt:deltas.candidateVsBkt.meanHiddenNeed>=Number(t.hiddenNeedVsBktMin),
  weakestHitVsBkt:deltas.candidateVsBkt.weakestSkillHitRate>=Number(t.weakestHitVsBktMin),
  dueCoverageVsHeuristic:deltas.candidateVsHeuristic.dueSkillCoverage>=Number(t.dueCoverageVsHeuristicMin),
  fiveUniqueSkills:policies.frozenCandidate.uniqueSkillCount>=5,
  transferIncluded:policies.frozenCandidate.transferInclusionRate===1
};
const validationSupportive=Object.values(checks).every(Boolean);

const result={
  schemaVersion:'starblox-heuristic-anchor-development-validation-result-v1',
  validationOnly:true,
  tuneAgainstThisCohort:false,
  authorization:evaluation.authorization,
  benchmarkId:manifest.benchmarkId,
  seed:evaluation.seed,
  candidate:manifest.candidate,
  fsrs:{
    engine:fsrs.engine,
    engineVersion:fsrs.engineVersion,
    commandCount:fsrs.commandCount,
    cardCount:fsrs.cardCount,
    payloadSha256:fsrs.payloadSha256
  },
  policies,
  deltas,
  thresholds:t,
  checks,
  validationSupportive,
  promotionBoundary:{
    liveSelectorAllowed:false,
    note:validationSupportive
      ?'Independent development validation is supportive. A brand-new final holdout must be locked before any final evaluation.'
      :'Candidate failed independent development validation and must not proceed to a final holdout without a new development cycle.'
  }
};
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n','utf8');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
