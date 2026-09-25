export const NEUTRAL_TOWN_LOCATION_CATALOG_SCHEMA =
  'starblox-neutral-town-location-catalog-v1';
export const NEUTRAL_TOWN_LOCATION_SCHEMA =
  'starblox-neutral-town-location-v1';

const CATALOG_KEYS = Object.freeze([
  'schemaVersion',
  'generatedAt',
  'status',
  'definitionSchemaRef',
  'sourceBlueprintRef',
  'rightsStatus',
  'locationCount',
  'playerFacingCount',
  'deferredCount',
  'definitions'
]);

const DEFINITION_KEYS = Object.freeze([
  'schemaVersion',
  'id',
  'label',
  'category',
  'lifecycle',
  'playerFacingEligible',
  'evidenceRef',
  'safety'
]);

const SAFETY_KEYS = Object.freeze([
  'externalRuntimeDependency',
  'remoteDependency',
  'exactSourceCoordinatesClaimed'
]);

const CATEGORIES = new Set([
  'civic',
  'education',
  'health',
  'emergency',
  'commerce',
  'community',
  'transport',
  'recreation',
  'research-deferred'
]);

function fail(message) {
  throw new Error('invalid neutral town location catalog: ' + message);
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
      if (String(error?.message || '').startsWith('invalid neutral town')) throw error;
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

function assertString(value, path) {
  if (typeof value !== 'string' || !value.trim()) fail(path + ' must be a non-empty string');
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function validateDefinition(definition, index, sourceBlueprintRef) {
  const path = 'definitions[' + index + ']';
  assertExactKeys(definition, DEFINITION_KEYS, path);

  if (definition.schemaVersion !== NEUTRAL_TOWN_LOCATION_SCHEMA) {
    fail(path + '.schemaVersion is unsupported');
  }

  assertString(definition.id, path + '.id');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(definition.id)) {
    fail(path + '.id is not a neutral kebab-case id');
  }

  assertString(definition.label, path + '.label');
  if (!CATEGORIES.has(definition.category)) fail(path + '.category is unsupported');

  const expectedLifecycle = definition.playerFacingEligible
    ? 'player-facing'
    : 'research-deferred';
  if (definition.lifecycle !== expectedLifecycle) {
    fail(path + '.lifecycle does not match player-facing eligibility');
  }

  if (definition.playerFacingEligible) {
    if (definition.category === 'research-deferred') {
      fail(path + ' cannot be player-facing while research-deferred');
    }
  } else if (definition.category !== 'research-deferred') {
    fail(path + ' deferred locations must use research-deferred category');
  }

  assertString(definition.evidenceRef, path + '.evidenceRef');
  if (definition.evidenceRef !== sourceBlueprintRef + '#' + definition.id) {
    fail(path + '.evidenceRef is not bound to its blueprint id');
  }

  assertExactKeys(definition.safety, SAFETY_KEYS, path + '.safety');
  if (definition.safety.externalRuntimeDependency !== false) {
    fail(path + '.safety.externalRuntimeDependency must be false');
  }
  if (definition.safety.remoteDependency !== false) {
    fail(path + '.safety.remoteDependency must be false');
  }
  if (definition.safety.exactSourceCoordinatesClaimed !== false) {
    fail(path + '.safety.exactSourceCoordinatesClaimed must be false');
  }
}

export function loadNeutralTownLocationCatalog(input) {
  const catalog = parseInput(input);
  assertExactKeys(catalog, CATALOG_KEYS, 'catalog');

  if (catalog.schemaVersion !== NEUTRAL_TOWN_LOCATION_CATALOG_SCHEMA) {
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
  if (catalog.locationCount !== catalog.definitions.length) {
    fail('locationCount does not match definitions length');
  }
  if (catalog.locationCount !== 17) fail('catalog must contain exactly 17 locations');

  catalog.definitions.forEach((definition, index) =>
    validateDefinition(definition, index, catalog.sourceBlueprintRef)
  );

  const ids = catalog.definitions.map((definition) => definition.id);
  if (new Set(ids).size !== ids.length) fail('location ids must be unique');

  const playerFacingCount = catalog.definitions.filter(
    (definition) => definition.playerFacingEligible
  ).length;
  const deferredCount = catalog.definitions.length - playerFacingCount;

  if (catalog.playerFacingCount !== playerFacingCount || playerFacingCount !== 15) {
    fail('playerFacingCount must remain exactly 15');
  }
  if (catalog.deferredCount !== deferredCount || deferredCount !== 2) {
    fail('deferredCount must remain exactly 2');
  }

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
    locationCount: catalog.locationCount,
    playerFacingCount: catalog.playerFacingCount,
    deferredCount: catalog.deferredCount,
    definitions: catalog.definitions,
    byId
  });
}
