import {createHash} from 'node:crypto';

export const CURRENT_BROOKHAVEN_STRUCTURE_COMPARE_VERSION=
  'starblox-current-brookhaven-structure-compare-v1';

const SCRIPT_REMOTE_CLASSES=new Set([
  'Script','LocalScript','ModuleScript',
  'RemoteEvent','RemoteFunction','UnreliableRemoteEvent'
]);

const GEOMETRY_CLASSES=new Set([
  'Part','MeshPart','WedgePart','CornerWedgePart','Seat','VehicleSeat',
  'UnionOperation','TrussPart'
]);

function sha256(value){
  return createHash('sha256').update(value).digest('hex');
}

function nodeClass(node){
  return String(node?.class ?? node?.className ?? 'Unknown');
}

function nodeName(node){
  return String(node?.name ?? nodeClass(node));
}

function children(node){
  return Array.isArray(node?.children) ? node.children : [];
}

function walk(node,path=[],rows=[]){
  if(!node || typeof node!=='object') return rows;
  const name=nodeName(node);
  const next=[...path,name];
  rows.push({node,path:next});
  for(const child of children(node)) walk(child,next,rows);
  return rows;
}

function sortedObject(map){
  return Object.fromEntries(
    [...map.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0]))
  );
}

function canonicalTopology(node){
  return {
    className:nodeClass(node),
    name:nodeName(node),
    children:children(node)
      .map(canonicalTopology)
      .sort((a,b)=>
        a.name.localeCompare(b.name) ||
        a.className.localeCompare(b.className) ||
        JSON.stringify(a).localeCompare(JSON.stringify(b))
      )
  };
}

export function profileRobloxDom(dom){
  if(!dom || typeof dom!=='object') throw new Error('Roblox DOM object is required');
  const rows=walk(dom);
  if(rows.length===0) throw new Error('Roblox DOM contains no instances');

  const classCounts=new Map();
  const nameCounts=new Map();
  let geometryCount=0;
  let scriptRemoteCount=0;

  for(const {node} of rows){
    const className=nodeClass(node);
    const name=nodeName(node);
    classCounts.set(className,(classCounts.get(className)||0)+1);
    nameCounts.set(name,(nameCounts.get(name)||0)+1);
    if(GEOMETRY_CLASSES.has(className)) geometryCount++;
    if(SCRIPT_REMOTE_CLASSES.has(className)) scriptRemoteCount++;
  }

  const topology=canonicalTopology(dom);
  return Object.freeze({
    instanceCount:rows.length,
    geometryCount,
    scriptRemoteCount,
    classCounts:Object.freeze(sortedObject(classCounts)),
    duplicateNameCount:[...nameCounts.values()].filter(count=>count>1).length,
    topologySha256:sha256(Buffer.from(JSON.stringify(topology),'utf8'))
  });
}

function deltaObject(reference,candidate){
  const keys=[...new Set([...Object.keys(reference),...Object.keys(candidate)])].sort();
  return Object.fromEntries(keys.map(key=>[
    key,
    Number(candidate[key]||0)-Number(reference[key]||0)
  ]));
}

function allZero(object){
  return Object.values(object).every(value=>Number(value)===0);
}

export function buildCurrentBrookhavenStructureComparison({
  candidateDom,
  referenceDom,
  candidateReceipt
}={}){
  if(candidateReceipt?.status!=='current-live-source-candidate-captured'){
    throw new Error('current-live source candidate receipt is required');
  }
  if(candidateReceipt?.proofState?.candidateIdentityLocked!==true){
    throw new Error('candidate identity must be locked before structural comparison');
  }
  if(candidateReceipt?.authority?.mayReplaceFrozenReference!==false ||
     candidateReceipt?.authority?.mayPublishCandidate!==false){
    throw new Error('candidate receipt authority boundary is unexpectedly permissive');
  }

  const candidate=profileRobloxDom(candidateDom);
  const reference=profileRobloxDom(referenceDom);
  const classCountDelta=deltaObject(reference.classCounts,candidate.classCounts);

  const structuralIdentityMatch=
    candidate.instanceCount===reference.instanceCount &&
    candidate.geometryCount===reference.geometryCount &&
    candidate.scriptRemoteCount===reference.scriptRemoteCount &&
    allZero(classCountDelta) &&
    candidate.topologySha256===reference.topologySha256;

  return Object.freeze({
    schemaVersion:1,
    version:CURRENT_BROOKHAVEN_STRUCTURE_COMPARE_VERSION,
    status:'current-live-structure-compared',
    candidateSource:Object.freeze({
      sha256:candidateReceipt.candidate.sha256,
      bytes:candidateReceipt.candidate.bytes,
      format:candidateReceipt.candidate.format,
      placeId:candidateReceipt.provenance.placeId,
      placeVersion:candidateReceipt.provenance.placeVersion,
      capturedAt:candidateReceipt.provenance.capturedAt
    }),
    referenceSource:Object.freeze({
      sha256:candidateReceipt.frozenReference.sourceSha256
    }),
    candidate,
    reference,
    differences:Object.freeze({
      instanceCountDelta:candidate.instanceCount-reference.instanceCount,
      geometryCountDelta:candidate.geometryCount-reference.geometryCount,
      scriptRemoteCountDelta:candidate.scriptRemoteCount-reference.scriptRemoteCount,
      classCountDelta:Object.freeze(classCountDelta),
      topologyMatches:candidate.topologySha256===reference.topologySha256
    }),
    proofState:Object.freeze({
      structuralComparisonCompleted:true,
      structuralIdentityMatch,
      structuralParityVerified:structuralIdentityMatch,
      renderedParityVerified:false,
      behaviorParityVerified:false,
      exactParityClaimAllowed:false
    }),
    authority:Object.freeze({
      mayReplaceFrozenReference:false,
      mayPublishCandidate:false,
      publicAccessChangeAllowed:false,
      productionActivationAllowed:false
    }),
    nextStep:structuralIdentityMatch
      ? 'run-rendered-and-behavioral-current-live-parity-proof'
      : 'review-structural-differences-before-any-source-replacement'
  });
}
