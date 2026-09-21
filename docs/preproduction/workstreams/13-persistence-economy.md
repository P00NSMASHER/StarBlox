# Workstream 13 — Persistence + Economy Safety

STATUS: **AUTOMATED FULL SUITE + BUILD PASS / INDEXEDDB HYDRATION LOSS WINDOW FIXED / LIVE TRANSACTION STRESS + TWO SHARED-APP BLOCKERS REMAIN**

Branch: `screenshot-match-preproduction`  
Last CI-tested persistence head: `c5f738a4243fabdc89784e3bbf8e61cd01427474`  
Audited continuation after that run: docs-only through `42ca9a098f4ad8e1e8772ae923788a9c93ea8d4d`  
Detailed catalog evidence: `docs/preproduction/catalog-sprint/persistence-qa.json` and `.md`  
Replit/Floot: **untouched**  
`main`: **not merged or modified**  
Real player data: **not accessed or modified**

## Protected state contract

Screenshot-match work may change presentation, but must never silently reset, prune or rewrite valid Coins, Stars, XP, Star Worth/Home progress, permanent owned IDs, equipped gear, room placement, Dream Goal, mastery/evidence, Buddy/Bond, district progress or recoverable backups. Missing artwork is never a reason to alter ownership/equipment/placement/Dream Goal state.

Existing shape recovery remains additive/backward-compatible: malformed fields fall back safely while valid fields survive, arrays are rejected as imported saves, IDs are de-duplicated without catalog-art filtering, and unknown/no-art IDs remain legitimate persisted state.

## Material change this cycle — IndexedDB hydration recovery race

A source-level recovery race was confirmed and fixed entirely inside Workstream-13-owned persistence code.

Before the fix, a player with missing `starblox-save-v2` localStorage but recoverable IndexedDB progress could hit this sequence:

1. initial React state renders from defaults because localStorage is absent;
2. asynchronous IndexedDB recovery begins;
3. the persistence effect immediately writes that default state into the current localStorage key;
4. a refresh before IndexedDB hydration completes causes the next boot to prefer the newly written local default, stranding the older recoverable IndexedDB backup.

`src/storage.js` now treats missing current localStorage as a recovery state until IndexedDB is checked. An existing backup is mirrored into localStorage; only a genuinely empty IndexedDB establishes the new default save. IndexedDB/open failure falls back to localStorage. No schema reset, balance change, ID migration or real-player mutation was introduced.

A deterministic regression was added to `src/storage.test.js` with an existing IndexedDB backup containing currency/progression plus unknown/no-art owned/equipped/room/Dream Goal IDs. It verifies that `persistSnapshot(defaultRender)` cannot create a local default before backup inspection, cannot overwrite the backup, and restores the backup to both read paths.

Storage change commit: `18de120c384270b0fe3a47220fa2d03bbe845c42`  
Regression commit / tested head: `c5f738a4243fabdc89784e3bbf8e61cd01427474`

## Full CI and build evidence now available

The previous report incorrectly said branch CI required a `main` path. Current `.github/workflows/ci.yml` runs directly on `screenshot-match-preproduction`; no Replit or main merge is required.

GitHub Actions run `35647722275`, job `106492177317`, exact head `c5f738a4243fabdc89784e3bbf8e61cd01427474`:

- **20/20 test files PASS**;
- **86/86 tests PASS**;
- new IndexedDB hydration regression **PASS**;
- existing storage recovery / unknown-no-art ownership tests **PASS**;
- rapid Buy Forever guard including React-style rerender replacement **PASS**;
- rapid Place/Put Away guard **PASS**;
- rapid Quest-answer double-tap guard **PASS**;
- reward/evidence policy tests **PASS**;
- production Vite build **PASS**;
- 1,612 modules transformed;
- output: CSS 167.22 kB / 35.66 kB gzip; JS 301.33 kB / 92.36 kB gzip.

A Git compare from the tested head through the audited continuation showed only catalog release-QA documentation and Workstream-12 documentation changes, so this persistence/runtime proof remains applicable to that audited continuation.

## Current state-preservation results

| State / behavior | Evidence status |
| --- | --- |
| Coins / Stars / XP | **PASS — automated round-trip + sanitizer** |
| Star Worth / Home progress | **PASS — automated round-trip** |
| Owned IDs including unknown/no-art | **PASS — automated; never filtered by art** |
| Equipped IDs | **PASS — automated persistence + presentation fallback does not mutate save** |
| Room placement | **PASS — persistence + rapid-toggle guard** |
| Dream Goal | **PASS — persisted by stable ID independent of art** |
| Mastery / learning evidence | **PASS — persistence + reward/evidence tests** |
| Buddy / Bond | **PASS — persistence** |
| District progress | **PASS — persistence** |
| Corrupted-save recovery | **PASS — automated** |
| Missing localStorage + existing IndexedDB backup | **PASS — fixed and regression-tested this cycle** |
| Rapid purchase click through rerender | **PASS — UI guard** |
| Rapid room Place/Put Away | **PASS — UI guard** |
| Rapid Quest answer | **PASS — UI guard** |
| Repeated wrong / assisted reward policy | **PASS — automated** |

## Live browser execution attempt

A real-browser destructive/recovery stress run was attempted through the authorized remote desktop/browser capability available to this automation, but the connected device was offline. Existing GitHub workflows provide branch-local CI and visual/catalog browser QA, but Workstream 13 does not own an invokable live purchase/reload/IndexedDB transaction workflow in the current branch; adding/changing shared workflow configuration requires coordination through Workstream 15.

Therefore real-browser purchase/equip/place/reload, multi-tab timing, final-Quest refresh, and physical-device taps remain **BLOCKED / NOT TESTED**, not PASS. No real player profile was used.

## Two shared-App release blockers found

### 1. Durable purchase idempotency is not yet guaranteed

`buy()` currently checks `save.owned`, Stars and Coins before `setSave()`. The functional updater then subtracts Coins, adds Star Worth, appends ownership and increments the daily purchase counter without rechecking the `current` state or a durable transaction receipt.

The capture guard successfully stops ordinary rapid DOM double-clicks, including a React button replacement, but a UI debounce is not durable exactly-once transaction semantics for non-DOM replay or concurrent contexts. Workstream 13 should not patch shared `App.jsx` directly under the V2 ownership rules; Workstream 15 must coordinate the narrow shared change, after which 13 should add the transaction regression/browser replay proof. Prices and balances must not change.

### 2. Final Quest completion has a refresh loss window

The final correct answer schedules `advanceQuestion()` after 950 ms. Only then does `finishQuest()` add +30 Coins, +30 XP, `questsCompleted`, Buddy Bond and the daily Quest counter. Quest UI/progress itself is not persisted. Refresh during that window can therefore lose the completion award/record instead of providing a durable exactly-once completion transition.

This also needs a narrow shared `App.jsx` change through Workstream 15, followed by Workstream-13 regression and synthetic browser refresh-before/after verification. Reward amounts and learning evidence semantics must remain unchanged.

These are release blockers, not reasons to redesign persistence or reset saves.

## Reward / retry contract retained

`questRewardPolicy.js` still enforces:
- first wrong: small non-punitive learning reward only;
- repeated wrong retry: zero additional reward;
- assisted correct retry: practice XP only, no Coins, no Mastery Star, no transfer evidence;
- independent eligible mastery: only path to a Mastery Star;
- wrong answers never remove currency, ownership or permanent progress.

Workstream 12 semantic/evidence policy and Workstream 13 persistence/economy policy remain aligned.

## Handoff

**15:** coordinate the smallest shared `App.jsx` changes for (a) atomic/durable purchase idempotency and (b) durable exactly-once final Quest completion. Preserve all existing reward/price values and legacy saves.

**13 next cycle:** once either shared change lands, add only the corresponding verified regression and run targeted + full CI. Then exercise the actual purchase/equip/place/reload or completion-refresh path in an isolated synthetic browser when an authorized branch-local browser path is available.

**14/15:** expose/reuse a branch-local live browser harness for Workstream-13 state transitions without Replit or `main`; do not substitute screenshots or jsdom for browser persistence timing.

**08:** catalog integration may continue. Asset availability must never be consulted to prune `owned`, `equipped`, `roomDecor` or `dreamGoalId`.

No producer art, canonical catalog manifest/runtime, Replit, Floot, `main`, paid settings or real player data were touched by this workstream.
