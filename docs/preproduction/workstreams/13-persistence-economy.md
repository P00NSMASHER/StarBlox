# Workstream 13 — Persistence + Economy Safety

STATUS: **HARDENED / TARGETED STATIC + HELPER CHECKS PASS / FULL BRANCH SUITE + LIVE BROWSER STRESS PENDING**

Branch: `screenshot-match-preproduction`
Inspected branch head before this handoff: `2c39e68877f1389fadbe27a9526c2b485d0a27d9`
Replit: **untouched**
Main: **not merged or modified**

## Scope reviewed

This pass reviewed the current persistence/economy paths in `src/storage.js`, `src/App.jsx`, `src/purchaseGuardRuntime.js`, `src/questRewardPolicy.js`, their relevant tests, `RELEASE_STATUS.md`, `docs/preproduction/COORDINATION.md`, and `docs/preproduction/SCREENSHOT_MATCH_TARGET.md`.

The required invariant remains: screenshot-match work may change presentation, but it must not reset or silently discard Coins, XP, Mastery Stars, Star Worth/Home progress, permanent ownership, equipped gear, room placement, Dream Goal selection, learning/mastery evidence, Buddy/Bond state, or district progress.

## Changes completed

### 1. Corrupted-save recovery hardened without tying ownership to art

Updated `src/storage.js` with `sanitizeSnapshotShape(raw)` and applied it to current/legacy localStorage reads, IndexedDB recovery, and imported saves.

The recovery layer now:
- accepts only plain save objects, so an imported JSON array cannot masquerade as a save;
- preserves valid finite non-negative Coins, Stars, XP, Star Worth, Quest count, transfer wins, and Buddy Bond;
- preserves and de-duplicates string IDs in `owned`, `mastered`, and `roomDecor`;
- preserves valid equipped item IDs and Dream Goal IDs;
- preserves valid learning evidence in `stats`, normalizing malformed numeric counters rather than allowing `NaN`/type errors into gameplay;
- preserves valid Daily and district progress counters;
- leaves unknown top-level fields intact for forward compatibility;
- deliberately **does not validate owned/equipped/room/Dream Goal IDs against current catalog artwork**.

That last rule is important: a future item, an unfinished-art item, or an item whose asset fails to load remains owned/equipped/placed. Missing art is a presentation fallback, never an ownership migration.

Malformed fields are removed from the recovered raw shape so the existing additive `migrateSave()` default merge can safely fill only the damaged portion. Valid fields survive unchanged.

### 2. Rapid duplicate-action protection now survives React rerenders

Updated `src/purchaseGuardRuntime.js` so the duplicate guard is keyed by stable action identity rather than `WeakMap` DOM-node identity. A React rerender that replaces a button therefore cannot reopen the same purchase window.

Current guard windows:
- `Buy Forever`: 1200 ms, keyed to the stable Store item ID/name;
- room `Place` / `Put Away`: 650 ms, keyed to the room item;
- Quest answer tap: 300 ms across the answer set.

The room guard closes a concrete state-integrity gap: a rapid double tap could otherwise place an item and immediately toggle it back out. The Quest guard closes the brief browser-event window before React has committed `feedback`/disabled-state changes. Normal next-question flow is not blocked because correct-answer advancement occurs later than the short answer guard window.

Wearable equip remains naturally idempotent because equipping the same stable ID writes the same `equipped[key]` value.

### 3. Added tests only for verified gaps

Added `src/storage.test.js` covering:
- preservation of representative economy/progression state;
- de-duplication without deleting unknown/no-art item IDs;
- malformed nested save recovery;
- corrupt current localStorage falling through to a recoverable legacy key;
- persistence round-trip of Coins, XP, Stars, Star Worth, ownership, equipment, evidence, room placement, Dream Goal, district progress, and Buddy Bond;
- rejection of array-shaped imports plus valid export/import round-trip.

Expanded `src/purchaseGuardRuntime.test.js` covering:
- duplicate Buy Forever suppression;
- duplicate suppression after a React-style button replacement;
- room Place/Put Away double-tap suppression across rerender;
- Quest answer double-tap suppression across two different answer buttons.

No speculative tests were added for behavior that was not inspected.

## State-preservation audit

| State | Current protection / result |
| --- | --- |
| Coins | Valid value survives load/import/refresh; purchases and Quest rewards remain additive/subtractive only through existing gameplay paths. |
| XP | Valid value survives recovery; retry/independent reward policy unchanged. |
| Mastery Stars | Valid value survives recovery; mastery award remains independent-success-only. |
| Star Worth / Home tier | Valid value survives recovery; purchases continue to add item price to Star Worth. |
| Owned inventory | De-duplicated by stable ID, never filtered by available art. |
| Equipped gear | Stable string IDs preserved; no screenshot runtime writes save/equipment state merely to display art. |
| Room placement | `roomDecor` stable IDs preserved; rapid place/put-away toggle now guarded. |
| Dream Goal | Stable ID preserved even if its art is absent. |
| Learning/mastery evidence | Valid `stats`, `mastered`, independent/mastery counters preserved; malformed counters are normalized safely. |
| Buddy / Bond | Equipped companion ID and `companionBond` preserved. |
| District progress | Existing district counters preserved and shallow migration remains additive for known defaults. |
| Daily counters | Daily reset remains limited to daily quest/transfer/purchase counters; permanent state is not reset. |

## Reward / retry verification

`src/questRewardPolicy.js` and the existing Quest QA tests still enforce:
- first wrong attempt: small non-punitive learning reward only;
- repeated wrong retry: zero additional reward;
- clue-assisted correct retry: practice XP only, no Coins, no Mastery Star, no transfer evidence;
- independent eligible mastery: the only path to a Mastery Star;
- wrong answers never remove Coins, Stars, owned items, or progress.

The screenshot-match Quest code has not changed these reward calculations.

## Purchase / equip / place / completion review

- **Purchase:** the Store detail rail proxies the existing primary Store action rather than duplicating purchase logic. The stable duplicate guard therefore applies to both the base button and the screenshot-match proxy path.
- **Equip:** unowned IDs are rejected by the existing equip path; owned wearable equip is idempotent.
- **Place / Put Away:** ownership check remains required and the new stable room-action guard prevents a rapid double-toggle from immediately undoing placement.
- **Quest answers:** existing `feedback` gate still prevents a second scored answer after React state commits; the new 300 ms capture guard protects the pre-commit double-tap window.
- **Quest completion:** completion remains on the final Quest advance path and awards the existing completion bonus once per normal completion transition. No completion/reward values were changed in this workstream.
- **Refresh / re-entry:** current key -> legacy-key fallback -> IndexedDB recovery remains intact. The existing fresh-localStorage IndexedDB preservation behavior was retained so a default initial render cannot overwrite a recoverable backup before hydration.

## Checks performed

- **PASS — branch isolation:** all edits were written only to `screenshot-match-preproduction`.
- **PASS — Replit untouched:** no Replit update or publish action was used.
- **PASS — main untouched:** no merge or direct main-branch write was performed.
- **PASS — isolated Node syntax/helper check:** persistence sanitizer and rapid-action guard helper logic passed direct Node assertions, including unknown/no-art ID preservation and corrupt numeric-field handling.
- **PASS — isolated reward helper check:** current retry/reward policy passed direct assertions for first wrong, repeated wrong, assisted correct, and independent mastery/transfer outcomes.
- **ADDED — Vitest regression coverage:** `src/storage.test.js` and expanded `src/purchaseGuardRuntime.test.js` now encode the verified gaps above.
- **NOT RUN — full `npm test`:** repository CI is configured only for `main` pushes/PRs; opening/merging a main-targeting release path would violate preproduction rules. This automation runtime does not have the branch dependency tree checked out.
- **NOT RUN — `npm run build`:** same preproduction/runtime limitation.
- **NOT TESTED — authoritative live browser stress:** repeated purchase, refresh immediately after purchase/equip/place/Quest completion, localStorage loss with IndexedDB recovery, and real-device double taps still need consolidated browser QA.

## Remaining risk / blockers

1. **Full consolidated branch test/build gate remains pending.** The new Vitest files are committed but need execution in a materialized branch workspace before release sign-off.
2. **Live refresh/re-entry stress remains pending.** Static source and targeted helper checks support the recovery contract, but browser IndexedDB timing should be exercised by Workstream 14.
3. **Live purchase concurrency remains pending.** The UI-level stable guard closes the observed rapid-click/rerender gap, but release QA should still stress purchase state in a real browser.
4. **Quest completion refresh edge remains live-QA-only.** Final completion is driven by a timer transition; browser QA should refresh before/after that transition and confirm exactly one completion award is persisted.
5. **No artwork gate may mutate ownership.** Future catalog work must continue to attach artwork by stable item ID only and must never prune save arrays because an asset is missing.

## Handoff

Workstream 14 / Command Center should, on the consolidated preproduction branch:
- run the full `npm test` and `npm run build` suites;
- browser-stress Buy Forever with rapid taps and immediate rerender;
- double-tap Place/Put Away and Quest answers;
- purchase/equip/place an item, refresh/re-enter, and verify exact state persistence;
- complete a Quest and refresh around the final transition to verify one completion bonus;
- delete the current localStorage key while retaining an IndexedDB backup and verify recovery before any default save can replace it;
- import a partially malformed but recoverable save and verify intact fields survive while damaged fields safely default;
- explicitly verify an owned/equipped/placed ID with no final art remains owned after refresh.

Do not update/publish Replit and do not merge to `main` until the coordinated preproduction release gate clears and the user separately approves final integration.
