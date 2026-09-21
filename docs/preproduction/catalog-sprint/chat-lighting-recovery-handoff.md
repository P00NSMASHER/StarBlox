# Checkpoint — Lighting 05–08 recovered and rendered

Batch: `chat-lighting-recovery-20260921`  
Status: **4 repository-staged candidates / 4 clean isolated browser renders / independent visual acceptance pending**  
Original producer: **04**; byte-transport and QA helper: **CHAT**  
Independent visual reviewer: **14**; canonical integrator: **08**  
Branch: `screenshot-match-preproduction` only

## Exact delivered versions

The four existing Firefly generations previously marked remote/upload-blocked in lane-04 have been recovered without regenerating, cropping, recoloring or recompressing them. The 600×600 JPEGs are exact service-rendition bytes; the 1024×1024 source PNG bytes are also preserved.

| Item | Name | Tier | Theme | Candidate repository path | Git blob |
|---|---|---:|---|---|---|
| lighting-5 | Vine Light | 2 | Galaxy Glow | public/assets/catalog/lighting-5-w04-recovered-v2.jpg | a9e03e73c7080fdc2effd884bb0965999954d90c |
| lighting-6 | Planet Lamp | 2 | Sunny Pop | public/assets/catalog/lighting-6-w04-recovered-v2.jpg | d8d8fca7cda78451860377bfdfd257b4a450aa9c |
| lighting-7 | Sun Lamp | 3 | Aqua Wave | public/assets/catalog/lighting-7-w04-recovered-v2.jpg | 7ce162a18ab641df7ab73f380557aad5aa64b24d |
| lighting-8 | Bubble Lamp | 3 | Art Attack | public/assets/catalog/lighting-8-w04-recovered-v2.jpg | 9073a049ec9116cf3e4408adf068be48f1ad00f1 |

Four display JPEGs total **224,811 bytes**; four preserved PNG originals total **3,943,293 bytes**. These are measured file sizes, not phone-performance claims. Source paths, hashes, original generation IDs and per-file measurements remain in `chat-lighting-recovery-result.json`.

## Executed checks

- Actual Store metadata, including ID/name/category/type/tier/theme/price/unlock requirement: **PASS 4/4** against the exported `store` in `src/gameModel.js`.
- Exact source/candidate byte readback: **PASS 8/8**; downloaded workflow artifact also independently matched its recorded ZIP digest and all eight file hashes in the interactive runtime.
- Candidate decoding/dimensions/nonblank content: **PASS 4/4**, 600×600 JPEGs.
- Duplicate candidate content: **0 duplicates**, four distinct measured content hashes.
- Repeat intake: **PASS**, second invocation reverified stored files without downloading or regenerating them.
- Full regression: **99/99 tests, 22/22 files PASS** on staged commit `3ea71d51c2f3a0946cceda9979065c3bf476be4c`; production Vite build **PASS**.
- Subsequent coherent candidate `5b2dec716e3c6ba80620a7c847d986a853080a17`: full regression and production build steps **PASS** again in isolated-render verification run `35665938359`, job `106551579589`.
- Four-image isolated browser verification: **PASS 4/4**, contact sheet plus four 800×800 detail captures, zero page/console/request errors. Each capture is tied to the exact candidate path and hash.
- TypeScript typecheck: **NOT APPLICABLE**, no TypeScript app changes in this batch.
- Canonical Store integration and independent visual acceptance: **NOT PERFORMED BY THIS INTAKE**. All four remain READY_FOR_REVIEW.

## Exact render evidence for reviewer 14

Successful scoped verification: run **35665938359**, job **106551579589**, artifact **10668723285**, name `lighting-5-8-isolated-render-evidence`.

Artifact SHA-256: `9a3e1a3a90752a3f60de0679dbfb05e4398080c3bd49bd2625c2437a1db473d3`.

Artifact paths:

- `artifacts/lighting-recovery-isolated/report.json`
- `artifacts/lighting-recovery-isolated/lighting-5-8-card-contact-sheet.png`
- `artifacts/lighting-recovery-isolated/lighting-5-a9e03e73-detail.png`
- `artifacts/lighting-recovery-isolated/lighting-6-d8d8fca7-detail.png`
- `artifacts/lighting-recovery-isolated/lighting-7-7ce162a1-detail.png`
- `artifacts/lighting-recovery-isolated/lighting-8-9073a049-detail.png`

The interactive chat downloaded this artifact, verified its digest and all five screenshot hashes, and visually inspected the card contact sheet and exact stored JPEGs. This is transport/producer-side QA, **not reviewer-14 acceptance**. The fixture is image-only, not a claim that these candidates are already rendered in the canonical Store.

## First failed shared-fixture run retained, not hidden

Initial recovery run **35665398592**, job **106549924161**, successfully staged the assets, passed all 99 tests and built the game, but the whole shared staged-art gate failed. Its artifact **10669425873**, digest `9baa763a5bd00296e29d6f53ea738bedc180c4ad0f72f7f19cab65a4ac8f320f`, is retained.

The shared fixture navigated to the repository-root `index.html` on a plain HTTP server. That attempted to load the Vite source `main.jsx` with `application/octet-stream`, adding a module-load console error before fixture replacement. Unrelated Desk 2–4 candidates also had zero visible alpha. Neither failure was suppressed or changed to PASS. Details and exact affected Desk hashes are preserved in `chat-lighting-render-incident.json` for 14/03.

The clean follow-up uses a bounded image-only, same-origin Playwright fixture for these **four exact files only**. It does not alter the shared renderer, game runtime, or assertions; all asset/network/browser error checks stay active. The shared whole-catalog defect remains separately open until its owner repairs and reruns it.

## Review observations and next action

Vine Light has a grounded bronze vine, translucent leaves and small luminous nodes. Planet Lamp has a glowing orb and separated metal orbit rings. Sun Lamp has sculpted aqua glass rays and a reflective support. Bubble Lamp has overlapping glass volumes, vivid colored swirls and a chrome pedestal. These are descriptive preflight observations, not proof of final screenshot parity.

14 should independently judge the stored 600px versions at card/detail scale beside the original Store reference: identity, exact theme, materials/light, margins, tier progression and visual uniqueness. In particular, verify that tiny Vine lights survive card reduction and that Sun Lamp unmistakably reads as a lamp rather than a mirror. Do not transfer legacy REWORK decisions to replacement hashes or accept a raster solely because it looks richer.

04: reconcile remote-only statuses to these stored files and avoid duplicate generation. 08: integrate only after qualified independent ACCEPT. 15: byte-delivery and isolated-render blockers are cleared for these four IDs; shared fixture/Desk findings remain separately recorded. The next transport batch is existing **Lighting 9–12**, only after checking whether their current bytes are already stored.

This pass adds **zero new generations, zero self-approved final items and zero canonical promotions**. It does not modify catalog manifest/runtime mappings, item IDs/prices/unlocks, player data, curriculum, Replit, Floot or `main`.
