# StarBlox Visual North Star

These requirements are derived from the user's three approved reference screens shared on 2026-09-18. They are the canonical visual target for the current build.

## Core target

StarBlox should look and feel like a premium, highly illustrated, colorful kids game UI — not a generic React app, dashboard, flat educational site, or minimalist block-world prototype.

The visual bar is deliberately high-density, polished, playful, aspirational, and game-like.

Use the same visual LANGUAGE and COMPOSITION as the approved references while keeping all StarBlox characters, logos, items, environments, icons, and assets original. Do not copy Roblox, Brookhaven, branded characters, or third-party protected assets.

## Global shell

- Full-screen illustrated scene as the main visual field.
- Large original StarBlox logo at upper-left with chunky glossy multicolor lettering, star motif, and short learning tagline.
- Left vertical navigation with large beveled icon buttons: Home, Quests, Study, Room, Store.
- Top HUD with glossy game-chrome counters for Coins, Stars, XP/Level, and Mastery.
- Rounded beveled blue panels with bright cyan outer glow, inner highlights, and thick readable borders.
- Strong gold/yellow achievement accents.
- Saturated candy palette: cobalt/royal blue, cyan, pink, lavender, gold, white, and selective green for positive actions.
- UI should feel dimensional and tactile with layered shadows, bevels, rim lights, glossy highlights, and soft neon glows.
- Dense but organized. Avoid excessive empty space.
- Text is bold, rounded, high-contrast, and readable at child scale.
- Use illustration and iconography heavily; do not leave large text-only sections.

## Character / mascot presentation

- Large friendly original StarBlox girl avatar is a hero visual, not a small utility avatar.
- Character is expressive, toy-like, stylized, warm, and highly rendered.
- Clothing/accessories should visibly match equipped catalog items.
- Hair, face, headset, outfit, backpack/hand gear, and shoes must feel like premium illustrated game assets.
- Persistent buddy/pet appears physically in the scene, not only as an icon.
- Character reactions and speech bubbles can reinforce item choices and learning feedback.
- Do not use emoji as final character/item art.

## HOME screen

Match the approved Home composition:
- full-bleed aspirational bedroom scene;
- large avatar centered/right and buddy near the avatar;
- top-center Room Progress strip showing 5 room tiers with thumbnail previews and locks;
- right-side Dream Goal card with large aspirational image, goal benefits, and strong Keep Learning CTA;
- lower-left Daily Quests card with compact rows and green Go buttons;
- lower-center Customize Me tray with tabs and item thumbnails;
- lower-right Today I'm Learning card;
- strong motivational footer/callout;
- environment contains visible shelves, books, lamps, bed, desk, plants, posters, trophies, windows, rugs, tech, and earned objects.

Home tiers should be visually dramatic:
1. Starter — cute/cozy, simpler furniture.
2. Cozy — warmer and fuller.
3. Stylish/Creator — premium bedroom with more technology/decor.
4. Dream — luxurious architecture and materials.
5. Star Mansion — spectacular aspirational estate/interior.

## STORE screen

Match the approved Store composition:
- top title bar with Store icon, headline, and learning-to-earn message;
- large category icon tabs across the top;
- tier/filter/sort row directly underneath;
- dense multi-column product grid with large item art, item name, price, tier/state badge;
- selected item produces a large right-side character preview and item-detail panel;
- Buy and Try On / Equip actions are strong and obvious;
- lower section may feature curated bundles/collections, but no manipulative discounts, timers, FOMO, expiring offers, or paid currency;
- permanent purchase language must remain clear.

Catalog art target:
- square premium thumbnails;
- pastel/bright studio background;
- clear centered silhouette;
- soft 3D materials;
- consistent lighting/camera;
- each item visually distinct;
- tier spectacle rises from Starter -> Glow-Up -> Epic -> Dream -> Luxe.

Do NOT implement paid bundles or fake sale percentages from the reference. Use the layout and presentation style only.

## QUEST screen

Match the approved Quest composition:
- illustrated learning room/library background;
- large avatar occupying left-side scene;
- top quest title panel with subject/skill breadcrumbs;
- visible phase/progression strip across top: Diagnose -> Practice -> Review -> Transfer;
- main content area is a large illustrated story/lesson card;
- story title and readable passage on left;
- contextual illustration embedded in the lesson card;
- questions/answers on the right in stacked rounded choice rows;
- hint panel directly below choices;
- explanation / Why This Is Right card after answering;
- right rail shows subject mastery and Today's Learning checklist;
- bottom shows earned Coins/Stars/XP;
- feedback is celebratory but concise;
- wrong answers remain safe and instructional.

The current 5-action adaptive Quest remains the learning contract. The visual phase strip may summarize the learning sequence, but must not falsely claim a skill is mastered after one question.

Do not implement streak-loss pressure. If a streak-like visual is ever used, it must be non-punitive and must not imply loss for missing a day.

## Game feel

- Visual reactions should be immediate and satisfying: sparkles, stars, small light bursts, avatar/buddy reactions.
- Avoid long blocking animations.
- Respect reduced-motion.
- Primary action buttons are large, glossy, and obvious.
- No flat gray admin-like panels.
- No generic icon-only placeholders.
- No bare CSS boxes as final art.

## Mobile adaptation

The approved references are dense widescreen layouts. On phone:
- preserve the same visual richness but reflow into stacked panels;
- keep character/environment art prominent;
- keep nav accessible with 44px+ targets;
- avoid tiny text and cramped controls;
- do not merely shrink the desktop canvas to unreadable scale.

## Development priority through 8 PM today

1. Quest visual composition + question correctness.
2. Home hero scene + tier strip + Dream Goal + Daily Quests + Customize tray.
3. Store category/filter/product-detail composition.
4. Premium portable item artwork beginning with the 12 Tops.
5. Avatar/buddy visual polish and equipment correspondence.
6. Global HUD/nav/logo/chrome consistency.
7. Only then spend time on Neighborhood/world expansion.

## Release bar

A screen is NOT visually finished if it still looks like:
- default React/Vite UI;
- flat cards over gradients;
- simple CSS avatar geometry;
- initials standing in for item art;
- generic SaaS filtering;
- sparse whitespace-heavy layout;
- emoji placeholders;
- unillustrated Home/Quest/Store backgrounds.

A screen is visually on-target when it feels like a cohesive screenshot from the same premium children's game as the approved references.
