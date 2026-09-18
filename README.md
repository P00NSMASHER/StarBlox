# StarBlox

Independent React/Vite recreation of StarBlox with Replit as the target runtime and GitHub `main` as the canonical source. Floot is legacy reference only.

## Current recreated systems

- 5-action adaptive Quest flow with illustrated Quest composition and evidence rail
- 200 deterministic, source-grounded Grade 2 questions with hardened high-risk families
- first-try independent mastery evidence
- supportive wrong-answer retry with duplicate-reward protection
- Brightside City district progression / Star Sparks
- 192 permanent Star Market items
- Starter -> Glow-Up -> Epic -> Dream -> Luxe tiers
- permanent ownership, equip/place state and Dream Goal
- rapid duplicate-purchase UI guard
- Tiny Starter Studio -> Star Mansion Home progression
- avatar equipment presentation with finished Headwear and Face & Glasses art wired by stable item ID
- Sprout Pup + persistent Buddy Bond
- parent Learning Pulse
- localStorage + IndexedDB persistence
- save backup download/import
- reduced-motion support
- mobile-first responsive layout
- automated question/catalog/Home/purchase-guard regression tests

## Migration and art status

This repository is a clean portable recreation, not a byte-for-byte copy of Floot's internal framework boilerplate.

Catalog art is tracked by stable item ID in `catalog-art-manifest.json`. The current portable set contains 53 repo-owned final SVG thumbnails: all 12 Tops, all 12 Bottoms, Sneakers and Slip-Ons, all 12 Headwear items, all 12 Face & Glasses items, Sprout Pup, Starter Bed, and Tiny Homework Desk. The remaining 139 catalog items still need item-specific final art; runtime fallbacks preserve item identity but are not the final visual target.

Existing Floot browser progress cannot automatically cross to a Replit domain because browser storage is origin-scoped. The recreated app includes JSON save import/export so progress can be migrated safely once a backup is obtained from the Floot build.

## Development

Run:

`npm install`

`npm run dev`

Tests:

`npm test`

Production build:

`npm run build`

## Product rules

- no loot boxes
- no ads
- no FOMO
- no streak-loss penalties
- no public child profiles/chat
- wrong answers never remove possessions or currency
- runtime learning content remains source-grounded
- every production question must have exactly one defensible correct answer
- preserve existing player progress during migrations
- final shipped characters, environments, item art, logos, and maps remain original StarBlox assets
