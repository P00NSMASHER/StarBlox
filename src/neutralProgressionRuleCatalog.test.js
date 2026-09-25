import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  NEUTRAL_PROGRESSION_RULE_CATALOG_SCHEMA,
  NEUTRAL_PROGRESSION_RULE_SCHEMA,
  loadNeutralProgressionRuleCatalog
} from './neutralProgressionRuleCatalog.js';

const catalogText = fs.readFileSync(
  new URL(
    '../docs/preproduction/brookhaven-research/neutral-progression-rule-catalog-v1.json',
    import.meta.url
  ),
  'utf8'
);

function parsedCatalog() {
  return JSON.parse(catalogText);
}

describe('neutralProgressionRuleCatalog', () => {
  it('loads exactly 42 deterministic read-only rules with 14/13/15 target counts', () => {
    const loaded = loadNeutralProgressionRuleCatalog(catalogText);
    const keys = loaded.rules.map((rule) => rule.targetType + ':' + rule.targetId);

    expect(loaded.schemaVersion).toBe(NEUTRAL_PROGRESSION_RULE_CATALOG_SCHEMA);
    expect(loaded.ruleCount).toBe(42);
    expect(loaded.counts).toEqual({
      residential: 14,
      vehicle: 13,
      town: 15
    });
    expect(keys).toEqual([...keys].sort((a, b) => a.localeCompare(b)));
    expect(new Set(keys).size).toBe(42);
    expect(loaded.rules[0].schemaVersion).toBe(NEUTRAL_PROGRESSION_RULE_SCHEMA);
    expect(loaded.metrics).toEqual([
      'masteredCount',
      'questsCompleted',
      'starWorth',
      'stars'
    ]);
  });

  it('returns an independent deeply frozen snapshot with a zero-mutation boundary', () => {
    const input = parsedCatalog();
    const loaded = loadNeutralProgressionRuleCatalog(input);

    expect(Object.isFrozen(loaded)).toBe(true);
    expect(Object.isFrozen(loaded.rules)).toBe(true);
    expect(Object.isFrozen(loaded.rules[0])).toBe(true);
    expect(Object.isFrozen(loaded.rules[0].criteria)).toBe(true);
    expect(Object.isFrozen(loaded.mutationBoundary)).toBe(true);
    expect(Object.isFrozen(loaded.byTarget)).toBe(true);

    expect(loaded.mutationBoundary).toEqual({
      readsExistingSave: true,
      writesExistingSave: false,
      awardsCoins: false,
      deductsCoins: false,
      awardsStars: false,
      changesStarWorth: false,
      changesXp: false,
      changesMastery: false,
      changesQuestRewards: false
    });

    expect(() => loaded.rules.push({})).toThrow();
    expect(() => {
      loaded.mutationBoundary.writesExistingSave = true;
    }).toThrow();
    expect(Object.isFrozen(input)).toBe(false);
  });

  it('fails closed on unsupported metrics, negative thresholds, duplicate targets and deferred town targets', () => {
    const unsupportedMetric = parsedCatalog();
    unsupportedMetric.rules[0].criteria = [{ metric: 'coins', gte: 1 }];
    expect(() => loadNeutralProgressionRuleCatalog(unsupportedMetric)).toThrow(
      /metric is unsupported/
    );

    const negativeThreshold = parsedCatalog();
    const withCriterion = negativeThreshold.rules.find((rule) => rule.criteria.length);
    withCriterion.criteria[0].gte = -1;
    expect(() => loadNeutralProgressionRuleCatalog(negativeThreshold)).toThrow(
      /finite and non-negative/
    );

    const duplicate = parsedCatalog();
    duplicate.rules[1].targetType = duplicate.rules[0].targetType;
    duplicate.rules[1].targetId = duplicate.rules[0].targetId;
    duplicate.rules[1].sourceRef =
      duplicate.sourceBlueprintRef + '#' +
      duplicate.rules[1].targetType + '/' + duplicate.rules[1].targetId;
    expect(() => loadNeutralProgressionRuleCatalog(duplicate)).toThrow(
      /rule targets must be unique/
    );

    const deferred = parsedCatalog();
    const townRule = deferred.rules.find((rule) => rule.targetType === 'town');
    townRule.targetId = 'mystery-zone';
    townRule.sourceRef =
      deferred.sourceBlueprintRef + '#town/mystery-zone';
    expect(() => loadNeutralProgressionRuleCatalog(deferred)).toThrow(
      /research-deferred town location/
    );
  });

  it('fails closed on mutation or source-parity claims and open-contract drift', () => {
    const mutation = parsedCatalog();
    mutation.mutationBoundary.awardsStars = true;
    expect(() => loadNeutralProgressionRuleCatalog(mutation)).toThrow(
      /awardsStars must remain false/
    );

    const sourceParity = parsedCatalog();
    sourceParity.sourceParityClaims.exactSourceEconomy = true;
    expect(() => loadNeutralProgressionRuleCatalog(sourceParity)).toThrow(
      /exactSourceEconomy must be false/
    );

    const extra = parsedCatalog();
    extra.rules[0].reward = 100;
    expect(() => loadNeutralProgressionRuleCatalog(extra)).toThrow(
      /closed contract/
    );
  });
});
