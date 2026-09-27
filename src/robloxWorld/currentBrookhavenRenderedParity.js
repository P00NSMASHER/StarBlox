export const CURRENT_BROOKHAVEN_RENDERED_PARITY_VERSION=
  'starblox-current-brookhaven-rendered-parity-v1';

export const DEFAULT_RENDERED_PARITY_POLICY=Object.freeze({
  maxPixelMismatchRatio:0.015,
  minSsim:0.985,
  maxPerceptualHashDistance:4,
  maxLandmarkMismatchCount:0,
  maxHumanMaterialMismatchCount:0
});

function finite(value,label){
  const number=Number(value);
  if(!Number.isFinite(number)) throw new Error(label+' must be finite');
  return number;
}

function integer(value,label,{min=0}={}){
  const number=Number(value);
  if(!Number.isInteger(number) || number<min){
    throw new Error(label+' must be an integer >= '+min);
  }
  return number;
}

function ratio(value,label){
  const number=finite(value,label);
  if(number<0 || number>1) throw new Error(label+' must be between 0 and 1');
  return number;
}

function boolean(value,label){
  if(typeof value!=='boolean') throw new Error(label+' must be boolean');
  return value;
}

function string(value,label){
  if(typeof value!=='string' || !value.trim()) throw new Error(label+' is required');
  return value.trim();
}

function assertHash(value,label){
  const normalized=String(value||'');
  if(!/^[a-f0-9]{64}$/.test(normalized)){
    throw new Error(label+' must be a SHA-256 hex digest');
  }
  return normalized;
}

function normalizePolicy(policy){
  const merged={...DEFAULT_RENDERED_PARITY_POLICY,...(policy||{})};
  return Object.freeze({
    maxPixelMismatchRatio:ratio(merged.maxPixelMismatchRatio,'maxPixelMismatchRatio'),
    minSsim:ratio(merged.minSsim,'minSsim'),
    maxPerceptualHashDistance:integer(
      merged.maxPerceptualHashDistance,
      'maxPerceptualHashDistance'
    ),
    maxLandmarkMismatchCount:integer(
      merged.maxLandmarkMismatchCount,
      'maxLandmarkMismatchCount'
    ),
    maxHumanMaterialMismatchCount:integer(
      merged.maxHumanMaterialMismatchCount,
      'maxHumanMaterialMismatchCount'
    )
  });
}

export function buildCurrentBrookhavenRenderedParityReceipt({
  evidenceReceipt,
  automatedComparison,
  humanReview,
  policy
}={}){
  if(evidenceReceipt?.status!=='rendered-parity-evidence-locked'){
    throw new Error('locked rendered-parity evidence receipt is required');
  }
  if(evidenceReceipt?.proofState?.renderedEvidenceLocked!==true ||
     evidenceReceipt?.proofState?.imageIdentityVerified!==true ||
     evidenceReceipt?.proofState?.viewportIdentityLocked!==true){
    throw new Error('rendered evidence identity is not fully locked');
  }

  if(automatedComparison?.status!=='completed'){
    throw new Error('completed automated rendered comparison is required');
  }
  if(humanReview?.status!=='completed'){
    throw new Error('completed side-by-side human review is required');
  }

  const referenceSha=assertHash(
    automatedComparison.referenceSha256,
    'automatedComparison.referenceSha256'
  );
  const candidateSha=assertHash(
    automatedComparison.candidateSha256,
    'automatedComparison.candidateSha256'
  );
  if(referenceSha!==evidenceReceipt.reference.image.sha256){
    throw new Error('automated comparison reference image does not match locked evidence');
  }
  if(candidateSha!==evidenceReceipt.candidate.image.sha256){
    throw new Error('automated comparison candidate image does not match locked evidence');
  }

  const width=integer(automatedComparison.viewportWidth,'automatedComparison.viewportWidth',{min:1});
  const height=integer(automatedComparison.viewportHeight,'automatedComparison.viewportHeight',{min:1});
  if(width!==evidenceReceipt.scene.viewport.width ||
     height!==evidenceReceipt.scene.viewport.height){
    throw new Error('automated comparison viewport does not match locked evidence');
  }
  if(string(automatedComparison.sceneId,'automatedComparison.sceneId')!==
     evidenceReceipt.scene.sceneId){
    throw new Error('automated comparison scene does not match locked evidence');
  }

  const activePolicy=normalizePolicy(policy);
  const metrics=Object.freeze({
    pixelMismatchRatio:ratio(
      automatedComparison.pixelMismatchRatio,
      'automatedComparison.pixelMismatchRatio'
    ),
    ssim:ratio(automatedComparison.ssim,'automatedComparison.ssim'),
    perceptualHashDistance:integer(
      automatedComparison.perceptualHashDistance,
      'automatedComparison.perceptualHashDistance'
    ),
    landmarkMismatchCount:integer(
      automatedComparison.landmarkMismatchCount,
      'automatedComparison.landmarkMismatchCount'
    )
  });

  const automatedChecks=Object.freeze({
    pixelMismatchRatio:
      metrics.pixelMismatchRatio<=activePolicy.maxPixelMismatchRatio,
    ssim:metrics.ssim>=activePolicy.minSsim,
    perceptualHashDistance:
      metrics.perceptualHashDistance<=activePolicy.maxPerceptualHashDistance,
    landmarkMismatchCount:
      metrics.landmarkMismatchCount<=activePolicy.maxLandmarkMismatchCount
  });
  const automatedPass=Object.values(automatedChecks).every(Boolean);

  const materialMismatchCount=integer(
    humanReview.materialMismatchCount,
    'humanReview.materialMismatchCount'
  );
  const reviewSceneId=string(humanReview.sceneId,'humanReview.sceneId');
  if(reviewSceneId!==evidenceReceipt.scene.sceneId){
    throw new Error('human review scene does not match locked evidence');
  }

  const reviewChecks=Object.freeze({
    persistentShell: boolean(humanReview.persistentShell,'humanReview.persistentShell'),
    topControls: boolean(humanReview.topControls,'humanReview.topControls'),
    rightActionRail: boolean(humanReview.rightActionRail,'humanReview.rightActionRail'),
    worldGeometry: boolean(humanReview.worldGeometry,'humanReview.worldGeometry'),
    lightingAndMaterials: boolean(
      humanReview.lightingAndMaterials,
      'humanReview.lightingAndMaterials'
    ),
    legacyChromeAbsent: boolean(
      humanReview.legacyChromeAbsent,
      'humanReview.legacyChromeAbsent'
    )
  });
  const humanPass=
    Object.values(reviewChecks).every(Boolean) &&
    materialMismatchCount<=activePolicy.maxHumanMaterialMismatchCount;

  const renderedParityVerified=automatedPass && humanPass;

  return Object.freeze({
    schemaVersion:1,
    version:CURRENT_BROOKHAVEN_RENDERED_PARITY_VERSION,
    status:renderedParityVerified
      ? 'rendered-parity-verified'
      : 'rendered-parity-mismatch',
    sourceBinding:Object.freeze({
      candidateSha256:evidenceReceipt.sourceBinding.candidateSha256,
      candidatePlaceId:evidenceReceipt.sourceBinding.candidatePlaceId,
      candidatePlaceVersion:evidenceReceipt.sourceBinding.candidatePlaceVersion,
      sceneId:evidenceReceipt.scene.sceneId,
      referenceImageSha256:evidenceReceipt.reference.image.sha256,
      candidateImageSha256:evidenceReceipt.candidate.image.sha256,
      viewport:evidenceReceipt.scene.viewport
    }),
    policy:activePolicy,
    automated:Object.freeze({
      completed:true,
      metrics,
      checks:automatedChecks,
      passed:automatedPass
    }),
    humanReview:Object.freeze({
      completed:true,
      reviewer: string(humanReview.reviewer,'humanReview.reviewer'),
      checks:reviewChecks,
      materialMismatchCount,
      passed:humanPass
    }),
    proofState:Object.freeze({
      renderedEvidenceLocked:true,
      renderedComparisonCompleted:true,
      sideBySideHumanReviewCompleted:true,
      renderedParityVerified,
      behaviorParityVerified:false,
      exactParityClaimAllowed:false
    }),
    authority:Object.freeze({
      mayReplaceFrozenReference:false,
      mayPublishCandidate:false,
      publicAccessChangeAllowed:false,
      productionActivationAllowed:false
    }),
    nextStep:renderedParityVerified
      ? 'run-behavioral-parity-proof'
      : 'repair-rendered-mismatches-and-repeat-side-by-side-review'
  });
}
