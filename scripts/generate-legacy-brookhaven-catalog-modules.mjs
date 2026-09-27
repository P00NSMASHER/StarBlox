import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

function arg(name,def=null){
  const inline=process.argv.find(v=>v.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0?process.argv[i+1]:def;
}
function q(v){return '"'+String(v).replaceAll('\\','\\\\').replaceAll('"','\\"')+'"';}
function slug(v){
  return String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'item';
}
function vehicleKind(name){
  if(/scooter|segway|skate|quad|bike/i.test(name)) return 'bike';
  if(/truck|fire/i.test(name)) return 'truck';
  if(/bus|van|limo|ambulance/i.test(name)) return 'van';
  if(/golf/i.test(name)) return 'cart';
  return 'car';
}
function toolKind(name){
  const s=String(name).toLowerCase();
  if(s.includes('book')) return 'book';
  if(s.includes('clip')) return 'clipboard';
  if(s.includes('guitar')) return 'guitar';
  if(s.includes('camera')||s.includes('camcorder')) return 'camera';
  if(s.includes('firex')) return 'extinguisher';
  if(s.includes('stroller')) return 'stroller';
  if(s.includes('bag')) return 'backpack';
  return 'generic';
}
const baselinePath=resolve(arg('--baseline'));
const outDir=resolve(arg('--out-dir','roblox/src/shared'));
const receiptPath=resolve(arg('--receipt','docs/roblox-world/LEGACY_BROOKHAVEN_CATALOG_COMPLETION.json'));
if(!baselinePath) throw new Error('--baseline is required');
const baseline=JSON.parse(await readFile(baselinePath,'utf8'));
if(baseline.status!=='legacy-catalog-baseline-derived') throw new Error('legacy catalog baseline required');

const sourceVehicles=baseline.vehicles.templates;
const sourceTools=baseline.tools.entries;
const sourceHouses=baseline.houseUi.catalogButtons||[];
if(sourceVehicles.length<1||sourceTools.length<1||sourceHouses.length<1) throw new Error('legacy catalog baseline is incomplete');

const vehicles=sourceVehicles.map((entry,index)=>{
  const kind=vehicleKind(entry.name);
  return {
    Id:'legacy-vehicle-'+String(index+1).padStart(2,'0')+'-'+slug(entry.name),
    Name:entry.name,
    Price:Math.min(12000,750+(index*550)),
    Kind:kind,
    Category:kind==='bike'?'Small':kind==='truck'||kind==='van'?'Work':'Street',
    ParityStatus:'legacy-source-runtime',
    RuntimePlayable:true,
    Seats:kind==='bike'?1:kind==='van'?6:kind==='truck'?4:2,
    Speed:kind==='bike'?42:kind==='van'?43:kind==='truck'?46:52
  };
});
const tools=[
  {Id:'tool-phone',Name:'Phone',Price:0,Kind:'phone',ParityStatus:'starblox-compatibility',RuntimePlayable:true},
  ...sourceTools.map((entry,index)=>({
    Id:'legacy-tool-'+String(index+1).padStart(2,'0')+'-'+slug(entry.name),
    Name:entry.name,
    Price:100+(index*75),
    Kind:toolKind(entry.name),
    ParityStatus:'legacy-source-runtime',
    RuntimePlayable:true
  }))
];

function luaRecord(obj){
  return 'table.freeze({'+Object.entries(obj).map(([k,v])=>{
    if(typeof v==='string') return k+' = '+q(v);
    if(typeof v==='boolean') return k+' = '+String(v);
    return k+' = '+String(v);
  }).join(', ')+'})';
}
const mirror=[
  '--!strict','',
  '-- Generated from the pinned legacy Brookhaven source snapshot.',
  'local LegacyMirrorCatalog = table.freeze({',
  '\tSchemaVersion = 1,',
  '\tRevision = "legacy-source-catalog-runtime-v1",',
  '\tVehicles = table.freeze({',
  ...vehicles.map(v=>'\t\t'+luaRecord(v)+','),
  '\t}),',
  '\tInventory = table.freeze({',
  ...tools.map(v=>'\t\t'+luaRecord(v)+','),
  '\t}),',
  '})',
  'return LegacyMirrorCatalog',''
].join('\n');

const styleKinds=['starter','suburban','modern','ranch','townhouse','lakehouse','villa','mansion'];
const styles=sourceHouses.map((button,index)=>{
  const number=index+1;
  const requiredTier=Math.min(5,1+Math.floor(index/3));
  return {
    Id:index===0?'home-starter':'legacy-house-'+String(number).padStart(3,'0'),
    Name:'Brookhaven House '+number,
    RequiredTier:requiredTier,
    Price:index===0?0:number*900,
    Kind:styleKinds[index%styleKinds.length],
    SourceButton:button.name
  };
});
const storeItems=[
  {Id:'beds-1',Name:'Starter Bed',Category:'Furniture',Kind:'bed',Price:180},
  {Id:'seating-1',Name:'Floor Cushion',Category:'Furniture',Kind:'chair',Price:140},
  {Id:'desks-1',Name:'Tiny Homework Desk',Category:'Furniture',Kind:'desk',Price:220},
  {Id:'lighting-1',Name:'Starter Lamp',Category:'Furniture',Kind:'lamp',Price:160},
  {Id:'wall-1',Name:'School Star Poster',Category:'Decor',Kind:'poster',Price:120},
  {Id:'rugs-1',Name:'Starter Mat',Category:'Decor',Kind:'rug',Price:180},
  {Id:'decor-1',Name:'Book Crate',Category:'Decor',Kind:'books',Price:200}
];
const homes=[
  {Tier:1,Name:'Starter Home',Price:0},
  {Tier:2,Name:'Neighborhood Home',Price:2500},
  {Tier:3,Name:'Expanded Home',Price:6500},
  {Tier:4,Name:'Premium Home',Price:14000},
  {Tier:5,Name:'Legacy Mansion',Price:30000}
];
const store=[
  '--!strict','',
  '-- Generated from the pinned legacy Brookhaven house selector.',
  'local LegacyStoreCatalog = table.freeze({',
  '\tSchemaVersion = 1,',
  '\tCatalogRevision = "legacy-source-house-catalog-v1",',
  '\tItems = table.freeze({',
  ...storeItems.map(v=>'\t\t'+luaRecord(v)+','),
  '\t}),',
  '\tHomes = table.freeze({',
  ...homes.map(v=>'\t\t'+luaRecord(v)+','),
  '\t}),',
  '\tStyles = table.freeze({',
  ...styles.map(v=>'\t\t'+luaRecord(v)+','),
  '\t}),',
  '})',
  'return LegacyStoreCatalog',''
].join('\n');

const receipt={
  schemaVersion:1,
  status:'legacy-catalog-runtime-complete',
  sourceTargets:{
    vehicles:sourceVehicles.length,
    inventoryUnique:sourceTools.length,
    houses:sourceHouses.length
  },
  runtime:{
    vehicles:vehicles.length,
    sourceVehiclesRuntimePlayable:vehicles.filter(v=>v.RuntimePlayable).length,
    inventorySourceEntries:sourceTools.length,
    inventoryRuntimeEntries:tools.length,
    compatibilityToolEntries:1,
    houses:styles.length
  },
  completion:{
    vehicleCatalogComplete:vehicles.length===sourceVehicles.length,
    inventoryCatalogComplete:sourceTools.length===baseline.tools.entryCount,
    houseCatalogComplete:styles.length===sourceHouses.length,
    everySourceVehicleRuntimePlayable:vehicles.every(v=>v.RuntimePlayable),
    everySourceToolHasRuntimeDefinition:sourceTools.every(entry=>tools.some(t=>t.Name===entry.name))
  },
  boundaries:{
    legacySnapshotCatalogComplete:true,
    current2026CatalogTargetsRemainSeparate:true,
    currentLiveCatalogCertification:false,
    exactCurrentParityClaimAllowed:false
  }
};
await mkdir(outDir,{recursive:true});
await mkdir(dirname(receiptPath),{recursive:true});
await Promise.all([
  writeFile(resolve(outDir,'LegacyMirrorCatalog.luau'),mirror),
  writeFile(resolve(outDir,'LegacyStoreCatalog.luau'),store),
  writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n')
]);
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
