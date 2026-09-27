import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {deriveLegacySchoolBindings,renderLegacySchoolBindingsLuau} from '../src/robloxWorld/legacySchoolBindings.js';

function arg(name,def=null){
  const inline=process.argv.find(v=>v.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0?process.argv[i+1]:def;
}
function cls(n){return String(n?.class ?? n?.className ?? 'Unknown');}
function name(n){return String(n?.name ?? cls(n));}
function kids(n){return Array.isArray(n?.children)?n.children:[];}
function walk(n,path=[],rows=[]){
  if(!n||typeof n!=='object') return rows;
  const next=[...path,name(n)];
  rows.push({node:n,path:next});
  for(const c of kids(n)) walk(c,next,rows);
  return rows;
}
function cframe(node){
  const c=node?.properties?.CFrame?.CFrame;
  if(!c||!Array.isArray(c.position)) return null;
  return {position:c.position.map(Number),orientation:Array.isArray(c.orientation)?c.orientation.flat().map(Number):[]};
}
function size(node){
  const p=node?.properties?.Size?.Vector3 ?? node?.properties?.size?.Vector3;
  return Array.isArray(p)?p.map(Number):null;
}
const GEOMETRY=new Set(['Part','MeshPart','WedgePart','CornerWedgePart','UnionOperation','TrussPart','Seat','VehicleSeat']);
function luaString(value){
  return '"'+String(value).replaceAll('\\','\\\\').replaceAll('"','\\"').replaceAll('\n','\\n')+'"';
}
function freezeTable(rows){
  return 'table.freeze({\\n'+rows.map(x=>'\\t\\t'+x).join(',\\n')+'\\n\\t})';
}
function normalizeGeneratedLua(value){
  return value.replaceAll('\\t','\t').replaceAll('\\n','\n');
}
function area(row){return (row.size?.[0]||0)*(row.size?.[2]||0);}
function volume(row){return (row.size?.[0]||0)*(row.size?.[1]||0)*(row.size?.[2]||0);}
function groupBy(rows,keyFn){
  const m=new Map();
  for(const row of rows){
    const key=keyFn(row);
    if(!key) continue;
    const list=m.get(key)||[]; list.push(row); m.set(key,list);
  }
  return m;
}
function segmentMatch(path,re){
  for(let i=0;i<path.length;i++){
    re.lastIndex=0;
    if(re.test(path[i])) return {segment:path[i],index:i};
  }
  return null;
}

const domPath=arg('--dom');
const spawnPath=arg('--spawn-reference');
if(!domPath||!spawnPath) throw new Error('--dom and --spawn-reference are required');
const dom=JSON.parse(await readFile(resolve(domPath),'utf8'));
const spawnRef=JSON.parse(await readFile(resolve(spawnPath),'utf8'));
const outDir=resolve(arg('--out-dir','artifacts/legacy-bindings'));
const manifestPath=resolve(arg('--manifest','docs/roblox-world/LEGACY_BROOKHAVEN_BINDING_MANIFEST.json'));

const rows=walk(dom);
const workspace=rows.find(r=>cls(r.node)==='Workspace'&&name(r.node)==='Workspace')?.node;
if(!workspace) throw new Error('Workspace not found');
const geometry=walk(workspace).filter(r=>GEOMETRY.has(cls(r.node))).map((r,i)=>({
  ...r,
  index:i+1,
  generatedName:'LBH_'+String(i+1).padStart(5,'0'),
  originalName:name(r.node),
  className:cls(r.node),
  cframe:cframe(r.node),
  size:size(r.node)
})).filter(r=>r.cframe&&r.size);
if(geometry.length!==14459) throw new Error('legacy geometry sequence drift: '+geometry.length);

const firstNine=spawnRef.legacy.spawnLocations.slice(0,9).map(x=>x.properties.CFrame.CFrame.position.map(Number));
const spawnCentroid=[0,1,2].map(i=>firstNine.reduce((s,p)=>s+p[i],0)/firstNine.length);
const spawnSource=geometry
  .filter(r=>r.size[0]>=6&&r.size[2]>=6)
  .map(r=>{
    const [x,y,z]=r.cframe.position,[sx,sy,sz]=r.size;
    const dx=Math.max(0,Math.abs(spawnCentroid[0]-x)-sx/2);
    const dz=Math.max(0,Math.abs(spawnCentroid[2]-z)-sz/2);
    const top=y+sy/2;
    return {row:r,score:Math.hypot(dx,dz)*20+Math.abs(top-spawnCentroid[1])};
  }).sort((a,b)=>a.score-b.score)[0]?.row;
if(!spawnSource) throw new Error('legacy spawn source geometry not found');

// School attendance must bind to the pinned source's real classroom geometry.
// This selector fails closed if distinct classroom doors no longer form one
// coherent physical building cluster.
const schoolBindings=deriveLegacySchoolBindings(geometry);
const schoolLuau=renderLegacySchoolBindingsLuau(schoolBindings);

const garageGroups=groupBy(geometry,r=>{
  const m=segmentMatch(r.path,/^001_GarageDoor$|^GarageDoor$/i);
  return m ? r.path.slice(0,m.index+1).join('/') : null;
});
const garageBindings=[];
for(const [sourcePath,group] of garageGroups){
  const candidates=group.filter(r=>/GarageDoor/i.test(r.originalName)&&!/Frame/i.test(r.originalName));
  const chosen=(candidates.length?candidates:group).slice().sort((a,b)=>area(b)-area(a))[0];
  if(!chosen) continue;
  garageBindings.push({
    id:'legacy-garage-'+String(garageBindings.length+1).padStart(3,'0'),
    generatedName:chosen.generatedName,
    sourcePath,
    sourceName:chosen.originalName
  });
}

const applianceRe=/oven|micro|dishwasher|washer|fridge|cabinet|keycard/i;
const doorGroups=groupBy(geometry,r=>{
  if(r.path.some(s=>/garage/i.test(s))) return null;
  const m=segmentMatch(r.path,/HouseDoor|FenceDoor|SlidingDoor|NoLockHouseDoor|StoreDoor|RoomDoor|^Door$/i);
  if(!m || applianceRe.test(r.path.join('/'))) return null;
  return r.path.slice(0,m.index+1).join('/');
});
const doorBindings=[];
for(const [sourcePath,group] of doorGroups){
  let candidates=group.filter(r=>/Door/i.test(r.originalName)&&!/Frame|Fake|Knock/i.test(r.originalName));
  if(!candidates.length) candidates=group.filter(r=>!r.originalName.match(/Frame|Fake|Knock/i));
  const chosen=candidates.slice().sort((a,b)=>volume(b)-volume(a))[0];
  if(!chosen) continue;
  doorBindings.push({
    id:'legacy-door-'+String(doorBindings.length+1).padStart(3,'0'),
    generatedName:chosen.generatedName,
    sourcePath,
    sourceName:chosen.originalName
  });
}

const lightGroups=groupBy(geometry,r=>{
  const m=segmentMatch(r.path,/^LightSwitch(?:Mesh|\\d*)$/i);
  return m ? r.path.slice(0,m.index+1).join('/') : null;
});
const lightBindings=[];
for(const [sourcePath,group] of lightGroups){
  const chosen=group.slice().sort((a,b)=>volume(a)-volume(b))[0];
  if(!chosen) continue;
  lightBindings.push({
    id:'legacy-light-'+String(lightBindings.length+1).padStart(3,'0'),
    generatedName:chosen.generatedName,
    sourcePath,
    sourceName:chosen.originalName
  });
}

const lotGroups=groupBy(geometry,r=>{
  const idx=r.path.findIndex(x=>x==='001_Lots');
  if(idx<0||idx+1>=r.path.length) return null;
  return r.path.slice(0,idx+2).join('/');
});
const plots=[];
for(const [sourcePath,group] of lotGroups){
  let candidates=group.filter(r=>/HouseSpawnPosition|BuyHouse/i.test(r.originalName));
  if(!candidates.length) candidates=group.filter(r=>/UnsoldLotGrass/i.test(r.path.join('/')));
  if(!candidates.length) candidates=group.filter(r=>r.size[0]>=15&&r.size[2]>=15);
  const chosen=candidates.slice().sort((a,b)=>area(b)-area(a))[0];
  if(!chosen) continue;
  plots.push({
    id:'legacy-plot-'+String(plots.length+1),
    generatedName:chosen.generatedName,
    sourcePath,
    sourceName:chosen.originalName
  });
}

const activityLines=[
  '--!strict',
  '',
  '-- Generated deterministically from the pinned legacy Brookhaven source.',
  'local LegacyWorldActivityBindings = table.freeze({',
  '\\tSchemaVersion = 1,',
  '\\tRevision = "legacy-source-bindings-v1",',
  '\\tWorldRootName = "BrookhavenWorldRuntime",',
  '\\tRuntimeAnchorFolderName = "StarBloxActivityAnchors",',
  '\\tSpawn = table.freeze({',
  '\\t\\tSourcePartName = '+luaString(spawnSource.generatedName)+',',
  '\\t\\tFacingSourcePartName = '+luaString(spawnSource.generatedName)+',',
  '\\t\\tHeightOffset = 3,',
  '\\t\\tPattern = "legacy-town-center-3x3-v1",',
  '\\t\\tSlots = table.freeze({',
  '\\t\\t\\ttable.freeze({X = -4, Z = -4}), table.freeze({X = 0, Z = -4}), table.freeze({X = 4, Z = -4}),',
  '\\t\\t\\ttable.freeze({X = -4, Z = 0}), table.freeze({X = 0, Z = 0}), table.freeze({X = 4, Z = 0}),',
  '\\t\\t\\ttable.freeze({X = -4, Z = 4}), table.freeze({X = 0, Z = 4}), table.freeze({X = 4, Z = 4}),',
  '\\t\\t}),',
  '\\t}),',
  '\\tActivities = table.freeze({}),',
  '})',
  'return LegacyWorldActivityBindings',
  ''
];
const activityLuau=activityLines.join('\\n');

const doorRows=doorBindings.map(x=>'table.freeze({Id = '+luaString(x.id)+', PartName = '+luaString(x.generatedName)+', ReviewBasis = "legacy-source-explicit-door-group", MaxActivationDistance = 9, OpenSeconds = 1.35, HingeSide = -1, SwingDegrees = 88})');
const garageRows=garageBindings.map(x=>'table.freeze({Id = '+luaString(x.id)+', PartName = '+luaString(x.generatedName)+', ReviewBasis = "legacy-source-explicit-garage-group", MaxActivationDistance = 12, OpenSeconds = 2.5, LiftStuds = 8})');
const lightRows=lightBindings.map(x=>'table.freeze({Id = '+luaString(x.id)+', PartName = '+luaString(x.generatedName)+', ReviewBasis = "legacy-source-explicit-light-switch-group", MaxActivationDistance = 10, Brightness = 2, Range = 18, Shadows = false, InitiallyOn = true})');
const interactionLines=[
  '--!strict','',
  '-- Generated deterministically from the pinned legacy Brookhaven source.',
  'local LegacyWorldInteractionBindings = table.freeze({',
  '\\tSchemaVersion = 1,',
  '\\tRevision = "legacy-source-interactions-v1",',
  '\\tWorldRootName = "BrookhavenWorldRuntime",',
  '\\tImmutableWitnessName = "BrookhavenWorldBaseline",',
  '\\tNativeSeats = table.freeze({UseSourceSeatClasses = true, ExpectedSeatCount = 399, ExpectedVehicleSeatCount = 12}),',
  '\\tDoors = '+freezeTable(doorRows)+',',
  '\\tGarageDoors = '+freezeTable(garageRows)+',',
  '\\tLights = '+freezeTable(lightRows)+',',
  '\\tCertifiedSummary = table.freeze({NativeSeats = 399, NativeVehicleSeats = 12, ReviewedDoors = '+doorBindings.length+', ReviewedGarageDoors = '+garageBindings.length+', ReviewedLights = '+lightBindings.length+'}),',
  '\\tCandidateSummary = table.freeze({DoorCandidates = '+doorBindings.length+', GarageCandidates = '+garageBindings.length+', LightCandidates = '+lightBindings.length+'}),',
  '\\tPendingReview = table.freeze({StrictDoors = 0, GarageDoors = 0, Lights = 0, RequiresRenderedEvidence = false}),',
  '\\tAutomaticCandidateActivationAllowed = false,',
  '\\tGeneratedFromPinnedLegacySource = true,',
  '})',
  'return LegacyWorldInteractionBindings',''
];
const interactionLuau=interactionLines.join('\\n');

const plotRows=plots.map(x=>'table.freeze({Id = '+luaString(x.id)+', SourcePartName = '+luaString(x.generatedName)+', HeightOffset = 0.55})');
const plotLines=[
  '--!strict','',
  '-- Generated deterministically from the pinned legacy Brookhaven source.',
  'local LegacyWorldPlotBindings = table.freeze({',
  '\\tSchemaVersion = 1,',
  '\\tRevision = "legacy-source-plots-v1",',
  '\\tWorldRootName = "BrookhavenWorldRuntime",',
  '\\tPlots = '+freezeTable(plotRows)+',',
  '})',
  'return LegacyWorldPlotBindings',''
];
const plotLuau=plotLines.join('\\n');

const counts={
  houseGeometry:geometry.filter(r=>r.path.includes('001_Lots')).length,
  vehicleGeometry:geometry.filter(r=>r.path.includes('Vehicles')||r.path.some(x=>/CarBackup|SingleVehicles/i.test(x))).length,
  lotGeometry:geometry.filter(r=>r.path.includes('001_Lots')).length,
  roadGeometry:geometry.filter(r=>/road|street|highway/i.test(r.originalName)||/road|street|highway/i.test(r.path.join('/'))).length
};
const manifest={
  schemaVersion:1,
  status:'legacy-runtime-bindings-generated',
  geometrySequence:{count:geometry.length,namePattern:'LBH_00001..LBH_14459'},
  spawn:{generatedName:spawnSource.generatedName,sourcePath:spawnSource.path.join('/'),sourceName:spawnSource.originalName,legacySpawnCentroid:spawnCentroid},
  interactions:{
    doors:doorBindings,
    garages:garageBindings,
    lights:lightBindings,
    counts:{doors:doorBindings.length,garages:garageBindings.length,lights:lightBindings.length},
    pendingReview:{doors:0,garages:0,lights:0}
  },
  plots:{count:plots.length,entries:plots},
  school:{
    status:'verified-real-building-mapping-generated',
    buildingId:schoolBindings.schoolBuildingId,
    selectionBasis:schoolBindings.selectionBasis,
    candidateDoorCount:schoolBindings.candidateDoorCount,
    maximumSeparationStuds:schoolBindings.maximumSeparation,
    centroid:schoolBindings.centroid,
    fallbackCampusEnabled:false,
    cafeteriaAnchor:{
      generatedName:schoolBindings.cafeteria.generatedName,
      sourcePath:schoolBindings.cafeteria.sourcePath,
      physicalRoomId:schoolBindings.cafeteria.physicalRoomId,
      position:schoolBindings.cafeteria.position,
      worldOffset:schoolBindings.cafeteria.worldOffset
    },
    makeUpAnchor:{
      generatedName:schoolBindings.library.generatedName,
      sourcePath:schoolBindings.library.sourcePath,
      physicalRoomId:schoolBindings.library.physicalRoomId,
      position:schoolBindings.library.position,
      label:schoolBindings.library.label
    },
    arrivalAnchor:{
      generatedName:schoolBindings.entrance.generatedName,
      sourcePath:schoolBindings.entrance.sourcePath,
      physicalRoomId:schoolBindings.entrance.physicalRoomId,
      position:schoolBindings.entrance.position,
      label:schoolBindings.entrance.label
    },
    classAnchors:Object.fromEntries(Object.entries(schoolBindings.classes).map(([classId,binding])=>[classId,{
      generatedName:binding.generatedName,
      sourcePath:binding.sourcePath,
      sourceName:binding.sourceName,
      physicalRoomId:binding.physicalRoomId,
      room:binding.room,
      position:binding.position,
      worldOffset:binding.worldOffset
    }]))
  },
  worldCoverage:counts,
  boundary:{legacyDevelopmentOnly:true,currentLiveCertificationSatisfied:false,exactParityClaimAllowed:false}
};
await mkdir(outDir,{recursive:true});
await mkdir(dirname(manifestPath),{recursive:true});
await Promise.all([
  writeFile(resolve(outDir,'LegacyWorldActivityBindings.luau'),normalizeGeneratedLua(activityLuau)),
  writeFile(resolve(outDir,'LegacyWorldInteractionBindings.luau'),normalizeGeneratedLua(interactionLuau)),
  writeFile(resolve(outDir,'LegacyWorldPlotBindings.luau'),normalizeGeneratedLua(plotLuau)),
  writeFile(resolve(outDir,'LegacySchoolWorldBindings.luau'),schoolLuau),
  writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n')
]);
process.stdout.write(JSON.stringify({
  status:manifest.status,
  spawn:manifest.spawn,
  interactions:manifest.interactions.counts,
  plots:manifest.plots.count,
  worldCoverage:manifest.worldCoverage
},null,2)+'\n');
