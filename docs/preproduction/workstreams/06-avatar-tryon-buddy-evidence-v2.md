# Workstream 06 — Avatar True-Try-On + Buddy Evidence v2

Status: **ART-ONLY EVIDENCE / NO SHARED RUNTIME EDIT AUTHORIZED**  
Branch: `screenshot-match-preproduction`  
Observed branch head before this write: `660ed6869e0e11d7d6aff3771702ef61d56bfa42`

## Why this increment exists

The current Workstream-15 handoff explicitly freezes the repository-stored Companion 2/5/6/7 candidates at their current hashes while shared render/reviewer evidence is reconciled. Workstream 06 therefore did **not** generate or mutate any Companion, Seating, or Shoes bytes in this increment. Spare ART_AND_VISUALS_ONLY capacity was used to turn the existing Avatar/Buddy implementation into an implementation-ready visual defect/evidence map without touching shared runtime, CSS, state, gameplay, canonical catalog wiring, deployment, or player data.

Preserved current Companion candidates:

- `companions-2` — `88d10d6f8c412d0ab7fde6ac7a7ff202858077db`
- `companions-5` — `1ae7b431e519563ee1dbbdb0ae762bfee6f95ac0`
- `companions-6` — `28cb411201d8ec30dae2f70b740efe1e86985386`
- `companions-7` — `39d35ea40a0a138ae99ddcdc09f8f2a3683fa49d`

Reviewer 05 remains the independent Companion judge; reviewer 02 remains the independent Seating/Shoes judge; Workstream 08 alone canonical-wires catalog art; Workstream 15 alone authorizes shared runtime/CSS/entrypoint edits.

## Evidence inputs

This study is bound to the current source blobs read before writing:

- `docs/preproduction/ART_VISUALS_SPRINT.json` — blob `b28e90d1167541161f992fabfe643a6657419dce`
- `docs/preproduction/art-factory/README.md` — blob `5d6f3433982476fa115697034743b2c580f50c5f`
- `docs/preproduction/art-factory/ART_FACTORY_V2.json` — blob `fc0d2456a40fcce6ea505c6cd40554135d98f2bb`
- `docs/preproduction/art-factory/ACTIVE_BATCH.json` — blob `2668eadac6e0a49ac2492bcfb2d69cb1696703c9`
- `docs/preproduction/DELIVERY_PROTOCOL_V2.md` — blob `13c3c00b9f8410476c02717ab475df5917ad9830`
- `docs/preproduction/reference-screenshots/original-reference-manifest.json` — blob `63956763934f17613a3f98889f8085051a78a0b6`
- `docs/preproduction/workstreams/06-true-tryon-buddy-presentation-v1.md` — blob `8f4d63208ca4d18b1213e261c2134b39c6d31cc5`
- `src/App.jsx` — blob `853595d231039ca1be357bf846b8fb7baf2dde7a`
- `src/avatarBuddyRuntime.js` — blob `344879ba4686cdf7c0baed9be39e8756239de73e`
- `src/avatarBuddy.css` — blob `2ccf9479c33b3dff9615fa3d637662186129861f`

The verified original screenshot targets remain Home/Store/Quest at 1448×1086, with normalized 1408×1056 comparison images prepared without cropping. No phone/tablet reference pixels are invented.

## Current implementation strengths to preserve

1. `avatarBuddyRuntime.js` reads existing saves and mirrors the exact equipped IDs into `data-top`, `data-bottom`, `data-shoes`, `data-head`, `data-face`, `data-back`, `data-hand`, `data-aura`, and `data-companion` without writing player state.
2. The existing equip path in `App.jsx` rejects non-owned items and replaces only the intended equipped slot.
3. Buddy Bond is read for presentation but is not mutated by the Avatar/Buddy decorator.
4. The current avatar treatment already establishes one shared warm face/hair/body silhouette, so future work should replace slot visuals without creating another competing anatomy system.
5. Existing accessory runtimes/CSS provide a usable bridge for head/face/back/hand/aura placement; the remaining problem is fidelity and crop quality, not a need for a second global framework.

## Concrete visual gaps proven by current source

### P1 — Store has equip, not true non-persistent try-on

`App.jsx` currently presents owned wearable items with an `Equip` action. The equip handler immediately writes the selected item ID into `save.equipped`, which then persists through the existing save pipeline. There is no separate ephemeral Store-preview state in the current App contract.

**Visual consequence:** a real Store try-on cannot currently show a different owned item on the live avatar without committing that equipment change. The requested contract requires preview first and persistence only after explicit equip.

**Future coordinated repair:** under a Workstream-15 shared-runtime handoff, introduce a visual-only preview source that shadows one slot in Store rendering while leaving the persisted `save.equipped` object untouched until the existing Equip action succeeds. Do not change item IDs, ownership, prices, Buddy Bond, or save schema.

### P1 — Shoes are state-colored but not exact-gear visual overrides

`avatarBuddy.css` deliberately forces `.avatarShoe.portableShoes` to `background-image:none!important` and redraws both feet as one generic CSS sneaker silhouette. The current item can influence color variables, but the accepted item's exact outsole/upper/lace/hardware construction is not shown on-avatar.

**Visual consequence:** two owned shoes with materially different approved Store art can collapse to the same wearable geometry with only palette changes. That does not satisfy "owned gear overrides the reference outfit" at item-identity level.

**Future coordinated repair:** preserve the stable two-foot anchors but allow exact approved wearable derivatives (or tightly cropped/matted approved item art) to drive visible upper/sole construction. A regression must compare at least two visually distinct accepted shoe IDs and prove that geometry/details change, not only color.

### P1 — Buddy scene presentation is hard-bound to legacy companion SVG paths

`avatarBuddyRuntime.js` resolves every equipped buddy through `companionAsset(itemId)` to `/assets/catalog/companions-N.svg` (with `companions-1.svg` fallback). This path does not consult current canonical catalog mapping or a dedicated approved buddy-sprite mapping.

**Visual consequence:** even when richer Companion replacements are independently accepted/canonical for Store presentation, the live scene Buddy can remain the old flat SVG. The equipped ID is correct, but the art fidelity can lag the approved catalog visual.

**Future coordinated repair:** preserve the exact equipped Companion ID and Bond while sourcing buddy presentation from an approved, identity-stable visual asset. Preferred order after explicit 15/08 coordination: dedicated approved transparent buddy derivative -> current canonical approved companion art with safe matting/crop -> legacy SVG only as fallback. Workstream 06 must not rewrite canonical mappings itself.

### P2 — Top/bottom are shared silhouettes, not exact wearable geometry

The current premium avatar body/legs are CSS shells driven primarily by equipment palette variables. Bottoms 1/8/9 receive a small heart-patch distinction, but the system does not yet express the full exact construction of every equipped top/bottom.

**Visual consequence:** owned item identity can be reduced to color/decoration rather than the actual neckline, sleeve, hem, waist, leg or material construction implied by approved Store art.

**Future coordinated repair:** keep the stable body rig and use item-specific wearable layers or masks that fit the rig. Exact owned art must visually replace the reference/base slot rather than sit as a square product card.

### P2 — Portable accessory art needs exact crop proof

Head/face/back/hand/aura use fixed `background-size`, `background-position`, dimensions and offsets. That is a viable bridge, but square catalog composition can still produce detached, over-large or source-edge-visible wearables.

**Future coordinated repair:** do not regenerate accepted catalog images solely for try-on. First render the existing portable layers on the live avatar and repair only a proven crop/anchor defect, preferably with a separate wearable derivative that retains lineage to the accepted source.

## True-try-on source precedence for a future authorized implementation

This is a visual-source rule only; it does not authorize code edits in this increment.

| Slot | Preferred visual source | Allowed fallback | Never acceptable |
| --- | --- | --- | --- |
| top | approved fitted wearable derivative bound to exact item ID | rig-based exact-theme/material reconstruction when no approved derivative exists | square product card pasted on torso; reference top still dominant |
| bottom | approved fitted wearable derivative | rig-based exact item construction | floating waistband / generic recolor only |
| shoes | paired wearable derivative preserving sole/upper/laces/hardware | approved item crop mapped to two anchors | one large product card; identical geometry for visibly different items |
| head | approved portable crop/derivative | current portable art with proven safe crop | detached float / face-obscuring crop |
| face | approved face-local derivative | current portable art with proven safe crop | replacing the whole face unintentionally |
| back | approved rear-layer derivative | current portable art with proven safe crop | front-body decal |
| hand | approved hand-local derivative | current portable art with proven safe crop | detached floating prop |
| aura | approved alpha/effect derivative | current portable aura with controlled opacity | opaque card/full-screen wash |
| buddy | dedicated approved buddy derivative or approved canonical companion art | legacy exact-ID SVG only when no richer approved visual exists | generic mascot or wrong buddy ID |

## Required rendered evidence after a Workstream-15 implementation handoff

Use the real app and state paths; no flattened mockups.

1. **Store preview non-persistence:** snapshot saved equipment + Buddy Bond, preview a different owned wearable, capture the visible changed slot, reload before Equip, and prove saved equipment/Bond are byte-for-byte unchanged.
2. **Explicit equip persistence:** equip that same item through the existing action, reload, and prove only the intended slot ID changed while all other equipped IDs, ownership and Buddy Bond remained unchanged.
3. **Two-shoe identity proof:** render two accepted shoe IDs with clearly different construction and prove both feet change coherently while ankle/floor contact remains stable.
4. **Top/bottom override proof:** render an owned top and bottom whose silhouettes/materials differ from the reference/base outfit and prove the base slot does not remain visible through them.
5. **Accessory anchor proof:** head/face/back/hand/aura each require one live full-body render showing correct depth order, no rectangular source edge and no critical face/hand/foot occlusion.
6. **Buddy fidelity proof:** render the actual equipped buddy ID beside the avatar with shared light direction/contact grounding; verify exact buddy identity and unchanged Bond before/after preview/equip.
7. **Surface consistency:** capture Home, Store and Quest at normalized desktop target and supported responsive viewports (1024×768, 390×844, 320×568 where the surface exists). Phone/tablet are QA targets, not claimed screenshot references.
8. **Reduced-motion:** aura/buddy effects keep a legible static equivalent with no visual-state or save-state change.

## Acceptance defects to flag immediately

- Preview mutates persisted equipped ID before explicit Equip.
- Preview/equip changes Buddy Bond, ownership, currency, progress or any unrelated slot.
- Exact owned shoe/top/bottom IDs render only as generic recolors despite distinct approved item construction.
- Buddy ID is correct in state but scene art shows the wrong/legacy identity when a richer approved exact-ID visual is available.
- Head/face/back/hand/aura show rectangular catalog edges, detached floating placement, severe clipping or incorrect front/back depth.
- Any solution bakes the screenshot into the app, copies Roblox/Brookhaven geometry, uses third-party character IP, or replaces real state-driven rendering with a static mockup.

## Coordination boundary / next owner action

- **06 now:** preserve current catalog candidates and accepted hashes; no parallel v+1 while the current Companion render/review handoff is pending. This document is the bounded art-only evidence increment.
- **14:** continue exact-hash candidate/surface rendering where assigned; reuse stable evidence rather than rerender loops.
- **05:** independently disposition Companion exact hashes when the current handoff is consumable.
- **08:** remain sole canonical catalog mapper.
- **13:** retain separate scene/character key-art ownership; this evidence does not duplicate key-art generation.
- **15:** when catalog/active-pilot coordination permits, issue an explicit shared-runtime/CSS handoff for true Store preview and exact wearable/buddy source resolution. Until then, no shared runtime/CSS/state implementation is authorized by this file.

No Replit/Floot/main/deployment/purchase/paid-setting/secret/real-player-data action was performed. No save, equipped ID, ownership, Buddy Bond, economy, learning, test, reference image, canonical manifest/runtime or catalog asset byte was changed by this increment.
