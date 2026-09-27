import {describe,expect,it} from 'vitest';
import {
  buildCurrentBrookhavenCombinedParityGate,
  REQUIRED_CORE_BEHAVIOR_SCENARIOS
} from './currentBrookhavenCombinedParityGate.js';

const sourceSha='a'.repeat(64);
const source={
  sha256:sourceSha,
  placeId:4924922222,
  placeVersion:25
};
const structural={
  status:'current-live-structure-compared',
  candidateSource:source,
  proofState:{structuralParityVerified:true}
};
const rendered={
  status:'rendered-parity-verified',
  sourceBinding:{
    candidateSha256:sourceSha,
    candidatePlaceId:4924922222,
    candidatePlaceVersion:25
  },
  proofState:{renderedParityVerified:true}
};

function behavior(scenarioId,verified=true){
  return {
    status:verified ? 'behavior-parity-verified' : 'behavior-parity-mismatch',
    sourceBinding:{
      candidateSha256:sourceSha,
      candidatePlaceId:4924922222,
      candidatePlaceVersion:25
    },
    scenario:{scenarioId,deviceProfile:'iPhone'},
    proofState:{behaviorParityVerified:verified}
  };
}

describe('combined current-live Brookhaven parity gate',()=>{
  it('passes core structural/rendered/behavior coverage while keeping final release claims blocked',()=>{
    const result=buildCurrentBrookhavenCombinedParityGate({
      structuralComparison:structural,
      renderedParityReceipt:rendered,
      behaviorParityReceipts:REQUIRED_CORE_BEHAVIOR_SCENARIOS.map(id=>behavior(id))
    });
    expect(result.status).toBe('current-live-core-parity-verified');
    expect(result.proofState.structuralParityVerified).toBe(true);
    expect(result.proofState.renderedParityVerified).toBe(true);
    expect(result.proofState.behaviorParityVerified).toBe(true);
    expect(result.proofState.coreCurrentLiveParityVerified).toBe(true);
    expect(result.proofState.fullCatalogInteractionParityVerified).toBe(false);
    expect(result.proofState.finalMobileReleaseCertificationPassed).toBe(false);
    expect(result.proofState.exactParityClaimAllowed).toBe(false);
    expect(result.authority.mayPublishCandidate).toBe(false);
  });

  it('reports missing or failed behavior scenarios without opening the gate',()=>{
    const receipts=REQUIRED_CORE_BEHAVIOR_SCENARIOS
      .slice(0,-1)
      .map(id=>behavior(id));
    receipts[0]=behavior(receipts[0].scenario.scenarioId,false);

    const result=buildCurrentBrookhavenCombinedParityGate({
      structuralComparison:structural,
      renderedParityReceipt:rendered,
      behaviorParityReceipts:receipts
    });
    expect(result.status).toBe('current-live-core-parity-incomplete');
    expect(result.behaviorCoverage.missing).toContain('house');
    expect(result.behaviorCoverage.failed).toContain('quick-chat');
    expect(result.proofState.behaviorParityVerified).toBe(false);
  });

  it('rejects source binding drift across proof layers',()=>{
    expect(()=>buildCurrentBrookhavenCombinedParityGate({
      structuralComparison:structural,
      renderedParityReceipt:rendered,
      behaviorParityReceipts:[
        ...REQUIRED_CORE_BEHAVIOR_SCENARIOS.slice(0,-1).map(id=>behavior(id)),
        {
          ...behavior('house'),
          sourceBinding:{
            candidateSha256:'b'.repeat(64),
            candidatePlaceId:4924922222,
            candidatePlaceVersion:25
          }
        }
      ]
    })).toThrow(/source binding drift/);
  });
});
