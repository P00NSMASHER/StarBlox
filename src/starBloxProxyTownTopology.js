import {
  loadNeutralTownLocationCatalog
} from './neutralTownLocationCatalog.js';

export const STARBLOX_PROXY_TOWN_TOPOLOGY_SCHEMA =
  'starblox-proxy-town-topology-v1';

const TOPOLOGY_KEYS = Object.freeze([
  'schemaVersion',
  'generatedAt',
  'status',
  'sourceBlueprintRef',
  'topologyKind',
  'edgeSemantics',
  'locationCount',
  'edgeCount',
  'locationIds',
  'edges',
  'claims',
  'safety'
]);

const CLAIM_KEYS = Object.freeze([
  'exactSourceCoordinates',
  'exactSourceRoadLayout',
  'exactSourceTopology'
]);

const SAFETY_KEYS = Object.freeze([
  'externalRuntimeDependency',
  'remoteDependency',
  'liveQuestRouting'
]);

function fail(message) {
  throw new Error('invalid StarBlox proxy town topology: ' + message);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneJson(value, path = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail(path + ' contains a non-finite number');
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => cloneJson(item, path + '[' + index + ']'));
  }
  if (isPlainObject(value)) {
    const copy = {};
    for (const [key, item] of Object.entries(value)) {
      copy[key] = cloneJson(item, path + '.' + key);
    }
    return copy;
  }
  fail(path + ' contains a non-JSON value');
}

function parseInput(input) {
  if (typeof input === 'string') {
    try {
      return cloneJson(JSON.parse(input));
    } catch (error) {
      if (String(error?.message || '').startsWith('invalid StarBlox')) throw error;
      fail('input is not valid JSON');
    }
  }
  return cloneJson(input);
}

function assertExactKeys(object, expected, path) {
  if (!isPlainObject(object)) fail(path + ' must be an object');
  const actual = Object.keys(object).sort().join('|');
  const wanted = [...expected].sort().join('|');
  if (actual !== wanted) fail(path + ' fields do not match the closed contract');
}

function canonicalEdge(a, b) {
  return a.localeCompare(b) <= 0 ? [a, b] : [b, a];
}

function edgeKey(edge) {
  return edge[0] + '|' + edge[1];
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function loadStarBloxProxyTownTopology(topologyInput, catalogInput) {
  const topology = parseInput(topologyInput);
  const catalog = loadNeutralTownLocationCatalog(catalogInput);

  assertExactKeys(topology, TOPOLOGY_KEYS, 'topology');
  if (topology.schemaVersion !== STARBLOX_PROXY_TOWN_TOPOLOGY_SCHEMA) {
    fail('schemaVersion is unsupported');
  }
  if (topology.status !== 'original-starblox-proxy-runtime-not-wired') {
    fail('status must remain original-starblox-proxy-runtime-not-wired');
  }
  if (topology.sourceBlueprintRef !== catalog.sourceBlueprintRef) {
    fail('sourceBlueprintRef must match the neutral town catalog');
  }
  if (topology.topologyKind !== 'original-starblox-proxy') {
    fail('topologyKind must remain original-starblox-proxy');
  }
  if (topology.edgeSemantics !== 'undirected') {
    fail('edgeSemantics must remain undirected');
  }

  if (!Array.isArray(topology.locationIds)) fail('locationIds must be an array');
  if (!Array.isArray(topology.edges)) fail('edges must be an array');
  if (topology.locationCount !== 17 || topology.locationCount !== topology.locationIds.length) {
    fail('locationCount must remain exactly 17');
  }
  if (topology.edgeCount !== 14 || topology.edgeCount !== topology.edges.length) {
    fail('edgeCount must remain exactly 14');
  }

  const catalogIds = catalog.definitions.map((definition) => definition.id).sort();
  const topologyIds = [...topology.locationIds].map(String).sort();
  if (new Set(topologyIds).size !== topologyIds.length) fail('locationIds must be unique');
  if (topologyIds.join('|') !== catalogIds.join('|')) {
    fail('locationIds must exactly match the neutral town catalog');
  }

  const canonicalEdges = [];
  const seenEdges = new Set();
  for (let index = 0; index < topology.edges.length; index += 1) {
    const edge = topology.edges[index];
    if (!Array.isArray(edge) || edge.length !== 2) {
      fail('edges[' + index + '] must contain exactly two location ids');
    }
    const a = String(edge[0]);
    const b = String(edge[1]);
    if (!catalog.byId[a] || !catalog.byId[b]) {
      fail('edges[' + index + '] references an unknown location');
    }
    if (a === b) fail('edges[' + index + '] cannot be a self edge');
    if (!catalog.byId[a].playerFacingEligible || !catalog.byId[b].playerFacingEligible) {
      fail('research-deferred locations cannot enter the player-facing topology');
    }
    const canonical = canonicalEdge(a, b);
    const key = edgeKey(canonical);
    if (seenEdges.has(key)) fail('duplicate undirected edge: ' + key);
    seenEdges.add(key);
    canonicalEdges.push(canonical);
  }
  canonicalEdges.sort((a, b) => edgeKey(a).localeCompare(edgeKey(b)));

  assertExactKeys(topology.claims, CLAIM_KEYS, 'topology.claims');
  if (topology.claims.exactSourceCoordinates !== false) {
    fail('exactSourceCoordinates must be false');
  }
  if (topology.claims.exactSourceRoadLayout !== false) {
    fail('exactSourceRoadLayout must be false');
  }
  if (topology.claims.exactSourceTopology !== false) {
    fail('exactSourceTopology must be false');
  }

  assertExactKeys(topology.safety, SAFETY_KEYS, 'topology.safety');
  if (topology.safety.externalRuntimeDependency !== false) {
    fail('externalRuntimeDependency must be false');
  }
  if (topology.safety.remoteDependency !== false) {
    fail('remoteDependency must be false');
  }
  if (topology.safety.liveQuestRouting !== false) {
    fail('liveQuestRouting must be false');
  }

  const adjacency = Object.fromEntries(catalogIds.map((id) => [id, []]));
  for (const [a, b] of canonicalEdges) {
    adjacency[a].push(b);
    adjacency[b].push(a);
  }
  for (const neighbors of Object.values(adjacency)) {
    neighbors.sort((a, b) => a.localeCompare(b));
  }

  return deepFreeze({
    schemaVersion: topology.schemaVersion,
    generatedAt: topology.generatedAt,
    status: topology.status,
    sourceBlueprintRef: topology.sourceBlueprintRef,
    topologyKind: topology.topologyKind,
    edgeSemantics: topology.edgeSemantics,
    locationCount: topology.locationCount,
    edgeCount: topology.edgeCount,
    locationIds: catalogIds,
    edges: canonicalEdges,
    claims: topology.claims,
    safety: topology.safety,
    adjacency
  });
}
