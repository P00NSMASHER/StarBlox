# StarBlox Screenshot-Match Visual Target

Branch: `screenshot-match-preproduction`
Production host: Replit, but **do not update or publish Replit during preproduction**.

## Measurable implementation contract

All visual workstreams must use `docs/preproduction/DESIGN_SYSTEM_CONTRACT.md` for shared palette, gradients, glow/bevel treatment, typography, spacing, desktop reference geometry, content-density targets, and responsive breakpoints. This file remains the compositional/behavioral north star; the design-system contract defines the measurable implementation values.

## Reference composition

The target is the three user-provided reference screenshots from 2026-09-21. Match their visual hierarchy, density, proportions, polish, and game feel as closely as practical while using original StarBlox-specific artwork and preserving child-safety rules.

### Shared shell
- Bright, glossy, premium 3D-toon educational game presentation.
- Full-bleed warm bedroom / learning-space environment behind semi-opaque game panels.
- Deep navy-to-cobalt UI chrome with electric-blue outer glow, pale inner highlights, beveled edges, and large rounded corners.
- High-contrast white display type with subtle dark outline/shadow.
- Gold/yellow is achievement and currency accent; pink/lilac is personality; green is primary-action success.
- Dense but readable HUD designed to feel like a console/mobile game, not SaaS.
- Large colorful logo at top-left.
- Top HUD: Coins, Stars, XP/level progress, Mastery card, settings.
- Left vertical nav: Home, Quests, Study, Room, Store, each with a large pictographic icon and glowing selected state.
- Friendly original block-world girl avatar with brown hair, pink cat-ear headphones, pink/lilac top, star necklace, wide-leg jeans with heart accents, white sneakers, warm expressive face.
- Small cute companion beside or on the avatar; use original StarBlox buddy designs, not third-party character assets.
- Sparkles, stars, soft bloom, rim light, and depth cues throughout.

### Home reference
- Center: avatar hero in a cozy pink/lilac bedroom.
- Top center: 5-tier Room Progress strip with miniature room previews and locked later tiers.
- Right: My Dream Goal panel with aspirational room/mansion preview, benefits, and a large gold CTA.
- Bottom-left: Daily Quests panel with multiple rows, progress counters, reward values, and green Go buttons.
- Bottom-center: Customize Me panel with category tabs and horizontal owned-item strip.
- Bottom-right: Today I’m Learning panel plus motivational world-change message.
- Companion speech card near avatar.

### Store reference
- Main upper center: large Store title bar with encouragement banner.
- Category tabs with pictorial icons.
- Tier filter row.
- Dense grid of premium item cards; each card has finished art, readable name, price, and tier/currency cue.
- Selected item gets a stronger glow/border.
- Right column: large avatar try-on view + selected-item detail card + Buy/Try On actions.
- Bottom: bundle/collection cards with aspirational furniture/room imagery.
- No loot boxes, no expiring offers, no FOMO, no random paid reward behavior. Avoid manipulative “save X%” pressure even if the visual reference contains it; retain the composition but use permanent-value or collection-completion language instead.

### Quest reference
- Top center: Quest title + breadcrumb/skill context + stage bar.
- Stage visual: Diagnose → Practice → Review → Transfer, but the actual default StarBlox Quest remains exactly 5 learning actions.
- Left: avatar encouragement vignette.
- Center: large story/question card with readable passage, contextual illustration, learning quote, feedback panel, and concise why-this-is-right explanation.
- Right-center: large multiple-choice answer controls with obvious selected/correct states, Hint, and a large green Check My Answer button when manual checking is appropriate.
- Right column: mastery card, Today’s Learning checklist, encouragement/companion panel.
- Bottom: bounded earned-reward summary. No streak-loss penalties or fear-of-loss framing.

## Non-negotiables
- Existing player progress/inventory must never be reset.
- Runtime curriculum stays source-grounded and deterministic enough to audit.
- Every production question has exactly one defensible correct answer.
- Wrong answers never remove currency or possessions.
- No ads, loot boxes, FOMO, streak-loss penalties, public child profiles, public chat, unrestricted DMs, stranger discovery, or exact-location sharing.
- No copyrighted Roblox/Brookhaven assets or recognizable third-party character/brand assets.
- Final equipment/catalog art must be original and item-specific.
- Design for iPhone/tablet touch first: approximately 44x44 CSS px minimum targets, readable type, no hover-only or drag-only critical actions, reduced-motion support.
