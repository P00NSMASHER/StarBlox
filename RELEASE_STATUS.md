# StarBlox Release Status

Last integration/release pass: 2026-09-18 (America/New_York)

Canonical implementation target: private GitHub repository `P00NSMASHER/StarBlox` on `main`, with Replit app `StarBlox` as the runtime target. Floot is legacy reference only.

## Gate status

| Gate | Status | Evidence |
| --- | --- | --- |
| Dependency install | PASS | GitHub Actions run `35378125453` installed 104 packages successfully on Node 22.23.2 / npm 10.9.8. |
| Automated tests | PASS | Same CI run: Vitest 5.0.1, 1 test file / 5 tests passed. |
| Production build | PASS | Same CI run: Vite 8.3.0 transformed 1,568 modules and produced `dist` successfully. |
| Import/file-path integrity | PASS | Production build completed from `src/main.jsx` through React/App/styles and local modules without unresolved imports. |
| Question-bank structural invariants | PASS | CI tests verify exactly 200 questions, unique IDs, 3 unique choices each, and exactly one keyed answer in each choice set. |
| 5-action Quest selection | PASS | CI test verifies five distinct adaptive actions and at least one transfer item. |
| Store structural invariants | PASS | CI test verifies exactly 192 items, 192 unique IDs, positive prices, and non-negative Star requirements. |
| Question semantic P0 audit | PASS WITH FIX | Static audit found the 12 `vowel-listen-*` prompts could be read as allowing first/final-sound strategies. Generator wording was narrowed to explicitly ask about short-vowel sounds. No other obvious multiple-correct/wrong-key P0 was found in the reviewed generator families. |
| Wrong-answer reward farming | PASS (static) | First wrong attempt can award the intentional learning reward; retries set `wrongRewarded` and award 0 additional coins/XP for further wrong attempts. Runtime abuse testing is still pending. |
| Buy/equip/place/Dream Goal state | PASS (static) | Owned items route to equip/place instead of purchase; new purchases deduct price, add permanent ownership and Star Worth; Dream Goal is a persistent item ID. High-frequency double-click/concurrency abuse has not been runtime stress-tested. |
| Home / Avatar / Buddy consistency | PASS (static) | All three read from the same persisted save object; Buddy is the equipped companion and Bond is persisted. |
| Persistence safety | PASS WITH FIX | Initial localStorage persistence no longer overwrites an existing IndexedDB-only backup before hydration; the first write now preserves an existing IndexedDB `current` record. Browser recovery behavior has not yet been end-to-end tested. |
| Critical touch targets | PASS WITH FIX | Release override enforces >=44px height on small primary/secondary buttons, Market filter buttons, and Store actions. Existing main navigation/read-aloud/answers are already >=44px. |
| Reduced motion | PASS (static) | `prefers-reduced-motion: reduce` disables practical animation/transition duration across the shell. |
| Narrow mobile layout | PASS (static) / NOT TESTED (rendered) | Dedicated <=900px and <=560px rules exist, including fixed bottom navigation, single-column quest answers and constrained page padding. Actual 320px/390px viewport rendering is still pending. |
| Replit runtime / preview | BLOCKED | Replit free Agent quota was exhausted during setup and a read-only runtime QA request timed out. Do not claim the Replit preview has passed until quota/runtime access returns and the GitHub `main` changes are synced into the Replit app. |
| Catalog-art portability | FAIL | `catalog-art-manifest.json` still contains 12 `floot://` legacy paths marked `needs-portable-copy`; the 192 runtime store items currently use deterministic fallback art rather than portable final thumbnails. No duplicate legacy asset paths are recorded. |
| False online/social claims | PASS (static) | Current rebuilt app does not expose public child profiles/chat or claim live social functionality. |

## Fixes made in this pass

1. Protected IndexedDB progress from being overwritten by the default save during first-mount hydration when localStorage is empty.
2. Removed ambiguity from all 12 generated short-vowel diagnostic prompts.
3. Raised critical Market/store touch targets to the 44px accessibility baseline.
4. Added a repeatable GitHub Actions release gate that installs dependencies, runs tests, and builds the production bundle on Node 22.

## Current release blockers

1. Replit runtime/preview is not verified because the free Agent/runtime setup quota is unavailable; GitHub CI passing is not a substitute for an actual Replit preview check.
2. The catalog art manifest still depends on 12 legacy Floot asset identities and final portable art is not wired; fallback art prevents broken cards but is not the intended polished release presentation.
3. Runtime mobile interaction, persistence recovery and rapid-purchase stress tests remain unperformed even though static source review is clean.

## Highest-priority next action

As soon as Replit access is available, sync the latest `main`, run/open the actual preview at narrow mobile width, and execute one end-to-end smoke pass covering Quest retry/reward behavior, purchase/equip/place/Dream Goal persistence, Home/Avatar/Buddy continuity, refresh persistence, and navigation. In parallel, replace the 12 legacy Floot Tops with portable recreated assets and update the manifest/runtime mapping.
