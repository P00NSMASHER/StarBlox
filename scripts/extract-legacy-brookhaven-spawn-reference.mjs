import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

function arg(name,def=null){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : def;
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
function selectedProperties(node){
  const p=node?.properties && typeof node.properties==='object' ? node.properties : {};
  const keep={};
  for(const [key,value] of Object.entries(p)){
    if(/cframe|position|size|orientation|anchored|neutral|teamcolor|duration|enabled/i.test(key)){
      keep[key]=value;
    }
  }
  return keep;
}
function rowReceipt(row){
  return {
    className:cls(row.node),
    name:name(row.node),
    path:row.path.join('/'),
    properties:selectedProperties(row.node)
  };
}

const legacyPath=resolve(arg('--legacy-dom'));
const starbloxPath=resolve(arg('--starblox-dom'));
const outPath=resolve(arg('--out','docs/roblox-world/LEGACY_BROOKHAVEN_SPAWN_REFERENCE.json'));
if(!legacyPath || !starbloxPath) throw new Error('--legacy-dom and --starblox-dom are required');

const [legacy,starblox]=await Promise.all([
  readFile(legacyPath,'utf8').then(JSON.parse),
  readFile(starbloxPath,'utf8').then(JSON.parse)
]);
const legacyRows=walk(legacy);
const starbloxRows=walk(starblox);
const spawnFolder=legacyRows.find(row=>name(row.node)==='Spawns!')||null;
const spawnLocations=legacyRows.filter(row=>cls(row.node)==='SpawnLocation');
const currentSpawn=starbloxRows.filter(row=>name(row.node)==='BHW_1202');
const currentFacing=starbloxRows.filter(row=>name(row.node)==='BHW_2442');

const receipt={
  schemaVersion:1,
  status:'legacy-spawn-reference-extracted',
  legacy:{
    spawnFolder:spawnFolder ? rowReceipt(spawnFolder) : null,
    spawnLocationCount:spawnLocations.length,
    spawnLocations:spawnLocations.map(rowReceipt)
  },
  starblox:{
    configuredSpawnSourceName:'BHW_1202',
    configuredFacingSourceName:'BHW_2442',
    spawnSourceMatchCount:currentSpawn.length,
    facingSourceMatchCount:currentFacing.length,
    spawnSource:currentSpawn.map(rowReceipt),
    facingSource:currentFacing.map(rowReceipt)
  },
  boundary:{
    developmentReferenceOnly:true,
    currentLiveCertificationSatisfied:false,
    exactParityClaimAllowed:false
  },
  nextStep:'derive-spatial-town-center-spawn-proof-from-extracted-transforms'
};
await mkdir(dirname(outPath),{recursive:true});
await writeFile(outPath,JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
