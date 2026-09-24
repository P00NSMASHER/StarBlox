import {
  createLearningEvent,
  toQuestionV2
} from './learningContracts.js';
import {
  appendLearningEvent,
  createLearningLedger
} from './learningEventLedger.js';

export const SHADOW_CONTENT_VERSION = 'bootstrap-current-bank-v1';

export function recordShadowLearningEvent(save,{
  question,
  choice,
  timestamp=Date.now(),
  questSeed=0,
  wasRetry=false,
  hintUsed=false,
  responseMs=0
}={}){
  const normalizedQuestion = toQuestionV2(question || {},{
    contentVersion:SHADOW_CONTENT_VERSION
  });
  const event = createLearningEvent({
    question:normalizedQuestion,
    choice,
    timestamp,
    questSeed,
    wasRetry,
    hintUsed,
    responseMs
  });
  const shadowLearningLedger = appendLearningEvent(
    createLearningLedger(save?.shadowLearningLedger),
    event
  );

  return {
    event,
    state:{
      ...(save || {}),
      shadowLearningLedger
    }
  };
}
