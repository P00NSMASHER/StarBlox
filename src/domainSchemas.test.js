import { describe, expect, it } from 'vitest';
import { gameModel } from './gameModel';
import {
  canonicalizeLegacyQuestion,
  createDailyBundle,
  createPlayerConceptState,
  createQuestionAttempt,
  createReplayManifest,
  stableHash
} from './domainSchemas';
import { UPSTREAM_PROVENANCE, upstreamSourceList } from './upstreamProvenance';

describe('StarBlox canonical domain contracts', () => {
  it('canonicalizes every existing production question without changing the legacy bank', () => {
    const legacyBank = gameModel.buildQuestions();
    const canonical = legacyBank.map(question => canonicalizeLegacyQuestion(question));

    expect(canonical).toHaveLength(200);
    expect(canonical.every(question => question.schemaVersion === 1)).toBe(true);
    expect(canonical.every(question => question.version.schemaVersion === 1)).toBe(true);
    expect(canonical.every(question => /^fnv1a32:[a-f0-9]{8}$/.test(question.currentVersionHash))).toBe(true);
    expect(canonical.every(question => question.version.provenance.length >= 1)).toBe(true);

    const legacy = legacyBank[0];
    expect(legacy.schemaVersion).toBeUndefined();
    expect(legacy.prompt).toBeTruthy();
  });

  it('produces stable hashes independent of object key insertion order', () => {
    expect(stableHash({a:1,b:{c:2,d:3}})).toBe(stableHash({b:{d:3,c:2},a:1}));
    expect(stableHash({a:1,b:2})).not.toBe(stableHash({a:1,b:3}));
  });

  it('changes a question content hash when the actual question content changes', () => {
    const source = gameModel.buildQuestions()[0];
    const original = canonicalizeLegacyQuestion(source);
    const changed = canonicalizeLegacyQuestion({
      ...source,
      prompt: source.prompt + ' Updated'
    });

    expect(changed.currentVersionHash).not.toBe(original.currentVersionHash);
  });

  it('creates versioned player-learning and attempt records with explicit question identity', () => {
    const question = canonicalizeLegacyQuestion(gameModel.buildQuestions()[0]);
    const state = createPlayerConceptState({
      playerId:'local-player',
      conceptId:question.skill,
      exposures:1,
      retrievability:0.82,
      updatedAt:123
    });
    const attempt = createQuestionAttempt({
      attemptId:'attempt-1',
      playerId:'local-player',
      questionId:question.id,
      questionVersion:question.currentVersion,
      questionHash:question.currentVersionHash,
      selectedAnswer:question.version.answer,
      startedAt:1000,
      answeredAt:2400,
      dailyId:'daily-2026-09-23',
      gameContext:{district:question.district}
    });

    expect(state.schemaVersion).toBe(1);
    expect(state.conceptId).toBe(question.skill);
    expect(attempt.responseMs).toBe(1400);
    expect(attempt.questionHash).toBe(question.currentVersionHash);
  });

  it('freezes daily content to exact question-version hashes', () => {
    const questions = gameModel.buildQuestions().slice(0,2).map(question => canonicalizeLegacyQuestion(question));
    const input = {
      id:'daily-2026-09-23',
      date:'2026-09-23',
      seed:20260923,
      generatorVersion:'daily-gen-v1',
      engineVersion:'engine-v1',
      questionBankSnapshot:{version:'bank-v1',hash:'fnv1a32:00000001'},
      balanceVersion:'static-v1',
      questionRefs:questions.map(question => ({
        questionId:question.id,
        version:question.currentVersion,
        contentHash:question.currentVersionHash
      })),
      levelSpec:{district:'Lantern Lane'},
      certifiedSolution:{status:'pending'},
      compatibility:{ok:true,checks:['schema']}
    };

    const a = createDailyBundle(input);
    const b = createDailyBundle({...input});

    expect(a.bundleHash).toBe(b.bundleHash);
    expect(a.questionRefs[0].contentHash).toBe(questions[0].currentVersionHash);
  });

  it('creates replay manifests that bind an engine version, seed and action stream hash', () => {
    const replay = createReplayManifest({
      replayId:'replay-1',
      engineVersion:'engine-v1',
      seed:42,
      initialStateHash:'fnv1a32:11111111',
      actionCodec:'starblox-actions-v1',
      actionCount:3,
      actionHash:'fnv1a32:22222222',
      summaryHash:'fnv1a32:33333333',
      createdAt:'2026-09-23T23:00:00Z'
    });

    expect(replay.schemaVersion).toBe(1);
    expect(replay.manifestHash).toMatch(/^fnv1a32:[a-f0-9]{8}$/);
  });
});

describe('StarBlox upstream implementation provenance', () => {
  it('pins every planned source to an immutable full commit SHA', () => {
    const entries = upstreamSourceList();

    expect(entries.length).toBeGreaterThanOrEqual(98);
    expect(entries.every(entry => /^[a-f0-9]{40}$/.test(entry.commit))).toBe(true);
    expect(entries.every(entry => entry.reuseBasis === 'user-confirmed direct reuse rights')).toBe(true);
  });

  it('pins the deterministic gameplay source used by the next implementation step', () => {
    expect(UPSTREAM_PROVENANCE.neonVectorDefense.repository).toBe('Calculator5329/neon-vector-defense');
    expect(UPSTREAM_PROVENANCE.neonVectorDefense.commit).toBe('48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4');
    expect(UPSTREAM_PROVENANCE.neonVectorDefense.path).toBe('src/game/engine.ts');
    expect(UPSTREAM_PROVENANCE.neonReplayCodec.path).toBe('src/game/replayCodec.ts');
    expect(UPSTREAM_PROVENANCE.neonReSimulate.path).toBe('src/game/reSimulate.ts');
    expect(UPSTREAM_PROVENANCE.neonReplayIntegrity.path).toBe('functions/src/replayIntegrity.ts');
    expect(UPSTREAM_PROVENANCE.atlasAuthoritySolo.path).toBe('convex/solo.ts');
    expect(UPSTREAM_PROVENANCE.atlasAuthorityDaily.path).toBe('convex/dailyChallenge.ts');
    expect(UPSTREAM_PROVENANCE.atlasAuthorityChallenges.path).toBe('convex/challenges.ts');
    expect(UPSTREAM_PROVENANCE.fruitBoxGame.path).toBe('engine.js');
    expect(UPSTREAM_PROVENANCE.fruitBoxProofTests.path).toBe('tests/engine.test.mjs');
    expect(UPSTREAM_PROVENANCE.fruitBoxAlgorithm.path).toBe('docs/ALGORITHM.md');
    expect(UPSTREAM_PROVENANCE.neonBalanceConfig.path).toBe('src/game/balanceConfig.ts');
    expect(UPSTREAM_PROVENANCE.neonBalanceCheck.path).toBe('scripts/balance-check.ts');
    expect(UPSTREAM_PROVENANCE.neonBalanceSim.path).toBe('scripts/sim.ts');
    expect(UPSTREAM_PROVENANCE.neonBalanceHarness.path).toBe('scripts/balance.ts');
    expect(UPSTREAM_PROVENANCE.openEdxItemBank.path).toBe('xmodule/item_bank_block.py');
    expect(UPSTREAM_PROVENANCE.openEdxProblemBlock.path).toBe('xmodule/capa_block.py');
    expect(UPSTREAM_PROVENANCE.gygyQuestionModelV2.path).toBe('backend/app/models/question.py');
    expect(UPSTREAM_PROVENANCE.gygyQuestionCrudV2.path).toBe('backend/app/crud/crud_question.py');
    expect(UPSTREAM_PROVENANCE.gygyQuestionValidationV2.path).toBe('backend/app/services/question_content.py');
    expect(UPSTREAM_PROVENANCE.recallGenerateQa.path).toBe('eval/generation/generate_qa.py');
    expect(UPSTREAM_PROVENANCE.recallBatchGenerate.path).toBe('eval/generation/batch_generate.py');
    expect(UPSTREAM_PROVENANCE.recallValidateQa.path).toBe('eval/generation/validate_qa.py');
    expect(UPSTREAM_PROVENANCE.recallScoreQuestions.path).toBe('eval/generation/score_questions.py');
    expect(UPSTREAM_PROVENANCE.recallLlmReview.path).toBe('eval/generation/llm_review.py');
    expect(UPSTREAM_PROVENANCE.ankiFsrsMemoryState.path).toBe('rslib/src/scheduler/fsrs/memory_state.rs');
    expect(UPSTREAM_PROVENANCE.ankiFsrsSimulator.path).toBe('rslib/src/scheduler/fsrs/simulator.rs');
    expect(UPSTREAM_PROVENANCE.ankiFsrsRetention.path).toBe('rslib/src/scheduler/fsrs/retention.rs');
    expect(UPSTREAM_PROVENANCE.adaptiveIrtEngine.path).toBe('src/irt.py');
    expect(UPSTREAM_PROVENANCE.adaptiveIrtServer.path).toBe('src/server.py');
    expect(UPSTREAM_PROVENANCE.aplEntropyEngine.path).toBe('aki-cricket/lib/engine/entropy.ts');
    expect(UPSTREAM_PROVENANCE.aplQuestionRules.path).toBe('aki-cricket/lib/engine/questions.ts');
    expect(UPSTREAM_PROVENANCE.purdleDailyGenerator.path).toBe('scripts/generate_puzzle.py');
    expect(UPSTREAM_PROVENANCE.purdleDailyWorkflow.path).toBe('.github/workflows/daily-puzzle.yml');
    expect(UPSTREAM_PROVENANCE.neonDailyChallenge.path).toBe('src/game/dailyChallenge.ts');
    expect(UPSTREAM_PROVENANCE.sabeoDailyScheduleMigration.path).toBe('supabase/migrations/20251118214523_schedule_daily_challenge_cron.sql');
    expect(UPSTREAM_PROVENANCE.sabeoDailyCronUpdate.path).toBe('supabase/migrations/20260108020023_update_schedule_daily_challenge_cron.sql');
    expect(UPSTREAM_PROVENANCE.sabeoScheduleRoute.path).toBe('src/app/api/schedule-daily-challenge/route.ts');
    expect(UPSTREAM_PROVENANCE.sabeoStartRoute.path).toBe('src/app/api/start-challenge/route.ts');
    expect(UPSTREAM_PROVENANCE.sabeoStartDomain.path).toBe('src/domain/challenge/start-challenge.ts');
    expect(UPSTREAM_PROVENANCE.sentrySafeRollout.path).toBe('src/sentry/utils/rollout.py');
    expect(UPSTREAM_PROVENANCE.sentryKillSwitches.path).toBe('src/sentry/killswitches.py');
    expect(UPSTREAM_PROVENANCE.sentryTemporaryFeatures.path).toBe('src/sentry/features/temporary.py');
    expect(UPSTREAM_PROVENANCE.neonReplayReconstruct.path).toBe('src/game/replayReconstruct.ts');
    expect(UPSTREAM_PROVENANCE.neonDossierShare.path).toBe('src/DossierShare.tsx');
    expect(UPSTREAM_PROVENANCE.neonDossierArtifact.path).toBe('src/game/dossier.ts');
    expect(UPSTREAM_PROVENANCE.openReplaySession.path).toBe('tracker/tracker/src/main/app/session.ts');
    expect(UPSTREAM_PROVENANCE.openReplaySanitizer.path).toBe('tracker/tracker/src/main/app/sanitizer.ts');
    expect(UPSTREAM_PROVENANCE.openReplayNetwork.path).toBe('tracker/tracker/src/main/modules/network.ts');
    expect(UPSTREAM_PROVENANCE.openReplayConsole.path).toBe('tracker/tracker/src/main/modules/console.ts');
    expect(UPSTREAM_PROVENANCE.makeReadyMusicDirector.path).toBe('src/music.js');
    expect(UPSTREAM_PROVENANCE.neonRunTelemetry.path).toBe('src/game/runTelemetry.ts');
    expect(UPSTREAM_PROVENANCE.profileStoreRuntime.path).toBe('ProfileStore.luau');
    expect(UPSTREAM_PROVENANCE.profileStoreTutorial.path).toBe('docs/tutorial/index.md');
    expect(UPSTREAM_PROVENANCE.replicaServiceRuntime.path).toBe('src/ServerScriptService/ReplicaService.lua');
    expect(UPSTREAM_PROVENANCE.replicaServiceApi.path).toBe('docs/api.md');
    expect(UPSTREAM_PROVENANCE.zapEvents.path).toBe('docs/config/events.md');
    expect(UPSTREAM_PROVENANCE.matterReplication.path).toBe('docs/Guides/Replication.md');
    expect(UPSTREAM_PROVENANCE.matterComponents.path).toBe('example/src/shared/components.luau');
    expect(UPSTREAM_PROVENANCE.rbxDomBinary.path).toBe('rbx_binary/src/lib.rs');
    expect(UPSTREAM_PROVENANCE.rbxDomXml.path).toBe('rbx_xml/src/lib.rs');
    expect(UPSTREAM_PROVENANCE.rbxDomViewer.path).toBe('rbx_dom_weak/src/viewer.rs');
    expect(UPSTREAM_PROVENANCE.robloxMissionsPackage.path).toBe('content/en-us/resources/feature-packages/missions.md');
    expect(UPSTREAM_PROVENANCE.robloxSeasonPassesPackage.path).toBe('content/en-us/resources/feature-packages/season-passes.md');
    expect(UPSTREAM_PROVENANCE.robloxEngagementRewardsPackage.path).toBe('content/en-us/resources/feature-packages/engagement-rewards.md');
    expect(UPSTREAM_PROVENANCE.robloxBundlesPackage.path).toBe('content/en-us/resources/feature-packages/bundles.md');
    expect(UPSTREAM_PROVENANCE.flexFollowers.path).toBe('src/server/services/FollowerService.lua');
    expect(UPSTREAM_PROVENANCE.flexNpcService.path).toBe('src/server/services/NpcService.lua');
    expect(UPSTREAM_PROVENANCE.flexPhotoService.path).toBe('src/server/services/PhotoService.lua');
    expect(UPSTREAM_PROVENANCE.flexMinigameService.path).toBe('src/server/services/MinigameService.lua');
    expect(UPSTREAM_PROVENANCE.placementService.path).toBe('PlacementService.lua');
    expect(UPSTREAM_PROVENANCE.remodelExtractModels.path).toBe('examples/02-extract-models.lua');
    expect(UPSTREAM_PROVENANCE.bloxForgeMutationPlan.path).toBe('packages/core/src/builders/mutation-plan.ts');
    expect(UPSTREAM_PROVENANCE.bloxForgeGameplayAssertions.path).toBe('packages/core/src/builders/gameplay-assertions.ts');
    expect(UPSTREAM_PROVENANCE.bloxForgePlaytestTelemetry.path).toBe('packages/core/src/builders/playtest-telemetry.ts');
    expect(UPSTREAM_PROVENANCE.bloxForgeStageCoordinator.path).toBe('packages/core/src/stage/coordinator.ts');
    expect(UPSTREAM_PROVENANCE.bloxForgeSafetyManager.path).toBe('packages/core/src/safety/safety-manager.ts');
    expect(UPSTREAM_PROVENANCE.bloxForgeTestHandlers.path).toBe('studio-plugin/src/modules/handlers/TestHandlers.ts');
    expect(UPSTREAM_PROVENANCE.nixeraCoordinator.path).toBe('backend/src/agents/coordinator.ts');
    expect(UPSTREAM_PROVENANCE.nixeraSpecialists.path).toBe('backend/src/agents/specialists.ts');
    expect(UPSTREAM_PROVENANCE.nixeraStudioTools.path).toBe('backend/src/tools/studioTools.ts');
    expect(UPSTREAM_PROVENANCE.nixeraInspectOps.path).toBe('plugin/src/tools/Inspect.luau');
    expect(UPSTREAM_PROVENANCE.nixeraTestOps.path).toBe('plugin/src/tools/TestOps.luau');
    expect(UPSTREAM_PROVENANCE.nixeraPlaytestOps.path).toBe('plugin/src/tools/PlaytestOps.luau');
    expect(UPSTREAM_PROVENANCE.nixeraVisionOps.path).toBe('plugin/src/tools/VisionOps.luau');
    expect(UPSTREAM_PROVENANCE.nixeraLogOps.path).toBe('plugin/src/tools/LogOps.luau');
    expect(UPSTREAM_PROVENANCE.nixeraExecutor.path).toBe('plugin/src/tools/Executor.luau');
    expect(UPSTREAM_PROVENANCE.profileStoreRuntime.path).toBe('ProfileStore.luau');
    expect(UPSTREAM_PROVENANCE.profileStoreTutorial.path).toBe('docs/tutorial/index.md');
    expect(UPSTREAM_PROVENANCE.replicaServiceRuntime.path).toBe('src/ServerScriptService/ReplicaService.lua');
    expect(UPSTREAM_PROVENANCE.replicaServiceApi.path).toBe('docs/api.md');
    expect(UPSTREAM_PROVENANCE.zapEvents.path).toBe('docs/config/events.md');
    expect(UPSTREAM_PROVENANCE.matterReplication.path).toBe('docs/Guides/Replication.md');
    expect(UPSTREAM_PROVENANCE.matterComponents.path).toBe('example/src/shared/components.luau');
  });
});
