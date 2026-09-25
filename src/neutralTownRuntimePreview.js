import {
  loadNeutralTownLocationCatalog
} from './neutralTownLocationCatalog.js';
import {
  loadStarBloxProxyTownTopology
} from './starBloxProxyTownTopology.js';

export const NEUTRAL_TOWN_RUNTIME_PREVIEW_SCHEMA =
  'starblox-neutral-town-runtime-preview-v1';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function buildNeutralTownRuntimePreview(catalogInput, topologyInput) {
  const catalog = loadNeutralTownLocationCatalog(catalogInput);
  const topology = loadStarBloxProxyTownTopology(topologyInput, catalogInput);

  const locations = catalog.definitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    category: definition.category,
    lifecycle: definition.lifecycle,
    playerFacingEligible: definition.playerFacingEligible,
    safety: {
      externalRuntimeDependency: definition.safety.externalRuntimeDependency,
      remoteDependency: definition.safety.remoteDependency,
      exactSourceCoordinatesClaimed: definition.safety.exactSourceCoordinatesClaimed
    }
  }));

  const byId = Object.fromEntries(
    locations.map((location) => [location.id, location])
  );

  return deepFreeze({
    schemaVersion: NEUTRAL_TOWN_RUNTIME_PREVIEW_SCHEMA,
    mode: 'read-only-preview',
    topologyKind: topology.topologyKind,
    locationCount: catalog.locationCount,
    playerFacingCount: catalog.playerFacingCount,
    deferredCount: catalog.deferredCount,
    edgeCount: topology.edgeCount,
    locations,
    byId,
    playerFacingIds: locations
      .filter((location) => location.playerFacingEligible)
      .map((location) => location.id),
    deferredIds: locations
      .filter((location) => !location.playerFacingEligible)
      .map((location) => location.id),
    edges: topology.edges,
    adjacency: topology.adjacency,
    topologyClaims: topology.claims,
    topologySafety: topology.safety
  });
}
