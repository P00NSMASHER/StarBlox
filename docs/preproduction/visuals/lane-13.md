# Workstream 13 — Scene / Character Art

STATUS: **READY_FOR_REVIEW — Home environment v2 staged and exact-readback verified; not runtime-wired**

## Concrete visual defect and v1 disposition

The actual Home render remains structurally green, but the running room still needs more dimensional material/light treatment to approach the immutable Home reference. Lane-13 v1 improved depth, but reviewer 01 returned **REWORK_BEFORE_RUNTIME_INTEGRATION**: its brightest window sat behind the intended avatar corridor, side-zone prop density was too sparse, and the room still read closer to a generic semi-realistic bedroom than a premium toy-game environment.

The v1 files remain preserved for history; nothing was overwritten.

## Current candidate — `home-bedroom-w13-v2`

V2 applies reviewer 01's measurable repair contract while keeping this as a separate, non-wired asset:

- bright architectural daylight moved to the far-left third, leaving the central avatar corridor calmer;
- bed-left and desk-right anchors preserved;
- central floor kept open for separately composited avatar/buddy art;
- side-zone density increased with shelves/books/plants/soft lights/toy-like room props;
- furniture uses chunkier rounded silhouettes, clearer bevel/edge light and stronger blush/lilac/cyan/gold accents;
- top-center and far-right remain comparatively calm for overlay panels;
- no character, buddy, UI, text, logo, buttons, counters or third-party IP are baked into the scene.

### Exact staged assets

- Full-quality: `public/assets/visuals/lane-13/home-bedroom-w13-v2-full.png` — **2320×1808**, 3,808,983 bytes, SHA-256 `d6f1936fc51ee7afd92a261a24015d02d93228cb7ae110fde9d7f12c0782c2cb`, Git blob `daa6069209ec438c6fc5e2e20788c33f7534d426`.
- Desktop derivative: `public/assets/visuals/lane-13/home-bedroom-w13-v2-1408x1056.png` — **1408×1056**, 1,394,961 bytes, SHA-256 `954d3d6e55b578506df87d787aa7d3aa7005f759b78cdd06b65603469ffc9251`, Git blob `2806e8282923efb1b0dc467cbae7139b8d3f339b`.
- Exact origin readback: **PASS 2/2** in workflow run `35669831950`, job `106563578273`.
- Intake evidence: `docs/preproduction/visuals/lane-13-home-v2-intake.json`.

Provenance: Adobe generation request `a61e4792-b459-4bcd-9e50-56475be8f979`; Adobe crop request `4bf802ff-17a1-4d22-84b9-657b30f6296d`. The original Home reference remains untouched at `docs/preproduction/reference-screenshots/originals/home-1448x1086.jpeg` (SHA-256 `6a4b110aeaf12a6ab0c629f9181cc6cfa8d4f55a518d4f2a6adb3ac6e756c457`). No pixel-parity claim is made.

## Scope safety

V2 does **not** edit Workstream 09's active environment, Workstream 06 avatar implementation, catalog manifest/runtime mappings, saves/economy/learning, Replit, Floot or `main`. It is a staged candidate only.

## Independent review handoff

- **01:** judge exact v2 pixels against the immutable Home reference and prior v1 repair contract; decision must bind to the hashes above.
- **14:** judge overlay-safe composition, format/performance and real-browser suitability.
- **15:** only after independent acceptance, coordinate any runtime handoff to Workstream 09.

Workstream 13 must not self-approve or wire this candidate.
