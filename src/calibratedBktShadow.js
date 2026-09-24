import { updateBktMastery } from './masteryShadowModel.js';

export const CALIBRATED_BKT_SHADOW_VERSION='starblox-calibrated-bkt-shadow-v1';

export const CALIBRATED_BKT_SHADOW_PARAMS=Object.freeze({
  pKnow:0.2,
  pLearn:0.2,
  pGuess:0.1,
  pSlip:0.2
});

export function updateCalibratedBktShadow(priorMastery,isCorrect){
  return updateBktMastery(
    priorMastery,
    Boolean(isCorrect),
    CALIBRATED_BKT_SHADOW_PARAMS
  );
}
