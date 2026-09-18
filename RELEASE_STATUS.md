# StarBlox Release Status

Last integration/release pass: 2026-09-18 (America/New_York)

Canonical implementation target: private GitHub repository `P00NSMASHER/StarBlox` on `main`, with Replit app `StarBlox` (`821e329b-9d6b-4bc9-940d-b18a07aaa463`) as the target runtime. Floot is legacy reference only.

Canonical visual contract: `VISUAL_NORTH_STAR.md`.

Code-under-test for this pass: `e3008e9bb2999804b932b637165ccd0e6d844c43`.

## Gate status

| Gate | Status | Evidence |
| --- | --- | --- |
| Dependency install | PASS | GitHub Actions run `35383937905` completed successfully on the current code-under-test; its install-dependencies step passed. |
| Automated tests | PASS | Same CI run completed the test step successfully. Current source contains 7 game-model tests plus 2 Home-runtime regression tests. |
| Production build | PASS | Same CI run completed the production-bundle build successfully. |
| Import/file-path integrity | PASS | Production build passed after loading `catalogArtRuntime`, base styles, release overrides, Home hero styles, and Home hero runtime from the main entry point. |
| Question-bank structural invariants | PASS | Automated tests require exactly 200 questions, unique IDs, validated bank output, unique non-empty choices, and exactly one keyed answer in every choice set. |
| 5-action Quest selection | PASS | Automated test requires five distinct adaptive actions and at least one transfer item. |
| Store structural invariants | PASS | Automated test requires exactly 192 items, 192 unique IDs, positive prices, and non-negative Star requirements. |
| Question semantic P0 audit | PASS WITH FIX | High-risk generator families have explicit regression coverage. The earlier ambiguous short-vowel diagnostic wording was narrowed; grammar/rhyme/story/religion/vocabulary regression cases are also pinned in tests. |
| Wrong-answer reward farming | PASS (static) | The first wrong attempt may receive the intentional learning reward; later wrong retry attempts award 0 additional Coins/XP. Runtime abuse testing remains NOT TESTED. |
| Buy/equip/place/Dream Goal state | PASS (static) | Owned items route to equip/place, purchases add permanent ownership and Star Worth, room placement is persisted, and Dream Goal is stored by stable item ID. Rapid multi-click/concurrency stress remains NOT TESTED. |
| Home / Avatar / Buddy state consistency | PASS WITH FIX (static) | All use the persisted save. This pass fixed two Home enhancement feedback loops: mismatched Home fingerprints and accessory DOM re-creation on every mutation. A regression test now pins Home fingerprint stability. |
| Persistence safety | PASS WITH FIX (static) | Save v2 is persisted to localStorage and IndexedDB; first-mount logic preserves an existing IndexedDB-only backup rather than overwriting it with defaults. Browser recovery remains NOT TESTED. |
| Critical touch targets | PASS (static) | Release overrides enforce >=44px minimum height on small Store actions and filter controls; primary navigation, Read Aloud, and answer choices meet or exceed the same baseline in source styling. |
| Reduced motion | PASS (static) | Reduced-motion styling exists for the shell; rendered verification remains NOT TESTED. |
| Narrow mobile layout | PASS (static) / NOT TESTED (rendered) | Responsive rules exist for phone/narrow layouts and touch targets. Actual 320px/390px runtime rendering and interaction are not verified. |
| Catalog manifest uniqueness | PASS (static) | Manifest records 17 final portable item assets and `duplicateAssetPaths: []`; finished runtime mappings are explicit by stable item ID. |
| Catalog portable-path integrity | PASS for completed set | All 17 finished entries use repo-local `/assets/catalog/...` paths and the referenced files are present in the repository tree. |
| Catalog completion | FAIL (P1 visual blocker) | 17/192 items have final portable art; 175 remain. Unfinished items can fall back without breaking ownership, but initials/fallback presentation is below the visual release bar. |
| README/status accuracy | PASS WITH FIX | README was corrected to identify GitHub main + Replit as canonical, Floot as legacy, and the current 17/192 portable-art state. |
| False online/social claims | PASS (static) | Current source does not expose public child chat/profiles or claim live multiplayer/social behavior. |
| Replit runtime / preview | BLOCKED | Replit read-only Agent inspection timed out. Runtime sync, startup, browser behavior, and mobile rendering therefore remain unverified. |
| Replit publication | NOT TESTED / not deployed | Replit reports no existing publication for this repl. No publish was requested in this pass. |

## Visual fidelity

The visual contract explicitly treats simple CSS avatar geometry, initials as item art, generic SaaS-style controls/cards, sparse gradient-only screens, emoji placeholders, and unillustrated Home/Quest/Store backgrounds as unfinished.

| Area | Status | Fidelity evidence / remaining gap |
| --- | --- | --- |
| Home | FAIL — P1 visual blocker, substantial progress | The latest specialist work adds full illustrated five-tier room scenes, room-progress strip, large hero zone, physical Sprout Pup art, Dream Goal, Daily Quests, Customize tray, Today I'm Learning, earned objects, cobalt/cyan glass chrome and gold accents. However the hero still clones the simple CSS avatar, CSS-generated equipment remains visibly synthetic, and unfinished owned items can still render initials. Rendered composition is NOT TESTED. |
| Store | FAIL — P1 visual blocker | Functional 192-item grid, Dream Goal and permanent-buy actions exist, but category/tier controls remain text-filter rows, most items still lack final art, and the approved large selected-item/right-side character preview + detail experience is absent. |
| Quest | FAIL — P1 visual blocker | Learning behavior is strong, but presentation remains a centered white question card on a light gradient. Missing the approved illustrated learning-room/library scene, large left avatar, Diagnose/Practice/Review/Transfer phase strip, contextual illustration, right mastery/checklist rail, and richer lesson-card composition. |
| Avatar / Buddy | FAIL — P1 visual blocker | Equipment and Buddy state are wired consistently and Sprout Pup has portable art, but the player avatar is still simple CSS geometry with symbolic/CSS accessory shapes rather than a premium original illustrated character matching equipped gear. |
| Catalog Art | FAIL — P1 visual blocker | 17/192 final portable thumbnails are complete: all 12 Tops plus Jeans, Sneakers, Sprout Pup, Starter Bed and Tiny Homework Desk. 175 items remain; fallback initials are explicitly below the North Star. |
| HUD / Nav / Logo | FAIL — P1 visual blocker | Functional top Coins/Stars/XP/Mastery HUD and left navigation use cobalt/cyan chrome and tactile shadows. The StarBlox mark is still styled text and navigation remains generic icon/button treatment rather than the fully illustrated/glossy reference quality. |
| Mobile | NOT TESTED (rendered) | Static breakpoints and 44px critical controls exist. Premium Home density, Store grid/detail composition, Quest reflow, text clipping and actual 320/390px usability need a real runtime viewport pass. |

## Integration fixes made in this pass

1. Fixed a Home hero rebuild loop: `buildHome()` and the MutationObserver were previously using different state fingerprint shapes, causing the enhanced Home to rebuild after its own DOM mutations.
2. Made avatar accessory decoration idempotent so equipped accessory spans are only rebuilt when the equipped accessory signature changes; this prevents a second MutationObserver feedback loop.
3. Added Home-runtime regression tests for stable equivalent-state fingerprints and ownership-driven refresh invalidation.
4. Corrected README migration/art status from stale Floot-asset language to the current 17 portable repo-owned assets.

## Release blockers / unverified gates

1. **BLOCKED — Replit runtime:** GitHub CI is green, but the target Replit runtime could not be inspected because the read-only Agent request timed out. Do not convert this to PASS until the app is actually synced/opened and smoke-tested.
2. **FAIL — Quest visual fidelity:** functionally valid but materially below the approved reference composition.
3. **FAIL — Store visual fidelity:** missing the selected-item character/detail experience and 175 final item thumbnails.
4. **FAIL — Avatar visual fidelity:** simple CSS geometry/symbolic accessory treatment remains.
5. **FAIL — Home visual fidelity:** new illustrated composition is strong progress, but CSS avatar/fallback-item treatment still violates the final visual bar.
6. **NOT TESTED — rendered mobile:** 320px/390px Home/Quest/Store usability has not been observed.
7. **NOT TESTED — runtime persistence/reward stress:** IndexedDB recovery and rapid purchase/retry interaction require browser execution.

## Highest-priority next action

Polish **Quest** next without changing its validated 5-action engine: replace the generic gradient/card composition with the approved illustrated learning-room layout, large left avatar, learning phase strip, illustrated lesson/question panel, stacked answer/hint/explanation treatment, and right-side mastery/Today's Learning rail. Preserve current question logic and reward/evidence behavior while doing so.
