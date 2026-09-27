import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';

import {
  buildLegacySchoolworkSkillObservations,
  buildSchoolworkSkillObservations,
  renderSchoolworkSkillEvidenceLua
} from '../src/schoolworkPhoto/schoolworkSkillObservations.js';

const args=process.argv.slice(2);

function option(name,fallback=null){
  const index=args.indexOf(name);
  return index>=0&&args[index+1]!==undefined?args[index+1]:fallback;
}

const sourcePath=option('--source','docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json');
const intakePath=option('--intake');
const outPath=option('--out','docs/phase6/SCHOOLWORK_SKILL_OBSERVATIONS.json');
const receiptPath=option('--receipt-out','docs/phase6/SCHOOLWORK_SKILL_OBSERVATION_RECEIPT.json');
const luaPath=option('--lua-out','roblox/src/shared/SchoolworkSkillEvidence.luau');

const sourcePack=JSON.parse(readFileSync(sourcePath,'utf8'));
let result;

if(intakePath){
  const intake=JSON.parse(readFileSync(intakePath,'utf8'));
  result=buildSchoolworkSkillObservations({
    intake,
    reviewedPack:sourcePack
  });
}else{
  result=buildLegacySchoolworkSkillObservations(sourcePack);
}

if(result.issues.length||!result.artifact||!result.receipt){
  console.error(JSON.stringify({status:'fail',issues:result.issues},null,2));
  process.exit(1);
}

for(const path of [outPath,receiptPath,luaPath]){
  mkdirSync(dirname(path),{recursive:true});
}
writeFileSync(outPath,JSON.stringify(result.artifact,null,2)+'\n');
writeFileSync(receiptPath,JSON.stringify(result.receipt,null,2)+'\n');
writeFileSync(luaPath,renderSchoolworkSkillEvidenceLua(result.artifact));

console.log(JSON.stringify({
  status:'pass',
  mode:result.artifact.mode,
  batchId:result.artifact.batchId,
  observationCount:result.artifact.observationCount,
  skillCount:Object.keys(result.artifact.bySkill).length,
  observationHash:result.receipt.observationHash,
  outPath,
  receiptPath,
  luaPath
},null,2));
