# Catalog Sprint — Workstream 13 Persistence / Economy QA

STATUS: **REAL-BROWSER PURCHASE/ROOM/MULTITAB/IMPORT/RECOVERY PASS / QUEST BROWSER TIMING STILL OPEN**

Branch: `screenshot-match-preproduction`  
Automated durable transaction baseline: `81bbf06dc070b0f72f942dde9c14ac4bba476922` — **98/98 tests + production build PASS**  
Broad Chromium persistence head: `795c2d6f9ee197c66bc725d6a7c53fe5f0fd3382`  
Focused Chromium recovery head: `04a7e72f5b8adb6d36a164df2edc324c877de390`  
Replit/Floot: **untouched**  
`main`: **not merged or modified**  
Real player data: **not used or modified**

## Material result

The prior device-offline blocker is no longer the correct classification. Workstream 13 created an isolated GitHub Actions + Playwright Chromium path that runs the production Vite build against synthetic state only. This produced real browser timing/reload/concurrency evidence without Replit/Floot or real player records.

### Broad browser stress — material PASS

GitHub Actions run `35660627560`, job `106534723983`, Chromium `140.0.7339.16`, exact head `795c2d6...`, artifact `10667216430`, digest `sha256:4ca9e54fba30addccc003cb33d02e7dd1cb9e68bd4af76ce2f189b4ba08c0eef`:

- production build: **PASS**, 1,613 modules;
- initial synthetic Coins/Stars/XP and unknown/no-art state: **PASS**;
- rapid double purchase of `tops-2`: **PASS exactly once**, including reload, one durable receipt and one daily-purchase increment;
- equip `tops-2` then reload: **PASS**;
- underlying React room `Put Away` / `Place` rapid double tap + reload: **PASS exactly once**;
- simultaneous same `tops-3` purchase from two browser tabs: **PASS exactly once**, second tab converged after reload;
- malformed save import through the live UI: **PASS**, existing save unchanged;
- accepted catalog-art path for owned/equipped companion state plus unknown/no-art IDs: **PASS**, no ownership/equipment pruning.

The broad harness's IndexedDB-recovery case was invalid because its test-only `addInitScript` reseeded localStorage whenever localStorage was intentionally deleted. That result is classified as **HARNESS INVALID**, not a product recovery failure.

### Focused IndexedDB recovery — PASS

A second BrowserContext removed that reseeding behavior and tested recovery directly. Run `35660997658`, job `106535917074`, exact head `04a7e72...`, artifact `10667273151`, digest `sha256:d121fa07b34419c9c04aa88aad6d96ee23157265bc04c1fc8a9d334fdb8b0620`:

- production build: **PASS**, 1,613 modules;
- current critical state reached IndexedDB backup: **PASS**;
- delete localStorage, reload, recover the exact critical state from IndexedDB: **PASS**;
- recovered Coins/Stars/XP, ownership, equipped IDs, room placement, Dream Goal and unknown/no-art IDs matched the pre-loss state.

This closes the previous real-browser localStorage-loss / IndexedDB-recovery evidence gap.

## Browser preservation matrix

| State / behavior | Browser evidence |
| --- | --- |
| Coins / Stars / XP survive interactions + reload | **PASS** |
| Star Worth purchase increment exactly once | **PASS** |
| Owned IDs including unknown/no-art | **PASS** |
| Equipped gear including unknown/no-art | **PASS** |
| Room placement including unknown/no-art | **PASS** |
| Dream Goal unknown/no-art ID | **PASS** |
| Rapid purchase double tap + reload | **PASS exactly once** |
| Same purchase from two tabs | **PASS exactly once** |
| Equip then reload | **PASS** |
| Underlying room Put Away / Place double tap + reload | **PASS** |
| Malformed import through UI | **PASS — no mutation** |
| localStorage loss + IndexedDB recovery | **PASS — exact critical state** |
| Accepted catalog image-path integration pruning state | **PASS — no pruning observed** |
| Quest wrong/retry + rapid answer + final refresh timing | **OPEN — QA harness locator mismatch** |

## Separate Store UI routing defect

The screenshot Store's selected-item right-rail `Place / Put Away` control did not mutate room placement when the selected item was already placed/equipped. The underlying React room action passed rapid double-tap, remove/place and reload testing.

Classification: **Store UI routing defect, not persistence transaction failure.** Workstream 04/15 should fix selected-item action delegation without rewriting the passing room persistence semantics.

## Remaining Workstream-13 release blocker

`PERSIST-QUEST-BROWSER-TIMING` remains open. The focused browser run reached the Quest test, but the QA harness selected an exact source-bank wrong-choice string that was not the rendered answer locator at that moment. This is currently a **browser harness/content-display mismatch**, not a reproduced persistence failure.

Automated durable Quest evidence is still green: final completion is committed with its receipt before the presentation timer, reload/replay is exactly once, repeated wrong retry does not farm rewards, and assisted success remains separate from independent mastery/evidence.

Next Workstream-13 action: bind the browser Quest test to the actual rendered choice buttons/current source question, then exercise wrong/retry, rapid correct double-click, and refresh immediately after final completion commit. Add runtime code only if that browser run reproduces a real race.

## Handoff

**15:** the broad `PERSIST-REAL-BROWSER-TRANSACTION-STRESS` blocker is substantially closed: purchase/reload, equip, room toggle, multi-tab replay, malformed import, IndexedDB recovery and no-art retention now have real Chromium evidence. Keep only Quest browser timing open for Workstream 13.  
**04:** fix the selected-item Store right-rail Place/Put Away routing while preserving underlying transaction behavior.  
**08:** catalog image-path integration must continue to preserve stable IDs/prices/unlocks and never filter `owned`, `equipped`, `roomDecor` or `dreamGoalId` by artwork availability.  
**12:** automated reward/evidence semantics remain green; coordinate rendered Quest-choice behavior if needed for the final browser timing case.

No persistence transaction/reward semantics, producer art, canonical catalog mapping, Replit, Floot, `main`, paid setting or real-player state was modified by Workstream 13 in this pass.
