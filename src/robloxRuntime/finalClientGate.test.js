import {describe,expect,it} from 'vitest';
import {verifyStep9ClientReport} from './finalClientGate.js';

function report(){
  return {
    telemetryVersion:'starblox-private-playtest-v1',
    releaseId:'starblox-private-step9-canonical-step6-v4',
    placeVersion:14,
    durationSeconds:45,
    client:{ready:true,touchEnabled:true,viewportX:750,viewportY:402},
    counts:{
      client_ready:1,
      activity_panel_opened:3,
      success_feedback_seen:3,
      onboarding_shown:0,
      onboarding_dismissed:0,
      wrong_feedback_seen:0
    },
    server:{
      station_opened:3,
      answer_correct:3,
      answer_wrong:0,
      loop_completed:1
    },
    activityIds:{
      'word-portal-put-v1':true,
      'spelling-forge-fog-v1':true,
      'culture-lab-culture-v1':true
    },
    privacy:{
      storesUsername:false,
      storesUserId:false,
      storesRawAnswers:false,
      storesChat:false
    }
  };
}

describe('Step 9 final touch-client gate',()=>{
  it('accepts the exact final candidate without requiring repeated onboarding or deliberate wrong answers',()=>{
    const receipt=verifyStep9ClientReport(report());
    expect(receipt.status).toBe('verified');
    expect(receipt.placeVersion).toBe(14);
    expect(receipt.evidence.fullLoopCompleted).toBe(true);
    expect(receipt.evidence.onboardingObserved).toBe(false);
    expect(receipt.evidence.wrongAnswerFeedbackObserved).toBe(false);
    expect(receipt.authority.productionActivationAllowed).toBe(false);
  });

  it('fails closed on release/version drift or missing full-loop evidence',()=>{
    const wrongRelease=report();
    wrongRelease.releaseId='other';
    expect(()=>verifyStep9ClientReport(wrongRelease)).toThrow(/release mismatch/);

    const wrongVersion=report();
    wrongVersion.placeVersion=13;
    expect(()=>verifyStep9ClientReport(wrongVersion)).toThrow(/place version mismatch/);

    const incomplete=report();
    incomplete.server.loop_completed=0;
    expect(()=>verifyStep9ClientReport(incomplete)).toThrow(/full Brightside loop/);
  });
});
