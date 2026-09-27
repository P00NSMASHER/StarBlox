import {describe,expect,it} from 'vitest';
import {createHash} from 'node:crypto';
import {
  buildCurrentBrookhavenBehaviorParityReceipt
} from './currentBrookhavenBehaviorParity.js';

const sourceSha='a'.repeat(64);

function trace({
  outcome='panel-open',
  visibleState={panel:'open'},
  runtimePlaceId=4924922222
}={}){
  return Buffer.from(JSON.stringify({
    schemaVersion:1,
    scenarioId:'quick-chat',
    deviceProfile:'iPhone 16 Pro Max portrait',
    capturedAt:'2026-09-27T02:30:00.000Z',
    sourceBinding:{
      candidateSha256:sourceSha,
      sourcePlaceId:4924922222,
      sourcePlaceVersion:25
    },
    runtime:{placeId:runtimePlaceId,placeVersion:42},
    events:[
      {
        sequence:1,
        actionId:'tap-quick-chat',
        target:'quick-chat',
        outcome,
        visibleState,
        authoritativeState:{open:true}
      },
      {
        sequence:2,
        actionId:'close-quick-chat',
        target:'quick-chat',
        outcome:'panel-closed',
        visibleState:{panel:'closed'},
        authoritativeState:{open:false}
      }
    ]
  }));
}

function locked(bytes){
  return {
    bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex'),
    eventCount:2,
    runtime:{placeId:4924922222,placeVersion:42}
  };
}

const reference=trace();
const candidate=trace({runtimePlaceId:17602626136});
const evidence={
  status:'behavior-parity-evidence-locked',
  sourceBinding:{
    candidateSha256:sourceSha,
    candidatePlaceId:4924922222,
    candidatePlaceVersion:25
  },
  scenario:{
    scenarioId:'quick-chat',
    deviceProfile:'iPhone 16 Pro Max portrait'
  },
  reference:{trace:locked(reference)},
  candidate:{trace:{...locked(candidate),runtime:{placeId:17602626136,placeVersion:42}}},
  proofState:{behaviorEvidenceLocked:true}
};

const review={
  status:'completed',
  scenarioId:'quick-chat',
  reviewer:'mobile-side-by-side-review',
  openCloseFlow:true,
  actionOrder:true,
  resultingState:true,
  mobileControlsUnobstructed:true,
  legacyChromeAbsent:true
};

describe('current Brookhaven behavior parity comparator',()=>{
  it('verifies semantic event parity plus human review',()=>{
    const result=buildCurrentBrookhavenBehaviorParityReceipt({
      evidenceReceipt:evidence,
      referenceTraceBytes:reference,
      candidateTraceBytes:candidate,
      humanReview:review
    });
    expect(result.status).toBe('behavior-parity-verified');
    expect(result.automated.eventMismatchCount).toBe(0);
    expect(result.automated.passed).toBe(true);
    expect(result.humanReview.passed).toBe(true);
    expect(result.proofState.behaviorParityVerified).toBe(true);
    expect(result.proofState.exactParityClaimAllowed).toBe(false);
  });

  it('fails when an observed outcome or state differs',()=>{
    const mismatch=trace({outcome:'wrong-panel'});
    const mismatchEvidence={
      ...evidence,
      candidate:{trace:{...locked(mismatch),runtime:{placeId:17602626136,placeVersion:42}}}
    };
    const result=buildCurrentBrookhavenBehaviorParityReceipt({
      evidenceReceipt:mismatchEvidence,
      referenceTraceBytes:reference,
      candidateTraceBytes:mismatch,
      humanReview:review
    });
    expect(result.status).toBe('behavior-parity-mismatch');
    expect(result.automated.eventMismatchCount).toBe(1);
    expect(result.proofState.behaviorParityVerified).toBe(false);
  });

  it('rejects trace-byte drift after evidence locking',()=>{
    const drift=Buffer.from(candidate);
    drift[drift.length-2]=drift[drift.length-2]===49 ? 50 : 49;
    expect(()=>buildCurrentBrookhavenBehaviorParityReceipt({
      evidenceReceipt:evidence,
      referenceTraceBytes:reference,
      candidateTraceBytes:drift,
      humanReview:review
    })).toThrow();
  });
});
