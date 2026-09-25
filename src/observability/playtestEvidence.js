import { stableHash } from '../domainSchemas.js';
import {
  createDiagnosticSession,
  diagnosticSummary,
  endDiagnosticSession,
  recordDiagnosticEvent,
  verifyDiagnosticSession
} from './sessionDiagnostics.js';

export const PLAYTEST_RECEIPT_SCHEMA_VERSION=1;
export const PLAYTEST_RECEIPT_VERSION='starblox-human-playtest-v1';

const TESTER_CONTEXTS=new Set([
  'adult_external',
  'supervised_minor_external',
  'internal_staff'
]);
const FEEDBACK_VALUES=new Set(['positive','neutral','negative']);

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function freeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) freeze(child);
  return value;
}

function iso(value,label){
  const date=value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) throw new TypeError(label + ' must be a valid date/time.');
  return date.toISOString();
}

function numeric(value){
  const n=Number(value);
  return Number.isFinite(n) ? n : 0;
}

function snapshotSave(save={}){
  return {
    questsCompleted:numeric(save.questsCompleted),
    transferWins:numeric(save.transferWins),
    coins:numeric(save.coins),
    stars:numeric(save.stars),
    masteredCount:Array.isArray(save.mastered) ? save.mastered.length : 0
  };
}

function payload(receipt){
  const {receiptHash,...rest}=receipt;
  return rest;
}

export function createPlaytestRun({
  runId,
  startedAt,
  testerContext,
  consentConfirmed,
  saveSnapshot={}
}){
  if(typeof runId !== 'string' || !runId.trim()) throw new TypeError('runId is required.');
  if(!TESTER_CONTEXTS.has(testerContext)) throw new TypeError('unsupported testerContext.');
  if(consentConfirmed !== true) throw new Error('explicit playtest consent confirmation is required.');

  const start=iso(startedAt,'startedAt');
  let diagnostic=createDiagnosticSession({
    sessionId:runId.trim(),
    startedAt:start,
    metadata:{
      mode:'human-playtest',
      testerContext
    }
  });
  diagnostic=recordDiagnosticEvent(diagnostic,{
    type:'playtest-start',
    at:start,
    data:{testerContext}
  });

  return freeze({
    schemaVersion:PLAYTEST_RECEIPT_SCHEMA_VERSION,
    receiptVersion:PLAYTEST_RECEIPT_VERSION,
    runId:runId.trim(),
    testerContext,
    consentConfirmed:true,
    startedAt:start,
    endedAt:null,
    initialSave:snapshotSave(saveSnapshot),
    finalSave:null,
    feedback:null,
    diagnostic,
    externalEvidenceEligible:false,
    outcomeClassification:'UNCLASSIFIED',
    retentionEligible:false,
    receiptHash:null
  });
}

export function recordPlaytestScreen(run,{screen,at}){
  verifyPlaytestRun(run);
  if(run.endedAt) throw new Error('playtest run is already finalized.');
  if(typeof screen !== 'string' || !screen.trim()) return run;

  const diagnostic=recordDiagnosticEvent(run.diagnostic,{
    type:'screen-view',
    at:iso(at,'screen.at'),
    data:{screen:screen.trim().slice(0,40)}
  });

  return freeze({...run,diagnostic});
}

export function finalizePlaytestRun(run,{
  endedAt,
  feedback,
  wouldPlayAgain,
  saveSnapshot={}
}){
  verifyPlaytestRun(run);
  if(run.endedAt) throw new Error('playtest run is already finalized.');
  if(!FEEDBACK_VALUES.has(feedback)) throw new TypeError('feedback must be positive, neutral, or negative.');
  if(typeof wouldPlayAgain !== 'boolean') throw new TypeError('wouldPlayAgain must be boolean.');

  const end=iso(endedAt,'endedAt');
  if(Date.parse(end) < Date.parse(run.startedAt)){
    throw new Error('endedAt cannot be earlier than startedAt.');
  }

  let diagnostic=recordDiagnosticEvent(run.diagnostic,{
    type:'playtest-end',
    at:end,
    data:{feedback,wouldPlayAgain}
  });
  diagnostic=endDiagnosticSession(diagnostic,{endedAt:end});

  const finalSave=snapshotSave(saveSnapshot);
  const delta={
    questsCompleted:finalSave.questsCompleted-run.initialSave.questsCompleted,
    transferWins:finalSave.transferWins-run.initialSave.transferWins,
    coins:finalSave.coins-run.initialSave.coins,
    stars:finalSave.stars-run.initialSave.stars,
    masteredCount:finalSave.masteredCount-run.initialSave.masteredCount
  };
  const durationSeconds=Math.max(0,Math.round((Date.parse(end)-Date.parse(run.startedAt))/1000));
  const external=run.testerContext !== 'internal_staff';
  const outcomeClassification=
    feedback === 'positive' ? 'PLAYTEST_POSITIVE_SIGNAL' :
    feedback === 'negative' ? 'PLAYTEST_NEGATIVE_SIGNAL' :
    'UNCLASSIFIED';

  const base={
    schemaVersion:PLAYTEST_RECEIPT_SCHEMA_VERSION,
    receiptVersion:PLAYTEST_RECEIPT_VERSION,
    runId:run.runId,
    testerContext:run.testerContext,
    consentConfirmed:true,
    startedAt:run.startedAt,
    endedAt:end,
    durationSeconds,
    initialSave:clone(run.initialSave),
    finalSave,
    progressDelta:delta,
    feedback:{
      overall:feedback,
      wouldPlayAgain
    },
    diagnosticSummary:diagnosticSummary(diagnostic),
    diagnosticHash:diagnostic.diagnosticHash,
    externalEvidenceEligible:external && outcomeClassification !== 'UNCLASSIFIED',
    outcomeClassification,
    retentionEligible:false,
    retentionReason:'A single playtest session cannot establish retention; a separate return-session receipt is required.'
  };

  return freeze({
    ...base,
    receiptHash:stableHash(base)
  });
}

export function verifyPlaytestReceipt(receipt){
  const errors=[];
  if(!receipt || typeof receipt !== 'object' || Array.isArray(receipt)){
    return {ok:false,errors:['receipt must be an object']};
  }
  if(receipt.schemaVersion !== PLAYTEST_RECEIPT_SCHEMA_VERSION) errors.push('unsupported playtest schema');
  if(receipt.receiptVersion !== PLAYTEST_RECEIPT_VERSION) errors.push('unsupported playtest receipt version');
  if(!TESTER_CONTEXTS.has(receipt.testerContext)) errors.push('unsupported tester context');
  if(receipt.consentConfirmed !== true) errors.push('consent confirmation missing');
  if(!FEEDBACK_VALUES.has(receipt.feedback?.overall)) errors.push('invalid feedback');
  if(typeof receipt.feedback?.wouldPlayAgain !== 'boolean') errors.push('invalid wouldPlayAgain');
  if(receipt.retentionEligible !== false) errors.push('single-session receipt cannot claim retention');
  if(receipt.testerContext === 'internal_staff' && receipt.externalEvidenceEligible){
    errors.push('internal staff playtest cannot be external evidence');
  }
  if(receipt.outcomeClassification === 'UNCLASSIFIED' && receipt.externalEvidenceEligible){
    errors.push('neutral/unclassified playtest cannot be allocation evidence');
  }
  try{
    const {receiptHash,...body}=receipt;
    if(stableHash(body) !== receiptHash) errors.push('playtest receipt hash mismatch');
  }catch{
    errors.push('playtest receipt is not hashable');
  }
  return {ok:errors.length === 0,errors};
}

export function verifyPlaytestRun(run){
  const errors=[];
  if(!run || typeof run !== 'object') errors.push('run must be an object');
  if(run?.schemaVersion !== PLAYTEST_RECEIPT_SCHEMA_VERSION) errors.push('unsupported playtest schema');
  if(run?.receiptVersion !== PLAYTEST_RECEIPT_VERSION) errors.push('unsupported playtest version');
  if(!TESTER_CONTEXTS.has(run?.testerContext)) errors.push('unsupported tester context');
  if(run?.consentConfirmed !== true) errors.push('consent confirmation missing');
  const diagnostic=run?.diagnostic ? verifyDiagnosticSession(run.diagnostic) : {ok:false,errors:['missing diagnostic session']};
  if(!diagnostic.ok) errors.push(...diagnostic.errors);
  if(errors.length) throw new Error('invalid playtest run: ' + errors[0]);
  return {ok:true,errors:[]};
}
