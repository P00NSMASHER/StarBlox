import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,isAbsolute,resolve} from 'node:path';

import {buildSameDayPipelinePlan} from '../src/sameDayPipeline/sameDayPipeline.js';
import {verifyDevelopmentRun} from '../src/devFactory/developmentFactory.js';

function arg(name,def=null){
  const inline=process.argv.find(v=>v.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 && process.argv[i+1] ? process.argv[i+1] : def;
}
function abs(base,value){ return isAbsolute(value) ? resolve(value) : resolve(base,value); }
function sha256(bytes){ return createHash('sha256').update(bytes).digest('hex'); }

const manifestPath=resolve(process.cwd(),arg('--manifest','config/same-day/pipeline.example.json'));
const manifestDir=dirname(manifestPath);
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const plan=buildSameDayPipelinePlan(manifest);
const outDir=abs(manifestDir,manifest.outputDir || plan.outputDir);
const statePath=resolve(outDir,'same-day-pipeline-state.json');
const smokePath=resolve(outDir,'studio-staging-smoke.json');
const outPath=resolve(outDir,arg('--out','same-day-adaptation-receipt.json'));

const stateBytes=await readFile(statePath);
const state=JSON.parse(stateBytes);
if(state.planHash!==plan.planHash){
  throw new Error('adaptation receipt state/plan hash mismatch');
}

const requiredStages=[
  'verify-studio-staging',
  'adapt-brookhaven',
  'adapt-robbing',
  'integrate-arnis',
  'integrate-achassis',
  'integrate-flex',
  'integrate-rorooms',
  'wire-quest-mastery'
];
for(const id of requiredStages){
  if(state.stages?.[id]?.status!=='complete'){
    throw new Error('required adaptation stage is not complete: '+id);
  }
}

const smokeBytes=await readFile(smokePath);
const smoke=JSON.parse(smokeBytes);
if(
  smoke.version!=='starblox-studio-staging-smoke-v1' ||
  smoke.status!=='passed' ||
  smoke.publicationAllowed!==false ||
  Number(smoke.mutationCalls)!==0
){
  throw new Error('Studio staging smoke receipt is invalid');
}

const runFiles={
  'adapt-brookhaven':resolve(outDir,'sources/brookhaven/adapt-development-run.json'),
  'adapt-robbing':resolve(outDir,'sources/robbing/adapt-development-run.json'),
  'integrate-arnis':resolve(outDir,'integrate-arnis-development-run.json'),
  'integrate-achassis':resolve(outDir,'integrate-achassis-development-run.json'),
  'integrate-flex':resolve(outDir,'integrate-flex-development-run.json'),
  'integrate-rorooms':resolve(outDir,'integrate-rorooms-development-run.json'),
  'wire-quest-mastery':resolve(outDir,'wire-quest-mastery-development-run.json')
};

const expectedDonors={
  'integrate-arnis':{donorId:'arnis',commit:'ff7984f990336da1d9f303d54b3f2e223bfdab35'},
  'integrate-achassis':{donorId:'achassis',commit:'3533c32ed04210fd11eaa8d4c45ddc5da951f6fb'},
  'integrate-flex':{donorId:'flex',commit:'f23ff0b06c759e60aa651a6618a8d81692719fc9'},
  'integrate-rorooms':{donorId:'rorooms',commit:'3d06941343b5bd70a92044b45fe25deb3e4e2095'}
};

const runs={};
for(const [stageId,file] of Object.entries(runFiles)){
  const stageResult=state.stages?.[stageId]?.result || {};
  if(stageResult.skipped===true){
    runs[stageId]={
      skipped:true,
      reason:String(stageResult.reason || ''),
      file:null,
      sha256:null,
      runHash:null
    };
    continue;
  }
  const bytes=await readFile(file);
  const run=JSON.parse(bytes);
  const validation=verifyDevelopmentRun(run);
  if(!validation.ok){
    throw new Error(stageId+' development run failed structural validation: '+validation.errors.join('; '));
  }
  if(run.status!=='verified'){
    throw new Error(stageId+' development run is not verified');
  }
  if(run.studioAttestation?.required===true && run.studioAttestation?.attested!==true){
    throw new Error(stageId+' Studio attestation is missing');
  }

  const expectedDonor=expectedDonors[stageId];
  if(expectedDonor){
    const spec=run.task?.adapterSpecEvidence;
    if(!spec){
      throw new Error(stageId+' is missing donor adapter spec evidence');
    }
    if(
      spec.donorId!==expectedDonor.donorId ||
      String(spec.commit || '').toLowerCase()!==expectedDonor.commit
    ){
      throw new Error(stageId+' donor adapter evidence does not match pinned donor');
    }
  }

  if(stageId==='adapt-brookhaven' || stageId==='adapt-robbing'){
    const migration=run.task?.migrationEvidence;
    if(
      !migration ||
      migration.status!=='verified' ||
      migration.liveActivationAllowed!==false
    ){
      throw new Error(stageId+' is missing verified staging-only migration evidence');
    }
  }

  runs[stageId]={
    skipped:false,
    file,
    sha256:sha256(bytes),
    runHash:run.runHash,
    status:run.status
  };
}

const payload={
  schemaVersion:1,
  version:'starblox-same-day-adaptation-receipt-v1',
  status:'verified',
  planHash:plan.planHash,
  state:{
    file:statePath,
    sha256:sha256(stateBytes),
    completedStages:[...state.completedStages]
  },
  studioSmoke:{
    file:smokePath,
    sha256:sha256(smokeBytes),
    receiptHash:smoke.receiptHash
  },
  requiredStages,
  runs,
  publicationAllowed:false,
  readyForIntegratedSliceVerification:true
};
const receipt={...payload,receiptHash:'sha256:'+sha256(JSON.stringify(payload))};
await writeFile(outPath,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));