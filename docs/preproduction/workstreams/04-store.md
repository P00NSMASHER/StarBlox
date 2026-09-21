# Workstream 04 — Store Screen Builder

STATUS: **IMPLEMENTED FIRST SCREENSHOT-MATCH PASS / FULL BUILD + RENDER QA PENDING**

Branch: `screenshot-match-preproduction`

## Completed this pass

- Read the shared screenshot target, coordination contract, measurable design-system contract, current Store implementation, catalog-art runtime, and `catalog-art-manifest.json` before changing the Store.
- Kept the existing 192-item catalog, permanent ownership model, buy/equip/place behavior, Dream Goal behavior, prices, Star requirements, and save semantics unchanged.
- Added an additive Store presentation layer rather than rewriting `src/App.jsx`:
  - `src/storeScreenshotMatchRuntime.js`
  - `src/storeScreenshotMatch.css`
  - `src/storeScreenshotMatchRuntime.test.js`
  - wired both runtime and CSS from `src/main.jsx`.
- Reworked the Store hierarchy toward the approved screenshot:
  - large glossy cobalt Store header with live Coins encouragement;
  - Dream Goal progress banner immediately below the title;
  - pictorial category tabs with original inline SVG line icons;
  - compact tier-filter row with tier markers;
  - dense six-column desktop product grid with bounded internal scrolling so roughly three rows remain visible at reference height;
  - stronger selected-item glow plus explicit text states for Available / Owned / Equipped / Locked / Dream Goal;
  - large right-side try-on stage with original StarBlox-style avatar silhouette and selected-item preview;
  - selected-item detail panel with permanent-value copy, Buy Forever, Try On / Place / Choose Buddy, and Dream Goal actions;
  - lower permanent collection cards for Everyday Style, Sparkle Gear, Buddy Besties, and Dream Room;
  - lower value card explaining Learn → Earn → Choose with no timers, random boxes, disappearing rewards, or loss framing.
- Existing card Buy/Equip/Place and Dream Goal controls remain the source of truth. The new detail rail proxies those existing controls rather than duplicating economy logic.
- Finished catalog art is used through the existing exact-ID `catalogArtRuntime` mapping. Items without a finished image retain a clear initials + collection fallback rather than an emoji placeholder.
- Phone behavior removes the desktop grid’s nested vertical scroller and returns to normal page scrolling, keeps a two-column item grid where width allows, horizontally scrollable category/tier strips, 44px+ action targets, and reduced-motion behavior.

## Catalog-art state inspected

`catalog-art-manifest.json` currently reports:
- target: **192**
- finalCount: **87**
- remaining: **105**
- duplicateAssetPaths: **0**

The manifest also explicitly marks Aura assets and companions 2–12 as interim-not-verified until authoritative visual inspection. This Store pass does **not** promote any interim artwork to final.

## Tests / checks

- **PASS — runtime JavaScript syntax:** `node --check` completed successfully for `storeScreenshotMatchRuntime.js`.
- **PASS — test-file JavaScript syntax:** `node --check` completed successfully for `storeScreenshotMatchRuntime.test.js`.
- **PASS — CSS structural check:** authored stylesheet has balanced brace structure.
- **ADDED — Store invariant test:** asserts `gameModel.store` remains exactly 192 unique item IDs.
- **ADDED — Store decoration test:** verifies the runtime adds the selected-item rail, four permanent collection cards, explicit selected state, stable item ID mapping, and permanent-reward copy.
- **NOT RUN — full `npm test`:** repository CI is configured for pushes/PRs targeting `main`; this preproduction pass did not merge or open a release PR.
- **NOT RUN — `npm run build`:** same preproduction/CI constraint; Command Center or release QA must execute the consolidated branch build before release.
- **NOT TESTED — rendered screenshot comparison:** Replit was intentionally not updated or published.

## Visual gaps remaining

1. The right try-on stage currently presents the selected catalog art beside an original stylized StarBlox avatar rather than mapping every selected item onto the exact final avatar equipment layer. Workstream 06 should connect the Store stage to the final avatar/buddy rendering system.
2. The warm pink/lilac Store environment is CSS-authored staging; Workstream 09 should replace/enrich it with final original room/environment art while retaining foreground readability.
3. Only 87/192 catalog items are currently counted final in the manifest. Workstream 08 remains the largest Store visual-fidelity dependency.
4. Final acceptance still requires rendered comparison at 1408×1056, compact landscape, tablet, 390px, and 320px widths.
5. Final illustrated Store/category/logo assets can further improve fidelity once their owner workstreams land; this pass intentionally avoids third-party/Roblox/Brookhaven imagery.

## Blockers

- **No Store logic blocker found.**
- **Visual release blocker:** final catalog-art coverage and authoritative rendered QA are incomplete.
- **Integration blocker:** full consolidated branch tests/build have not yet been executed.

## Handoff

- Workstream 06: replace/augment `.sbStoreAvatar` with the final equipped-avatar renderer while preserving `.sbStoreRightRail`, `.sbStorePreviewArt`, and action semantics.
- Workstream 08: continue exact-ID final artwork; Store will automatically use `item.image` when the catalog runtime provides it.
- Workstream 09: enrich the warm Store background without reducing item/card legibility.
- Workstream 10: verify category/tier horizontal scrolling, two-column phone cards, 44px+ actions, focus order, and no page horizontal overflow.
- Workstream 14 / Command Center: run full tests/build and rendered visual comparison before marking Store PASS.

**Replit was not updated or published. `main` was not merged or modified.**
