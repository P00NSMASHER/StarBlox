import {describe,expect,it} from 'vitest';
import {
  buildCurrentBrookhavenBehaviorEvidenceReceipt
} from './currentBrookhavenBehaviorEvidence.js';

const sourceSha='a'.repeat(64);
const rendered={
  status:'rendered-parity-verified',
  sourceBinding:{
    candidateSha256:sourceSha,
    candidatePlaceId:4924922222,
    candidatePlaceVersion:25
  },
  proofState:{renderedParityVerified:true},
  authority:{mayPublishCandidate:false}
};

function trace({
  scenarioId='quick-chat',
  deviceProfile='iPhone 16 Pro Max portrait',
  runtimePlaceId=4924922222,
  runtimePlaceVersion=25,
  outcome='panel-open'
}={}){
  return Buffer.from(JSON.stringify({
    schemaVersion:1,
    scenarioId,
    deviceProfile,
    capturedAt:'2026-09-27T02:30:00.000Z',
    sourceBinding:{
      candidateSha256:sourceSha,
      sourcePlaceId:4924922222,
      sourcePlaceVersion:25
    },
    runtime:{placeId:runtimePlaceId,placeVersion:runtimePlaceVersion},
    events:[
      {sequence:1,actionId:'tap-quick-chat',outcome},
      {sequence:2,actionId:'close-quick-chat',outcome:'panel-closed'}
    ]
  }));
}

describe('current Brookhaven behavioral evidence intake',()=>{
  it('locks paired behavior traces without claiming behavioral parity',()=>{
    const receipt=buildCurrentBrookhavenBehaviorEvidenceReceipt({
      renderedParityReceipt:rendered,
      referenceTraceBytes:trace(),
      candidateTraceBytes:trace({runtimePlaceId:17602626136,runtimePlaceVersion:42})
    });
    expect(receipt.status).toBe('behavior-parity-evidence-locked');
    expect(receipt.scenario.scenarioId).toBe('quick-chat');
    expect(receipt.reference.trace.eventCount).toBe(2);
    expect(receipt.candidate.trace.eventCount).toBe(2);
    expect(receipt.proofState.behaviorEvidenceLocked).toBe(true);
    expect(receipt.proofState.behaviorComparisonCompleted).toBe(false);
    expect(receipt.proofState.behaviorParityVerified).toBe(false);
    expect(receipt.proofState.exactParityClaimAllowed).toBe(false);
    expect(receipt.authority.mayPublishCandidate).toBe(false);
  });

  it('refuses behavior evidence before rendered parity is verified',()=>{
    expect(()=>buildCurrentBrookhavenBehaviorEvidenceReceipt({
      renderedParityReceipt:{
        ...rendered,
        status:'rendered-parity-mismatch',
        proofState:{renderedParityVerified:false}
      },
      referenceTraceBytes:trace(),
      candidateTraceBytes:trace()
    })).toThrow(/verified rendered parity receipt is required/);
  });

  it('rejects mismatched scenarios or source binding drift',()=>{
    expect(()=>buildCurrentBrookhavenBehaviorEvidenceReceipt({
      renderedParityReceipt:rendered,
      referenceTraceBytes:trace({scenarioId:'quick-chat'}),
      candidateTraceBytes:trace({scenarioId:'home-cams'})
    })).toThrow(/same scenario/);

    const drift=JSON.parse(trace().toString('utf8'));
    drift.sourceBinding.sourcePlaceVersion=26;
    expect(()=>buildCurrentBrookhavenBehaviorEvidenceReceipt({
      renderedParityReceipt:rendered,
      referenceTraceBytes:trace(),
      candidateTraceBytes:Buffer.from(JSON.stringify(drift))
    })).toThrow(/not bound/);
  });
});
