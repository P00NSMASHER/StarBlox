# Workstream 03 — Home Screen

STATUS: **REFERENCE COMPOSITION RETUNED / CI PASS / FINAL HOME VISUAL SIGN-OFF PENDING**

Branch: `screenshot-match-preproduction`
Latest Home source head for this pass: `a8d9b5439e2f9e88e25de6da20ef31498ebd95cd`
Replit: **untouched**
Main: **not merged or modified**

## Changes completed

The Home implementation remains additive and continues to reuse the existing save/game model rather than replacing `src/App.jsx` or persistence behavior.

### Reference composition retained

- Full warm Brightside bedroom environment remains the Home backdrop.
- Central original StarBlox avatar remains the visual hero with the equipped Buddy beside it.
- Five real room tiers remain visible simultaneously in the top-center Room Progress strip.
- My Dream Goal remains the tall right rail using the player’s actual selected Dream Goal item, actual ownership state, actual Coins, actual item price, and actual progress.
- Daily Quests remains the lower-left panel using only the three real tracked daily counters.
- Customize Me remains the lower-center owned-item/category tray and continues to show only permanently owned real items.
- Today I’m Learning remains the lower-right learning-evidence card.
- The separate “Smart Kids Change the World!” motivational card remains beneath Today I’m Learning.
- Buddy speech remains attached to the central avatar/Buddy scene.

### Browser-QA geometry correction

The strict 1408×1056 Playwright gate previously identified exactly three Home structural failures:

1. Room Progress rendered about 204 px tall instead of the 165 px contract.
2. Customize Me started around y=787 instead of the y=822 contract.
3. Today I’m Learning started around y=713 instead of the y=772 contract.

Added `src/homeReferenceFinal.css`, loaded after progression/environment/accessibility/motion layers, to make the Home-owned wide-desktop geometry authoritative without disturbing smaller responsive layouts:

- Room Progress is fixed to the 165 px reference envelope at 1408×1056.
- The extra three-horizon progression strip is hidden only in wide reference mode so the five-tier room strip remains compact and all five real tiers stay visible.
- Customize Me is anchored to y=822 with the reference 600 px width and compact owned-item strip.
- The wide-desktop collection-progress summary is hidden inside Customize Me because it is not part of the approved Home screenshot hierarchy; the underlying real collection state remains unchanged and still appears in responsive layouts.
- Today I’m Learning is anchored to y=772 with the reference 334×158 envelope.
- The extra mastery summary card is hidden only inside the wide-reference Today I’m Learning panel so the screenshot composition does not become a dashboard; mastery data and shell mastery state remain intact.
- The motivational card is explicitly anchored to y=938 at the 90 px reference height.

### Dream Goal presentation

- Upgraded the Dream Goal art stage to use the original Brightside bedroom environment as an aspirational backdrop while keeping the **actual selected Dream Goal item** in front.
- This does not imply ownership: owned/not-owned copy, Coins, price, CTA behavior and progress remain bound to real state.
- No fake mansion ownership, fake currency, fake progress, fake purchase, fake mastery, or fake daily completion was introduced.

### Starter-state behavior and compatibility

- Starter states remain positive: empty learning evidence says the learner is ready rather than showing failure language.
- Existing starter owned inventory, companion, room decor, Coins, Dream Goal, XP, Stars and Star Worth remain untouched.
- Existing save keys and persistence format are unchanged by this Home pass.
- Existing shell route normalization remains intact so legacy Home actions such as `Market` resolve to visible `Store` and `Avatar` resolves to Customize/settings access.
- Reduced-motion, touch-target and responsive rules remain owned by the shared accessibility/motion layers; this final tuning is restricted to `min-width:1280px`.

## Files changed

- `src/homeReferenceFinal.css` — final wide-reference Home geometry and Dream Goal stage tuning.
- `src/main.jsx` — loads `homeReferenceFinal.css` last so Home reference geometry is not re-expanded by later shared progression/motion layers.
- Existing Home implementation remains in:
  - `src/homeHeroRuntime.js`
  - `src/homeHero.css`
  - `src/homeScreenshotMatchRuntime.js`
  - `src/homeScreenshotMatch.css`
  - `src/homeScreenshotMatchRuntime.test.js`

## Tests / build / browser QA

- **PASS — branch isolation:** all work is on `screenshot-match-preproduction` only.
- **PASS — Replit untouched:** no Replit update or publish action was called.
- **PASS — main untouched:** no merge or direct write to `main` was performed.
- **PASS — full CI test step:** GitHub Actions run `35631942163` completed the project test step successfully on exact Home source head `a8d9b5439e2f9e88e25de6da20ef31498ebd95cd`.
- **PASS — production build:** the same CI run completed `npm run build` successfully.
- **PASS — strict visual workflow infrastructure:** GitHub Actions visual run `35631942179` successfully installed Playwright, built the production bundle, started the local production preview and executed the structural browser gate.
- **FAIL — overall strict visual release gate:** run `35631942179` still ends in failure because the repository-wide gate also includes unresolved Store and Quest geometry checks. This workstream does not claim those screens are fixed.
- **NOT YET CLAIMED — final Home structural PASS:** the Home tuning directly encodes the three previously measured Home contract corrections, but final Home-specific sign-off should come from the consolidated QA report/Command Center rather than inferring a release PASS from CSS alone.
- **NOT TESTED — exact reference-pixel diff:** the approved reference screenshot pixels are not stored in-repo for automated image-diff comparison.

## Visual gaps remaining

1. Exact perceptual parity of avatar face/body proportions, material depth, rim light and Buddy integration still needs authoritative side-by-side visual review even though the composition is in place.
2. Dream Goal now has a stronger aspirational room-stage composition, but the selected item remains the real chosen item; it intentionally does not fabricate a mansion if the player chose something else.
3. Final art quality for individual equipped/catalog items still depends on the catalog-art workstream; missing art must remain a visual fallback only and must never mutate ownership.
4. Wide desktop now prioritizes the screenshot hierarchy over extra summary widgets. The hidden wide-only summaries remain available in responsive/staked layouts and their state is not discarded.
5. Final keyboard/screen-reader/performance proof belongs to shared release QA, not this Home-only workstream.

## Blockers

- **No Home state, save, economy or learning blocker found.**
- Home release sign-off is still blocked on authoritative consolidated browser/visual confirmation after this geometry pass.
- Repository release remains blocked independently by unfinished Store/Quest geometry, catalog completion, live persistence stress, accessibility smoke and performance profiling.

## Handoff

- Workstream 14 / Command Center should rerun/read the strict 1408×1056 Home geometry checks and mark the three prior Home failures PASS only from measured browser evidence.
- Keep `src/homeReferenceFinal.css` last among visual imports unless a later measured integration conflict requires a narrower selector fix.
- Do not re-add the wide-desktop three-horizon or mastery summary blocks inside the screenshot-reference envelopes unless the reference composition changes; they make the Home read like a dashboard and caused the measured height/vertical-position drift.
- Workstream 08 may continue item-specific art completion by stable item ID; Home/Dream Goal must never infer ownership from artwork availability.
- Workstream 10 should keep tablet/390/320 layouts stacked and touch-safe; the new strict geometry overrides intentionally do not apply below 1280 px.
- **Do not update/publish Replit and do not merge to `main` until coordinated preproduction sign-off and a separate user-approved integration action.**
