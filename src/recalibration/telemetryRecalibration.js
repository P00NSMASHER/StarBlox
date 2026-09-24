
import { stableHash } from '../domainSchemas.js';
import {
  getQuestionEntry,
  getQuestionVersion
} from '../questionBank/questionBankV2.js';
import {
  DEFAULT_POLICY_WEIGHTS
} from '../intelligence/questionPolicy.js';
import {
  irtItemFromQuestionVersion,
  probabilityCorrect,
  updateItemCalibration
} from '../intelligence/irtEngine.js';
import {
  IDENTITY_BALANCE,
  resolveBalanceDoc
} from '../balance/balanceConfig.js';
import {
  buildBalanceReport,
  compareBalanceReports
} from '../balance/balanceGate.js';

export const RECALIBRATION_SCHEMA_VERSION=1;
export const RECALIBRATION_VERSION='starblox-recalibration-v1';
export const TRUSTED_TELEMETRY_SOURCE='server-authoritative-export';

const POLICY_KEYS=Object.freeze([
  'memory','irt','entropy','novelty','gameplay','quality'
]);

const FORBIDDEN_EVENT_KEYS=new Set([
  'playerId','uid','email','phone','address','selectedAnswer','answer',
  'prompt','choices','name','username','sessionToken','authorization',
  'cookie','password','secret','apiKey','credential'
]);

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function finite(value,label){
  if(typeof value !== 'number' || !Number.isFinite(value)){
    throw new TypeError(label + ' must be a finite number.');
  }
  return value;
}

function iso(value,label){
  const date=value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) throw new TypeError(label + ' must be a valid date/time.');
  return date.toISOString();
}

function exactQuestionKey(ref){
  return ref.questionId + '@' + ref.version + '#' + ref.contentHash;
}

function hasForbiddenFields(value,path='event',errors=[]){
  if(!value || typeof value !== 'object') return errors;
  if(Array.isArray(value)){
    value.forEach((item,index) => hasForbiddenFields(item,path + '[' + index + ']',errors));
    return errors;
  }
  for(const [key,child] of Object.entries(value)){
    if(FORBIDDEN_EVENT_KEYS.has(key)){
      errors.push(path + '.' + key);
      continue;
    }
    if(child && typeof child === 'object'){
      hasForbiddenFields(child,path + '.' + key,errors);
    }
  }
  return errors;
}

function normalizeRef(raw){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if(typeof raw.questionId !== 'string' || !raw.questionId.trim()) return null;
  if(!Number.isInteger(raw.version) || raw.version < 1) return null;
  if(typeof raw.contentHash !== 'string' || !raw.contentHash.trim()) return null;
  return {
    questionId:raw.questionId.trim(),
    version:raw.version,
    contentHash:raw.contentHash.trim()
  };
}

function normalizeSignals(raw){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out={};
  for(const key of POLICY_KEYS){
    const value=Number(raw[key]);
    if(!Number.isFinite(value) || value < 0 || value > 1) return null;
    out[key]=value;
  }
  return out;
}

function normalizeQuestionEvent(event){
  const ref=normalizeRef(event.questionRef);
  if(!ref || typeof event.correct !== 'boolean') return null;
  const theta=Number(event.theta);
  const se=Number(event.abilityStandardError);
  if(!Number.isFinite(theta) || !Number.isFinite(se) || se <= 0) return null;

  return {
    eventId:event.eventId,
    kind:'question_response',
    source:event.source,
    occurredAt:event.occurredAt,
    questionRef:ref,
    correct:event.correct,
    wasRetry:Boolean(event.wasRetry),
    theta:clamp(theta,-4,4),
    abilityStandardError:Math.max(0.01,se),
    responseMs:Number.isFinite(Number(event.responseMs))
      ? Math.max(0,Math.round(Number(event.responseMs)))
      : null
  };
}

function normalizeSessionEvent(event){
  const firstTryRate=Number(event.firstTryRate);
  const actions=Number(event.actions);
  const coins=Number(event.coins);
  const xp=Number(event.xp);
  if(
    !Number.isFinite(firstTryRate) || firstTryRate < 0 || firstTryRate > 1 ||
    !Number.isFinite(actions) || actions < 0 ||
    !Number.isFinite(coins) || coins < 0 ||
    !Number.isFinite(xp) || xp < 0
  ){
    return null;
  }

  return {
    eventId:event.eventId,
    kind:'session_summary',
    source:event.source,
    occurredAt:event.occurredAt,
    firstTryRate,
    actions,
    coins,
    xp,
    completed:event.completed !== false
  };
}

function normalizePolicyEvent(event){
  const signals=normalizeSignals(event.signals);
  const utility=Number(event.utility);
  if(!signals || !Number.isFinite(utility) || utility < 0 || utility > 1) return null;
  return {
    eventId:event.eventId,
    kind:'policy_outcome',
    source:event.source,
    occurredAt:event.occurredAt,
    signals,
    utility
  };
}

function normalizeTelemetryEvent(raw,index){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    return {ok:false,reason:'event ' + index + ' must be an object'};
  }

  const forbidden=hasForbiddenFields(raw);
  if(forbidden.length){
    return {
      ok:false,
      reason:'event contains forbidden identifying/content fields: ' + forbidden.slice(0,3).join(', ')
    };
  }

  if(typeof raw.eventId !== 'string' || !raw.eventId.trim()){
    return {ok:false,reason:'eventId is required'};
  }
  if(raw.source !== TRUSTED_TELEMETRY_SOURCE){
    return {ok:false,reason:'untrusted telemetry source'};
  }

  let occurredAt;
  try{ occurredAt=iso(raw.occurredAt,'occurredAt'); }
  catch(error){ return {ok:false,reason:error.message}; }

  const base={...raw,eventId:raw.eventId.trim(),occurredAt};
  let event=null;
  if(raw.kind === 'question_response') event=normalizeQuestionEvent(base);
  else if(raw.kind === 'session_summary') event=normalizeSessionEvent(base);
  else if(raw.kind === 'policy_outcome') event=normalizePolicyEvent(base);
  else return {ok:false,reason:'unsupported telemetry kind: ' + String(raw.kind)};

  return event
    ? {ok:true,event}
    : {ok:false,reason:'invalid telemetry payload for kind ' + String(raw.kind)};
}

export function normalizeTrustedTelemetry(events){
  if(!Array.isArray(events)) throw new TypeError('events must be an array.');
  const accepted=[];
  const rejected=[];
  const ids=new Set();

  events.forEach((raw,index) => {
    const normalized=normalizeTelemetryEvent(raw,index);
    if(!normalized.ok){
      rejected.push({index,reason:normalized.reason});
      return;
    }
    if(ids.has(normalized.event.eventId)){
      rejected.push({index,reason:'duplicate eventId: ' + normalized.event.eventId});
      return;
    }
    ids.add(normalized.event.eventId);
    accepted.push(normalized.event);
  });

  accepted.sort((a,b) =>
    a.occurredAt.localeCompare(b.occurredAt) ||
    a.eventId.localeCompare(b.eventId)
  );

  return {
    accepted,
    rejected,
    counts:{
      total:events.length,
      accepted:accepted.length,
      rejected:rejected.length,
      questionResponses:accepted.filter(event => event.kind === 'question_response').length,
      sessionSummaries:accepted.filter(event => event.kind === 'session_summary').length,
      policyOutcomes:accepted.filter(event => event.kind === 'policy_outcome').length
    },
    dataFingerprint:stableHash(accepted)
  };
}

function currentVersionMatches(bank,ref){
  const entry=getQuestionEntry(bank,ref.questionId);
  if(!entry || entry.lifecycle !== 'published') return null;
  if(entry.currentVersion !== ref.version || entry.currentVersionHash !== ref.contentHash) return null;
  const version=getQuestionVersion(bank,ref.questionId,ref.version);
  if(!version || version.contentHash !== ref.contentHash) return null;
  return version;
}

function average(values){
  return values.length ? values.reduce((sum,value) => sum + value,0) / values.length : 0;
}

function standardErrorBernoulli(p,n){
  return n > 0 ? Math.sqrt(Math.max(0,p * (1 - p)) / n) : 1;
}

function capItemDelta(base,candidate,{
  maxDifficultyDelta,
  maxDiscriminationDelta
}){
  return Object.freeze({
    ...candidate,
    difficulty:clamp(
      candidate.difficulty,
      base.difficulty - maxDifficultyDelta,
      base.difficulty + maxDifficultyDelta
    ),
    discrimination:clamp(
      candidate.discrimination,
      Math.max(0.1,base.discrimination - maxDiscriminationDelta),
      Math.min(3,base.discrimination + maxDiscriminationDelta)
    )
  });
}

function calibrateItems(bank,events,itemCalibrations,{
  minItemResponses,
  minOutcomeCount,
  maxAbilityStandardError,
  itemLearningRate,
  itemShrinkage,
  maxDifficultyDelta,
  maxDiscriminationDelta,
  calibrationTolerance
}){
  const byKey=new Map();

  for(const event of events){
    if(event.kind !== 'question_response' || event.wasRetry) continue;
    if(event.abilityStandardError > maxAbilityStandardError) continue;
    const version=currentVersionMatches(bank,event.questionRef);
    if(!version) continue;

    const key=exactQuestionKey(event.questionRef);
    if(!byKey.has(key)) byKey.set(key,{ref:event.questionRef,version,events:[]});
    byKey.get(key).events.push(event);
  }

  const proposals=[];
  const diagnostics=[];

  for(const [key,row] of [...byKey.entries()].sort(([a],[b]) => a.localeCompare(b))){
    const rows=row.events;
    const correctCount=rows.filter(event => event.correct).length;
    const wrongCount=rows.length - correctCount;
    const base=clone(
      itemCalibrations?.[key] ||
      itemCalibrations?.[row.ref.questionId] ||
      irtItemFromQuestionVersion(row.version)
    );

    const observedRate=correctCount / rows.length;
    const expectedRate=average(rows.map(event => probabilityCorrect(event.theta,base)));
    const calibrationError=observedRate - expectedRate;
    const se=standardErrorBernoulli(observedRate,rows.length);

    if(
      rows.length < minItemResponses ||
      correctCount < minOutcomeCount ||
      wrongCount < minOutcomeCount
    ){
      diagnostics.push({
        key,
        status:'insufficient_data',
        responses:rows.length,
        correctCount,
        wrongCount,
        observedRate,
        expectedRate,
        calibrationError,
        standardError:se
      });
      continue;
    }

    let candidate={...base};
    for(const event of rows){
      candidate=updateItemCalibration(candidate,{
        theta:event.theta,
        correct:event.correct,
        learningRate:itemLearningRate,
        shrinkage:itemShrinkage
      });
    }

    candidate=capItemDelta(base,candidate,{
      maxDifficultyDelta,
      maxDiscriminationDelta
    });

    const changed=
      Math.abs(candidate.difficulty - base.difficulty) >= calibrationTolerance ||
      Math.abs(candidate.discrimination - base.discrimination) >= calibrationTolerance;

    const proposal={
      key,
      ref:clone(row.ref),
      responses:rows.length,
      correctCount,
      wrongCount,
      observedRate,
      expectedRate,
      calibrationError,
      standardError:se,
      before:{
        difficulty:base.difficulty,
        discrimination:base.discrimination
      },
      after:{
        difficulty:candidate.difficulty,
        discrimination:candidate.discrimination
      },
      deltas:{
        difficulty:candidate.difficulty - base.difficulty,
        discrimination:candidate.discrimination - base.discrimination
      },
      status:changed ? 'review_change' : 'stable'
    };

    (changed ? proposals : diagnostics).push(proposal);
  }

  return {proposals,diagnostics};
}

function pearson(rows,key){
  if(rows.length < 2) return 0;
  const xs=rows.map(row => row.signals[key]);
  const ys=rows.map(row => row.utility);
  const mx=average(xs);
  const my=average(ys);
  let cov=0;
  let vx=0;
  let vy=0;
  for(let i=0;i<rows.length;i++){
    const dx=xs[i] - mx;
    const dy=ys[i] - my;
    cov+=dx * dy;
    vx+=dx * dx;
    vy+=dy * dy;
  }
  const denom=Math.sqrt(vx * vy);
  return denom > 1e-12 ? clamp(cov / denom,-1,1) : 0;
}

function normalizePolicyWeights(weights){
  const source={...DEFAULT_POLICY_WEIGHTS,...(weights || {})};
  const positive={};
  let total=0;
  for(const key of POLICY_KEYS){
    const value=Number(source[key]);
    positive[key]=Number.isFinite(value) && value >= 0 ? value : 0;
    total+=positive[key];
  }
  if(total <= 0) return {...DEFAULT_POLICY_WEIGHTS};
  return Object.fromEntries(POLICY_KEYS.map(key => [key,positive[key] / total]));
}

function calibratePolicy(events,currentWeights,{
  minPolicyOutcomes,
  maxPolicyRelativeDelta
}){
  const rows=events.filter(event => event.kind === 'policy_outcome');
  const before=normalizePolicyWeights(currentWeights);
  if(rows.length < minPolicyOutcomes){
    return {
      status:'insufficient_data',
      samples:rows.length,
      before,
      after:before,
      correlations:Object.fromEntries(POLICY_KEYS.map(key => [key,0]))
    };
  }

  const correlations=Object.fromEntries(POLICY_KEYS.map(key => [key,pearson(rows,key)]));
  const unnormalized={};
  for(const key of POLICY_KEYS){
    const relative=clamp(
      correlations[key] * maxPolicyRelativeDelta,
      -maxPolicyRelativeDelta,
      maxPolicyRelativeDelta
    );
    unnormalized[key]=Math.max(0.001,before[key] * (1 + relative));
  }
  const after=normalizePolicyWeights(unnormalized);

  const changed=POLICY_KEYS.some(key => Math.abs(after[key] - before[key]) > 0.002);
  return {
    status:changed ? 'review_change' : 'stable',
    samples:rows.length,
    before,
    after,
    correlations
  };
}

function aggregateSessions(events){
  const rows=events.filter(event => event.kind === 'session_summary' && event.completed);
  return {
    samples:rows.length,
    firstTryRate:average(rows.map(row => row.firstTryRate)),
    avgActions:average(rows.map(row => row.actions)),
    avgCoins:average(rows.map(row => row.coins)),
    avgXp:average(rows.map(row => row.xp))
  };
}

function bandAdjustment(observed,band,maxRelativeDelta){
  if(!band || !Number.isFinite(observed) || observed <= 0) return 1;
  const low=Number(band[0]);
  const high=Number(band[1]);
  if(!Number.isFinite(low) || !Number.isFinite(high) || low > high) return 1;
  if(observed >= low && observed <= high) return 1;

  const target=(low + high) / 2;
  const raw=target / observed;
  const damped=1 + (raw - 1) * 0.25;
  return clamp(damped,1 - maxRelativeDelta,1 + maxRelativeDelta);
}

function calibrateBalance(events,currentBalance,targets,{
  minSessionSummaries,
  maxEconomyRelativeDelta,
  maxDifficultyRelativeDelta,
  balanceGateOptions
}){
  const aggregate=aggregateSessions(events);
  const resolved=resolveBalanceDoc(currentBalance || IDENTITY_BALANCE).resolved;
  const before=clone(resolved);

  if(aggregate.samples < minSessionSummaries || !targets){
    return {
      status:'insufficient_data',
      aggregate,
      before,
      candidate:before,
      gate:{ok:true,failures:[],warnings:[]}
    };
  }

  const coinsFactor=bandAdjustment(
    aggregate.avgCoins,
    targets.avgCoins,
    maxEconomyRelativeDelta
  );
  const xpFactor=bandAdjustment(
    aggregate.avgXp,
    targets.avgXp,
    maxEconomyRelativeDelta
  );

  let difficultyFactor=1;
  const firstTryBand=targets.firstTryRate;
  if(Array.isArray(firstTryBand) && Number.isFinite(aggregate.firstTryRate)){
    const low=Number(firstTryBand[0]);
    const high=Number(firstTryBand[1]);
    if(Number.isFinite(low) && Number.isFinite(high) && low <= high){
      if(aggregate.firstTryRate < low) difficultyFactor=1 - maxDifficultyRelativeDelta;
      else if(aggregate.firstTryRate > high) difficultyFactor=1 + maxDifficultyRelativeDelta;
    }
  }

  const rawCandidate={
    version:(before.version || 'identity') + '-recalibration-candidate',
    economy:{
      ...before.economy,
      coinsMult:before.economy.coinsMult * coinsFactor,
      xpMult:before.economy.xpMult * xpFactor
    },
    quest:{
      ...before.quest,
      difficultyMult:before.quest.difficultyMult * difficultyFactor
    }
  };

  const candidateResolution=resolveBalanceDoc(rawCandidate);
  const candidate=clone(candidateResolution.resolved);

  const baselineReport=buildBalanceReport(before,balanceGateOptions);
  const candidateReport=buildBalanceReport(candidate,balanceGateOptions);
  const comparison=compareBalanceReports(baselineReport,candidateReport);

  const failures=[
    ...comparison.failures,
    ...candidateResolution.diagnostics.map(item => ({
      type:'unsafe-request',
      metric:item.path,
      from:item.requested,
      to:item.resolved
    }))
  ];

  const changed=stableHash(before) !== stableHash(candidate);

  return {
    status:changed && failures.length === 0 ? 'review_change' : changed ? 'blocked' : 'stable',
    aggregate,
    before,
    candidate,
    gate:{
      ok:failures.length === 0,
      failures,
      warnings:comparison.warnings
    }
  };
}

function proposalPayload(proposal){
  return {
    schemaVersion:proposal.schemaVersion,
    recalibrationVersion:proposal.recalibrationVersion,
    createdAt:proposal.createdAt,
    dataFingerprint:proposal.dataFingerprint,
    telemetryCounts:proposal.telemetryCounts,
    rejectionCounts:proposal.rejectionCounts,
    itemCalibrations:proposal.itemCalibrations,
    itemDiagnostics:proposal.itemDiagnostics,
    policy:proposal.policy,
    balance:proposal.balance,
    review:proposal.review
  };
}

export function buildTelemetryRecalibrationProposal({
  bank,
  events,
  itemCalibrations={},
  policyWeights=DEFAULT_POLICY_WEIGHTS,
  currentBalance=IDENTITY_BALANCE,
  balanceTargets=null,
  createdAt=null,
  options={}
}){
  if(!bank || typeof bank !== 'object') throw new TypeError('bank is required.');

  const normalized=normalizeTrustedTelemetry(events);
  const settings={
    minItemResponses:options.minItemResponses ?? 30,
    minOutcomeCount:options.minOutcomeCount ?? 5,
    maxAbilityStandardError:options.maxAbilityStandardError ?? 1.25,
    itemLearningRate:options.itemLearningRate ?? 0.015,
    itemShrinkage:options.itemShrinkage ?? 0.04,
    maxDifficultyDelta:options.maxDifficultyDelta ?? 0.35,
    maxDiscriminationDelta:options.maxDiscriminationDelta ?? 0.20,
    calibrationTolerance:options.calibrationTolerance ?? 0.01,
    minPolicyOutcomes:options.minPolicyOutcomes ?? 200,
    maxPolicyRelativeDelta:options.maxPolicyRelativeDelta ?? 0.10,
    minSessionSummaries:options.minSessionSummaries ?? 50,
    maxEconomyRelativeDelta:options.maxEconomyRelativeDelta ?? 0.03,
    maxDifficultyRelativeDelta:options.maxDifficultyRelativeDelta ?? 0.02,
    balanceGateOptions:options.balanceGateOptions ?? {sessionSeeds:32,levelSeeds:32}
  };

  const item=calibrateItems(
    bank,
    normalized.accepted,
    itemCalibrations,
    settings
  );

  const policy=calibratePolicy(
    normalized.accepted,
    policyWeights,
    settings
  );

  const balance=calibrateBalance(
    normalized.accepted,
    currentBalance,
    balanceTargets,
    settings
  );

  const blockers=[];
  const rejectionRate=normalized.counts.total
    ? normalized.counts.rejected / normalized.counts.total
    : 0;

  if(rejectionRate > 0.10){
    blockers.push('telemetry rejection rate exceeds 10%');
  }
  if(!balance.gate.ok){
    blockers.push('balance candidate failed deterministic balance gate');
  }

  const changeCount=
    item.proposals.length +
    (policy.status === 'review_change' ? 1 : 0) +
    (balance.status === 'review_change' ? 1 : 0);

  if(changeCount === 0){
    blockers.push('no statistically supported recalibration changes');
  }

  const base={
    schemaVersion:RECALIBRATION_SCHEMA_VERSION,
    recalibrationVersion:RECALIBRATION_VERSION,
    createdAt:createdAt == null ? null : iso(createdAt,'createdAt'),
    dataFingerprint:normalized.dataFingerprint,
    telemetryCounts:normalized.counts,
    rejectionCounts:{
      total:normalized.rejected.length,
      reasons:normalized.rejected.reduce((acc,row) => {
        acc[row.reason]=(acc[row.reason] || 0) + 1;
        return acc;
      },{})
    },
    itemCalibrations:item.proposals,
    itemDiagnostics:item.diagnostics,
    policy,
    balance,
    review:{
      autoApply:false,
      readyForHumanReview:blockers.length === 0,
      blockers,
      changeCount
    }
  };

  return deepFreeze({
    ...base,
    proposalId:'recalibration-' + stableHash(proposalPayload(base)).split(':')[1],
    proposalHash:stableHash(proposalPayload(base))
  });
}

export function verifyRecalibrationProposal(proposal){
  const errors=[];
  if(!proposal || typeof proposal !== 'object' || Array.isArray(proposal)){
    return {ok:false,errors:['proposal must be an object']};
  }
  if(proposal.schemaVersion !== RECALIBRATION_SCHEMA_VERSION){
    errors.push('unsupported recalibration schema');
  }
  if(proposal.recalibrationVersion !== RECALIBRATION_VERSION){
    errors.push('unsupported recalibration version');
  }
  if(proposal.review?.autoApply !== false){
    errors.push('recalibration proposal must never auto-apply');
  }
  try{
    const expected=stableHash(proposalPayload(proposal));
    if(expected !== proposal.proposalHash) errors.push('proposal hash mismatch');
    const id='recalibration-' + expected.split(':')[1];
    if(id !== proposal.proposalId) errors.push('proposal ID mismatch');
  }catch{
    errors.push('proposal is not hashable');
  }
  return {ok:errors.length === 0,errors};
}

export function assertRecalibrationReviewable(proposal){
  const validation=verifyRecalibrationProposal(proposal);
  if(!validation.ok) throw new Error('invalid recalibration proposal: ' + validation.errors[0]);
  if(!proposal.review.readyForHumanReview){
    throw new Error(
      'recalibration proposal is not ready for review: ' +
      proposal.review.blockers.join('; ')
    );
  }
  if(proposal.review.autoApply !== false){
    throw new Error('recalibration proposals may not auto-apply.');
  }
  return true;
}
