
export const IRT_THETA_MIN=-4;
export const IRT_THETA_MAX=4;
export const IRT_ITEM_DIFFICULTY_MIN=-3;
export const IRT_ITEM_DIFFICULTY_MAX=3;
export const IRT_DISCRIMINATION_MIN=0.1;
export const IRT_DISCRIMINATION_MAX=3;

function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function finite(value,label){
  if(typeof value !== 'number' || !Number.isFinite(value)){
    throw new TypeError(label + ' must be a finite number.');
  }
  return value;
}

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function validateItem(item){
  if(!item || typeof item !== 'object') throw new TypeError('IRT item must be an object.');
  if(typeof item.id !== 'string' || !item.id) throw new TypeError('IRT item id is required.');
  finite(item.difficulty,'item.difficulty');
  finite(item.discrimination,'item.discrimination');
  if(item.discrimination < IRT_DISCRIMINATION_MIN || item.discrimination > IRT_DISCRIMINATION_MAX){
    throw new RangeError('item.discrimination is outside supported range.');
  }
  return item;
}

export function probabilityCorrect(theta,item){
  validateItem(item);
  const ability=finite(theta,'theta');
  const exponent=-item.discrimination * (ability - item.difficulty);
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

function abilityEstimate(theta,standardError,responses){
  const margin=1.96 * standardError;
  return Object.freeze({
    theta,
    standardError,
    confidenceInterval:Object.freeze([theta - margin,theta + margin]),
    responses:Object.freeze(responses.map(response => Object.freeze(clone(response))))
  });
}

function negativeLogLikelihood(theta,responses){
  let logLikelihood=0;
  for(const response of responses){
    const p=clamp(probabilityCorrect(theta,response),0.0001,0.9999);
    logLikelihood+=response.correct ? Math.log(p) : Math.log(1 - p);
  }
  logLikelihood-=0.1 * theta * theta;
  return -logLikelihood;
}

function boundedMinimize(fn,left=-4,right=4,tolerance=1e-7,maxIterations=180){
  const phi=(Math.sqrt(5) - 1) / 2;
  let a=left;
  let b=right;
  let c=b - phi * (b - a);
  let d=a + phi * (b - a);
  let fc=fn(c);
  let fd=fn(d);

  for(let i=0;i<maxIterations && Math.abs(b - a) > tolerance;i++){
    if(fc < fd){
      b=d;
      d=c;
      fd=fc;
      c=b - phi * (b - a);
      fc=fn(c);
    }else{
      a=c;
      c=d;
      fc=fd;
      d=a + phi * (b - a);
      fd=fn(d);
    }
  }
  return (a + b) / 2;
}

function normalizeResponse(response,index=0){
  if(!response || typeof response !== 'object') throw new TypeError('response ' + index + ' must be an object.');
  if(typeof response.correct !== 'boolean') throw new TypeError('response.correct must be boolean.');
  return {
    id:String(response.id ?? response.questionId ?? ('q' + index)),
    questionId:String(response.questionId ?? response.id ?? ('q' + index)),
    correct:response.correct,
    difficulty:clamp(finite(response.difficulty,'response.difficulty'),IRT_ITEM_DIFFICULTY_MIN,IRT_ITEM_DIFFICULTY_MAX),
    discrimination:clamp(finite(response.discrimination,'response.discrimination'),IRT_DISCRIMINATION_MIN,IRT_DISCRIMINATION_MAX)
  };
}

export function estimateAbility(responses){
  const clean=Array.isArray(responses) ? responses.map(normalizeResponse) : [];
  if(clean.length === 0) return abilityEstimate(0,1,[]);

  const allCorrect=clean.every(response => response.correct);
  const allIncorrect=clean.every(response => !response.correct);

  let theta;
  let standardError;

  if(allCorrect){
    theta=Math.min(Math.max(...clean.map(response => response.difficulty)) + 1,3);
    standardError=1 / Math.sqrt(clean.length);
  }else if(allIncorrect){
    theta=Math.max(Math.min(...clean.map(response => response.difficulty)) - 1,-3);
    standardError=1 / Math.sqrt(clean.length);
  }else{
    theta=boundedMinimize(value => negativeLogLikelihood(value,clean),IRT_THETA_MIN,IRT_THETA_MAX);
    if(!Number.isFinite(theta)) theta=0;

    const information=clean.reduce((sum,response) => sum + fisherInformation(theta,response),0);
    standardError=information > 0 ? 1 / Math.sqrt(information) : 1;
  }

  return abilityEstimate(theta,standardError,clean);
}

export function updateAbility(current,item,correct){
  validateItem(item);
  if(typeof correct !== 'boolean') throw new TypeError('correct must be boolean.');
  const prior=Array.isArray(current?.responses) ? current.responses : [];
  return estimateAbility([
    ...prior,
    {
      questionId:item.id,
      correct,
      difficulty:item.difficulty,
      discrimination:item.discrimination
    }
  ]);
}

export function selectNextQuestion(ability,availableItems,{method='max_info'}={}){
  const items=Array.isArray(availableItems) ? availableItems : [];
  if(items.length === 0) return null;
  const theta=finite(ability?.theta ?? 0,'ability.theta');

  if(method === 'max_info'){
    let best=null;
    let bestInfo=-1;
    for(const item of items){
      validateItem(item);
      const info=fisherInformation(theta,item);
      if(info > bestInfo){
        bestInfo=info;
        best=item;
      }
    }
    return best;
  }

  if(method === 'target_50'){
    let best=null;
    let bestDistance=Infinity;
    for(const item of items){
      validateItem(item);
      const distance=Math.abs(probabilityCorrect(theta,item) - 0.5);
      if(distance < bestDistance){
        bestDistance=distance;
        best=item;
      }
    }
    return best;
  }

  throw new Error('Unknown selection method: ' + method);
}

export function difficultyPriorFromQuestion(questionVersion){
  const source=finite(Number(questionVersion?.difficulty ?? 3),'questionVersion.difficulty');
  return clamp(source - 3,IRT_ITEM_DIFFICULTY_MIN,IRT_ITEM_DIFFICULTY_MAX);
}

export function createIrtItemFromQuestionVersion(questionVersion,{
  difficulty,
  discrimination=1
}={}){
  if(!questionVersion || typeof questionVersion !== 'object'){
    throw new TypeError('questionVersion must be an object.');
  }
  const id=String(questionVersion.questionId || questionVersion.id || '');
  if(!id) throw new TypeError('questionVersion requires questionId.');

  return Object.freeze({
    id,
    questionId:id,
    version:Number(questionVersion.contentVersion ?? 1),
    contentHash:String(questionVersion.contentHash || ''),
    difficulty:clamp(
      difficulty == null ? difficultyPriorFromQuestion(questionVersion) : finite(difficulty,'difficulty'),
      IRT_ITEM_DIFFICULTY_MIN,
      IRT_ITEM_DIFFICULTY_MAX
    ),
    discrimination:clamp(
      finite(discrimination,'discrimination'),
      IRT_DISCRIMINATION_MIN,
      IRT_DISCRIMINATION_MAX
    ),
    topicId:String(questionVersion.skill || '')
  });
}

export function createItemCalibration(questionVersion,overrides={}){
  const item=createIrtItemFromQuestionVersion(questionVersion,overrides);
  return Object.freeze({
    schemaVersion:1,
    questionId:item.questionId,
    version:item.version,
    contentHash:item.contentHash,
    difficulty:item.difficulty,
    discrimination:item.discrimination,
    responseCount:0,
    correctCount:0,
    updatedAt:0
  });
}

export function updateItemCalibration(calibration,{
  theta,
  correct,
  atMs
},{
  difficultyLearningRate=0.05,
  discriminationLearningRate=0.01
}={}){
  if(!calibration || typeof calibration !== 'object') throw new TypeError('calibration must be an object.');
  if(typeof correct !== 'boolean') throw new TypeError('correct must be boolean.');
  const ability=clamp(finite(theta,'theta'),IRT_THETA_MIN,IRT_THETA_MAX);
  const b=clamp(finite(calibration.difficulty,'calibration.difficulty'),IRT_ITEM_DIFFICULTY_MIN,IRT_ITEM_DIFFICULTY_MAX);
  const a=clamp(finite(calibration.discrimination,'calibration.discrimination'),IRT_DISCRIMINATION_MIN,IRT_DISCRIMINATION_MAX);
  const item={id:calibration.questionId,difficulty:b,discrimination:a};
  const p=probabilityCorrect(ability,item);
  const error=(correct ? 1 : 0) - p;

  const nextDifficulty=clamp(
    b - finite(difficultyLearningRate,'difficultyLearningRate') * a * error,
    IRT_ITEM_DIFFICULTY_MIN,
    IRT_ITEM_DIFFICULTY_MAX
  );

  const gradientA=error * (ability - b) - 0.02 * (a - 1);
  const nextDiscrimination=clamp(
    a + finite(discriminationLearningRate,'discriminationLearningRate') * gradientA,
    IRT_DISCRIMINATION_MIN,
    IRT_DISCRIMINATION_MAX
  );

  return Object.freeze({
    ...clone(calibration),
    difficulty:nextDifficulty,
    discrimination:nextDiscrimination,
    responseCount:(calibration.responseCount ?? 0) + 1,
    correctCount:(calibration.correctCount ?? 0) + (correct ? 1 : 0),
    updatedAt:finite(atMs,'atMs')
  });
}
