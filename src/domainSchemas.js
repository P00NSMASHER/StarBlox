export const SCHEMA_VERSIONS = Object.freeze({
  question: 1,
  questionVersion: 1,
  questionAttempt: 1,
  playerConceptState: 1,
  dailyBundle: 1,
  replayManifest: 1,
  implementationProvenance: 1
});

const SHA_RE = /^[a-f0-9]{40}$/i;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

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

function requireNonNegativeInteger(value,label){
  if(!Number.isInteger(value) || value < 0) throw new TypeError(label + ' must be a non-negative integer.');
  return value;
}

function jsonClone(value){
  if(value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export function stableStringify(value){
  if(value === null) return 'null';

  if(Array.isArray(value)){
    return '[' + value.map(item => stableStringify(item)).join(',') + ']';
  }

  if(isPlainObject(value)){
    const keys = Object.keys(value).sort();
    return '{' + keys.map(key => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
  }

  if(typeof value === 'string' || typeof value === 'boolean'){
    return JSON.stringify(value);
  }

  if(typeof value === 'number'){
    if(!Number.isFinite(value)) throw new TypeError('Cannot hash non-finite numbers.');
    return JSON.stringify(value);
  }

  throw new TypeError('Schema values must be JSON-compatible.');
}

export function stableHash(value){
  const input = stableStringify(value);
  let hash = 2166136261;

  for(let i=0;i<input.length;i++){
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash,16777619);
  }

  return 'fnv1a32:' + (hash >>> 0).toString(16).padStart(8,'0');
}

function normalizeContentProvenance(value,source){
  const entries = Array.isArray(value) ? value : [];
  const normalized = entries
    .filter(isPlainObject)
    .map((entry,index) => ({
      kind: requireString(entry.kind || 'content-source','provenance[' + index + '].kind'),
      sourceId: requireString(entry.sourceId || entry.id || source,'provenance[' + index + '].sourceId'),
      label: requireString(entry.label || entry.sourceId || entry.id || source,'provenance[' + index + '].label'),
      reference: typeof entry.reference === 'string' && entry.reference.trim() ? entry.reference.trim() : null
    }));

  if(normalized.length === 0 && source){
    normalized.push({
      kind: 'content-source',
      sourceId: source,
      label: source,
      reference: null
    });
  }

  return normalized;
}

export function createQuestionVersion(input){
  requireObject(input,'QuestionVersion');

  const questionId = requireString(input.questionId || input.id,'QuestionVersion.questionId');
  const contentVersion = input.contentVersion == null ? 1 : requireNonNegativeInteger(input.contentVersion,'QuestionVersion.contentVersion');
  if(contentVersion < 1) throw new TypeError('QuestionVersion.contentVersion must be at least 1.');

  const prompt = requireString(input.prompt,'QuestionVersion.prompt');
  const choices = Array.isArray(input.choices)
    ? input.choices.map((choice,index) => requireString(choice,'QuestionVersion.choices[' + index + ']'))
    : [];

  if(choices.length < 2) throw new TypeError('QuestionVersion.choices must contain at least two choices.');
  if(new Set(choices).size !== choices.length) throw new TypeError('QuestionVersion.choices must be unique.');

  const answer = requireString(input.answer,'QuestionVersion.answer');
  if(choices.filter(choice => choice === answer).length !== 1){
    throw new TypeError('QuestionVersion.answer must appear exactly once in choices.');
  }

  const source = requireString(input.source,'QuestionVersion.source');
  const content = {
    questionId,
    contentVersion,
    subject: requireString(input.subject,'QuestionVersion.subject'),
    district: requireString(input.district,'QuestionVersion.district'),
    skill: requireString(input.skill,'QuestionVersion.skill'),
    role: requireString(input.role,'QuestionVersion.role'),
    prompt,
    choices,
    answer,
    explanation: requireString(input.explanation,'QuestionVersion.explanation'),
    hint: requireString(input.hint,'QuestionVersion.hint'),
    difficulty: requireFiniteNumber(input.difficulty,'QuestionVersion.difficulty'),
    reward: requireFiniteNumber(input.reward,'QuestionVersion.reward'),
    source,
    masteryEligible: input.masteryEligible !== false
  };

  const provenance = normalizeContentProvenance(input.provenance,source);
  const contentHash = stableHash(content);

  return Object.freeze({
    schemaVersion: SCHEMA_VERSIONS.questionVersion,
    ...content,
    contentHash,
    provenance
  });
}

export function createQuestionRecord(input){
  requireObject(input,'Question');

  const version = createQuestionVersion(input);
  const status = input.status == null ? 'active' : requireString(input.status,'Question.status');

  return Object.freeze({
    schemaVersion: SCHEMA_VERSIONS.question,
    id: version.questionId,
    status,
    subject: version.subject,
    district: version.district,
    skill: version.skill,
    role: version.role,
    currentVersion: version.contentVersion,
    currentVersionHash: version.contentHash,
    version
  });
}

export function canonicalizeLegacyQuestion(question,{contentVersion=1,status='active',provenance}={}){
  requireObject(question,'legacy question');
  return createQuestionRecord({
    ...question,
    questionId: question.id,
    contentVersion,
    status,
    provenance: provenance ?? question.provenance
  });
}

export function createQuestionAttempt(input){
  requireObject(input,'QuestionAttempt');

  const startedAt = requireFiniteNumber(input.startedAt,'QuestionAttempt.startedAt');
  const answeredAt = requireFiniteNumber(input.answeredAt,'QuestionAttempt.answeredAt');
  if(answeredAt < startedAt) throw new TypeError('QuestionAttempt.answeredAt cannot be earlier than startedAt.');

  return Object.freeze({
    schemaVersion: SCHEMA_VERSIONS.questionAttempt,
    attemptId: requireString(input.attemptId,'QuestionAttempt.attemptId'),
    playerId: requireString(input.playerId,'QuestionAttempt.playerId'),
    questionId: requireString(input.questionId,'QuestionAttempt.questionId'),
    questionVersion: requireNonNegativeInteger(input.questionVersion,'QuestionAttempt.questionVersion'),
    questionHash: requireString(input.questionHash,'QuestionAttempt.questionHash'),
    selectedAnswer: requireString(input.selectedAnswer,'QuestionAttempt.selectedAnswer'),
    startedAt,
    answeredAt,
    responseMs: answeredAt - startedAt,
    wasRetry: Boolean(input.wasRetry),
    hintUsed: Boolean(input.hintUsed),
    dailyId: input.dailyId == null ? null : requireString(input.dailyId,'QuestionAttempt.dailyId'),
    gameContext: jsonClone(input.gameContext || {})
  });
}

export function createPlayerConceptState(input){
  requireObject(input,'PlayerConceptState');

  const retrievability = input.retrievability == null ? 1 : requireFiniteNumber(input.retrievability,'PlayerConceptState.retrievability');
  if(retrievability < 0 || retrievability > 1) throw new TypeError('PlayerConceptState.retrievability must be in [0,1].');

  return Object.freeze({
    schemaVersion: SCHEMA_VERSIONS.playerConceptState,
    playerId: requireString(input.playerId,'PlayerConceptState.playerId'),
    conceptId: requireString(input.conceptId,'PlayerConceptState.conceptId'),
    fsrsDifficulty: input.fsrsDifficulty == null ? 5 : requireFiniteNumber(input.fsrsDifficulty,'PlayerConceptState.fsrsDifficulty'),
    stability: input.stability == null ? 0 : requireFiniteNumber(input.stability,'PlayerConceptState.stability'),
    retrievability,
    exposures: input.exposures == null ? 0 : requireNonNegativeInteger(input.exposures,'PlayerConceptState.exposures'),
    lapses: input.lapses == null ? 0 : requireNonNegativeInteger(input.lapses,'PlayerConceptState.lapses'),
    lastSeenAt: input.lastSeenAt == null ? 0 : requireFiniteNumber(input.lastSeenAt,'PlayerConceptState.lastSeenAt'),
    irtAbilityContribution: input.irtAbilityContribution == null ? 0 : requireFiniteNumber(input.irtAbilityContribution,'PlayerConceptState.irtAbilityContribution'),
    updatedAt: input.updatedAt == null ? 0 : requireFiniteNumber(input.updatedAt,'PlayerConceptState.updatedAt')
  });
}

function normalizeQuestionRef(ref,index){
  requireObject(ref,'DailyBundle.questionRefs[' + index + ']');
  return {
    questionId: requireString(ref.questionId,'DailyBundle.questionRefs[' + index + '].questionId'),
    version: requireNonNegativeInteger(ref.version,'DailyBundle.questionRefs[' + index + '].version'),
    contentHash: requireString(ref.contentHash,'DailyBundle.questionRefs[' + index + '].contentHash')
  };
}

export function createDailyBundle(input){
  requireObject(input,'DailyBundle');

  const date = requireString(input.date,'DailyBundle.date');
  if(!DATE_KEY_RE.test(date)) throw new TypeError('DailyBundle.date must use YYYY-MM-DD.');

  const snapshot = requireObject(input.questionBankSnapshot,'DailyBundle.questionBankSnapshot');
  const payload = {
    schemaVersion: SCHEMA_VERSIONS.dailyBundle,
    id: requireString(input.id,'DailyBundle.id'),
    date,
    seed: requireNonNegativeInteger(input.seed,'DailyBundle.seed'),
    generatorVersion: requireString(input.generatorVersion,'DailyBundle.generatorVersion'),
    engineVersion: requireString(input.engineVersion,'DailyBundle.engineVersion'),
    questionBankSnapshot: {
      version: requireString(snapshot.version,'DailyBundle.questionBankSnapshot.version'),
      hash: requireString(snapshot.hash,'DailyBundle.questionBankSnapshot.hash')
    },
    balanceVersion: requireString(input.balanceVersion,'DailyBundle.balanceVersion'),
    questionRefs: Array.isArray(input.questionRefs) ? input.questionRefs.map(normalizeQuestionRef) : [],
    levelSpec: jsonClone(input.levelSpec || {}),
    certifiedSolution: jsonClone(input.certifiedSolution || null),
    compatibility: jsonClone(input.compatibility || {ok:false,checks:[]})
  };

  return Object.freeze({
    ...payload,
    bundleHash: stableHash(payload)
  });
}

export function createReplayManifest(input){
  requireObject(input,'ReplayManifest');

  const payload = {
    schemaVersion: SCHEMA_VERSIONS.replayManifest,
    replayId: requireString(input.replayId,'ReplayManifest.replayId'),
    engineVersion: requireString(input.engineVersion,'ReplayManifest.engineVersion'),
    seed: requireNonNegativeInteger(input.seed,'ReplayManifest.seed'),
    initialStateHash: requireString(input.initialStateHash,'ReplayManifest.initialStateHash'),
    actionCodec: requireString(input.actionCodec,'ReplayManifest.actionCodec'),
    actionCount: requireNonNegativeInteger(input.actionCount,'ReplayManifest.actionCount'),
    actionHash: requireString(input.actionHash,'ReplayManifest.actionHash'),
    summaryHash: requireString(input.summaryHash,'ReplayManifest.summaryHash'),
    createdAt: requireString(input.createdAt,'ReplayManifest.createdAt')
  };

  return Object.freeze({
    ...payload,
    manifestHash: stableHash(payload)
  });
}

export function createImplementationProvenance(input){
  requireObject(input,'ImplementationProvenance');

  const commit = requireString(input.commit,'ImplementationProvenance.commit');
  if(!SHA_RE.test(commit)) throw new TypeError('ImplementationProvenance.commit must be a full 40-character Git SHA.');

  return Object.freeze({
    schemaVersion: SCHEMA_VERSIONS.implementationProvenance,
    component: requireString(input.component,'ImplementationProvenance.component'),
    repository: requireString(input.repository,'ImplementationProvenance.repository'),
    branch: requireString(input.branch,'ImplementationProvenance.branch'),
    commit,
    path: input.path == null ? null : requireString(input.path,'ImplementationProvenance.path'),
    repositoryLicense: requireString(input.repositoryLicense,'ImplementationProvenance.repositoryLicense'),
    reuseBasis: requireString(input.reuseBasis,'ImplementationProvenance.reuseBasis'),
    capturedAt: requireString(input.capturedAt,'ImplementationProvenance.capturedAt')
  });
}
