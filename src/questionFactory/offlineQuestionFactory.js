
import { stableHash } from '../domainSchemas.js';

export const QUESTION_FACTORY_SCHEMA_VERSION = 1;
export const GENERATION_CHECKPOINT_SCHEMA_VERSION = 1;

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

function normalizeChunk(raw,index=0){
  if(!isObject(raw)) throw new TypeError('chunk ' + index + ' must be an object.');
  const id=requireString(raw.id,'chunk.id');
  return Object.freeze({
    id,
    text:requireString(raw.text,'chunk.text'),
    header:typeof raw.header === 'string' ? raw.header.trim() : '',
    subject:typeof raw.subject === 'string' ? raw.subject.trim() : '',
    district:typeof raw.district === 'string' ? raw.district.trim() : '',
    skill:typeof raw.skill === 'string' ? raw.skill.trim() : '',
    conceptIds:Array.isArray(raw.conceptIds)
      ? [...new Set(raw.conceptIds.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))]
      : [],
    source:typeof raw.source === 'string' && raw.source.trim() ? raw.source.trim() : id,
    chunkType:typeof raw.chunkType === 'string' ? raw.chunkType.trim() : 'section',
    metadata:isObject(raw.metadata) ? clone(raw.metadata) : {}
  });
}

function normalizeText(value){
  return String(value || '').replace(/\s+/g,' ').trim();
}

function generatedId(chunkId,prompt,index){
  return 'generated-' + stableHash({
    chunkId,
    prompt:normalizeText(prompt).toLowerCase(),
    index
  }).split(':')[1];
}

export function parseGeneratedResponse(raw){
  if(isObject(raw)){
    return Array.isArray(raw.questions) ? clone(raw.questions) : [];
  }
  if(Array.isArray(raw)) return clone(raw);
  if(typeof raw !== 'string' || !raw.trim()) return [];

  const source=raw.trim();
  const candidates=[source];
  const fence=String.fromCharCode(96).repeat(3);
  const start=source.indexOf(fence);
  if(start >= 0){
    const afterStart=source.indexOf('\n',start);
    const end=source.indexOf(fence,afterStart + 1);
    if(afterStart >= 0 && end > afterStart){
      candidates.unshift(source.slice(afterStart + 1,end).trim());
    }
  }

  const firstBrace=source.indexOf('{');
  const lastBrace=source.lastIndexOf('}');
  if(firstBrace >= 0 && lastBrace > firstBrace){
    candidates.push(source.slice(firstBrace,lastBrace + 1));
  }

  for(const candidate of candidates){
    try{
      const parsed=JSON.parse(candidate);
      if(Array.isArray(parsed)) return parsed;
      if(isObject(parsed) && Array.isArray(parsed.questions)) return parsed.questions;
    }catch{}
  }
  return [];
}

function generationPrompt(chunk,{questionsPerChunk}){
  return [
    'You are generating candidate StarBlox learning questions OFFLINE.',
    'Return JSON only with this exact top-level shape: {"questions":[...]}.',
    'Generate exactly ' + questionsPerChunk + ' multiple-choice candidates.',
    'Every question must be answerable only from the supplied source chunk.',
    'Each candidate must contain prompt, choices, answer, explanation, hint, subject, district, skill, role, difficulty, reward, atomicFacts, and evidence.',
    'choices must contain exactly 3 unique strings and answer must equal exactly one choice.',
    'difficulty must be an integer 1..5 and reward an integer 1..25.',
    'atomicFacts must be a non-empty array.',
    'evidence must be a non-empty array of exact short quotes copied from the source chunk.',
    '',
    'SOURCE CHUNK ID: ' + chunk.id,
    'SOURCE: ' + chunk.source,
    'HEADER: ' + chunk.header,
    'SUBJECT HINT: ' + chunk.subject,
    'DISTRICT HINT: ' + chunk.district,
    'SKILL HINT: ' + chunk.skill,
    'CONCEPT IDS: ' + chunk.conceptIds.join(', '),
    '',
    chunk.text
  ].join('\n');
}

export function buildGenerationRequest(chunk,options={}){
  const normalized=normalizeChunk(chunk);
  const questionsPerChunk=requirePositiveInteger(options.questionsPerChunk ?? 2,'questionsPerChunk');
  return Object.freeze({
    schemaVersion:QUESTION_FACTORY_SCHEMA_VERSION,
    task:'generate_questions',
    chunk:normalized,
    questionsPerChunk,
    prompt:generationPrompt(normalized,{questionsPerChunk}),
    generation:Object.freeze({
      temperature:options.temperature ?? 0.4,
      maxTokens:options.maxTokens ?? 1800
    })
  });
}

function normalizeEvidence(raw,chunkId){
  if(!Array.isArray(raw)) return [];
  return raw.map(item => {
    if(typeof item === 'string'){
      return {chunkId,quote:normalizeText(item)};
    }
    if(isObject(item)){
      return {
        chunkId:typeof item.chunkId === 'string' && item.chunkId.trim() ? item.chunkId.trim() : chunkId,
        quote:normalizeText(item.quote)
      };
    }
    return null;
  }).filter(item => item && item.quote);
}

export function normalizeGeneratedCandidate(raw,{
  chunk,
  runId,
  index,
  providerMetadata={}
}){
  if(!isObject(raw)) return null;
  const normalizedChunk=normalizeChunk(chunk);
  const prompt=normalizeText(raw.prompt ?? raw.query);
  if(!prompt) return null;

  // Candidate identity is factory-owned. Provider-supplied IDs are untrusted
  // because duplicate IDs can collapse independent reviewer results.
  const candidateId=generatedId(normalizedChunk.id,prompt,index);

  const choices=Array.isArray(raw.choices)
    ? raw.choices.map(normalizeText).filter(Boolean)
    : [];
  const facts=raw.atomicFacts ?? raw.atomic_facts;
  const atomicFacts=Array.isArray(facts) ? facts.map(normalizeText).filter(Boolean) : [];

  return Object.freeze({
    schemaVersion:QUESTION_FACTORY_SCHEMA_VERSION,
    candidateId,
    prompt,
    choices,
    answer:normalizeText(raw.answer),
    explanation:normalizeText(raw.explanation),
    hint:normalizeText(raw.hint),
    subject:normalizeText(raw.subject || normalizedChunk.subject),
    district:normalizeText(raw.district || normalizedChunk.district),
    skill:normalizeText(raw.skill || normalizedChunk.skill),
    role:normalizeText(raw.role || 'practice'),
    difficulty:Number(raw.difficulty),
    reward:Number(raw.reward),
    masteryEligible:raw.masteryEligible !== false,
    atomicFacts,
    evidence:normalizeEvidence(raw.evidence,normalizedChunk.id),
    sourceChunkId:normalizedChunk.id,
    sourceHeader:normalizedChunk.header,
    sourceSubject:normalizedChunk.subject,
    source:normalizedChunk.source,
    conceptIds:normalizedChunk.conceptIds,
    supportingChunkIds:[normalizedChunk.id],
    generation:Object.freeze({
      runId:requireString(runId,'runId'),
      provider:normalizeText(providerMetadata.provider || 'unknown'),
      model:normalizeText(providerMetadata.model || ''),
      generatedFromChunk:normalizedChunk.id
    })
  });
}

export function createGenerationCheckpoint({runId}){
  return Object.freeze({
    schemaVersion:GENERATION_CHECKPOINT_SCHEMA_VERSION,
    runId:requireString(runId,'runId'),
    processedChunkIds:[],
    candidates:[],
    errors:[]
  });
}

function validateCheckpoint(checkpoint,runId){
  if(!isObject(checkpoint) || checkpoint.schemaVersion !== GENERATION_CHECKPOINT_SCHEMA_VERSION){
    throw new TypeError('invalid generation checkpoint.');
  }
  if(checkpoint.runId !== runId) throw new Error('checkpoint runId mismatch.');
  return checkpoint;
}

export async function runOfflineGeneration({
  chunks,
  provider,
  runId,
  questionsPerChunk=2,
  maxRetries=2,
  checkpoint=createGenerationCheckpoint({runId}),
  onCheckpoint
}){
  if(!Array.isArray(chunks)) throw new TypeError('chunks must be an array.');
  if(!provider || typeof provider.generate !== 'function'){
    throw new TypeError('provider.generate must be a function.');
  }
  const cleanRunId=requireString(runId,'runId');
  requirePositiveInteger(questionsPerChunk,'questionsPerChunk');
  requirePositiveInteger(maxRetries,'maxRetries');
  validateCheckpoint(checkpoint,cleanRunId);

  const normalizedChunks=chunks.map((chunk,index) => normalizeChunk(chunk,index));
  const chunkIds=new Set();
  for(const chunk of normalizedChunks){
    if(chunkIds.has(chunk.id)) throw new Error('duplicate source chunk id: ' + chunk.id);
    chunkIds.add(chunk.id);
  }

  const processed=new Set(checkpoint.processedChunkIds || []);
  const candidates=[...(checkpoint.candidates || []).map(value => clone(value))];
  const errors=[...(checkpoint.errors || []).map(value => clone(value))];
  const processedChunkIds=[...(checkpoint.processedChunkIds || [])];

  for(let chunkIndex=0;chunkIndex<normalizedChunks.length;chunkIndex++){
    const chunk=normalizedChunks[chunkIndex];
    if(processed.has(chunk.id)) continue;

    const request=buildGenerationRequest(chunk,{questionsPerChunk});
    let parsed=[];
    let lastError='';

    for(let attempt=1;attempt<=maxRetries;attempt++){
      try{
        const response=await provider.generate(request);
        parsed=parseGeneratedResponse(response);
        if(parsed.length) break;
        lastError='provider returned no parseable questions';
      }catch(error){
        lastError=error instanceof Error ? error.message : 'provider generation failed';
      }
    }

    if(parsed.length){
      const metadata=typeof provider.metadata === 'function'
        ? await provider.metadata()
        : (provider.metadata || {});
      parsed.forEach((raw,index) => {
        const normalized=normalizeGeneratedCandidate(raw,{
          chunk,
          runId:cleanRunId,
          index,
          providerMetadata:metadata
        });
        if(normalized) candidates.push(normalized);
      });
    }else{
      errors.push({chunkId:chunk.id,error:lastError || 'generation failed'});
    }

    processed.add(chunk.id);
    processedChunkIds.push(chunk.id);
    checkpoint=Object.freeze({
      schemaVersion:GENERATION_CHECKPOINT_SCHEMA_VERSION,
      runId:cleanRunId,
      processedChunkIds:[...processedChunkIds],
      candidates:clone(candidates),
      errors:clone(errors)
    });
    if(typeof onCheckpoint === 'function') await onCheckpoint(checkpoint);
  }

  return Object.freeze({...checkpoint,completed:true});
}
