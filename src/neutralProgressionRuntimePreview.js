import {
  loadNeutralProgressionRuleCatalog
} from './neutralProgressionRuleCatalog.js';

export const NEUTRAL_PROGRESSION_RUNTIME_PREVIEW_SCHEMA =
  'starblox-neutral-progression-runtime-preview-v1';

function finiteNonNegative(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function neutralProgressionMetrics(save = {}) {
  return {
    questsCompleted: finiteNonNegative(save.questsCompleted),
    stars: finiteNonNegative(save.stars),
    starWorth: finiteNonNegative(save.starWorth),
    masteredCount: Array.isArray(save.mastered)
      ? new Set(save.mastered.map(String)).size
      : 0
  };
}

function criterionProgress(metrics, criterion) {
  const current = finiteNonNegative(metrics[criterion.metric]);
  const target = Math.max(0, finiteNonNegative(criterion.gte));
  return {
    metric: criterion.metric,
    current,
    target,
    remaining: Math.max(0, target - current),
    met: current >= target,
    pct: target === 0
      ? 100
      : Math.max(0, Math.min(100, current / target * 100))
  };
}

export function buildNeutralProgressionRuntimePreview(catalogInput, save = {}) {
  const catalog = loadNeutralProgressionRuleCatalog(catalogInput);
  const metrics = neutralProgressionMetrics(save);

  const rows = catalog.rules.map((rule) => {
    const criteria = rule.criteria.map((criterion) =>
      criterionProgress(metrics, criterion)
    );
    const unlocked = criteria.every((criterion) => criterion.met);
    const progressPct = criteria.length
      ? Math.min(...criteria.map((criterion) => criterion.pct))
      : 100;

    return {
      targetType: rule.targetType,
      targetId: rule.targetId,
      unlocked,
      progressPct: Number(progressPct.toFixed(2)),
      criteria
    };
  });

  const byType = {
    residential: [],
    vehicle: [],
    town: []
  };
  for (const row of rows) byType[row.targetType].push(row);

  const nextUnlocks = rows
    .filter((row) => !row.unlocked)
    .sort(
      (a, b) =>
        b.progressPct - a.progressPct ||
        a.targetType.localeCompare(b.targetType) ||
        a.targetId.localeCompare(b.targetId)
    )
    .slice(0, 5);

  const unlockedCounts = Object.fromEntries(
    Object.entries(byType).map(([type, typeRows]) => [
      type,
      typeRows.filter((row) => row.unlocked).length
    ])
  );

  return deepFreeze({
    schemaVersion: NEUTRAL_PROGRESSION_RUNTIME_PREVIEW_SCHEMA,
    mode: 'shadow-read-only',
    metrics,
    byType,
    unlockedCounts,
    nextUnlocks,
    economyMutation: {
      coins: 0,
      stars: 0,
      starWorth: 0,
      xp: 0
    },
    mutationBoundary: catalog.mutationBoundary,
    sourceParityClaims: catalog.sourceParityClaims
  });
}

export function neutralUnlockedTargetIds(catalogInput, save = {}, targetType) {
  const model = buildNeutralProgressionRuntimePreview(catalogInput, save);
  const rows = model.byType[String(targetType)] || [];
  return rows.filter((row) => row.unlocked).map((row) => row.targetId);
}
