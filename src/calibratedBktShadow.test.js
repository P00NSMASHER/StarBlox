import { describe, expect, it } from 'vitest';
import {
  CALIBRATED_BKT_SHADOW_PARAMS,
  CALIBRATED_BKT_SHADOW_VERSION,
  updateCalibratedBktShadow
} from './calibratedBktShadow.js';
import { updateBktMastery } from './masteryShadowModel.js';

describe('calibrated BKT shadow profile',()=>{
  it('locks the development-selected parameter set',()=>{
    expect(CALIBRATED_BKT_SHADOW_VERSION)
      .toBe('starblox-calibrated-bkt-shadow-v1');
    expect(CALIBRATED_BKT_SHADOW_PARAMS).toEqual({
      pKnow:0.2,
      pLearn:0.2,
      pGuess:0.1,
      pSlip:0.2
    });
  });

  it('delegates to the existing StarBlox BKT update equation',()=>{
    for(const prior of [0.1,0.2,0.5,0.9]){
      for(const correct of [false,true]){
        expect(updateCalibratedBktShadow(prior,correct))
          .toBe(updateBktMastery(
            prior,
            correct,
            CALIBRATED_BKT_SHADOW_PARAMS
          ));
      }
    }
  });
});
