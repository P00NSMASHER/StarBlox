# Workstream 13 — Persistence + Economy Safety

STATUS: **AUTOMATED DURABLE TRANSACTION/RELOAD GATE PASS / REAL-BROWSER TIMING STRESS REMAINS**

Branch: `screenshot-match-preproduction`  
CI-tested Workstream-13 head: `1ce91011311dff6ea9b7b8119010d84f0466e42f`  
Audited continuation: `3cc4c44cc5a310fcf23ad9d88cfed856ea0f20c7` (review-document changes only after tested head)  
Detailed evidence: `docs/preproduction/catalog-sprint/persistence-qa.json` and `.md`  
Replit/Floot: **untouched**  
`main`: **not merged or modified**  
Real player data: **not accessed or modified**

## Protected state contract

Screenshot-match presentation work must never silently reset, prune or rewrite valid Coins, Stars, XP, Star Worth/Home progress, permanent owned IDs, equipped gear, room placement, Dream Goal, mastery/evidence, Buddy/Bond, district progress or recoverable backups. Image availability is not an ownership rule. Unknown/no-art IDs remain legitimate persisted state.

Migrations remain additive/backward-compatible. Malformed fields fall back safely, arrays are rejected as save objects, stable IDs are de-duplicated without catalog-art filtering, and recoverable backups are preserved rather than reset.

## Durable transaction protections now implemented

The prior shared-App transaction gaps have landed and are now covered by regression evidence.

**Permanent purchase:** `applyPermanentPurchase(current,item)` runs inside the functional save update and revalidates current ownership, Mastery Stars and Coins before changing state. A successful purchase subtracts the price once, adds the same amount to Star Worth, appends ownership, records a durable item receipt and increments the daily purchase counter once. If a receipt exists but ownership was lost from a partial/malformed snapshot, ownership is restored without another charge.

**Final Quest completion:** an active Quest receipt is established at Quest start. On the final correct answer, `applyQuestCompletion` adds +30 Coins, +30 XP, one Quest completion, one Buddy Bond and one daily Quest completion in the same state transition, clears the active receipt and records the completed receipt. Replaying that completed receipt is rejected. The existing 950 ms timer only advances UI after feedback and is no longer the reward-commit point.

**Storage:** `purchaseReceipts`, `activeQuestReceipt` and `lastCompletedQuestReceipt` survive save-shape sanitization. The earlier IndexedDB hydration fix remains in place so an initial default render cannot mask a recoverable backup when localStorage is missing.

## New reload integration tests

`src/persistenceEconomyIntegration.test.js` was added at `1ce91011311dff6ea9b7b8119010d84f0466e42f` to close the verified automated gap without speculative runtime changes. It uses isolated synthetic state only.

- Purchase → persist → reload → replay proves one charge, one Star Worth increase, one daily-purchase increment and durable ownership/receipt.
- Receipt-only partial snapshot → reload proves ownership restoration without another charge for a synthetic unknown/no-art item, while its Dream Goal ID remains valid.
- Final Quest completion → persist → reload → replay proves exactly one completion award while preserving unrelated Stars, Star Worth, owned/equipped/room state, mastery, transfer evidence and district progress.

These tests deliberately exercise a synthetic item that has no catalog art, so the regression also locks the rule that missing art never invalidates ownership.

## Full CI / build evidence

GitHub Actions run `35652200670`, job `106507027345`, exact head `1ce91011311dff6ea9b7b8119010d84f0466e42f`:

- **22/22 test files PASS**;
- **98/98 tests PASS**;
- new transaction reload tests **3/3 PASS**;
- durable transaction helper tests **5/5 PASS**;
- storage recovery/sanitization tests **7/7 PASS**;
- rapid Buy Forever guard across React-style rerender **PASS**;
- rapid Place/Put Away guard **PASS**;
- rapid Quest-answer guard **PASS**;
- reward/evidence policy tests **PASS**;
- full 192-item catalog invariant **PASS**;
- production Vite build **PASS**, 1,613 modules transformed;
- CSS 167.39 kB / 35.69 kB gzip; JS 304.00 kB / 93.28 kB gzip.

A compare from the tested head through the audited continuation found only catalog-review JSON changes, so no later persistence/economy runtime invalidated this evidence.

## Current preservation matrix

| State / behavior | Current evidence |
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
| Real-browser transaction timing | **BLOCKED / NOT TESTED** |

## Remaining release blocker

The source-level purchase-idempotency and Quest-refresh gaps described in the prior report are no longer open source defects. The remaining blocker is **real-browser timing/concurrency evidence**: actual purchase/equip/place/reload, refresh around final Quest feedback, multi-tab replay, browser import recovery, physical/touch timing, and live localStorage-loss/IndexedDB restoration.

I retried the authorized device path this pass. Remote Desktop Commander lists the sole authorized machine `PAAM-L044` as offline, last seen September 18, 2026. Browser Use cannot access the branch-local Vite server. I therefore did not mislabel jsdom reload tests or visual-QA screenshots as real browser persistence timing.

## Reward / retry contract retained

Workstream 12’s reward/evidence rules still pass alongside the persistence suite: repeated wrong retries cannot farm rewards, assisted correct cannot create Coins/Mastery Stars/transfer evidence, and wrong answers never remove currency, ownership or permanent progress. Receipt logic changes only durability/idempotency; it does not change prices or reward amounts.

## Handoff

**15:** replace the stale control-state wording that still calls durable purchase/Quest completion a source gap. Those semantics are implemented and CI-proven; keep the real-browser stress gate open.  
**13:** when an approved executable browser path is online, run isolated synthetic purchase/equip/place/reload, final-completion refresh, multi-tab replay, malformed-import and IndexedDB recovery cases. Add a code fix only if a reproducible browser failure remains.  
**14/15:** reuse an authorized local Chromium/Vite harness for transaction timing; visual screenshots alone are insufficient.  
**08:** catalog integration must remain presentation-only with respect to owned/equipped/room/Dream Goal IDs.

No producer art, canonical catalog manifest/runtime, Replit, Floot, `main`, paid setting or real player state was modified by Workstream 13.
