import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=process.cwd();
const manifestPath=resolve(root,'research-inputs/brookhaven/world-baseline/AUTHORITATIVE_SOURCE.json');
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));

const hash=bytes => createHash('sha256').update(bytes).digest('hex');

if(manifest.schemaVersion !== 'starblox-authoritative-world-source-v1'){
  throw new Error('unsupported authoritative world source schema');
}
if(manifest.status !== 'complete-source-frozen'){
  throw new Error('authoritative world source is not frozen');
}
if(manifest.boundaries?.sourceExecuted !== false ||
   manifest.boundaries?.robloxPlaceMutated !== false ||
   manifest.boundaries?.publicationStarted !== false ||
   manifest.boundaries?.liveActivationAllowed !== false){
  throw new Error('Step 1 safety boundary violated');
}

const chunks=[...(manifest.repositoryFreeze?.chunks || [])].sort((a,b)=>a.order-b.order);
if(chunks.length !== 8) throw new Error('expected exactly 8 frozen source chunks');
for(let i=0;i<chunks.length;i++){
  if(chunks[i].order !== i+1) throw new Error('source chunk order is not contiguous');
}

const parts=[];
for(const chunk of chunks){
  const bytes=await readFile(resolve(root,chunk.path));
  if(bytes.length !== chunk.bytes){
    throw new Error(`chunk byte-length drift: ${chunk.path}`);
  }
  const actual=hash(bytes);
  if(actual !== chunk.sha256){
    throw new Error(`chunk SHA-256 drift: ${chunk.path}`);
  }
  parts.push(bytes);
}

const full=Buffer.concat(parts);
const expectedBytes=manifest.source.bytes;
const expectedHash=manifest.source.sha256;

if(full.length !== expectedBytes){
  throw new Error(`reconstructed source length drift: expected ${expectedBytes}, found ${full.length}`);
}
const actualHash=hash(full);
if(actualHash !== expectedHash){
  throw new Error(`reconstructed source SHA-256 drift: expected ${expectedHash}, found ${actualHash}`);
}
if(manifest.repositoryFreeze.reconstructedBytes !== full.length ||
   manifest.repositoryFreeze.reconstructedSha256 !== actualHash ||
   manifest.repositoryFreeze.exactReconstructionVerified !== true){
  throw new Error('manifest reconstruction claim does not match repository bytes');
}

const text=full.toString('utf8');
if(!text.startsWith(manifest.source.firstLine)){
  throw new Error('source title marker mismatch');
}
if(!text.includes('[4936]={')){
  throw new Error('terminal serialized index witness missing');
}
if(!text.trimEnd().endsWith('}')){
  throw new Error('serialized source appears truncated');
}

console.log(JSON.stringify({
  status:'verified',
  source:manifest.source.label,
  revision:manifest.source.gistRevision,
  bytes:full.length,
  sha256:actualHash,
  chunks:chunks.length,
  maximumObservedTopLevelIndex:manifest.source.maximumObservedTopLevelIndex,
  sourceExecuted:false,
  publicationStarted:false
}));
