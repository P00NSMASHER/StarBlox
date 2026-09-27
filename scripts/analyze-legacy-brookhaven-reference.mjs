import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

function arg(name,def=null){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : def;
}
function sha256(value){
  return createHash('sha256').update(value).digest('hex');
}
function cls(node){ return String(node?.class ?? node?.className ?? 'Unknown'); }
function name(node){ return String(node?.name ?? cls(node)); }
function kids(node){ return Array.isArray(node?.children) ? node.children : []; }
function walk(node,path=[],rows=[]){
  if(!node || typeof node!=='object') return rows;
  const n=name(node), next=[...path,n];
  rows.push({node,path:next});
  for(const child of kids(node)) walk(child,next,rows);
  return rows;
}
function findNamed(root,target){
  const matches=walk(root).filter(row=>name(row.node)===target);
  if(matches.length===0) return null;
  return matches[0].node;
}
function sortedObject(map){
  return Object.fromEntries(
    [...map.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))
  );
}
function canonicalTopology(node){
  return {
    className:cls(node),
    name:name(node),
    children:kids(node)
      .map(canonicalTopology)
      .sort((a,b)=>a.name.localeCompare(b.name)||a.className.localeCompare(b.className))
  };
}
function assetIdsFrom(value,set){
  if(value===null || value===undefined) return;
  if(typeof value==='string'){
    for(const match of value.matchAll(/(?:rbxassetid:\/\/|id=)(\d{3,})/gi)) set.add(match[1]);
    return;
  }
  if(Array.isArray(value)){ for(const item of value) assetIdsFrom(item,set); return; }
  if(typeof value==='object'){ for(const v of Object.values(value)) assetIdsFrom(v,set); }
}
const GEOMETRY=new Set([
  'Part','MeshPart','WedgePart','CornerWedgePart','UnionOperation',
  'TrussPart','Seat','VehicleSeat'
]);
const SCRIPT_REMOTE=new Set([
  'Script','LocalScript','ModuleScript','RemoteEvent','RemoteFunction','UnreliableRemoteEvent'
]);
const KEYWORDS=Object.freeze({
  door:/door/i,
  garage:/garage/i,
  light:/light|lamp/i,
  house:/house|home/i,
  vehicle:/vehicle|car|truck|bike|scooter|van|bus/i,
  road:/road|street|highway/i,
  spawn:/spawn|town.?center|plaza/i,
  lot:/lot|plot/i,
  school:/school|classroom/i,
  shop:/shop|store|market/i
});
function profileTree(node){
  const rows=walk(node);
  const classCounts=new Map(), signatureCounts=new Map();
  const assets=new Set();
  const candidates=Object.fromEntries(Object.keys(KEYWORDS).map(k=>[k,[]]));
  let geometryCount=0,scriptRemoteCount=0,seatCount=0,vehicleSeatCount=0;
  let decalCount=0,specialMeshCount=0;
  for(const row of rows){
    const c=cls(row.node), n=name(row.node);
    classCounts.set(c,(classCounts.get(c)||0)+1);
    const sig=c+'\u0000'+n;
    signatureCounts.set(sig,(signatureCounts.get(sig)||0)+1);
    if(GEOMETRY.has(c)) geometryCount++;
    if(SCRIPT_REMOTE.has(c)) scriptRemoteCount++;
    if(c==='Seat') seatCount++;
    if(c==='VehicleSeat') vehicleSeatCount++;
    if(c==='Decal') decalCount++;
    if(c==='SpecialMesh') specialMeshCount++;
    assetIdsFrom(row.node?.properties,assets);
    const pathText=row.path.join('/');
    for(const [key,re] of Object.entries(KEYWORDS)){
      if(re.test(n) || re.test(pathText)){
        if(candidates[key].length<200) candidates[key].push(pathText);
      }
    }
  }
  return {
    root:{className:cls(node),name:name(node)},
    instanceCount:rows.length,
    geometryCount,
    scriptRemoteCount,
    seatCount,
    vehicleSeatCount,
    decalCount,
    specialMeshCount,
    classCounts:sortedObject(classCounts),
    uniqueAssetIds:[...assets].sort((a,b)=>a.length-b.length||a.localeCompare(b)),
    uniqueAssetIdCount:assets.size,
    topologySha256:sha256(Buffer.from(JSON.stringify(canonicalTopology(node)),'utf8')),
    topLevelChildren:kids(node).map(child=>({className:cls(child),name:name(child)})),
    interactionCandidates:Object.fromEntries(
      Object.entries(candidates).map(([key,paths])=>[key,{count:paths.length,paths}])
    ),
    signatureCounts:Object.fromEntries([...signatureCounts.entries()].sort((a,b)=>a[0].localeCompare(b[0])))
  };
}
function deltaMap(reference,candidate){
  const keys=[...new Set([...Object.keys(reference),...Object.keys(candidate)])].sort();
  return Object.fromEntries(keys.map(k=>[k,Number(candidate[k]||0)-Number(reference[k]||0)]));
}
function compareSignatures(reference,candidate){
  const ref=reference.signatureCounts, cand=candidate.signatureCounts;
  const keys=[...new Set([...Object.keys(ref),...Object.keys(cand)])];
  let matching=0;
  const missing=[],extra=[];
  for(const key of keys){
    const r=Number(ref[key]||0), c=Number(cand[key]||0);
    matching+=Math.min(r,c);
    if(r>c) missing.push({signature:key.replace('\u0000',' :: '),count:r-c});
    if(c>r) extra.push({signature:key.replace('\u0000',' :: '),count:c-r});
  }
  missing.sort((a,b)=>b.count-a.count||a.signature.localeCompare(b.signature));
  extra.sort((a,b)=>b.count-a.count||a.signature.localeCompare(b.signature));
  return {matchingInstanceSignatures:matching,missingFromStarBlox:missing.slice(0,250),extraInStarBlox:extra.slice(0,250)};
}
function interactionDelta(reference,candidate){
  return Object.fromEntries(Object.keys(KEYWORDS).map(key=>{
    const r=reference.interactionCandidates[key]?.count||0;
    const c=candidate.interactionCandidates[key]?.count||0;
    return [key,{legacy:r,starblox:c,delta:c-r}];
  }));
}
function pct(n,d){ return d===0 ? 1 : Math.max(0,Math.min(1,n/d)); }

const legacyDomPath=resolve(arg('--legacy-dom'));
const starbloxDomPath=resolve(arg('--starblox-dom'));
const acquisitionPath=resolve(arg('--acquisition'));
const profilePath=resolve(arg('--profile','docs/roblox-world/LEGACY_BROOKHAVEN_PROFILE.json'));
const diffPath=resolve(arg('--diff','docs/roblox-world/LEGACY_VS_STARBLOX_WORLD_DIFF.json'));
const planPath=resolve(arg('--plan','docs/roblox-world/LEGACY_BROOKHAVEN_7B_WORKPLAN.json'));
const readinessPath=resolve(arg('--readiness','docs/BROOKHAVEN_PARITY_READINESS.json'));

if(!legacyDomPath || !starbloxDomPath || !acquisitionPath){
  throw new Error('--legacy-dom, --starblox-dom, and --acquisition are required');
}

const [legacyDom,starbloxDom,acquisition,readiness]=await Promise.all([
  readFile(legacyDomPath,'utf8').then(JSON.parse),
  readFile(starbloxDomPath,'utf8').then(JSON.parse),
  readFile(acquisitionPath,'utf8').then(JSON.parse),
  readFile(readinessPath,'utf8').then(JSON.parse)
]);

const legacyWorkspace=findNamed(legacyDom,'Workspace') || legacyDom;
const starbloxWorld=findNamed(starbloxDom,'BrookhavenWorldBaseline') || starbloxDom;
const legacyProfile=profileTree(legacyWorkspace);
const starbloxProfile=profileTree(starbloxWorld);

const profile={
  schemaVersion:1,
  status:'legacy-reference-profiled',
  classification:'legacy_reference_source',
  source:acquisition.source,
  selection:{
    legacySubtree:legacyWorkspace===legacyDom?'document-root-fallback':'Workspace',
    starbloxSubtree:starbloxWorld===starbloxDom?'document-root-fallback':'BrookhavenWorldBaseline'
  },
  legacy:legacyProfile,
  starblox:starbloxProfile,
  boundaries:{
    currentLiveParityVerified:false,
    exactParityClaimAllowed:false,
    productionActivationAllowed:false
  }
};

const classCountDelta=deltaMap(legacyProfile.classCounts,starbloxProfile.classCounts);
const interactions=interactionDelta(legacyProfile,starbloxProfile);
const signatures=compareSignatures(legacyProfile,starbloxProfile);
const geometryCoverage=pct(
  Math.min(legacyProfile.geometryCount,starbloxProfile.geometryCount),
  legacyProfile.geometryCount
);
const assetCoverage=pct(
  Math.min(legacyProfile.uniqueAssetIdCount,starbloxProfile.uniqueAssetIdCount),
  legacyProfile.uniqueAssetIdCount
);

const diff={
  schemaVersion:1,
  status:'legacy-vs-starblox-compared',
  source:acquisition.source,
  comparison:{
    legacyTopologySha256:legacyProfile.topologySha256,
    starbloxTopologySha256:starbloxProfile.topologySha256,
    topologyIdentical:legacyProfile.topologySha256===starbloxProfile.topologySha256,
    instanceCountDelta:starbloxProfile.instanceCount-legacyProfile.instanceCount,
    geometryCountDelta:starbloxProfile.geometryCount-legacyProfile.geometryCount,
    scriptRemoteCountDelta:starbloxProfile.scriptRemoteCount-legacyProfile.scriptRemoteCount,
    seatCountDelta:starbloxProfile.seatCount-legacyProfile.seatCount,
    vehicleSeatCountDelta:starbloxProfile.vehicleSeatCount-legacyProfile.vehicleSeatCount,
    uniqueAssetIdCountDelta:starbloxProfile.uniqueAssetIdCount-legacyProfile.uniqueAssetIdCount,
    geometryCoverage,
    assetCoverage,
    classCountDelta,
    interactions,
    signatures
  },
  interpretation:{
    use:'development-gap-discovery-only',
    currentLiveParityVerified:false,
    exactParityClaimAllowed:false
  }
};

const catalog=readiness.catalog||{};
const interactionReadiness=readiness.interactions||{};
const priorities=[];
function add(priority,area,reason,metrics,nextAction){
  priorities.push({priority,area,reason,metrics,nextAction});
}
if(starbloxProfile.geometryCount<legacyProfile.geometryCount){
  add('P0','world-geometry','StarBlox contains fewer geometry instances than the legacy Brookhaven workspace.',
    {legacy:legacyProfile.geometryCount,starblox:starbloxProfile.geometryCount,coverage:geometryCoverage},
    'Reconstruct highest-impact missing world geometry in isolated development batches and re-run the structural diff.');
}
if((interactions.spawn?.legacy||0)>(interactions.spawn?.starblox||0)){
  add('P0','spawn-town-center','Legacy source exposes more spawn/town-center named structure than StarBlox.',
    interactions.spawn,
    'Use the legacy spawn/town-center structure as a development reference for StarBlox spawn placement and first-view composition.');
}
for(const key of ['door','garage','light','house','vehicle','lot','road']){
  const row=interactions[key];
  if(row && row.delta<0){
    add(key==='door'||key==='garage'||key==='light'?'P1':'P2',
      'interaction-'+key,
      'Legacy source contains more named '+key+' candidates than StarBlox.',
      row,
      'Review legacy '+key+' candidates as development evidence; implement only source-bound, tested StarBlox equivalents.');
  }
}
const vehicleTarget=Number(catalog.vehicles?.target||0), vehicleRuntime=Number(catalog.vehicles?.runtimePlayable||0);
const inventoryTarget=Number(catalog.inventory?.target||0), inventoryRuntime=Number(catalog.inventory?.runtimeItems||0);
const houseTarget=Number(catalog.houses?.target||0);
if(vehicleTarget>vehicleRuntime){
  add('P1','vehicle-catalog','Vehicle catalog breadth is still below the tracked Brookhaven target.',
    {target:vehicleTarget,runtimePlayable:vehicleRuntime,remaining:vehicleTarget-vehicleRuntime},
    'Use legacy vehicle structures plus verified factual metadata to prioritize original StarBlox implementations; preserve entitlement gates.');
}
if(inventoryTarget>inventoryRuntime){
  add('P1','inventory-catalog','Inventory breadth is still below the tracked Brookhaven target.',
    {target:inventoryTarget,runtimeItems:inventoryRuntime,remaining:inventoryTarget-inventoryRuntime},
    'Map legacy tool/item structures to original StarBlox runtime implementations and contextual learning economy.');
}
if(houseTarget>0){
  add('P1','house-catalog','House parity breadth remains incomplete.',
    {target:houseTarget,parityCatalogComplete:Boolean(catalog.houses?.parityCatalogComplete)},
    'Use legacy lot/house structure to stage house-selection and lot-placement parity work without claiming 2026 catalog freshness.');
}
for(const [nameKey,countKey] of [['door','pendingStrictDoors'],['garage','pendingGarageDoors'],['light','pendingLights']]){
  const pending=Number(interactionReadiness[countKey]||0);
  if(pending>0){
    add('P1','pending-'+nameKey+'-review','Existing StarBlox readiness still reports unresolved '+nameKey+' candidates.',
      {pending},
      'Use legacy geometry/behavior as development evidence, then promote only after rendered and behavior review receipts.');
  }
}

const plan={
  schemaVersion:1,
  status:'legacy-reference-7b-development-plan-generated',
  source:acquisition.source,
  summary:{
    priorities:priorities.length,
    p0:priorities.filter(x=>x.priority==='P0').length,
    p1:priorities.filter(x=>x.priority==='P1').length,
    p2:priorities.filter(x=>x.priority==='P2').length
  },
  priorities,
  measuredBaseline:{
    legacy:{
      instances:legacyProfile.instanceCount,
      geometry:legacyProfile.geometryCount,
      assets:legacyProfile.uniqueAssetIdCount
    },
    starblox:{
      instances:starbloxProfile.instanceCount,
      geometry:starbloxProfile.geometryCount,
      assets:starbloxProfile.uniqueAssetIdCount
    }
  },
  releaseBoundary:{
    developmentMayUseLegacyReference:true,
    currentLiveCertificationSatisfied:false,
    exactParityClaimAllowed:false,
    productionActivationAllowed:false
  },
  nextAction:'execute P0/P1 development batches, then re-run this pipeline and final mobile QA'
};

for(const [path,value] of [[profilePath,profile],[diffPath,diff],[planPath,plan]]){
  await mkdir(dirname(path),{recursive:true});
  await writeFile(path,JSON.stringify(value,null,2)+'\n');
}
process.stdout.write(JSON.stringify({
  status:'legacy-reference-analysis-complete',
  sourceSha256:acquisition.source.sha256,
  legacyInstances:legacyProfile.instanceCount,
  starbloxInstances:starbloxProfile.instanceCount,
  priorities:plan.summary
},null,2)+'\n');
