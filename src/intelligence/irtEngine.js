
export const IRT_MODEL_VERSION='starblox-2pl-v1';

const THETA_MIN=-4;
const THETA_MAX=4;
const DIFFICULTY_MIN=-3;
const DIFFICULTY_MAX=3;
const DISCRIMINATION_MIN=0.1;
const DISCRIMINATION_MAX=3;

function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function requireFinite(value,label){
  if(typeof value !== 'number' || !Number.isFinite(value)){
    throw new TypeError(label + ' must be a finite number.');
  }
  return value;
}

function normalizeQuestionId(value){
  if(typeof value !== 'string' || !value.trim()){
    throw new TypeError('questionId must be a non-empty string.');
  }
  return value.trim();
}

export function authoredDifficultyToIrt(difficulty){
  const d=clamp(requireFinite(difficulty,'difficulty'),1,5);
  return (d - 3);
}

export function createIrtItem({
  questionId,
  difficulty,
  discrimination=1,
  authoredDifficulty=null,
  conceptId=null
}){
  const question=normalizeQuestionId(questionId);
  const b=clamp(
    authoredDifficulty == null
      ? requireFinite(difficulty,'difficulty')
      : authoredDifficultyToIrt(authoredDifficulty),
    DIFFICULTY_MIN,
    DIFFICULTY_MAX
  );
  const a=clamp(requireFinite(discrimination,'discrimination'),DISCRIMINATION_MIN,DISCRIMINATION_MAX);

  return Object.freeze({
    schemaVersion:1,
    modelVersion:IRT_MODEL_VERSION,
    questionId:question,
    difficulty:b,
    discrimination:a,
    priorDifficulty:b,
    priorDiscrimination:a,
    conceptId:typeof conceptId === 'string' && conceptId.trim() ? conceptId.trim() : null,
    responseCount:0,
    correctCount:0
  });
}

export function probabilityCorrect(theta,item){
  const t=clamp(requireFinite(theta,'theta'),THETA_MIN,THETA_MAX);
  const a=clamp(requireFinite(item.discrimination,'item.discrimination'),DISCRIMINATION_MIN,DISCRIMINATION_MAX);
  const b=clamp(requireFinite(item.difficulty,'item.difficulty'),DIFFICULTY_MIN,DIFFICULTY_MAX);
  const exponent=-a * (t - b);
  if(exponent > 700) return 0;
  if(exponent < -700) return 1;
  return 1 / (1 + Math.exp(exponent));
}

export function fisherInformation(theta,item){
  const p=probabilityCorrect(theta,item);
  const q=1 - p;
  if(p < 0.0001 || q < 0.0001) return 0;
  return item.discrimination * item.discrimination * p * q;
}

function normalizeResponse(raw,index){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new TypeError('response ' + index + ' must be an object.');
  }
  if(typeof raw.correct !== 'boolean') throw new TypeError('response.correct must be boolean.');
  return {
    questionId:normalizeQuestionId(raw.questionId),
    correct:raw.correct,
    difficulty:clamp(requireFinite(raw.difficulty,'response.difficulty'),DIFFICULTY_MIN,DIFFICULTY_MAX),
    discrimination:clamp(requireFinite(raw.discrimination,'response.discrimination'),DISCRIMINATION_MIN,DISCRIMINATION_MAX)
  };
}

export function createAbilityState({
  playerId,
  conceptId=null,
  theta=0,
  standardError=1,
  responses=[]
}){
  if(typeof playerId !== 'string' || !playerId.trim()) throw new TypeError('playerId must be a non-empty string.');
  const normalizedResponses=responses.map(normalizeResponse);
  return Object.freeze({
    schemaVersion:1,
    modelVersion:IRT_MODEL_VERSION,
    playerId:playerId.trim(),
    conceptId:typeof conceptId === 'string' && conceptId.trim() ? conceptId.trim() : null,
    theta:clamp(requireFinite(theta,'theta'),THETA_MIN,THETA_MAX),
    standardError:Math.max(0.01,requireFinite(standardError,'standardError')),
    responses:Object.freeze(normalizedResponses.map(row => Object.freeze({...row})))
  });
}

/**
 * 2PL MAP estimate with a weak N(0, 1/priorPrecision) prior.
 *
 * The upstream Python engine uses bounded scalar optimization and the same
 * all-correct/all-incorrect guards. StarBlox uses Newton updates so the core
 * stays dependency-free in browser/server JavaScript.
 */
export function estimateAbility(responses,{
  playerId='anonymous',
  conceptId=null,
  priorPrecision=0.2,
  maxIterations=40
}={}){
  const rows=responses.map(normalizeResponse);
  const prior=requireFinite(priorPrecision,'priorPrecision');
  if(prior < 0) throw new RangeError('priorPrecision cannot be negative.');

  if(rows.length === 0){
    return createAbilityState({
      playerId,
      conceptId,
      theta:0,
      standardError:1,
      responses:[]
    });
  }

  const allCorrect=rows.every(row => row.correct);
  const allIncorrect=rows.every(row => !row.correct);

  if(allCorrect){
    const maxDifficulty=Math.max(...rows.map(row => row.difficulty));
    return createAbilityState({
      playerId,
      conceptId,
      theta:Math.min(maxDifficulty + 1,3),
      standardError:1 / Math.sqrt(rows.length),
      responses:rows
    });
  }

  if(allIncorrect){
    const minDifficulty=Math.min(...rows.map(row => row.difficulty));
    return createAbilityState({
      playerId,
      conceptId,
      theta:Math.max(minDifficulty - 1,-3),
      standardError:1 / Math.sqrt(rows.length),
      responses:rows
    });
  }

  let theta=0;
  for(let iteration=0;iteration<maxIterations;iteration++){
    let gradient=-prior * theta;
    let hessian=-prior;

    for(const row of rows){
      const item={
        questionId:row.questionId,
        difficulty:row.difficulty,
        discrimination:row.discrimination
      };
      const p=clamp(probabilityCorrect(theta,item),0.0001,0.9999);
      const y=row.correct ? 1 : 0;
      gradient+=row.discrimination * (y - p);
      hessian-=row.discrimination * row.discrimination * p * (1 - p);
    }

    if(!Number.isFinite(hessian) || Math.abs(hessian) < 1e-9) break;
    const step=gradient / hessian;
    const next=clamp(theta - step,THETA_MIN,THETA_MAX);
    if(Math.abs(next - theta) < 1e-7){
      theta=next;
      break;
    }
    theta=next;
  }

  if(!Number.isFinite(theta)) theta=0;

  let totalInfo=prior;
  for(const row of rows){
    totalInfo+=fisherInformation(theta,row);
  }
  const standardError=totalInfo > 0 ? 1 / Math.sqrt(totalInfo) : 1;

  return createAbilityState({
    playerId,
    conceptId,
    theta,
    standardError,
    responses:rows
  });
}

export function updateAbility(ability,item,correct){
  if(!ability || typeof ability !== 'object') throw new TypeError('ability must be an object.');
  if(typeof correct !== 'boolean') throw new TypeError('correct must be boolean.');

  const response={
    questionId:item.questionId,
    correct,
    difficulty:item.difficulty,
    discrimination:item.discrimination
  };

  return estimateAbility(
    [...(ability.responses || []),response],
    {
      playerId:ability.playerId,
      conceptId:ability.conceptId
    }
  );
}

export function selectNextQuestion(ability,items,{method='max_info'}={}){
  if(!Array.isArray(items) || items.length === 0) return null;
  if(!['max_info','target_50'].includes(method)) throw new TypeError('unknown IRT selection method: ' + method);
  const theta=requireFinite(ability?.theta ?? 0,'ability.theta');

  let best=null;
  let bestMetric=method === 'max_info' ? -Infinity : Infinity;

  for(const item of items){
    if(method === 'max_info'){
      const info=fisherInformation(theta,item);
      if(info > bestMetric){
        bestMetric=info;
        best=item;
      }
    }else{
      const distance=Math.abs(probabilityCorrect(theta,item) - 0.5);
      if(distance < bestMetric){
        bestMetric=distance;
        best=item;
      }
    }
  }
  return best;
}

export function abilityFitScore(ability,item){
  const p=probabilityCorrect(ability?.theta ?? 0,item);
  // 1 at 50% target, falls linearly to 0 at 0/100%.
  return clamp(1 - Math.abs(p - 0.5) * 2,0,1);
}

/**
 * Lightweight online item calibration.
 *
 * Difficulty/discrimination are nudged by the 2PL log-likelihood gradients,
 * with shrinkage toward the authored priors. This is intentionally conservative:
 * early data should not overpower author intent.
 */
export function updateItemCalibration(item,{
  theta,
  correct,
  learningRate=0.06,
  shrinkage=0.02
}){
  if(typeof correct !== 'boolean') throw new TypeError('correct must be boolean.');
  const t=clamp(requireFinite(theta,'theta'),THETA_MIN,THETA_MAX);
  const lr=clamp(requireFinite(learningRate,'learningRate'),0.001,0.25);
  const reg=clamp(requireFinite(shrinkage,'shrinkage'),0,0.25);
  const p=probabilityCorrect(t,item);
  const y=correct ? 1 : 0;

  const diffGradient=-item.discrimination * (y - p);
  const discriminationGradient=(y - p) * (t - item.difficulty);

  const difficulty=clamp(
    item.difficulty +
      lr * diffGradient -
      reg * (item.difficulty - item.priorDifficulty),
    DIFFICULTY_MIN,
    DIFFICULTY_MAX
  );

  const discrimination=clamp(
    item.discrimination +
      lr * discriminationGradient -
      reg * (item.discrimination - item.priorDiscrimination),
    DISCRIMINATION_MIN,
    DISCRIMINATION_MAX
  );

  return Object.freeze({
    ...item,
    difficulty,
    discrimination,
    responseCount:(item.responseCount ?? 0) + 1,
    correctCount:(item.correctCount ?? 0) + (correct ? 1 : 0)
  });
}

export function confidenceInterval(ability,z=1.96){
  const width=requireFinite(z,'z') * requireFinite(ability.standardError,'ability.standardError');
  return [
    ability.theta - width,
    ability.theta + width
  ];
}
