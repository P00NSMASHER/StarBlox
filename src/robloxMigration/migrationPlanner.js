
import { stableHash } from '../domainSchemas.js';
import { verifyRobloxCapabilityCatalog } from '../robloxCatalog/capabilityCatalog.js';

export const ROBLOX_MIGRATION_SCHEMA_VERSION=1;
export const ROBLOX_MIGRATION_VERSION='starblox-roblox-migration-v1';

export const DEFAULT_MIGRATION_RULES=Object.freeze({
  includeCapabilities:Object.freeze([
    'housing','vehicles','ui','npc','quests','social','placement','animation',
    'audio','world','effects'
  ]),
  excludeCapabilities:Object.freeze([]),
  includeSystems:Object.freeze([]),
  excludeSystems:Object.freeze([]),
  minEngineeringLeverageScore:3.5,
  includeRisky:false
});

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function normalizeStringList(value){
  if(!Array.isArray(value)) return [];
  return [...new Set(value
    .filter(item => typeof item === 'string' && item.trim())
    .map(item => item.trim())
  )].sort();
}

function normalizeRules(raw={}){
  const includeCapabilities=normalizeStringList(
    raw.includeCapabilities ?? DEFAULT_MIGRATION_RULES.includeCapabilities
  );
  const excludeCapabilities=normalizeStringList(
    raw.excludeCapabilities ?? DEFAULT_MIGRATION_RULES.excludeCapabilities
  );
  const includeSystems=normalizeStringList(
    raw.includeSystems ?? DEFAULT_MIGRATION_RULES.includeSystems
  );
  const excludeSystems=normalizeStringList(
    raw.excludeSystems ?? DEFAULT_MIGRATION_RULES.excludeSystems
  );
  const min=Number(raw.minEngineeringLeverageScore ?? DEFAULT_MIGRATION_RULES.minEngineeringLeverageScore);

  return {
    includeCapabilities,
    excludeCapabilities,
    includeSystems,
    excludeSystems,
    minEngineeringLeverageScore:Number.isFinite(min) ? Math.max(0,Math.min(10,min)) : 3.5,
    includeRisky:Boolean(raw.includeRisky)
  };
}

function slug(value){
  const clean=String(value || '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .toLowerCase();
  return clean || 'system';
}

function groupInstances(catalog){
  const groups=new Map();

  for(const instance of catalog.instances || []){
    const system=instance.rootCandidate || instance.path.split('/')[1] || instance.name || 'Unknown';
    const key=instance.sourceId + '||' + system;
    if(!groups.has(key)){
      groups.set(key,{
        sourceId:instance.sourceId,
        sourceFile:instance.sourceFile,
        systemName:system,
        instances:[]
      });
    }
    groups.get(key).instances.push(instance);
  }

  return [...groups.values()];
}

function findCandidate(catalog,name){
  return (catalog.systemCandidates || []).find(candidate => candidate.name === name) || null;
}

function migrationStrategy(items,candidate){
  const risks=[...new Set(items.flatMap(item => item.script?.riskFlags || []))];
  const scripts=items.filter(item => item.script);
  const remotes=items.filter(item =>
    ['RemoteEvent','RemoteFunction','UnreliableRemoteEvent'].includes(item.className)
  );

  if(risks.length) return 'quarantine';
  if(scripts.length || remotes.length || candidate?.reuseRecommendation === 'refactor'){
    return 'refactor';
  }
  if(candidate?.reuseRecommendation === 'asset-only') return 'asset-only';
  return 'extract';
}

function targetBucket(capabilities,strategy){
  if(strategy === 'quarantine' || strategy === 'refactor') return 'Quarantine';
  const set=new Set(capabilities);
  if(set.has('housing')) return 'Housing';
  if(set.has('vehicles')) return 'Vehicles';
  if(set.has('ui')) return 'UI';
  if(set.has('social') || set.has('npc') || set.has('quests')) return 'Social';
  if(set.has('placement')) return 'Placement';
  if(set.has('world')) return 'World';
  if(set.has('animation') || set.has('audio')) return 'Media';
  if(set.has('effects')) return 'Effects';
  return 'Misc';
}

function collectDependencies(catalog,rootPath,items){
  const assetIds=[...new Set(items.flatMap(item => item.assetIds || []))].sort();
  const edges=(catalog.dependencies || [])
    .filter(edge => edge.from === rootPath || edge.from.startsWith(rootPath + '/'))
    .map(clone)
    .sort((a,b) =>
      a.type.localeCompare(b.type) ||
      a.to.localeCompare(b.to) ||
      a.from.localeCompare(b.from)
    );

  const localNames=new Set(items.map(item => item.name));
  const external=edges.filter(edge =>
    edge.type === 'require-asset' ||
    (edge.type === 'remote-reference' && !localNames.has(edge.to))
  );

  return {
    assetIds,
    edges,
    external
  };
}

function selectUnit({candidate,capabilities,strategy,rules,systemName}){
  if(rules.excludeSystems.includes(systemName)){
    return {selected:false,reason:'system explicitly excluded'};
  }
  if(capabilities.some(capability => rules.excludeCapabilities.includes(capability))){
    return {selected:false,reason:'system matches an excluded capability'};
  }

  const explicit=rules.includeSystems.includes(systemName);
  if(!explicit && candidate && candidate.engineeringLeverageScore < rules.minEngineeringLeverageScore){
    return {selected:false,reason:'engineering leverage score is below configured minimum'};
  }

  if(!explicit && rules.includeCapabilities.length){
    const matches=capabilities.some(capability => rules.includeCapabilities.includes(capability));
    if(!matches){
      return {selected:false,reason:'system does not match requested migration capabilities'};
    }
  }

  if(strategy === 'quarantine' && !rules.includeRisky){
    return {selected:false,reason:'risk-flagged system requires explicit includeRisky approval'};
  }

  return {
    selected:true,
    reason:strategy === 'quarantine'
      ? 'explicitly selected for quarantined review'
      : 'selected by migration rules'
  };
}

function planPayload(plan){
  return {
    schemaVersion:plan.schemaVersion,
    migrationVersion:plan.migrationVersion,
    catalogHash:plan.catalogHash,
    rules:plan.rules,
    summary:plan.summary,
    units:plan.units
  };
}

export function buildRobloxMigrationPlan(catalog,rawRules={}){
  const validation=verifyRobloxCapabilityCatalog(catalog);
  if(!validation.ok){
    throw new Error('invalid Roblox capability catalog: ' + validation.errors[0]);
  }

  const rules=normalizeRules(rawRules);
  const groups=groupInstances(catalog);
  const units=[];

  for(const group of groups){
    const items=[...group.instances].sort((a,b) => a.path.localeCompare(b.path));
    const root=items.reduce((best,item) => !best || item.depth < best.depth ? item : best,null);
    if(!root) continue;

    const candidate=findCandidate(catalog,group.systemName);
    const capabilities=[...new Set(items.flatMap(item => item.capabilities || []))].sort();
    const riskFlags=[...new Set(items.flatMap(item => item.script?.riskFlags || []))].sort();
    const strategy=migrationStrategy(items,candidate);
    const selection=selectUnit({
      candidate,
      capabilities,
      strategy,
      rules,
      systemName:group.systemName
    });
    const dependencies=collectDependencies(catalog,root.path,items);
    const bucket=targetBucket(capabilities,strategy);

    const blockers=[];
    if(riskFlags.length) blockers.push('risk-flags:' + riskFlags.join(','));
    if(dependencies.external.length){
      blockers.push('external-dependencies:' + dependencies.external.length);
    }
    if(strategy === 'refactor'){
      blockers.push('logic-refactor-required');
    }

    const unitId=[
      slug(group.sourceId),
      slug(group.systemName),
      stableHash({sourceId:group.sourceId,rootPath:root.path}).split(':')[1]
    ].join('-');

    units.push({
      unitId,
      sourceId:group.sourceId,
      sourceFile:group.sourceFile,
      systemName:group.systemName,
      rootPath:root.path,
      capabilities,
      engineeringLeverageScore:candidate?.engineeringLeverageScore ?? 0,
      migrationStrategy:strategy,
      exportDisposition:strategy === 'extract' || strategy === 'asset-only'
        ? 'staging'
        : 'quarantine',
      suggestedTarget:'ServerStorage/StarBloxMigration/' + bucket + '/' + slug(group.systemName),
      selected:selection.selected,
      selectionReason:selection.reason,
      blockers,
      riskFlags,
      stats:{
        instances:items.length,
        scripts:items.filter(item => item.script).length,
        remotes:items.filter(item =>
          ['RemoteEvent','RemoteFunction','UnreliableRemoteEvent'].includes(item.className)
        ).length,
        assets:dependencies.assetIds.length
      },
      dependencies
    });
  }

  units.sort((a,b) =>
    Number(b.selected) - Number(a.selected) ||
    b.engineeringLeverageScore - a.engineeringLeverageScore ||
    a.unitId.localeCompare(b.unitId)
  );

  const selected=units.filter(unit => unit.selected);
  const base={
    schemaVersion:ROBLOX_MIGRATION_SCHEMA_VERSION,
    migrationVersion:ROBLOX_MIGRATION_VERSION,
    catalogHash:catalog.catalogHash,
    rules,
    summary:{
      totalUnits:units.length,
      selectedUnits:selected.length,
      stagingUnits:selected.filter(unit => unit.exportDisposition === 'staging').length,
      quarantineUnits:selected.filter(unit => unit.exportDisposition === 'quarantine').length,
      externalDependencyCount:selected.reduce((sum,unit) => sum + unit.dependencies.external.length,0),
      blockerCount:selected.reduce((sum,unit) => sum + unit.blockers.length,0)
    },
    units
  };

  const hash=stableHash(planPayload(base));
  return deepFreeze({
    ...base,
    planId:'roblox-migration-' + hash.split(':')[1],
    planHash:hash
  });
}

export function verifyRobloxMigrationPlan(plan){
  const errors=[];
  if(!plan || typeof plan !== 'object' || Array.isArray(plan)){
    return {ok:false,errors:['plan must be an object']};
  }
  if(plan.schemaVersion !== ROBLOX_MIGRATION_SCHEMA_VERSION){
    errors.push('unsupported migration schemaVersion');
  }
  if(plan.migrationVersion !== ROBLOX_MIGRATION_VERSION){
    errors.push('unsupported migrationVersion');
  }
  if(!Array.isArray(plan.units)) errors.push('units must be an array');
  try{
    const expected=stableHash(planPayload(plan));
    if(expected !== plan.planHash) errors.push('migration plan hash mismatch');
    const expectedId='roblox-migration-' + expected.split(':')[1];
    if(expectedId !== plan.planId) errors.push('migration plan ID mismatch');
  }catch{
    errors.push('migration plan is not hashable');
  }
  return {ok:errors.length === 0,errors};
}
