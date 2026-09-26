import {existsSync,readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Phase 9: verified private v20 baseline',()=>{
  it('pins the exact v20 artifact and immutable Brookhaven world identities',()=>{
    const receipt=JSON.parse(read('docs/phase9/PHASE_9_V20_PRIVATE_BASELINE.json'));
    expect(receipt.status).toBe('verified-private-v20-ui-parity-baseline');
    expect(receipt.canonicalMainCommit).toBe('4c6e2040eca666ee90e4c4626a4d8b15e0104abf');
    expect(receipt.privateRelease.placeVersion).toBe(20);
    expect(receipt.privateRelease.workflowRunId).toBe(36249912745);
    expect(receipt.privateRelease.artifactSha256)
      .toBe('5a6d301f4e455205f55465435a9e76bcd364bf9f72bf9d0e33a48f02684d5232');
    expect(receipt.privateRelease.baselineModelSha256)
      .toBe('4dfd451ae211dead959ec3f165e2b477a9725d04727febdc66472e95328917df');
    expect(receipt.privateRelease.mountedSubtreeSha256)
      .toBe('d2c88a68305a65475dfdab77220b69e4138d81e44250edd1849f69cee4c92a90');
    expect(receipt.privateRelease.exactServerBootVerified).toBe(true);
  });

  it('locks the honest exact-world versus behavior-matched systems boundary',()=>{
    const receipt=JSON.parse(read('docs/phase9/PHASE_9_V20_PRIVATE_BASELINE.json'));
    expect(receipt.worldBoundary.exactFrozenBrookhavenWorld).toBe(true);
    expect(receipt.worldBoundary.exactBrookhavenInteractiveSystemsClaimed).toBe(false);
    expect(receipt.worldBoundary.runtimeSystemsMode).toBe('behavior-matched-starblox-authoritative');
    expect(receipt.worldBoundary.baselineMutationAllowed).toBe(false);
  });

  it('locks material-first questions, STAR fallback, and question-only coins',()=>{
    const receipt=JSON.parse(read('docs/phase9/PHASE_9_V20_PRIVATE_BASELINE.json'));
    expect(receipt.learning.bankRevision).toBe('phase8-material-first-star-fallback-v1');
    expect(receipt.learning.questionsPerStation).toBe(20);
    expect(receipt.learning.materialQuestionsPerStation).toBe(12);
    expect(receipt.learning.starFallbackQuestionsPerStation).toBe(8);
    expect(receipt.learning.materialFirst).toBe(true);
    expect(receipt.learning.metaSightWordListPromptsForbidden).toBe(true);
    expect(receipt.learning.answersServerOnly).toBe(true);
    expect(receipt.learning.correctAnswerCoins).toBe(10);
    expect(receipt.learning.nonQuestionCoinMintingAllowed).toBe(false);
  });

  it('locks UI parity, mirror systems, and private authority',()=>{
    const receipt=JSON.parse(read('docs/phase9/PHASE_9_V20_PRIVATE_BASELINE.json'));
    expect(receipt.mirrorSystems.uiParitySkin).toBe(true);
    expect(receipt.mirrorSystems.rightRail).toEqual([
      'Avatar','Inventory','Emotes','Vehicles','Houses','Bio','Jobs','Map','Shop'
    ]);
    expect(receipt.mirrorSystems.homesOnBrookhavenPlots).toBe(true);
    expect(receipt.mirrorSystems.vehicles).toBe(true);
    expect(receipt.mirrorSystems.inventoryTools).toBe(true);
    expect(receipt.mirrorSystems.jobs).toBe(true);
    expect(receipt.authority.publicAccessChangeAttempted).toBe(false);
    expect(receipt.authority.productionActivationAllowed).toBe(false);
    expect(existsSync(new URL('../../.github/workflows/phase9-ui-parity-private-publish.yml',import.meta.url))).toBe(false);
  });
});
