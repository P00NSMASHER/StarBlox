import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {
  buildSchoolworkQuestionCatalog,
  makeSchoolworkReviewReceipt,
  selectActiveSchoolworkQuestions,
  validateSanitizedSchoolworkPack
} from '../src/schoolworkPhoto/schoolworkPhotoPipeline.js';
import {
  applySchoolworkReviewGate,
  validateSchoolworkReviewQueue
} from '../src/schoolworkPhoto/schoolworkPhotoReviewGate.js';

const args=process.argv.slice(2);
const sourcePath=args[0]||'docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json';
function option(name,fallback){
  const index=args.indexOf(name);
  return index>=0&&args[index+1]!==undefined?args[index+1]:fallback;
}
const catalogOut=option('--catalog-out','docs/phase6/SCHOOLWORK_PHOTO_QUESTION_CATALOG.json');
const receiptOut=option('--receipt-out','docs/phase6/SCHOOLWORK_PHOTO_REVIEW_RECEIPT.json');
const snapshotId=option('--snapshot-id','schoolwork-preview');

const rawPack=JSON.parse(readFileSync(sourcePath,'utf8'));
const sourceIssues=validateSanitizedSchoolworkPack(rawPack);
const reviewIssues=validateSchoolworkReviewQueue(rawPack);
if(sourceIssues.length||reviewIssues.length){
  console.error(JSON.stringify({
    status:'fail',
    issues:[...sourceIssues,...reviewIssues]
  },null,2));
  process.exit(1);
}

const gated=applySchoolworkReviewGate(rawPack);
if(gated.issues.length){
  console.error(JSON.stringify({status:'fail',issues:gated.issues},null,2));
  process.exit(1);
}

const pack=gated.effectivePack;
const effectiveIssues=validateSanitizedSchoolworkPack(pack);
if(effectiveIssues.length){
  console.error(JSON.stringify({status:'fail',issues:effectiveIssues},null,2));
  process.exit(1);
}

const catalog=buildSchoolworkQuestionCatalog(pack,{snapshotId});
const active=selectActiveSchoolworkQuestions(catalog,{maxPerStation:4});
const receipt={
  ...makeSchoolworkReviewReceipt(pack,catalog,active),
  reviewGate:gated.summary
};

mkdirSync(dirname(catalogOut),{recursive:true});
mkdirSync(dirname(receiptOut),{recursive:true});
writeFileSync(catalogOut,JSON.stringify({
  ...catalog,
  activeQuestionIds:active.map(question=>question.id)
},null,2)+'\n');
writeFileSync(receiptOut,JSON.stringify(receipt,null,2)+'\n');

console.log(JSON.stringify({
  status:'pass',
  sourcePath,
  sourceHash:catalog.sourceHash,
  generatedQuestionCandidates:catalog.questions.length,
  activeQuestionCount:active.length,
  activeByStation:receipt.activeByStation,
  reviewGate:receipt.reviewGate,
  catalogOut,
  receiptOut
},null,2));
