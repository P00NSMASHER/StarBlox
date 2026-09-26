import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {
  adaptSchoolworkPhotoIntake
} from '../src/schoolworkPhoto/schoolworkPhotoIntakeAdapter.js';

const args=process.argv.slice(2);
const inputPath=args.find(arg=>!arg.startsWith('--'));
function option(name,fallback){
  const index=args.indexOf(name);
  return index>=0&&args[index+1]!==undefined?args[index+1]:fallback;
}

if(!inputPath){
  console.error(JSON.stringify({
    status:'fail',
    issues:[{type:'intake-input-path-required'}]
  },null,2));
  process.exit(1);
}

const sourceOut=option('--source-out','docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json');
const receiptOut=option('--receipt-out','docs/phase6/SCHOOLWORK_PHOTO_INTAKE_RECEIPT.json');

let intake;
try{
  intake=JSON.parse(readFileSync(inputPath,'utf8'));
}catch(error){
  console.error(JSON.stringify({
    status:'fail',
    issues:[{type:'intake-input-unreadable',message:String(error?.message||error)}]
  },null,2));
  process.exit(1);
}

const adapted=adaptSchoolworkPhotoIntake(intake);
if(adapted.issues.length||!adapted.pack||!adapted.receipt){
  console.error(JSON.stringify({
    status:'fail',
    issues:adapted.issues
  },null,2));
  process.exit(1);
}

mkdirSync(dirname(sourceOut),{recursive:true});
mkdirSync(dirname(receiptOut),{recursive:true});
writeFileSync(sourceOut,JSON.stringify(adapted.pack,null,2)+'\n');
writeFileSync(receiptOut,JSON.stringify(adapted.receipt,null,2)+'\n');

console.log(JSON.stringify({
  status:'pass',
  inputPath,
  sourceOut,
  receiptOut,
  batchId:adapted.pack.batchId,
  pageCount:adapted.pack.pageCount,
  acceptedSkillSignals:adapted.receipt.acceptedSkillSignals,
  reviewItems:adapted.receipt.reviewItems,
  lowConfidenceOmitted:adapted.receipt.lowConfidenceOmitted,
  sourcePackHash:adapted.receipt.sourcePackHash
},null,2));
