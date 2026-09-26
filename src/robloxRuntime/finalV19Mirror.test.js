import {existsSync,readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Final private v19 mirror baseline',()=>{
  it('pins the exact published and verified v19 identities',()=>{
    const receipt=JSON.parse(read('docs/phase8/FINAL_V19_PRIVATE_MIRROR.json'));
    expect(receipt.status).toBe('verified-private-v19');
    expect(receipt.privateRelease.placeVersion).toBe(19);
    expect(receipt.privateRelease.publishRunId).toBe(36246304282);
    expect(receipt.privateRelease.verifyRunId).toBe(36247078103);
    expect(receipt.privateRelease.artifactSha256)
      .toBe('3a2112443427d801cfeb51c71b68cc00541063ce32933d2ab8a02ab950de97e8');
    expect(receipt.privateRelease.exactProductionServerBootVerified).toBe(true);
    expect(receipt.privateRelease.exactCoreLoopVerified).toBe(true);
  });

  it('locks the exact Brookhaven world while describing runtime systems accurately',()=>{
    const receipt=JSON.parse(read('docs/phase8/FINAL_V19_PRIVATE_MIRROR.json'));
    expect(receipt.world.exactFrozenBrookhavenWorld).toBe(true);
    expect(receipt.world.baselineModelSha256)
      .toBe('4dfd451ae211dead959ec3f165e2b477a9725d04727febdc66472e95328917df');
    expect(receipt.world.mountedSubtreeSha256)
      .toBe('d2c88a68305a65475dfdab77220b69e4138d81e44250edd1849f69cee4c92a90');
    expect(receipt.world.runtimeSystemsMayMutateBaseline).toBe(false);
    expect(receipt.mirrorSystems.claim).toBe('behavior-matched-starblox-runtime-systems');
    expect(receipt.mirrorSystems.exactFullSystemsMirrorClaimed).toBe(false);
  });

  it('locks the learning economy and current dynamic question policy',()=>{
    const receipt=JSON.parse(read('docs/phase8/FINAL_V19_PRIVATE_MIRROR.json'));
    expect(receipt.learningEconomy.coinsPerCorrectAnswer).toBe(10);
    expect(receipt.learningEconomy.challengeCoins).toBe(0);
    expect(receipt.learningEconomy.staleAnswerReplayBlocked).toBe(true);
    expect(receipt.questions.bankRevision).toBe('dynamic-abvm-star-sync-v1');
    expect(receipt.questions.currentSnapshotTotalQuestions).toBe(96);
    expect(receipt.questions.currentSnapshotMaterialPerStation).toBe(12);
    expect(receipt.questions.currentSnapshotStarFallbackPerStation).toBe(20);
    expect(receipt.questions.starReadingQuestions).toBeGreaterThanOrEqual(25);
    expect(receipt.questions.starMathQuestions).toBeGreaterThanOrEqual(25);
    expect(receipt.questions.metaListRecognitionForbidden).toBe(true);
  });

  it('keeps v19 private and temporary release machinery off mainline',()=>{
    const receipt=JSON.parse(read('docs/phase8/FINAL_V19_PRIVATE_MIRROR.json'));
    expect(receipt.authority.publicAccessChangeAttempted).toBe(false);
    expect(receipt.authority.productionActivationAllowed).toBe(false);
    expect(existsSync(new URL('../../.github/workflows/final-mirror-private-publish.yml',import.meta.url))).toBe(false);
    expect(existsSync(new URL('../../.github/workflows/verify-final-v19.yml',import.meta.url))).toBe(false);
  });
});
