import {describe,expect,it} from 'vitest';
import {
  buildCurrentBrookhavenStructureComparison,
  profileRobloxDom
} from './currentBrookhavenStructureCompare.js';

const receipt={
  status:'current-live-source-candidate-captured',
  candidate:{
    sha256:'a'.repeat(64),
    bytes:1234,
    format:'rbxlx'
  },
  provenance:{
    placeId:4924922222,
    placeVersion:10,
    capturedAt:'2026-09-27T02:00:00.000Z'
  },
  frozenReference:{sourceSha256:'e9abef1d41b85a8f83aca36ba661de41f4321562937c1e2eea907395c292d694'},
  proofState:{candidateIdentityLocked:true},
  authority:{mayReplaceFrozenReference:false,mayPublishCandidate:false}
};

function dom(extra=[]){
  return {
    class:'DataModel',
    name:'DataModel',
    children:[
      {
        class:'Workspace',
        name:'Workspace',
        children:[
          {class:'Part',name:'Road',children:[]},
          {class:'MeshPart',name:'House',children:[]},
          ...extra
        ]
      }
    ]
  };
}

describe('current Brookhaven structural comparator',()=>{
  it('profiles Roblox DOM topology deterministically',()=>{
    const a=profileRobloxDom(dom());
    const b=profileRobloxDom(dom());
    expect(a.instanceCount).toBe(4);
    expect(a.geometryCount).toBe(2);
    expect(a.topologySha256).toBe(b.topologySha256);
  });

  it('can prove structural identity while keeping rendered/behavior/exact claims blocked',()=>{
    const result=buildCurrentBrookhavenStructureComparison({
      candidateDom:dom(),
      referenceDom:dom(),
      candidateReceipt:receipt
    });
    expect(result.proofState.structuralComparisonCompleted).toBe(true);
    expect(result.proofState.structuralIdentityMatch).toBe(true);
    expect(result.proofState.structuralParityVerified).toBe(true);
    expect(result.proofState.renderedParityVerified).toBe(false);
    expect(result.proofState.behaviorParityVerified).toBe(false);
    expect(result.proofState.exactParityClaimAllowed).toBe(false);
    expect(result.authority.mayReplaceFrozenReference).toBe(false);
  });

  it('fails structural identity when current world topology differs',()=>{
    const result=buildCurrentBrookhavenStructureComparison({
      candidateDom:dom([{class:'Part',name:'NewBuilding',children:[]}]),
      referenceDom:dom(),
      candidateReceipt:receipt
    });
    expect(result.proofState.structuralIdentityMatch).toBe(false);
    expect(result.differences.instanceCountDelta).toBe(1);
    expect(result.differences.geometryCountDelta).toBe(1);
    expect(result.differences.topologyMatches).toBe(false);
    expect(result.nextStep).toBe('review-structural-differences-before-any-source-replacement');
  });
});
