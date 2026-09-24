
import { retrievabilityAt } from './fsrsMemory.js';

export const ENTROPY_MODEL_VERSION='starblox-entropy-v1';

function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function requireProbability(value,label){
  if(typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1){
    throw new TypeError(label + ' must be a probability in [0,1].');
  }
  return value;
}

export function binaryEntropy(probability){
  const p=requireProbability(probability,'probability');
  if(p <= 0 || p >= 1) return 0;
  const q=1 - p;
  return -p * Math.log2(p) - q * Math.log2(q);
}

export function distributionEntropy(weights){
  if(!Array.isArray(weights) || weights.length === 0) return 0;
  const total=weights.reduce((sum,value) => sum + Math.max(0,Number(value) || 0),0);
  if(total <= 0) return 0;

  let entropy=0;
  for(const raw of weights){
    const p=Math.max(0,Number(raw) || 0) / total;
    if(p > 0) entropy-=p * Math.log2(p);
  }
  return entropy;
}

function normalizeHypotheses(hypotheses){
  if(!Array.isArray(hypotheses) || hypotheses.length === 0){
    throw new TypeError('hypotheses must be a non-empty array.');
  }

  const rows=hypotheses.map((hypothesis,index) => {
    if(!hypothesis || typeof hypothesis !== 'object' || Array.isArray(hypothesis)){
      throw new TypeError('hypothesis ' + index + ' must be an object.');
    }
    const weight=Number(hypothesis.weight);
    if(!Number.isFinite(weight) || weight < 0){
      throw new TypeError('hypothesis weight must be a non-negative finite number.');
    }
    return {...hypothesis,weight};
  });

  const total=rows.reduce((sum,row) => sum + row.weight,0);
  if(total <= 0) throw new RangeError('hypothesis weights must sum to more than zero.');

  return rows.map(row => ({...row,weight:row.weight / total}));
}

function posteriorEntropy(hypotheses,probabilityFor,outcomeCorrect){
  const weighted=hypotheses.map(hypothesis => {
    const p=requireProbability(
      probabilityFor(hypothesis),
      'hypothesis response probability'
    );
    return hypothesis.weight * (outcomeCorrect ? p : 1 - p);
  });
  const total=weighted.reduce((sum,value) => sum + value,0);
  if(total <= 1e-12) return 0;
  return distributionEntropy(weighted.map(value => value / total));
}

/**
 * Expected information gain of a binary question over weighted latent hypotheses.
 *
 * Unlike simple binary response entropy, this explicitly measures how much the
 * answer is expected to reduce uncertainty about the hypothesis distribution.
 */
export function expectedInformationGain(hypotheses,probabilityFor){
  const rows=normalizeHypotheses(hypotheses);
  if(typeof probabilityFor !== 'function'){
    throw new TypeError('probabilityFor must be a function.');
  }

  const priorEntropy=distributionEntropy(rows.map(row => row.weight));
  let pCorrect=0;
  for(const row of rows){
    pCorrect+=row.weight * requireProbability(
      probabilityFor(row),
      'hypothesis response probability'
    );
  }
  pCorrect=clamp(pCorrect,0,1);

  const correctEntropy=posteriorEntropy(rows,probabilityFor,true);
  const wrongEntropy=posteriorEntropy(rows,probabilityFor,false);
  const expectedPosterior=
    pCorrect * correctEntropy +
    (1 - pCorrect) * wrongEntropy;

  return {
    priorEntropy,
    pCorrect,
    responseEntropy:binaryEntropy(pCorrect),
    expectedPosteriorEntropy:expectedPosterior,
    informationGain:Math.max(0,priorEntropy - expectedPosterior)
  };
}

/**
 * Convert one concept's D/S/R state into a small latent hypothesis distribution.
 *
 * The three states are not learner-facing labels. They are internal hypotheses:
 * remembered, fragile, and not-retrievable.
 */
export function buildConceptKnowledgeHypotheses(state,{now}={}){
  if(!state || (state.exposures ?? 0) <= 0){
    return [
      {id:'remembered',weight:0.15,pCorrect:0.90},
      {id:'fragile',weight:0.35,pCorrect:0.58},
      {id:'not-retrievable',weight:0.50,pCorrect:0.22}
    ];
  }

  const r=clamp(retrievabilityAt(state,now),0,1);
  const remembered=Math.pow(r,1.35);
  const forgotten=Math.pow(1 - r,1.35);
  const fragile=Math.max(0.06,1 - Math.abs(2 * r - 1));
  const total=remembered + fragile + forgotten;

  return [
    {id:'remembered',weight:remembered / total,pCorrect:0.90},
    {id:'fragile',weight:fragile / total,pCorrect:0.58},
    {id:'not-retrievable',weight:forgotten / total,pCorrect:0.22}
  ];
}

export function conceptInformationGain(state,{now}={}){
  const hypotheses=buildConceptKnowledgeHypotheses(state,{now});
  const result=expectedInformationGain(hypotheses,hypothesis => hypothesis.pCorrect);

  // Normalize by the maximum possible entropy of this three-state hypothesis space.
  const maxEntropy=Math.log2(hypotheses.length);
  return {
    ...result,
    normalizedInformationGain:maxEntropy > 0
      ? clamp(result.informationGain / maxEntropy,0,1)
      : 0,
    hypotheses
  };
}

export function invalidatedQuestionIds(questionRules,answerHistory){
  const byId=new Map((questionRules || []).map(rule => [rule.id,rule]));
  const invalidated=new Set();

  for(const entry of answerHistory || []){
    const rule=byId.get(entry.questionId);
    if(!rule?.invalidates) continue;
    if(entry.answer === rule.invalidates.answer){
      for(const id of rule.invalidates.questionIds || []) invalidated.add(id);
    }
  }
  return invalidated;
}

/**
 * Generic APL-style entropy selector.
 *
 * candidateProbability(candidate, hypothesis) should return P(correct/yes).
 * Category weights are optional and decay toward 1 as more questions are asked.
 */
export function selectEntropyQuestion(candidates,{
  hypotheses,
  candidateProbability,
  askedIds=[],
  answerHistory=[],
  questionRules=[],
  categoryWeights={},
  categoryOf=candidate => candidate.category || '',
  idOf=candidate => candidate.id || candidate.questionId
}={}){
  if(!Array.isArray(candidates) || candidates.length === 0) return null;
  if(typeof candidateProbability !== 'function'){
    throw new TypeError('candidateProbability must be a function.');
  }

  const asked=new Set(askedIds);
  const invalidated=invalidatedQuestionIds(questionRules,answerHistory);
  const remaining=candidates.filter(candidate => {
    const id=idOf(candidate);
    return !asked.has(id) && !invalidated.has(id);
  });
  const pool=remaining.length ? remaining : candidates.filter(candidate => !asked.has(idOf(candidate)));
  if(pool.length === 0) return null;

  const boostDecay=Math.max(0.3,1 - askedIds.length * 0.06);
  let best=null;

  for(const candidate of pool){
    const metrics=expectedInformationGain(
      hypotheses,
      hypothesis => candidateProbability(candidate,hypothesis)
    );
    const category=categoryOf(candidate);
    const rawWeight=Number(categoryWeights[category] ?? 1);
    const categoryWeight=1 + ((Number.isFinite(rawWeight) ? rawWeight : 1) - 1) * boostDecay;
    const score=metrics.informationGain * categoryWeight;
    const row={candidate,score,metrics,categoryWeight};

    if(
      !best ||
      row.score > best.score ||
      (row.score === best.score && String(idOf(candidate)).localeCompare(String(idOf(best.candidate))) < 0)
    ){
      best=row;
    }
  }

  return best;
}
