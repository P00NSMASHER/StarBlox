# Catalog Sprint — Workstream 13 Persistence / Economy QA

STATUS: **DURABLE PURCHASE + QUEST RELOAD SEMANTICS PASS IN CI / REAL-BROWSER TRANSACTION STRESS BLOCKED**

Branch: `screenshot-match-preproduction`  
Audited branch head before report write: `3cc4c44cc5a310fcf23ad9d88cfed856ea0f20c7`  
CI-tested Workstream-13 head: `1ce91011311dff6ea9b7b8119010d84f0466e42f`  
Replit/Floot: **untouched**  
`main`: **not merged or modified**  
Real player data: **not used or modified**

## What changed since the prior report

The two shared-App source gaps reported previously have now been implemented by the coordinated branch work. `App.jsx` routes permanent purchases through `applyPermanentPurchase(current,item)` inside the functional save updater, and final Quest completion is applied atomically during the final correct-answer save update with an active/completed Quest receipt. The 950 ms timer now controls only UI transition; it is no longer the point at which the +30 Coins/+30 XP/Quest/Bond/daily completion state is created.

`persistenceTransactions.js` revalidates ownership, Stars and Coins from the current transaction state, records a durable purchase receipt, and can restore ownership from a receipt without charging twice. Storage sanitization preserves the purchase/Quest receipt fields. The existing IndexedDB hydration fix remains intact: a missing current localStorage key stays in recovery state until the backup is checked, so a default render cannot strand an older backup.

## New targeted evidence this pass

Added `src/persistenceEconomyIntegration.test.js` at commit `1ce91011311dff6ea9b7b8119010d84f0466e42f`. These are synthetic jsdom/localStorage integration tests, not claimed as live-browser timing proof.

The three new cases verify:

1. a permanent purchase persists ownership + its durable receipt through reload and replay cannot subtract Coins or increase Star Worth/daily purchase twice;
2. a receipt-only partial save restores ownership for a synthetic unknown/no-art item without a second charge and preserves that same ID as the Dream Goal;
3. final Quest completion persists through reload and the same completion receipt cannot replay Coins, XP, Quest count, Buddy Bond or the daily Quest count, while Stars, Star Worth, ownership, equipment, room placement, mastery, transfer evidence and district progress remain unchanged.

This directly verifies the state semantics that had only been source-reviewed in the prior report. Missing art remains presentation-only and never prunes persisted IDs.

## Exact CI evidence

GitHub Actions run `35652200670`, job `106507027345`, exact head `1ce91011311dff6ea9b7b8119010d84f0466e42f`:

- **22/22 test files PASS**;
- **98/98 tests PASS**;
- new reload transaction cases: **3/3 PASS**;
- durable transaction helper cases: **5/5 PASS**;
- storage recovery/sanitization cases: **7/7 PASS**;
- rapid purchase rerender, room toggle and Quest double-tap guards: **PASS**;
- learning reward/evidence policy: **PASS**;
- 192-item Store invariant: **PASS**;
- production Vite build: **PASS**, 1,613 modules transformed;
- output: CSS 167.39 kB / 35.69 kB gzip; JS 304.00 kB / 93.28 kB gzip.

The only two commits after the tested head at audit time changed `reviews/02.json` and `reviews/05.json`; no App, storage, transaction, reward or catalog-runtime code changed, so the persistence evidence remains applicable to the audited head.

## Protected-state result

Automated evidence now covers preservation of Coins, Stars, XP, Star Worth/Home progress, permanent owned IDs including unknown/no-art IDs, equipped gear, room placement, Dream Goal, mastery/evidence, Buddy/Bond and district progress through sanitization and the new purchase/Quest persist-reload tests. Purchase receipts prevent recharge after a persisted transaction; Quest completion receipts prevent reward replay after a persisted completion. Wrong/retry/assisted reward semantics remain governed by Workstream 12’s tested policy.

## Real-browser attempt

I retried the authorized executable-browser path. Remote Desktop Commander reports the sole authorized device `PAAM-L044` **offline** (last seen September 18, 2026). Browser Use cannot reach the branch-local Vite preview. Therefore purchase/equip/place/reload, multi-tab replay, refresh around final Quest transition, malformed-import behavior and live localStorage-loss/IndexedDB recovery are still **BLOCKED / NOT TESTED in a real browser** rather than being inferred from jsdom or screenshots.

The previous two *source* release blockers are therefore closed at the implementation + automated reload level. The remaining Workstream-13 release blocker is a narrower one: **real-browser transaction/recovery timing evidence**.

## Handoff

**15:** update control-state persistence evidence: durable purchase idempotency and final Quest completion are implemented and CI-proven; retain only the real-browser timing/stress blocker.  
**14/15:** expose/reuse an approved branch-local executable Chromium harness when available; do not substitute visual screenshots for persistence timing.  
**13 next pass:** when such a path is available, run isolated synthetic purchase/equip/place/reload, final-Quest refresh, localStorage-loss/IndexedDB restore and multi-tab replay cases. Add code only if one of those real-browser cases reveals a concrete gap.  
**08:** catalog art integration may continue; never filter `owned`, `equipped`, `roomDecor` or `dreamGoalId` against image availability.

No Replit update/publish, `main` merge, paid-service change, producer-art edit, canonical catalog-manifest edit or real-player mutation was performed.
