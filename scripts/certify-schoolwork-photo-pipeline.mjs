import {mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';

import {
  certifySchoolworkPhotoPipeline
} from '../src/schoolworkPhoto/schoolworkEndToEndCertification.js';

const args=process.argv.slice(2);

function option(name,fallback){
  const index=args.indexOf(name);
  return index>=0&&args[index+1]!==undefined?args[index+1]:fallback;
}

const sourcePath=option('--source','docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json');
const skillArtifactPath=option('--skill-artifact','docs/phase6/SCHOOLWORK_SKILL_OBSERVATIONS.json');
const skillReceiptPath=option('--skill-receipt','docs/phase6/SCHOOLWORK_SKILL_OBSERVATION_RECEIPT.json');
const catalogPath=option('--catalog','docs/phase6/SCHOOLWORK_PHOTO_QUESTION_CATALOG.json');
const reviewReceiptPath=option('--review-receipt','docs/phase6/SCHOOLWORK_PHOTO_REVIEW_RECEIPT.json');
const rotatingSourcePath=option('--question-source','docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json');
const evidenceLuaPath=option('--evidence-lua','roblox/src/shared/SchoolworkSkillEvidence.luau');
const questionLuaPath=option('--question-lua','roblox/src/server/CoreQuestionBank.luau');
const outPath=option('--out','docs/phase6/SCHOOLWORK_PIPELINE_CERTIFICATION.json');

function json(path){
  return JSON.parse(readFileSync(path,'utf8'));
}

const result=certifySchoolworkPhotoPipeline({
  sourcePack:json(sourcePath),
  skillArtifact:json(skillArtifactPath),
  skillReceipt:json(skillReceiptPath),
  questionCatalog:json(catalogPath),
  reviewReceipt:json(reviewReceiptPath),
  rotatingSource:json(rotatingSourcePath),
  evidenceLua:readFileSync(evidenceLuaPath,'utf8'),
  coreQuestionBankLua:readFileSync(questionLuaPath,'utf8')
});

if(result.issues.length||!result.receipt||result.receipt.status!=='certified'){
  rmSync(outPath,{force:true});
  console.error(JSON.stringify({
    status:'fail',
    issues:result.issues
  },null,2));
  process.exit(1);
}

mkdirSync(dirname(outPath),{recursive:true});
writeFileSync(outPath,JSON.stringify(result.receipt,null,2)+'\n');

console.log(JSON.stringify({
  status:'pass',
  outPath,
  ...result.receipt
},null,2));
