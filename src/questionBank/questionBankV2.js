import {
  canonicalizeLegacyQuestion,
  createQuestionVersion,
  stableHash,
  stableStringify
} from '../domainSchemas.js';
import { Mulberry32 } from '../sim/deterministicCore.js';

export const QUESTION_BANK_SCHEMA_VERSION = 2;
export const ASSIGNMENT_SCHEMA_VERSION = 1;
export const ATTEMPT_LEDGER_SCHEMA_VERSION = 1;

export const QUESTION_LIFECYCLES = Object.freeze([
  'draft','pending','published','archived'
]);

export const GRADING_METHODS = Object.freeze([
  'latest','first','highest','average'
]);

const DEFAULT_POLICY = Object.freeze({
  maxAttempts:null,
  explanationRelease:'after_attempt',
  gradingMethod:'latest'
});

function isObject(value){
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clone(value,label='value'){
  try{
    return JSON.parse(JSON.stringify(value));
  }catch{
    throw new TypeError(label + ' must be JSON-compatible.');
  }
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function requireString(value,label){
  if(typeof value !== 'string' || !value.trim()){
    throw new TypeError(label + ' must be a non-empty string.');
  }
  return value.trim();
}

function requirePositiveInteger(value,label){
  if(!Number.isInteger(value) || value < 1){
    throw new TypeError(label + ' must be a positive integer.');
  }
  return value;
}

function requireNonNegativeInteger(value,label){
  if(!Number.isInteger(value) || value < 0){
    throw new TypeError(label + ' must be a non-negative integer.');
  }
  return value;
}

function normalizeLifecycle(value,def='draft'){
  const lifecycle=value == null ? def : String(value);
  if(!QUESTION_LIFECYCLES.includes(lifecycle)){
    throw new TypeError('invalid question lifecycle: ' + lifecycle);
  }
  return lifecycle;
}

function normalizeStringArray(values){
  if(!Array.isArray(values)) return [];
  return [...new Set(values
    .filter(value => typeof value === 'string' && value.trim())
    .map(value => value.trim())
  )].sort();
}

function normalizePolicy(raw={}){
  const source=isObject(raw) ? raw : {};
  const maxAttempts=source.maxAttempts == null
    ? null
    : requirePositiveInteger(source.maxAttempts,'policy.maxAttempts');
  const explanationRelease=source.explanationRelease == null
    ? DEFAULT_POLICY.explanationRelease
    : requireString(source.explanationRelease,'policy.explanationRelease');
  const gradingMethod=source.gradingMethod == null
    ? DEFAULT_POLICY.gradingMethod
    : String(source.gradingMethod);
  if(!GRADING_METHODS.includes(gradingMethod)){
    throw new TypeError('invalid grading method: ' + gradingMethod);
  }
  return {
    maxAttempts,
    explanationRelease,
    gradingMethod
  };
}

function semanticVersionPayload(version){
  return {
    questionId:version.questionId,
    subject:version.subject,
    district:version.district,
    skill:version.skill,
    role:version.role,
    prompt:version.prompt,
    choices:version.choices,
    answer:version.answer,
    explanation:version.explanation,
    hint:version.hint,
    difficulty:version.difficulty,
    reward:version.reward,
    source:version.source,
    masteryEligible:version.masteryEligible,
    provenance:version.provenance
  };
}

function currentRef(entry){
  const version=entry.versions[String(entry.currentVersion)];
  return {
    questionId:entry.id,
    version:entry.currentVersion,
    contentHash:version.contentHash
  };
}

function entryFromCanonical(record,{
  lifecycle='published',
  conceptIds,
  tags,
  policy
}={}){
  if(!isObject(record) || !isObject(record.version)){
    throw new TypeError('canonical question record is invalid.');
  }

  return {
    id:requireString(record.id,'question.id'),
    lifecycle:normalizeLifecycle(lifecycle,'published'),
    currentVersion:requirePositiveInteger(record.currentVersion,'question.currentVersion'),
    currentVersionHash:requireString(record.currentVersionHash,'question.currentVersionHash'),
    subject:requireString(record.subject,'question.subject'),
    district:requireString(record.district,'question.district'),
    skill:requireString(record.skill,'question.skill'),
    role:requireString(record.role,'question.role'),
    conceptIds:normalizeStringArray(conceptIds ?? [record.skill]),
    tags:normalizeStringArray(tags),
    policy:normalizePolicy(policy),
    versions:{
      [String(record.currentVersion)]:clone(record.version,'question version')
    }
  };
}

function bankMaterial(bank){
  return {
    schemaVersion:bank.schemaVersion,
    id:bank.id,
    title:bank.title,
    revision:bank.revision,
    questions:bank.questions
  };
}

function finalizeBank(raw){
  const base={
    schemaVersion:QUESTION_BANK_SCHEMA_VERSION,
    id:requireString(raw.id,'bank.id'),
    title:requireString(raw.title,'bank.title'),
    revision:requirePositiveInteger(raw.revision,'bank.revision'),
    questions:clone(raw.questions || {},'bank.questions')
  };
  const bankHash=stableHash(bankMaterial(base));
  return deepFreeze({...base,bankHash});
}

function assertBank(bank){
  const validation=validateQuestionBankV2(bank);
  if(!validation.ok){
    throw new Error('invalid Question Bank V2: ' + validation.errors[0]);
  }
  return bank;
}

export function importLegacyQuestionBank(
  questions,
  {bankId='starblox-core',title='StarBlox Core Question Bank'}={}
){
  if(!Array.isArray(questions)) throw new TypeError('questions must be an array.');
  const entries={};

  for(const legacy of questions){
    const canonical=canonicalizeLegacyQuestion(legacy,{status:'active'});
    if(entries[canonical.id]) throw new Error('duplicate question id: ' + canonical.id);
    entries[canonical.id]=entryFromCanonical(canonical,{
      lifecycle:'published',
      conceptIds:[canonical.skill]
    });
  }

  return finalizeBank({
    id:bankId,
    title,
    revision:1,
    questions:entries
  });
}

export function createQuestionBankV2({
  bankId,
  title,
  canonicalQuestions=[]
}){
  return importLegacyQuestionBank(canonicalQuestions.map(question => {
    if(question?.version){
      const version=question.version;
      return {
        id:question.id,
        subject:version.subject,
        district:version.district,
        skill:version.skill,
        role:version.role,
        prompt:version.prompt,
        choices:version.choices,
        answer:version.answer,
        explanation:version.explanation,
        hint:version.hint,
        difficulty:version.difficulty,
        reward:version.reward,
        source:version.source,
        masteryEligible:version.masteryEligible,
        provenance:version.provenance
      };
    }
    return question;
  }),{bankId,title});
}

export function validateQuestionBankV2(bank){
  const errors=[];
  if(!isObject(bank)){
    return {ok:false,errors:['bank must be an object']};
  }
  if(bank.schemaVersion !== QUESTION_BANK_SCHEMA_VERSION){
    errors.push('unsupported bank schemaVersion');
  }
  if(typeof bank.id !== 'string' || !bank.id) errors.push('bank id is required');
  if(typeof bank.title !== 'string' || !bank.title) errors.push('bank title is required');
  if(!Number.isInteger(bank.revision) || bank.revision < 1) errors.push('bank revision is invalid');
  if(!isObject(bank.questions)) errors.push('bank questions must be an object');

  if(isObject(bank.questions)){
    for(const [id,entry] of Object.entries(bank.questions)){
      if(!isObject(entry)){
        errors.push('question entry ' + id + ' is invalid');
        continue;
      }
      if(entry.id !== id) errors.push('question key/id mismatch: ' + id);
      if(!QUESTION_LIFECYCLES.includes(entry.lifecycle)){
        errors.push('question lifecycle is invalid: ' + id);
      }
      if(!Number.isInteger(entry.currentVersion) || entry.currentVersion < 1){
        errors.push('current version is invalid: ' + id);
      }
      if(!isObject(entry.versions)){
        errors.push('version map is invalid: ' + id);
        continue;
      }

      const versions=Object.entries(entry.versions);
      if(versions.length === 0) errors.push('question has no versions: ' + id);
      for(const [versionKey,version] of versions){
        const number=Number(versionKey);
        if(!Number.isInteger(number) || number < 1 || version?.contentVersion !== number){
          errors.push('version key/contentVersion mismatch: ' + id + '@' + versionKey);
        }
        if(version?.questionId !== id){
          errors.push('version questionId mismatch: ' + id + '@' + versionKey);
        }
        if(typeof version?.contentHash !== 'string' || !version.contentHash){
          errors.push('version hash missing: ' + id + '@' + versionKey);
        }
      }

      const current=entry.versions[String(entry.currentVersion)];
      if(!current) errors.push('current version is missing: ' + id);
      else if(current.contentHash !== entry.currentVersionHash){
        errors.push('current version hash mismatch: ' + id);
      }

      try{ normalizePolicy(entry.policy); }
      catch(error){ errors.push('invalid policy for ' + id + ': ' + error.message); }
    }
  }

  if(errors.length === 0 && typeof bank.bankHash === 'string'){
    const expected=stableHash(bankMaterial(bank));
    if(expected !== bank.bankHash) errors.push('bank hash mismatch');
  }

  return {ok:errors.length === 0,errors};
}

export function getQuestionEntry(bank,questionId){
  assertBank(bank);
  return bank.questions[questionId] ?? null;
}

export function getQuestionVersion(bank,questionId,version){
  const entry=getQuestionEntry(bank,questionId);
  if(!entry) return null;
  const resolvedVersion=version == null ? entry.currentVersion : version;
  return entry.versions[String(resolvedVersion)] ?? null;
}

export function getQuestionRef(bank,questionId,version){
  const entry=getQuestionEntry(bank,questionId);
  if(!entry) return null;
  const resolvedVersion=version == null ? entry.currentVersion : version;
  const questionVersion=entry.versions[String(resolvedVersion)];
  if(!questionVersion) return null;
  return deepFreeze({
    questionId,
    version:resolvedVersion,
    contentHash:questionVersion.contentHash
  });
}

export function createQuestionBankSnapshot(bank,{lifecycles=['published']}={}){
  assertBank(bank);
  const allowed=new Set(lifecycles.map(value => normalizeLifecycle(value)));
  const refs=Object.values(bank.questions)
    .filter(entry => allowed.has(entry.lifecycle))
    .map(entry => currentRef(entry))
    .sort((a,b) => a.questionId.localeCompare(b.questionId));

  const payload={
    bankId:bank.id,
    refs
  };

  return deepFreeze({
    schemaVersion:1,
    bankId:bank.id,
    bankRevision:bank.revision,
    version:bank.id + '@' + bank.revision,
    questionCount:refs.length,
    refs,
    hash:stableHash(payload)
  });
}

export function reviseQuestion(bank,questionId,changes,{
  lifecycle
}={}){
  assertBank(bank);
  const entry=bank.questions[questionId];
  if(!entry) throw new Error('unknown question: ' + questionId);
  if(!isObject(changes)) throw new TypeError('changes must be an object.');

  const current=entry.versions[String(entry.currentVersion)];
  const nextVersion=entry.currentVersion + 1;
  const next=createQuestionVersion({
    ...semanticVersionPayload(current),
    ...clone(changes,'question changes'),
    questionId,
    contentVersion:nextVersion
  });

  if(stableStringify(semanticVersionPayload(next)) === stableStringify(semanticVersionPayload(current))){
    throw new Error('question revision did not change content.');
  }

  const questions=clone(bank.questions);
  questions[questionId]={
    ...questions[questionId],
    lifecycle:lifecycle == null ? entry.lifecycle : normalizeLifecycle(lifecycle),
    currentVersion:nextVersion,
    currentVersionHash:next.contentHash,
    subject:next.subject,
    district:next.district,
    skill:next.skill,
    role:next.role,
    versions:{
      ...questions[questionId].versions,
      [String(nextVersion)]:clone(next)
    }
  };

  return finalizeBank({
    ...bank,
    revision:bank.revision + 1,
    questions
  });
}

export function setQuestionLifecycle(bank,questionId,lifecycle){
  assertBank(bank);
  const entry=bank.questions[questionId];
  if(!entry) throw new Error('unknown question: ' + questionId);
  const nextLifecycle=normalizeLifecycle(lifecycle);
  if(nextLifecycle === entry.lifecycle) return bank;

  const questions=clone(bank.questions);
  questions[questionId]={
    ...questions[questionId],
    lifecycle:nextLifecycle
  };

  return finalizeBank({
    ...bank,
    revision:bank.revision + 1,
    questions
  });
}

export function updateQuestionMetadata(bank,questionId,{tags,conceptIds,policy}={}){
  assertBank(bank);
  const entry=bank.questions[questionId];
  if(!entry) throw new Error('unknown question: ' + questionId);

  const next={
    ...clone(entry),
    tags:tags === undefined ? entry.tags : normalizeStringArray(tags),
    conceptIds:conceptIds === undefined ? entry.conceptIds : normalizeStringArray(conceptIds),
    policy:policy === undefined ? clone(entry.policy) : normalizePolicy({...entry.policy,...policy})
  };

  if(stableStringify(next) === stableStringify(entry)) return bank;

  const questions=clone(bank.questions);
  questions[questionId]=next;
  return finalizeBank({
    ...bank,
    revision:bank.revision + 1,
    questions
  });
}

function seedFrom({bankId,playerId,generation,seed}){
  if(seed != null) return requireNonNegativeInteger(seed,'seed') >>> 0;
  const hex=stableHash({bankId,playerId,generation}).split(':')[1];
  return parseInt(hex,16) >>> 0;
}

function entryMatchesFilters(entry,filters={}){
  if(entry.lifecycle !== 'published') return false;
  const match=(key,value) => {
    const allowed=filters[key];
    return !Array.isArray(allowed) || allowed.length === 0 || allowed.includes(value);
  };
  if(!match('subjects',entry.subject)) return false;
  if(!match('districts',entry.district)) return false;
  if(!match('skills',entry.skill)) return false;
  if(!match('roles',entry.role)) return false;

  if(Array.isArray(filters.conceptIds) && filters.conceptIds.length){
    if(!entry.conceptIds.some(id => filters.conceptIds.includes(id))) return false;
  }
  if(Array.isArray(filters.tags) && filters.tags.length){
    if(!entry.tags.some(tag => filters.tags.includes(tag))) return false;
  }
  return true;
}

function exactRefIsValid(bank,ref,filters){
  if(!isObject(ref)) return false;
  const entry=bank.questions[ref.questionId];
  if(!entry || !entryMatchesFilters(entry,filters)) return false;
  const version=entry.versions[String(ref.version)];
  return Boolean(version && version.contentHash === ref.contentHash);
}

function shuffled(values,rng){
  const out=[...values];
  for(let i=out.length - 1;i>0;i--){
    const j=rng.nextInt(0,i);
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}

export function assignQuestionsFromBank(bank,{
  playerId,
  count,
  previous=null,
  filters={},
  seed
}={}){
  assertBank(bank);
  const cleanPlayerId=requireString(playerId,'playerId');
  const cleanCount=requireNonNegativeInteger(count,'count');
  const generation=previous?.bankId === bank.id && previous?.playerId === cleanPlayerId
    ? requireNonNegativeInteger(previous.generation ?? 0,'assignment generation')
    : 0;

  const priorRefs=previous?.bankId === bank.id && previous?.playerId === cleanPlayerId && Array.isArray(previous.refs)
    ? previous.refs
    : [];

  const invalid=[];
  const kept=[];
  for(const ref of priorRefs){
    if(exactRefIsValid(bank,ref,filters)) kept.push(clone(ref));
    else invalid.push(clone(ref));
  }

  const overlimit=kept.length > cleanCount ? kept.splice(cleanCount) : [];
  const selectedIds=new Set(kept.map(ref => ref.questionId));

  const candidates=Object.values(bank.questions)
    .filter(entry => entryMatchesFilters(entry,filters) && !selectedIds.has(entry.id))
    .map(entry => currentRef(entry));

  const rng=new Mulberry32(seedFrom({
    bankId:bank.id,
    playerId:cleanPlayerId,
    generation,
    seed
  }));
  const added=shuffled(candidates,rng).slice(0,Math.max(0,cleanCount - kept.length));
  const refs=[...kept,...added];

  const assignment=deepFreeze({
    schemaVersion:ASSIGNMENT_SCHEMA_VERSION,
    bankId:bank.id,
    playerId:cleanPlayerId,
    generation,
    requestedCount:cleanCount,
    refs,
    assignmentHash:stableHash({
      bankId:bank.id,
      playerId:cleanPlayerId,
      generation,
      refs
    })
  });

  return {
    assignment,
    events:deepFreeze({
      invalid,
      overlimit,
      added
    })
  };
}

export function refreshAssignmentVersions(bank,assignment){
  assertBank(bank);
  if(!isObject(assignment) || assignment.bankId !== bank.id){
    throw new Error('assignment does not belong to this bank.');
  }

  const refreshed=[];
  const refs=(assignment.refs || []).map(ref => {
    const entry=bank.questions[ref.questionId];
    if(!entry || entry.lifecycle !== 'published') return clone(ref);
    const latest=currentRef(entry);
    if(latest.version === ref.version && latest.contentHash === ref.contentHash) return clone(ref);
    refreshed.push({from:clone(ref),to:clone(latest)});
    return latest;
  });

  const next=deepFreeze({
    ...clone(assignment),
    refs,
    assignmentHash:stableHash({
      bankId:assignment.bankId,
      playerId:assignment.playerId,
      generation:assignment.generation,
      refs
    })
  });

  return {assignment:next,refreshed:deepFreeze(refreshed)};
}

export function resetAssignment(assignment,{allowReset=false}={}){
  if(!allowReset) throw new Error('assignment reset is not allowed.');
  if(!isObject(assignment)) throw new TypeError('assignment must be an object.');
  const generation=requireNonNegativeInteger(assignment.generation ?? 0,'assignment generation') + 1;
  return deepFreeze({
    schemaVersion:ASSIGNMENT_SCHEMA_VERSION,
    bankId:requireString(assignment.bankId,'assignment.bankId'),
    playerId:requireString(assignment.playerId,'assignment.playerId'),
    generation,
    requestedCount:0,
    refs:[],
    assignmentHash:stableHash({
      bankId:assignment.bankId,
      playerId:assignment.playerId,
      generation,
      refs:[]
    })
  });
}

export function createAttemptLedger({playerId}){
  return deepFreeze({
    schemaVersion:ATTEMPT_LEDGER_SCHEMA_VERSION,
    playerId:requireString(playerId,'playerId'),
    attempts:[]
  });
}

export function appendAttemptHistory(ledger,{
  attempt,
  correct,
  score=correct ? 1 : 0
}){
  if(!isObject(ledger) || ledger.schemaVersion !== ATTEMPT_LEDGER_SCHEMA_VERSION){
    throw new TypeError('invalid attempt ledger.');
  }
  if(!isObject(attempt)) throw new TypeError('attempt must be an object.');
  if(attempt.playerId !== ledger.playerId) throw new Error('attempt player does not match ledger.');
  if(typeof correct !== 'boolean') throw new TypeError('correct must be boolean.');
  if(typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1){
    throw new TypeError('score must be a finite number in [0,1].');
  }

  const record={
    attemptId:requireString(attempt.attemptId,'attempt.attemptId'),
    questionId:requireString(attempt.questionId,'attempt.questionId'),
    questionVersion:requirePositiveInteger(attempt.questionVersion,'attempt.questionVersion'),
    questionHash:requireString(attempt.questionHash,'attempt.questionHash'),
    selectedAnswer:requireString(attempt.selectedAnswer,'attempt.selectedAnswer'),
    answeredAt:attempt.answeredAt,
    wasRetry:Boolean(attempt.wasRetry),
    correct,
    score
  };

  if(ledger.attempts.some(item => item.attemptId === record.attemptId)){
    throw new Error('duplicate attemptId: ' + record.attemptId);
  }

  return deepFreeze({
    ...clone(ledger),
    attempts:[...clone(ledger.attempts),record]
  });
}

export function summarizeQuestionAttempts(ledger,questionId,{gradingMethod='latest'}={}){
  if(!GRADING_METHODS.includes(gradingMethod)){
    throw new TypeError('invalid grading method: ' + gradingMethod);
  }
  const attempts=(ledger?.attempts || []).filter(item => item.questionId === questionId);
  if(attempts.length === 0){
    return {attempts:0,correct:0,score:null,first:null,latest:null};
  }

  const scores=attempts.map(item => item.score);
  let score;
  if(gradingMethod === 'first') score=scores[0];
  else if(gradingMethod === 'highest') score=Math.max(...scores);
  else if(gradingMethod === 'average') score=scores.reduce((sum,value) => sum + value,0) / scores.length;
  else score=scores[scores.length - 1];

  return {
    attempts:attempts.length,
    correct:attempts.filter(item => item.correct).length,
    score,
    first:clone(attempts[0]),
    latest:clone(attempts[attempts.length - 1])
  };
}
