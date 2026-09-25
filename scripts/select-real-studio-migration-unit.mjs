import { readFile,writeFile } from 'node:fs/promises';
import { isAbsolute,resolve } from 'node:path';

function arg(name,required=false){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (() => {
    const index=process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}

function abs(value){
  return isAbsolute(value) ? value : resolve(process.cwd(),value);
}

const planPath=abs(arg('--plan',true));
const rulesOut=abs(arg('--rules-out',true));
const selectionOut=abs(arg('--selection-out',true));

const plan=JSON.parse(await readFile(planPath,'utf8'));
if(!Array.isArray(plan.units) || !plan.units.length){
  throw new Error('migration plan contains no units');
}

const candidates=plan.units
  .filter(unit =>
    unit.selected === true &&
    unit.migrationStrategy === 'refactor' &&
    unit.exportDisposition === 'quarantine' &&
    Array.isArray(unit.riskFlags) &&
    unit.riskFlags.length === 0
  )
  .sort((a,b) =>
    (a.dependencies?.external?.length || 0) - (b.dependencies?.external?.length || 0) ||
    (a.stats?.scripts || 0) - (b.stats?.scripts || 0) ||
    (a.stats?.instances || 0) - (b.stats?.instances || 0) ||
    b.engineeringLeverageScore - a.engineeringLeverageScore ||
    a.unitId.localeCompare(b.unitId)
  );

if(!candidates.length){
  throw new Error('no selected non-risky refactor unit is available for the first real Studio cycle');
}

const selected=candidates[0];
const otherSystems=[...new Set(
  plan.units
    .map(unit => unit.systemName)
    .filter(name => name && name !== selected.systemName)
)].sort();

const rules={
  includeCapabilities:[],
  excludeCapabilities:[],
  includeSystems:[selected.systemName],
  excludeSystems:otherSystems,
  minEngineeringLeverageScore:10,
  includeRisky:false
};

const selection={
  schemaVersion:1,
  version:'starblox-real-studio-selection-v1',
  status:'selected-for-studio-quarantine-cycle',
  sourcePlan:{
    planId:plan.planId,
    planHash:plan.planHash,
    catalogHash:plan.catalogHash
  },
  policy:{
    requireSelected:true,
    requireStrategy:'refactor',
    requireDisposition:'quarantine',
    requireRiskFlags:[],
    sort:[
      'fewest-external-dependencies',
      'fewest-scripts',
      'fewest-instances',
      'highest-engineering-leverage',
      'stable-unit-id'
    ]
  },
  unit:{
    unitId:selected.unitId,
    systemName:selected.systemName,
    rootPath:selected.rootPath,
    sourceId:selected.sourceId,
    sourceFile:selected.sourceFile,
    sourceSha256:selected.sourceSha256,
    sourceBytes:selected.sourceBytes,
    capabilities:selected.capabilities,
    engineeringLeverageScore:selected.engineeringLeverageScore,
    migrationStrategy:selected.migrationStrategy,
    exportDisposition:selected.exportDisposition,
    suggestedTarget:selected.suggestedTarget,
    blockers:selected.blockers,
    riskFlags:selected.riskFlags,
    stats:selected.stats,
    externalDependencyCount:selected.dependencies?.external?.length || 0
  },
  executionBoundary:{
    importedLuauExecuted:false,
    studioMutationStarted:false,
    playtestStarted:false,
    publicationStarted:false,
    liveActivationAllowed:false
  }
};

await writeFile(rulesOut,JSON.stringify(rules,null,2)+'\n');
await writeFile(selectionOut,JSON.stringify(selection,null,2)+'\n');

console.log('StarBlox real Studio migration-unit selection');
console.log('unit: ' + selected.unitId);
console.log('system: ' + selected.systemName);
console.log('scripts: ' + (selected.stats?.scripts || 0));
console.log('instances: ' + (selected.stats?.instances || 0));
console.log('external dependencies: ' + (selected.dependencies?.external?.length || 0));
console.log('selection: ' + selectionOut);
console.log('rules: ' + rulesOut);
