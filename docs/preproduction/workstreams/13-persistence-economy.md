# Workstream 13 — Persistence + Economy Safety

STATUS: **REAL CHROMIUM PURCHASE/ROOM/MULTITAB/IMPORT/RECOVERY PASS / QUEST BROWSER TIMING OPEN**

Branch: `screenshot-match-preproduction`  
Automated durable transaction baseline: `81bbf06dc070b0f72f942dde9c14ac4bba476922` — **22/22 files, 98/98 tests, production build PASS**  
Broad Chromium evidence head: `795c2d6f9ee197c66bc725d6a7c53fe5f0fd3382`  
Focused IndexedDB recovery evidence head: `04a7e72f5b8adb6d36a164df2edc324c877de390`  
Detailed evidence: `docs/preproduction/catalog-sprint/persistence-qa.json` and `.md`  
Replit/Floot: **untouched**  
`main`: **not merged or modified**  
Real player data: **not accessed or modified**

## Protected state contract

Screenshot-match work must not reset or prune Coins, Stars, XP, Star Worth/Home progress, permanent owned IDs, equipped gear, room placement, Dream Goal, mastery/evidence, Buddy/Bond, district progress, durable receipts or recoverable backups. Image availability is presentation only: unknown/no-art IDs remain legitimate persisted state.

Migrations remain additive/backward-compatible. Permanent purchase receipts and Quest receipts survive sanitization, malformed input falls back safely, and saved IDs are not filtered against catalog-art availability.

## Durable transaction implementation remains unchanged

**Permanent purchase:** `applyPermanentPurchase` revalidates current ownership/receipt/Stars/Coins in the functional transaction, charges once, adds Star Worth once, records a per-item receipt and increments daily purchase once. Receipt-backed ownership recovery cannot charge again.

**Final Quest completion:** completion reward/progress is committed atomically with active/completed receipt state before the 950 ms presentation transition; replay is rejected.

**Storage/recovery:** missing localStorage remains a recovery state until IndexedDB is checked. Owned/equipped/room/Dream Goal IDs are shape-sanitized only and never filtered by art presence.

No persistence transaction code was rewritten in this pass because real-browser testing did not reproduce a transaction race.

## New real-browser evidence

Workstream 13 established an authorized synthetic GitHub Actions + Playwright Chromium path, eliminating the prior remote-device-only blocker.

### Broad persistence stress

Run `35660627560`, job `106534723983`, exact head `795c2d6...`, Chromium `140.0.7339.16`, artifact `10667216430`, digest `sha256:4ca9e54fba30addccc003cb33d02e7dd1cb9e68bd4af76ce2f189b4ba08c0eef`:

- production Vite build: **PASS**, 1,613 modules;
- synthetic initial state and unknown/no-art retention: **PASS**;
- rapid `tops-2` purchase double-click: **PASS exactly once**;
- purchase survives reload with one receipt / one ownership / one daily increment: **PASS**;
- equip `tops-2` then reload: **PASS**;
- underlying room Put Away / Place rapid double-click + reload: **PASS exactly once**;
- two-tab simultaneous `tops-3` purchase replay: **PASS exactly once**;
- malformed import through live Study UI leaves current save unchanged: **PASS**;
- accepted companion image-path integration does not prune owned/equipped state: **PASS**.

The broad harness's IndexedDB case was invalidated because its test-only init script reseeded localStorage after intentional deletion. That is a harness artifact, not a product failure.

### Focused IndexedDB recovery

Run `35660997658`, job `106535917074`, exact head `04a7e72...`, Chromium `140.0.7339.16`, artifact `10667273151`, digest `sha256:d121fa07b34419c9c04aa88aad6d96ee23157265bc04c1fc8a9d334fdb8b0620`:

- production Vite build: **PASS**, 1,613 modules;
- current synthetic critical state persisted to IndexedDB: **PASS**;
- localStorage deleted, page reloaded, exact critical state recovered from IndexedDB: **PASS**;
- Coins/Stars/XP, ownership, equipped gear, room placement, Dream Goal and unknown/no-art IDs matched pre-loss state.

## Current preservation matrix

| State / behavior | Evidence |
| --- | --- |
| Coins / Stars / XP | **PASS automated + browser** |
| Star Worth / Home progress | **PASS automated + browser purchase check** |
| Owned IDs including unknown/no-art | **PASS automated + browser** |
| Equipped gear including unknown/no-art | **PASS automated + browser** |
| Room placement including unknown/no-art | **PASS automated + browser** |
| Dream Goal | **PASS automated + browser recovery** |
| Mastery / transfer evidence | **PASS automated; preserved in browser recovery seed** |
| Buddy / Bond | **PASS automated; preserved in browser recovery seed** |
| District progress | **PASS automated; preserved in browser recovery seed** |
| Rapid purchase double tap + reload | **PASS Chromium exactly once** |
| Multi-tab same-purchase replay | **PASS Chromium exactly once** |
| Equip + reload | **PASS Chromium** |
| Underlying room Place/Put Away double tap + reload | **PASS Chromium** |
| Malformed import | **PASS Chromium — no mutation** |
| localStorage loss + IndexedDB backup | **PASS Chromium exact recovery** |
| Missing/replaced art affects ownership | **PASS — no pruning observed** |
| Quest wrong/retry + rapid-answer + final-refresh timing | **OPEN — browser harness locator mismatch** |

## Store right-rail defect — separate owner

The screenshot Store right rail exposes a `Place / Put Away` action that did not mutate placement when the selected item was already placed/equipped. The underlying original room action passes state transition, rapid double-tap and reload testing.

This is **not a persistence transaction defect**. Handoff to Workstream 04/15: fix right-rail action delegation while preserving the passing room transaction/guard behavior.

## Remaining Workstream-13 blocker

`PERSIST-QUEST-BROWSER-TIMING` remains open. The focused real-browser run reached Quest testing but timed out looking for one exact source-bank wrong-choice string that was not the current rendered answer locator. No product persistence failure was reproduced from that timeout.

Automated Quest transaction evidence remains green: reload/replay is exactly once, completion is committed before the presentation timer, repeated wrong retry does not farm rewards, and assisted success remains distinct from independent mastery/evidence.

Next pass should align the browser harness to the actual rendered answer controls/current question, then run:

- wrong answer + repeated retry with no reward/evidence farming;
- rapid correct double-click with one evidence transition;
- final correct action with immediate refresh before the 950 ms UI transition;
- reload verification of completion receipt, Coins/XP, Quest count, Buddy Bond and daily Quest progress.

Runtime code changes are justified only if that browser test reproduces a real race.

## Handoff

**15:** the prior all-browser timing blocker is now narrowed to Quest timing only; purchase/equip/room/multi-tab/import/IndexedDB/no-art cases have real Chromium evidence.  
**04:** correct the selected-item right-rail Place/Put Away routing; keep underlying persistence semantics unchanged.  
**12:** help align rendered Quest answer selection with the source question if needed; reward/evidence policy remains automated-green.  
**08:** accepted art path changes may continue, but never filter `owned`, `equipped`, `roomDecor` or `dreamGoalId` by image availability.

No producer art, canonical catalog manifest/runtime, Replit, Floot, `main`, paid setting or real-player state was modified by Workstream 13.
