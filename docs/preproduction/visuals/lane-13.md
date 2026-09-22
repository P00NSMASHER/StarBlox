# Workstream 13 — Scene / Character Art

STATUS: **READY_FOR_REVIEW — Home v2 + Quest learning-room v1 staged with exact origin readback; neither runtime-wired**

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

## Parallel candidate — `quest-learning-room-w13-v1`

The current branch-local Quest render was inspected beside the immutable Quest reference before production. The dominant gap is environmental depth: the running Quest shell is a dark, shallow blue backdrop around the learning panel, while the target uses a warmer, layered study/library world with shelves, furniture, plants and believable light depth. Lane 13 therefore produced a **separate background asset only**; it does not bake in the avatar, buddy, educational panel, answers, mastery rail, navigation or any text/UI.

Composition intent:

- warm amber wood with blush/lilac ambient light and selective cobalt/cyan accents;
- richer peripheral bookcase/desk/plant/lamp depth at the left and right edges;
- central-left space reserved for separately composited avatar/buddy staging;
- center and center-right kept comparatively low-frequency for the interactive Quest panel;
- far-right kept calmer for mastery/today-learning overlays;
- no third-party IP, copied characters, logos, text, buttons or flattened fake-screen content.

### Exact staged Quest assets

- Full-quality: `public/assets/visuals/lane-13/quest-learning-room-w13-v1-full.png` — **2304×1792**, 3,727,227 bytes, SHA-256 `2c25bf254a6aed8810d84ffb72eaa4096bd3c4eae69b92dfceffcaaed5dce1db`, Git blob `d7b39a38406c257c168a9c65fe8c4496e76ed320`.
- Desktop derivative: `public/assets/visuals/lane-13/quest-learning-room-w13-v1-1408x1056.png` — **1408×1056**, 1,372,053 bytes, SHA-256 `00b1d96b463decf882193c27d433b313510069ca294706e56f77ff8ed948ff90`, Git blob `221add1864fce420bc347182bef4edfd6dfa0589`.
- Exact origin readback: **PASS 2/2 exact SHA-256**; binary-push head recorded by the intake as `e6b8385aedef6cd2fca378cff5fdee7ebb4614f8`.
- Intake evidence: `docs/preproduction/visuals/lane-13-quest-v1-intake.json`.

Provenance: Adobe generation request `9b3ba95e-a56f-4cdf-bfbc-3a30ff696c4f`; Adobe crop request `cf534922-622d-4397-8a89-375eb8c8568e`. The immutable Quest source remains `docs/preproduction/reference-screenshots/originals/quest-1448x1086.jpeg` with SHA-256 `70f1b952709a85c77bb11851ffe9ae704acf8b97640355e908b6ec537b5c73c9`. The comparison used the existing branch-local render artifact from run `35663655650`; no screenshot-parity claim is made.

## Current review state

- **Home v2:** still waiting on independent reviewer 01 art judgment and reviewer 14 composition/performance judgment. It was not regenerated while pending.
- **Quest v1:** newly staged and waiting on the same independent review split. Producer inspection/readback is not acceptance.
- **Runtime:** neither candidate is wired. Workstream 09's active environment assets and Workstream 06 avatar implementation remain untouched.


## Scope safety

Neither staged candidate edits Workstream 09's active environment, Workstream 06 avatar implementation, catalog manifest/runtime mappings, saves/economy/learning, Replit, Floot or `main`. They are versioned review candidates only.

## Independent review handoff

- **01:** judge exact Home v2 and Quest v1 pixels against their immutable references; every decision must bind to the exact hashes above/intake evidence.
- **14:** judge overlay-safe composition, format/performance and real-browser suitability for both candidates.
- **15:** only after independent acceptance, coordinate any runtime handoff to Workstream 09.

Workstream 13 must not self-approve or wire this candidate.
