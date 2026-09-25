import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  STARBLOX_PROXY_TOWN_TOPOLOGY_SCHEMA,
  loadStarBloxProxyTownTopology
} from './starBloxProxyTownTopology.js';

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

function parsedTopology() {
  return JSON.parse(topologyText);
}

describe('starBloxProxyTownTopology', () => {
  it('loads exactly 17 locations and 14 deterministic undirected proxy edges', () => {
    const topology = loadStarBloxProxyTownTopology(topologyText, catalogText);
    const keys = topology.edges.map((edge) => edge.join('|'));

    expect(topology.schemaVersion).toBe(STARBLOX_PROXY_TOWN_TOPOLOGY_SCHEMA);
    expect(topology.topologyKind).toBe('original-starblox-proxy');
    expect(topology.edgeSemantics).toBe('undirected');
    expect(topology.locationCount).toBe(17);
    expect(topology.edgeCount).toBe(14);
    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b)));
    expect(new Set(keys).size).toBe(14);
    expect(topology.adjacency['mystery-zone']).toEqual([]);
    expect(topology.adjacency['restricted-zone']).toEqual([]);
  });

  it('returns a deeply frozen adjacency/config snapshot', () => {
    const topology = loadStarBloxProxyTownTopology(topologyText, catalogText);

    expect(Object.isFrozen(topology)).toBe(true);
    expect(Object.isFrozen(topology.edges)).toBe(true);
    expect(Object.isFrozen(topology.edges[0])).toBe(true);
    expect(Object.isFrozen(topology.adjacency)).toBe(true);
    expect(Object.isFrozen(topology.adjacency['town-hall'])).toBe(true);
    expect(() => topology.edges.push(['school', 'hospital'])).toThrow();
  });

  it('fails closed on source-parity claims and deferred-zone topology leakage', () => {
    const coordinateClaim = parsedTopology();
    coordinateClaim.claims.exactSourceCoordinates = true;
    expect(() => loadStarBloxProxyTownTopology(coordinateClaim, catalogText)).toThrow(
      /exactSourceCoordinates must be false/
    );

    const roadClaim = parsedTopology();
    roadClaim.claims.exactSourceRoadLayout = true;
    expect(() => loadStarBloxProxyTownTopology(roadClaim, catalogText)).toThrow(
      /exactSourceRoadLayout must be false/
    );

    const leaked = parsedTopology();
    leaked.edges[0] = ['mystery-zone', 'school'];
    expect(() => loadStarBloxProxyTownTopology(leaked, catalogText)).toThrow(
      /research-deferred locations cannot enter/
    );
  });

  it('rejects duplicate/self/unknown edges, remote dependencies and live quest routing', () => {
    const duplicate = parsedTopology();
    duplicate.edges[1] = [...duplicate.edges[0]];
    expect(() => loadStarBloxProxyTownTopology(duplicate, catalogText)).toThrow(
      /duplicate undirected edge/
    );

    const selfEdge = parsedTopology();
    selfEdge.edges[0] = ['school', 'school'];
    expect(() => loadStarBloxProxyTownTopology(selfEdge, catalogText)).toThrow(
      /self edge/
    );

    const unknown = parsedTopology();
    unknown.edges[0] = ['school', 'unknown-place'];
    expect(() => loadStarBloxProxyTownTopology(unknown, catalogText)).toThrow(
      /unknown location/
    );

    const remote = parsedTopology();
    remote.safety.remoteDependency = true;
    expect(() => loadStarBloxProxyTownTopology(remote, catalogText)).toThrow(
      /remoteDependency must be false/
    );

    const quest = parsedTopology();
    quest.safety.liveQuestRouting = true;
    expect(() => loadStarBloxProxyTownTopology(quest, catalogText)).toThrow(
      /liveQuestRouting must be false/
    );
  });
});
