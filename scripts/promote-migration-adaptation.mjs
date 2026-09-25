import { createHash } from 'node:crypto';
import { lstat,readFile,writeFile } from 'node:fs/promises';
import { basename,dirname,isAbsolute,relative,resolve,sep } from 'node:path';

import {
  buildMigrationPromotionReceipt,
  verifyMigrationPromotionReceipt
} from '../src/devFactory/promotionReceipt.js';
import {
  verifyMigrationAdaptationReceipt
} from '../src/devFactory/adaptationReceipt.js';
import { verifyDevelopmentRun } from '../src/devFactory/developmentFactory.js';

function arg(name,required=false){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (() => {
    const index=process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}

function absolute(value){
  return isAbsolute(value) ? value : resolve(process.cwd(),value);
}

function safeResolve(base,relativePath,label){
  if(typeof relativePath !== 'string' || !relativePath.trim()){
    throw new Error(label + ' path is required');
  }
  if(isAbsolute(relativePath)){
    throw new Error(label + ' must use a relative path');
  }
  const cleanBase=resolve(base);
  const candidate=resolve(cleanBase,relativePath);
  const rel=relative(cleanBase,candidate);
  if(rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)){
    throw new Error(label + ' escapes adaptation directory');
  }
  return candidate;
}

async function digest(path,label){
  const info=await lstat(path);
  if(info.isSymbolicLink()){
    throw new Error(label + ' may not be a symbolic link');
  }
  if(!info.isFile()){
    throw new Error(label + ' is not a file');
  }
  const data=await readFile(path);
  return {
    data,
    sha256:createHash('sha256').update(data).digest('hex'),
    bytes:data.length
  };
}

function parseUnitIds(raw){
  const values=String(raw || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  if(values.length === 0){
    throw new Error('--units must contain at least one unitId');
  }
  if(new Set(values).size !== values.length){
    throw new Error('--units must not contain duplicates');
  }
  return values;
}

const adaptationReceiptPath=absolute(arg('--adaptation-receipt',true));
const unitIds=parseUnitIds(arg('--units',true));
const base=dirname(adaptationReceiptPath);
const outPath=absolute(
  arg('--out') || resolve(base,'migration-promotion-receipt.json')
);

if(dirname(outPath) !== base){
  throw new Error(
    'migration promotion receipt must be written beside the adaptation receipt'
  );
}

const adaptationDigest=await digest(
  adaptationReceiptPath,
  'migration adaptation receipt'
);
const adaptationReceipt=JSON.parse(adaptationDigest.data.toString('utf8'));
const adaptationValidation=verifyMigrationAdaptationReceipt(adaptationReceipt);
if(!adaptationValidation.ok){
  throw new Error(
    'invalid migration adaptation receipt: ' +
    adaptationValidation.errors.join('; ')
  );
}

const runPath=safeResolve(
  base,
  adaptationReceipt.developmentRun?.file,
  'development run'
);
const runDigest=await digest(runPath,'development run');
if(
  runDigest.sha256 !== adaptationReceipt.developmentRun.sha256 ||
  runDigest.bytes !== adaptationReceipt.developmentRun.bytes
){
  throw new Error(
    'development run fingerprint mismatch; expected ' +
    adaptationReceipt.developmentRun.sha256 + '/' +
    adaptationReceipt.developmentRun.bytes + ' but found ' +
    runDigest.sha256 + '/' + runDigest.bytes
  );
}

const run=JSON.parse(runDigest.data.toString('utf8'));
const runValidation=verifyDevelopmentRun(run);
if(!runValidation.ok){
  throw new Error(
    'invalid development run: ' + runValidation.errors.join('; ')
  );
}
if(
  run.runId !== adaptationReceipt.developmentRun.runId ||
  run.runHash !== adaptationReceipt.developmentRun.runHash
){
  throw new Error('adaptation receipt does not bind the exact development run');
}

const promotionReceipt=buildMigrationPromotionReceipt({
  adaptationReceipt,
  adaptationReceiptFile:basename(adaptationReceiptPath),
  adaptationReceiptSha256:adaptationDigest.sha256,
  adaptationReceiptBytes:adaptationDigest.bytes,
  run,
  unitIds
});
const promotionValidation=verifyMigrationPromotionReceipt(promotionReceipt);
if(!promotionValidation.ok){
  throw new Error(
    'generated invalid promotion receipt: ' +
    promotionValidation.errors.join('; ')
  );
}

await writeFile(
  outPath,
  JSON.stringify(promotionReceipt,null,2) + '\n'
);

console.log('StarBlox migration quarantine-exit certification');
console.log('status: ' + promotionReceipt.status);
console.log('promoted units: ' + promotionReceipt.units.length);
console.log('target: ' + promotionReceipt.promotion.targetStatus);
console.log('publication allowed: false');
console.log('live activation allowed: false');
console.log('receipt: ' + outPath);
