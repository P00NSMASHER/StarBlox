import { describe, expect, it } from 'vitest';
import {
  VEHICLE_CATALOG,
  applyVehicleAction,
  createVehicleState,
  despawnNeutralVehicle,
  spawnNeutralVehicle,
  vehicleInstanceView
} from './vehicleSystemRuntime.js';

describe('vehicleSystemRuntime', () => {
  it('contains exactly the 13 evidenced current vehicle identifiers', () => {
    expect(Object.keys(VEHICLE_CATALOG)).toHaveLength(13);
    expect(VEHICLE_CATALOG['school-bus'].sourceName).toBe('SchoolBus');
    expect(VEHICLE_CATALOG['fire-truck'].sourceName).toBe('FireTruck');
  });

  it('spawns and customizes a neutral local vehicle without mutating prior state', () => {
    const base=createVehicleState({availableVehicleIds:['school-bus']});
    const spawned=spawnNeutralVehicle(base,{vehicleId:'school-bus',instanceId:'bus-a'});
    const painted=applyVehicleAction(spawned,{instanceId:'bus-a',type:'set-paint-token',value:'star-blue'});
    expect(base.active['bus-a']).toBeUndefined();
    expect(spawned.active['bus-a'].controls.paintToken).toBe('default');
    expect(painted.active['bus-a'].controls.paintToken).toBe('star-blue');
    expect(vehicleInstanceView(painted,'bus-a').assetStatus).toBe('identifier-only');
  });

  it('allows emergency controls only for the neutral emergency archetype', () => {
    let state=createVehicleState({availableVehicleIds:['fire-truck','school-bus']});
    state=spawnNeutralVehicle(state,{vehicleId:'fire-truck',instanceId:'fire-a'});
    state=applyVehicleAction(state,{instanceId:'fire-a',type:'set-emergency-lights',value:true});
    expect(state.active['fire-a'].controls.emergencyLights).toBe(true);

    state=spawnNeutralVehicle(state,{vehicleId:'school-bus',instanceId:'bus-a'});
    expect(() => applyVehicleAction(state,{
      instanceId:'bus-a',type:'set-emergency-siren',value:true
    })).toThrow(/does not support/);
  });

  it('despawns by instance and keeps catalog availability intact', () => {
    let state=createVehicleState({availableVehicleIds:['jeep']});
    state=spawnNeutralVehicle(state,{vehicleId:'jeep',instanceId:'jeep-a'});
    state=despawnNeutralVehicle(state,{instanceId:'jeep-a'});
    expect(state.active['jeep-a']).toBeUndefined();
    expect(state.available['jeep']).toBe(true);
    expect(state.history.map(row=>row.type)).toEqual(['spawn','despawn']);
  });
});
