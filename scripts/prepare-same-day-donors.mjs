import {createHash} from 'node:crypto';
import {mkdir,readFile,rm,writeFile} from 'node:fs/promises';
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
  const r=spawnSync(command,args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024});
  if(r.status!==0){
    throw new Error([command,...args].join(' ')+' failed: '+(r.stderr||r.stdout||'exit '+r.status).trim());
  }
  return (r.stdout||'').trim();
}
function absolute(base,value){
  return isAbsolute(value) ? resolve(value) : resolve(base,value);
}
function commonDirectory(paths){
  const parts=paths.map(p=>p.replaceAll('\\','/').split('/').slice(0,-1));
  const common=[];
  for(let i=0;;i++){
    const value=parts[0]?.[i];
    if(value==null || parts.some(row=>row[i]!==value)) break;
    common.push(value);
  }
  if(!common.length) throw new Error('donor source files have no common checkout directory');
  return common.join('/');
}
function sha256(value){
  return createHash('sha256').update(value).digest('hex');
}

const manifestPath=resolve(process.cwd(),arg('--manifest','config/same-day/pipeline.example.json'));
const manifestDir=dirname(manifestPath);
const outDir=resolve(process.cwd(),arg('--out-dir','artifacts/same-day-donors'));
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
await mkdir(outDir,{recursive:true});

const receipts=[];
for(const task of manifest.integrationTasks || []){
  if(!task.repository || !task.commit || !task.checkout) continue;
  const taskPath=resolve(manifestDir,task.taskFile);
  const taskJson=JSON.parse(await readFile(taskPath,'utf8'));
  if(!taskJson.adapterSpec?.path){
    throw new Error(task.id+' integration task is missing adapterSpec.path');
  }
  const specPath=resolve(dirname(taskPath),taskJson.adapterSpec.path);
  const rawSpec=JSON.parse(await readFile(specPath,'utf8'));
  const validation=verifyDonorAdapterSpec(rawSpec,{
    donorId:task.id,
    repository:task.repository,
    commit:task.commit
  });
  if(!validation.ok) throw new Error(task.id+' adapter spec rejected: '+validation.errors.join('; '));
  const spec=validation.spec;
  const checkout=absolute(manifestDir,task.checkout);
  const sparseRoot=commonDirectory(spec.sourceFiles.map(row=>row.path));

  await rm(checkout,{recursive:true,force:true});
  await mkdir(dirname(checkout),{recursive:true});
  run('git',['clone','--filter=blob:none','--no-checkout','https://github.com/'+task.repository+'.git',checkout]);
  run('git',['-C',checkout,'sparse-checkout','init','--cone']);
  run('git',['-C',checkout,'sparse-checkout','set',sparseRoot]);
  run('git',['-C',checkout,'fetch','--depth=1','origin',task.commit]);
  run('git',['-C',checkout,'checkout','--detach',task.commit]);

  const head=run('git',['-C',checkout,'rev-parse','HEAD']).toLowerCase();
  if(head!==task.commit.toLowerCase()) throw new Error(task.id+' checkout HEAD mismatch');

  const verifiedFiles=[];
  for(const file of spec.sourceFiles){
    const blob=run('git',['-C',checkout,'rev-parse','HEAD:'+file.path]).toLowerCase();
    if(blob!==file.blobSha.toLowerCase()){
      throw new Error(task.id+' blob mismatch for '+file.path+': '+blob+' != '+file.blobSha);
    }
    verifiedFiles.push({path:file.path,blobSha:blob});
  }

  const status=run('git',['-C',checkout,'status','--porcelain']);
  if(status) throw new Error(task.id+' checkout is dirty after verification');

  const payload={
    schemaVersion:1,
    version:'starblox-donor-checkout-receipt-v1',
    donorId:task.id,
    repository:task.repository,
    commit:head,
    checkout,
    sparseRoot,
    adapterSpec:{file:specPath,specHash:spec.specHash},
    verifiedFiles
  };
  const receipt={...payload,receiptHash:'sha256:'+sha256(JSON.stringify(payload))};
  const receiptPath=resolve(outDir,task.id+'-checkout-receipt.json');
  await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  receipts.push({...receipt,file:receiptPath});
  console.log(task.id+': verified '+verifiedFiles.length+' source blobs at '+head);
}
const indexPayload={
  schemaVersion:1,
  version:'starblox-donor-checkout-index-v1',
  donors:receipts.map(row=>({
    donorId:row.donorId,
    repository:row.repository,
    commit:row.commit,
    sparseRoot:row.sparseRoot,
    specHash:row.adapterSpec.specHash,
    receiptHash:row.receiptHash,
    file:row.file
  }))
};
const index={...indexPayload,indexHash:'sha256:'+sha256(JSON.stringify(indexPayload))};
await writeFile(resolve(outDir,'donor-checkout-index.json'),JSON.stringify(index,null,2)+'\n');
console.log('StarBlox donor prep: PASS ('+receipts.length+' donors)');
