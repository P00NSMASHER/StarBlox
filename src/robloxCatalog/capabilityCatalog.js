
import { stableHash } from '../domainSchemas.js';

export const ROBLOX_CATALOG_SCHEMA_VERSION=2;
export const ROBLOX_CATALOG_VERSION='starblox-roblox-catalog-v2';
const LEGACY_ROBLOX_CATALOG_SCHEMA_VERSION=1;
const LEGACY_ROBLOX_CATALOG_VERSION='starblox-roblox-catalog-v1';

const SCRIPT_CLASSES=new Set(['Script','LocalScript','ModuleScript']);
const REMOTE_CLASSES=new Set(['RemoteEvent','RemoteFunction','UnreliableRemoteEvent']);
const UI_CLASSES=new Set([
  'ScreenGui','SurfaceGui','BillboardGui','Frame','ScrollingFrame','TextLabel',
  'TextButton','TextBox','ImageLabel','ImageButton','ViewportFrame','CanvasGroup'
]);
const PHYSICAL_CLASSES=new Set([
  'Part','MeshPart','UnionOperation','TrussPart','WedgePart','CornerWedgePart',
  'Model','Folder','Terrain','Attachment','Constraint','Motor6D','Weld','WeldConstraint'
]);
const ASSET_CLASSES=new Set([
  'Decal','Texture','Sound','Animation','MeshPart','SpecialMesh','ParticleEmitter',
  'Beam','Trail','Sky','SurfaceAppearance'
]);
const DIRECT_REUSE_CLASSES=new Set([
  'VehicleSeat','Seat','Tool','Humanoid','AnimationController','Camera','Configuration'
]);

const CAPABILITY_NAMES=Object.freeze([
  'housing','vehicles','ui','npc','quests','social','economy','monetization',
  'persistence','networking','placement','combat','tools','audio','animation',
  'camera','teleport','admin','security','world','effects'
]);

const NAME_RULES=[
  ['housing',/(house|home|apartment|furniture|garage|door|room|bed|sofa|kitchen)/i],
  ['vehicles',/(vehicle|car|truck|bike|motorcycle|helicopter|plane|boat|chassis|wheel|garage|\bsuv\b|\bsedan\b|\bvan\b|\bbus\b|\btaxi\b|\bambulance\b|\bscooter\b|\batv\b|\blimo\b)/i],
  ['npc',/(npc|citizen|resident|vendor|shopkeeper|character|pedestrian|follower)/i],
  ['quests',/(quest|mission|objective|task|dialog|dialogue|story)/i],
  ['social',/(friend|party|social|emote|photo|follow|invite)/i],
  ['economy',/(cash|coin|currency|money|economy|shop|store|inventory|reward)/i],
  ['placement',/(placement|build|decorate|furniture|plot|construction)/i],
  ['combat',/(combat|weapon|gun|sword|damage|projectile|health|hitbox)/i],
  ['admin',/(admin|moderation|moderator|command|ban|kick)/i],
  ['security',/(anticheat|anti-cheat|validation|rate.?limit|exploit|security)/i],
  ['teleport',/(teleport|travel|portal|destination)/i],
  ['world',/(world|district|city|road|traffic|terrain|map|environment)/i],
  ['effects',/(effect|particle|vfx|trail|beam)/i]
];

const SCRIPT_RULES=[
  ['housing',/(house|home|apartment|furniture|garage|door|room)/i],
  ['vehicles',/(VehicleSeat|vehicle|chassis|wheel|car|motorcycle|helicopter|\bsuv\b|\bsedan\b|\bvan\b|\bbus\b|\btaxi\b|\bambulance\b|\bscooter\b|\batv\b|\blimo\b)/i],
  ['npc',/(Humanoid|npc|dialog|pathfinding|PathfindingService|follower)/i],
  ['quests',/(quest|mission|objective|dialog|reward|checkpoint)/i],
  ['social',/(friend|party|invite|emote|photo|follower)/i],
  ['economy',/(leaderstats|currency|coins?|cash|inventory|reward|shop)/i],
  ['monetization',/(MarketplaceService|PromptProductPurchase|PromptGamePassPurchase|DeveloperProduct|GamePass)/i],
  ['persistence',/(DataStoreService|UpdateAsync|GetAsync|SetAsync|ProfileStore|ProfileService)/i],
  ['networking',/(RemoteEvent|RemoteFunction|FireServer|FireClient|FireAllClients|InvokeServer|InvokeClient|UnreliableRemoteEvent)/i],
  ['placement',/(placement|raycast|build|grid|furniture|plot)/i],
  ['combat',/(damage|weapon|projectile|hitbox|raycast|health|Humanoid:TakeDamage)/i],
  ['tools',/(Tool|Backpack|Activated|Equipped|Unequipped)/i],
  ['audio',/(SoundService|SoundId|:Play\(|PlayLocalSound)/i],
  ['animation',/(Animator|AnimationId|LoadAnimation)/i],
  ['camera',/(CurrentCamera|CameraType|CameraSubject|workspace\.Camera)/i],
  ['teleport',/(TeleportService|TeleportAsync|TeleportToPlaceInstance)/i],
  ['admin',/(admin|moderation|:Kick\(|ban|command)/i],
  ['security',/(rate.?limit|anticheat|anti.?cheat|validate|saniti[sz]e|server.?authoritative)/i],
  ['world',/(Terrain|Workspace|CollectionService|StreamingEnabled|road|traffic|district)/i],
  ['effects',/(ParticleEmitter|Trail|Beam|TweenService|Lighting)/i]
];

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function text(value){
  return typeof value === 'string' ? value : '';
}

function normalizeVariant(value){
  if(value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'){
    return value;
  }
  if(Array.isArray(value)) return value.map(normalizeVariant);
  if(typeof value === 'object'){
    const entries=Object.entries(value);
    if(entries.length === 1){
      const [key,child]=entries[0];
      if([
        'String','Content','ContentId','ProtectedString','BinaryString','SharedString',
        'Int32','Int64','Float32','Float64','Bool'
      ].includes(key)){
        return normalizeVariant(child);
      }
    }
    return Object.fromEntries(entries.map(([key,child]) => [key,normalizeVariant(child)]));
  }
  return String(value);
}

function propertyScalar(properties,name){
  if(!properties || typeof properties !== 'object') return null;
  return normalizeVariant(properties[name]);
}

function asSearchText(value){
  if(value == null) return '';
  if(typeof value === 'string') return value;
  if(typeof value === 'number' || typeof value === 'boolean') return String(value);
  try{return JSON.stringify(value);}catch{return '';}
}

function extractAssetIds(value){
  const input=asSearchText(value);
  const ids=new Set();
  const patterns=[
    /rbxassetid:\/\/(\d+)/gi,
    /(?:asset\?id=|library\/)(\d+)/gi,
    /(?:^|[^\d])(\d{6,})(?:[^\d]|$)/g
  ];
  for(const pattern of patterns){
    let match;
    while((match=pattern.exec(input))) ids.add(match[1]);
  }
  return [...ids].sort();
}

function analyzeScriptSource(source){
  const code=text(source);
  const services=[...code.matchAll(/GetService\s*\(\s*["']([^"']+)["']\s*\)/g)]
    .map(match => match[1]);
  const waits=[...code.matchAll(/WaitForChild\s*\(\s*["']([^"']+)["']/g)]
    .map(match => match[1]);
  const numericRequires=[...code.matchAll(/require\s*\(\s*(\d{5,})\s*\)/g)]
    .map(match => match[1]);
  const namedRequires=[...code.matchAll(/require\s*\(\s*([^\n\r\)]+)\)/g)]
    .map(match => match[1].trim())
    .filter(value => !/^\d+$/.test(value))
    .slice(0,100);
  const remoteCalls=[...code.matchAll(/\.(FireServer|FireClient|FireAllClients|InvokeServer|InvokeClient)\s*\(/g)]
    .map(match => match[1]);
  const risky=[];
  if(/\bloadstring\s*\(/i.test(code)) risky.push('dynamic-code');
  if(/HttpService\s*[:\.]\s*(GetAsync|PostAsync|RequestAsync)/i.test(code)) risky.push('external-http');
  if(/require\s*\(\s*\d{5,}\s*\)/i.test(code)) risky.push('external-module-require');
  if(/getfenv|setfenv|debug\./i.test(code)) risky.push('runtime-introspection');
  if(/while\s+true\s+do/i.test(code)) risky.push('unbounded-loop-review');

  const capabilities=new Set();
  for(const [capability,pattern] of SCRIPT_RULES){
    if(pattern.test(code)) capabilities.add(capability);
  }

  return {
    sourceHash:code ? stableHash(code) : null,
    sourceBytes:code.length,
    lineCount:code ? code.split(/\r?\n/).length : 0,
    services:[...new Set(services)].sort(),
    waitsFor:[...new Set(waits)].sort(),
    requireAssetIds:[...new Set(numericRequires)].sort(),
    requireExpressions:[...new Set(namedRequires)].sort(),
    remoteCalls:[...new Set(remoteCalls)].sort(),
    riskFlags:[...new Set(risky)].sort(),
    capabilities:[...capabilities].sort()
  };
}

function classCapabilities(className){
  const out=new Set();
  if(REMOTE_CLASSES.has(className)) out.add('networking');
  if(UI_CLASSES.has(className)) out.add('ui');
  if(className === 'VehicleSeat' || className === 'Seat') out.add('vehicles');
  if(className === 'Humanoid' || className === 'AnimationController') out.add('npc');
  if(className === 'Tool') out.add('tools');
  if(className === 'Sound') out.add('audio');
  if(className === 'Animation' || className === 'Animator') out.add('animation');
  if(className === 'Camera') out.add('camera');
  if(className === 'Terrain') out.add('world');
  if(['ParticleEmitter','Beam','Trail','Smoke','Fire','Sparkles'].includes(className)) out.add('effects');
  return out;
}

function nameCapabilities(name){
  const out=new Set();
  for(const [capability,pattern] of NAME_RULES){
    if(pattern.test(name)) out.add(capability);
  }
  return out;
}

function scriptSourceFromProperties(properties){
  const value=propertyScalar(properties,'Source');
  return typeof value === 'string' ? value : '';
}

function classifyReuse(instance,script){
  const reviewRequired=Boolean(script?.riskFlags?.length);
  if(SCRIPT_CLASSES.has(instance.className)){
    return {
      class:'reusable-after-refactor',
      reviewRequired,
      reason:reviewRequired
        ? 'scripted behavior is potentially reusable after refactor and requires security/provenance review'
        : 'scripted behavior should be adapted behind StarBlox server/client boundaries and tests'
    };
  }
  if(REMOTE_CLASSES.has(instance.className)){
    return {
      class:'reusable-after-refactor',
      reviewRequired,
      reason:'remote contract may be reusable after refactor into StarBlox authoritative networking'
    };
  }
  if(ASSET_CLASSES.has(instance.className)){
    return {
      class:'asset-only',
      reviewRequired:false,
      reason:'visual/audio asset is reusable independently of behavior'
    };
  }
  if(UI_CLASSES.has(instance.className) || PHYSICAL_CLASSES.has(instance.className) ||
     DIRECT_REUSE_CLASSES.has(instance.className) || (instance.capabilities || []).length){
    return {
      class:'directly-reusable',
      reviewRequired:false,
      reason:'structure/component can be migrated directly subject to system-level dependency checks'
    };
  }
  return {
    class:'irrelevant',
    reviewRequired:false,
    reason:'no standalone StarBlox migration value was identified for this instance'
  };
}
function flattenDom(source){
  const records=[];

  function walk(node,parentPath,depth,rootCandidate){
    if(!node || typeof node !== 'object') return;
    const className=text(node.class || node.className) || 'Unknown';
    const name=text(node.name) || className;
    const path=parentPath ? parentPath + '/' + name : name;
    const properties=node.properties && typeof node.properties === 'object'
      ? node.properties
      : {};
    const sourceCode=SCRIPT_CLASSES.has(className) ? scriptSourceFromProperties(properties) : '';
    const script=SCRIPT_CLASSES.has(className) ? analyzeScriptSource(sourceCode) : null;

    const capabilities=new Set([
      ...classCapabilities(className),
      ...nameCapabilities(name),
      ...(script?.capabilities || [])
    ]);

    const assetIds=new Set();
    for(const value of Object.values(properties)){
      for(const id of extractAssetIds(normalizeVariant(value))) assetIds.add(id);
    }
    for(const id of script?.requireAssetIds || []) assetIds.add(id);

    const record={
      sourceId:source.sourceId,
      sourceFile:source.file,
      referent:text(node.referent) || null,
      path,
      parentPath:parentPath || null,
      depth,
      rootCandidate,
      className,
      name,
      propertyNames:Object.keys(properties).sort(),
      capabilities:[...capabilities].sort(),
      assetIds:[...assetIds].sort(),
      script,
      reuse:null
    };
    record.reuse=classifyReuse(record,script);
    records.push(record);

    const children=Array.isArray(node.children) ? node.children : [];
    for(const child of children){
      const childRoot=rootCandidate || (depth === 0 ? (text(child?.name) || text(child?.class) || 'Root') : null);
      walk(child,path,depth + 1,childRoot);
    }
  }

  walk(source.dom,'',0,null);
  return records;
}

function summarizeCapabilities(records){
  const result={};
  for(const capability of CAPABILITY_NAMES){
    const refs=records
      .filter(record => record.capabilities.includes(capability))
      .map(record => record.path)
      .sort();
    if(refs.length){
      result[capability]={
        count:refs.length,
        examples:refs.slice(0,20)
      };
    }
  }
  return result;
}

function summarizeClasses(records){
  const counts={};
  for(const record of records){
    counts[record.className]=(counts[record.className] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  );
}

function summarizeAssets(records){
  const byId=new Map();
  for(const record of records){
    for(const assetId of record.assetIds){
      if(!byId.has(assetId)) byId.set(assetId,new Set());
      byId.get(assetId).add(record.path);
    }
  }
  return [...byId.entries()]
    .map(([assetId,paths]) => ({
      assetId,
      references:paths.size,
      examples:[...paths].sort().slice(0,10)
    }))
    .sort((a,b) => b.references - a.references || a.assetId.localeCompare(b.assetId));
}

function buildDependencies(records){
  const edges=[];
  const remoteNames=new Set(
    records.filter(record => REMOTE_CLASSES.has(record.className)).map(record => record.name)
  );

  for(const record of records){
    if(!record.script) continue;
    for(const service of record.script.services){
      edges.push({from:record.path,type:'service',to:service});
    }
    for(const id of record.script.requireAssetIds){
      edges.push({from:record.path,type:'require-asset',to:id});
    }
    for(const name of record.script.waitsFor){
      edges.push({
        from:record.path,
        type:remoteNames.has(name) ? 'remote-reference' : 'instance-reference',
        to:name
      });
    }
  }

  return edges.sort((a,b) =>
    a.from.localeCompare(b.from) ||
    a.type.localeCompare(b.type) ||
    a.to.localeCompare(b.to)
  );
}

function buildSystemCandidates(records){
  const groups=new Map();
  for(const record of records){
    const key=record.rootCandidate || record.path.split('/')[1] || record.path;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(record);
  }

  return [...groups.entries()].map(([name,items]) => {
    const capabilities=[...new Set(items.flatMap(item => item.capabilities))].sort();
    const riskFlags=[...new Set(items.flatMap(item => item.script?.riskFlags || []))].sort();
    const assetIds=[...new Set(items.flatMap(item => item.assetIds))].sort();
    const scripts=items.filter(item => SCRIPT_CLASSES.has(item.className));
    const remotes=items.filter(item => REMOTE_CLASSES.has(item.className));
    const reuseCounts=items.reduce((acc,item) => {
      acc[item.reuse.class]=(acc[item.reuse.class] || 0) + 1;
      return acc;
    },{});

    let recommendation='directly-reusable';
    if(scripts.length || remotes.length) recommendation='reusable-after-refactor';
    else if(items.every(item => item.reuse.class === 'irrelevant')) recommendation='irrelevant';
    else if(
      items.some(item => item.reuse.class === 'asset-only') &&
      items.every(item => ['asset-only','irrelevant'].includes(item.reuse.class))
    ) recommendation='asset-only';

    const score=Math.min(
      10,
      2 +
      Math.min(2,Math.log2(items.length + 1) / 2) +
      Math.min(2.5,capabilities.length * 0.45) +
      Math.min(2,scripts.length * 0.35) +
      Math.min(1.5,assetIds.length * 0.08)
    );

    return {
      name,
      instanceCount:items.length,
      scriptCount:scripts.length,
      remoteCount:remotes.length,
      assetCount:assetIds.length,
      capabilities,
      riskFlags,
      reuseCounts,
      reuseRecommendation:recommendation,
      reviewRequired:riskFlags.length > 0,
      engineeringLeverageScore:Math.round(score * 10) / 10
    };
  }).sort((a,b) =>
    b.engineeringLeverageScore - a.engineeringLeverageScore ||
    b.scriptCount - a.scriptCount ||
    a.name.localeCompare(b.name)
  );
}

function compactInventoryRecord(record){
  return {
    sourceId:record.sourceId,
    sourceFile:record.sourceFile,
    path:record.path,
    parentPath:record.parentPath,
    className:record.className,
    name:record.name,
    capabilities:[...(record.capabilities || [])],
    assetIds:[...(record.assetIds || [])],
    reuse:{...record.reuse},
    ...(record.script ? {
      script:{
        sourceHash:record.script.sourceHash,
        sourceBytes:record.script.sourceBytes,
        lineCount:record.script.lineCount,
        services:[...record.script.services],
        waitsFor:[...record.script.waitsFor],
        requireAssetIds:[...record.script.requireAssetIds],
        requireExpressions:[...record.script.requireExpressions],
        remoteCalls:[...record.script.remoteCalls],
        riskFlags:[...record.script.riskFlags]
      }
    } : {})
  };
}

function buildInventory(records){
  const byPath=new Map(records.map(record => [record.path,record]));
  const pick=predicate => records.filter(predicate).map(compactInventoryRecord);
  const uiRoots=records.filter(record => {
    if(!UI_CLASSES.has(record.className)) return false;
    const parent=record.parentPath ? byPath.get(record.parentPath) : null;
    return !parent || !UI_CLASSES.has(parent.className);
  }).map(root => ({
    ...compactInventoryRecord(root),
    descendantCount:records.filter(item => item.path.startsWith(root.path + '/')).length
  }));

  return {
    scripts:pick(record => SCRIPT_CLASSES.has(record.className)),
    remotes:pick(record => REMOTE_CLASSES.has(record.className)),
    uiTrees:uiRoots,
    models:pick(record => record.className === 'Model'),
    vehicles:pick(record =>
      record.capabilities.includes('vehicles') &&
      ['Model','VehicleSeat','Seat'].includes(record.className)
    ),
    houses:pick(record =>
      record.capabilities.includes('housing') &&
      ['Model','Folder'].includes(record.className)
    ),
    tools:pick(record => record.className === 'Tool'),
    animations:pick(record => record.className === 'Animation'),
    sounds:pick(record => record.className === 'Sound')
  };
}
function catalogPayload(catalog){
  const payload={
    schemaVersion:catalog.schemaVersion,
    catalogVersion:catalog.catalogVersion,
    generatedFrom:catalog.generatedFrom,
    summary:catalog.summary,
    classCounts:catalog.classCounts,
    capabilities:catalog.capabilities,
    assets:catalog.assets,
    dependencies:catalog.dependencies,
    systemCandidates:catalog.systemCandidates,
    instances:catalog.instances
  };
  if(catalog.schemaVersion >= 2) payload.inventory=catalog.inventory;
  return payload;
}

export function buildRobloxCapabilityCatalog(sources){
  if(!Array.isArray(sources) || !sources.length){
    throw new TypeError('sources must be a non-empty array.');
  }

  const normalized=sources.map((source,index) => {
    if(!source || typeof source !== 'object') throw new TypeError('source ' + index + ' must be an object.');
    if(typeof source.sourceId !== 'string' || !source.sourceId.trim()) throw new TypeError('sourceId is required.');
    if(typeof source.file !== 'string' || !source.file.trim()) throw new TypeError('source file is required.');
    if(!source.dom || typeof source.dom !== 'object') throw new TypeError('source DOM is required.');
    return {
      sourceId:source.sourceId.trim(),
      file:source.file.trim(),
      dom:source.dom
    };
  }).sort((a,b) => a.sourceId.localeCompare(b.sourceId) || a.file.localeCompare(b.file));

  const instances=normalized
    .flatMap(flattenDom)
    .sort((a,b) => a.sourceId.localeCompare(b.sourceId) || a.path.localeCompare(b.path));

  const capabilities=summarizeCapabilities(instances);
  const assets=summarizeAssets(instances);
  const dependencies=buildDependencies(instances);
  const systemCandidates=buildSystemCandidates(instances);
  const inventory=buildInventory(instances);
  const scripts=instances.filter(record => record.script);
  const remotes=instances.filter(record => REMOTE_CLASSES.has(record.className));
  const riskFlags=[...new Set(instances.flatMap(record => record.script?.riskFlags || []))].sort();

  const base={
    schemaVersion:ROBLOX_CATALOG_SCHEMA_VERSION,
    catalogVersion:ROBLOX_CATALOG_VERSION,
    generatedFrom:normalized.map(source => ({
      sourceId:source.sourceId,
      file:source.file
    })),
    summary:{
      sourceCount:normalized.length,
      instanceCount:instances.length,
      scriptCount:scripts.length,
      remoteCount:remotes.length,
      assetIdCount:assets.length,
      capabilityCount:Object.keys(capabilities).length,
      systemCandidateCount:systemCandidates.length,
      inventoryCounts:Object.fromEntries(
        Object.entries(inventory).map(([key,value]) => [key,value.length])
      ),
      riskFlags
    },
    classCounts:summarizeClasses(instances),
    capabilities,
    assets,
    dependencies,
    systemCandidates,
    inventory,
    instances
  };

  return deepFreeze({
    ...base,
    catalogHash:stableHash(catalogPayload(base))
  });
}

export function verifyRobloxCapabilityCatalog(catalog){
  const errors=[];
  if(!catalog || typeof catalog !== 'object' || Array.isArray(catalog)){
    return {ok:false,errors:['catalog must be an object']};
  }
  const current=
    catalog.schemaVersion === ROBLOX_CATALOG_SCHEMA_VERSION &&
    catalog.catalogVersion === ROBLOX_CATALOG_VERSION;
  const legacy=
    catalog.schemaVersion === LEGACY_ROBLOX_CATALOG_SCHEMA_VERSION &&
    catalog.catalogVersion === LEGACY_ROBLOX_CATALOG_VERSION;
  if(!current && !legacy){
    errors.push('unsupported catalog schema/version');
  }
  if(!Array.isArray(catalog.instances)) errors.push('instances must be an array');
  if(!Array.isArray(catalog.systemCandidates)) errors.push('systemCandidates must be an array');
  if(current){
    if(!catalog.inventory || typeof catalog.inventory !== 'object' || Array.isArray(catalog.inventory)){
      errors.push('inventory must be an object');
    }else{
      for(const key of ['scripts','remotes','uiTrees','models','vehicles','houses','tools','animations','sounds']){
        if(!Array.isArray(catalog.inventory[key])) errors.push('inventory.' + key + ' must be an array');
      }
    }
    for(const record of catalog.instances || []){
      if(!['directly-reusable','reusable-after-refactor','asset-only','irrelevant'].includes(record?.reuse?.class)){
        errors.push('unsupported reuse class at ' + String(record?.path || 'unknown'));
        break;
      }
    }
  }
  try{
    const expected=stableHash(catalogPayload(catalog));
    if(expected !== catalog.catalogHash) errors.push('catalog hash mismatch');
  }catch{
    errors.push('catalog is not hashable');
  }
  return {ok:errors.length === 0,errors};
}
