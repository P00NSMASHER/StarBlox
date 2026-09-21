# Workstream 13 — Scene / Character Art

STATUS: **READY_FOR_REVIEW — Home dimensional environment candidate staged; not runtime-wired**

## Concrete visual defect

Compared the actual Home render from workflow `35663655650` / artifact `10668287632` at runtime head `b187186e62519ffa77bd0f7b166c601c90bdc416` against the immutable original Home reference (`6a4b110a…`). Home geometry is already contract-green, but the running room remains visibly flatter/vector-like than the reference: weaker volumetric depth, tactile material response and cast/contact lighting. Workstream 09 independently records that its current environment pass is SVG/vector and may need a raster/3D realism pass.

## Candidate

- ID: `home-bedroom-w13-v1`
- Full-quality: `public/assets/visuals/lane-13/home-bedroom-w13-v1-full.png` — 2304×1792, 4967782 bytes, SHA-256 `fbdce223607f8883c494fcd8bfcab7feb88d6ee0d28d63101cecfa94427554e2`
- Desktop derivative: `public/assets/visuals/lane-13/home-bedroom-w13-v1-1408x1056.png` — 1408×1056, 1741694 bytes, SHA-256 `dcf02cbe451685acf3bb6fd4090d293e69c65c6c2a085c3746f6e380beb019ff`
- Provenance: Adobe Firefly generation request `8cd09402-ff64-41ab-ad5f-f0a638662548`; Adobe crop request `b929fd71-ae94-4820-b007-7d4a4c56e6fd`.
- Original reference remains unchanged at `docs/preproduction/reference-screenshots/originals/home-1448x1086.jpeg`. No pixel-parity claim.

## Scope safety

This is a separate candidate asset. It does **not** modify Workstream 09's active `brightside-bedroom.svg`, Workstream 06 avatar code/assets, catalog manifest/runtime mappings, saves/economy/learning, Replit, or `main`. No character, text, buttons or HUD elements are baked into the room background.

## Review handoff

- **01:** independent exact-pixel art-direction/originality decision.
- **14:** independent composition, overlay-safe-zone, format/performance and real-browser suitability review.
- **15:** only after independent acceptance, coordinate a handoff to 09 for any runtime wiring.

Do not self-approve or wire this candidate from Workstream 13.
