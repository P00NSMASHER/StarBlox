import fs from 'node:fs';

function getArg(name){
  const prefix = '--' + name + '=';
  const found = process.argv.find(arg => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : '';
}

const manifestPath = getArg('manifest');
const evaluationPath = getArg('evaluation');
const comparisonPath = getArg('comparison');
const decisionPath = getArg('decision');

if(!manifestPath || !evaluationPath || !comparisonPath || !decisionPath){
  throw new Error('--manifest, --evaluation, --comparison, and --decision are required');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const evaluation = JSON.parse(fs.readFileSync(evaluationPath,'utf8'));
const comparison = JSON.parse(fs.readFileSync(comparisonPath,'utf8'));
const decision = JSON.parse(fs.readFileSync(decisionPath,'utf8'));

const failures = [];
const same = (actual,expected,label) => {
  if(actual !== expected){
    failures.push(label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }
};

same(manifest.status,'locked-evaluation-only','manifest status');
same(manifest.tuneAgainstThisCohort,false,'tuneAgainstThisCohort');
same(evaluation.authorization,manifest.authorization,'dataset authorization');
same(evaluation.seed,manifest.seed,'dataset seed');
same(evaluation.learnerCount,manifest.sourceLearnerCount,'source learner count');
same(evaluation.maxStep,manifest.maxStep,'max step');
same(evaluation.selectionStep,manifest.selectionStep,'selection step');
same(evaluation.heldOutStepCount,manifest.heldOutStepCount,'held-out step count');

same(
  comparison.comparisonCohort?.sourceLearnerCount,
  manifest.sourceLearnerCount,
  'comparison source learner count'
);
same(
  comparison.comparisonCohort?.evaluatedLearnerCount,
  manifest.expectedEvaluatedLearnerCount,
  'evaluated learner count'
);
same(
  comparison.comparisonCohort?.coverage,
  manifest.expectedCoverage,
  'comparison coverage'
);
same(
  comparison.comparisonCohort?.selectionStep,
  manifest.selectionStep,
  'comparison selection step'
);
same(
  comparison.comparisonCohort?.heldOutStepCount,
  manifest.heldOutStepCount,
  'comparison held-out step count'
);

const actualCore = comparison.syntheticBenchmark?.coreMetrics || [];
if(JSON.stringify(actualCore) !== JSON.stringify(manifest.coreMetrics)){
  failures.push(
    'core metrics: expected ' +
    JSON.stringify(manifest.coreMetrics) +
    ', got ' +
    JSON.stringify(actualCore)
  );
}

for(const policy of [manifest.candidatePolicy,...manifest.baselinePolicies]){
  if(!comparison.policies?.[policy]){
    failures.push('missing policy result: ' + policy);
  }
}

same(decision.datasetAuthorization,manifest.authorization,'decision authorization');
same(
  decision.comparisonCohort?.selectionStep,
  manifest.selectionStep,
  'decision selection step'
);
same(
  decision.comparisonCohort?.heldOutStepCount,
  manifest.heldOutStepCount,
  'decision held-out step count'
);
same(decision.liveSelectorV2Allowed,false,'live Selector V2 boundary');

if(failures.length){
  throw new Error(
    'Locked promotion benchmark drift detected:\n- ' + failures.join('\n- ')
  );
}

process.stdout.write(JSON.stringify({
  schemaVersion:'starblox-locked-promotion-benchmark-check-v1',
  benchmarkId:manifest.benchmarkId,
  locked:true,
  evaluationOnly:true,
  seed:manifest.seed,
  sourceLearnerCount:manifest.sourceLearnerCount,
  evaluatedLearnerCount:manifest.expectedEvaluatedLearnerCount,
  selectionStep:manifest.selectionStep,
  heldOutStepCount:manifest.heldOutStepCount,
  coreMetrics:manifest.coreMetrics,
  liveSelectorV2Allowed:false
},null,2) + '\n');
