import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  STARBLOX_PROXY_TOWN_EDGES,
  TOWN_LOCATION_CATALOG
} from './townSystemRuntime.js';
import {
  NEUTRAL_TOWN_RUNTIME_PREVIEW_SCHEMA,
  buildNeutralTownRuntimePreview
} from './neutralTownRuntimePreview.js';

const catalogText = fs.readFileSync(
  new URL(
    '../docs/preproduction/brookhaven-research/neutral-town-location-catalog-v1.json',
    import.meta.url
  ),
  'utf8'
);
const topologyText = fs.readFileSync(
  new URL(
    '../docs/preproduction/brookhaven-research/starblox-proxy-town-topology-v1.json',
    import.meta.url
  ),
  'utf8'
);

function canonicalEdge([a, b]) {
  return a.localeCompare(b) <= 0 ? [a, b] : [b, a];
}

function edgeKeys(edges) {
  return edges
    .map(canonicalEdge)
    .map((edge) => edge.join('|'))
    .sort((a, b) => a.localeCompare(b));
}

describe('neutralTownRuntimePreview', () => {
  it('builds a deterministic deeply frozen read-only 17-location preview', () => {
    const preview = buildNeutralTownRuntimePreview(catalogText, topologyText);
    const ids = preview.locations.map((location) => location.id);

    expect(preview.schemaVersion).toBe(NEUTRAL_TOWN_RUNTIME_PREVIEW_SCHEMA);
    expect(preview.mode).toBe('read-only-preview');
    expect(preview.topologyKind).toBe('original-starblox-proxy');
    expect(preview.locationCount).toBe(17);
    expect(preview.playerFacingCount).toBe(15);
    expect(preview.deferredCount).toBe(2);
    expect(preview.edgeCount).toBe(14);
    expect(ids).toEqual([...ids].sort((a, b) => a.localeCompare(b)));
    expect(Object.isFrozen(preview)).toBe(true);
    expect(Object.isFrozen(preview.locations)).toBe(true);
    expect(Object.isFrozen(preview.locations[0])).toBe(true);
    expect(Object.isFrozen(preview.edges)).toBe(true);
    expect(Object.isFrozen(preview.adjacency)).toBe(true);
  });

  it('proves location parity with the existing town runtime catalog', () => {
    const preview = buildNeutralTownRuntimePreview(catalogText, topologyText);
    const runtimeIds = Object.keys(TOWN_LOCATION_CATALOG).sort();
    const previewIds = Object.keys(preview.byId).sort();

    expect(previewIds).toEqual(runtimeIds);

    for (const id of runtimeIds) {
      const runtimeLocation = TOWN_LOCATION_CATALOG[id];
      const previewLocation = preview.byId[id];

      expect(previewLocation.id).toBe(runtimeLocation.id);
      expect(previewLocation.label).toBe(runtimeLocation.label);
      expect(previewLocation.category).toBe(runtimeLocation.category);
      expect(previewLocation.playerFacingEligible).toBe(
        runtimeLocation.playerFacingEligible
      );
    }
  });

  it('proves exact undirected edge parity with the existing original StarBlox proxy graph', () => {
    const preview = buildNeutralTownRuntimePreview(catalogText, topologyText);

    expect(edgeKeys(preview.edges)).toEqual(
      edgeKeys(STARBLOX_PROXY_TOWN_EDGES)
    );
    expect(preview.deferredIds).toEqual(['mystery-zone', 'restricted-zone']);
    expect(preview.adjacency['mystery-zone']).toEqual([]);
    expect(preview.adjacency['restricted-zone']).toEqual([]);
    expect(preview.topologyClaims.exactSourceCoordinates).toBe(false);
    expect(preview.topologyClaims.exactSourceRoadLayout).toBe(false);
    expect(preview.topologyClaims.exactSourceTopology).toBe(false);
  });

  it('keeps the adapter isolated from live town actions, networking and the app', () => {
    const source = fs.readFileSync(
      new URL('./neutralTownRuntimePreview.js', import.meta.url),
      'utf8'
    );

    expect(source).not.toContain('townSystemRuntime');
    expect(source).not.toContain('unlockTownLocation');
    expect(source).not.toContain('visitTownLocation');
    expect(source).not.toContain('deriveTownRoute');
    expect(source).not.toContain('App.jsx');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('XMLHttpRequest');
  });
});
