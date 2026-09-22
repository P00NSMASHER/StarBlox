# Catalog Sprint — Workstream 10 Small-Card / Mobile Visual QA

STATUS: **PARTIAL — CURRENT EXACT-HASH STAGED ART CHECKED; MANIFEST-v23 RESPONSIVE STORE RERUN NOT TESTED**

Branch: `screenshot-match-preproduction`  
Audited coordination head before this report: `e11d4b4e2f379fc0e1e27090c56357ee9da24b69`  
Phase: `ART_VISUALS_SPRINT`  
Catalog gate: **NOT APPROVED by Workstream 10**  
Replit/Floot/main/deployment: **untouched**

## Change-aware decision

The canonical catalog advanced to manifest v23, so the prior Workstream-10 Store PASS cannot be generalized to the new asset hashes. I did **not** rerun the unchanged full 16-collection matrix. The next executable Store run should cover only changed collections **Desks + Auras** plus stable control **Tops** at `1408×1056`, `1024×768`, `390×844`, and `320×568`, in normal and reduced-motion modes.

A fresh actual-Store browser artifact for the manifest-v23 exact hashes was not available/executable in this cycle. Therefore the current canonical responsive Store checks are recorded as **NOT TESTED**, not PASS and not FAIL. Staged fixture evidence below is intentionally kept separate.

## Manifest v23 changed canonical art

Workstream 08 integrated seven independently accepted assets. Workstream 10 did not edit the manifest, runtime mapping, producer art, names, themes, tiers, prices, unlocks, ownership, economy, learning, persistence, or saves.

| Item | Exact Git blob | Size / format |
| --- | --- | --- |
| `desks-2` Cloud Study Desk | `277eb1e38e8a69caa0dab6d4d27bbb91796746f8` | 1024×1024 PNG |
| `desks-3` Pixel Mini Setup | `aeebeacdc4a95bf75af36583dae6e2391d9a1d9e` | 1024×1024 PNG |
| `desks-4` Berry Vanity Desk | `6f87e1527ec7d9bf1a3f81e1f54320f462dbb025` | 1024×1024 PNG |
| `auras-5` Garden Fireflies | `ae3bef6cbbf4333aa740dc9a3fddf4f2b5540192` | 600×600 JPEG |
| `auras-9` Art Confetti | `9331e516a7a1a2fa32abafaf3bbf0932c3ca792d` | 600×600 JPEG |
| `auras-10` Neon Trail | `6f07fe7f5c8be236f3c17df5f55afc550888f52e` | 600×600 JPEG |
| `auras-12` Luxe Starstorm | `d0fcf528ff4ee91e56760932fdcf357ab264dd3d` | 600×600 JPEG |

Canonical manifest v23 blob: `93fa3434711ddedd87ff8bdd00030f62b6b770b6`  
Canonical runtime blob: `6a407b95dc15e5de6046d335ecd3a12239833dba`

## Exact-hash staged fixture evidence

Artifact `10672639784`, source head `9cfe19679527bd0a3ace2d76d4a88967a65509a7`, contains the current seven exact hashes at card/detail scale. All seven target rows returned HTTP 200, produced screenshots, and had no target-item render errors.

Objective small-card observations:

- **Desks 2–4:** distinct silhouettes, centered presentation, recognizable identity, and no visible clipping in the preserved card/detail fixture.
- **Auras 5/9/10/12:** distinct motifs survive card reduction: firefly/foliage ring, confetti burst, flowing cyan ribbons, and star/crystal wreath respectively.
- The four current Aura assets are fully opaque JPEGs. Transparent-edge/alpha compositing is therefore **not exercised by these assets**. This is an informational limitation, not an automatic defect.

This artifact is **staged/exact-hash render evidence only**. It does not prove two-column 390/320 Store browsing, canonical crop/contain behavior, real detail-panel composition, fixed-HUD clearance, scrolling, layout stability, focus, or runtime loading in the actual Store.

## Current staged Tops 11–12 v5 — mobile visual signals

Producer 09 has two new exact v5 hashes staged for independent reviewer 01. Workstream 10 inspected the preserved card/detail renders but does **not** change their review status.

- `tops-11` Cloud Jacket — blob `43a850ecdc0b7e8861870f7c277f2544f6c87405` — exact staged render PASS. Identity and silhouette remain readable and unclipped, but padded/material richness weakens noticeably after card reduction. Structured signal: **`CARD_SCALE_PREMIUM_DEPTH_WEAK`**.
- `tops-12` Star Coat — blob `73339e6c9e472283f481ff18b1e6ba821856f617` — exact staged render PASS. At card scale the silhouette is readable as outerwear but still reads short-jacket/bomber-like rather than unmistakably coat-length. Structured signal: **`TIER5_COAT_LENGTH_AMBIGUOUS_AT_CARD_SCALE`**.

Evidence: staged-art workflow run `35681227316`, head `288103b2fae24862d8fe733d6b64964fc24d06d9`, artifact `10674362796`, digest `sha256:af564c231b473f2aa11628e8e8f672191cc84348221cdcd40495606415b946e7`. Both exact v5 items rendered cleanly; the workflow's overall failure was outside these two target rows. These signals are for reviewer 01 / producer 09 / coordinator 15 and are **not self-approval**.

## Reused browser proof — scope limited

The prior full Store matrix remains reusable only for unchanged responsive safeguards and unchanged hashes: run `35659760652`, job `106532044131`, artifact `10667595844`, source head `8a2c53aa2133baef23e263d8dda8b2a180dffe19`.

That historical headless-Chromium run covered all 16 collections at `1408×1056`, `1024×768`, `390×844`, and `320×568`, including two-column phone layout, keyboard/focus, no horizontal page overflow, full-scroll reachability, reduced motion, normal-motion controls, and scroll/layout probes. It is **not proof for the newly integrated manifest-v23 Desks/Auras hashes**.

## Current test status

| Check | Current manifest-v23 result |
| --- | --- |
| Exact-hash staged decode/render, 7 changed assets | **PASS 7/7** |
| Actual Store 1408×1056 | **NOT TESTED** |
| Actual Store 1024×768 | **NOT TESTED** |
| Actual Store 390×844 | **NOT TESTED** |
| Actual Store 320×568 | **NOT TESTED** |
| Current-hash two-column phone grid | **NOT TESTED** |
| Current-hash crop/contain + detail composition | **NOT TESTED** |
| Current-hash scrolling/layout stability | **NOT TESTED** |
| Current-hash normal/reduced-motion behavior | **NOT TESTED** |
| Measured rendered contrast | **NOT TESTED** |
| Physical iPhone/iPad/Android | **NOT TESTED** |
| VoiceOver/TalkBack/NVDA | **NOT TESTED** |

No UI patch was made to hide weak art or force a favorable screenshot.

## Reference screenshots

The stale “reference pixels missing” blocker is closed. The authoritative originals are present at:

- `docs/preproduction/reference-screenshots/originals/home-1448x1086.jpeg`
- `docs/preproduction/reference-screenshots/originals/store-1448x1086.jpeg`
- `docs/preproduction/reference-screenshots/originals/quest-1448x1086.jpeg`

Their verified manifest and uncropped comparison PNGs remain the reference source. Desktop originals are used for desktop comparison; tablet/phone are responsive usability targets, not invented exact-reference images.

## Handoff

**Reviewer 01 / Producer 09:** independently review the current Tops 11–12 v5 exact hashes. Workstream 10 specifically flags weak premium-depth survival on Tops 11 and coat-length ambiguity on Tops 12 at small-card scale. These are objective visual QA signals only and do not alter reviewer authority.

**Workstreams 08 / 15:** manifest-v23 Desks/Auras have clean exact-hash staged card/detail renders, but Workstream 10 still requires a fresh change-aware actual Store run at 1408/1024/390/320 before calling this canonical batch responsive PASS.

**Workstream 14:** artifact `10672639784` is reusable for exact-hash staged card/detail evidence, but not as responsive Store viewport proof.

No canonical mappings, producer art, shared UI, gameplay, learning, economy, persistence, real player data, Replit, Floot, `main`, or deployment state were changed by Workstream 10.
