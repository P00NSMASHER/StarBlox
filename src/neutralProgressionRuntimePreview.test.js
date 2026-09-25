import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LIFE_SIM_PROGRESSION_RULES,
  deriveLifeSimProgressionShadow,
  progressionMetrics
} from './lifeSimProgressionShadowRuntime.js';
import {
  loadNeutralProgressionRuleCatalog
} from './neutralProgressionRuleCatalog.js';
import {
  NEUTRAL_PROGRESSION_RUNTIME_PREVIEW_SCHEMA,
  buildNeutralProgressionRuntimePreview,
  neutralProgressionMetrics,
  neutralUnlockedTargetIds
} from './neutralProgressionRuntimePreview.js';

const catalogText = fs.readFileSync(
  new URL(
    '../docs/preproduction/brookhaven-research/neutral-progression-rule-catalog-v1.json',
    import.meta.url
  ),
  'utf8'
);

function ruleKey(rule) {
  return rule.targetType + ':' + rule.targetId;
}

function normalizedRule(rule) {
  return {
    targetType: rule.targetType,
    targetId: rule.targetId,
    criteria: [...rule.criteria]
      .map((criterion) => ({
        metric: criterion.metric,
        gte: Number(criterion.gte)
      }))
      .sort((a, b) => a.metric.localeCompare(b.metric) || a.gte - b.gte)
  };
}

function normalizedRows(model) {
  return Object.values(model.byType)
    .flat()
    .map((row) => ({
      targetType: row.targetType,
      targetId: row.targetId,
      unlocked: row.unlocked,
      progressPct: row.progressPct,
      criteria: [...row.criteria]
        .map((criterion) => ({
          metric: criterion.metric,
          current: criterion.current,
          target: criterion.target,
          remaining: criterion.remaining,
          met: criterion.met,
          pct: criterion.pct
        }))
        .sort((a, b) => a.metric.localeCompare(b.metric))
    }))
    .sort((a, b) => ruleKey(a).localeCompare(ruleKey(b)));
}

describe('neutralProgressionRuntimePreview', () => {
  it('proves exact 42-rule parity with the existing Step 10 runtime contract', () => {
    const catalog = loadNeutralProgressionRuleCatalog(catalogText);
    const catalogRules = catalog.rules
      .map(normalizedRule)
      .sort((a, b) => ruleKey(a).localeCompare(ruleKey(b)));
    const runtimeRules = LIFE_SIM_PROGRESSION_RULES
      .map(normalizedRule)
      .sort((a, b) => ruleKey(a).localeCompare(ruleKey(b)));

    expect(catalogRules).toHaveLength(42);
    expect(runtimeRules).toHaveLength(42);
    expect(catalogRules).toEqual(runtimeRules);
  });

  it('matches the existing shadow evaluator across baseline, early, advanced and malformed saves', () => {
    const saves = [
      {},
      { coins: 25, stars: 0, starWorth: 0, questsCompleted: 0, mastered: [] },
      {
        stars: 1,
        starWorth: 50,
        questsCompleted: 1,
        mastered: ['phonics']
      },
      {
        stars: 5,
        starWorth: 320,
        questsCompleted: 7,
        mastered: ['phonics', 'vocabulary', 'inference', 'language', 'text-evidence']
      },
      {
        stars: -3,
        starWorth: 'not-a-number',
        questsCompleted: Infinity,
        mastered: ['phonics', 'phonics', 'vocabulary']
      }
    ];

    for (const save of saves) {
      const before = JSON.stringify(save, (_, value) =>
        typeof value === 'number' && !Number.isFinite(value)
          ? String(value)
          : value
      );
      const preview = buildNeutralProgressionRuntimePreview(catalogText, save);
      const runtime = deriveLifeSimProgressionShadow(save);

      expect(preview.schemaVersion).toBe(
        NEUTRAL_PROGRESSION_RUNTIME_PREVIEW_SCHEMA
      );
      expect(preview.mode).toBe(runtime.mode);
      expect(preview.metrics).toEqual(runtime.metrics);
      expect(preview.unlockedCounts).toEqual(runtime.unlockedCounts);
      expect(preview.nextUnlocks).toEqual(runtime.nextUnlocks);
      expect(preview.economyMutation).toEqual(runtime.economyMutation);
      expect(normalizedRows(preview)).toEqual(normalizedRows(runtime));
      expect(JSON.stringify(save, (_, value) =>
        typeof value === 'number' && !Number.isFinite(value)
          ? String(value)
          : value
      )).toBe(before);
    }
  });

  it('matches progression metrics and unlocked target sets without adding a second economy', () => {
    const save = {
      coins: 999,
      stars: 4,
      starWorth: 260,
      questsCompleted: 5,
      mastered: ['phonics', 'vocabulary', 'inference', 'language']
    };

    expect(neutralProgressionMetrics(save)).toEqual(progressionMetrics(save));

    for (const type of ['residential', 'vehicle', 'town']) {
      const previewIds = neutralUnlockedTargetIds(catalogText, save, type).sort();
      const runtime = deriveLifeSimProgressionShadow(save);
      const runtimeIds = runtime.byType[type]
        .filter((row) => row.unlocked)
        .map((row) => row.targetId)
        .sort();
      expect(previewIds).toEqual(runtimeIds);
    }

    const preview = buildNeutralProgressionRuntimePreview(catalogText, save);
    expect(preview.economyMutation).toEqual({
      coins: 0,
      stars: 0,
      starWorth: 0,
      xp: 0
    });
    expect(preview.mutationBoundary.writesExistingSave).toBe(false);
    expect(preview.mutationBoundary.awardsCoins).toBe(false);
    expect(preview.mutationBoundary.awardsStars).toBe(false);
    expect(preview.mutationBoundary.changesXp).toBe(false);
  });

  it('keeps deferred town targets and source-economy parity out of the preview', () => {
    const preview = buildNeutralProgressionRuntimePreview(catalogText, {
      stars: 999,
      starWorth: 99999,
      questsCompleted: 999,
      mastered: Array.from({ length: 20 }, (_, index) => 'skill-' + index)
    });

    const townIds = preview.byType.town.map((row) => row.targetId);
    expect(townIds).not.toContain('mystery-zone');
    expect(townIds).not.toContain('restricted-zone');
    expect(preview.sourceParityClaims.exactSourceProgression).toBe(false);
    expect(preview.sourceParityClaims.exactSourceEconomy).toBe(false);
  });

  it('keeps the adapter isolated from persistence, runtime catalogs, rewards and the live app', () => {
    const source = fs.readFileSync(
      new URL('./neutralProgressionRuntimePreview.js', import.meta.url),
      'utf8'
    );

    expect(source).not.toContain('lifeSimProgressionShadowRuntime');
    expect(source).not.toContain('residentialFeatureRuntime');
    expect(source).not.toContain('vehicleSystemRuntime');
    expect(source).not.toContain('townSystemRuntime');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('App.jsx');
    expect(source).not.toContain('fetch(');
    expect(source).not.toContain('XMLHttpRequest');
  });
});
