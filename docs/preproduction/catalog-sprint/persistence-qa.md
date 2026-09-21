# Catalog Sprint — Workstream 13 Persistence / Economy QA

STATUS: **AUTOMATED GATE PASS / INDEXEDDB HYDRATION RACE FIXED / LIVE TRANSACTION STRESS STILL BLOCKED**

Branch: `screenshot-match-preproduction`  
Audited branch head before report write: `42ca9a098f4ad8e1e8772ae923788a9c93ea8d4d`  
CI-tested persistence head: `c5f738a4243fabdc89784e3bbf8e61cd01427474`  
Replit/Floot: **untouched**  
`main`: **not merged or modified**  
Real player data: **not used or modified**

## Material fix in this pass

A real recovery race existed when `starblox-save-v2` was absent but IndexedDB already held recoverable progress. On the first render, `persistSnapshot()` synchronously wrote the default render into localStorage while IndexedDB hydration was still asynchronous. If the page refreshed during that window, the next boot could see the new local default first and never restore the older IndexedDB progress.

`src/storage.js` now treats missing localStorage as a **recovery state** until IndexedDB has been checked. If a backup exists, that preserved backup is mirrored into localStorage. Only a genuinely empty IndexedDB establishes the new default in both stores. IndexedDB/open failure falls back to localStorage rather than dropping the save. This is additive and backward-compatible: no save schema reset, currency rebalance, catalog-ID pruning, or migration of real player records.

A deterministic regression was added to `src/storage.test.js`. It starts with no current localStorage key plus an existing IndexedDB backup containing Coins, Stars, XP, unknown/no-art ownership, equipped gear, room placement, Dream Goal and Buddy Bond; the test verifies that the initial default render cannot mask or overwrite that backup during hydration.

## Exact test/build evidence

GitHub Actions run `35647722275`, job `106492177317`, on `c5f738a4243fabdc89784e3bbf8e61cd01427474`:

- **20/20 test files PASS**;
- **86/86 tests PASS**;
- new IndexedDB hydration regression: **PASS**;
- existing storage recovery / unknown-no-art ownership tests: **PASS**;
- rapid purchase rerender guard: **PASS**;
- rapid room toggle guard: **PASS**;
- rapid Quest-answer guard: **PASS**;
- reward/evidence tests: **PASS**;
- production Vite build: **PASS**, 1,612 modules transformed.

The two commits after the tested head that were present at audit time changed only catalog release-QA documentation and Workstream 12 documentation; no persistence/economy runtime changed, so the test evidence remains applicable to the audited head.

## Preserved invariants

Automated evidence continues to preserve Coins, Stars, XP, Star Worth/Home progress, owned inventory, exact equipped IDs, room placement, Dream Goal, mastery/evidence, Buddy/Bond and district progress. Unknown/no-art owned IDs remain valid state and are never removed because an image is missing. The catalog is presentation; ownership is state.

Reward policy remains unchanged: first wrong is modest/non-punitive, repeated wrong retry earns nothing, assisted correct cannot create Coins/Mastery Star/transfer evidence, and Mastery Stars remain independent-success-only.

## Real-browser attempt

A real-browser persistence stress run could not be executed in this pass: the authorized remote desktop/browser device exposed to this automation was offline. Current GitHub workflows provide CI and visual/catalog browser QA, but there is no Workstream-13-owned live purchase/reload/IndexedDB transaction flow that can be invoked without a shared workflow change, which must be coordinated through Workstream 15.

This is therefore **BLOCKED / NOT TESTED**, not silently promoted to PASS. The deterministic storage-level race itself is fixed and regression-tested; the equivalent live browser delete-localStorage/reload scenario still belongs in release QA.

## Two remaining release blockers found in the shared App transaction path

1. **Durable purchase idempotency is not proven.** `buy()` checks owned state, Stars and Coins before calling `setSave()`, but the functional updater itself subtracts Coins/adds Star Worth/appends ownership without rechecking the current state or a durable purchase receipt. `purchaseGuardRuntime.js` protects normal rapid DOM clicks—even through a React button replacement—but a UI capture debounce is not durable exactly-once transaction semantics for non-DOM replay/concurrent contexts. This requires a shared `App.jsx` transaction change coordinated by Workstream 15, then Workstream 13 should add the regression and real-browser replay test.

2. **Quest-completion refresh is not exactly-once.** The final correct answer schedules `advanceQuestion()` for 950 ms later; `finishQuest()` then adds the +30 Coins/+30 XP completion reward, Quest completion counter, Buddy Bond and daily Quest counter. Quest UI progress is not persisted. A refresh before that timer can therefore lose the completion award/record instead of guaranteeing one durable completion. This also requires a shared `App.jsx` completion-receipt/state-transition change through Workstream 15, followed by Workstream 13 regression/browser verification.

These are release blockers until reproduced/fixed with the shared owner; they do not justify speculative schema resets or balance changes.

## Next handoff

- **15:** coordinate the smallest shared `App.jsx` changes for atomic purchase recheck/receipt semantics and durable exactly-once final Quest completion; do not alter prices/reward amounts.
- **13:** after that wiring lands, add only the corresponding regression tests and exercise purchase/equip/place/reload plus final-Quest refresh in an isolated synthetic browser profile.
- **14/15:** provide or authorize the existing branch-local browser harness path for persistence stress without Replit or `main`.
- **08:** catalog art integration may continue; missing/replaced images must never filter `owned`, `equipped`, `roomDecor` or `dreamGoalId`.

No Replit update/publish, `main` merge, paid-service change, producer-art edit, or canonical catalog-manifest edit was performed.
