import {createHash} from 'node:crypto';
import {readFile,stat,writeFile} from 'node:fs/promises';
import {dirname,isAbsolute,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

import {verifyDonorAdapterSpec} from '../src/sameDayPipeline/donorAdapterSpec.js';

function arg(name,def=null){
  const inline=process.argv.find(v=>v.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 && process.argv[i+1] ? process.argv[i+1] : def;
}
function run(command,args,{cwd=process.cwd()}={}){
  const r=spawnSync(command,args,{cwd,encoding:'utf8',maxBuffer:16*1024*1024});
  if(r.status!==0){
    throw new Error([command,...args].join(' ')+' failed: '+(r.stderr||r.stdout||'exit '+r.status).trim());
  }
  return (r.stdout||'').trim();
}
async function exists(path){
  try{await stat(path);return true;}catch(error){if(error?.code==='ENOENT')return false;throw error;}
}
function abs(base,value){ return isAbsolute(value) ? resolve(value) : resolve(base,value); }
function sha256(value){ return createHash('sha256').update(value).digest('hex'); }

const manifestPath=resolve(process.cwd(),arg('--manifest','config/same-day/pipeline.example.json'));
const manifestDir=dirname(manifestPath);
const indexPath=resolve(process.cwd(),arg('--index','artifacts/same-day-donors/donor-checkout-index.json'));
const outRaw=arg('--out','');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const index=JSON.parse(await readFile(indexPath,'utf8'));

if(index.version!=='starblox-donor-checkout-index-v1'){
  throw new Error('unsupported donor checkout index version');
}

const indexById=new Map((index.donors||[]).map(row=>[row.donorId,row]));
const verified=[];
for(const task of manifest.integrationTasks || []){
  if(!task.repository || !task.commit || !task.checkout) continue;
  const row=indexById.get(task.id);
  if(!row) throw new Error('donor index is missing '+task.id);

  const taskPath=resolve(manifestDir,task.taskFile);
  const taskJson=JSON.parse(await readFile(taskPath,'utf8'));
  const specPath=resolve(dirname(taskPath),taskJson.adapterSpec?.path || '');
  const rawSpec=JSON.parse(await readFile(specPath,'utf8'));
  const validation=verifyDonorAdapterSpec(rawSpec,{
    donorId:task.id,
    repository:task.repository,
    commit:task.commit
  });
  if(!validation.ok) throw new Error(task.id+' adapter spec rejected: '+validation.errors.join('; '));
  const spec=validation.spec;

  if(
    row.repository.toLowerCase()!==task.repository.toLowerCase() ||
    row.commit.toLowerCase()!==task.commit.toLowerCase() ||
    row.specHash!==spec.specHash
  ){
    throw new Error(task.id+' donor index does not match current manifest/spec');
  }

  const receiptPath=resolve(dirname(indexPath),task.id+'-checkout-receipt.json');
  const receipt=JSON.parse(await readFile(receiptPath,'utf8'));
  const {receiptHash,...receiptPayload}=receipt;
  const computedReceiptHash='sha256:'+sha256(JSON.stringify(receiptPayload));
  if(receiptHash!==computedReceiptHash || row.receiptHash!==receiptHash){
    throw new Error(task.id+' donor receipt hash mismatch');
  }

  const checkout=abs(manifestDir,task.checkout);
  if(!await exists(resolve(checkout,'.git'))){
    throw new Error(task.id+' checkout is missing Git metadata: '+checkout);
  }
  const head=run('git',['-C',checkout,'rev-parse','HEAD']).toLowerCase();
  if(head!==task.commit.toLowerCase()) throw new Error(task.id+' HEAD mismatch');
  const remote=run('git',['-C',checkout,'remote','get-url','origin']);
  if(!remote.toLowerCase().includes(task.repository.toLowerCase())){
    throw new Error(task.id+' origin mismatch: '+remote);
  }
  const dirty=run('git',['-C',checkout,'status','--porcelain']);
  if(dirty) throw new Error(task.id+' checkout is dirty');

  const files=[];
  for(const source of spec.sourceFiles){
    const blob=run('git',['-C',checkout,'rev-parse','HEAD:'+source.path]).toLowerCase();
    if(blob!==source.blobSha.toLowerCase()){
      throw new Error(task.id+' blob mismatch for '+source.path);
    }
    files.push({path:source.path,blobSha:blob});
  }
  verified.push({
    donorId:task.id,
    repository:task.repository,
    commit:head,
    checkout,
    specHash:spec.specHash,
    sourceFileCount:files.length,
    receiptHash
  });
}

const payload={
  schemaVersion:1,
  version:'starblox-donor-cache-verification-v1',
  status:'verified',
  manifest:manifestPath,
  index:indexPath,
  donors:verified,
  publicationAllowed:false
};
const result={...payload,verificationHash:'sha256:'+sha256(JSON.stringify(payload))};
if(outRaw){
  await writeFile(resolve(process.cwd(),outRaw),JSON.stringify(result,null,2)+'\n');
}
console.log(JSON.stringify(result,null,2));
