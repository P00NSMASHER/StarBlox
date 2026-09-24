import fs from 'node:fs';

await import('../src/questionQualityRuntime.js');
await import('../src/semanticQuestionGuardRuntime.js');
await import('../src/diagnosticQuestionGuardRuntime.js');

const { gameModel } = await import('../src/gameModel.js');
const {
  pickQuestV2Shadow
} = await import('../src/selectorV2Shadow.js');

function getArg(name, fallback=''){
  const prefix = '--' + name + '=';
  const found = process.argv.find(arg => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function mean(values){
  return values.length
    ? values.reduce((sum,value) => sum + value,0) / values.length
    : 0;
}

function parseFsrsCards(receipt){
  const byPlayer = {};
  for(const card of receipt.cards || []){
    const separator = card.cardId.indexOf(':');
    if(separator < 0) continue;
    const player = card.cardId.slice(0,separator);
    const concept = card.cardId.slice(separator + 1);
    const skill = concept.startsWith('skill:') ? concept.slice('skill:'.length) : concept;
    byPlayer[player] ||= {};
    byPlayer[player][skill] = {
      due:Boolean(card.dueAtEvaluation),
      retrievability:Number(card.retrievability),
      stability:Number(card.stability),
      difficulty:Number(card.difficulty)
    };
  }
  return byPlayer;
}

function questMetrics(quest, truth, dueRows={}){
  const skills = quest.map(question => question.skill);
  const needs = skills.map(skill => 1 - Number(truth[skill] ?? 0.5));
  const weakestSkill = Object.entries(truth)
    .sort((a,b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]?.[0] || '';
  const dueSkills = Object.entries(dueRows)
    .filter(([,row]) => row.due)
    .map(([skill]) => skill);

  return {
    meanHiddenNeed:mean(needs),
    uniqueSkillCount:new Set(skills).size,
    weakestSkillHit:skills.includes(weakestSkill) ? 1 : 0,
    dueSkillCoverage:dueSkills.length
      ? dueSkills.filter(skill => skills.includes(skill)).length / dueSkills.length
      : 1,
    transferIncluded:quest.some(question => question.role === 'transfer') ? 1 : 0
  };
}

const evaluationPath = getArg('evaluation');
const psiPath = getArg('psi');
const fsrsPath = getArg('fsrs');
const outPath = getArg('out');

if(!evaluationPath || !psiPath || !fsrsPath || !outPath){
  throw new Error('--evaluation, --psi, --fsrs, and --out are required');
}

const evaluation = JSON.parse(fs.readFileSync(evaluationPath,'utf8'));
const psi = JSON.parse(fs.readFileSync(psiPath,'utf8'));
const fsrs = JSON.parse(fs.readFileSync(fsrsPath,'utf8'));

const reverseUserMap = Object.fromEntries(
  Object.entries(evaluation.userIdMap).map(([player,userId]) => [String(userId),player])
);
const fsrsByPlayer = parseFsrsCards(fsrs);
const psiByPlayer = {};
for(const [numericUser,skillPredictions] of Object.entries(psi.skillPredictions || {})){
  const player = reverseUserMap[String(numericUser)];
  if(player) psiByPlayer[player] = skillPredictions;
}

const evaluationLearners = evaluation.learners.filter(
  learner => Boolean(psiByPlayer[learner.playerLocalId])
);
if(!evaluationLearners.length){
  throw new Error('PSI-KT produced no held-out learner cohort for comparison');
}
for(const learner of evaluationLearners){
  const rows = psiByPlayer[learner.playerLocalId];
  const missing = evaluation.skills.filter(
    skill => !Number.isFinite(Number(rows[skill]))
  );
  if(missing.length){
    throw new Error(
      'incomplete PSI selector state for ' +
      learner.playerLocalId + ': ' + missing.join(',')
    );
  }
  if(
    !learner.selectionTruthMastery ||
    !learner.selectionBktMastery ||
    !learner.selectionStats
  ){
    throw new Error(
      'selector comparison requires decision-boundary snapshots for ' +
      learner.playerLocalId
    );
  }
}

const questions = gameModel.buildQuestions();
const now = Date.parse(fsrs.evaluationAt);
if(!Number.isFinite(now)){
  throw new Error('FSRS receipt is missing a valid evaluationAt timestamp');
}
const policies = {
  heuristic:[],
  bktShadow:[],
  psiFsrsV2:[]
};

for(const learner of evaluationLearners){
  const player = learner.playerLocalId;
  const dueRows = fsrsByPlayer[player] || {};
  const truthAtSelection = learner.selectionTruthMastery;
  const statsAtSelection = learner.selectionStats;
  const bktAtSelection = learner.selectionBktMastery;

  const heuristicQuest = gameModel.pickQuest(statsAtSelection,5,now);

  const bktProfile = {
    skills:Object.fromEntries(
      Object.keys(bktAtSelection).map(skill => [
        skill,
        {
          psiMastery:Number(bktAtSelection[skill]),
          psiUncertainty:0,
          fsrsDue:false,
          lastSeenAt:Number(statsAtSelection[skill]?.lastSeen || 0)
        }
      ])
    )
  };
  const bktQuest = pickQuestV2Shadow(questions,bktProfile,5,now);

  const psiRows = psiByPlayer[player] || {};
  const psiProfile = {
    skills:Object.fromEntries(
      evaluation.skills.map(skill => {
        const predicted = Number(psiRows[skill]);
        const fsrsState = dueRows[skill] || {};
        if(!Number.isFinite(predicted)){
          throw new Error('missing PSI mastery for ' + player + ':' + skill);
        }
        return [
          skill,
          {
            psiMastery:predicted,
            // The current PSI receipt does not expose calibrated posterior
            // uncertainty; do not substitute FSRS retrievability under a PSI
            // uncertainty label. FSRS contributes through its actual due state.
            psiUncertainty:0,
            fsrsDue:Boolean(fsrsState.due),
            lastSeenAt:Number(statsAtSelection[skill]?.lastSeen || 0)
          }
        ];
      })
    )
  };
  const psiQuest = pickQuestV2Shadow(questions,psiProfile,5,now);

  policies.heuristic.push(
    questMetrics(heuristicQuest,truthAtSelection,dueRows)
  );
  policies.bktShadow.push(
    questMetrics(bktQuest,truthAtSelection,dueRows)
  );
  policies.psiFsrsV2.push(
    questMetrics(psiQuest,truthAtSelection,dueRows)
  );
}

function aggregate(rows){
  return {
    learnerCount:rows.length,
    meanHiddenNeed:mean(rows.map(row => row.meanHiddenNeed)),
    meanUniqueSkillCount:mean(rows.map(row => row.uniqueSkillCount)),
    weakestSkillHitRate:mean(rows.map(row => row.weakestSkillHit)),
    dueSkillCoverage:mean(rows.map(row => row.dueSkillCoverage)),
    transferInclusionRate:mean(rows.map(row => row.transferIncluded))
  };
}

const aggregates = {
  currentHeuristic:aggregate(policies.heuristic),
  bktBackedShadow:aggregate(policies.bktShadow),
  psiKtFsrsSelectorV2:aggregate(policies.psiFsrsV2)
};

function metricDeltas(candidate,baseline){
  return {
    meanHiddenNeed:candidate.meanHiddenNeed - baseline.meanHiddenNeed,
    meanUniqueSkillCount:candidate.meanUniqueSkillCount - baseline.meanUniqueSkillCount,
    weakestSkillHitRate:candidate.weakestSkillHitRate - baseline.weakestSkillHitRate,
    dueSkillCoverage:candidate.dueSkillCoverage - baseline.dueSkillCoverage,
    transferInclusionRate:candidate.transferInclusionRate - baseline.transferInclusionRate
  };
}

const psiVsHeuristic = metricDeltas(
  aggregates.psiKtFsrsSelectorV2,
  aggregates.currentHeuristic
);
const psiVsBkt = metricDeltas(
  aggregates.psiKtFsrsSelectorV2,
  aggregates.bktBackedShadow
);

const syntheticBenchmarkSupportive = (
  psiVsHeuristic.meanHiddenNeed >= 0 &&
  psiVsHeuristic.weakestSkillHitRate >= 0 &&
  psiVsBkt.meanHiddenNeed >= 0 &&
  psiVsBkt.weakestSkillHitRate >= 0
);

const result = {
  schemaVersion:'starblox-selector-promotion-comparison-v1',
  datasetAuthorization:evaluation.authorization,
  sourceLearnerCount:evaluation.learnerCount,
  learnerCount:evaluationLearners.length,
  comparisonCohort:{
    type:'psi-kt-held-out-learners',
    sourceLearnerCount:evaluation.learnerCount,
    evaluatedLearnerCount:evaluationLearners.length,
    coverage:evaluationLearners.length / evaluation.learnerCount,
    selectionStep:evaluation.selectionStep,
    heldOutStepCount:evaluation.heldOutStepCount,
    evaluationAt:fsrs.evaluationAt
  },
  psiKt:{
    model:psi.model,
    upstreamCommit:psi.upstreamCommit,
    epochsRequested:psi.epochsRequested,
    epochsCompleted:psi.epochsCompleted,
    earlyStoppingPatience:psi.earlyStoppingPatience,
    stoppedEarly:psi.stoppedEarly,
    bestEpoch:psi.bestEpoch,
    bestValidationBce:psi.bestValidationBce,
    metrics:psi.metrics,
    modelStateSha256:psi.modelStateSha256,
    selectorStateLearnerCount:psi.selectorStateLearnerCount,
    selectorStateSkillCount:psi.selectorStateSkillCount
  },
  fsrs:{
    engine:fsrs.engine,
    engineVersion:fsrs.engineVersion,
    cardCount:fsrs.cardCount,
    commandCount:fsrs.commandCount,
    payloadSha256:fsrs.payloadSha256
  },
  policies:aggregates,
  syntheticBenchmark:{
    coreMetrics:['meanHiddenNeed','weakestSkillHitRate'],
    interpretation:'Higher is better for both core targeting metrics. Deltas are PSI+FSRS minus the named baseline.',
    psiVsCurrentHeuristic:psiVsHeuristic,
    psiVsBktBackedShadow:psiVsBkt,
    supportive:syntheticBenchmarkSupportive
  },
  promotionGate:{
    liveSelectorV2Allowed:false,
    reason:syntheticBenchmarkSupportive
      ? 'Synthetic evidence is not sufficient for live promotion. Real-learner efficacy, external ABVM provenance, and privacy review remain required.'
      : 'Synthetic PSI+FSRS targeting does not outperform the simpler baselines on the core targeting metrics. Live promotion is additionally blocked by real-learner efficacy, external ABVM provenance, and privacy review.'
  }
};

fs.writeFileSync(outPath,JSON.stringify(result,null,2) + '\n','utf8');
process.stdout.write(JSON.stringify(result,null,2) + '\n');
