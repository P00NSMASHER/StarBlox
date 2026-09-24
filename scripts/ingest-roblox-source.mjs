import { createHash } from 'node:crypto';
import { lstat,mkdir,readFile,writeFile } from 'node:fs/promises';
import { dirname,isAbsolute,relative,resolve,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const VERSION='starblox-roblox-ingestion-v1';

function arg(name,required=false){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (() => {
    const index=process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}

function hasFlag(name){
  return process.argv.includes(name);
}

function absolute(value){
  return isAbsolute(value) ? value : resolve(process.cwd(),value);
}

function isWithin(parent,candidate){
  const rel=relative(resolve(parent),resolve(candidate));
  return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel));
}

async function exists(path){
  try{
    await lstat(path);
    return true;
  }catch(error){
    if(error?.code === 'ENOENT') return false;
    throw error;
  }
}

function runNode(script,args){
  const result=spawnSync(
    process.execPath,
    [resolve(root,'scripts',script),...args],
    {
      cwd:root,
      encoding:'utf8',
      maxBuffer:128 * 1024 * 1024
    }
  );
  if(result.error){
    throw new Error('could not start ' + script + ': ' + result.error.message);
  }
  if(result.status !== 0){
    throw new Error(
      script + ' failed: ' +
      (result.stderr || result.stdout || ('exit ' + result.status)).trim()
    );
  }
  return {
    stdout:result.stdout || '',
    stderr:result.stderr || ''
  };
}

async function sha256(path){
  const bytes=await readFile(path);
  return createHash('sha256').update(bytes).digest('hex');
}

const input=absolute(arg('--input',true));
const outDir=absolute(arg('--out-dir') || 'roblox-ingestion');
const sourceId=arg('--source-id') || 'authorized-roblox';
const overwrite=hasFlag('--overwrite');

const inputInfo=await lstat(input);
const sourceRoot=inputInfo.isDirectory() ? input : dirname(input);

if(isWithin(sourceRoot,outDir)){
  throw new Error(
    'ingestion output directory may not be inside the authorized source corpus: ' + outDir
  );
}

const paths={
  preflight:resolve(outDir,'source-preflight.json'),
  handoff:resolve(outDir,'catalog-handoff.json'),
  catalog:resolve(outDir,'capability-catalog.json'),
  report:resolve(outDir,'capability-catalog.md'),
  receipt:resolve(outDir,'ingestion-receipt.json')
};

if(!overwrite){
  const collisions=[];
  for(const [name,path] of Object.entries(paths)){
    if(await exists(path)) collisions.push(name + ':' + path);
  }
  if(collisions.length){
    throw new Error(
      'ingestion output already exists; use a new --out-dir or explicit --overwrite: ' +
      collisions.join(', ')
    );
  }
}

await mkdir(outDir,{recursive:true});

runNode('roblox-source-preflight.mjs',[
  '--input',input,
  '--out',paths.preflight,
  '--handoff',paths.handoff
]);

runNode('catalog-roblox.mjs',[
  '--preflight',paths.handoff,
  '--out',paths.catalog,
  '--report',paths.report,
  '--source-id',sourceId
]);

const preflight=JSON.parse(await readFile(paths.preflight,'utf8'));
const handoff=JSON.parse(await readFile(paths.handoff,'utf8'));
const catalog=JSON.parse(await readFile(paths.catalog,'utf8'));

if(preflight.ready !== true || handoff.ready !== true){
  throw new Error('ingestion preflight/handoff is not ready');
}
if(catalog?.summary?.sourceCount !== handoff.fileCount){
  throw new Error('catalog source count does not match preflight handoff');
}
if(catalog?.summary?.sourceFingerprintCount !== handoff.fileCount){
  throw new Error('catalog did not retain every preflight source fingerprint');
}

const receipt={
  schemaVersion:1,
  version:VERSION,
  status:'cataloged',
  sourceId,
  sourceCount:catalog.summary.sourceCount,
  totalSourceBytes:handoff.totalBytes,
  catalogHash:catalog.catalogHash,
  artifacts:{
    preflight:{file:'source-preflight.json',sha256:await sha256(paths.preflight)},
    handoff:{file:'catalog-handoff.json',sha256:await sha256(paths.handoff)},
    catalog:{file:'capability-catalog.json',sha256:await sha256(paths.catalog)},
    report:{file:'capability-catalog.md',sha256:await sha256(paths.report)}
  },
  nextStep:'review-capability-catalog',
  migrationStarted:false,
  studioMutationStarted:false,
  publicationStarted:false
};

await writeFile(paths.receipt,JSON.stringify(receipt,null,2) + '\n');

console.log('StarBlox safe Roblox ingestion');
console.log('status: ' + receipt.status);
console.log('sources: ' + receipt.sourceCount);
console.log('bytes: ' + receipt.totalSourceBytes);
console.log('catalog hash: ' + receipt.catalogHash);
console.log('output: ' + outDir);
console.log('next: ' + receipt.nextStep);
