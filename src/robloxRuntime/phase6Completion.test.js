import {existsSync,readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Phase 6 completion receipt',()=>{
  it('pins the exact verified private v15 release',()=>{
    const receipt=JSON.parse(read('docs/phase6/PHASE_6_COMPLETION.json'));
    expect(receipt.status).toBe('implementation-complete-private-v15-verified-pilot-ready');
    expect(receipt.mergedMainCommit).toBe('208b7854887b126916ee6c8e71e3b88fbb78c06e');
    expect(receipt.privateRelease.placeVersion).toBe(15);
    expect(receipt.privateRelease.workflowRunId).toBe(36215706688);
    expect(receipt.privateRelease.artifactSha256)
      .toBe('d27fb714f7bf80275ce98101a2e8b1ab298ca48186f0b6f42b7aefb1ba05db48');
    expect(receipt.privateRelease.exactServerBootVerified).toBe(true);
    expect(receipt.privateRelease.rotatingQuestionBankVerifiedInRoblox).toBe(true);
    expect(receipt.privateRelease.retentionStoreVerifiedInRoblox).toBe(true);
  });

  it('locks the certified content and genuine-player retention boundary',()=>{
    const receipt=JSON.parse(read('docs/phase6/PHASE_6_COMPLETION.json'));
    expect(receipt.content.questionCount).toBe(9);
    expect(receipt.content.questionsPerStation).toBe(3);
    expect(receipt.content.answersServerOnly).toBe(true);
    expect(receipt.content.liveLlmRequiredForNormalGameplay).toBe(false);
    expect(receipt.retention.pilotTargetSessions).toBe(5);
    expect(receipt.retention.pilotStatus).toBe('ready-awaiting-genuine-private-player-sessions');
    expect(receipt.retention.syntheticRetentionEvidenceAllowed).toBe(false);
    expect(receipt.retention.publicBetaDecisionBlockedUntilMeasuredPilotReviewed).toBe(true);
    expect(receipt.retention.privacy).toEqual({
      storesUsername:false,
      storesUserId:false,
      storesRawAnswers:false,
      storesChat:false,
      storesSessionIdsInAggregate:false
    });
  });

  it('keeps v15 private and removes the one-off publisher from mainline content',()=>{
    const receipt=JSON.parse(read('docs/phase6/PHASE_6_COMPLETION.json'));
    expect(receipt.authority.experienceVisibilityChangeAttempted).toBe(false);
    expect(receipt.authority.publicAccessChangeAttempted).toBe(false);
    expect(receipt.authority.liveActivationAllowed).toBe(false);
    expect(receipt.authority.productionActivationAllowed).toBe(false);
    expect(receipt.repositoryCleanup.temporaryPhase6PublisherNeutralized).toBe(true);
    expect(existsSync(new URL('../../.github/workflows/phase6-private-publish.yml',import.meta.url))).toBe(false);

    const pkg=JSON.parse(read('package.json'));
    expect(pkg.scripts['roblox:phase6:retention-report'])
      .toBe('node scripts/verify-phase6-retention.mjs');
  });
});
