import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

function arg(name,def=null){
  const inline=process.argv.find(v=>v.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : def;
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
function props(n){return n?.properties&&typeof n.properties==='object'?n.properties:{};}
function scalar(v){
  if(v===null||v===undefined) return null;
  if(typeof v==='string'||typeof v==='number'||typeof v==='boolean') return v;
  if(typeof v==='object'){
    for(const key of ['String','Content','Int32','Int64','Float32','Float64','Bool']){
      if(v[key]!==undefined) return v[key];
    }
  }
  return null;
}
function pval(n,key){
  const p=props(n);
  return scalar(p[key]);
}
function summary(row){
  return {
    name:name(row.node),
    className:cls(row.node),
    path:row.path.join('/'),
    childCount:kids(row.node).length,
    descendantCount:walk(row.node).length,
    text:pval(row.node,'Text'),
    image:pval(row.node,'Image'),
    value:pval(row.node,'Value')
  };
}
function direct(n){return n?kids(n).map(c=>({name:name(c),className:cls(c),childCount:kids(c).length,descendantCount:walk(c).length})):[];}
const dom=JSON.parse(await readFile(resolve(arg('--dom')),'utf8'));
const out=resolve(arg('--out','docs/roblox-world/LEGACY_BROOKHAVEN_CATALOG_DISCOVERY.json'));
const rows=walk(dom);
const byName=(target)=>rows.filter(r=>name(r.node)===target);
const backup=byName('003_CarBackup')[0]?.node||null;
const uiClone=byName('UiClone')[0]?.node||null;
const singleVehicles=byName('SingleVehicles')[0]?.node||null;

const catalogRe=/(vehicle|car|truck|bike|scooter|house|home|tool|item|inventory|prop|backpack|spawn|lot|plot)/i;
const uiClasses=new Set(['TextLabel','TextButton','ImageLabel','ImageButton','ScrollingFrame','Frame']);
const ui=rows.filter(r=>uiClasses.has(cls(r.node)) && (
  catalogRe.test(name(r.node)) ||
  catalogRe.test(r.path.join('/')) ||
  catalogRe.test(String(pval(r.node,'Text')||''))
)).slice(0,5000).map(summary);

const namedContainers=rows.filter(r=>
  ['Folder','Model','Configuration'].includes(cls(r.node)) &&
  catalogRe.test(name(r.node))
).slice(0,2000).map(summary);

const backupRows=backup?walk(backup):[];
const backupModels=backupRows.filter(r=>cls(r.node)==='Model').map(summary);
const backupVehicles=backupRows.filter(r=>cls(r.node)==='VehicleSeat').map(summary);
const singlesRows=singleVehicles?walk(singleVehicles):[];

const candidate={
  schemaVersion:1,
  status:'legacy-catalog-discovery-extracted',
  sourceSubtrees:{
    carBackup:{
      present:Boolean(backup),
      directChildren:direct(backup),
      modelCount:backupModels.length,
      vehicleSeatCount:backupVehicles.length,
      models:backupModels.slice(0,1000)
    },
    singleVehicles:{
      present:Boolean(singleVehicles),
      directChildren:direct(singleVehicles),
      rows:singlesRows.slice(0,1000).map(r=>summary(r))
    },
    uiClone:{
      present:Boolean(uiClone),
      directChildren:direct(uiClone)
    }
  },
  namedContainers,
  relevantUi:ui,
  derived:{
    relevantUiRows:ui.length,
    namedContainerRows:namedContainers.length,
    uniqueUiTexts:[...new Set(ui.map(x=>x.text).filter(x=>typeof x==='string'&&x.trim()))].sort(),
    uniqueUiImages:[...new Set(ui.map(x=>x.image).filter(x=>typeof x==='string'&&x.trim()))].sort()
  },
  boundary:{
    legacySnapshotOnly:true,
    currentLiveCatalogCertification:false,
    exactParityClaimAllowed:false
  }
};
await mkdir(dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(candidate,null,2)+'\n');
process.stdout.write(JSON.stringify({
  status:candidate.status,
  carBackupDirectChildren:candidate.sourceSubtrees.carBackup.directChildren.length,
  carBackupModels:candidate.sourceSubtrees.carBackup.modelCount,
  carBackupVehicleSeats:candidate.sourceSubtrees.carBackup.vehicleSeatCount,
  relevantUiRows:candidate.derived.relevantUiRows,
  namedContainers:candidate.derived.namedContainerRows,
  uniqueUiTexts:candidate.derived.uniqueUiTexts.length,
  uniqueUiImages:candidate.derived.uniqueUiImages.length
},null,2)+'\n');
