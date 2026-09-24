import { resolveSourceIds } from './learningSourceRegistry.js';

export const LEARNING_CONTRACT_VERSION = 'starblox-learning-v1';
export const QUESTION_SCHEMA_VERSION = 'starblox-question-v2';
export const LEARNING_EVENT_SCHEMA_VERSION = 'starblox-learning-event-v1';

export const QUESTION_ROLES = Object.freeze(['diagnose','practice','review','transfer']);

const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;
const uniqueStrings = values => [...new Set((values || []).map(String).filter(Boolean))];

function skillConceptId(skill){
  return 'skill:' + String(skill || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}

export function toQuestionV2(question,{
  contentVersion='bootstrap-current-bank',
  generatorSystem='starblox-existing-bank',
  generatorVersion='1',
  generatorSeed=0
}={}){
  const masteryEligible = question?.masteryEligible !== false;
  const conceptIds = uniqueStrings(
    question?.conceptIds?.length ? question.conceptIds : [skillConceptId(question?.skill)]
  );

  return {
    schemaVersion:QUESTION_SCHEMA_VERSION,
    id:String(question?.id || ''),
    contentVersion:String(contentVersion),
    subject:String(question?.subject || ''),
    district:String(question?.district || ''),
    skill:String(question?.skill || ''),
    conceptIds,
    prerequisiteConceptIds:uniqueStrings(question?.prerequisiteConceptIds),
    role:String(question?.role || ''),
    prompt:String(question?.prompt || ''),
    choices:[...(question?.choices || [])].map(String),
    answer:String(question?.answer || ''),
    explanation:String(question?.explanation || ''),
    hint:String(question?.hint || ''),
    difficulty:Number(question?.difficulty || 0),
    reward:Number(question?.reward || 0),
    masteryEligible,
    sourceIds:resolveSourceIds(question),
    evidenceSpans:uniqueStrings(question?.evidenceSpans),
    legacySource:String(question?.source || ''),
    generator:{
      system:String(question?.generator?.system || generatorSystem),
      version:String(question?.generator?.version || generatorVersion),
      model:question?.generator?.model ? String(question.generator.model) : null,
      promptHash:question?.generator?.promptHash ? String(question.generator.promptHash) : null,
      seed:Number.isFinite(Number(question?.generator?.seed))
        ? Number(question.generator.seed)
        : Number(generatorSeed) || 0
    },
    qa:{
      structural:'pass',
      semantic:String(question?.qa?.semantic || 'existing-runtime-gates'),
      adversarial:String(question?.qa?.adversarial || 'shadow'),
      provenance:String(question?.qa?.provenance || 'declared-source')
    }
  };
}

export function validateQuestionV2(question){
  const issues = [];
  if(question?.schemaVersion !== QUESTION_SCHEMA_VERSION) issues.push('schema-version');
  if(!nonEmpty(question?.id)) issues.push('missing-id');
  if(!nonEmpty(question?.contentVersion)) issues.push('missing-content-version');
  if(!nonEmpty(question?.skill)) issues.push('missing-skill');
  if(!QUESTION_ROLES.includes(question?.role)) issues.push('invalid-role');
  if(!nonEmpty(question?.prompt)) issues.push('missing-prompt');
  if(!Array.isArray(question?.choices) || question.choices.length !== 3) issues.push('choice-count');
  if(Array.isArray(question?.choices) && new Set(question.choices).size !== question.choices.length) issues.push('duplicate-choice');
  if(!nonEmpty(question?.answer)) issues.push('missing-answer');
  if(Array.isArray(question?.choices) && question.choices.filter(choice => choice === question.answer).length !== 1){
    issues.push('answer-choice-invariant');
  }
  if(!Array.isArray(question?.conceptIds) || !question.conceptIds.length) issues.push('missing-concepts');
  if(!Array.isArray(question?.sourceIds) || !question.sourceIds.length) issues.push('missing-source-ids');
  if(typeof question?.masteryEligible !== 'boolean') issues.push('invalid-mastery-eligibility');
  if(!Number.isFinite(question?.difficulty) || question.difficulty < 0) issues.push('invalid-difficulty');
  return issues;
}

export function createLearningEvent({
  question,
  choice,
  timestamp=Date.now(),
  playerLocalId='local',
  questSeed=0,
  wasRetry=false,
  hintUsed=false,
  responseMs=0,
  answerPosition
}={}){
  const q = question?.schemaVersion === QUESTION_SCHEMA_VERSION
    ? question
    : toQuestionV2(question || {});

  const firstAttempt = !wasRetry;
  const correct = String(choice) === q.answer;
  const assisted = Boolean(wasRetry || hintUsed);
  const position = Number.isInteger(answerPosition)
    ? answerPosition
    : q.choices.indexOf(String(choice));

  return {
    schemaVersion:LEARNING_EVENT_SCHEMA_VERSION,
    contractVersion:LEARNING_CONTRACT_VERSION,
    eventId:[
      'learn',
      Number(timestamp) || 0,
      q.id || 'unknown',
      Number(questSeed) || 0,
      Math.max(-1,position)
    ].join('-'),
    timestamp:Number(timestamp) || 0,
    playerLocalId:String(playerLocalId || 'local'),
    questionId:q.id,
    contentVersion:q.contentVersion,
    skill:q.skill,
    conceptIds:[...q.conceptIds],
    correct,
    firstAttempt,
    assisted,
    masteryEligible:Boolean(q.masteryEligible && firstAttempt && !assisted),
    responseMs:Math.max(0,Number(responseMs) || 0),
    hintUsed:Boolean(hintUsed),
    questSeed:Number(questSeed) || 0,
    answerPosition:position
  };
}

export function validateLearningEvent(event){
  const issues = [];
  if(event?.schemaVersion !== LEARNING_EVENT_SCHEMA_VERSION) issues.push('schema-version');
  if(!nonEmpty(event?.eventId)) issues.push('missing-event-id');
  if(!nonEmpty(event?.questionId)) issues.push('missing-question-id');
  if(!nonEmpty(event?.contentVersion)) issues.push('missing-content-version');
  if(!nonEmpty(event?.skill)) issues.push('missing-skill');
  if(!Array.isArray(event?.conceptIds) || !event.conceptIds.length) issues.push('missing-concepts');
  if(typeof event?.correct !== 'boolean') issues.push('invalid-correct');
  if(typeof event?.firstAttempt !== 'boolean') issues.push('invalid-first-attempt');
  if(typeof event?.assisted !== 'boolean') issues.push('invalid-assisted');
  if(typeof event?.masteryEligible !== 'boolean') issues.push('invalid-mastery-eligibility');
  if(event?.masteryEligible && (!event.firstAttempt || event.assisted)) issues.push('assisted-mastery-risk');
  return issues;
}
