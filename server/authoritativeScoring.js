import { createQuestionAttempt } from '../src/domainSchemas';
import { scoreQuestAttempt } from '../src/questRewardPolicy';
import { reSimulateReplay } from '../src/replay/reSimulate';

const QUESTION_SUBMISSION_FIELDS = new Set(['sessionId','attemptId','selectedAnswer']);
const GAMEPLAY_SUBMISSION_FIELDS = new Set(['sessionId','recording']);

function isPlainObject(value){
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireObject(value,label){
  if(!isPlainObject(value)) throw new TypeError(label + ' must be an object.');
  return value;
}

function requireString(value,label){
  if(typeof value !== 'string' || !value.trim()) throw new TypeError(label + ' must be a non-empty string.');
  return value.trim();
}

function requireFiniteNumber(value,label){
  if(typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(label + ' must be a finite number.');
  return value;
}

function cloneJson(value,label='value'){
  try{
    return JSON.parse(JSON.stringify(value));
  }catch{
    throw new TypeError(label + ' must be JSON-compatible.');
  }
}

function rejectUnknownFields(value,allowed,label){
  const extras = Object.keys(value).filter(key => !allowed.has(key));
  if(extras.length){
    throw new TypeError(label + ' contains client-controlled outcome fields: ' + extras.sort().join(', '));
  }
}

function normalizeSkillStat(raw={}){
  return {
    seen:Number.isFinite(raw.seen) ? Math.max(0,Math.floor(raw.seen)) : 0,
    correct:Number.isFinite(raw.correct) ? Math.max(0,Math.floor(raw.correct)) : 0,
    wrong:Number.isFinite(raw.wrong) ? Math.max(0,Math.floor(raw.wrong)) : 0,
    lastSeen:Number.isFinite(raw.lastSeen) ? Math.max(0,raw.lastSeen) : 0,
    independentCorrect:Number.isFinite(raw.independentCorrect) ? Math.max(0,Math.floor(raw.independentCorrect)) : 0,
    masteryCorrect:Number.isFinite(raw.masteryCorrect) ? Math.max(0,Math.floor(raw.masteryCorrect)) : 0
  };
}

function validateCanonicalQuestion(question){
  requireObject(question,'question');
  if(question.schemaVersion !== 1) throw new TypeError('question must use canonical schemaVersion 1.');
  if(question.status !== 'active') throw new Error('question is not active.');
  requireString(question.id,'question.id');
  requireString(question.currentVersionHash,'question.currentVersionHash');
  if(!Number.isInteger(question.currentVersion) || question.currentVersion < 1){
    throw new TypeError('question.currentVersion must be a positive integer.');
  }

  const version = requireObject(question.version,'question.version');
  if(version.questionId !== question.id) throw new Error('question version identity mismatch.');
  if(version.contentVersion !== question.currentVersion) throw new Error('question version number mismatch.');
  if(version.contentHash !== question.currentVersionHash) throw new Error('question version hash mismatch.');
  if(!Array.isArray(version.choices) || version.choices.length < 2) throw new Error('question choices are invalid.');
  if(version.choices.filter(choice => choice === version.answer).length !== 1){
    throw new Error('question must have exactly one keyed answer.');
  }
  return version;
}

function validateQuestionSession(session,question){
  requireObject(session,'trusted question session');
  const version = validateCanonicalQuestion(question);

  const trusted = {
    sessionId:requireString(session.sessionId,'trusted question session.sessionId'),
    playerId:requireString(session.playerId,'trusted question session.playerId'),
    questionId:requireString(session.questionId,'trusted question session.questionId'),
    questionVersion:session.questionVersion,
    questionHash:requireString(session.questionHash,'trusted question session.questionHash'),
    wasRetry:Boolean(session.wasRetry),
    startedAt:requireFiniteNumber(session.startedAt,'trusted question session.startedAt'),
    dailyId:session.dailyId == null ? null : requireString(session.dailyId,'trusted question session.dailyId'),
    gameContext:cloneJson(session.gameContext || {},'trusted question session.gameContext')
  };

  if(!Number.isInteger(trusted.questionVersion) || trusted.questionVersion < 1){
    throw new TypeError('trusted question session.questionVersion must be a positive integer.');
  }
  if(trusted.questionId !== question.id) throw new Error('server session question ID mismatch.');
  if(trusted.questionVersion !== question.currentVersion) throw new Error('server session question version mismatch.');
  if(trusted.questionHash !== question.currentVersionHash) throw new Error('server session question hash mismatch.');

  return {trusted,version};
}

/**
 * Score one StarBlox question from server-owned context.
 *
 * The client is allowed to choose an answer and provide an idempotency attempt
 * key. It is not allowed to choose the player, question/version, correctness,
 * rewards, mastery, score, or canonical answer.
 */
export function scoreQuestionSubmissionAuthoritatively({
  session,
  question,
  playerProgress,
  submission,
  answeredAt=Date.now()
}){
  const {trusted,version} = validateQuestionSession(session,question);
  const client = requireObject(submission,'question submission');
  rejectUnknownFields(client,QUESTION_SUBMISSION_FIELDS,'question submission');

  const sessionId = requireString(client.sessionId,'question submission.sessionId');
  const attemptId = requireString(client.attemptId,'question submission.attemptId');
  const selectedAnswer = requireString(client.selectedAnswer,'question submission.selectedAnswer');
  if(sessionId !== trusted.sessionId) throw new Error('question session mismatch.');
  if(!version.choices.includes(selectedAnswer)) throw new Error('selected answer is not an issued choice.');

  const now = requireFiniteNumber(answeredAt,'answeredAt');
  if(now < trusted.startedAt) throw new Error('answeredAt cannot be earlier than the server session start.');

  const progress = isPlainObject(playerProgress) ? playerProgress : {};
  const stats = isPlainObject(progress.stats) ? progress.stats : {};
  const mastered = Array.isArray(progress.mastered)
    ? progress.mastered.filter(value => typeof value === 'string')
    : [];
  const old = normalizeSkillStat(stats[version.skill]);

  const correct = selectedAnswer === version.answer;
  const independent = correct && !trusted.wasRetry;
  const masteryEligible = version.masteryEligible !== false;
  const next = {
    ...old,
    seen:old.seen + (trusted.wasRetry ? 0 : 1),
    correct:old.correct + (correct ? 1 : 0),
    wrong:old.wrong + (!correct && !trusted.wasRetry ? 1 : 0),
    lastSeen:now,
    independentCorrect:old.independentCorrect + (independent ? 1 : 0),
    masteryCorrect:old.masteryCorrect + (independent && masteryEligible ? 1 : 0)
  };

  const becomesMastered =
    independent &&
    masteryEligible &&
    next.masteryCorrect >= 4 &&
    !mastered.includes(version.skill);

  const reward = scoreQuestAttempt({
    question:version,
    correct,
    wasRetry:trusted.wasRetry,
    becomesMastered
  });

  const attempt = createQuestionAttempt({
    attemptId,
    playerId:trusted.playerId,
    questionId:trusted.questionId,
    questionVersion:trusted.questionVersion,
    questionHash:trusted.questionHash,
    selectedAnswer,
    startedAt:trusted.startedAt,
    answeredAt:now,
    wasRetry:trusted.wasRetry,
    hintUsed:trusted.wasRetry,
    dailyId:trusted.dailyId,
    gameContext:trusted.gameContext
  });

  return Object.freeze({
    accepted:true,
    attempt,
    result:Object.freeze({
      correct,
      retry:trusted.wasRetry,
      feedback:correct ? version.explanation : version.hint,
      reward:Object.freeze({...reward})
    }),
    progressPatch:Object.freeze({
      skill:version.skill,
      skillStat:Object.freeze(next),
      coinsDelta:reward.coins,
      xpDelta:reward.xp,
      starsDelta:reward.stars,
      transferWinsDelta:reward.transferEvidence,
      dailyTransfersDelta:reward.transferEvidence,
      district:version.district,
      districtProgressDelta:reward.districtProgress,
      masteredSkill:reward.masteryAwarded ? version.skill : null
    }),
    nextSessionState:Object.freeze({
      consumed:true,
      retryRequired:!correct,
      retryWasIssued:!correct && !trusted.wasRetry
    })
  });
}

/**
 * Require exactly one ordinal from 1..expectedCount.
 *
 * This is intentionally stricter than merely checking bounds + duplicates.
 * The stricter rule closes the skipped-round class of scoring bug documented in
 * an older Atlas WorldGuesser challenge path.
 */
export function validateCompleteOrdinalSet(items,{expectedCount,field='round'}={}){
  if(!Array.isArray(items)) return {ok:false,reason:'items must be an array'};
  if(!Number.isInteger(expectedCount) || expectedCount < 0){
    return {ok:false,reason:'expectedCount must be a non-negative integer'};
  }
  if(items.length !== expectedCount){
    return {ok:false,reason:'submission must contain exactly ' + expectedCount + ' items'};
  }

  const seen = new Set();
  for(const item of items){
    if(!isPlainObject(item)) return {ok:false,reason:'submitted item must be an object'};
    const ordinal = item[field];
    if(!Number.isInteger(ordinal) || ordinal < 1 || ordinal > expectedCount){
      return {ok:false,reason:'invalid ' + field};
    }
    if(seen.has(ordinal)) return {ok:false,reason:'duplicate ' + field};
    seen.add(ordinal);
  }

  for(let ordinal=1;ordinal<=expectedCount;ordinal++){
    if(!seen.has(ordinal)) return {ok:false,reason:'missing ' + field + ' ' + ordinal};
  }
  return {ok:true};
}

function validateGameplaySession(session){
  requireObject(session,'trusted gameplay session');
  return {
    sessionId:requireString(session.sessionId,'trusted gameplay session.sessionId'),
    playerId:requireString(session.playerId,'trusted gameplay session.playerId'),
    seed:session.seed,
    engineVersion:requireString(session.engineVersion,'trusted gameplay session.engineVersion'),
    initialState:cloneJson(session.initialState,'trusted gameplay session.initialState'),
    maxTicks:session.maxTicks == null ? undefined : session.maxTicks
  };
}

/**
 * Verify a completed deterministic gameplay submission using only server-owned
 * setup and rules. The client's recording is evidence, not authority.
 *
 * The authoritative score/summary returned to callers comes from re-simulation,
 * never from client-supplied score or final-state fields.
 */
export function scoreGameplaySubmissionAuthoritatively({
  session,
  submission,
  reducer,
  summaryBuilder,
  wallClockMs
}){
  const trusted = validateGameplaySession(session);
  if(!Number.isInteger(trusted.seed) || trusted.seed < 0){
    throw new TypeError('trusted gameplay session.seed must be a non-negative integer.');
  }
  if(trusted.maxTicks != null && (!Number.isInteger(trusted.maxTicks) || trusted.maxTicks < 0)){
    throw new TypeError('trusted gameplay session.maxTicks must be a non-negative integer.');
  }

  const client = requireObject(submission,'gameplay submission');
  rejectUnknownFields(client,GAMEPLAY_SUBMISSION_FIELDS,'gameplay submission');
  const sessionId = requireString(client.sessionId,'gameplay submission.sessionId');
  if(sessionId !== trusted.sessionId) throw new Error('gameplay session mismatch.');

  const recording = requireObject(client.recording,'gameplay submission.recording');
  if(recording.manifest?.seed !== trusted.seed){
    return Object.freeze({accepted:false,verdict:'unverifiable',reason:'replay seed does not match server session'});
  }
  if(recording.manifest?.engineVersion !== trusted.engineVersion){
    return Object.freeze({accepted:false,verdict:'unverifiable',reason:'replay engine does not match server session'});
  }

  const result = reSimulateReplay(recording,{
    initialState:trusted.initialState,
    reducer,
    summaryBuilder,
    expectedEngineVersion:trusted.engineVersion,
    wallClockMs,
    maxTicks:trusted.maxTicks
  });

  if(result.verdict !== 'verified'){
    return Object.freeze({
      accepted:false,
      verdict:result.verdict,
      reason:result.reason || 'gameplay replay could not be verified',
      divergence:result.divergence ? cloneJson(result.divergence) : undefined
    });
  }

  return Object.freeze({
    accepted:true,
    verdict:'verified',
    playerId:trusted.playerId,
    sessionId:trusted.sessionId,
    finalStateHash:result.finalStateHash,
    authoritativeSummary:cloneJson(result.summary ?? {},'authoritative summary')
  });
}
