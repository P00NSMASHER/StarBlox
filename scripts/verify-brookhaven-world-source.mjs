import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=process.cwd();
const manifestPath=resolve(root,'research-inputs/brookhaven/world-baseline/WORLD_SOURCE_MANIFEST.json');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));

function sha256(bytes){
  return createHash('sha256').update(bytes).digest('hex');
}

if(manifest.schemaVersion !== 1) throw new Error('unsupported world source manifest schema');
if(manifest.status !== 'complete-pinned-serialized-world-source') throw new Error('world source baseline is not complete');
if(manifest.scope?.exactCurrentLiveBrookhavenPlaceParityClaimed !== false){
  throw new Error('Step 1 must not overclaim live-place parity');
}
if(manifest.boundaries?.publicationStarted !== false || manifest.boundaries?.liveActivationAllowed !== false){
  throw new Error('Step 1 publication/live-activation boundary violated');
}

const ordered=[...(manifest.storage?.chunks || [])].sort((a,b)=>a.index-b.index);
if(ordered.length !== 8) throw new Error('expected exactly 8 world-source chunks');
for(let i=0;i<ordered.length;i++){
  if(ordered[i].index !== i+1) throw new Error('world-source chunk indexes are not contiguous');
}

const pieces=[];
for(const chunk of ordered){
  const bytes=await readFile(resolve(root,chunk.path));
  if(bytes.length !== chunk.bytes){
    throw new Error(`world-source chunk size drift: ${chunk.path}`);
  }
  const actual=sha256(bytes);
  if(actual !== chunk.sha256){
    throw new Error(`world-source chunk hash drift: ${chunk.path}`);
  }
  pieces.push(bytes);
}

const full=Buffer.concat(pieces);
if(full.length !== manifest.identity.bytes){
  throw new Error(`world-source byte length drift: expected ${manifest.identity.bytes}, found ${full.length}`);
}
const fullHash=sha256(full);
if(fullHash !== manifest.identity.sha256){
  throw new Error(`world-source hash drift: expected ${manifest.identity.sha256}, found ${fullHash}`);
}
if(!full.toString('utf8',0,64).startsWith(manifest.source.titleMarker)){
  throw new Error('world-source title marker mismatch');
}
const text=full.toString('utf8');
if(!text.includes('[4936]={')){
  throw new Error('world-source terminal top-level index witness missing');
}
if(!text.trimEnd().endsWith('}')){
  throw new Error('world-source payload appears truncated');
}

console.log(JSON.stringify({
  status:'verified',
  baselineId:manifest.baselineId,
  bytes:full.length,
  sha256:fullHash,
  chunks:ordered.length,
  highestObservedTopLevelIndex:manifest.identity.highestObservedTopLevelIndex,
  publicationStarted:false
}));
