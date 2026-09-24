import { createImplementationProvenance } from './domainSchemas';

const CAPTURED_AT = '2026-09-23';
const DIRECT_RIGHTS = 'user-confirmed direct reuse rights';

function source(component,repository,branch,commit,repositoryLicense,path=null,reuseBasis=DIRECT_RIGHTS){
  return createImplementationProvenance({
    component,
    repository,
    branch,
    commit,
    path,
    repositoryLicense,
    reuseBasis,
    capturedAt: CAPTURED_AT
  });
}

export const UPSTREAM_PROVENANCE = Object.freeze({
  neonVectorDefense: source(
    'deterministic fixed-step simulation core and seeded gameplay randomness',
    'Calculator5329/neon-vector-defense',
    'master',
    '48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4',
    'unasserted in GitHub metadata',
    'src/game/engine.ts'
  ),
  neonReplayCodec: source(
    'compact replay action encoding and action-pack hashing',
    'Calculator5329/neon-vector-defense',
    'master',
    '48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4',
    'unasserted in GitHub metadata',
    'src/game/replayCodec.ts'
  ),
  neonReSimulate: source(
    'bounded deterministic replay re-simulation and verdict model',
    'Calculator5329/neon-vector-defense',
    'master',
    '48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4',
    'unasserted in GitHub metadata',
    'src/game/reSimulate.ts'
  ),
  neonReplayIntegrity: source(
    'server-side replay manifest and chunk integrity validation',
    'Calculator5329/neon-vector-defense',
    'master',
    '48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4',
    'unasserted in GitHub metadata',
    'functions/src/replayIntegrity.ts'
  ),
  neonBalanceConfig: source(
    'bounded sparse remote balance overrides with identity fallback',
    'Calculator5329/neon-vector-defense',
    'master',
    '48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4',
    'unasserted in GitHub metadata',
    'src/game/balanceConfig.ts'
  ),
  neonBalanceCheck: source(
    'CI comparison thresholds and fail-level balance regression gate',
    'Calculator5329/neon-vector-defense',
    'master',
    '48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4',
    'unasserted in GitHub metadata',
    'scripts/balance-check.ts'
  ),
  neonBalanceSim: source(
    'headless seeded bot simulation matrix for balance validation',
    'Calculator5329/neon-vector-defense',
    'master',
    '48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4',
    'unasserted in GitHub metadata',
    'scripts/sim.ts'
  ),
  neonBalanceHarness: source(
    'multi-metric balance report and strategy/viability harness',
    'Calculator5329/neon-vector-defense',
    'master',
    '48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4',
    'unasserted in GitHub metadata',
    'scripts/balance.ts'
  ),
  recallCs: source(
    'offline question generation, review, validation and deduplication',
    'garg-tejas/recall-cs',
    'main',
    '9cfaa8b7537f61413c2739e9d1df99ff9bb73f4d',
    'unasserted in GitHub metadata'
  ),
  recallGenerateQa: source(
    'offline source-chunk question generation and candidate provenance',
    'garg-tejas/recall-cs',
    'main',
    '9cfaa8b7537f61413c2739e9d1df99ff9bb73f4d',
    'unasserted in GitHub metadata',
    'eval/generation/generate_qa.py'
  ),
  recallBatchGenerate: source(
    'resumable batch generation and checkpoint workflow',
    'garg-tejas/recall-cs',
    'main',
    '9cfaa8b7537f61413c2739e9d1df99ff9bb73f4d',
    'unasserted in GitHub metadata',
    'eval/generation/batch_generate.py'
  ),
  recallValidateQa: source(
    'structural validation, evidence linking and semantic deduplication',
    'garg-tejas/recall-cs',
    'main',
    '9cfaa8b7537f61413c2739e9d1df99ff9bb73f4d',
    'unasserted in GitHub metadata',
    'eval/generation/validate_qa.py'
  ),
  recallScoreQuestions: source(
    'independent batch question scoring and quality metadata',
    'garg-tejas/recall-cs',
    'main',
    '9cfaa8b7537f61413c2739e9d1df99ff9bb73f4d',
    'unasserted in GitHub metadata',
    'eval/generation/score_questions.py'
  ),
  recallLlmReview: source(
    'keep rewrite reject independent review semantics',
    'garg-tejas/recall-cs',
    'main',
    '9cfaa8b7537f61413c2739e9d1df99ff9bb73f4d',
    'unasserted in GitHub metadata',
    'eval/generation/llm_review.py'
  ),
  ankiFsrsMemoryState: source(
    'FSRS memory-state lifecycle and concept/card state semantics',
    'ankitects/anki',
    'main',
    '2ef2f7cac9673b697c4b9924a4135bfcbe3269b4',
    'AGPL-3.0-or-later',
    'rslib/src/scheduler/fsrs/memory_state.rs'
  ),
  ankiFsrsRetention: source(
    'desired-retention and retention simulation semantics',
    'ankitects/anki',
    'main',
    '2ef2f7cac9673b697c4b9924a4135bfcbe3269b4',
    'AGPL-3.0-or-later',
    'rslib/src/scheduler/fsrs/retention.rs'
  ),
  ankiFsrsSimulator: source(
    'retrievability-based review priority and workload simulation',
    'ankitects/anki',
    'main',
    '2ef2f7cac9673b697c4b9924a4135bfcbe3269b4',
    'AGPL-3.0-or-later',
    'rslib/src/scheduler/fsrs/simulator.rs'
  ),
  fsrsRsModelV6: source(
    'exact FSRS-6 forgetting, difficulty and stability update equations',
    'open-spaced-repetition/fsrs-rs',
    'main',
    'c137ee6e096f9217632397a8fb2bdb6f6e1b92ae',
    'BSD-3-Clause',
    'src/model_v6.rs'
  ),
  fsrsRsInference: source(
    'retrievability definition and memory-state structure',
    'open-spaced-repetition/fsrs-rs',
    'main',
    'c137ee6e096f9217632397a8fb2bdb6f6e1b92ae',
    'BSD-3-Clause',
    'src/inference.rs'
  ),
  adaptiveIrtEngine: source(
    '2PL probability, Fisher information, MLE ability estimation and adaptive selection',
    'woodstocksoftware/adaptive-question-selector',
    'main',
    '4e3dc17bc98d8b777f3c5fc46302047283620e97',
    'MIT',
    'src/irt.py'
  ),
  adaptiveIrtTests: source(
    'IRT behavior and adaptive-selection regression invariants',
    'woodstocksoftware/adaptive-question-selector',
    'main',
    '4e3dc17bc98d8b777f3c5fc46302047283620e97',
    'MIT',
    'tests/test_irt.py'
  ),
  adaptiveQuestionSelector: source(
    'IRT ability estimation and adaptive question selection',
    'woodstocksoftware/adaptive-question-selector',
    'main',
    '4e3dc17bc98d8b777f3c5fc46302047283620e97',
    'MIT'
  ),
  purdle: source(
    'daily content generation, validation, deterministic fallback and publishing',
    'pedromussi1/Purdle',
    'main',
    '1678a1ec7d4b9a21e065c9b27a5fa233332210cf',
    'MIT'
  ),
  fruitBoxGame: source(
    'solution-first deterministic procedural generation and retained solution certificate',
    'weizixiao/fruit-box-game',
    'main',
    'de7b1f59bff021d76f5138af17bed37220f7783e',
    'MIT',
    'engine.js'
  ),
  fruitBoxProofTests: source(
    'multi-seed deterministic solvability proof tests',
    'weizixiao/fruit-box-game',
    'main',
    'de7b1f59bff021d76f5138af17bed37220f7783e',
    'MIT',
    'tests/engine.test.mjs'
  ),
  fruitBoxAlgorithm: source(
    'documented generate-solution-first then place-and-certify workflow',
    'weizixiao/fruit-box-game',
    'main',
    'de7b1f59bff021d76f5138af17bed37220f7783e',
    'MIT',
    'docs/ALGORITHM.md'
  ),
  sabeo: source(
    'daily scheduling, activation and history control plane',
    'kristiandrex/sabeo',
    'main',
    '52210ee593e0e5c832cbf3cea8b6f228df073623',
    'unasserted in GitHub metadata'
  ),
  anki: source(
    'FSRS memory state, review priority, retention and workload simulation',
    'ankitects/anki',
    'main',
    '2ef2f7cac9673b697c4b9924a4135bfcbe3269b4',
    'AGPL-3.0-or-later'
  ),
  openEdx: source(
    'versioned question-bank, item assignment, attempts and assessment semantics',
    'openedx/openedx-platform',
    'master',
    '648d08b9f61695fea2e586abdb79beb527c7eee5',
    'AGPL-3.0'
  ),
  gygyQuestionBank: source(
    'AI authoring trust boundary, structured composition and agent runtime',
    'gygy-open/question-bank',
    'main',
    '6ccd09d670faad4de760cffffe26d4ef66a972b3',
    'AGPL-3.0'
  ),
  apl26: source(
    'entropy-based question selection and dependency invalidation',
    'neeraj5050/apl-26',
    'main',
    '6de2027f052aa7d95a691e86c30ef12e46bd58d3',
    'unasserted in GitHub metadata'
  ),
  atlasWorldGuesser: source(
    'server-authoritative seeded challenges and deterministic reconstruction',
    'Ludvig-Hedin/atlas-worldguesser',
    'main',
    '419aad1fca7d50135c7123c9ad6da885873bd07d',
    'AGPL-3.0'
  ),
  atlasAuthoritySolo: source(
    'server-owned game sessions and authoritative scoring from client guesses only',
    'Ludvig-Hedin/atlas-worldguesser',
    'main',
    '419aad1fca7d50135c7123c9ad6da885873bd07d',
    'AGPL-3.0',
    'convex/solo.ts'
  ),
  atlasAuthorityDaily: source(
    'daily server-owned truth and authoritative result submission',
    'Ludvig-Hedin/atlas-worldguesser',
    'main',
    '419aad1fca7d50135c7123c9ad6da885873bd07d',
    'AGPL-3.0',
    'convex/dailyChallenge.ts'
  ),
  atlasAuthorityChallenges: source(
    'deterministic challenge reconstruction and documented skipped-round validation lesson',
    'Ludvig-Hedin/atlas-worldguesser',
    'main',
    '419aad1fca7d50135c7123c9ad6da885873bd07d',
    'AGPL-3.0',
    'convex/challenges.ts'
  ),
  openEdxItemBank: source(
    'persistent per-user item-bank assignment and invalid/overlimit/add semantics',
    'openedx/openedx-platform',
    'master',
    '648d08b9f61695fea2e586abdb79beb527c7eee5',
    'AGPL-3.0',
    'xmodule/item_bank_block.py'
  ),
  openEdxProblemBlock: source(
    'attempt, grading, answer-release and randomization semantics',
    'openedx/openedx-platform',
    'master',
    '648d08b9f61695fea2e586abdb79beb527c7eee5',
    'AGPL-3.0',
    'xmodule/capa_block.py'
  ),
  gygyQuestionModelV2: source(
    'question lifecycle, content revision and versioned content model',
    'gygy-open/question-bank',
    'main',
    '6ccd09d670faad4de760cffffe26d4ef66a972b3',
    'AGPL-3.0',
    'backend/app/models/question.py'
  ),
  gygyQuestionCrudV2: source(
    'content revision increments only on actual publishable-content changes',
    'gygy-open/question-bank',
    'main',
    '6ccd09d670faad4de760cffffe26d4ef66a972b3',
    'AGPL-3.0',
    'backend/app/crud/crud_question.py'
  ),
  gygyQuestionValidationV2: source(
    'centralized cross-field question content validation',
    'gygy-open/question-bank',
    'main',
    '6ccd09d670faad4de760cffffe26d4ef66a972b3',
    'AGPL-3.0',
    'backend/app/services/question_content.py'
  ),
  openReplay: source(
    'session replay and production observability concepts',
    'openreplay/openreplay',
    'main',
    '354828a17fd2fc90fcfb4965a43aa79100638d1f',
    'mixed; confirm imported path'
  ),
  makeReady: source(
    'adaptive phrase-synchronous gameplay music director',
    'markzuckerbergas/make-ready',
    'main',
    '2c3df144fc42dfc774561e39aa93338f9654dcc6',
    'AGPL-3.0'
  ),
  sentry: source(
    'controlled rollout, operational feature gating and observability patterns',
    'getsentry/sentry',
    'master',
    '67610b2a57909ca921d6a52dcbf7410bc851b100',
    'FSL-1.1-Apache-2.0'
  )
});

export function upstreamSource(key){
  const entry = UPSTREAM_PROVENANCE[key];
  if(!entry) throw new Error('Unknown upstream provenance key: ' + key);
  return entry;
}

export function upstreamSourceList(){
  return Object.entries(UPSTREAM_PROVENANCE).map(([key,value]) => ({key,...value}));
}
