# Catalog Sprint — Workstream 13 Persistence / Economy QA

STATUS: **LATEST RUNTIME CI REVALIDATION PASS / REAL-BROWSER TIMING-CONCURRENCY STILL BLOCKED**

Branch: `screenshot-match-preproduction`  
Audited branch head before this report write: `2efff814883bffaa695cb6dfae80ed2dc3dc2658`  
Latest runtime-affecting persistence-relevant CI head: `81bbf06dc070b0f72f942dde9c14ac4bba476922`  
Replit/Floot: **untouched**  
`main`: **not merged or modified**  
Real player data: **not used or modified**

## Material result this pass

The branch changed after the prior Workstream-13 evidence: `src/mobileAccessibilityRuntime.js` received Store focus/scroll fixes. Persistence/economy code, catalog manifest/runtime mapping, prices and item IDs did not change. Because this was a real runtime change, I did not rely only on the older `1ce9101...` proof.

GitHub Actions run `35652513911`, job `106508054992`, on exact head `81bbf06dc070b0f72f942dde9c14ac4bba476922` completed successfully:

- **22/22 test files PASS**;
- **98/98 tests PASS**;
- persistence reload transaction tests: **3/3 PASS**;
- durable persistence transaction tests: **5/5 PASS**;
- storage recovery/sanitization tests: **7/7 PASS**;
- rapid purchase across React-style rerender: **PASS**;
- rapid Place/Put Away: **PASS**;
- rapid Quest-answer double tap: **PASS**;
- reward/evidence policy: **PASS**;
- 192-item catalog invariant: **PASS**;
- production Vite build: **PASS**, 1,613 modules transformed;
- output: CSS 167.39 kB / 35.69 kB gzip; JS 304.14 kB / 93.34 kB gzip.

The commits after that tested runtime head through the audited head change catalog review/QA/coordination documents and the staged-art QA workflow, not storage, transaction, reward, App transaction wiring, catalog canonical mapping or player-state semantics. The new CI therefore revalidates the existing Workstream-13 protections after the latest runtime-affecting accessibility change.

## Protected state remains green in automated evidence

The durable transaction/reload protections remain intact: permanent purchases revalidate current ownership/Stars/Coins inside the functional save transaction and persist a per-item receipt; completed receipts can restore missing ownership without another charge. Final Quest completion commits Coins, XP, Quest count, Buddy Bond and daily completion atomically with an active/completed receipt before the feedback-transition timer, and replay is rejected.

Storage sanitization preserves the receipt fields, keeps missing-localStorage recovery open until IndexedDB is checked, rejects malformed imported arrays, and shape-sanitizes stable IDs without filtering them against current artwork. Missing/new/replaced catalog images therefore do not remove permanent ownership, equipped gear, room placement or Dream Goal state.

Automated preservation remains **PASS** for Coins, Stars, XP, Star Worth/Home progress, owned IDs including unknown/no-art IDs, equipped gear, room placement, Dream Goal, mastery/evidence, Buddy/Bond and district progress.

## Real-browser timing/concurrency blocker

I checked the authorized executable device path again in this run. The sole authorized device `PAAM-L044` remains **offline**, last seen `2026-09-18T11:51:14.213+00:00`. There is therefore still no authorized online branch-local Chromium/Vite path for destructive synthetic transaction timing.

I did **not** relabel jsdom reload tests, Playwright visual screenshots or static source inspection as real-browser persistence proof. The following remain **BLOCKED / NOT TESTED** in a real browser:

- purchase/equip/place followed by immediate refresh/re-entry;
- multi-tab purchase/reward replay timing;
- refresh immediately around final Quest feedback/transition;
- physical/touch double taps;
- partially malformed import through the real browser path;
- live localStorage deletion while a valid IndexedDB backup remains.

This is now an unchanged blocker for a second cycle and is **escalated to Workstream 15**. The smallest next action is not another source rewrite: 15 should coordinate an authorized executable local Chromium/Vite path, after which 13 should run the isolated synthetic timing/concurrency matrix without real player data.

## Handoff

**15:** durable purchase, Quest completion and recovery semantics are still green after the latest runtime-affecting change. `PERSIST-BROWSER-TIMING-CONCURRENCY` is the only Workstream-13 release blocker and is escalated after two unchanged cycles.  
**14:** visual artifacts are not transaction timing evidence; expose any authorized state-isolated browser harness to 13 if one becomes available.  
**08:** catalog integration may continue, but must never filter `owned`, `equipped`, `roomDecor` or `dreamGoalId` against image availability.

No runtime persistence/economy code, producer art, canonical catalog manifest/runtime, Replit, Floot, `main`, paid setting or real player state was modified in this pass.
