export const NEUTRAL_PROGRESSION_RULE_CATALOG_SCHEMA =
  'starblox-neutral-progression-rule-catalog-v1';
export const NEUTRAL_PROGRESSION_RULE_SCHEMA =
  'starblox-neutral-progression-rule-v1';

const CATALOG_KEYS = Object.freeze([
  'schemaVersion',
  'generatedAt',
  'status',
  'ruleSchemaRef',
  'sourceBlueprintRef',
  'rulePolicy',
  'sourceParityClaims',
  'metrics',
  'ruleCount',
  'counts',
  'mutationBoundary',
  'rules'
]);

const RULE_KEYS = Object.freeze([
  'schemaVersion',
  'targetType',
  'targetId',
  'criteria',
  'sourceRef'
]);

const CRITERION_KEYS = Object.freeze(['metric', 'gte']);
const COUNT_KEYS = Object.freeze(['residential', 'vehicle', 'town']);
const PARITY_KEYS = Object.freeze([
  'exactSourceProgression',
  'exactSourceEconomy'
]);
const MUTATION_KEYS = Object.freeze([
  'readsExistingSave',
  'writesExistingSave',
  'awardsCoins',
  'deductsCoins',
  'awardsStars',
  'changesStarWorth',
  'changesXp',
  'changesMastery',
  'changesQuestRewards'
]);

const TARGET_TYPES = new Set(['residential', 'vehicle', 'town']);
const METRICS = new Set([
  'questsCompleted',
  'stars',
  'starWorth',
  'masteredCount'
]);
const DEFERRED_TOWN_IDS = new Set(['mystery-zone', 'restricted-zone']);

function fail(message) {
  throw new Error('invalid neutral progression rule catalog: ' + message);
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
      if (String(error?.message || '').startsWith('invalid neutral progression')) {
        throw error;
      }
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
  if (typeof value !== 'string' || !value.trim()) {
    fail(path + ' must be a non-empty string');
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function validateRule(rule, index, sourceBlueprintRef) {
  const path = 'rules[' + index + ']';
  assertExactKeys(rule, RULE_KEYS, path);

  if (rule.schemaVersion !== NEUTRAL_PROGRESSION_RULE_SCHEMA) {
    fail(path + '.schemaVersion is unsupported');
  }
  if (!TARGET_TYPES.has(rule.targetType)) {
    fail(path + '.targetType is unsupported');
  }
  assertString(rule.targetId, path + '.targetId');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rule.targetId)) {
    fail(path + '.targetId is not a neutral kebab-case id');
  }
  if (rule.targetType === 'town' && DEFERRED_TOWN_IDS.has(rule.targetId)) {
    fail(path + ' cannot target a research-deferred town location');
  }

  if (!Array.isArray(rule.criteria)) fail(path + '.criteria must be an array');
  const seenMetrics = new Set();
  for (let criterionIndex = 0; criterionIndex < rule.criteria.length; criterionIndex += 1) {
    const criterion = rule.criteria[criterionIndex];
    const criterionPath = path + '.criteria[' + criterionIndex + ']';
    assertExactKeys(criterion, CRITERION_KEYS, criterionPath);
    if (!METRICS.has(criterion.metric)) {
      fail(criterionPath + '.metric is unsupported');
    }
    if (seenMetrics.has(criterion.metric)) {
      fail(path + ' contains a duplicate criterion metric');
    }
    seenMetrics.add(criterion.metric);
    if (!Number.isFinite(Number(criterion.gte)) || Number(criterion.gte) < 0) {
      fail(criterionPath + '.gte must be finite and non-negative');
    }
    criterion.gte = Number(criterion.gte);
  }
  rule.criteria.sort((a, b) =>
    a.metric.localeCompare(b.metric) || a.gte - b.gte
  );

  const expectedRef =
    sourceBlueprintRef + '#' + rule.targetType + '/' + rule.targetId;
  if (rule.sourceRef !== expectedRef) {
    fail(path + '.sourceRef is not bound to its blueprint target');
  }
}

export function loadNeutralProgressionRuleCatalog(input) {
  const catalog = parseInput(input);
  assertExactKeys(catalog, CATALOG_KEYS, 'catalog');

  if (catalog.schemaVersion !== NEUTRAL_PROGRESSION_RULE_CATALOG_SCHEMA) {
    fail('schemaVersion is unsupported');
  }
  if (catalog.status !== 'shadow-read-only-runtime-not-wired-live') {
    fail('status must remain shadow-read-only-runtime-not-wired-live');
  }
  if (
    catalog.rulePolicy !==
    'original-starblox-research-design-not-source-progression-parity'
  ) {
    fail('rulePolicy is unsupported');
  }

  assertString(catalog.generatedAt, 'catalog.generatedAt');
  assertString(catalog.ruleSchemaRef, 'catalog.ruleSchemaRef');
  assertString(catalog.sourceBlueprintRef, 'catalog.sourceBlueprintRef');

  assertExactKeys(catalog.sourceParityClaims, PARITY_KEYS, 'catalog.sourceParityClaims');
  if (catalog.sourceParityClaims.exactSourceProgression !== false) {
    fail('exactSourceProgression must be false');
  }
  if (catalog.sourceParityClaims.exactSourceEconomy !== false) {
    fail('exactSourceEconomy must be false');
  }

  if (!Array.isArray(catalog.metrics)) fail('metrics must be an array');
  if (new Set(catalog.metrics).size !== catalog.metrics.length) {
    fail('metrics must be unique');
  }
  const metrics = [...catalog.metrics].sort();
  const expectedMetrics = [...METRICS].sort();
  if (metrics.join('|') !== expectedMetrics.join('|')) {
    fail('metrics must exactly match the four supported StarBlox progression signals');
  }
  catalog.metrics = metrics;

  assertExactKeys(catalog.counts, COUNT_KEYS, 'catalog.counts');
  if (
    catalog.counts.residential !== 14 ||
    catalog.counts.vehicle !== 13 ||
    catalog.counts.town !== 15
  ) {
    fail('rule counts must remain 14 residential, 13 vehicle, and 15 town');
  }

  assertExactKeys(catalog.mutationBoundary, MUTATION_KEYS, 'catalog.mutationBoundary');
  if (catalog.mutationBoundary.readsExistingSave !== true) {
    fail('readsExistingSave must remain true');
  }
  for (const key of MUTATION_KEYS) {
    if (key === 'readsExistingSave') continue;
    if (catalog.mutationBoundary[key] !== false) {
      fail(key + ' must remain false');
    }
  }

  if (!Array.isArray(catalog.rules)) fail('rules must be an array');
  if (catalog.ruleCount !== 42 || catalog.rules.length !== 42) {
    fail('ruleCount must remain exactly 42');
  }

  catalog.rules.forEach((rule, index) =>
    validateRule(rule, index, catalog.sourceBlueprintRef)
  );

  const keys = catalog.rules.map((rule) => rule.targetType + ':' + rule.targetId);
  if (new Set(keys).size !== keys.length) fail('rule targets must be unique');

  const derivedCounts = {
    residential: catalog.rules.filter((rule) => rule.targetType === 'residential').length,
    vehicle: catalog.rules.filter((rule) => rule.targetType === 'vehicle').length,
    town: catalog.rules.filter((rule) => rule.targetType === 'town').length
  };
  for (const type of COUNT_KEYS) {
    if (derivedCounts[type] !== catalog.counts[type]) {
      fail(type + ' count does not match rules');
    }
  }

  catalog.rules.sort((a, b) =>
    a.targetType.localeCompare(b.targetType) ||
    a.targetId.localeCompare(b.targetId)
  );

  const byTarget = Object.fromEntries(
    catalog.rules.map((rule) => [rule.targetType + ':' + rule.targetId, rule])
  );

  return deepFreeze({
    schemaVersion: catalog.schemaVersion,
    generatedAt: catalog.generatedAt,
    status: catalog.status,
    ruleSchemaRef: catalog.ruleSchemaRef,
    sourceBlueprintRef: catalog.sourceBlueprintRef,
    rulePolicy: catalog.rulePolicy,
    sourceParityClaims: catalog.sourceParityClaims,
    metrics: catalog.metrics,
    ruleCount: catalog.ruleCount,
    counts: catalog.counts,
    mutationBoundary: catalog.mutationBoundary,
    rules: catalog.rules,
    byTarget
  });
}
