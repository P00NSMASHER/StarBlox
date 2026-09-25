import { createHash } from 'node:crypto';
import { spawn,spawnSync } from 'node:child_process';
import {
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile
} from 'node:fs/promises';
import {
  dirname,
  isAbsolute,
  join,
  resolve
} from 'node:path';

import {
  createStarBloxLocalStudioAdapter
} from '../src/devFactory/localStudioConnector.js';
import {
  runLiveStudioPlaytestProof,
  verifyLiveStudioEditAttestation
} from '../src/robloxRuntime/liveStudioProof.js';
import {
  verifyDevelopmentRun
} from '../src/devFactory/developmentFactory.js';
import {
  verifyMigrationAdaptationReceipt
} from '../src/devFactory/adaptationReceipt.js';
import {
  verifyMigrationPromotionReceipt
} from '../src/devFactory/promotionReceipt.js';

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

function sha256(data){
  return createHash('sha256').update(data).digest('hex');
}

async function digest(path){
  const data=await readFile(path);
  return {data,sha256:sha256(data),bytes:data.length};
}

function verifyPayloadHash(object,field,label){
  const actual=String(object?.[field] || '');
  if(!/^sha256:[a-f0-9]{64}$/.test(actual)){
    throw new Error(label + ' hash is missing or invalid');
  }
  const copy={...object};
  delete copy[field];
  const expected='sha256:' + sha256(Buffer.from(JSON.stringify(copy),'utf8'));
  if(expected !== actual){
    throw new Error(label + ' hash mismatch');
  }
}

function runNode(script,args,{env=process.env}={}){
  const result=spawnSync(process.execPath,[script,...args],{
    cwd:process.cwd(),
    env,
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

async function findStudioExecutable(explicit){
  if(explicit){
    const path=absolute(explicit);
    await stat(path);
    return path;
  }

  if(process.platform === 'darwin'){
    const path='/Applications/RobloxStudio.app/Contents/MacOS/RobloxStudio';
    await stat(path);
    return path;
  }

  if(process.platform === 'win32'){
    const local=process.env.LOCALAPPDATA;
    if(!local) throw new Error('LOCALAPPDATA is unavailable; pass --studio-exe');
    const versions=join(local,'Roblox','Versions');
    const entries=await readdir(versions,{withFileTypes:true});
    const candidates=[];
    for(const entry of entries){
      if(!entry.isDirectory()) continue;
      const path=join(versions,entry.name,'RobloxStudioBeta.exe');
      try{
        const info=await stat(path);
        candidates.push({path,mtimeMs:info.mtimeMs});
      }catch{}
    }
    candidates.sort((a,b) => b.mtimeMs - a.mtimeMs);
    if(!candidates.length){
      throw new Error('RobloxStudioBeta.exe was not found; pass --studio-exe');
    }
    return candidates[0].path;
  }

  throw new Error('automatic Roblox Studio launch is supported only on Windows/macOS');
}

async function bridgeHealth(baseUrl,token){
  const headers={};
  if(token) headers['x-starblox-bridge-token']=token;
  try{
    const response=await fetch(baseUrl + '/health',{headers});
    if(!response.ok) return null;
    return await response.json();
  }catch{
    return null;
  }
}

async function waitForBridge(baseUrl,token,timeoutMs){
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){
    const health=await bridgeHealth(baseUrl,token);
    if(health?.ok === true) return health;
    await new Promise(resolve => setTimeout(resolve,250));
  }
  throw new Error('StarBlox Studio bridge did not become reachable');
}

async function waitForAttestation(studio,timeoutMs){
  const deadline=Date.now()+timeoutMs;
  let lastError='no edit-mode Studio peer connected';
  while(Date.now()<deadline){
    try{
      const description=await studio.describe();
      const proof=verifyLiveStudioEditAttestation(description);
      return {description,proof};
    }catch(error){
      lastError=error instanceof Error ? error.message : String(error);
    }
    await new Promise(resolve => setTimeout(resolve,500));
  }
  throw new Error('live Studio attestation did not arrive: ' + lastError);
}

const packetRoot=absolute(arg('--packet-dir','artifacts/milestone4-live'));
const packetPath=resolve(packetRoot,'milestone4-packet.json');
const packet=JSON.parse(await readFile(packetPath,'utf8'));
verifyPayloadHash(packet,'packetHash','Milestone 4 packet');

if(packet.status !== 'prepared'){
  throw new Error('Milestone 4 packet is not in prepared status');
}
const stagingReceiptPath=resolve(packetRoot,packet.paths.stagingReceipt);
const stagingReceipt=JSON.parse(await readFile(stagingReceiptPath,'utf8'));
verifyPayloadHash(stagingReceipt,'receiptHash','Milestone 4 staging receipt');
if(stagingReceipt.receiptHash !== packet.stagingReceiptHash){
  throw new Error('Milestone 4 packet does not match the exact staging receipt');
}

const stagingPlacePath=resolve(packetRoot,packet.paths.stagingPlace);
const stagingPlace=await digest(stagingPlacePath);
if(
  stagingPlace.sha256 !== stagingReceipt.derived?.stagingPlace?.sha256 ||
  stagingPlace.bytes !== stagingReceipt.derived?.stagingPlace?.bytes
){
  throw new Error('Milestone 4 staging place fingerprint changed before live execution');
}

const taskPath=resolve(packetRoot,packet.paths.factoryTask);
const task=JSON.parse(await readFile(taskPath,'utf8'));
if(
  !Array.isArray(task?.migration?.unitIds) ||
  task.migration.unitIds.length !== 1 ||
  task.migration.unitIds[0] !== packet.unitId
){
  throw new Error('Milestone 4 factory task does not target the exact approved unit');
}

const baseUrl=String(
  arg('--bridge',process.env.STARBLOX_STUDIO_BRIDGE_URL || 'http://127.0.0.1:38473')
);
const instanceId=String(
  arg('--instance',process.env.STARBLOX_STUDIO_INSTANCE_ID || 'default')
);
const token=String(
  arg('--token',process.env.STARBLOX_STUDIO_BRIDGE_TOKEN || '')
);
const attestationTimeoutMs=Math.max(
  5_000,
  Number(arg('--attestation-timeout-ms','120000'))
);
const launchStudio=hasFlag('--launch-studio');
const liveDir=resolve(packetRoot,'live');
await mkdir(liveDir,{recursive:true});

const runPath=resolve(liveDir,'ai-development-run.json');
const adaptationPath=resolve(liveDir,'migration-adaptation-receipt.json');
const promotionPath=resolve(liveDir,'migration-promotion-receipt.json');
const preflightPath=resolve(liveDir,'live-studio-preflight.json');
const completionPath=resolve(liveDir,'milestone4-completion-receipt.json');

let bridgeProcess=null;
let studioProcess=null;
let startedBridge=false;

try{
  if(!(await bridgeHealth(baseUrl,token))){
    const url=new URL(baseUrl);
    if(!['127.0.0.1','localhost','::1'].includes(url.hostname)){
      throw new Error(
        'automatic bridge startup is limited to loopback; start the bridge manually for remote bindings'
      );
    }
    const args=[
      'scripts/studio-bridge.mjs',
      '--host',url.hostname === 'localhost' ? '127.0.0.1' : url.hostname,
      '--port',url.port || '38473'
    ];
    if(token) args.push('--token',token);
    bridgeProcess=spawn(process.execPath,args,{
      cwd:process.cwd(),
      env:process.env,
      stdio:['ignore','inherit','inherit']
    });
    startedBridge=true;
    await waitForBridge(baseUrl,token,10_000);
  }

  if(launchStudio){
    const studioExe=await findStudioExecutable(arg('--studio-exe',null));
    studioProcess=spawn(studioExe,[
      '--task','EditFile',
      '--localPlaceFile',stagingPlacePath
    ],{
      cwd:dirname(stagingPlacePath),
      detached:true,
      stdio:'ignore'
    });
    studioProcess.unref();
  }

  const studio=createStarBloxLocalStudioAdapter({
    baseUrl,
    instanceId,
    token
  });

  const attestation=await waitForAttestation(studio,attestationTimeoutMs);
  const preflight=await runLiveStudioPlaytestProof(studio,{
    timeoutMs:Math.min(30_000,attestationTimeoutMs),
    pollMs:250
  });
  await writeFile(preflightPath,JSON.stringify(preflight,null,2) + '\n');

  const env={
    ...process.env,
    STARBLOX_STUDIO_BRIDGE_URL:baseUrl,
    STARBLOX_STUDIO_INSTANCE_ID:instanceId,
    STARBLOX_STUDIO_BRIDGE_TOKEN:token
  };

  runNode('scripts/ai-development-factory.mjs',[
    '--task',taskPath,
    '--adapter','tools/dev_factory/milestone4-live-adapter.mjs',
    '--out',runPath,
    '--adaptation-receipt',adaptationPath
  ],{env});

  const run=JSON.parse(await readFile(runPath,'utf8'));
  const runValidation=verifyDevelopmentRun(run);
  if(!runValidation.ok){
    throw new Error('Milestone 4 development run is invalid: ' + runValidation.errors.join('; '));
  }
  if(run.status !== 'verified'){
    throw new Error('Milestone 4 development run did not verify');
  }
  if(
    run.verificationSummary?.studioTestsRequired !== true ||
    run.verificationSummary?.studioTestsPassed !== true ||
    run.verificationSummary?.runtimeRequired !== true ||
    run.verificationSummary?.runtimePassed !== true ||
    run.verificationSummary?.visualRequired !== true ||
    run.verificationSummary?.visualPassed !== true
  ){
    throw new Error('Milestone 4 development run is missing required live evidence');
  }

  const adaptation=JSON.parse(await readFile(adaptationPath,'utf8'));
  const adaptationValidation=verifyMigrationAdaptationReceipt(adaptation);
  if(!adaptationValidation.ok){
    throw new Error(
      'Milestone 4 adaptation receipt is invalid: ' +
      adaptationValidation.errors.join('; ')
    );
  }

  runNode('scripts/promote-migration-adaptation.mjs',[
    '--adaptation-receipt',adaptationPath,
    '--units',packet.unitId,
    '--out',promotionPath
  ],{env});

  const promotion=JSON.parse(await readFile(promotionPath,'utf8'));
  const promotionValidation=verifyMigrationPromotionReceipt(promotion);
  if(!promotionValidation.ok){
    throw new Error(
      'Milestone 4 promotion receipt is invalid: ' +
      promotionValidation.errors.join('; ')
    );
  }

  const [
    preflightDigest,
    runDigest,
    adaptationDigest,
    promotionDigest
  ]=await Promise.all([
    digest(preflightPath),
    digest(runPath),
    digest(adaptationPath),
    digest(promotionPath)
  ]);

  const completionBase={
    schemaVersion:1,
    version:'starblox-milestone4-completion-v1',
    status:'complete',
    unitId:packet.unitId,
    packetHash:packet.packetHash,
    stagingReceiptHash:stagingReceipt.receiptHash,
    studio:{
      instanceId:attestation.proof.instanceId,
      connectorVersion:attestation.proof.connectorVersion,
      connectedTools:attestation.proof.connectedTools,
      preflightProof:{
        file:'live-studio-preflight.json',
        sha256:preflightDigest.sha256,
        bytes:preflightDigest.bytes,
        proofVersion:preflight.proofVersion
      }
    },
    developmentRun:{
      file:'ai-development-run.json',
      sha256:runDigest.sha256,
      bytes:runDigest.bytes,
      runId:run.runId,
      runHash:run.runHash,
      mutationTargetsHash:run.mutationSummary?.targetsHash,
      verificationSummaryHash:run.verificationSummary?.summaryHash
    },
    adaptation:{
      file:'migration-adaptation-receipt.json',
      sha256:adaptationDigest.sha256,
      bytes:adaptationDigest.bytes,
      receiptHash:adaptation.receiptHash
    },
    promotion:{
      file:'migration-promotion-receipt.json',
      sha256:promotionDigest.sha256,
      bytes:promotionDigest.bytes,
      receiptHash:promotion.receiptHash,
      targetStatus:promotion.promotion?.targetStatus
    },
    evidence:{
      studioTestsPassed:true,
      runtimePlaytestPassed:true,
      viewportEvidencePassed:true,
      runtimeLogsPassed:true,
      repositoryGatesPassed:true,
      quarantineExitCertified:true
    },
    publicationStarted:false,
    liveActivationAllowed:false,
    productionActivationAllowed:false,
    nextStep:'final-release-readiness-audit'
  };
  const completion={
    ...completionBase,
    receiptHash:'sha256:' + sha256(
      Buffer.from(JSON.stringify(completionBase),'utf8')
    )
  };
  await writeFile(completionPath,JSON.stringify(completion,null,2) + '\n');

  console.log('StarBlox Milestone 4 live Studio cycle complete');
  console.log('unit: ' + packet.unitId);
  console.log('Studio instance: ' + attestation.proof.instanceId);
  console.log('development run: ' + run.runId);
  console.log('promotion target: ' + promotion.promotion.targetStatus);
  console.log('completion receipt: ' + completionPath);
  console.log('publication started: false');
  console.log('production activation allowed: false');
}finally{
  if(startedBridge && bridgeProcess && bridgeProcess.exitCode === null){
    bridgeProcess.kill('SIGTERM');
  }
}
