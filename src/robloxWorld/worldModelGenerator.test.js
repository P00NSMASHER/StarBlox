import { createHash } from 'node:crypto';
import { describe,expect,it } from 'vitest';

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
      }
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
    }
  };
  return {
    version:'starblox-brookhaven-world-ir-v1',
    entryCount:4936,
    entries,
    irHash:'sha256:'+'c'.repeat(64)
  };
}

describe('Target architecture Step 4 isolated world generator',()=>{
  it('generates a standalone native Roblox model and adapts only the two verified anomalies',()=>{
    const ir=fullIr();
    const {xml,receipt}=generateIsolatedBrookhavenWorld(ir,{
      step3Receipt:{
        ir:{
          irHash:ir.irHash,
          entryCanonicalSequenceSha256:'d'.repeat(64),
          sourceSliceSequenceSha256:'e'.repeat(64)
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
      }
    });
    expect(xml).toContain('<roblox');
    expect(xml).toContain('BrookhavenWorldBaseline');
    expect(xml).toContain('BHW_0001');
    expect(xml).toContain('<float name="Reflectance">1</float>');
    expect(xml).toContain('<Vector3 name="VertexColor"><X>1</X><Y>1</Y><Z>1</Z></Vector3>');
    expect(receipt.output.partCount).toBe(4936);
    expect(receipt.output.generatedObjectCount).toBe(5493);
    expect(receipt.output.uniqueAssetIdCount).toBe(2);
    expect(receipt.adaptationPolicy.adaptationCount).toBe(2);
    expect(receipt.adaptationPolicy.adaptations.map(row=>row.entryIndex)).toEqual([832,844]);
    expect(receipt.isolation.containsScripts).toBe(false);
    expect(receipt.boundaries.publicationStarted).toBe(false);
  });

  it('fails closed on incomplete or unbound IR',()=>{
    expect(()=>generateIsolatedBrookhavenWorld({
      version:'starblox-brookhaven-world-ir-v1',
      entryCount:1,
      entries:[baseEntry()],
      irHash:'sha256:'+'a'.repeat(64)
    },{step3Receipt:{ir:{irHash:'sha256:'+'a'.repeat(64)},boundaries:{robloxObjectsGenerated:false}}}))
      .toThrow(/complete verified Step 3 IR/);
  });
});
