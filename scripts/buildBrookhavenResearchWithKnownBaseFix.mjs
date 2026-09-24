import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const file='src/catalogArtRuntime.js';
const expectedBlob='d6bd48dec10ec4ac655070c33938e88248d04c55';
const before=fs.readFileSync(file,'utf8');

const hash=spawnSync('git',['hash-object',file],{encoding:'utf8'});
if(hash.status!==0) throw new Error('git hash-object failed: '+hash.stderr);
const actualBlob=String(hash.stdout||'').trim();
if(actualBlob!==expectedBlob){
  throw new Error('known inherited build blocker changed; refusing temporary patch. expected '+expectedBlob+' got '+actualBlob);
}

const needle="'decor-6': '/assets/catalog-candidates/cpu/decor-6-w03-v2-a-single-telescope-original.png'\n  'decor-9':";
if(!before.includes(needle)){
  throw new Error('known inherited comma defect pattern not found');
}

const patched=before.replace(
  needle,
  "'decor-6': '/assets/catalog-candidates/cpu/decor-6-w03-v2-a-single-telescope-original.png',\n  'decor-9':"
);

let result;
try{
  fs.writeFileSync(file,patched,'utf8');
  result=spawnSync('npm',['run','build'],{
    stdio:'inherit',
    shell:process.platform==='win32'
  });
}finally{
  fs.writeFileSync(file,before,'utf8');
}

if(!result || result.status!==0){
  process.exitCode=result?.status || 1;
}else{
  process.stdout.write(JSON.stringify({
    schemaVersion:'starblox-brookhaven-temporary-base-build-proof-v1',
    inheritedFile:file,
    expectedInheritedBlob:expectedBlob,
    temporaryPatch:'add-missing-comma-between-decor-6-and-decor-9',
    workingTreeRestored:true,
    buildStatus:'pass'
  },null,2)+'\n');
}
