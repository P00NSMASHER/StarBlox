# Workstream 06 — True Try-On + Buddy Presentation Visual Contract v1

## Scope and freeze guardrails

This is a **visual-only implementation contract** for Workstream 06 during `ART_AND_VISUALS_ONLY`. It does not change runtime code, CSS, gameplay, save/state schemas, catalog bytes, canonical manifest wiring, deployment configuration, or regression-test behavior.

- Preserve every current accepted/canonical Shoes 1–10 and Seating 7–12 exact asset hash. Do not reopen, regenerate, or re-review them without a later concrete exact-hash defect.
- Preserve accepted Companion exact hashes and Buddy identity/Bond/progress.
- Do not start Shoes 11–12 or another catalog family without a fresh explicit Workstream 15 reassignment.
- Workstream 13 owns scene/character key art in parallel. Workstream 06 must not duplicate that key-art scope; approved Workstream 13 art may be consumed only after coordinated handoff.
- Shared runtime, CSS, route, or entrypoint edits require an explicit Workstream 15 handoff.
- Workstream 08 remains the sole canonical catalog-path integrator.
- Replit, Floot, `main`, deployment, purchases, paid settings, and real player data remain frozen.

## Authoritative visual target

Use the verified original StarBlox screenshots in:

- `docs/preproduction/reference-screenshots/originals/home-1448x1086.jpeg`
- `docs/preproduction/reference-screenshots/originals/store-1448x1086.jpeg`
- `docs/preproduction/reference-screenshots/originals/quest-1448x1086.jpeg`
- manifest: `docs/preproduction/reference-screenshots/original-reference-manifest.json`

Visual intent: a warm, expressive original avatar with premium dimensional toy-block material response, clean silhouette hierarchy, coherent cast/rim lighting, readable wearable construction, and an integrated child-friendly buddy. Do not copy Roblox/Brookhaven geometry or any third-party character/IP.

## Existing state/equipment invariants

The current runtime contract is authoritative and must be visually represented rather than replaced:

- Equipment slots are exactly `top`, `bottom`, `shoes`, `head`, `face`, `back`, `hand`, and `aura`.
- Only already-owned items may become persistent equipped state through the existing equip path.
- Equipping a new item replaces only the item in the same slot; all other equipped slots remain unchanged.
- Exact item IDs and inventory ownership remain unchanged.
- The current buddy ID, buddy ownership, Buddy Bond, and player progress remain unchanged.
- Owned equipped gear must visually override the reference/base outfit in its slot.
- The reference/base outfit is fallback presentation only for a slot with no equipped owned item.
- Store try-on is a visual preview. It must not persist until the user explicitly commits through the existing equip flow.

## Wearable layering and anchor contract

### Aura

- Render behind the avatar silhouette as the far-rear effect layer.
- Use controlled bloom/transparency so the face, outfit edges, buddy, and UI remain readable.
- Do not turn the aura into an opaque rectangular card or a full-screen wash.

### Back

- Anchor to the rear torso/shoulder region.
- Keep most of the asset behind torso/hair where physically appropriate while allowing distinctive silhouette features to remain visible around the avatar edge.
- Never incorrectly render a back item as a front-body decal.

### Bottom

- Anchor at the waist/lower-body rig region.
- Respect hip/leg proportions and expected overlap with the top and shoes.
- No square-card cutout, floating waistband, or rectangular source-image edge.

### Top

- Fit/wrap the torso with a believable neckline, shoulder placement, hem, and material volume.
- Equipped top art overrides the reference top rather than stacking as a flat sticker on it.
- No rectangular card edge or detached floating garment.

### Shoes

- Use two foot anchors with stable left/right pairing.
- Preserve readable sole, upper, lace/hardware/material depth where present in the exact accepted asset.
- Avoid floor clipping, ankle detachment, or oversized catalog-card proportions.

### Head

- Anchor to the head/hair region and follow the avatar head angle.
- Avoid detached floating hats and avoid excessive hair/face clipping.

### Face

- Anchor in face-local coordinates and preserve the avatar's warm expression/readability.
- Face gear must not accidentally replace the face itself or obscure all expression cues unless the exact item design explicitly requires coverage.

### Hand

- Anchor to the intended hand with believable scale and rotation.
- Maintain a clear hand-to-prop relationship; no detached floating prop.
- Keep the prop within useful crop bounds on Home/Store/Quest where the surface supports it.

### Buddy

- Present the actual currently owned/equipped buddy, never a generic stand-in mascot.
- Buddy remains a separate grounded character with its own contact shadow and distinct anatomy/material response.
- Match the avatar scene's key/rim-light direction so the pair feels co-located.
- Preserve a child-friendly readable expression and recognizable silhouette.
- Do not cover the avatar face, footwear, or active hand prop.

## Surface-specific visual contract

### Home

- Prefer a near/full-body framing that keeps the warm face, footwear, and buddy readable together.
- Owned equipped gear must visibly override corresponding reference-outfit regions.
- Buddy should feel staged as a companion, not pasted on as a Store-card image.
- Use coherent contact shadows and a common lighting direction across avatar, gear, and buddy.

### Store

- Catalog card/detail art and live avatar try-on are separate visual roles.
- Try-on must show the item on the live avatar using the slot anchors above; a static product card is not a substitute.
- Preview selection remains ephemeral until the existing explicit equip action succeeds.
- Switching preview items must not silently mutate saved equipment or Buddy Bond.

### Quest

- A tighter crop is acceptable, but the avatar's face identity and the most salient equipped layers must remain readable.
- Preserve equipped-state consistency with Home/Store.
- Show the buddy only where the existing Quest surface supports it without obscuring objectives or core UI.

This contract intentionally does not authorize Room/Avatar shared-entry edits; those require Workstream 15 coordination if/when assigned.

## Slot acceptance matrix

| Slot | Required visual evidence | Automatic visual defect |
| --- | --- | --- |
| top | torso anchor, dimensional material, reference top overridden | rectangular card edge, floating garment, reference top still dominating |
| bottom | waist/leg anchor, stable proportion, coherent shoe overlap | floating waistband, card cutout, shoe occlusion error |
| shoes | two foot anchors, pair integrity, outsole/material separation | floor clipping, detached feet, catalog-card scale |
| head | head/hair anchor, follows head angle | detached float, severe face/hair clipping |
| face | face-local orientation, expression remains readable | whole-face misalignment, detached overlay |
| back | silhouette-edge visibility while remaining behind torso | renders as front decal, detached object |
| hand | hand anchor, believable scale/rotation | floating prop, off-crop at normal target framing |
| aura | rear effect, controlled bloom/transparency | face/UI washout, opaque rectangular source edge |

## Buddy presentation acceptance

A buddy presentation passes only when all are true:

1. It is the actual selected/owned buddy ID, not a generic replacement.
2. Buddy Bond and progress are unchanged before/after visual preview and equipment changes.
3. The buddy has a grounded contact shadow and coherent light direction relative to the avatar.
4. Species/robot identity, expression, and silhouette remain readable at scene scale.
5. Scale is balanced: the buddy is clearly secondary to the avatar but not reduced to an unreadable icon.
6. Avatar face, shoes, active hand prop, and key outfit silhouette remain unobstructed.
7. Home/Store/Quest presentation is visually consistent where each existing surface supports buddy rendering.

## Regression and visual-verification plan for a future coordinated implementation handoff

When Workstream 15 authorizes shared implementation edits, verify at minimum:

1. Equip one owned item in each of the eight slots and confirm the correct slot anchor/layer on the live avatar.
2. Equip multiple slots, then replace one item in one slot; verify all other equipped IDs and visuals remain unchanged.
3. Reload the app and verify the exact equipped owned IDs persist through the existing save/readback path.
4. Preview an item in Store without committing equip; reload and verify persisted equipment remains unchanged.
5. Commit equip through the existing flow; verify only the intended slot changes persistently.
6. Verify buddy identity, ownership, Buddy Bond, and progress are identical before/after preview, equip, and reload.
7. Capture Home/Store/Quest target-view evidence confirming face, footwear, hand prop, aura edge, and buddy are legible/in-frame as each surface permits.
8. Reject any implementation that substitutes static mockup compositing for real equipped-state-driven try-on.
9. Retain all existing gameplay/state/regression tests; add visual/equip regression coverage only under the coordinated implementation handoff.

## Coordination boundary

- Workstream 13: scene/character key art owner.
- Workstream 15: sole coordinator for shared runtime/CSS/entrypoint ownership and any new cross-workstream assignment.
- Workstream 08: sole canonical catalog-path integrator.
- Reviewer 02: accepted Shoes/Seating decisions remain closed/frozen unless a new exact-hash defect appears.
- Workstream 06: owns this versioned visual contract and future authorized true-try-on/buddy presentation work; this document is not self-approval and does not change canonical runtime behavior.
