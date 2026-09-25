import {
  loadNeutralVehicleDefinitionCatalog
} from './neutralVehicleDefinitionCatalog.js';

export const NEUTRAL_VEHICLE_RUNTIME_PREVIEW_SCHEMA =
  'starblox-neutral-vehicle-runtime-preview-v1';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function buildNeutralVehicleRuntimePreview(catalogInput) {
  const catalog = loadNeutralVehicleDefinitionCatalog(catalogInput);

  const vehicles = catalog.definitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    archetype: definition.archetype,
    era: definition.era,
    interactionMode: definition.interactionMode,
    assetStatus: definition.assetBinding.status,
    geometrySource: definition.assetBinding.geometrySource,
    capabilities: [...definition.capabilities],
    safety: {
      externalRuntimeDependency: definition.safety.externalRuntimeDependency,
      remoteDependency: definition.safety.remoteDependency,
      weaponBehavior: definition.safety.weaponBehavior
    }
  }));

  const byId = Object.fromEntries(
    vehicles.map((vehicle) => [vehicle.id, vehicle])
  );

  return deepFreeze({
    schemaVersion: NEUTRAL_VEHICLE_RUNTIME_PREVIEW_SCHEMA,
    mode: 'read-only-preview',
    sourceCatalogSchemaVersion: catalog.schemaVersion,
    definitionCount: catalog.definitionCount,
    vehicles,
    byId
  });
}
