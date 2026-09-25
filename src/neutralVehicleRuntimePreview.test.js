import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  VEHICLE_CATALOG
} from './vehicleSystemRuntime.js';
import {
  NEUTRAL_VEHICLE_RUNTIME_PREVIEW_SCHEMA,
  buildNeutralVehicleRuntimePreview
} from './neutralVehicleRuntimePreview.js';

const catalogText = fs.readFileSync(
  new URL(
    '../docs/preproduction/brookhaven-research/neutral-vehicle-definition-catalog-v1.json',
    import.meta.url
  ),
  'utf8'
);

describe('neutralVehicleRuntimePreview', () => {
  it('builds a deterministic deeply frozen read-only preview for all 13 current vehicles', () => {
    const preview = buildNeutralVehicleRuntimePreview(catalogText);
    const ids = preview.vehicles.map((vehicle) => vehicle.id);

    expect(preview.schemaVersion).toBe(NEUTRAL_VEHICLE_RUNTIME_PREVIEW_SCHEMA);
    expect(preview.mode).toBe('read-only-preview');
    expect(preview.definitionCount).toBe(13);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
    expect(new Set(ids).size).toBe(13);
    expect(Object.isFrozen(preview)).toBe(true);
    expect(Object.isFrozen(preview.vehicles)).toBe(true);
    expect(Object.isFrozen(preview.vehicles[0])).toBe(true);
    expect(Object.isFrozen(preview.vehicles[0].capabilities)).toBe(true);
    expect(Object.isFrozen(preview.vehicles[0].safety)).toBe(true);
    expect(Object.isFrozen(preview.byId)).toBe(true);
  });

  it('proves neutral preview parity with the existing current vehicle runtime contract', () => {
    const preview = buildNeutralVehicleRuntimePreview(catalogText);
    const previewIds = Object.keys(preview.byId).sort();
    const runtimeIds = Object.keys(VEHICLE_CATALOG).sort();

    expect(previewIds).toEqual(runtimeIds);

    for (const id of runtimeIds) {
      const previewVehicle = preview.byId[id];
      const runtimeVehicle = VEHICLE_CATALOG[id];

      expect(previewVehicle.id).toBe(runtimeVehicle.id);
      expect(previewVehicle.archetype).toBe(runtimeVehicle.archetype);
      expect(previewVehicle.era).toBe(runtimeVehicle.era);
      expect(previewVehicle.assetStatus).toBe(runtimeVehicle.assetStatus);
      expect([...previewVehicle.capabilities].sort()).toEqual(
        [...runtimeVehicle.capabilities].sort()
      );
    }
  });

  it('keeps display-only and emergency boundaries exact', () => {
    const preview = buildNeutralVehicleRuntimePreview(catalogText);

    expect(preview.byId['tank'].interactionMode).toBe('display-only');
    expect(preview.byId['tank'].capabilities).toEqual([
      'spawn',
      'despawn',
      'paint-token'
    ]);
    expect(preview.byId['tank'].safety.weaponBehavior).toBe(false);

    expect(preview.byId['fire-truck'].interactionMode).toBe('drivable');
    expect(preview.byId['fire-truck'].capabilities).toContain('emergency-lights');
    expect(preview.byId['fire-truck'].capabilities).toContain('emergency-siren');
  });

  it('keeps the adapter isolated from live runtime actions, networking and the app', () => {
    const source = fs.readFileSync(
      new URL('./neutralVehicleRuntimePreview.js', import.meta.url),
      'utf8'
    );

    expect(source).not.toContain('vehicleSystemRuntime');
    expect(source).not.toContain('spawnNeutralVehicle');
    expect(source).not.toContain('applyVehicleAction');
    expect(source).not.toContain('App.jsx');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('XMLHttpRequest');
  });
});
