export const CURRENT_BROOKHAVEN_COMBINED_PARITY_VERSION=
  'starblox-current-brookhaven-combined-parity-v1';

export const REQUIRED_CORE_BEHAVIOR_SCENARIOS=Object.freeze([
  'quick-chat',
  'home-cams',
  'family',
  'avatar-editor',
  'tools',
  'animations',
  'vehicle',
  'house'
]);

function sourceKey(source){
  return [
    source?.candidateSha256 ?? source?.sha256,
    source?.candidatePlaceId ?? source?.placeId,
    source?.candidatePlaceVersion ?? source?.placeVersion
  ].join(':');
}

export function buildCurrentBrookhavenCombinedParityGate({
  structuralComparison,
  renderedParityReceipt,
  behaviorParityReceipts,
  requiredScenarioIds=REQUIRED_CORE_BEHAVIOR_SCENARIOS
}={}){
  if(structuralComparison?.status!=='current-live-structure-compared' ||
     structuralComparison?.proofState?.structuralParityVerified!==true){
    throw new Error('verified structural parity is required');
  }
  if(renderedParityReceipt?.status!=='rendered-parity-verified' ||
     renderedParityReceipt?.proofState?.renderedParityVerified!==true){
    throw new Error('verified rendered parity is required');
  }
  if(!Array.isArray(behaviorParityReceipts)){
    throw new Error('behaviorParityReceipts must be an array');
  }
  if(!Array.isArray(requiredScenarioIds) || requiredScenarioIds.length===0){
    throw new Error('requiredScenarioIds must be a non-empty array');
  }

  const structuralSource=sourceKey(structuralComparison.candidateSource);
  const renderedSource=sourceKey(renderedParityReceipt.sourceBinding);
  if(structuralSource!==renderedSource){
    throw new Error('structural and rendered parity receipts are bound to different source candidates');
  }

  const byScenario=new Map();
  for(const receipt of behaviorParityReceipts){
    const scenarioId=String(receipt?.scenario?.scenarioId||'');
    if(!scenarioId) throw new Error('behavior parity receipt scenarioId is required');
    if(byScenario.has(scenarioId)) throw new Error('duplicate behavior parity scenario: '+scenarioId);
    if(sourceKey(receipt.sourceBinding)!==structuralSource){
      throw new Error('behavior parity receipt source binding drift: '+scenarioId);
    }
    byScenario.set(scenarioId,receipt);
  }

  const coverage=requiredScenarioIds.map(scenarioId=>{
    const receipt=byScenario.get(scenarioId);
    const verified=
      receipt?.status==='behavior-parity-verified' &&
      receipt?.proofState?.behaviorParityVerified===true;
    return Object.freeze({scenarioId,present:Boolean(receipt),verified});
  });
  const missing=coverage.filter(row=>!row.present).map(row=>row.scenarioId);
  const failed=coverage.filter(row=>row.present && !row.verified).map(row=>row.scenarioId);
  const behaviorParityVerified=missing.length===0 && failed.length===0;
  const coreCurrentLiveParityVerified=behaviorParityVerified;

  return Object.freeze({
    schemaVersion:1,
    version:CURRENT_BROOKHAVEN_COMBINED_PARITY_VERSION,
    status:coreCurrentLiveParityVerified
      ? 'current-live-core-parity-verified'
      : 'current-live-core-parity-incomplete',
    sourceBinding:Object.freeze({
      candidateSha256:structuralComparison.candidateSource.sha256,
      candidatePlaceId:structuralComparison.candidateSource.placeId,
      candidatePlaceVersion:structuralComparison.candidateSource.placeVersion
    }),
    proofState:Object.freeze({
      sourceIdentityBound:true,
      structuralParityVerified:true,
      renderedParityVerified:true,
      behaviorParityVerified,
      coreCurrentLiveParityVerified,
      fullCatalogInteractionParityVerified:false,
      finalMobileReleaseCertificationPassed:false,
      exactParityClaimAllowed:false
    }),
    behaviorCoverage:Object.freeze({
      required:Object.freeze([...requiredScenarioIds]),
      coverage:Object.freeze(coverage),
      missing:Object.freeze(missing),
      failed:Object.freeze(failed)
    }),
    remainingBoundaries:Object.freeze([
      'vehicle/inventory/house catalog breadth must be closed against the verified source',
      'remaining doors/garages/lights/props and world interactions require proof',
      'final iPhone/Studio release certification must pass'
    ]),
    authority:Object.freeze({
      mayReplaceFrozenReference:false,
      mayPublishCandidate:false,
      publicAccessChangeAllowed:false,
      productionActivationAllowed:false
    }),
    nextStep:coreCurrentLiveParityVerified
      ? 'run-real-current-source-pipeline-and-close-catalog-interaction-gaps'
      : 'complete-or-repair-required-core-behavior-scenarios'
  });
}
