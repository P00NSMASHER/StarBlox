# Catalog / Visual Release QA — Workstream 14

**Status: FAIL — CATALOG / ART-VISUALS NOT RELEASE READY**

Branch: `screenshot-match-preproduction` only  
Audited through head: `0f6b6ee3a62ef275ea91ebc6bf2bf01e89f5fb28`  
Policy: `ART_VISUALS_SPRINT.json` + compatible `DELIVERY_PROTOCOL_V2.md` safeguards  
Replit/Floot/main/deploy: **untouched**  
Real player data: **not used**

## Current gate

The catalog remains the critical path. Manifest **v17** contains **138** manifest/runtime mappings, **122** `final-portable`, **16** interim-not-verified and **70** non-final entries. Canonical path uniqueness, content-hash uniqueness and runtime/manifest agreement are **PASS (138/138)**. Workstream 08 has canonically wired a conservative **35 independently accepted exact hashes**.

All 192 IDs are **not** yet current-hash accepted and canonical, so the catalog release gate remains **FAIL**.

## Workstream 14 independent review

Current partition result: **48/48 dispositioned — 22 ACCEPT / 26 REWORK / 0 BLOCKED**.

- Lighting: **12/12 ACCEPT**
- Wall: **0/12 ACCEPT; 12 REWORK**
- Rugs: **8/12 ACCEPT; Rugs 9–12 REWORK**
- Decor: **2/12 ACCEPT; Decor 3–12 REWORK**

New exact-hash accepts in this cycle:

| IDs | Exact replacement paths | Result |
|---|---|---|
| Rugs 1–4 | `rugs-1..4-w07-v2.jpg` | **ACCEPT 4/4** |
| Rugs 5–8 | `rugs-5..8-w07-v2.jpg` | **ACCEPT 4/4** |
| Decor 1–2 | `decor-1..2-w09-v2.jpg` | **ACCEPT 2/2** |

The decisions are hash-bound in `catalog-sprint/reviews/14.json`. Acceptance was based on actual card and 800×800 detail pixels, exact ID/name/tier/theme, silhouette, physical material/light response, small-card readability, originality and visual duplicate checks—not on source validity or “no clipping”.

Primary preserved review artifact: workflow **35671542628**, artifact **10671346458**, digest `sha256:fae4585a8bfa051389ecdffa2e3c983cac4bf7be98677a2a8c7d1e57f1e4827e`. Its staged-replacement contact sheet is SHA-256 `8782be685e0984b767e806edba445f5f1fd57e4d7ebfc1bc68afaba03faa075e`.

The accepted Rugs are visibly distinct floor textiles: woven/bound starter mat, cloud tufting, pixel-grid pile, neon heart, leaf construction, orbital stitched map, raised Cloud Pop checker and asymmetric Pixel Party wave. Decor 1–2 are dimensional physical objects: a slatted/metal-corner book crate with restrained neon lighting and a mounted layered cloud shelf with real projection, brackets and cast wall shadow.

## Shared staged-art fixture

Workstream 14 continues to own the single Playwright/GitHub Actions fixture. No second framework or production preview was created.

The fixture already discovers branch-staged versioned catalog replacements in SVG/PNG/JPG/JPEG/WEBP and binds each card/detail render to the computed Git blob hash. Current preserved artifacts prove dynamic discovery of cross-partition replacements including Headwear 1–4; reviewer 14 does **not** disposition those families.

Two narrow fixture repairs were made:

1. `e1ed7fec6ca78c964723261f9d569e5b20fb6d7d` — authoritative lane-declared staged bindings may no longer silently fall back to older versioned files when the current bytes are invalid.
2. `f15ae12806627976a67ccd63be1371542039bcd9` — visual discovery now recursively includes every branch-stored `public/assets/visuals/**` candidate declared in lane 13, including nested `parallelCandidates` such as the new Quest environment, rather than only the top-level Home asset list.

Post-fix execution artifacts for those two fixture changes are still **PENDING**; commit existence alone is not converted to PASS.

### Desk blocker exposed by the fixture

Reviewer-05 Desk 2–4 evidence remains blocked for a concrete reason. The authoritative current lane paths:

- `desks-2-v1.webp` — blob `357f4ba8385e737499f12409c0bea141f9bc5e6a`
- `desks-3-v1.webp` — blob `b3352961988d7e9c5ff48d1559fc4d2296d4eab3`
- `desks-4-v1.webp` — blob `711feeb78e6d08351fc2fd2d3176ddb1a288e8f2`

do **not** have valid WebP signatures. Older `-w03-v1.webp` files are stale and decode/paint unusably; they are not substitutes for the current hashes. Reviewer 05 therefore needs newly restaged valid bytes before disposition.

## Tests / build / Store evidence

Runtime/assets advanced to manifest v17 through Workstream 08. That integration ran the full npm test workflow and Vite production build successfully. The Rugs 5–8 and Decor 1–2 recovery workflows also passed their scoped metadata/readback/decode checks, tests and production builds.

The **v17 post-integration desktop/phone Store art smoke remains NOT TESTED / pending**. The earlier v16 Store/mobile result is useful history but is not silently promoted to proof for v17.

No redundant heavy suite was started merely for Workstream-14 documentation/review writes.

## Original reference screenshots

The stale “original pixels missing” blocker remains **closed**. Immutable Home/Store/Quest originals and their verified hashes are present under `docs/preproduction/reference-screenshots/originals/`.

Attempted deterministic comparison run **35670445111** verified the reference inputs and completed the production build, but was **cancelled during screenshot capture** and has no reusable artifact. Therefore:

- original pixels accessible: **PASS**
- current exact Home/Store/Quest reference comparison: **NOT TESTED**
- raw pixel diff as visual approval: **prohibited**
- mobile/tablet pixel parity: **NOT APPLICABLE — no originals supplied**

A completed capture must be produced on the exact current candidate runtime/assets and reviewed side-by-side with region-level observations. Real state/content differences and safety substitutions must remain explicit.

## Exact blockers

1. 192/192 current final hashes are not yet independently accepted and canonically wired.
2. Wall 1–12, Rugs 9–12 and Decor 3–12 remain reviewer-14 REWORK.
3. Desk 2–4 current authoritative files fail WebP signature validation; reviewer 05 cannot disposition them until valid exact bytes are staged/rendered.
4. Manifest-v17 desktop/phone Store visual smoke is still pending.
5. Final accepted-set exact-content and rendered near-duplicate audits are incomplete.
6. Current-head Home/Store/Quest reference capture + region-level review is incomplete.
7. Physical-device performance and VoiceOver/TalkBack/NVDA remain **NOT TESTED** release gates.

Home structural PASS remains preserved unless new evidence reopens it. Store 4 / Quest 6 geometry work remains a post-catalog ART/VISUALS finishing backlog and is not being used to block catalog production.

**ART_VISUALS_COMPLETE: NO. Deployment permission: NO.**
