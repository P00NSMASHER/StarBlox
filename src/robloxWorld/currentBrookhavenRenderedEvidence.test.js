import {describe,expect,it} from 'vitest';
import {buildCurrentBrookhavenRenderedEvidenceReceipt}
  from './currentBrookhavenRenderedEvidence.js';

const structural={
  status:'current-live-structure-compared',
  candidateSource:{
    sha256:'a'.repeat(64),
    bytes:1234,
    format:'rbxlx',
    placeId:4924922222,
    placeVersion:17,
    capturedAt:'2026-09-27T02:00:00.000Z'
  },
  proofState:{
    structuralComparisonCompleted:true,
    structuralParityVerified:true
  }
};

describe('current Brookhaven rendered evidence intake',()=>{
  it('locks both images and viewport without claiming rendered parity',()=>{
    const reference=Buffer.from('reference-frame');
    const candidate=Buffer.from('candidate-frame');
    const receipt=buildCurrentBrookhavenRenderedEvidenceReceipt({
      structuralComparison:structural,
      referenceImageBytes:reference,
      candidateImageBytes:candidate,
      viewportWidth:1320,
      viewportHeight:2868,
      deviceProfile:'iPhone 16 Pro Max portrait',
      referenceCapturedAt:'2026-09-26T21:00:00-04:00',
      candidateCapturedAt:'2026-09-26T22:00:00-04:00',
      sceneId:'town-center-spawn'
    });

    expect(receipt.status).toBe('rendered-parity-evidence-locked');
    expect(receipt.sourceBinding.candidatePlaceVersion).toBe(17);
    expect(receipt.scene.viewport).toEqual({width:1320,height:2868});
    expect(receipt.reference.image.bytes).toBe(reference.length);
    expect(receipt.candidate.image.bytes).toBe(candidate.length);
    expect(receipt.proofState.renderedEvidenceLocked).toBe(true);
    expect(receipt.proofState.renderedComparisonCompleted).toBe(false);
    expect(receipt.proofState.renderedParityVerified).toBe(false);
    expect(receipt.proofState.exactParityClaimAllowed).toBe(false);
    expect(receipt.authority.mayPublishCandidate).toBe(false);
  });

  it('refuses rendered evidence before structural parity is verified',()=>{
    expect(()=>buildCurrentBrookhavenRenderedEvidenceReceipt({
      structuralComparison:{
        ...structural,
        proofState:{structuralComparisonCompleted:true,structuralParityVerified:false}
      },
      referenceImageBytes:Buffer.from('reference'),
      candidateImageBytes:Buffer.from('candidate'),
      viewportWidth:1320,
      viewportHeight:2868,
      deviceProfile:'iPhone',
      referenceCapturedAt:'2026-09-26T21:00:00-04:00',
      candidateCapturedAt:'2026-09-26T22:00:00-04:00',
      sceneId:'town-center-spawn'
    })).toThrow(/structural parity must be verified/);
  });

  it('rejects empty images and invalid viewport metadata',()=>{
    const base={
      structuralComparison:structural,
      referenceImageBytes:Buffer.from('reference'),
      candidateImageBytes:Buffer.from('candidate'),
      viewportWidth:1320,
      viewportHeight:2868,
      deviceProfile:'iPhone',
      referenceCapturedAt:'2026-09-26T21:00:00-04:00',
      candidateCapturedAt:'2026-09-26T22:00:00-04:00',
      sceneId:'town-center-spawn'
    };
    expect(()=>buildCurrentBrookhavenRenderedEvidenceReceipt({
      ...base,referenceImageBytes:Buffer.alloc(0)
    })).toThrow();
    expect(()=>buildCurrentBrookhavenRenderedEvidenceReceipt({
      ...base,viewportWidth:0
    })).toThrow();
  });
});
