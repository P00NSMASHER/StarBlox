import {createHash} from 'node:crypto';
import {cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {dirname,relative,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

function arg(name,required=false){
  const inline=process.argv.find(v=>v.startsWith(name+'='));
  const value=inline?inline.slice(name.length+1):(()=>{
    const i=process.argv.indexOf(name);
    return i>=0?process.argv[i+1]:null;
  })();
  if(required&&!value) throw new Error(name+' is required');
  return value;
}
function run(command,args,label,{capture=false}={}){
  const result=spawnSync(command,args,{cwd:process.cwd(),encoding:'utf8',maxBuffer:256*1024*1024});
  if(result.error) throw new Error(label+' could not start: '+result.error.message);
  if(result.status!==0) throw new Error(label+' failed ('+result.status+'): '+String(result.stderr||result.stdout||'').trim());
  return capture?String(result.stdout||''):'';
}
function sha256(bytes){return createHash('sha256').update(bytes).digest('hex');}
function nodeClass(n){return String(n?.class??n?.className??'Unknown');}
function nodeName(n){return String(n?.name??nodeClass(n));}
function kids(n){return Array.isArray(n?.children)?n.children:[];}
function walk(n,path=[],rows=[]){
  if(!n||typeof n!=='object') return rows;
  const next=[...path,nodeName(n)];
  rows.push({node:n,path:next});
  for(const c of kids(n)) walk(c,next,rows);
  return rows;
}
function pathEndsWith(path,suffix){
  return path.length>=suffix.length&&suffix.every((v,i)=>path[path.length-suffix.length+i]===v);
}

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const sourceCommit=String(arg('--source-commit',true)).toLowerCase();
if(!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error('--source-commit must be a 40-character Git SHA');
const outDir=resolve(arg('--out-dir')||'artifacts/legacy-brookhaven-development');
const robloxRoot=resolve(root,'roblox');
const tempRoot=resolve(robloxRoot,'.legacy-candidate');
const tempShared=resolve(robloxRoot,'.legacy-candidate-shared');
const projectPath=resolve(robloxRoot,'.legacy-candidate.project.json');

await Promise.all([
  rm(outDir,{recursive:true,force:true}),
  rm(tempRoot,{recursive:true,force:true}),
  rm(tempShared,{recursive:true,force:true}),
  rm(projectPath,{force:true})
]);
await mkdir(outDir,{recursive:true});
await mkdir(tempRoot,{recursive:true});

const legacyFile=resolve(outDir,'Brookhaven-2024-github.rbxl');
const acquisitionPath=resolve(outDir,'legacy-acquisition.json');
run(process.execPath,[
  resolve(root,'scripts/fetch-legacy-brookhaven-reference.mjs'),
  '--out',legacyFile,
  '--receipt',acquisitionPath
],'fetch legacy Brookhaven');

const baselinePath=resolve(tempRoot,'BrookhavenWorldBaseline.rbxmx');
const sanitizationPath=resolve(outDir,'legacy-geometry-sanitization.json');
run('cargo',[
  'run','--quiet','--manifest-path','tools/roblox_catalog_reader/Cargo.toml',
  '--bin','geometry_sanitizer','--',
  legacyFile,baselinePath,sanitizationPath
],'sanitize legacy Brookhaven geometry');

const legacyDomPath=resolve(outDir,'legacy-dom.json');
await writeFile(
  legacyDomPath,
  run('cargo',[
    'run','--quiet','--manifest-path','tools/roblox_catalog_reader/Cargo.toml',
    '--bin','starblox-roblox-catalog-reader','--',legacyFile
  ],'read legacy Roblox DOM',{capture:true})
);

await cp(resolve(robloxRoot,'src/shared'),tempShared,{recursive:true});

const catalogBaselinePath=resolve(outDir,'legacy-catalog-baseline.json');
const catalogCompletionPath=resolve(outDir,'legacy-catalog-completion.json');
run(process.execPath,[
  resolve(root,'scripts/derive-legacy-brookhaven-catalog-baseline.mjs'),
  '--dom',legacyDomPath,
  '--out',catalogBaselinePath
],'derive legacy catalog baseline');
run(process.execPath,[
  resolve(root,'scripts/generate-legacy-brookhaven-catalog-modules.mjs'),
  '--baseline',catalogBaselinePath,
  '--out-dir',tempShared,
  '--receipt',catalogCompletionPath
],'generate legacy catalog modules');

run(process.execPath,[
  resolve(root,'scripts/generate-legacy-brookhaven-runtime-bindings.mjs'),
  '--dom',legacyDomPath,
  '--spawn-reference',resolve(root,'docs/roblox-world/LEGACY_BROOKHAVEN_SPAWN_REFERENCE.json'),
  '--out-dir',tempShared,
  '--manifest',resolve(outDir,'legacy-binding-manifest.json')
],'generate legacy runtime bindings');

const mirrorConfigPath=resolve(tempShared,'BrookhavenMirrorConfig.luau');
let config=await readFile(mirrorConfigPath,'utf8');
if(!config.includes('Mode = "exact-frozen-brookhaven-world"')){
  throw new Error('BrookhavenMirrorConfig world-mode source drift');
}
config=config
  .replace('Mode = "exact-frozen-brookhaven-world"','Mode = "legacy-reference-safe-world"')
  .replace('Revision = "recording-parity-shell-catalog-reference-v3"','Revision = "legacy-reference-safe-world-candidate-v1"');
await writeFile(mirrorConfigPath,config);

const baseProject=JSON.parse(await readFile(resolve(robloxRoot,'default.project.json'),'utf8'));
baseProject.name='StarBloxLegacyBrookhavenDevelopmentCandidate';
baseProject.tree.ReplicatedStorage.StarBlox={$path:'.legacy-candidate-shared'};
baseProject.tree.ServerStorage=baseProject.tree.ServerStorage||{};
baseProject.tree.ServerStorage.BrookhavenWorldBaseline={$path:'.legacy-candidate/BrookhavenWorldBaseline.rbxmx'};
await writeFile(projectPath,JSON.stringify(baseProject,null,2)+'\n');

const placePath=resolve(outDir,'StarBlox-Legacy-Brookhaven-Development.rbxlx');
const rojo=process.platform==='win32'?'rojo.exe':'rojo';
run(rojo,['build',projectPath,'--output',placePath],'build legacy Brookhaven development candidate');

const candidateDomPath=resolve(outDir,'candidate-dom.json');
await writeFile(
  candidateDomPath,
  run('cargo',[
    'run','--quiet','--manifest-path','tools/roblox_catalog_reader/Cargo.toml',
    '--bin','starblox-roblox-catalog-reader','--',placePath
  ],'read candidate Roblox DOM',{capture:true})
);

const dom=JSON.parse(await readFile(candidateDomPath,'utf8'));
const rows=walk(dom);
const witnessRows=rows.filter(r=>nodeName(r.node)==='BrookhavenWorldBaseline');
if(witnessRows.length!==1) throw new Error('candidate expected exactly one BrookhavenWorldBaseline');
const witness=witnessRows[0];
if(!pathEndsWith(witness.path,['ServerStorage','BrookhavenWorldBaseline'])){
  throw new Error('legacy witness is not under ServerStorage');
}
const witnessRowsAll=walk(witness.node);
const geometryClasses=new Set(['Part','MeshPart','WedgePart','CornerWedgePart','UnionOperation','TrussPart','Seat','VehicleSeat']);
const forbiddenClasses=new Set(['Script','LocalScript','ModuleScript','RemoteEvent','RemoteFunction','UnreliableRemoteEvent','ClickDetector','ProximityPrompt']);
const geometryCount=witnessRowsAll.filter(r=>geometryClasses.has(nodeClass(r.node))).length;
const forbiddenCount=witnessRowsAll.filter(r=>forbiddenClasses.has(nodeClass(r.node))).length;
if(geometryCount!==14459) throw new Error('candidate legacy geometry count drift: '+geometryCount);
if(forbiddenCount!==0) throw new Error('candidate legacy witness contains forbidden gameplay classes');

const runtimePaths=[
  ['ReplicatedStorage','StarBlox'],
  ['ServerScriptService','StarBlox'],
  ['StarterPlayer','StarterPlayerScripts','StarBlox']
];
for(const suffix of runtimePaths){
  if(!rows.some(r=>pathEndsWith(r.path,suffix))) throw new Error('candidate missing runtime mount '+suffix.join('/'));
}
if(rows.some(r=>nodeName(r.node)==='BrookhavenWorldRuntime')){
  throw new Error('runtime projection must not exist in the static candidate');
}

const [artifactBytes,baselineBytes,sanitization,bindings,catalogCompletion]=await Promise.all([
  readFile(placePath),
  readFile(baselinePath),
  readFile(sanitizationPath,'utf8').then(JSON.parse),
  readFile(resolve(outDir,'legacy-binding-manifest.json'),'utf8').then(JSON.parse),
  readFile(catalogCompletionPath,'utf8').then(JSON.parse)
]);
if(sanitization.output.sha256!==sha256(baselineBytes)) throw new Error('baseline SHA drift after candidate build');
if(bindings.status!=='legacy-runtime-bindings-generated') throw new Error('legacy bindings did not generate');

const receipt={
  schemaVersion:1,
  status:'legacy-brookhaven-development-candidate-ready',
  sourceCommit,
  source:{
    classification:'legacy_reference_source',
    upstreamSha256:(await readFile(acquisitionPath,'utf8').then(JSON.parse)).source.sha256
  },
  artifact:{
    path:relative(root,placePath).replaceAll('\\','/'),
    bytes:artifactBytes.length,
    sha256:sha256(artifactBytes)
  },
  world:{
    witnessLocation:'ServerStorage/BrookhavenWorldBaseline',
    sanitizedBaselineSha256:sha256(baselineBytes),
    geometryCount,
    forbiddenGameplayClassCount:forbiddenCount,
    runtimeProjectionCreatedAtBoot:true,
    runtimeProjectionPresentInStaticArtifact:false
  },
  bindings:{
    mode:'legacy-reference-safe-world',
    doors:bindings.interactions.counts.doors,
    garages:bindings.interactions.counts.garages,
    lights:bindings.interactions.counts.lights,
    plots:bindings.plots.count,
    spawnSource:bindings.spawn.generatedName
  },
  catalogs:{
    sourceTargets:catalogCompletion.sourceTargets,
    runtime:catalogCompletion.runtime,
    completion:catalogCompletion.completion
  },
  runtime:{
    mounts:runtimePaths.map(x=>x.join('/')),
    mountCount:runtimePaths.length
  },
  authority:{
    developmentUseAllowed:true,
    privatePlaytestCandidate:true,
    currentLiveCertificationSatisfied:false,
    exactCurrentParityClaimAllowed:false,
    publicAccessChangeAllowed:false,
    productionActivationAllowed:false
  }
};
await writeFile(resolve(outDir,'candidate-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
