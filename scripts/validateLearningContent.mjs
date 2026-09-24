import crypto from 'node:crypto';
import fs from 'node:fs';

await import('../src/questionQualityRuntime.js');
await import('../src/semanticQuestionGuardRuntime.js');
await import('../src/diagnosticQuestionGuardRuntime.js');

const { gameModel } = await import('../src/gameModel.js');
const {
  buildContentBundle,
  canonicalJson,
  provenanceDebt,
  validateContentBundle
} = await import('../src/contentProvenanceRuntime.js');
const { auditQuestionAdversarially } = await import('../src/adversarialQuestionQa.js');

const contentVersion = process.env.STARBLOX_CONTENT_VERSION || 'bootstrap-current-bank-v1';
const strictProvenance = process.argv.includes('--strict-provenance');
const outArg = process.argv.find(arg => arg.startsWith('--out='));
const outPath = outArg ? outArg.slice('--out='.length) : '';

const questions = gameModel.buildQuestions();
const existingRuntimeIssues = gameModel.validateQuestionBank(questions);
const bundle = buildContentBundle(questions,{
  contentVersion,
  generatorSystem:'starblox-existing-bank',
  generatorVersion:'1',
  generatorSeed:0
});
const bundleIssues = validateContentBundle(bundle,{strictProvenance});

const adversarial = questions.map(question => ({
  id:question.id,
  ...auditQuestionAdversarially(question)
}));
const adversarialHardFindings = adversarial.flatMap(row =>
  row.hardFindings.map(finding => ({id:row.id,...finding}))
);
const adversarialSoftCount = adversarial.reduce(
  (sum,row) => sum + row.softFindings.length,
  0
);
const adversarialVariantCount = adversarial.reduce(
  (sum,row) => sum + row.variants.length,
  0
);

const canonicalBundle = canonicalJson(bundle);
const sha256 = crypto
  .createHash('sha256')
  .update(canonicalBundle)
  .digest('hex');

const receipt = {
  schemaVersion:'starblox-learning-validation-receipt-v1',
  contentVersion,
  questionCount:questions.length,
  contentFingerprint:bundle.contentFingerprint,
  sha256,
  existingRuntimeIssueCount:existingRuntimeIssues.length,
  bundleIssueCount:bundleIssues.length,
  adversarialHardFindingCount:adversarialHardFindings.length,
  adversarialSoftFindingCount:adversarialSoftCount,
  adversarialVariantCount,
  provenanceDebt:provenanceDebt(bundle),
  strictProvenance,
  existingRuntimeIssues,
  bundleIssues,
  adversarialHardFindings
};

if(outPath){
  fs.writeFileSync(outPath,JSON.stringify(receipt,null,2) + '\n','utf8');
}

process.stdout.write(JSON.stringify(receipt,null,2) + '\n');

if(
  existingRuntimeIssues.length ||
  bundleIssues.length ||
  adversarialHardFindings.length
){
  process.exitCode = 1;
}
