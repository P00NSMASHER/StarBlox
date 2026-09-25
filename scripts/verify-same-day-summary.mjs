import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname,isAbsolute,resolve } from 'node:path';

import { verifySameDaySliceSummary } from '../src/sameDayPipeline/finalSummary.js';

function arg(name,required=false){
  const inline=process.argv.find(value=>value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (()=>{
    const i=process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}

function absolute(base,value){
  return isAbsolute(value) ? resolve(value) : resolve(base,value);
}

async function digest(path){
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

const summaryPath=resolve(process.cwd(),arg('--summary',true));
const base=dirname(summaryPath);
const summary=JSON.parse(await readFile(summaryPath,'utf8'));
const validation=verifySameDaySliceSummary(summary);
if(!validation.ok){
  throw new Error('invalid same-day slice summary: ' + validation.errors.join('; '));
}

const planPath=absolute(base,summary.plan.file);
if(await digest(planPath) !== summary.plan.sha256){
  throw new Error('same-day plan fingerprint mismatch');
}

const runPath=absolute(base,summary.integratedRun.file);
if(await digest(runPath) !== summary.integratedRun.sha256){
  throw new Error('integrated development run fingerprint mismatch');
}

for(const [gate,row] of Object.entries(summary.gates)){
  const path=absolute(base,row.file);
  if(await digest(path) !== row.sha256){
    throw new Error(gate + ' gate receipt fingerprint mismatch');
  }
  const receipt=JSON.parse(await readFile(path,'utf8'));
  if(receipt.receiptHash !== row.receiptHash){
    throw new Error(gate + ' gate receipt hash does not match final summary');
  }
  if(receipt.integratedRun?.sha256 !== summary.integratedRun.sha256){
    throw new Error(gate + ' gate receipt does not bind to integrated run');
  }
}

for(const [id,row] of Object.entries(summary.provenance.migrationExports || {})){
  const path=absolute(base,row.receipt);
  if(await digest(path) !== row.sha256){
    throw new Error(id + ' migration export receipt fingerprint mismatch');
  }
  const receipt=JSON.parse(await readFile(path,'utf8'));
  if(receipt.status !== 'exported' || receipt.liveActivationAllowed !== false){
    throw new Error(id + ' migration export receipt is not a safe exported receipt');
  }
}

console.log('StarBlox same-day final summary: VERIFIED');
console.log('summary: ' + summaryPath);
console.log('hash: ' + summary.summaryHash);
