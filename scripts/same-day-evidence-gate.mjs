import { readFile } from 'node:fs/promises';
import { isAbsolute,resolve } from 'node:path';

function arg(name,def=null){
  const inline=process.argv.find(value=>value.startsWith(name + '='));
  if(inline) return inline.slice(name.length + 1);
  const index=process.argv.indexOf(name);
  if(index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')){
    return process.argv[index + 1];
  }
  return def;
}

function absolute(value){
  return isAbsolute(value) ? resolve(value) : resolve(process.cwd(),value);
}

function passed(value){
  return value === true || Boolean(value && typeof value === 'object' && value.ok === true);
}

const gate=String(arg('--gate','')).trim().toLowerCase();
if(!['mobile','security','performance'].includes(gate)){
  throw new Error('--gate must be mobile, security or performance');
}

const runPath=absolute(
  arg('--run') ||
  process.env.STARBLOX_PIPELINE_INTEGRATED_RUN ||
  ''
);
if(!runPath) throw new Error('integrated development run path is required');

const run=JSON.parse(await readFile(runPath,'utf8'));
if(run.status !== 'verified'){
  throw new Error('integrated development run is not verified: ' + run.status);
}

const verifyCycle=[...(run.cycles || [])].reverse().find(row=>row?.stage === 'verify');
if(!verifyCycle?.evidence){
  throw new Error('integrated development run has no verification evidence');
}
const evidence=verifyCycle.evidence;
const runtime=evidence.runtime || {};
const plan=run.plan || {};

if(gate === 'security'){
  if(run.studioAttestation?.required === true && run.studioAttestation?.attested !== true){
    throw new Error('Studio connector attestation is not valid');
  }
  if(run.rollback?.ok !== true){
    throw new Error('development rollback state is not clean');
  }
  const required=['tests','certification','balance','build'];
  const missing=required.filter(name=>!passed(run.repository?.gates?.[name]));
  if(missing.length){
    throw new Error('repository proof missing/failing gates: ' + missing.join(', '));
  }
  if(Array.isArray(evidence.errors) && evidence.errors.length){
    throw new Error('verification contains errors: ' + evidence.errors.join('; '));
  }
  console.log('StarBlox same-day security evidence gate: PASS');
}

if(gate === 'mobile'){
  const acceptance=(plan.acceptance || []).map(String).join(' ').toLowerCase();
  if(!/mobile|touch|small[- ]screen|phone|tablet/.test(acceptance)){
    throw new Error('verification plan does not explicitly include mobile/touch acceptance');
  }
  if(plan.visual?.required !== true){
    throw new Error('mobile gate requires visual verification');
  }
  if(runtime.screenshot?.captured !== true){
    throw new Error('mobile gate requires a captured viewport');
  }
  if(evidence.visualReview?.ok !== true){
    throw new Error('mobile gate requires an accepted visual review');
  }
  if(Array.isArray(runtime.errors) && runtime.errors.length){
    throw new Error('mobile runtime evidence contains errors: ' + runtime.errors.join('; '));
  }
  console.log(
    'StarBlox same-day mobile evidence gate: PASS (' +
    String(runtime.screenshot.width || '?') + 'x' +
    String(runtime.screenshot.height || '?') + ')'
  );
}

if(gate === 'performance'){
  const perf=runtime.telemetry?.performance;
  if(!perf || typeof perf !== 'object'){
    throw new Error('performance telemetry is missing; request the performance telemetry domain');
  }
  const minHz=Number(arg('--min-hz','25'));
  const maxP95=Number(arg('--max-p95-ms','50'));
  const maxMemoryRaw=arg('--max-memory-mb',null);
  const maxMemory=maxMemoryRaw == null ? null : Number(maxMemoryRaw);

  if(!Number.isFinite(Number(perf.averageHz)) || Number(perf.averageHz) < minHz){
    throw new Error(
      'average runtime frequency below threshold: ' +
      String(perf.averageHz) + ' < ' + minHz
    );
  }
  if(!Number.isFinite(Number(perf.p95FrameMs)) || Number(perf.p95FrameMs) > maxP95){
    throw new Error(
      'p95 frame time above threshold: ' +
      String(perf.p95FrameMs) + ' > ' + maxP95 + ' ms'
    );
  }
  if(
    maxMemory != null &&
    Number.isFinite(Number(perf.memoryMb)) &&
    Number(perf.memoryMb) > maxMemory
  ){
    throw new Error(
      'memory above threshold: ' + String(perf.memoryMb) + ' > ' + maxMemory + ' MB'
    );
  }

  console.log(
    'StarBlox same-day performance evidence gate: PASS ' +
    '(avg ' + Number(perf.averageHz).toFixed(1) + ' Hz, p95 ' +
    Number(perf.p95FrameMs).toFixed(1) + ' ms)'
  );
}
