import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

export const BROOKHAVEN_WORLD_EXACTNESS_VERSION='starblox-brookhaven-world-exactness-v1';

function sha256(data){
  return createHash('sha256').update(data).digest('hex');
}
function fail(message){
  throw new Error('Step 5 world exactness: '+message);
}
function expectedProperties(entry){
  const reflectance=entry.index === 832 ? 1 : entry.reflectance;
  const mesh=entry.mesh ? {
    ...entry.mesh,
    vertexColor:entry.index === 844 ? [1,1,1] : [...entry.mesh.vertexColor]
  } : null;
  return {
    anchored:entry.anchored,
    surfaces:entry.surface,
    color:entry.color,
    cframe:entry.cframe,
    canCollide:entry.canCollide,
    locked:entry.locked,
    material:entry.material,
    reflectance,
    transparency:entry.transparency,
    shape:entry.shape,
    size:entry.size,
    decal:entry.decal,
    mesh
  };
}
function expectedSpec(entry){
  return {
    entryIndex:entry.index,
    className:entry.className,
    name:'BHW_'+String(entry.index).padStart(4,'0'),
    sourceCanonicalHash:entry.canonicalHash,
    sourceSliceSha256:entry.sourceSliceSha256,
    generatedProperties:expectedProperties(entry)
  };
}

export function verifyBrookhavenWorldExactness({
  ir,
  generation,
  step3Receipt,
  step4Receipt
}={}){
  const lockedStep4=step4Receipt?.receipt ?? step4Receipt;
  if(ir?.version !== 'starblox-brookhaven-world-ir-v1' || ir?.entryCount !== 4936 || ir.entries?.length !== 4936){
    fail('requires the complete verified Step 3 IR');
  }
  if(step3Receipt?.ir?.irHash !== ir.irHash){
    fail('Step 3 receipt does not bind the supplied IR');
  }
  if(!generation || typeof generation.xml !== 'string' || !Array.isArray(generation.objectSpecs)){
    fail('live Step 4 generation output is required');
  }
  if(!lockedStep4?.output?.sha256 || lockedStep4?.status !== 'generated-isolated-world-model'){
    fail('locked Step 4 receipt is required');
  }

  const liveBytes=Buffer.byteLength(generation.xml,'utf8');
  const liveSha=sha256(Buffer.from(generation.xml,'utf8'));
  if(liveSha !== lockedStep4.output.sha256 || liveBytes !== lockedStep4.output.bytes){
    fail('generated world bytes differ from the locked Step 4 baseline');
  }
  if(generation.receipt?.output?.sha256 !== liveSha || generation.receipt?.output?.bytes !== liveBytes){
    fail('live Step 4 receipt does not match generated world bytes');
  }
  if(generation.receipt?.input?.step3IrHash !== ir.irHash || lockedStep4.input?.step3IrHash !== ir.irHash){
    fail('Step 4 baseline is not bound to the active Step 3 IR');
  }
  if(generation.objectSpecs.length !== ir.entries.length){
    fail('generated object-spec count drift');
  }

  const specHashes=[];
  const sourceCanonicalHashes=[];
  const sourceSliceHashes=[];
  for(let i=0;i<ir.entries.length;i++){
    const entry=ir.entries[i];
    const actual=generation.objectSpecs[i];
    const expected=expectedSpec(entry);
    if(entry.index !== i+1 || actual?.entryIndex !== entry.index){
      fail('entry order drift at position '+(i+1));
    }
    if(!isDeepStrictEqual({
      entryIndex:actual.entryIndex,
      className:actual.className,
      name:actual.name,
      sourceCanonicalHash:actual.sourceCanonicalHash,
      sourceSliceSha256:actual.sourceSliceSha256,
      generatedProperties:actual.generatedProperties
    },expected)){
      fail('property/source identity mismatch for entry '+entry.index);
    }
    const expectedSpecHash='sha256:'+sha256(Buffer.from(JSON.stringify(expected),'utf8'));
    if(actual.generatedSpecHash !== expectedSpecHash){
      fail('generated spec hash mismatch for entry '+entry.index);
    }
    specHashes.push(expectedSpecHash);
    sourceCanonicalHashes.push(entry.canonicalHash);
    sourceSliceHashes.push(entry.sourceSliceSha256);
  }

  const generatedEntrySequenceSha256=sha256(Buffer.from(specHashes.join('\n'),'utf8'));
  const sourceCanonicalSequenceSha256=sha256(Buffer.from(sourceCanonicalHashes.join('\n'),'utf8'));
  const sourceSliceSequenceSha256=sha256(Buffer.from(sourceSliceHashes.join('\n'),'utf8'));
  if(generatedEntrySequenceSha256 !== lockedStep4.output.generatedEntrySequenceSha256){
    fail('generated property sequence differs from locked Step 4');
  }
  if(sourceCanonicalSequenceSha256 !== step3Receipt.ir?.entryCanonicalSequenceSha256 ||
     sourceCanonicalSequenceSha256 !== lockedStep4.output.sourceCanonicalSequenceSha256){
    fail('source canonical identity sequence drift');
  }
  if(sourceSliceSequenceSha256 !== step3Receipt.ir?.sourceSliceSequenceSha256 ||
     sourceSliceSequenceSha256 !== lockedStep4.output.sourceSliceSequenceSha256){
    fail('source slice identity sequence drift');
  }

  const adaptationIndices=(lockedStep4.adaptationPolicy?.adaptations || []).map(row=>row.entryIndex);
  if(lockedStep4.adaptationPolicy?.adaptationCount !== 2 ||
     adaptationIndices.length !== 2 || adaptationIndices[0] !== 832 || adaptationIndices[1] !== 844){
    fail('locked Step 4 adaptation policy drift');
  }

  return Object.freeze({
    schemaVersion:1,
    version:BROOKHAVEN_WORLD_EXACTNESS_VERSION,
    status:'exactness-verified-and-baseline-locked',
    baseline:Object.freeze({
      rootName:'BrookhavenWorldBaseline',
      modelSha256:liveSha,
      bytes:liveBytes,
      step3IrHash:ir.irHash,
      entryCount:ir.entries.length,
      generatedEntrySequenceSha256,
      sourceCanonicalSequenceSha256,
      sourceSliceSequenceSha256,
      adaptationCount:2
    }),
    verification:Object.freeze({
      sourceIdentityVerifiedForEveryEntry:true,
      generatedPropertiesVerifiedForEveryEntry:true,
      onlyApprovedLegacyAdaptationsApplied:true,
      verifiedEntryCount:ir.entries.length,
      verifiedPropertySpecCount:generation.objectSpecs.length
    }),
    readOnlyPolicy:Object.freeze({
      baselineMutationAllowed:false,
      runtimeMayReferenceBaseline:true,
      runtimeMayParentGameplayIntoBaseline:false,
      runtimeMayWriteBaselineProperties:false,
      runtimeMayReplaceBaseline:false,
      mountMode:'serverstorage-immutable-witness-with-runtime-projection'
    }),
    boundaries:Object.freeze({
      starBloxMounted:false,
      robloxPlaceMutated:false,
      publicationStarted:false,
      liveActivationAllowed:false
    }),
    nextSubstep:'mount-immutable-witness-and-bootstrap-runtime-projection'
  });
}
