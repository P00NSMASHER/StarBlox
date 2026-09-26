export const STEP9_FINAL_RELEASE_ID='starblox-private-step9-canonical-step6-v4';
export const STEP9_FINAL_PLACE_VERSION=14;

function n(value){
  return Number(value || 0);
}

export function verifyStep9ClientReport(report,{
  releaseId=STEP9_FINAL_RELEASE_ID,
  versionNumber=STEP9_FINAL_PLACE_VERSION
}={}){
  if(!report || typeof report!=='object') throw new Error('playtest report is required');
  if(report.telemetryVersion!=='starblox-private-playtest-v1') throw new Error('telemetry version mismatch');
  if(report.releaseId!==releaseId) throw new Error('release mismatch');
  if(Number(report.placeVersion)!==Number(versionNumber)) throw new Error('place version mismatch');

  const client=report.client || {};
  if(client.ready!==true || client.touchEnabled!==true) throw new Error('real touch client evidence missing');
  if(n(client.viewportX)<300 || n(client.viewportY)<300) throw new Error('viewport evidence missing');

  const counts=report.counts || {};
  if(n(counts.client_ready)<1) throw new Error('client-ready evidence missing');
  if(n(counts.activity_panel_opened)<3) throw new Error('all three activity panels were not opened');
  if(n(counts.success_feedback_seen)<3) throw new Error('all three client success states were not observed');

  const server=report.server || {};
  if(n(server.station_opened)<3) throw new Error('all three stations were not opened authoritatively');
  if(n(server.answer_correct)<3) throw new Error('all three authoritative correct answers were not recorded');
  if(n(server.loop_completed)<1) throw new Error('full Brightside loop completion was not recorded');

  for(const id of ['word-portal-put-v1','spelling-forge-fog-v1','culture-lab-culture-v1']){
    if(report.activityIds?.[id]!==true) throw new Error('missing activity evidence: '+id);
  }

  const privacy=report.privacy || {};
  if(privacy.storesUsername!==false ||
     privacy.storesUserId!==false ||
     privacy.storesRawAnswers!==false ||
     privacy.storesChat!==false){
    throw new Error('privacy receipt mismatch');
  }

  return Object.freeze({
    schemaVersion:1,
    version:'starblox-step9-final-client-gate-v1',
    status:'verified',
    releaseId,
    placeVersion:Number(versionNumber),
    durationSeconds:n(report.durationSeconds),
    touchClient:true,
    viewport:Object.freeze({
      x:n(client.viewportX),
      y:n(client.viewportY)
    }),
    evidence:Object.freeze({
      actualLocalScriptClient:true,
      allThreePanelsOpened:true,
      threeClientSuccessStates:true,
      allThreeStationsOpenedAuthoritatively:true,
      threeCorrectCompletions:true,
      fullLoopCompleted:true,
      activityIdentityVerified:true,
      privacyReceiptVerified:true,
      onboardingObserved:n(counts.onboarding_shown)>0 && n(counts.onboarding_dismissed)>0,
      wrongAnswerFeedbackObserved:n(counts.wrong_feedback_seen)>0 && n(server.answer_wrong)>0
    }),
    authority:Object.freeze({
      publicAccessChangeAllowed:false,
      experienceVisibilityChangeAllowed:false,
      productionActivationAllowed:false
    })
  });
}
