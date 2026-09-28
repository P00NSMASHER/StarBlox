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
const input=resolve(process.argv[2]||'.diag-brookhaven/legacy-dom.json');
const output=resolve(process.argv[3]||'docs/diagnostics/BROOKHAVEN_SCRIPT_EXTRACT.json');
const dom=JSON.parse(await readFile(input,'utf8'));
const rows=walk(dom);
const needles=[
  'PlayerHouseChoice','GettingHouse','PlayersHouse','RPHouseEvent',
  'MainButtons','MainHouseMenu','BuyHouse','TempHouseNumber','TempPlotOfLand'
];
const scripts=rows.filter(r=>['Script','LocalScript','ModuleScript'].includes(cls(r.node)));
const selected=scripts.filter(r=>{
  const p=r.pathText.toLowerCase();
  const serialized=JSON.stringify(r.node);
  return p.includes('startergui/playerhandler') ||
    p.includes('startergui/mainguihandler') ||
    p.includes('workspace/001_lots') ||
    needles.some(n=>serialized.includes(n));
}).map(r=>({
  className:cls(r.node),
  name:name(r.node),
  path:r.pathText,
  properties:r.node.properties||{}
}));
const result={
  schemaVersion:1,
  status:'brookhaven-script-sources-extracted',
  totalScripts:scripts.length,
  selectedScripts:selected.length,
  needles,
  scripts:selected
};
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,totalScripts:result.totalScripts,selectedScripts:result.selectedScripts,output},null,2));
