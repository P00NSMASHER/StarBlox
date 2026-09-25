import { describe, expect, it } from 'vitest';
import {
  RESIDENTIAL_FEATURES,
  applyResidentialAction,
  createResidentialState,
  residentialFeatureState
} from './residentialFeatureRuntime.js';

describe('residentialFeatureRuntime', () => {
  it('creates a neutral residential state with evidenced feature vocabulary', () => {
    const state=createResidentialState();
    expect(Object.keys(state.available).length).toBe(Object.keys(RESIDENTIAL_FEATURES).length);
    expect(state.activeRoom).toBe('default');
    expect(state.mode).toBe('default');
    expect(state.history).toEqual([]);
  });

  it('toggles doors without mutating the previous state', () => {
    const before=createResidentialState({availableFeatureIds:['front-door']});
    const after=applyResidentialAction(before,{featureId:'front-door',type:'toggle-open'});
    expect(before.open['front-door']).toBeUndefined();
    expect(after.open['front-door']).toBe(true);
    expect(residentialFeatureState(after,'front-door').open).toBe(true);
  });

  it('supports doorbell, amenity power, room selection and neutral house modes', () => {
    let state=createResidentialState({
      availableFeatureIds:['doorbell','hot-tub','room-change','house-controls']
    });
    state=applyResidentialAction(state,{featureId:'doorbell',type:'ring'});
    state=applyResidentialAction(state,{featureId:'hot-tub',type:'toggle-power'});
    state=applyResidentialAction(state,{featureId:'room-change',type:'select-room',room:'study-room'});
    state=applyResidentialAction(state,{featureId:'house-controls',type:'set-mode',mode:'cozy'});
    expect(state.doorbellRings).toBe(1);
    expect(state.powered['hot-tub']).toBe(true);
    expect(state.activeRoom).toBe('study-room');
    expect(state.mode).toBe('cozy');
    expect(state.history).toHaveLength(4);
  });

  it('rejects actions on unavailable or unsupported features', () => {
    const state=createResidentialState({availableFeatureIds:['front-door']});
    expect(() => applyResidentialAction(state,{featureId:'hot-tub',type:'toggle-power'})).toThrow(/unavailable/);
    expect(() => applyResidentialAction(state,{featureId:'front-door',type:'ring'})).toThrow(/does not support/);
  });
});
