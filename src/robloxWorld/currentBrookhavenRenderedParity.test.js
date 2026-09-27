import {describe,expect,it} from 'vitest';
import {buildCurrentBrookhavenRenderedParityReceipt}
  from './currentBrookhavenRenderedParity.js';

const referenceSha='1'.repeat(64);
const candidateSha='2'.repeat(64);

const evidence={
  status:'rendered-parity-evidence-locked',
  sourceBinding:{
    candidateSha256:'a'.repeat(64),
    candidatePlaceId:4924922222,
    candidatePlaceVersion:25,
    structuralParityVerified:true
  },
  scene:{
    sceneId:'town-center-spawn',
    viewport:{width:1320,height:2868},
    deviceProfile:'iPhone 16 Pro Max portrait'
  },
  reference:{image:{sha256:referenceSha,bytes:100}},
  candidate:{image:{sha256:candidateSha,bytes:100}},
  proofState:{
    renderedEvidenceLocked:true,
    imageIdentityVerified:true,
    viewportIdentityLocked:true
  }
};

const automated={
  status:'completed',
  sceneId:'town-center-spawn',
  referenceSha256:referenceSha,
  candidateSha256:candidateSha,
  viewportWidth:1320,
  viewportHeight:2868,
  pixelMismatchRatio:0.006,
  ssim:0.994,
  perceptualHashDistance:2,
  landmarkMismatchCount:0
};

const review={
  status:'completed',
  sceneId:'town-center-spawn',
  reviewer:'side-by-side-mobile-review',
  persistentShell:true,
  topControls:true,
  rightActionRail:true,
  worldGeometry:true,
  lightingAndMaterials:true,
  legacyChromeAbsent:true,
  materialMismatchCount:0
};

describe('current Brookhaven rendered parity gate',()=>{
  it('verifies rendered parity only when automated and human checks both pass',()=>{
    const result=buildCurrentBrookhavenRenderedParityReceipt({
      evidenceReceipt:evidence,
      automatedComparison:automated,
      humanReview:review
    });

    expect(result.status).toBe('rendered-parity-verified');
    expect(result.automated.passed).toBe(true);
    expect(result.humanReview.passed).toBe(true);
    expect(result.proofState.renderedComparisonCompleted).toBe(true);
    expect(result.proofState.renderedParityVerified).toBe(true);
    expect(result.proofState.behaviorParityVerified).toBe(false);
    expect(result.proofState.exactParityClaimAllowed).toBe(false);
    expect(result.authority.mayPublishCandidate).toBe(false);
  });

  it('fails rendered parity on an automated visual mismatch',()=>{
    const result=buildCurrentBrookhavenRenderedParityReceipt({
      evidenceReceipt:evidence,
      automatedComparison:{...automated,pixelMismatchRatio:0.2},
      humanReview:review
    });

    expect(result.status).toBe('rendered-parity-mismatch');
    expect(result.automated.passed).toBe(false);
    expect(result.proofState.renderedParityVerified).toBe(false);
    expect(result.nextStep).toContain('repair-rendered-mismatches');
  });

  it('fails rendered parity when human review finds a material mismatch',()=>{
    const result=buildCurrentBrookhavenRenderedParityReceipt({
      evidenceReceipt:evidence,
      automatedComparison:automated,
      humanReview:{...review,materialMismatchCount:1}
    });

    expect(result.status).toBe('rendered-parity-mismatch');
    expect(result.humanReview.passed).toBe(false);
    expect(result.proofState.renderedParityVerified).toBe(false);
  });

  it('rejects reports that are not bound to the locked image or viewport identity',()=>{
    expect(()=>buildCurrentBrookhavenRenderedParityReceipt({
      evidenceReceipt:evidence,
      automatedComparison:{...automated,candidateSha256:'3'.repeat(64)},
      humanReview:review
    })).toThrow(/candidate image does not match locked evidence/);

    expect(()=>buildCurrentBrookhavenRenderedParityReceipt({
      evidenceReceipt:evidence,
      automatedComparison:{...automated,viewportHeight:999},
      humanReview:review
    })).toThrow(/viewport does not match locked evidence/);
  });
});
