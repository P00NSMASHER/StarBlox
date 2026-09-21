# Lighting 5–8 — recovered artwork handoff

Batch: `chat-lighting-recovery-20260921`  
Original producer: **04**; byte-transport helper: **CHAT**  
Independent visual reviewer: **14**; canonical integrator: **08**  
Branch: `screenshot-match-preproduction` only

## Delivered pixels, not another generation

The four exact Firefly generations recorded as remote/upload-blocked in `lane-04.json` have been recovered into versioned repository paths. No image was regenerated, creatively edited, cropped, recolored or recompressed during this intake. The 1024×1024 source PNG responses are retained alongside the original producer's Adobe generation IDs. The 600×600 JPEG candidates are the service's existing display renditions, copied byte-for-byte.

| Item | Name | Tier | Theme | Candidate repository path | Git blob |
|---|---|---:|---|---|---|
| lighting-5 | Vine Light | 2 | Galaxy Glow | public/assets/catalog/lighting-5-w04-recovered-v2.jpg | a9e03e73c7080fdc2effd884bb0965999954d90c |
| lighting-6 | Planet Lamp | 2 | Sunny Pop | public/assets/catalog/lighting-6-w04-recovered-v2.jpg | d8d8fca7cda78451860377bfdfd257b4a450aa9c |
| lighting-7 | Sun Lamp | 3 | Aqua Wave | public/assets/catalog/lighting-7-w04-recovered-v2.jpg | 7ce162a18ab641df7ab73f380557aad5aa64b24d |
| lighting-8 | Bubble Lamp | 3 | Art Attack | public/assets/catalog/lighting-8-w04-recovered-v2.jpg | 9073a049ec9116cf3e4408adf068be48f1ad00f1 |

Four display JPEGs total **224,811 bytes**. Four preserved source PNGs total **3,943,293 bytes**. This is a file-transfer measurement, not a phone-performance claim. Original path/hash/dimensions/provenance and each exact byte count are in `chat-lighting-recovery-result.json`.

## Execution evidence

GitHub Actions run **35665398592**, job **106549924161**, uses `.github/workflows/lighting-recovery-20260921.yml`. The completed import/publication steps establish that the files are repository-staged rather than local-only or unattached Git objects. Metadata is compared against the actual exported `store` from `src/gameModel.js`, including name, type, collection, tier, theme, price and star requirement.

The intake verifies supported image decode, square dimensions, nonconstant pixels, exact readback of all eight files, and four distinct candidate content hashes. Its second run verifies the existing bytes without downloading or regenerating them. It refuses conflicting destination bytes, a wrong branch, incorrect metadata or a force push.

**Use the executed outcome fields in `chat-lighting-recovery-result.json` and this run's actual steps/artifact for current test/build/render status.** Do not infer test or render PASS from this handoff's existence. The workflow reuses the existing `scripts/catalog-staged-art-qa.mjs`; it does not create a new renderer. The artifact `lighting-5-8-recovery-evidence` retains source files, candidates, report and real browser evidence.

## Pixel preflight and independent next step

The interactive chat inspected the four remote source images. Vine Light shows a physically grounded bronze vine with translucent leaves and small luminous nodes; Planet Lamp is a warm glowing globe with separated metal orbit rings; Sun Lamp has sculpted aqua glass rays and a reflective support; Bubble Lamp uses overlapping glass volumes with vivid colored swirls and a chrome pedestal. These observations are a preflight, **not independent exact-hash approval of the stored JPEG versions**.

14 should inspect the actual 600px candidate at card and detail scale beside the original Store reference, including category identity, theme clarity, materials, lighting, margins and near-duplicate checks. Inspect whether small luminous details survive card reduction and whether the Sun Lamp unmistakably reads as a lamp rather than a mirror. Do not transfer an old legacy REWORK decision to these replacement hashes, and do not automatically approve a photographically richer image merely because it is raster.

04 should reconcile its remote-only status to these actual stored paths, preserve the original generation IDs and avoid regenerating these four images. 08 may integrate only after a qualified independent ACCEPT and required mapping checks. This intake does not alter `catalog-art-manifest.json`, `src/catalogArtRuntime.js`, final labels, item IDs, prices, unlocks, player data, Replit, Floot or `main`.

The next transport batch is the existing **Lighting 9–12** generations already identified in lane-04, unless those files have since been staged. Check current paths before recovering; do not generate them again.
