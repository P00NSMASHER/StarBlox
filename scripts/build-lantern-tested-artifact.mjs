import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const island=path.join(repo,'lantern-island');
const manifestPath=path.join(island,'release','tested-release-manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

for(const rel of manifest.appendTrailingLf||[]){
  const file=path.join(island,rel);
  const bytes=fs.readFileSync(file);
  if(bytes.length===0||bytes[bytes.length-1]!==10){
    fs.appendFileSync(file,'\n');
  }
}

const actualHashes={};
for(const [rel,expected] of Object.entries(manifest.sourceHashes)){
  const bytes=fs.readFileSync(path.join(island,rel));
  const actual=sha(bytes);
  if(actual!==expected){
    throw new Error('tested input hash mismatch: '+rel+' expected='+expected+' actual='+actual);
  }
  actualHashes[rel]=actual;
}
const fingerprint=sha(Buffer.from(JSON.stringify(actualHashes)));
if(fingerprint!==manifest.sourceFingerprint){
  throw new Error('source fingerprint mismatch: '+fingerprint);
}

const projectPath=path.join(island,'default.project.json');
const project=JSON.parse(fs.readFileSync(projectPath,'utf8'));
if(JSON.stringify(project.servePlaceIds)!=='[0]'){
  throw new Error('unexpected project servePlaceIds');
}
const identity=project?.tree?.ServerScriptService?.LanternIslandServer?.BuildIdentity;
if(!identity?.$properties) throw new Error('BuildIdentity mapping missing');
identity.$properties.Value=fingerprint;

const tempProject=path.join(island,'.ci-release.project.json');
const dist=path.join(island,'dist');
const artifact=path.join(island,manifest.artifact.path);
fs.mkdirSync(dist,{recursive:true});
fs.writeFileSync(tempProject,JSON.stringify(project,null,2));

function run(exe,args){
  const result=spawnSync(exe,args,{cwd:island,encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});
  if(result.error||result.status!==0){
    throw new Error(exe+' failed: '+(result.error?.message||'')+'\n'+(result.stdout||'')+'\n'+(result.stderr||''));
  }
  return (result.stdout||'')+(result.stderr||'');
}

try{
  const version=run('rojo',['--version']).trim();
  if(!version.includes('7.7.0')) throw new Error('expected Rojo 7.7.0, got '+version);
  run('rojo',['build',tempProject,'-o',artifact]);
}finally{
  fs.rmSync(tempProject,{force:true});
}

const artifactBytes=fs.readFileSync(artifact);
const artifactSha=sha(artifactBytes);
if(artifactSha!==manifest.artifact.sha256){
  throw new Error('artifact hash mismatch expected='+manifest.artifact.sha256+' actual='+artifactSha);
}
if(artifactBytes.length!==manifest.artifact.bytes){
  throw new Error('artifact byte count mismatch expected='+manifest.artifact.bytes+' actual='+artifactBytes.length);
}
const xml=artifactBytes.toString('utf8');
for(const marker of ['LanternIslandServer','TargetPolicy','LanternIslandClient']){
  if(!xml.includes('<string name="Name">'+marker+'</string>')){
    throw new Error('artifact missing required instance '+marker);
  }
}
if(!xml.includes(fingerprint)) throw new Error('artifact missing tested BuildIdentity fingerprint');
for(const forbidden of ['CurrentNativeProbe','ReleaseNativeProbe','MobileNativeProbe','VisualNativeProbe']){
  if(xml.includes(forbidden)) throw new Error('artifact contains QA-only instance '+forbidden);
}

const receipt={
  schemaVersion:1,
  status:'exact-tested-artifact-reproduced',
  productionSourceCommit:manifest.productionSourceCommit,
  sourceFingerprint:fingerprint,
  artifact:{path:path.relative(repo,artifact).replaceAll('\\','/'),sha256:artifactSha,bytes:artifactBytes.length},
  inputCount:Object.keys(actualHashes).length,
  target:manifest.target,
  rojo:'7.7.0'
};
fs.writeFileSync(path.join(dist,'ci-repro-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
