import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

function arg(name,def=null){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : def;
}
function cls(node){return String(node?.class ?? node?.className ?? 'Unknown');}
function name(node){return String(node?.name ?? cls(node));}
function kids(node){return Array.isArray(node?.children) ? node.children : [];}
function walk(node,path=[],rows=[]){
  if(!node||typeof node!=='object') return rows;
  const n=name(node), next=[...path,n];
  rows.push({node,path:next});
  for(const child of kids(node)) walk(child,next,rows);
  return rows;
}
function findPath(root,names){
  let current=root;
  for(const target of names){
    current=kids(current).find(child=>name(child)===target);
    if(!current) return null;
  }
  return current;
}
function summarizeChildren(node){
  if(!node) return [];
  return kids(node).map(child=>({
    name:name(child),
    className:cls(child),
    childCount:kids(child).length,
    descendantCount:walk(child).length
  }));
}
function modelsUnder(node,limit=1000){
  if(!node) return [];
  return walk(node).filter(row=>cls(row.node)==='Model').slice(0,limit).map(row=>({
    name:name(row.node),
    path:row.path.join('/'),
    directChildren:kids(row.node).length
  }));
}
function uniqueNames(rows){
  return [...new Set(rows.map(row=>row.name))].sort();
}
const domPath=resolve(arg('--dom'));
const outPath=resolve(arg('--out','docs/roblox-world/LEGACY_BROOKHAVEN_SOURCE_INVENTORY.json'));
if(!domPath) throw new Error('--dom is required');
const dom=JSON.parse(await readFile(domPath,'utf8'));

const workspace=findPath(dom,['Workspace']) || walk(dom).find(row=>cls(row.node)==='Workspace')?.node;
const replicatedStorage=findPath(dom,['ReplicatedStorage']) || walk(dom).find(row=>cls(row.node)==='ReplicatedStorage')?.node;
const serverStorage=findPath(dom,['ServerStorage']) || walk(dom).find(row=>cls(row.node)==='ServerStorage')?.node;
const starterGui=findPath(dom,['StarterGui']) || walk(dom).find(row=>cls(row.node)==='StarterGui')?.node;

const vehicles=workspace ? kids(workspace).find(child=>name(child)==='Vehicles') : null;
const lots=workspace ? kids(workspace).find(child=>name(child)==='001_Lots') : null;
const spawns=workspace ? kids(workspace).find(child=>name(child)==='Spawns!') : null;

const allRows=walk(dom);
const namedCandidates={};
for(const [key,re] of Object.entries({
  tool:/tool|item|inventory|prop/i,
  vehicle:/vehicle|car|truck|bike|scooter|van|bus/i,
  house:/house|home/i,
  lot:/lot|plot/i,
  door:/door/i,
  garage:/garage/i,
  light:/light|lamp/i,
  road:/road|street|highway/i
})){
  namedCandidates[key]=allRows
    .filter(row=>re.test(name(row.node)))
    .slice(0,500)
    .map(row=>({name:name(row.node),className:cls(row.node),path:row.path.join('/')}));
}

const vehicleModels=modelsUnder(vehicles,2000);
const lotModels=modelsUnder(lots,2000);
const receipt={
  schemaVersion:1,
  status:'legacy-source-inventory-extracted',
  services:{
    rootChildren:summarizeChildren(dom),
    workspaceChildren:summarizeChildren(workspace),
    replicatedStorageChildren:summarizeChildren(replicatedStorage),
    serverStorageChildren:summarizeChildren(serverStorage),
    starterGuiChildren:summarizeChildren(starterGui)
  },
  keySubtrees:{
    vehicles:{
      present:Boolean(vehicles),
      directChildren:summarizeChildren(vehicles),
      modelCount:vehicleModels.length,
      uniqueModelNames:uniqueNames(vehicleModels),
      models:vehicleModels
    },
    lots:{
      present:Boolean(lots),
      directChildren:summarizeChildren(lots),
      modelCount:lotModels.length,
      uniqueModelNames:uniqueNames(lotModels),
      models:lotModels
    },
    spawns:{
      present:Boolean(spawns),
      directChildren:summarizeChildren(spawns)
    }
  },
  namedCandidates,
  boundary:{
    developmentReferenceOnly:true,
    currentLiveCertificationSatisfied:false,
    exactParityClaimAllowed:false
  }
};
await mkdir(dirname(outPath),{recursive:true});
await writeFile(outPath,JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify({
  status:receipt.status,
  vehicleModels:receipt.keySubtrees.vehicles.modelCount,
  vehicleUniqueNames:receipt.keySubtrees.vehicles.uniqueModelNames.length,
  lotModels:receipt.keySubtrees.lots.modelCount,
  lotUniqueNames:receipt.keySubtrees.lots.uniqueModelNames.length,
  rootChildren:receipt.services.rootChildren.length
},null,2)+'\n');
