import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

function cls(n){return String(n?.class??n?.className??'Unknown');}
function name(n){return String(n?.name??cls(n));}
function kids(n){return Array.isArray(n?.children)?n.children:[];}
function walk(n,path=[],rows=[]){
  if(!n||typeof n!=='object') return rows;
  const next=[...path,name(n)];
  rows.push({node:n,path:next,pathText:next.join('/')});
  for(const c of kids(n)) walk(c,next,rows);
  return rows;
}
function compact(n,depth=0,maxDepth=4){
  const p=n?.properties||{};
  const keep={};
  for(const key of ['Value','Disabled','Name','Text','Object','CFrame','Position','Size']){
    if(p[key]!==undefined) keep[key]=p[key];
  }
  const out={className:cls(n),name:name(n),properties:keep};
  if(depth<maxDepth){
    out.children=kids(n).map(c=>compact(c,depth+1,maxDepth));
  }
  return out;
}

const input=resolve(process.argv[2]||'.diag-brookhaven/legacy-dom.json');
const output=resolve(process.argv[3]||'docs/diagnostics/BROOKHAVEN_SCRIPT_EXTRACT.json');
const dom=JSON.parse(await readFile(input,'utf8'));
const rows=walk(dom);
const needles=[
  'PlayerHouseChoice','GettingHouse','PlayersHouse','RPHouseEvent',
  'MainButtons','MainHouseMenu','BuyHouse','TempHouseNumber','TempPlotOfLand',
  'PlayersStartup','PlayersBag'
];
const scripts=rows.filter(r=>['Script','LocalScript','ModuleScript'].includes(cls(r.node)));
const selected=scripts.filter(r=>{
  const p=r.pathText.toLowerCase();
  const serialized=JSON.stringify(r.node);
  return p.includes('startergui/playerhandler') ||
    p.includes('startergui/mainguihandler') ||
    p.includes('startergui/noresetguihandler') ||
    p.includes('workspace/001_lots') ||
    String(r.node?.properties?.Source?.String||'').trim().length>0 ||
    needles.some(n=>serialized.includes(n));
}).map(r=>({
  className:cls(r.node),
  name:name(r.node),
  path:r.pathText,
  properties:r.node.properties||{}
}));

const playerStartup=rows.find(r=>r.pathText==='DataModel/ReplicatedStorage/PlayersStartup')?.node||null;
const lotsRoot=rows.find(r=>r.pathText==='DataModel/Workspace/001_Lots')?.node||null;
const lots=lotsRoot?kids(lotsRoot).filter(x=>name(x)!=='DontDelete').slice(0,20).map(x=>compact(x,0,3)):[];
const remotes=rows.filter(r=>r.pathText.startsWith('DataModel/ReplicatedStorage/RemoteEvents/') && ['RemoteEvent','RemoteFunction','BindableEvent','BindableFunction'].includes(cls(r.node)))
  .map(r=>({name:name(r.node),className:cls(r.node),path:r.pathText}));

const houseStyleNames=new Set(Array.from({length:12},(_,i)=>String(i+1).padStart(3,'0')+'_House'));
const houseStyleCandidates=rows.filter(r=>houseStyleNames.has(name(r.node))).map(r=>({path:r.pathText,className:cls(r.node),name:name(r.node)}));
const houseStorageCandidates=rows.filter(r=>{
  const p=r.pathText;
  const n=name(r.node).toLowerCase();
  return (p.startsWith('DataModel/ReplicatedStorage/')||p.startsWith('DataModel/ServerStorage/')) &&
    (n.includes('house')||n.includes('motel')) &&
    ['Folder','Model'].includes(cls(r.node));
}).map(r=>({path:r.pathText,className:cls(r.node),name:name(r.node)})).slice(0,500);
const sourceStats={
  scripts:scripts.length,
  nonEmptyScripts:scripts.filter(r=>String(r.node?.properties?.Source?.String||'').trim().length>0).length,
  serverScripts:scripts.filter(r=>cls(r.node)==='Script').length,
  nonEmptyServerScripts:scripts.filter(r=>cls(r.node)==='Script'&&String(r.node?.properties?.Source?.String||'').trim().length>0).length,
  serverHandlerHits:scripts.filter(r=>{
    if(cls(r.node)!=='Script') return false;
    const src=String(r.node?.properties?.Source?.String||'');
    return ['PlayerAdded','PlayersStartup','PlayersBag','BuyHouseYesNo','PickingCustomHouse','PlayerSellHouse'].some(x=>src.includes(x));
  }).map(r=>({path:r.pathText,sourceLen:String(r.node?.properties?.Source?.String||'').length}))
};

const result={
  schemaVersion:2,
  status:'brookhaven-script-sources-extracted',
  totalScripts:scripts.length,
  selectedScripts:selected.length,
  needles,
  scripts:selected,
  templates:{
    playersStartup:playerStartup?compact(playerStartup,0,4):null,
    lots,
    remotes,
    houseStyleCandidates,
    houseStorageCandidates,
    sourceStats
  }
};
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(result,null,2)+'\\n');
const templateOutput=resolve('docs/diagnostics/BROOKHAVEN_TEMPLATE_EXTRACT.json');
await mkdir(dirname(templateOutput),{recursive:true});
await writeFile(templateOutput,JSON.stringify({schemaVersion:1,status:'brookhaven-template-extracted',templates:result.templates},null,2)+'\\n');
console.log(JSON.stringify({
  status:result.status,
  totalScripts:result.totalScripts,
  selectedScripts:result.selectedScripts,
  playerStartup:Boolean(result.templates.playersStartup),
  lots:result.templates.lots.length,
  remotes:result.templates.remotes.length,
  output
},null,2));
