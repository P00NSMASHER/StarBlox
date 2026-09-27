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
function pval(n,key){return scalar((n?.properties||{})[key]);}
function directModels(node){
  return kids(node||{}).filter(c=>cls(c)==='Model').map(c=>({
    name:name(c),className:cls(c),descendantCount:walk(c).length
  }));
}
function buttonRows(node){
  if(!node) return [];
  return walk(node).filter(r=>['ImageButton','TextButton'].includes(cls(r.node))).map(r=>({
    name:name(r.node),
    className:cls(r.node),
    path:r.path.join('/'),
    text:pval(r.node,'Text'),
    image:pval(r.node,'Image')
  }));
}
const dom=JSON.parse(await readFile(resolve(arg('--dom')),'utf8'));
const out=resolve(arg('--out','docs/roblox-world/LEGACY_BROOKHAVEN_CATALOG_BASELINE.json'));
const rows=walk(dom);
const byName=(target)=>rows.filter(r=>name(r.node)===target);
const largest=(target)=>byName(target).sort((a,b)=>walk(b.node).length-walk(a.node).length)[0]?.node||null;

const carBackup=largest('003_CarBackup');
const singleVehicles=largest('SingleVehicles');
const giveTools=largest('001_GiveTools');

function candidatePanels(re){
  return rows
    .filter(r=>{
      const c=cls(r.node);
      if(!['Frame','ScrollingFrame','ScreenGui','Folder','Model'].includes(c)) return false;
      const path=r.path.join('/');
      if(!re.test(name(r.node)) && !re.test(path)) return false;
      return buttonRows(r.node).length>=5;
    })
    .map(r=>{
      const buttons=buttonRows(r.node);
      return {
        name:name(r.node),
        className:cls(r.node),
        path:r.path.join('/'),
        buttonCount:buttons.length,
        uniqueButtonNames:[...new Set(buttons.map(x=>x.name))].sort(),
        uniqueButtonTexts:[...new Set(buttons.map(x=>x.text).filter(x=>typeof x==='string'&&x.trim()))].sort(),
        buttons:buttons.slice(0,500)
      };
    })
    .sort((a,b)=>b.buttonCount-a.buttonCount)
    .slice(0,50);
}
const housePanels=candidatePanels(/house|home/i);
const vehiclePanels=candidatePanels(/vehicle|car/i);
const toolPanels=candidatePanels(/tool|item|inventory|prop/i);

const vehicles=[
  ...directModels(carBackup).map(x=>({...x,source:'ReplicatedStorage/003_CarBackup'})),
  ...directModels(singleVehicles).map(x=>({...x,source:'ReplicatedStorage/SingleVehicles'}))
];
const vehicleKey=new Map();
for(const v of vehicles){
  const key=v.name.toLowerCase();
  if(!vehicleKey.has(key)) vehicleKey.set(key,v);
}
const uniqueVehicles=[...vehicleKey.values()].sort((a,b)=>a.name.localeCompare(b.name));

const toolsRaw=kids(giveTools||{}).map(c=>({
  name:name(c),
  className:cls(c),
  descendantCount:walk(c).length
})).sort((a,b)=>a.name.localeCompare(b.name));
const toolByName=new Map();
for(const entry of toolsRaw){
  const key=entry.name.trim().toLowerCase();
  if(key && !toolByName.has(key)) toolByName.set(key,entry);
}
const tools=[...toolByName.values()].sort((a,b)=>a.name.localeCompare(b.name));

const exactHousePanel=housePanels.find(panel=>/MainHouseMenu\/Catalog$/.test(panel.path))
  || housePanels.find(panel=>/MainHouseMenu$/.test(panel.path))
  || null;
const houseButtons=(exactHousePanel?.buttons||[])
  .filter(button=>/^\d{3}_House$/.test(button.name))
  .sort((a,b)=>a.name.localeCompare(b.name));
const houseBest=exactHousePanel;
const receipt={
  schemaVersion:1,
  status:'legacy-catalog-baseline-derived',
  vehicles:{
    templates:uniqueVehicles,
    templateCount:uniqueVehicles.length,
    rawBackupDirectModelCount:directModels(carBackup).length,
    rawSingleVehicleDirectModelCount:directModels(singleVehicles).length
  },
  tools:{
    source:'Workspace/WorkspaceCom/001_GiveTools',
    present:Boolean(giveTools),
    rawEntryCount:toolsRaw.length,
    uniqueEntryCount:tools.length,
    entries:tools,
    entryCount:tools.length
  },
  houseUi:{
    candidatePanels:housePanels,
    bestPanel:houseBest,
    bestPanelButtonCount:houseButtons.length,
    catalogButtons:houseButtons,
    catalogCount:houseButtons.length
  },
  vehicleUi:{candidatePanels:vehiclePanels},
  toolUi:{candidatePanels:toolPanels},
  completionRule:{
    vehicleCatalogTarget:'all unique source templates in largest 003_CarBackup + SingleVehicles',
    inventoryCatalogTarget:'all direct source entries in largest 001_GiveTools',
    houseCatalogTarget:'all buttons in highest-confidence house/home chooser panel'
  },
  boundary:{
    legacySnapshotCatalogOnly:true,
    current2026CatalogTargetsRemainSeparate:true,
    currentLiveCatalogCertification:false,
    exactParityClaimAllowed:false
  }
};
await mkdir(dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify({
  status:receipt.status,
  vehicleTemplates:receipt.vehicles.templateCount,
  toolEntries:receipt.tools.entryCount,
  bestHousePanel:houseBest?{path:houseBest.path,buttonCount:houseBest.buttonCount}:null,
  housePanelCandidates:housePanels.length,
  vehiclePanelCandidates:vehiclePanels.length,
  toolPanelCandidates:toolPanels.length
},null,2)+'\n');
