import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

import {deserializeBrookhavenWorldSource} from '../robloxWorld/serializedWorldParser.js';
import {
  buildBrookhavenInteractionCandidateManifest,
  classifyBrookhavenInteractionCandidates,
  worldAxisExtents
} from '../robloxWorld/interactionCandidateAnalysis.js';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

function loadIr(){
  const manifest=JSON.parse(read('research-inputs/brookhaven/world-baseline/AUTHORITATIVE_SOURCE.json'));
  const step3=JSON.parse(read('docs/roblox-world/STEP_3_SAFE_DESERIALIZATION.json')).receipt;
  const source=manifest.repositoryFreeze.chunks
    .slice()
    .sort((a,b)=>Number(a.order)-Number(b.order))
    .map(chunk=>read(chunk.path))
    .join('');
  return deserializeBrookhavenWorldSource(source,{
    sourceSha256:step3.source.sha256,
    step2FingerprintHash:step3.source.step2FingerprintHash
  }).ir;
}

describe('Brookhaven interaction candidate analysis',()=>{
  it('projects local part sizes into world-axis extents',()=>{
    const entry={
      size:[2,4,6],
      cframe:[0,0,0,1,0,0,0,1,0,0,0,1]
    };
    expect(worldAxisExtents(entry)).toEqual([2,4,6]);
  });

  it('finds only explicit Seat classes as native seat interactions',()=>{
    const ir=loadIr();
    const result=classifyBrookhavenInteractionCandidates(ir);
    expect(result.nativeSeats).toHaveLength(271);
    expect(result.vehicleSeats).toHaveLength(2);
    expect(result.nativeSeats.every(item=>item.className==='Seat')).toBe(true);
    expect(result.vehicleSeats.every(item=>item.className==='VehicleSeat')).toBe(true);
  });

  it('locks the geometry-aware review populations for this exact frozen map',()=>{
    const ir=loadIr();
    const result=classifyBrookhavenInteractionCandidates(ir);
    expect(result.doorCandidates).toHaveLength(46);
    expect(result.garageCandidates).toHaveLength(101);
    expect(result.lightCandidates).toHaveLength(111);
    expect(result.doorCandidates.map(item=>item.index).slice(0,5)).toEqual([1306,1309,1314,1422,1428]);
    expect(result.garageCandidates.map(item=>item.index).slice(0,5)).toEqual([163,731,1013,1086,1304]);
    expect(result.lightCandidates.map(item=>item.index).slice(0,5)).toEqual([30,31,45,48,61]);
  });

  it('keeps candidate activation fail-closed',()=>{
    const ir=loadIr();
    const manifest=buildBrookhavenInteractionCandidateManifest(ir,{
      irHash:'sha256:558cb27979f308a171fc33165bddc5ee078326bd4aed4483a1a46f4f7ba8caba'
    });
    expect(manifest.status).toBe('candidate-review-only');
    expect(manifest.safety.geometryMutationStarted).toBe(false);
    expect(manifest.safety.doorActivationAllowed).toBe(false);
    expect(manifest.safety.garageActivationAllowed).toBe(false);
    expect(manifest.safety.lightActivationAllowed).toBe(false);
    expect(manifest.safety.automaticCandidateActivationForbidden).toBe(true);
    expect(manifest.safety.nativeSeatClassesPreserved).toBe(true);
  });
});
