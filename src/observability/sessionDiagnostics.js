
import { stableHash } from '../domainSchemas.js';

export const DIAGNOSTIC_SESSION_SCHEMA_VERSION=1;
export const DIAGNOSTIC_SESSION_VERSION='starblox-observability-v1';

const DEFAULT_MAX_EVENTS=500;
const DEFAULT_MAX_ERRORS=50;
const DEFAULT_MAX_NETWORK=100;
const DEFAULT_MAX_VALUE_LENGTH=240;
const DEFAULT_EVENT_THROTTLE=60;

const SENSITIVE_KEY_RE=/(authorization|cookie|token|secret|password|passcode|email|phone|address|session.?token|api.?key|credential)/i;
const EMAIL_RE=/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const LONG_NUMBER_RE=/\b\d{7,}\b/g;
const BEARER_RE=/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT_RE=/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function text(value,max=DEFAULT_MAX_VALUE_LENGTH){
  return String(value ?? '').slice(0,max);
}

function redactString(value,max=DEFAULT_MAX_VALUE_LENGTH){
  return text(value,max)
    .replace(BEARER_RE,'Bearer [REDACTED]')
    .replace(JWT_RE,'[REDACTED_JWT]')
    .replace(EMAIL_RE,'[REDACTED_EMAIL]')
    .replace(LONG_NUMBER_RE,'[REDACTED_NUMBER]');
}

function sanitizeValue(value,{depth=0,maxDepth=3,maxStringLength=DEFAULT_MAX_VALUE_LENGTH}={}){
  if(depth > maxDepth) return '[TRUNCATED]';
  if(value == null || typeof value === 'boolean') return value;
  if(typeof value === 'number') return Number.isFinite(value) ? value : null;
  if(typeof value === 'string') return redactString(value,maxStringLength);
  if(Array.isArray(value)){
    return value.slice(0,30).map(item => sanitizeValue(item,{depth:depth + 1,maxDepth,maxStringLength}));
  }
  if(typeof value === 'object'){
    const out={};
    for(const [key,child] of Object.entries(value).slice(0,40)){
      out[key]=SENSITIVE_KEY_RE.test(key)
        ? '[REDACTED]'
        : sanitizeValue(child,{depth:depth + 1,maxDepth,maxStringLength});
    }
    return out;
  }
  return redactString(value,maxStringLength);
}

function sanitizeMetadata(metadata){
  const out={};
  if(!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return out;
  for(const [key,value] of Object.entries(metadata).slice(0,50)){
    if(SENSITIVE_KEY_RE.test(key)) continue;
    out[text(key,80)]=redactString(value,120);
  }
  return out;
}

function cleanIso(value,label){
  const date=value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) throw new TypeError(label + ' must be a valid date/time.');
  return date.toISOString();
}

function stripUrl(raw){
  try{
    const url=new URL(String(raw),'https://starblox.invalid');
    const origin=url.origin === 'https://starblox.invalid' ? '' : url.origin;
    return (origin + url.pathname).slice(0,300);
  }catch{
    return redactString(String(raw).split('?')[0].split('#')[0],300);
  }
}

function payload(session){
  return {
    schemaVersion:session.schemaVersion,
    sessionVersion:session.sessionVersion,
    sessionId:session.sessionId,
    startedAt:session.startedAt,
    endedAt:session.endedAt,
    metadata:session.metadata,
    counters:session.counters,
    performance:session.performance,
    events:session.events,
    errors:session.errors,
    network:session.network
  };
}

function finalize(raw){
  const base={
    schemaVersion:DIAGNOSTIC_SESSION_SCHEMA_VERSION,
    sessionVersion:DIAGNOSTIC_SESSION_VERSION,
    sessionId:text(raw.sessionId,120),
    startedAt:raw.startedAt,
    endedAt:raw.endedAt ?? null,
    metadata:clone(raw.metadata || {}),
    counters:clone(raw.counters || {}),
    performance:clone(raw.performance || {}),
    events:clone(raw.events || []),
    errors:clone(raw.errors || []),
    network:clone(raw.network || [])
  };
  return deepFreeze({
    ...base,
    diagnosticHash:stableHash(payload(base))
  });
}

export function createDiagnosticSession({
  sessionId,
  startedAt,
  metadata={}
}){
  if(typeof sessionId !== 'string' || !sessionId.trim()){
    throw new TypeError('sessionId must be a non-empty string.');
  }

  return finalize({
    sessionId:sessionId.trim(),
    startedAt:cleanIso(startedAt,'startedAt'),
    endedAt:null,
    metadata:sanitizeMetadata(metadata),
    counters:{
      eventCount:0,
      droppedEvents:0,
      errorCount:0,
      networkCount:0,
      failedNetworkCount:0
    },
    performance:{},
    events:[],
    errors:[],
    network:[]
  });
}

function assertSession(session){
  const validation=verifyDiagnosticSession(session);
  if(!validation.ok) throw new Error('invalid diagnostic session: ' + validation.errors[0]);
}

export function verifyDiagnosticSession(session){
  const errors=[];
  if(!session || typeof session !== 'object' || Array.isArray(session)){
    return {ok:false,errors:['session must be an object']};
  }
  if(session.schemaVersion !== DIAGNOSTIC_SESSION_SCHEMA_VERSION){
    errors.push('unsupported diagnostic schema');
  }
  if(session.sessionVersion !== DIAGNOSTIC_SESSION_VERSION){
    errors.push('unsupported diagnostic implementation version');
  }
  try{ cleanIso(session.startedAt,'startedAt'); }catch(error){ errors.push(error.message); }
  if(session.endedAt != null){
    try{ cleanIso(session.endedAt,'endedAt'); }catch(error){ errors.push(error.message); }
  }
  for(const event of session.events || []){
    if(!event || typeof event !== 'object' || typeof event.type !== 'string'){
      errors.push('invalid diagnostic event');
      break;
    }
  }
  try{
    if(stableHash(payload(session)) !== session.diagnosticHash){
      errors.push('diagnostic hash mismatch');
    }
  }catch{
    errors.push('diagnostic session is not hashable');
  }
  return {ok:errors.length === 0,errors};
}

export function setDiagnosticMetadata(session,key,value){
  assertSession(session);
  if(typeof key !== 'string' || !key.trim()) throw new TypeError('metadata key is required.');
  if(SENSITIVE_KEY_RE.test(key)) return session;

  return finalize({
    ...session,
    metadata:{
      ...session.metadata,
      [text(key.trim(),80)]:redactString(value,120)
    }
  });
}

export function recordDiagnosticEvent(session,{
  type,
  at,
  data={},
  maxEvents=DEFAULT_MAX_EVENTS,
  throttlePerType=DEFAULT_EVENT_THROTTLE,
  throttleWindowMs=60_000
}){
  assertSession(session);
  if(typeof type !== 'string' || !type.trim()) throw new TypeError('event type is required.');
  const eventType=text(type.trim(),80);
  const timestamp=cleanIso(at,'event.at');
  const ts=Date.parse(timestamp);
  const recent=(session.events || []).filter(event =>
    event.type === eventType &&
    ts - Date.parse(event.at) >= 0 &&
    ts - Date.parse(event.at) <= throttleWindowMs
  );

  if(recent.length >= throttlePerType){
    return finalize({
      ...session,
      counters:{
        ...session.counters,
        droppedEvents:(session.counters.droppedEvents || 0) + 1
      }
    });
  }

  const nextEvents=[
    ...(session.events || []),
    {
      type:eventType,
      at:timestamp,
      data:sanitizeValue(data)
    }
  ];
  const capped=nextEvents.slice(-Math.max(1,maxEvents));

  return finalize({
    ...session,
    events:capped,
    counters:{
      ...session.counters,
      eventCount:(session.counters.eventCount || 0) + 1,
      droppedEvents:(session.counters.droppedEvents || 0) + Math.max(0,nextEvents.length - capped.length)
    }
  });
}

export function recordDiagnosticError(session,error,{
  at,
  context={},
  maxErrors=DEFAULT_MAX_ERRORS
}={}){
  assertSession(session);
  const timestamp=cleanIso(at,'error.at');
  const name=redactString(error?.name || 'Error',80);
  const message=redactString(error?.message || String(error || 'Unknown error'),500);
  const stack=redactString(error?.stack || '',1200);

  const errors=[
    ...(session.errors || []),
    {
      at:timestamp,
      name,
      message,
      stack,
      context:sanitizeValue(context)
    }
  ].slice(-Math.max(1,maxErrors));

  return finalize({
    ...session,
    errors,
    counters:{
      ...session.counters,
      errorCount:(session.counters.errorCount || 0) + 1
    }
  });
}

export function recordNetworkObservation(session,{
  at,
  method='GET',
  url,
  status=0,
  durationMs=0,
  responseBytes=0
},{
  failuresOnly=false,
  maxNetwork=DEFAULT_MAX_NETWORK
}={}){
  assertSession(session);
  const code=Number(status);
  const failed=!Number.isFinite(code) || code === 0 || code >= 400;
  if(failuresOnly && !failed) return session;

  const row={
    at:cleanIso(at,'network.at'),
    method:text(method,12).toUpperCase(),
    url:stripUrl(url),
    status:Number.isFinite(code) ? Math.max(0,Math.floor(code)) : 0,
    durationMs:Number.isFinite(durationMs) ? Math.max(0,Math.round(durationMs)) : 0,
    responseBytes:Number.isFinite(responseBytes) ? Math.max(0,Math.round(responseBytes)) : 0,
    failed
  };

  const network=[...(session.network || []),row].slice(-Math.max(1,maxNetwork));
  return finalize({
    ...session,
    network,
    counters:{
      ...session.counters,
      networkCount:(session.counters.networkCount || 0) + 1,
      failedNetworkCount:(session.counters.failedNetworkCount || 0) + (failed ? 1 : 0)
    }
  });
}

export function recordPerformanceSnapshot(session,{
  fps,
  frameMs,
  memoryMb,
  longFrames=0,
  at
}){
  assertSession(session);
  const previous=session.performance || {};
  const samples=(previous.samples || 0) + 1;
  const cleanFps=Number.isFinite(fps) ? Math.max(0,fps) : 0;
  const cleanFrame=Number.isFinite(frameMs) ? Math.max(0,frameMs) : 0;
  const avgFps=((previous.avgFps || 0) * (samples - 1) + cleanFps) / samples;
  const avgFrameMs=((previous.avgFrameMs || 0) * (samples - 1) + cleanFrame) / samples;

  return finalize({
    ...session,
    performance:{
      samples,
      avgFps,
      minFps:samples === 1 ? cleanFps : Math.min(previous.minFps ?? cleanFps,cleanFps),
      avgFrameMs,
      maxFrameMs:Math.max(previous.maxFrameMs || 0,cleanFrame),
      memoryMb:Number.isFinite(memoryMb) ? Math.max(0,memoryMb) : (previous.memoryMb ?? null),
      longFrames:(previous.longFrames || 0) + Math.max(0,Math.floor(Number(longFrames) || 0)),
      lastAt:cleanIso(at,'performance.at')
    }
  });
}

export function endDiagnosticSession(session,{endedAt}){
  assertSession(session);
  const end=cleanIso(endedAt,'endedAt');
  if(Date.parse(end) < Date.parse(session.startedAt)){
    throw new Error('endedAt cannot be earlier than startedAt.');
  }
  return finalize({...session,endedAt:end});
}

export function diagnosticSummary(session){
  assertSession(session);
  return deepFreeze({
    sessionId:session.sessionId,
    startedAt:session.startedAt,
    endedAt:session.endedAt,
    metadata:clone(session.metadata),
    counters:clone(session.counters),
    performance:clone(session.performance),
    recentEvents:clone((session.events || []).slice(-20)),
    recentErrors:clone((session.errors || []).slice(-10)),
    recentNetwork:clone((session.network || []).slice(-20)),
    diagnosticHash:session.diagnosticHash
  });
}

export function sanitizeDiagnosticValue(value){
  return sanitizeValue(value);
}
