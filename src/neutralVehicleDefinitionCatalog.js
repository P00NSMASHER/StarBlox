export const NEUTRAL_VEHICLE_DEFINITION_CATALOG_SCHEMA =
  'starblox-neutral-vehicle-definition-catalog-v1';
export const NEUTRAL_VEHICLE_DEFINITION_SCHEMA =
  'starblox-neutral-vehicle-definition-v1';

const CATALOG_KEYS = Object.freeze([
  'schemaVersion',
  'generatedAt',
  'status',
  'definitionSchemaRef',
  'sourceBlueprintRef',
  'rightsStatus',
  'definitionCount',
  'definitions'
]);

const DEFINITION_KEYS = Object.freeze([
  'schemaVersion',
  'id',
  'label',
  'archetype',
  'era',
  'interactionMode',
  'capabilities',
  'assetBinding',
  'safety'
]);

const ASSET_KEYS = Object.freeze([
  'status',
  'geometrySource',
  'rightsStatus',
  'provenanceRef'
]);

const SAFETY_KEYS = Object.freeze([
  'externalRuntimeDependency',
  'remoteDependency',
  'weaponBehavior'
]);

const ARCHETYPES = new Set([
  'compact',
  'utility',
  'luxury',
  'work',
  'sport',
  'service',
  'transit',
  'emergency',
  'legacy',
  'display-only',
  'original'
]);

const CAPABILITIES = new Set([
  'spawn',
  'despawn',
  'headlights',
  'hazards',
  'paint-token',
  'wheel-style',
  'driving-mode',
  'emergency-lights',
  'emergency-siren'
]);

const BASE_DRIVABLE_CAPABILITIES = Object.freeze([
  'spawn',
  'despawn',
  'headlights',
  'hazards',
  'paint-token',
  'wheel-style',
  'driving-mode'
]);

function fail(message) {
  throw new Error('invalid neutral vehicle definition catalog: ' + message);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneJson(value, path = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
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
      if (String(error?.message || '').startsWith('invalid neutral vehicle')) throw error;
      fail('input is not valid JSON');
    }
  }
  return cloneJson(input);
}

function assertExactKeys(object, expected, path) {
  if (!isPlainObject(object)) fail(path + ' must be an object');
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (actual.join('|') !== wanted.join('|')) {
    fail(path + ' fields do not match the closed contract');
  }
}

function assertString(value, path) {
  if (typeof value !== 'string' || !value.trim()) fail(path + ' must be a non-empty string');
}

function sameSet(values, expected) {
  if (!Array.isArray(values) || new Set(values).size !== values.length) return false;
  return [...values].sort().join('|') === [...expected].sort().join('|');
}

function expectedCapabilities(archetype) {
  if (archetype === 'display-only') {
    return ['spawn', 'despawn', 'paint-token'];
  }
  if (archetype === 'emergency') {
    return [...BASE_DRIVABLE_CAPABILITIES, 'emergency-lights', 'emergency-siren'];
  }
  return [...BASE_DRIVABLE_CAPABILITIES];
}

function validateDefinition(definition, index) {
  const path = 'definitions[' + index + ']';
  assertExactKeys(definition, DEFINITION_KEYS, path);

  if (definition.schemaVersion !== NEUTRAL_VEHICLE_DEFINITION_SCHEMA) {
    fail(path + '.schemaVersion is unsupported');
  }

  assertString(definition.id, path + '.id');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(definition.id)) {
    fail(path + '.id is not a neutral kebab-case id');
  }

  assertString(definition.label, path + '.label');
  if (!ARCHETYPES.has(definition.archetype)) fail(path + '.archetype is unsupported');
  if (definition.era !== 'current') fail(path + '.era must be current in this catalog');

  const expectedInteraction =
    definition.archetype === 'display-only' ? 'display-only' : 'drivable';
  if (definition.interactionMode !== expectedInteraction) {
    fail(path + '.interactionMode does not match archetype');
  }

  if (!Array.isArray(definition.capabilities)) fail(path + '.capabilities must be an array');
  if (definition.capabilities.some((value) => !CAPABILITIES.has(value))) {
    fail(path + '.capabilities contains an unsupported capability');
  }
  if (!sameSet(definition.capabilities, expectedCapabilities(definition.archetype))) {
    fail(path + '.capabilities do not match the neutral archetype contract');
  }

  assertExactKeys(definition.assetBinding, ASSET_KEYS, path + '.assetBinding');
  if (definition.assetBinding.status !== 'identifier-only') {
    fail(path + '.assetBinding.status must remain identifier-only');
  }
  if (definition.assetBinding.geometrySource !== 'none') {
    fail(path + '.assetBinding.geometrySource must remain none');
  }
  if (definition.assetBinding.rightsStatus !== 'project-rights-verified') {
    fail(path + '.assetBinding.rightsStatus must be project-rights-verified');
  }
  assertString(definition.assetBinding.provenanceRef, path + '.assetBinding.provenanceRef');

  assertExactKeys(definition.safety, SAFETY_KEYS, path + '.safety');
  if (definition.safety.externalRuntimeDependency !== false) {
    fail(path + '.safety.externalRuntimeDependency must be false');
  }
  if (definition.safety.remoteDependency !== false) {
    fail(path + '.safety.remoteDependency must be false');
  }
  if (definition.safety.weaponBehavior !== false) {
    fail(path + '.safety.weaponBehavior must be false');
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function loadNeutralVehicleDefinitionCatalog(input) {
  const catalog = parseInput(input);
  assertExactKeys(catalog, CATALOG_KEYS, 'catalog');

  if (catalog.schemaVersion !== NEUTRAL_VEHICLE_DEFINITION_CATALOG_SCHEMA) {
    fail('schemaVersion is unsupported');
  }
  if (catalog.status !== 'definition-only-runtime-not-wired') {
    fail('status must remain definition-only-runtime-not-wired');
  }
  if (catalog.rightsStatus !== 'verified-for-project-use') {
    fail('rightsStatus must be verified-for-project-use');
  }
  assertString(catalog.generatedAt, 'catalog.generatedAt');
  assertString(catalog.definitionSchemaRef, 'catalog.definitionSchemaRef');
  assertString(catalog.sourceBlueprintRef, 'catalog.sourceBlueprintRef');

  if (!Array.isArray(catalog.definitions)) fail('definitions must be an array');
  if (catalog.definitionCount !== catalog.definitions.length) {
    fail('definitionCount does not match definitions length');
  }
  if (catalog.definitions.length !== 13) {
    fail('current neutral vehicle catalog must contain exactly 13 definitions');
  }

  catalog.definitions.forEach(validateDefinition);

  const ids = catalog.definitions.map((definition) => definition.id);
  if (new Set(ids).size !== ids.length) fail('vehicle ids must be unique');

  catalog.definitions.sort((a, b) => a.id.localeCompare(b.id));

  const byId = Object.fromEntries(
    catalog.definitions.map((definition) => [definition.id, definition])
  );

  return deepFreeze({
    schemaVersion: catalog.schemaVersion,
    generatedAt: catalog.generatedAt,
    status: catalog.status,
    definitionSchemaRef: catalog.definitionSchemaRef,
    sourceBlueprintRef: catalog.sourceBlueprintRef,
    rightsStatus: catalog.rightsStatus,
    definitionCount: catalog.definitionCount,
    definitions: catalog.definitions,
    byId
  });
}
