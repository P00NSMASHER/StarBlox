import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Phase 8 verified private v18 baseline',()=>{
  it('pins the exact live v18 artifact and verification runs',()=>{
    const receipt=JSON.parse(read('docs/phase8/PHASE_8_V18_LIVE_VERIFICATION.json'));
    expect(receipt.status).toBe('verified-private-v18-live');
    expect(receipt.privateRelease.placeVersion).toBe(18);
    expect(receipt.privateRelease.publishWorkflowRunId).toBe(36222676724);
    expect(receipt.privateRelease.verifyWorkflowRunId).toBe(36223088498);
    expect(receipt.privateRelease.artifactSha256)
      .toBe('d654724c674e7bd07a64d0a7185881c585501bbb2620f8e259232a2e6dcf8238');
    expect(receipt.privateRelease.exactServerBootVerified).toBe(true);
    expect(receipt.privateRelease.exactCoreLoopVerified).toBe(true);
  });

  it('keeps the exact-world claim separate from recreated gameplay systems',()=>{
    const receipt=JSON.parse(read('docs/phase8/PHASE_8_V18_LIVE_VERIFICATION.json'));
    expect(receipt.brookhaven.exactFrozenWorldMirror).toBe(true);
    expect(receipt.brookhaven.completeOriginalGameplayPackageAvailable).toBe(false);
    expect(receipt.brookhaven.interactionSystemsMode).toBe('behavior-matched-starblox-runtime');
    expect(receipt.brookhaven.baselineMutationAllowed).toBe(false);
    expect(receipt.brookhaven.serializedInstanceCount).toBe(5493);
  });

  it('locks current material first, STAR fallback after exhaustion, and question-only coins',()=>{
    const receipt=JSON.parse(read('docs/phase8/PHASE_8_V18_LIVE_VERIFICATION.json'));
    expect(receipt.questions.questionsPerStation).toBe(20);
    expect(receipt.questions.materialQuestionsPerStation).toBe(12);
    expect(receipt.questions.starFallbackQuestionsPerStation).toBe(8);
    expect(receipt.questions.rotation).toBe('material-once-then-star-fallback-loop');
    expect(receipt.questions.metaListRecognitionPromptsForbidden).toBe(true);
    expect(receipt.questions.staleAnswerReplayBlocked).toBe(true);
    expect(receipt.economy.correctAnswerCoins).toBe(10);
    expect(receipt.economy.challengeCoins).toBe(0);
    expect(receipt.economy.paidCurrencyRequiredForGameplayUnlocks).toBe(false);
  });

  it('keeps v18 private and production-inactive',()=>{
    const receipt=JSON.parse(read('docs/phase8/PHASE_8_V18_LIVE_VERIFICATION.json'));
    expect(receipt.authority.experienceVisibilityChangeAttempted).toBe(false);
    expect(receipt.authority.publicAccessChangeAttempted).toBe(false);
    expect(receipt.authority.liveActivationAllowed).toBe(false);
    expect(receipt.authority.productionActivationAllowed).toBe(false);
  });
});
