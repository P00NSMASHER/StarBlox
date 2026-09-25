import { readFile } from 'node:fs/promises';
import { dirname,isAbsolute,resolve } from 'node:path';

import { buildSameDayPipelinePlan,readySameDayPipelineStages } from '../src/sameDayPipeline/sameDayPipeline.js';

function arg(name,required=false){
  const inline=process.argv.find(value=>value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (()=>{
    const i=process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}
function abs(base,value){
  return isAbsolute(value) ? resolve(value) : resolve(base,value);
}
function msBetween(a,b){
  const start=Date.parse(a || '');
  const end=Date.parse(b || '');
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0,end-start) : null;
}
function human(ms){
  if(ms == null) return '-';
  const seconds=Math.round(ms/1000);
  if(seconds < 60) return seconds+'s';
  const minutes=Math.floor(seconds/60);
  const remain=seconds%60;
  return minutes+'m '+remain+'s';
}

const manifestPath=resolve(process.cwd(),arg('--manifest',true));
const manifestDir=dirname(manifestPath);
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const plan=buildSameDayPipelinePlan(manifest);
const outDir=abs(manifestDir,manifest.outputDir || plan.outputDir);
const statePath=resolve(outDir,'same-day-pipeline-state.json');
const state=JSON.parse(await readFile(statePath,'utf8'));

if(state.planHash !== plan.planHash){
  throw new Error('saved state belongs to a different manifest/plan');
}

const rows=plan.stages.map(stage=>{
  const row=state.stages?.[stage.id] || {};
  const result=row.result || {};
  return {
    id:stage.id,
    type:stage.type,
    status:row.status || 'pending',
    attempts:Number(row.attemptCount || 0),
    durationMs:msBetween(result.startedAt,result.completedAt),
    error:result.error || (result.ok === false ? result.stderr || null : null)
  };
});

const completed=rows.filter(row=>row.status==='complete');
const failed=rows.filter(row=>row.status==='failed');
const pending=rows.filter(row=>!['complete','failed'].includes(row.status));
const timed=completed.filter(row=>row.durationMs != null).sort((a,b)=>b.durationMs-a.durationMs);
const starts=completed.map(row=>Date.parse(state.stages[row.id]?.result?.startedAt || '')).filter(Number.isFinite);
const ends=completed.map(row=>Date.parse(state.stages[row.id]?.result?.completedAt || '')).filter(Number.isFinite);
const wallMs=starts.length && ends.length ? Math.max(...ends)-Math.min(...starts) : null;
const workMs=timed.reduce((sum,row)=>sum+row.durationMs,0);
const ready=readySameDayPipelineStages(state,plan).map(row=>row.id);

const report={
  schemaVersion:1,
  version:'starblox-same-day-status-v1',
  planHash:plan.planHash,
  status:state.status,
  progress:{
    completed:completed.length,
    failed:failed.length,
    pending:pending.length,
    total:rows.length,
    percent:Number(((completed.length/rows.length)*100).toFixed(1))
  },
  timing:{
    wallMs,
    summedStageMs:workMs,
    parallelSavingsMs:wallMs == null ? null : Math.max(0,workMs-wallMs),
    slowest:timed.slice(0,5).map(row=>({
      id:row.id,
      durationMs:row.durationMs
    }))
  },
  ready,
  blockers:failed.map(row=>({id:row.id,error:row.error})),
  stages:rows
};

if(process.argv.includes('--json')){
  console.log(JSON.stringify(report,null,2));
}else{
  console.log('StarBlox same-day pipeline status');
  console.log('status: '+report.status);
  console.log('progress: '+completed.length+'/'+rows.length+' ('+report.progress.percent+'%)');
  console.log('elapsed: '+human(wallMs));
  if(report.timing.parallelSavingsMs != null){
    console.log('parallelized stage time saved: '+human(report.timing.parallelSavingsMs));
  }
  if(ready.length) console.log('ready next: '+ready.join(', '));
  if(failed.length){
    console.log('BLOCKERS');
    for(const row of failed) console.log('  '+row.id+': '+String(row.error || 'failed'));
  }
  if(timed.length){
    console.log('slowest completed stages');
    for(const row of timed.slice(0,5)){
      console.log('  '+row.id+': '+human(row.durationMs));
    }
  }
  console.log('state: '+statePath);
}
