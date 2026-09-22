# Workstream 13 — Scene / Character Art

STATUS: **READY_FOR_REVIEW — Home v2 + Quest v1 + Store v1 scenes, avatar-headset v1 and buddy-stage v1 staged with exact origin readback; none runtime-wired**

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

## Parallel candidate — `store-boutique-w13-v1`

The current branch-local Store render was inspected beside the immutable Store reference before production. The largest environment gap is that the live Store reads as a flatter UI shell with limited boutique architecture/material depth around the catalog and try-on zone. Lane 13 therefore staged a **separate boutique background only**; it does not include the avatar/mannequin, catalog cards, prices, item metadata, ownership/equipment state or runtime UI.

Composition intent:

- warm blush/lilac/cream architecture, warm wood and soft gold light with selective cobalt/cyan StarBlox accents;
- wardrobe/vanity/shelving/rail/plant/lamp/pedestal depth concentrated around the outer edges;
- broad center-left and center kept calmer behind the existing catalog/filter UI;
- far-right try-on zone softly lit but uncluttered behind separately composited equipped-character rendering;
- no people, mannequin, UI, text, prices, logos, branded garments, third-party IP or flattened fake-screen content;
- reference outfit/merchandise remains visual guidance only and cannot override owned/equipped choices.

### Exact staged Store assets

- Full-quality: `public/assets/visuals/lane-13/store-boutique-w13-v1-full.png` — **2304×1792**, 4,511,635 bytes, SHA-256 `01fd80f63e0deda237b1e19df4cb307c8380347beb2c69868114fd13709cd444`, Git blob `b05d3be93b49f0e8f06359bfd524bde8a1e8d17d`.
- Desktop derivative: `public/assets/visuals/lane-13/store-boutique-w13-v1-1408x1056.png` — **1408×1056**, 1,679,187 bytes, SHA-256 `04d0a2660dc5109aa2cdcea956f807baa01c6eb6b998598f656dfce83d3d0fe8`, Git blob `c0959df22e8f67ab9812c791e679acad224045ba`.
- Exact origin readback: **PASS 2/2 exact SHA-256**; binary-push head recorded by the intake as `707dad359bc88eb520fe20aa818bc5c7f5dd378c`.
- Intake evidence: `docs/preproduction/visuals/lane-13-store-v1-intake.json`.

Provenance: Adobe generation request `1f92b4a4-ed9d-41ec-9694-2a535d91055d`; Adobe crop request `3a6253e1-5209-438d-9204-b67beec5e50b`. The immutable Store source remains `docs/preproduction/reference-screenshots/originals/store-1448x1086.jpeg` with SHA-256 `b26cb14947d85258bcfff211174e54f34f2e2a11b83c73560b2365167071071d`. The comparison used the existing branch-local render artifact from run `35663655650`; no screenshot-parity claim is made.


## Current review state

- **Home v2:** still waiting on independent reviewer 01 art judgment and reviewer 14 composition/performance judgment. It was not regenerated while pending.
- **Quest v1:** staged and waiting on the same independent review split. Producer inspection/readback is not acceptance.
- **Store v1:** newly staged and waiting on independent art-direction plus composition/performance review.
- **Runtime:** none of the three scene candidates are wired. Workstream 09's active environment assets and Workstream 06 avatar implementation remain untouched.


## Character layer candidate — `avatar-headset-w13-v1`

The current Home/Store/Quest renders were inspected against the immutable references before character production. The cross-screen defect is that the live avatar treatment is much flatter and less expressive than the target character language. To avoid overriding owned/equipped choices, lane 13 produced **only a transparent head/face/hair/headset layer** plus a neutral minimal shoulder underlayer; no outer outfit is authoritative or runtime-wired.

Character intent:

- original friendly medium-brown hair with rounded layered locks;
- expressive warm eyes/brows, subtle freckles and a small natural smile;
- original blush/lilac over-ear headset with small rounded cat-ear attachments and selective cyan accents;
- head, hair, headset, neck and minimal shoulders only;
- plain neutral lavender crew-neck underlayer is explicitly non-authoritative and intended to be covered/replaced by owned/equipped clothing;
- no logo, UI, text, jewelry, branded clothing, third-party likeness or copied character design.

### Exact staged character assets

- Source preservation: `public/assets/visuals/lane-13/avatar-headset-w13-v1-source.png` — **2048×2048**, 3,488,922 bytes, SHA-256 `c20cda5ddcf1168579f86e9ae3f76b47a57cf3d5eafb5ceaa99d3133169cd319`, Git blob `e1edc56e25a4a3ac3ee0d0aa3a65e91148960096`.
- Full transparent cutout: `public/assets/visuals/lane-13/avatar-headset-w13-v1-full.png` — **2048×2048**, 1,973,818 bytes, SHA-256 `e14ffd9436d9d85606bf074fee4da22e93b4fab3b21504c44619e1341ebfcec1`, Git blob `8ad973728f1ee5d164420f52ae1795137259ff75`; alpha bbox `[344,182,1728,1938]` with 0..255 alpha extrema.
- Optimized transparent derivative: `public/assets/visuals/lane-13/avatar-headset-w13-v1-1024.png` — **1024×1024**, 675,538 bytes, SHA-256 `19b7dbc3e0e1f40681954b63ad570bd2d5aabfa9b5957a8f24ab4f24e6ff1a01`, Git blob `adfb7ec4919b281ab84bcd63cfaf8bae265c9fd4`; alpha bbox `[172,92,864,969]`.
- Exact origin readback: **PASS 3/3 exact SHA-256**; binary-push head recorded by the intake as `88d580613fc60f56d5754567ad78c88ac87446c5`.
- Intake evidence: `docs/preproduction/visuals/lane-13-avatar-headset-v1-intake.json`.

Provenance: Adobe generation request `9b0023e7-5c93-4b5d-971a-5518470944fe`; background-removal request `079eaf22-9c13-4d9e-9611-1768f38fc415`; resize request `cb037264-0787-4024-830a-85f51b4e68c8`. This is producer-staged art only, not an avatar-runtime or equipment-system change.


## Buddy presentation layer — `buddy-stage-w13-v1`

The Home/Quest references give the buddy a deliberate visual stage near the avatar, while the current branch renders do not yet have an equally coherent reusable presentation layer. To avoid overriding buddy ownership/identity, lane 13 produced **only a transparent pedestal/glow staging asset**; it contains no creature and changes no Buddy/Bond state.

Staging intent:

- small rounded toy-game pedestal with a subtle star inset;
- translucent lilac/cyan rim light with blush/gold accents;
- faint halo, sparse sparkle particles and a soft contact shadow;
- sized to sit beside a separately composited avatar and underneath any player-selected buddy;
- no creature, avatar, text, UI, logo, buttons, third-party IP or baked gameplay state.

### Exact staged buddy-stage assets

- Source preservation: `public/assets/visuals/lane-13/buddy-stage-w13-v1-source.png` — **1536×1536**, 1,441,961 bytes, SHA-256 `e400e0ff17c28181a9f6223dd9fd55a07d70b4cbce5ab2e297d42711055f0d8f`, Git blob `40dfb0eb242d7c2739bbba0fc102ea80baa3bf6e`.
- Full transparent cutout: `public/assets/visuals/lane-13/buddy-stage-w13-v1-full.png` — **1536×1536**, 337,414 bytes, SHA-256 `20e22e48891c63512ada3be5e843885e7ae884937884276313739440afce55c4`, Git blob `897e1a1aa86db4accd831872a37f678d38c4b75e`; alpha bbox `[270,516,1249,1177]`.
- Optimized transparent derivative: `public/assets/visuals/lane-13/buddy-stage-w13-v1-768.png` — **768×768**, 136,010 bytes, SHA-256 `add4696b3da9c5d7664f4e03c13f91498bb269902b5ab70336d21ece2b3c79f2`, Git blob `503788fcbdc250770fd4fcaa0c706856496ee0d9`; alpha bbox `[135,258,625,589]`.
- Exact origin readback: **PASS 3/3 exact SHA-256**; binary-push head recorded by the intake as `b2db735a284aa01436d1e85bf4514762c374de79`.
- Intake evidence: `docs/preproduction/visuals/lane-13-buddy-stage-v1-intake.json`.

Provenance: Adobe generation request `7a8d4166-af69-4ee2-80e4-3a6be3e8dec9`; background-removal request `1390d0c7-9e03-49c2-b01c-66ff11e6bff9`; resize request `c5a476e0-1684-4f2d-b6f6-024fcd708e4c`. Player-selected buddy identity and Bond progress remain authoritative and untouched.


## Scope safety

None of the three staged scene candidates, avatar-headset layer or buddy-stage layer edits Workstream 09's active environment, Workstream 06 avatar/buddy implementation, catalog manifest/runtime mappings, saves/economy/learning, Buddy/Bond state, Replit, Floot or `main`. They are versioned review candidates only.

## Independent review handoff

- **01:** judge exact Home v2, Quest v1, Store v1, avatar-headset v1 and buddy-stage v1 pixels against their immutable references; every decision must bind to the exact hashes above/intake evidence.
- **14:** judge overlay-safe composition, alpha/cutout quality, format/performance and real-browser suitability.
- **15:** only after independent acceptance, coordinate environment handoff to Workstream 09 and character/buddy presentation handoff to the appropriate owner.

Workstream 13 must not self-approve or wire this candidate.

## Foreground avatar/buddy grounding layer — `home-avatar-stage-w13-v1`

The current Home desktop render from workflow run `35663655650` was inspected beside the immutable Home reference before production. The visible foreground gap is grounding: the running avatar/buddy read flatter and less physically planted than the target's dimensional plush rug/contact-depth treatment. Lane 13 therefore produced a **separate foreground staging layer** rather than changing Workstream 06 avatar assets or Workstream 09 environment assets.

Composition intent:

- plush pink/lilac/cream star-cloud platform with restrained cyan piping and tiny warm-gold accents;
- broad uncluttered center reserved for the separately composited equipped avatar and player-selected buddy;
- warm dappled window-light cues and tactile depth to bridge the dimensional gap visible in the reference;
- no people, creatures, UI, text, buttons, logos, furniture, branded imagery or third-party IP;
- no runtime wiring, catalog mapping, save/schema/reward/curriculum change, Replit/Floot use, deployment or `main` change.

### Exact staged foreground assets

- Preserved source: `public/assets/visuals/lane-13/home-avatar-stage-w13-v1-source.png` — **1536×1536**, 2,229,996 bytes, SHA-256 `71f27c10973f9cc654f2ecb91913922b305e7a58311a411aa52a40d879425d29`, Git blob `e0d509b0a29132a5cf3b12277fa49f04f76b27ea`.
- Full transparent layer: `public/assets/visuals/lane-13/home-avatar-stage-w13-v1-full.png` — **1536×1536**, 1,111,039 bytes, SHA-256 `66736c6156d29b3efe4c525af2dd23ce64623aa842b4c2d0f29529895f46e395`, Git blob `42e7e34d2da6730476840df861ef90491dbf9779`; alpha bbox `[34, 598, 1488, 1372]`.
- Optimized transparent derivative: `public/assets/visuals/lane-13/home-avatar-stage-w13-v1-768.png` — **768×768**, 348,059 bytes, SHA-256 `e2ec060dcbfa54004646826dc04b7f25dfd8850fe31e0fc68f0373871f398afa`, Git blob `803ecf040f7382fb3fcbdb27482b52baaa1f1ee9`; alpha bbox `[17, 299, 744, 686]`.
- Exact origin readback: **PASS 3/3 exact SHA-256**; intake evidence: `docs/preproduction/visuals/lane-13-home-avatar-stage-v1-intake.json`.

Provenance: Adobe generation request `61fc0ea8-925b-4bf4-bfa7-6e5d701eef39`, center-fill edit request `d8e3db7e-9208-4b5b-a5e6-12c0def9a642`, background-removal request `c12b8574-7643-433a-a893-f70e4e328ca6`, optimized-resize request `540026d2-da28-49bc-b1a3-ae7478790d5d`. The immutable Home source remains `docs/preproduction/reference-screenshots/originals/home-1448x1086.jpeg` at SHA-256 `6a4b110aeaf12a6ab0c629f9181cc6cfa8d4f55a518d4f2a6adb3ac6e756c457`.

### Review state

This is **producer-staged only**. Reviewer 01 must independently judge art quality against the exact reference pixels; reviewer 14 must independently judge responsive composition, alpha/occlusion behavior and performance. Reviewer 15 may coordinate runtime wiring only after those acceptances and must keep Workstreams 06/09 authoritative for their in-flight avatar/environment assets. No physical-device test or screenshot-parity claim has been made. Existing regression/build/release blockers remain open for their assigned owners.

