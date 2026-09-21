# Workstream 13 — Persistence + Economy Safety

STATUS: **LATEST RUNTIME CI PASS / DURABLE TRANSACTIONS GREEN / REAL-BROWSER TIMING STRESS REMAINS**

Branch: `screenshot-match-preproduction`  
Latest runtime-affecting CI-tested head: `81bbf06dc070b0f72f942dde9c14ac4bba476922`  
Audited continuation before this report write: `2efff814883bffaa695cb6dfae80ed2dc3dc2658`  
Detailed evidence: `docs/preproduction/catalog-sprint/persistence-qa.json` and `.md`  
Replit/Floot: **untouched**  
`main`: **not merged or modified**  
Real player data: **not accessed or modified**

## Protected state contract

Screenshot-match work must never silently reset, prune or rewrite valid Coins, Stars, XP, Star Worth/Home progress, permanent owned IDs, equipped gear, room placement, Dream Goal, mastery/evidence, Buddy/Bond, district progress or recoverable backups. Image availability is presentation only: unknown/no-art IDs remain legitimate persisted state.

Migrations remain additive/backward-compatible. Malformed fields fall back safely, arrays are rejected as save objects, stable IDs are de-duplicated without catalog-art filtering, durable receipts survive sanitization, and recoverable backups are preserved rather than reset.

## Current durable protections

**Permanent purchase:** `applyPermanentPurchase(current,item)` executes in the functional save transaction, revalidates current ownership/Stars/Coins, charges once, adds Star Worth once, records a durable per-item receipt and increments the daily purchase counter once. Receipt-backed ownership recovery does not charge again.

**Final Quest completion:** the active Quest receipt is consumed during the final correct-answer save transition. +30 Coins, +30 XP, Quest completion, Buddy Bond and daily completion are committed atomically with the completed receipt before the 950 ms presentation transition. Replaying the completed receipt is rejected.

**Storage/recovery:** purchase/Quest receipts survive sanitization. Missing current localStorage remains a recovery state until IndexedDB is checked, so an initial default render cannot mask a recoverable backup. Owned/equipped/room/Dream Goal IDs are shape-sanitized only and never filtered against art availability.

## Revalidation after the latest runtime change

Since the prior Workstream-13 test head, the only runtime-affecting change was `src/mobileAccessibilityRuntime.js` Store focus/scroll behavior. Persistence/economy code and canonical catalog mappings were unchanged. GitHub Actions therefore provides a meaningful cross-runtime regression check rather than a duplicate documentation-only PASS.

Run `35652513911`, job `106508054992`, exact head `81bbf06dc070b0f72f942dde9c14ac4bba476922`:

- **22/22 test files PASS**;
- **98/98 tests PASS**;
- purchase/Quest reload transaction integration **3/3 PASS**;
- durable transaction helpers **5/5 PASS**;
- storage recovery/sanitization **7/7 PASS**;
- rapid Buy Forever across a React-style rerender **PASS**;
- rapid Place/Put Away **PASS**;
- rapid Quest-answer double tap **PASS**;
- reward/evidence semantics **PASS**;
- 192-item catalog invariant **PASS**;
- production build **PASS**, 1,613 modules transformed;
- CSS 167.39 kB / 35.69 kB gzip; JS 304.14 kB / 93.34 kB gzip.

Commits after that tested head through the audited continuation are catalog QA/review/coordination/workflow changes, not persistence/economy or canonical catalog-runtime changes. The automated persistence evidence therefore remains applicable.

## Current preservation matrix

| State / behavior | Evidence |
| --- | --- |
| Coins / Stars / XP | **PASS — automated** |
| Star Worth / Home progress | **PASS — automated** |
| Owned IDs including unknown/no-art | **PASS — automated** |
| Equipped gear | **PASS — automated** |
| Room placement | **PASS — automated** |
| Dream Goal | **PASS — automated** |
| Mastery / transfer evidence | **PASS — automated** |
| Buddy / Bond | **PASS — automated** |
| District progress | **PASS — automated** |
| Corrupted-save / legacy recovery | **PASS — automated** |
| localStorage-missing + IndexedDB backup | **PASS — automated** |
| Purchase replay across persisted reload | **PASS — automated** |
| Quest-completion replay across persisted reload | **PASS — automated** |
| Rapid purchase / room / Quest UI actions | **PASS — automated guards** |
| Real-browser transaction timing/concurrency | **BLOCKED / NOT TESTED** |

## Remaining release blocker — escalated

The authorized executable-device path was checked again. `PAAM-L044` is still **offline**, last seen `2026-09-18T11:51:14.213+00:00`. No approved online branch-local Chromium/Vite path is currently available for isolated destructive timing tests.

The remaining real-browser matrix is purchase/equip/place then refresh/re-entry, final-Quest refresh around feedback transition, multi-tab purchase/reward replay, malformed import, physical/touch double taps, and localStorage deletion with IndexedDB backup recovery. This blocker has now remained unchanged for two cycles and is **escalated to Workstream 15**. Another persistence source rewrite is not justified without a reproducible browser failure.

## Reward / retry contract retained

Workstream 12's tested policy remains compatible with the persistence layer: repeated wrong retries do not farm rewards, assisted success cannot become independent mastery/transfer evidence, and wrong answers do not remove currency, ownership or permanent progress. Durable receipts change transaction safety only; they do not change prices or reward amounts.

## Handoff

**15:** automated persistence/economy semantics remain green on the newest runtime-affecting CI head. Coordinate an authorized executable local Chromium/Vite path for the one remaining browser timing/concurrency release blocker.  
**13 next pass:** if that path appears, immediately run isolated synthetic purchase/equip/place/reload, final-completion refresh, malformed-import, IndexedDB recovery and multi-tab replay tests; add code only for a reproducible failure.  
**14:** screenshots and visual QA are not transaction timing proof; share an authorized state-isolated interaction harness if available.  
**08:** never make catalog art presence a filter for `owned`, `equipped`, `roomDecor` or `dreamGoalId`.

No producer art, canonical catalog manifest/runtime, Replit, Floot, `main`, paid setting or real-player state was modified by Workstream 13.
