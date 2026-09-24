
import {
  createQuestionBankSnapshot,
  getQuestionEntry,
  getQuestionVersion
} from '../questionBank/questionBankV2.js';
import {
  memoryNeedScore,
  retrievabilityAt
} from './fsrsMemory.js';
import {
  abilityFitScore,
  fisherInformation,
  irtItemFromQuestionVersion,
  probabilityCorrect
} from './irtEngine.js';
import { conceptInformationGain } from './entropyChoice.js';

export const QUESTION_POLICY_VERSION='question-policy-v1';

export const DEFAULT_POLICY_WEIGHTS=Object.freeze({
  memory:0.28,
  irt:0.24,
  entropy:0.18,
  novelty:0.12,
  gameplay:0.12,
  quality:0.06
});

const IRT_MAX_INFORMATION=2.25; // a=3, p=.5 => 9 * .25

function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function asSet(values){
  return new Set(Array.isArray(values) ? values : []);
}

function stateMap(states){
  if(states instanceof Map) return states;
  return new Map((states || [])
    .filter(state => state && typeof state.conceptId === 'string')
    .map(state => [state.conceptId,state]));
}

function lookup(table,key){
  if(table instanceof Map) return table.get(key);
  return table?.[key];
}

function normalizeWeights(input){
  const merged={...DEFAULT_POLICY_WEIGHTS,...(input || {})};
  const entries=Object.entries(DEFAULT_POLICY_WEIGHTS).map(([key]) => {
    const value=Number(merged[key]);
    return [key,Number.isFinite(value) && value >= 0 ? value : 0];
  });
  const total=entries.reduce((sum,[,value]) => sum + value,0);
  if(total <= 0) return {...DEFAULT_POLICY_WEIGHTS};
  return Object.fromEntries(entries.map(([key,value]) => [key,value / total]));
}

function weightedGeometric(signals,weights){
  let logScore=0;
  for(const [key,weight] of Object.entries(weights)){
    const signal=clamp(Number(signals[key]) || 0,0,1);
    // A single zero should heavily penalize a question without making ranking
    // numerically collapse when a fallback pool is required.
    logScore+=weight * Math.log(Math.max(0.03,signal));
  }
  return Math.exp(logScore);
}

function roleFit(role,context={}){
  const hint=context.roleHint;
  if(hint){
    if(role === hint) return 1;
    if(hint === 'challenge'){
      if(role === 'transfer') return 0.98;
      if(role === 'diagnose') return 0.92;
      if(role === 'review') return 0.76;
      return 0.68;
    }
    if(hint === 'recovery'){
      if(role === 'practice') return 1;
      if(role === 'review') return 0.96;
      if(role === 'diagnose') return 0.82;
      return 0.60;
    }
    return 0.72;
  }

  if(context.boss){
    if(role === 'transfer') return 1;
    if(role === 'diagnose') return 0.92;
    if(role === 'review') return 0.76;
    return 0.68;
  }

  if(Array.isArray(context.preferredRoles) && context.preferredRoles.length){
    return context.preferredRoles.includes(role) ? 1 : 0.70;
  }

  return 1;
}

function passesHardContext(entry,version,context={}){
  const filters=[
    ['subjects',version.subject],
    ['districts',version.district],
    ['skills',version.skill],
    ['roles',version.role]
  ];
  for(const [field,value] of filters){
    const allowed=context[field];
    if(Array.isArray(allowed) && allowed.length && !allowed.includes(value)) return false;
  }

  if(Array.isArray(context.targetConceptIds) && context.targetConceptIds.length && context.strictConcept){
    if(!entry.conceptIds.some(id => context.targetConceptIds.includes(id))) return false;
  }
  return true;
}

function conceptSignals(entry,memoryByConcept,now,{
  desiredRetention=0.90,
  introduceNewConcepts=false
}={}){
  const concepts=entry.conceptIds?.length ? entry.conceptIds : [entry.skill];
  const memoryValues=[];
  const entropyValues=[];
  const retrievabilities=[];

  for(const conceptId of concepts){
    const state=memoryByConcept.get(conceptId);
    if(!state || (state.exposures ?? 0) <= 0){
      memoryValues.push(introduceNewConcepts ? 0.82 : 0.42);
      entropyValues.push(0.78);
      retrievabilities.push(0);
      continue;
    }
    memoryValues.push(memoryNeedScore(state,{now,desiredRetention}));
    entropyValues.push(conceptInformationGain(state,{now}).normalizedInformationGain);
    retrievabilities.push(retrievabilityAt(state,now));
  }

  return {
    conceptIds:concepts,
    memory:memoryValues.length ? Math.max(...memoryValues) : 0.5,
    entropy:entropyValues.length
      ? entropyValues.reduce((sum,value) => sum + value,0) / entropyValues.length
      : 0.5,
    retrievability:retrievabilities.length
      ? retrievabilities.reduce((sum,value) => sum + value,0) / retrievabilities.length
      : 0
  };
}

function noveltyScore(questionId,conceptIds,{
  recentQuestionIds=[],
  recentConceptIds=[]
}={}){
  const questionIndex=recentQuestionIds.indexOf(questionId);
  const exactQuestion=questionIndex >= 0
    ? [0.08,0.18,0.30,0.45][Math.min(questionIndex,3)]
    : 1;

  let concept=1;
  for(const conceptId of conceptIds){
    const index=recentConceptIds.indexOf(conceptId);
    if(index === 0) concept=Math.min(concept,0.45);
    else if(index === 1) concept=Math.min(concept,0.62);
    else if(index === 2) concept=Math.min(concept,0.78);
    else if(index >= 3) concept=Math.min(concept,0.90);
  }
  return exactQuestion * concept;
}

function resolveIrtItem(version,ref,itemCalibrations){
  const exactKey=ref.questionId + '@' + ref.version;
  return lookup(itemCalibrations,exactKey) ||
    lookup(itemCalibrations,ref.questionId) ||
    irtItemFromQuestionVersion(version);
}

function qualityScore(questionId,qualityByQuestionId){
  const raw=lookup(qualityByQuestionId,questionId);
  if(raw == null) return 1;
  if(typeof raw === 'number' && Number.isFinite(raw)){
    return clamp(raw > 1 ? raw / 100 : raw,0,1);
  }
  const score=Number(raw.effectiveScore ?? raw.qualityScore ?? raw.score);
  return Number.isFinite(score) ? clamp(score > 1 ? score / 100 : score,0,1) : 1;
}

function gameplayScore(entry,version,context,probability){
  let score=roleFit(version.role,context);

  if(Array.isArray(context.targetConceptIds) && context.targetConceptIds.length){
    const matched=entry.conceptIds.some(id => context.targetConceptIds.includes(id));
    score*=matched ? 1 : 0.72;
  }

  // Game-design guardrails sit above pure measurement efficiency.
  if(context.boss){
    // Bosses should be challenging but not arbitrary coin flips.
    const bossFit=1 - Math.min(1,Math.abs(probability - 0.58) / 0.42);
    score*=0.72 + 0.28 * bossFit;
  }else if(context.recovery){
    const recoveryFit=1 - Math.min(1,Math.abs(probability - 0.72) / 0.72);
    score*=0.70 + 0.30 * recoveryFit;
  }

  return clamp(score,0,1);
}

function eligibleRefs(bank,candidateRefs){
  const refs=Array.isArray(candidateRefs)
    ? candidateRefs
    : createQuestionBankSnapshot(bank).refs;

  return refs.filter(ref => {
    const entry=getQuestionEntry(bank,ref.questionId);
    if(!entry || entry.lifecycle !== 'published') return false;
    const version=getQuestionVersion(bank,ref.questionId,ref.version);
    return Boolean(version && version.contentHash === ref.contentHash);
  });
}

function applyCooldown(rows,recentQuestionIds){
  const recent=asSet(recentQuestionIds);
  const fresh=rows.filter(row => !recent.has(row.questionId));
  return fresh.length ? fresh : rows;
}

function applyRecoveryGuard(rows,{recentWrongStreak=0,context={}}={}){
  if(recentWrongStreak < 2 || context.boss || context.disableRecoveryGuard) return rows;
  const supported=rows.filter(row =>
    row.probabilityCorrect >= 0.55 &&
    row.probabilityCorrect <= 0.92 &&
    ['practice','review','diagnose'].includes(row.role)
  );
  return supported.length ? supported : rows;
}

export function rankQuestionsWithPolicy({
  bank,
  candidateRefs=null,
  memoryStates=[],
  ability={theta:0,standardError:1},
  itemCalibrations={},
  qualityByQuestionId={},
  now=Date.now(),
  desiredRetention=0.90,
  introduceNewConcepts=false,
  recentQuestionIds=[],
  recentConceptIds=[],
  recentWrongStreak=0,
  excludeQuestionIds=[],
  context={},
  weights=DEFAULT_POLICY_WEIGHTS
}){
  const weightSet=normalizeWeights(weights);
  const memoryByConcept=stateMap(memoryStates);
  const excluded=asSet(excludeQuestionIds);
  const rows=[];

  for(const ref of eligibleRefs(bank,candidateRefs)){
    if(excluded.has(ref.questionId)) continue;

    const entry=getQuestionEntry(bank,ref.questionId);
    const version=getQuestionVersion(bank,ref.questionId,ref.version);
    if(!passesHardContext(entry,version,context)) continue;

    const concept=conceptSignals(entry,memoryByConcept,now,{
      desiredRetention,
      introduceNewConcepts
    });
    const item=resolveIrtItem(version,ref,itemCalibrations);
    const probability=probabilityCorrect(ability?.theta ?? 0,item);
    const fit=abilityFitScore(ability,item);
    const info=clamp(fisherInformation(ability?.theta ?? 0,item) / IRT_MAX_INFORMATION,0,1);
    const irt=clamp(0.68 * fit + 0.32 * info,0,1);
    const novelty=noveltyScore(ref.questionId,concept.conceptIds,{
      recentQuestionIds,
      recentConceptIds
    });
    const gameplay=gameplayScore(entry,version,context,probability);
    const quality=qualityScore(ref.questionId,qualityByQuestionId);

    const signals={
      memory:concept.memory,
      irt,
      entropy:concept.entropy,
      novelty,
      gameplay,
      quality
    };
    const score=weightedGeometric(signals,weightSet);

    rows.push({
      questionId:ref.questionId,
      ref,
      role:version.role,
      subject:version.subject,
      district:version.district,
      skill:version.skill,
      conceptIds:concept.conceptIds,
      probabilityCorrect:probability,
      retrievability:concept.retrievability,
      score,
      signals,
      diagnostics:{
        memoryNeed:concept.memory,
        entropyInformation:concept.entropy,
        abilityFit:fit,
        fisherInformation:info,
        novelty,
        gameplayFit:gameplay,
        qualityConfidence:quality,
        irtDifficulty:item.difficulty,
        irtDiscrimination:item.discrimination
      }
    });
  }

  let pool=applyCooldown(rows,recentQuestionIds);
  pool=applyRecoveryGuard(pool,{recentWrongStreak,context});

  return pool.sort((a,b) =>
    b.score - a.score ||
    b.signals.memory - a.signals.memory ||
    b.signals.entropy - a.signals.entropy ||
    a.questionId.localeCompare(b.questionId)
  );
}

export function selectQuestionWithPolicy(options){
  const ranking=rankQuestionsWithPolicy(options);
  return {
    policyVersion:QUESTION_POLICY_VERSION,
    selected:ranking[0] ?? null,
    ranking
  };
}
