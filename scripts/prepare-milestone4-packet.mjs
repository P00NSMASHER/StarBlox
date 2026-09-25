import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  mkdir,
  readFile,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import { isAbsolute,resolve } from 'node:path';

const EXPECTED_GIT_BLOB='134605d10270906eae89edbdaba006ce91963668';
const EXPECTED_SOURCE_SHA256='19b8e08f496d97ef900cff84be4f2c9c50e146c553178a4b18e17ab155abe31d';
const EXPECTED_UNIT=
  'slash-mayhem-shadow-cc6aed05-slash-meyhem-shadow-edition-rbxl-startergui-0982d021';

function arg(name,def=null){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  if(inline) return inline.slice(name.length + 1);
  const index=process.argv.indexOf(name);
  if(index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')){
    return process.argv[index + 1];
  }
  return def;
}

function hasFlag(name){
  return process.argv.includes(name);
}

function absolute(value){
  return isAbsolute(value) ? resolve(value) : resolve(process.cwd(),value);
}

async function exists(path){
  try{
    await stat(path);
    return true;
  }catch{
    return false;
  }
}

function runNode(script,args){
  const result=spawnSync(process.execPath,[script,...args],{
    cwd:process.cwd(),
    encoding:'utf8',
    maxBuffer:64 * 1024 * 1024
  });
  if(result.error){
    throw new Error('could not start ' + script + ': ' + result.error.message);
  }
  if(result.status !== 0){
    throw new Error(
      script + ' failed (' + result.status + '):\n' +
      (result.stderr || result.stdout || '').trim()
    );
  }
  return (result.stdout || '').trim();
}

function sha256(data){
  return createHash('sha256').update(data).digest('hex');
}

function gitBlobSha(data){
  const header=Buffer.from('blob ' + data.length + '\0','utf8');
  return createHash('sha1').update(header).update(data).digest('hex');
}

const outRoot=absolute(arg('--out-dir','artifacts/milestone4-live'));
const overwrite=hasFlag('--overwrite');
if(await exists(outRoot)){
  if(!overwrite){
    throw new Error(
      'Milestone 4 packet output already exists; pass --overwrite to replace it: ' +
      outRoot
    );
  }
  await rm(outRoot,{recursive:true,force:true});
}
await mkdir(outRoot,{recursive:true});

const sourceDir=resolve(outRoot,'source');
const ingestDir=resolve(outRoot,'ingest');
const discoveryDir=resolve(outRoot,'discovery');
const planDir=resolve(outRoot,'plan');
const exportDir=resolve(outRoot,'export');
const stagingDir=resolve(outRoot,'staging');
await mkdir(sourceDir,{recursive:true});

const fixturePath=resolve(
  'tools/roblox_catalog_reader/fixtures/external/slash-mayhem-shadow-cc6aed05.rbxl.b64'
);
const sourcePath=resolve(sourceDir,'Slash-Meyhem-Shadow-Edition.rbxl');
const encoded=(await readFile(fixturePath,'utf8')).replace(/\s+/g,'');
const sourceBytes=Buffer.from(encoded,'base64');

if(gitBlobSha(sourceBytes) !== EXPECTED_GIT_BLOB){
  throw new Error('pinned real Roblox source no longer matches the expected upstream Git blob');
}
if(sha256(sourceBytes) !== EXPECTED_SOURCE_SHA256){
  throw new Error('pinned real Roblox source no longer matches the approved SHA-256');
}
await writeFile(sourcePath,sourceBytes);

runNode('scripts/ingest-roblox-source.mjs',[
  '--input',sourcePath,
  '--out-dir',ingestDir,
  '--source-id','slash-mayhem-shadow-cc6aed05'
]);

runNode('scripts/migrate-roblox.mjs',[
  '--ingestion-receipt',resolve(ingestDir,'ingestion-receipt.json'),
  '--out-dir',discoveryDir,
  '--min-score','0'
]);

const rulesPath=resolve(outRoot,'migration-rules.json');
const selectionPath=resolve(outRoot,'selection.json');
runNode('scripts/select-real-studio-migration-unit.mjs',[
  '--plan',resolve(discoveryDir,'migration-plan.json'),
  '--rules-out',rulesPath,
  '--selection-out',selectionPath
]);

const selection=JSON.parse(await readFile(selectionPath,'utf8'));
if(selection?.unit?.unitId !== EXPECTED_UNIT){
  throw new Error(
    'deterministic Milestone 4 selector changed unit; expected ' +
    EXPECTED_UNIT + ' but selected ' + String(selection?.unit?.unitId)
  );
}
if(
  selection.unit.migrationStrategy !== 'refactor' ||
  selection.unit.exportDisposition !== 'quarantine' ||
  (selection.unit.riskFlags || []).length !== 0
){
  throw new Error('selected Milestone 4 unit no longer satisfies the bounded safety policy');
}

runNode('scripts/migrate-roblox.mjs',[
  '--ingestion-receipt',resolve(ingestDir,'ingestion-receipt.json'),
  '--out-dir',planDir,
  '--rules',rulesPath
]);

const boundedPlan=JSON.parse(
  await readFile(resolve(planDir,'migration-plan.json'),'utf8')
);
const selected=boundedPlan.units.filter(unit => unit.selected);
if(selected.length !== 1 || selected[0].unitId !== EXPECTED_UNIT){
  throw new Error('bounded Milestone 4 plan must select exactly the approved unit');
}

runNode('scripts/migrate-roblox.mjs',[
  '--planning-receipt',resolve(planDir,'migration-planning-receipt.json'),
  '--source-root',sourceDir,
  '--out-dir',exportDir
]);

runNode('scripts/prepare-milestone4-staging.mjs',[
  '--export-receipt',resolve(exportDir,'migration-export-receipt.json'),
  '--unit',EXPECTED_UNIT,
  '--out-dir',stagingDir
]);

const stagingReceipt=JSON.parse(
  await readFile(resolve(stagingDir,'milestone4-staging-receipt.json'),'utf8')
);
if(stagingReceipt.status !== 'prepared-offline'){
  throw new Error('Milestone 4 staging receipt did not reach prepared-offline status');
}

const packetBase={
  schemaVersion:1,
  version:'starblox-milestone4-packet-v1',
  status:'prepared',
  unitId:EXPECTED_UNIT,
  source:{
    file:'source/Slash-Meyhem-Shadow-Edition.rbxl',
    upstreamGitBlobSha:EXPECTED_GIT_BLOB,
    sha256:EXPECTED_SOURCE_SHA256,
    bytes:sourceBytes.length
  },
  paths:{
    ingestionReceipt:'ingest/ingestion-receipt.json',
    selection:'selection.json',
    boundedPlan:'plan/migration-plan.json',
    planningReceipt:'plan/migration-planning-receipt.json',
    exportReceipt:'export/migration-export-receipt.json',
    stagingReceipt:'staging/milestone4-staging-receipt.json',
    stagingPlace:'staging/StarBlox-milestone4-staging.rbxlx',
    factoryTask:'staging/milestone4-task.json'
  },
  stagingReceiptHash:stagingReceipt.receiptHash,
  execution:{
    studioAttested:false,
    factoryRunStarted:false,
    adaptationReceiptCreated:false,
    promotionReceiptCreated:false
  },
  publicationStarted:false,
  liveActivationAllowed:false,
  nextStep:'launch-staging-place-and-run-live-cycle'
};
const packet={
  ...packetBase,
  packetHash:'sha256:' + sha256(Buffer.from(JSON.stringify(packetBase),'utf8'))
};
await writeFile(
  resolve(outRoot,'milestone4-packet.json'),
  JSON.stringify(packet,null,2) + '\n'
);

console.log('StarBlox Milestone 4 local packet prepared');
console.log('root: ' + outRoot);
console.log('unit: ' + EXPECTED_UNIT);
console.log('staging place: ' + resolve(outRoot,packet.paths.stagingPlace));
console.log('factory task: ' + resolve(outRoot,packet.paths.factoryTask));
console.log('publication started: false');
console.log('live activation allowed: false');
