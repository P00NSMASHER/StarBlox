
import { verifyRobloxMigrationPlan } from './migrationPlanner.js';

export function migrationPlanMarkdown(plan){
  const validation=verifyRobloxMigrationPlan(plan);
  if(!validation.ok){
    throw new Error('invalid Roblox migration plan: ' + validation.errors[0]);
  }

  const lines=[
    '# Brookhaven → StarBlox Migration Plan',
    '',
    'Plan ID: ' + plan.planId,
    'Plan hash: ' + plan.planHash,
    'Capability catalog: ' + plan.catalogHash,
    '',
    '## Summary',
    '',
    '- Total candidate units: ' + plan.summary.totalUnits,
    '- Selected units: ' + plan.summary.selectedUnits,
    '- Direct staging units: ' + plan.summary.stagingUnits,
    '- Quarantine/refactor units: ' + plan.summary.quarantineUnits,
    '- External dependencies: ' + plan.summary.externalDependencyCount,
    '- Blockers requiring review: ' + plan.summary.blockerCount,
    '',
    '## Selected migration units',
    ''
  ];

  for(const unit of plan.units.filter(item => item.selected)){
    lines.push(
      '- **' + unit.systemName + '** — ' +
      unit.engineeringLeverageScore + '/10; strategy **' + unit.migrationStrategy +
      '**; disposition **' + unit.exportDisposition + '**; source ' +
      unit.sourceFile + '; root ' + unit.rootPath + '; target ' +
      unit.suggestedTarget + '; capabilities: ' +
      (unit.capabilities.join(', ') || 'unclassified') +
      (unit.blockers.length ? '; blockers: ' + unit.blockers.join(', ') : '')
    );
  }

  lines.push('', '## Deferred / excluded units', '');
  for(const unit of plan.units.filter(item => !item.selected).slice(0,100)){
    lines.push(
      '- ' + unit.systemName + ' — ' + unit.selectionReason +
      '; strategy ' + unit.migrationStrategy
    );
  }

  lines.push('', '## Review rules', '');
  lines.push('- Extracted models are staging artifacts only.');
  lines.push('- Nothing is inserted into live Workspace or executable services automatically.');
  lines.push('- Refactor/risk-review systems export to quarantine, not production.');
  lines.push('- Irrelevant systems remain excluded and are never exported by rule override.');
  lines.push('- External module IDs/remotes must be resolved before activation.');
  lines.push('- Script-bearing systems should pass through the Step 2 AI Development Factory.');

  return lines.join('\n') + '\n';
}
