# StarBlox

Independent React/Vite recreation of the current StarBlox game so development can move from Floot to Replit without buying a Floot source export.

## Current recreated systems

- 5-action adaptive Quest flow
- 200 deterministic, source-grounded Grade 2 questions
- first-try independent mastery evidence
- supportive wrong-answer retry with duplicate-reward protection
- Brightside City district progression / Star Sparks
- 192 permanent Star Market items
- Starter -> Glow-Up -> Epic -> Dream -> Luxe tiers
- permanent ownership, equip/place state and Dream Goal
- Tiny Starter Studio -> Star Mansion Home progression
- avatar equipment presentation
- Sprout Pup + persistent Buddy Bond
- parent Learning Pulse
- localStorage + IndexedDB persistence
- save backup download/import
- reduced-motion support
- mobile-first responsive layout
- automated question/catalog regression tests

## Migration status

This repository is a clean portable recreation, not a byte-for-byte copy of Floot's internal framework boilerplate.

The original first 12 premium Tops thumbnails were generated inside Floot. Their exact old asset IDs are retained in `catalog-art-manifest.json`, but the image files still need to be copied/recreated as portable assets before production release.

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
