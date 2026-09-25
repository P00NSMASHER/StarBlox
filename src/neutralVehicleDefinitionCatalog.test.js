import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  NEUTRAL_VEHICLE_DEFINITION_CATALOG_SCHEMA,
  NEUTRAL_VEHICLE_DEFINITION_SCHEMA,
  loadNeutralVehicleDefinitionCatalog
} from './neutralVehicleDefinitionCatalog.js';

const catalogUrl = new URL(
  '../docs/preproduction/brookhaven-research/neutral-vehicle-definition-catalog-v1.json',
  import.meta.url
);
const catalogText = fs.readFileSync(catalogUrl, 'utf8');

function parsedCatalog() {
  return JSON.parse(catalogText);
}

describe('neutralVehicleDefinitionCatalog', () => {
  it('loads the checked-in 13-vehicle catalog in deterministic id order', () => {
    const loaded = loadNeutralVehicleDefinitionCatalog(catalogText);
    const ids = loaded.definitions.map((definition) => definition.id);

    expect(loaded.schemaVersion).toBe(NEUTRAL_VEHICLE_DEFINITION_CATALOG_SCHEMA);
    expect(loaded.definitionCount).toBe(13);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
    expect(new Set(ids).size).toBe(13);
    expect(loaded.byId['fire-truck'].schemaVersion).toBe(NEUTRAL_VEHICLE_DEFINITION_SCHEMA);
    expect(loaded.byId['tank'].interactionMode).toBe('display-only');
    expect(loaded.byId['tank'].capabilities).toEqual(['spawn', 'despawn', 'paint-token']);
    expect(loaded.byId['fire-truck'].capabilities).toContain('emergency-siren');
  });

  it('returns an independent deeply frozen read-only snapshot', () => {
    const input = parsedCatalog();
    const originalFirstId = input.definitions[0].id;
    const loaded = loadNeutralVehicleDefinitionCatalog(input);

    expect(Object.isFrozen(loaded)).toBe(true);
    expect(Object.isFrozen(loaded.definitions)).toBe(true);
    expect(Object.isFrozen(loaded.definitions[0])).toBe(true);
    expect(Object.isFrozen(loaded.definitions[0].assetBinding)).toBe(true);
    expect(Object.isFrozen(loaded.definitions[0].safety)).toBe(true);
    expect(Object.isFrozen(loaded.byId)).toBe(true);
    expect(() => loaded.definitions.push({})).toThrow();
    expect(() => {
      loaded.byId['fire-truck'].safety.remoteDependency = true;
    }).toThrow();

    expect(input.definitions[0].id).toBe(originalFirstId);
    expect(Object.isFrozen(input)).toBe(false);
  });

  it('fails closed on rights, geometry, remote, duplicate-id, and open-contract drift', () => {
    const wrongRights = parsedCatalog();
    wrongRights.definitions[0].assetBinding.rightsStatus = 'original-starblox';
    expect(() => loadNeutralVehicleDefinitionCatalog(wrongRights)).toThrow(
      /project-rights-verified/
    );

    const geometryClaim = parsedCatalog();
    geometryClaim.definitions[0].assetBinding.geometrySource =
      'project-rights-verified-conversion';
    expect(() => loadNeutralVehicleDefinitionCatalog(geometryClaim)).toThrow(
      /geometrySource must remain none/
    );

    const remoteDependency = parsedCatalog();
    remoteDependency.definitions[0].safety.remoteDependency = true;
    expect(() => loadNeutralVehicleDefinitionCatalog(remoteDependency)).toThrow(
      /remoteDependency must be false/
    );

    const duplicate = parsedCatalog();
    duplicate.definitions[1].id = duplicate.definitions[0].id;
    expect(() => loadNeutralVehicleDefinitionCatalog(duplicate)).toThrow(
      /vehicle ids must be unique/
    );

    const extraField = parsedCatalog();
    extraField.definitions[0].sourceName = 'must-not-enter-neutral-contract';
    expect(() => loadNeutralVehicleDefinitionCatalog(extraField)).toThrow(
      /closed contract/
    );
  });

  it('does not import or invoke the existing vehicle runtime', () => {
    const loaderSource = fs.readFileSync(
      new URL('./neutralVehicleDefinitionCatalog.js', import.meta.url),
      'utf8'
    );
    expect(loaderSource).not.toContain('vehicleSystemRuntime');
    expect(loaderSource).not.toContain('App.jsx');
    expect(loaderSource).not.toContain('fetch(');
    expect(loaderSource).not.toContain('XMLHttpRequest');
  });
});
