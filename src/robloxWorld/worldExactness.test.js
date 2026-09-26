import { createHash } from 'node:crypto';
import { describe,expect,it } from 'vitest';

import { verifyBrookhavenWorldExactness } from './worldExactness.js';
import { generateIsolatedBrookhavenWorld } from './worldModelGenerator.js';

function baseEntry(index=1){
  return {
    index,
    className:'Part',
    partType:'Block',
    shape:'Block',
    surface:{Top:'Smooth',Front:'Smooth',Bottom:'Smooth',Right:'Smooth',Left:'Smooth',Back:'Smooth'},
    reflectance:0,
    color:[255,128,0],
    anchored:true,
    mesh:null,
    canCollide:true,
    transparency:0,
    material:'SmoothPlastic',
    position:[1,2,3],
    locked:false,
    cframe:[1,2,3,1,0,0,0,1,0,0,0,1],
    size:[4,5,6],
    decal:null,
    assetIds:[],
    sourceSliceSha256:'a'.repeat(64),
    canonicalHash:'sha256:'+'b'.repeat(64)
  };
}
function fullIr(){
  const entries=Array.from({length:4936},(_,i)=>baseEntry(i+1));
  for(let i=0;i<494;i++){
    entries[i]={
      ...entries[i],
      decal:{
        transparency:0,
        face:'Enum.NormalId.Front',
        texture:'rbxassetid://5812251043',
        assetIds:['5812251043']
      },
      assetIds:['5812251043']
    };
  }
  for(let i=0;i<61;i++){
    entries[i]={
      ...entries[i],
      mesh:{
        offset:[0,0,0],
        meshType:'Enum.MeshType.Brick',
        vertexColor:[1,1,1],
        scale:[1,1,1],
        meshId:null,
        texture:'',
        assetIds:[]
      }
    };
  }
  entries[831]={...entries[831],reflectance:5};
  entries[843]={
    ...entries[843],
    mesh:{
      offset:[0,0,0],
      meshType:'Enum.MeshType.FileMesh',
      vertexColor:[3000000028082176,2.999999954472962e31,3000000028082176],
      scale:[1,1,1],
      meshId:'rbxassetid://461088522',
      texture:'',
      assetIds:['461088522']
    },
    assetIds:['461088522']
  };
  return {
    version:'starblox-brookhaven-world-ir-v1',
    entryCount:4936,
    entries,
    irHash:'sha256:'+'c'.repeat(64)
  };
}
function fixture(){
  const ir=fullIr();
  const step3Receipt={
    ir:{
      irHash:ir.irHash,
      entryCanonicalSequenceSha256:createHash('sha256')
        .update(ir.entries.map(row=>row.canonicalHash).join('\n'))
        .digest('hex'),
      sourceSliceSequenceSha256:createHash('sha256')
        .update(ir.entries.map(row=>row.sourceSliceSha256).join('\n'))
        .digest('hex')
    },
    structure:{
      decalCount:494,
      meshCount:62,
      uniqueAssetIdCount:2,
      sortedAssetIdsSha256:createHash('sha256')
        .update(['461088522','5812251043'].join(','))
        .digest('hex')
    },
    boundaries:{robloxObjectsGenerated:false}
  };
  const generation=generateIsolatedBrookhavenWorld(ir,{step3Receipt});
  return {ir,step3Receipt,generation};
}

describe('Target architecture Step 5 world exactness lock',()=>{
  it('verifies every generated property spec and locks the Step 4 bytes read-only',()=>{
    const {ir,step3Receipt,generation}=fixture();
    const receipt=verifyBrookhavenWorldExactness({
      ir,
      generation,
      step3Receipt,
      step4Receipt:generation.receipt
    });
    expect(receipt.status).toBe('exactness-verified-and-baseline-locked');
    expect(receipt.verification.verifiedEntryCount).toBe(4936);
    expect(receipt.baseline.adaptationCount).toBe(2);
    expect(receipt.readOnlyPolicy.baselineMutationAllowed).toBe(false);
    expect(receipt.readOnlyPolicy.mountMode).toBe('serverstorage-immutable-witness-with-runtime-projection');
    expect(receipt.boundaries.starBloxMounted).toBe(false);
  });

  it('fails closed on baseline bytes or generated property drift',()=>{
    const {ir,step3Receipt,generation}=fixture();
    expect(()=>verifyBrookhavenWorldExactness({
      ir,
      generation:{...generation,xml:generation.xml+'<!--tamper-->'},
      step3Receipt,
      step4Receipt:generation.receipt
    })).toThrow(/bytes differ/);

    const specs=generation.objectSpecs.map(row=>({...row}));
    specs[0]={
      ...specs[0],
      generatedProperties:{...specs[0].generatedProperties,transparency:0.5}
    };
    expect(()=>verifyBrookhavenWorldExactness({
      ir,
      generation:{...generation,objectSpecs:specs},
      step3Receipt,
      step4Receipt:generation.receipt
    })).toThrow(/property\/source identity mismatch/);
  });
});
