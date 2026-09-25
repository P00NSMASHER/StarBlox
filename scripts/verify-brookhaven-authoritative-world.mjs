import { createHash } from 'node:crypto';
import {
  lstat,
  readFile,
  writeFile
} from 'node:fs/promises';
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep
} from 'node:path';
import { fileURLToPath } from 'node:url';

export const BROOKHAVEN_WORLD_FINGERPRINT_SCHEMA_VERSION=1;
export const BROOKHAVEN_WORLD_FINGERPRINT_VERSION='starblox-brookhaven-world-fingerprint-v1';

function sha256(data){
  return createHash('sha256').update(data).digest('hex');
}

function safeResolve(base,path,label){
  if(typeof path !== 'string' || !path.trim()){
    throw new Error(label + ' path is required');
  }
  if(isAbsolute(path)){
    throw new Error(label + ' must be repository-relative');
  }
  const root=resolve(base);
  const candidate=resolve(root,path);
  const rel=relative(root,candidate);
  if(rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)){
    throw new Error(label + ' escapes repository root');
  }
  return candidate;
}

async function exactFile(path,label){
  const info=await lstat(path);
  if(info.isSymbolicLink()){
    throw new Error(label + ' may not be a symbolic link');
  }
  if(!info.isFile()){
    throw new Error(label + ' must be a file');
  }
  const data=await readFile(path);
  return {data,bytes:data.length,sha256:sha256(data)};
}

function finite(value,label){
  const number=Number(value);
  if(!Number.isFinite(number)){
    throw new Error(label + ' is not finite');
  }
  return number;
}

function numericPattern(){
  return '(-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?)';
}

function positionBounds(text){
  const n=numericPattern();
  const pattern=new RegExp(
    'position=\\{\\[1\\]=' + n +
    ';\\[2\\]=' + n +
    ';\\[3\\]=' + n +
    ';\\};',
    'g'
  );
  const min=[Infinity,Infinity,Infinity];
  const max=[-Infinity,-Infinity,-Infinity];
  let count=0;
  let match;
  while((match=pattern.exec(text))){
    const values=[
      finite(match[1],'position.x'),
      finite(match[2],'position.y'),
      finite(match[3],'position.z')
    ];
    for(let i=0;i<3;i++){
      min[i]=Math.min(min[i],values[i]);
      max[i]=Math.max(max[i],values[i]);
    }
    count++;
  }
  return {
    count,
    min:count ? min : null,
    max:count ? max : null
  };
}

function sizeBounds(text){
  const n=numericPattern();
  const pattern=new RegExp(
    'size=\\{\\[1\\]=' + n +
    ';\\[2\\]=' + n +
    ';\\[3\\]=' + n +
    ';\\};',
    'g'
  );
  const min=[Infinity,Infinity,Infinity];
  const max=[-Infinity,-Infinity,-Infinity];
  let count=0;
  let match;
  while((match=pattern.exec(text))){
    const values=[
      finite(match[1],'size.x'),
      finite(match[2],'size.y'),
      finite(match[3],'size.z')
    ];
    for(let i=0;i<3;i++){
      min[i]=Math.min(min[i],values[i]);
      max[i]=Math.max(max[i],values[i]);
    }
    count++;
  }
  return {
    count,
    min:count ? min : null,
    max:count ? max : null
  };
}

function sortedCounts(pattern,text){
  const counts=new Map();
  let match;
  while((match=pattern.exec(text))){
    const key=String(match[1]);
    counts.set(key,(counts.get(key) || 0) + 1);
  }
  return Object.fromEntries(
    [...counts.entries()].sort((a,b) =>
      b[1]-a[1] || a[0].localeCompare(b[0])
    )
  );
}

function numericSequenceFingerprint(text,field,arity){
  const n='(-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?)';
  const fields=Array.from({length:arity},(_,index) =>
    '\\[' + (index+1) + '\\]=' + n + ';'
  ).join('');
  const pattern=new RegExp(field + '=\\{' + fields + '\\};','g');
  const rows=[];
  let match;
  while((match=pattern.exec(text))){
    rows.push(match.slice(1).join(','));
  }
  return {
    count:rows.length,
    sequenceSha256:sha256(Buffer.from(rows.join('\n'),'utf8'))
  };
}

function primaryMaterialCounts(text){
  return sortedCounts(
    /transparency=-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?;texture="([^"]+)";position=\{/g,
    text
  );
}

function primaryColorSequenceFingerprint(text){
  const scalar='-?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
  const n='(' + scalar + ')';
  const pattern=new RegExp(
    'reflectance=' + scalar +
    ';color=\\{\\[1\\]=' + n +
    ';\\[2\\]=' + n +
    ';\\[3\\]=' + n +
    ';\\};\\s*anchored=(?:true|false);',
    'g'
  );
  const rows=[];
  let match;
  while((match=pattern.exec(text))){
    rows.push(match.slice(1,4).join(','));
  }
  return {
    count:rows.length,
    sequenceSha256:sha256(Buffer.from(rows.join('\n'),'utf8'))
  };
}

function extractAssetIds(text){
  const ids=new Set();
  for(const pattern of [
    /rbxassetid:\/\/(\d+)/gi,
    /(?:asset\/\?id=|asset\?id=|library\/)(\d+)/gi
  ]){
    let match;
    while((match=pattern.exec(text))){
      ids.add(match[1]);
    }
  }
  return [...ids].sort((a,b) =>
    a.length-b.length || a.localeCompare(b)
  );
}

function topLevelEntryMarkers(text){
  const indices=[];
  const pattern=/(?:^|\n)(?:return \{)?\[(\d+)\]=\{/g;
  let match;
  while((match=pattern.exec(text))){
    indices.push(Number(match[1]));
  }
  return indices;
}

function sourceStructure(text){
  const entryIndices=topLevelEntryMarkers(text);
  const uniqueIndices=[...new Set(entryIndices)].sort((a,b) => a-b);
  const maxIndex=uniqueIndices.length ? uniqueIndices.at(-1) : 0;
  const minIndex=uniqueIndices.length ? uniqueIndices[0] : 0;
  const missingIndices=[];
  for(let index=1;index<=maxIndex;index++){
    if(!uniqueIndices.includes(index)) missingIndices.push(index);
  }
  const assetIds=extractAssetIds(text);
  const shapes=sortedCounts(/shape="([^"]+)";/g,text);
  const materials=primaryMaterialCounts(text);
  const surfaces=sortedCounts(
    /(?:Top|Front|Bottom|Right|Left|Back)="([^"]+)";/g,
    text
  );

  return {
    entryMarkers:{
      count:entryIndices.length,
      uniqueCount:uniqueIndices.length,
      minimumIndex:minIndex || null,
      maximumIndex:maxIndex || null,
      duplicateCount:entryIndices.length-uniqueIndices.length,
      missingIndices:missingIndices.slice(0,100),
      missingIndexCount:missingIndices.length,
      contiguousFromOne:Boolean(
        uniqueIndices.length &&
        minIndex === 1 &&
        uniqueIndices.length === maxIndex &&
        missingIndices.length === 0
      ),
      indexSequenceSha256:sha256(
        Buffer.from(entryIndices.join(','),'utf8')
      )
    },
    positions:positionBounds(text),
    positionSequence:numericSequenceFingerprint(text,'position',3),
    sizes:sizeBounds(text),
    sizeSequence:numericSequenceFingerprint(text,'size',3),
    cframes:numericSequenceFingerprint(text,'cframe',12),
    colors:primaryColorSequenceFingerprint(text),
    shapeCounts:shapes,
    primaryMaterialCounts:materials,
    surfaceCounts:surfaces,
    assetReferences:{
      uniqueCount:assetIds.length,
      sortedIdsSha256:sha256(
        Buffer.from(assetIds.join(','),'utf8')
      ),
      first20:assetIds.slice(0,20)
    },
    lexicalCounts:{
      decalBlocks:(text.match(/decal=\{/g) || []).length,
      meshBlocks:(text.match(/mesh=\{/g) || []).length,
      anchoredTrue:(text.match(/anchored=true;/g) || []).length,
      anchoredFalse:(text.match(/anchored=false;/g) || []).length,
      canCollideTrue:(text.match(/cancollide=true;/g) || []).length,
      canCollideFalse:(text.match(/cancollide=false;/g) || []).length,
      enumReferences:(text.match(/Enum\./g) || []).length
    }
  };
}

function fingerprintPayload(receipt){
  return {
    schemaVersion:receipt.schemaVersion,
    version:receipt.version,
    status:receipt.status,
    authoritativeManifest:receipt.authoritativeManifest,
    source:receipt.source,
    chunks:receipt.chunks,
    structure:receipt.structure,
    metadataDiscrepancies:receipt.metadataDiscrepancies,
    boundaries:receipt.boundaries,
    nextStep:receipt.nextStep
  };
}

export async function verifyBrookhavenAuthoritativeWorld({
  repositoryRoot,
  manifestPath
}){
  const root=resolve(repositoryRoot);
  const manifestAbs=safeResolve(root,manifestPath,'authoritative manifest');
  const manifestFile=await exactFile(manifestAbs,'authoritative manifest');
  const manifest=JSON.parse(manifestFile.data.toString('utf8'));

  if(manifest.schemaVersion !== 'starblox-authoritative-world-source-v1'){
    throw new Error('unsupported authoritative Brookhaven source schema');
  }
  if(manifest.status !== 'complete-source-frozen'){
    throw new Error('authoritative Brookhaven source is not frozen/complete');
  }
  if(manifest.source?.type !== 'serialized-lua-world-table'){
    throw new Error('unexpected authoritative Brookhaven source type');
  }
  if(manifest.rights?.projectStatus !== 'verified-for-project-use'){
    throw new Error('authoritative Brookhaven source rights are not project-verified');
  }
  if(manifest.boundaries?.sourceExecuted !== false){
    throw new Error('authoritative source boundary must attest sourceExecuted=false');
  }

  const chunks=[...(manifest.repositoryFreeze?.chunks || [])]
    .sort((a,b) => Number(a.order)-Number(b.order));
  if(!chunks.length){
    throw new Error('authoritative Brookhaven source contains no frozen chunks');
  }

  const seenOrders=new Set();
  const chunkEvidence=[];
  const buffers=[];
  for(let i=0;i<chunks.length;i++){
    const expected=chunks[i];
    const order=Number(expected.order);
    if(!Number.isInteger(order) || order !== i+1 || seenOrders.has(order)){
      throw new Error('authoritative Brookhaven chunk ordering is invalid');
    }
    seenOrders.add(order);

    const path=safeResolve(root,expected.path,'authoritative Brookhaven chunk');
    const file=await exactFile(path,'authoritative Brookhaven chunk ' + order);
    if(file.bytes !== Number(expected.bytes)){
      throw new Error(
        'Brookhaven chunk ' + order + ' byte mismatch; expected ' +
        expected.bytes + ' but found ' + file.bytes
      );
    }
    if(file.sha256 !== expected.sha256){
      throw new Error(
        'Brookhaven chunk ' + order + ' SHA-256 mismatch; expected ' +
        expected.sha256 + ' but found ' + file.sha256
      );
    }

    chunkEvidence.push({
      order,
      path:expected.path,
      bytes:file.bytes,
      sha256:file.sha256
    });
    buffers.push(file.data);
  }

  const reconstructed=Buffer.concat(buffers);
  const reconstructedSha256=sha256(reconstructed);
  const expectedBytes=Number(manifest.repositoryFreeze?.reconstructedBytes);
  const expectedSha=String(manifest.repositoryFreeze?.reconstructedSha256 || '');
  if(reconstructed.length !== expectedBytes){
    throw new Error(
      'reconstructed Brookhaven source byte mismatch; expected ' +
      expectedBytes + ' but found ' + reconstructed.length
    );
  }
  if(reconstructedSha256 !== expectedSha){
    throw new Error(
      'reconstructed Brookhaven source SHA-256 mismatch; expected ' +
      expectedSha + ' but found ' + reconstructedSha256
    );
  }
  if(
    reconstructed.length !== Number(manifest.source?.bytes) ||
    reconstructedSha256 !== manifest.source?.sha256
  ){
    throw new Error('reconstructed Brookhaven source does not match source manifest');
  }

  const asciiOnly=[...reconstructed].every(byte => byte <= 0x7f);
  if(asciiOnly !== Boolean(manifest.source?.asciiOnly)){
    throw new Error('Brookhaven source ASCII boundary does not match manifest');
  }
  const text=reconstructed.toString('ascii');
  const firstLine=text.split(/\r?\n/,1)[0];
  if(firstLine !== manifest.source?.firstLine){
    throw new Error('Brookhaven source first line does not match manifest');
  }
  if(!text.startsWith('-- Brookhaven Map\nreturn {')){
    throw new Error('Brookhaven source header/body prefix is unexpected');
  }

  const structure=sourceStructure(text);
  if(
    structure.entryMarkers.maximumIndex !==
      Number(manifest.source?.maximumObservedTopLevelIndex)
  ){
    throw new Error(
      'Brookhaven maximum top-level entry index changed; expected ' +
      manifest.source.maximumObservedTopLevelIndex + ' but found ' +
      structure.entryMarkers.maximumIndex
    );
  }
  if(
    structure.entryMarkers.contiguousFromOne !== true ||
    structure.entryMarkers.duplicateCount !== 0
  ){
    throw new Error(
      'Brookhaven top-level entry sequence is not a unique contiguous 1..N sequence'
    );
  }

  const declaredMarkerCount=Number(manifest.source?.observedTopLevelEntryMarkers);
  const metadataDiscrepancies=[];
  if(structure.entryMarkers.count !== declaredMarkerCount){
    metadataDiscrepancies.push({
      field:'source.observedTopLevelEntryMarkers',
      manifestValue:declaredMarkerCount,
      verifiedValue:structure.entryMarkers.count,
      resolution:
        'non-normative observation differs from exact frozen bytes; ' +
        'source SHA-256/byte freeze remains authoritative'
    });
  }

  const base={
    schemaVersion:BROOKHAVEN_WORLD_FINGERPRINT_SCHEMA_VERSION,
    version:BROOKHAVEN_WORLD_FINGERPRINT_VERSION,
    status:'verified-immutable-source',
    authoritativeManifest:{
      path:manifestPath,
      sha256:manifestFile.sha256,
      bytes:manifestFile.bytes,
      recordedAt:manifest.recordedAt,
      gistRevision:manifest.source.gistRevision
    },
    source:{
      label:manifest.source.label,
      type:manifest.source.type,
      bytes:reconstructed.length,
      sha256:reconstructedSha256,
      asciiOnly,
      firstLine,
      rightsStatus:manifest.rights.projectStatus
    },
    chunks:chunkEvidence,
    structure,
    metadataDiscrepancies,
    boundaries:{
      sourceExecuted:false,
      sourceEvaluatedAsLua:false,
      sourceInsertedIntoStudio:false,
      robloxPlaceMutated:false,
      publicationStarted:false,
      liveActivationAllowed:false
    },
    nextStep:'target-architecture-3-safe-world-deserialization'
  };

  return Object.freeze({
    ...base,
    fingerprintHash:'sha256:' + sha256(
      Buffer.from(JSON.stringify(base),'utf8')
    )
  });
}

function arg(name,def=null){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  if(inline) return inline.slice(name.length + 1);
  const index=process.argv.indexOf(name);
  if(index >= 0 && process.argv[index+1] && !process.argv[index+1].startsWith('--')){
    return process.argv[index+1];
  }
  return def;
}

const thisFile=fileURLToPath(import.meta.url);
if(process.argv[1] && resolve(process.argv[1]) === resolve(thisFile)){
  const repositoryRoot=resolve(dirname(thisFile),'..');
  const manifestPath=arg(
    '--manifest',
    'research-inputs/brookhaven/world-baseline/AUTHORITATIVE_SOURCE.json'
  );
  const out=arg('--out',null);
  const receipt=await verifyBrookhavenAuthoritativeWorld({
    repositoryRoot,
    manifestPath
  });
  const json=JSON.stringify(receipt,null,2) + '\n';
  if(out) await writeFile(resolve(out),json);
  process.stdout.write(json);
}
