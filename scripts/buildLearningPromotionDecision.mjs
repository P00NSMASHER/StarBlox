import fs from 'node:fs';

function getArg(name){
  const prefix = '--' + name + '=';
  const found = process.argv.find(arg => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : '';
}

const comparisonPath = getArg('comparison');
const strictPath = getArg('strict');
const fsrsPath = getArg('fsrs');
const psiPath = getArg('psi');
const outPath = getArg('out');

if(!comparisonPath || !strictPath || !fsrsPath || !psiPath || !outPath){
  throw new Error('--comparison, --strict, --fsrs, --psi, and --out are required');
}

const comparison = JSON.parse(fs.readFileSync(comparisonPath,'utf8'));
const strict = JSON.parse(fs.readFileSync(strictPath,'utf8'));
const fsrs = JSON.parse(fs.readFileSync(fsrsPath,'utf8'));
const psi = JSON.parse(fs.readFileSync(psiPath,'utf8'));

if(comparison.datasetAuthorization !== 'synthetic-only-no-real-player-data'){
  throw new Error('unexpected dataset authorization');
}
if(comparison.promotionGate?.liveSelectorV2Allowed !== false){
  throw new Error('synthetic promotion run must never enable live Selector V2');
}
if(fsrs.engineVersion !== 'v3.3.1' || fsrs.cardCount <= 0){
  throw new Error('actual FSRS engine evidence missing');
}
if(psi.model !== 'AmortizedPSIKT' || psi.metrics?.predictionCount <= 0){
  throw new Error('PSI-KT training/inference evidence missing');
}
if(
  comparison.comparisonCohort?.evaluatedLearnerCount !==
  psi.selectorStateLearnerCount
){
  throw new Error('PSI selector-state cohort does not match comparison cohort');
}
if(comparison.comparisonCohort?.selectionStep !== psi.selectionStep){
  throw new Error('PSI selection step does not match comparison boundary');
}

const expectedFsrsCommands =
  comparison.comparisonCohort.sourceLearnerCount *
  comparison.comparisonCohort.selectionStep;
if(fsrs.commandCount !== expectedFsrsCommands){
  throw new Error('FSRS command count does not match observed selector prefix');
}
if(strict.provenanceDebt?.strictReady !== false){
  throw new Error(
    'live gate must remain blocked until external ABVM original is verified'
  );
}

const blockers = [
  'synthetic-only-evaluation',
  'abvm-external-original-unverified',
  'real-learner-efficacy-not-evaluated',
  'privacy-review-not-complete'
];
if(comparison.syntheticBenchmark?.supportive !== true){
  blockers.push('synthetic-selector-benchmark-not-supportive');
}

const decision = {
  schemaVersion:'starblox-learning-promotion-decision-v1',
  githubSha:process.env.GITHUB_SHA || null,
  liveSelectorV2Allowed:false,
  blockers,
  datasetAuthorization:comparison.datasetAuthorization,
  provenance:{
    snapshotReady:Boolean(strict.provenanceDebt?.snapshotReady),
    strictReady:Boolean(strict.provenanceDebt?.strictReady),
    externalOriginalUnverifiedIds:
      strict.provenanceDebt?.externalOriginalUnverifiedIds || []
  },
  comparisonCohort:comparison.comparisonCohort,
  syntheticBenchmark:comparison.syntheticBenchmark,
  policies:comparison.policies,
  fsrs:{
    engine:fsrs.engine,
    engineVersion:fsrs.engineVersion,
    commandCount:fsrs.commandCount,
    cardCount:fsrs.cardCount,
    evaluationAt:fsrs.evaluationAt,
    payloadSha256:fsrs.payloadSha256
  },
  psiKt:{
    model:psi.model,
    upstreamCommit:psi.upstreamCommit,
    epochs:psi.epochs,
    trainTimeRatio:psi.trainTimeRatio,
    selectionStep:psi.selectionStep,
    selectorStateLearnerCount:psi.selectorStateLearnerCount,
    selectorStateSkillCount:psi.selectorStateSkillCount,
    metrics:psi.metrics,
    modelStateSha256:psi.modelStateSha256,
    compatibility:{
      transition:psi.compatibilityShim,
      forward:psi.forwardCompatibilityShim,
      categorical:psi.categoricalCompatibilityShim,
      zeroWeightPriorEntropy:psi.priorEntropyCompatibilityShim,
      dataAlignment:psi.dataAlignmentShim
    }
  }
};

fs.writeFileSync(outPath,JSON.stringify(decision,null,2) + '\n','utf8');
process.stdout.write(JSON.stringify(decision,null,2) + '\n');
