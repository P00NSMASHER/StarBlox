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

    expect(entries.length).toBeGreaterThanOrEqual(20);
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
  });
});
