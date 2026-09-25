import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  NEUTRAL_TOWN_LOCATION_CATALOG_SCHEMA,
  NEUTRAL_TOWN_LOCATION_SCHEMA,
  loadNeutralTownLocationCatalog
} from './neutralTownLocationCatalog.js';

const catalogText = fs.readFileSync(
  new URL(
    '../docs/preproduction/brookhaven-research/neutral-town-location-catalog-v1.json',
    import.meta.url
  ),
  'utf8'
);

function parsedCatalog() {
  return JSON.parse(catalogText);
}

describe('neutralTownLocationCatalog', () => {
  it('loads exactly 17 locations in deterministic id order with a 15/2 eligibility split', () => {
    const loaded = loadNeutralTownLocationCatalog(catalogText);
    const ids = loaded.definitions.map((definition) => definition.id);

    expect(loaded.schemaVersion).toBe(NEUTRAL_TOWN_LOCATION_CATALOG_SCHEMA);
    expect(loaded.locationCount).toBe(17);
    expect(loaded.playerFacingCount).toBe(15);
    expect(loaded.deferredCount).toBe(2);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
    expect(new Set(ids).size).toBe(17);
    expect(loaded.byId.school.schemaVersion).toBe(NEUTRAL_TOWN_LOCATION_SCHEMA);
    expect(loaded.byId['mystery-zone'].playerFacingEligible).toBe(false);
    expect(loaded.byId['restricted-zone'].lifecycle).toBe('research-deferred');
  });

  it('returns an independent deeply frozen read-only snapshot', () => {
    const input = parsedCatalog();
    const loaded = loadNeutralTownLocationCatalog(input);

    expect(Object.isFrozen(loaded)).toBe(true);
    expect(Object.isFrozen(loaded.definitions)).toBe(true);
    expect(Object.isFrozen(loaded.definitions[0])).toBe(true);
    expect(Object.isFrozen(loaded.definitions[0].safety)).toBe(true);
    expect(Object.isFrozen(loaded.byId)).toBe(true);
    expect(() => loaded.definitions.push({})).toThrow();
    expect(() => {
      loaded.byId.school.playerFacingEligible = false;
    }).toThrow();
    expect(Object.isFrozen(input)).toBe(false);
  });

  it('fails closed on deferred-zone leakage, rights drift, coordinate claims and duplicate ids', () => {
    const leaked = parsedCatalog();
    const mystery = leaked.definitions.find((row) => row.id === 'mystery-zone');
    mystery.playerFacingEligible = true;
    mystery.lifecycle = 'player-facing';
    expect(() => loadNeutralTownLocationCatalog(leaked)).toThrow(
      /cannot be player-facing/
    );

    const wrongRights = parsedCatalog();
    wrongRights.rightsStatus = 'unverified';
    expect(() => loadNeutralTownLocationCatalog(wrongRights)).toThrow(
      /verified-for-project-use/
    );

    const coordinates = parsedCatalog();
    coordinates.definitions[0].safety.exactSourceCoordinatesClaimed = true;
    expect(() => loadNeutralTownLocationCatalog(coordinates)).toThrow(
      /exactSourceCoordinatesClaimed must be false/
    );

    const duplicate = parsedCatalog();
    duplicate.definitions[1].id = duplicate.definitions[0].id;
    duplicate.definitions[1].evidenceRef = duplicate.sourceBlueprintRef + '#' + duplicate.definitions[1].id;
    expect(() => loadNeutralTownLocationCatalog(duplicate)).toThrow(
      /location ids must be unique/
    );
  });

  it('rejects remote/runtime dependencies and open-contract drift', () => {
    const remote = parsedCatalog();
    remote.definitions[0].safety.remoteDependency = true;
    expect(() => loadNeutralTownLocationCatalog(remote)).toThrow(
      /remoteDependency must be false/
    );

    const runtime = parsedCatalog();
    runtime.definitions[0].safety.externalRuntimeDependency = true;
    expect(() => loadNeutralTownLocationCatalog(runtime)).toThrow(
      /externalRuntimeDependency must be false/
    );

    const extra = parsedCatalog();
    extra.definitions[0].sourceEvidence = 'must-not-enter-neutral-contract';
    expect(() => loadNeutralTownLocationCatalog(extra)).toThrow(
      /closed contract/
    );
  });
});
