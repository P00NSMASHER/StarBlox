# Workstream 14 — Visual QA / Release Gate

**Phase: ART_VISUALS_SPRINT / CATALOG_SPRINT**  
**Gate: FAIL — not ready for deployment or single Replit integration**  
Branch: `screenshot-match-preproduction` only  
Audited through: `8b636f60f448f20678f9fa5cdeb21c5d9e90cfec`

Replit/Floot/main/deploy/paid settings: **untouched**. Real player data: **not used**.

## What changed this cycle

Workstream 14 performed actual pixel review, fixed two shared-fixture selection defects, and reconciled release status to the current manifest-v17 state. No unrelated feature/learning/persistence development was performed.

### Independent reviewer-14 partition

Current exact disposition is:

- **Lighting:** 12 ACCEPT / 0 REWORK
- **Wall:** 0 ACCEPT / 12 REWORK
- **Rugs:** 8 ACCEPT / 4 REWORK
- **Decor:** 2 ACCEPT / 10 REWORK
- **Total:** **22 ACCEPT / 26 REWORK / 0 BLOCKED, 48/48 dispositioned**

New accepts are hash-bound in `docs/preproduction/catalog-sprint/reviews/14.json`.

#### Rugs 1–8

| ID | Current Git blob | Decision | Pixel finding |
|---|---|---|---|
| rugs-1 | `5e00d1456fa21af74de75e583c69de48c9f2ecd2` | **ACCEPT** | Low woven Aqua Wave starter mat; bound edge, backing thickness and floor contact are visible. |
| rugs-2 | `578caf5cc81998d6c7563082892e468fc9186eec` | **ACCEPT** | Plush cloud silhouette with stitched perimeter and grounded low profile; readable as a novelty floor textile. |
| rugs-3 | `0c3b62a84182cd8e7fc3b8dc57f9b1015e54e920` | **ACCEPT** | Tufted pixel grid, cyan blocks and restrained gold-star detail with bound edge/backing. |
| rugs-4 | `d2c1a712dc530cec13ce72100657714900134ce2` | **ACCEPT** | Thick heart rug with layered pile and cyan/magenta Midnight Neon piping. |
| rugs-5 | `5a513011856679060df10137eae9f380377f5d78` | **ACCEPT** | Leaf-shaped plush rug; raised veins, candy palette, visible stitched edge and contact shadow. |
| rugs-6 | `cb96e0d40e0682770e79ef8ce6a1a86ecec3127f` | **ACCEPT** | Round orbital map rug with deep tufted border, stitched paths and gold exploration motifs. |
| rugs-7 | `184232121c9cd07c65fe1138893132ee0daa3fb3` | **ACCEPT** | Raised Cloud Pop checker pile, stitched binding and low grounded perspective. |
| rugs-8 | `efe9bb6e887375a7e6ed74b15222391a1e2434bf` | **ACCEPT** | Asymmetric cyan/violet wave rug with stepped pixel bars, ribbed edge and visible thickness. |

Rugs 9–12 remain **REWORK** on their prior reviewed legacy hashes and require new versioned premium replacements.

#### Decor 1–2

| ID | Current Git blob | Decision | Pixel finding |
|---|---|---|---|
| decor-1 | `7e0bad0b6f1dda6068c17109757c396de860892a` | **ACCEPT** | Real slatted wood crate, deep book volume, metal corners and restrained cyan/magenta edge light. |
| decor-2 | `d5377bda54cba2071819da60bf4f4d4c52e393a6` | **ACCEPT** | Layered cloud wall body, projecting shelf, brackets/mount points and cast wall shadow. |

Decor 3–12 remain **REWORK** on their current reviewed hashes.

### Exact visual evidence

Primary mixed-batch review evidence:

- workflow run: **35671542628**
- workflow head: `8d7db7286346a72932bc7ee7c56953eda5e5cd48`
- artifact: **10671346458**
- artifact digest: `sha256:fae4585a8bfa051389ecdffa2e3c983cac4bf7be98677a2a8c7d1e57f1e4827e`
- report SHA-256: `639a367eb0c5d02bba8d70c1733e498a08f9a4dbb55a76c88d5235182d9366d0`
- staged-replacement contact sheet SHA-256: `8782be685e0984b767e806edba445f5f1fd57e4d7ebfc1bc68afaba03faa075e`

All ten newly accepted items were inspected at contact-sheet card scale and 800×800 detail scale. Exact-content duplicate groups for the staged replacement set were empty. A reviewer-side 256-bit dHash sanity check across the 22 accepted Lighting/Rugs/Decor detail renders found **no hash collisions**; the nearest pair still differed by 63/256 bits. That heuristic is triage only; human near-duplicate/identity review remains authoritative and found no accepted-item identity collision.

## Shared staged-art fixture

The existing Playwright/GitHub Actions fixture remains the one shared framework. It supports SVG/PNG/JPG/JPEG/WEBP, records computed Git blob identity, creates card contact sheets and 800×800 detail captures, checks decode/opacity, and preserves compact artifacts.

### Fix 1 — authoritative current binding wins over stale alternate

Commit `e1ed7fec6ca78c964723261f9d569e5b20fb6d7d`.

Before this change, if a lane-declared current replacement had bad bytes, the generic versioned-file scan could choose an older valid-signature file for the same ID. That made stale art appear in the current review sheet.

The selector now treats a lane-declared `READY_FOR_REVIEW` / staged binding as authoritative. If those bytes fail signature/decode, that ID blocks instead of silently substituting an older version.

**Execution artifact after this exact fix: PENDING.** The code change is not being counted as an executed PASS until a post-fix artifact is preserved.

### Desk 2–4 blocker clarified

The actual current lane-03 paths are:

- `public/assets/catalog/desks-2-v1.webp` — `357f4ba8385e737499f12409c0bea141f9bc5e6a`
- `public/assets/catalog/desks-3-v1.webp` — `b3352961988d7e9c5ff48d1559fc4d2296d4eab3`
- `public/assets/catalog/desks-4-v1.webp` — `711feeb78e6d08351fc2fd2d3176ddb1a288e8f2`

Their file bytes do **not** begin with valid RIFF/WEBP signatures. Older `desks-2..4-w03-v1.webp` files are stale and also fail actual browser rendering. Reviewer 05 must not transfer a verdict across these hashes. Workstream 03/15 must restage genuinely valid current image bytes, then the shared fixture can render and reviewer 05 can decide.

### Fix 2 — nested lane-13 scene/character candidates

Commit `f15ae12806627976a67ccd63be1371542039bcd9`.

The fixture previously rendered only `lane-13.json -> assets[]`, which covered the Home environment but missed newly staged candidates stored in `parallelCandidates`, including the Quest environment.

The same fixture now recursively discovers and deduplicates every existing `public/assets/visuals/**` path declared anywhere in lane 13. This keeps Home plus new Quest/scene/character visual candidates in the same hash-bound render path without a second framework.

**Post-fix Home/Quest visual artifact: PENDING.** Scene/screen composition is therefore not marked accepted from source notes alone.

### Cross-partition boundary

The fixture already proved automatic discovery/rendering of current Headwear 1–4 replacement JPGs in preserved artifacts. Reviewer 01, not reviewer 14, owns those item decisions. Reviewer 14 will judge scene/screen composition after the exact scene pixels are rendered; reviewer 01 retains art-direction/scene-art authority.

## Canonical integration state

Workstream 08 advanced the canonical catalog to **manifest v17**:

- catalog target: 192 IDs
- manifest/runtime mappings: **138 / 138**
- `final-portable`: **122**
- interim-not-verified: **16**
- non-final: **70**
- duplicate canonical asset paths: **0**
- duplicate canonical content hashes: **0**
- runtime/manifest agreement: **PASS 138/138**
- independently accepted exact hashes already canonical: conservative **35**

Lighting 5–12 are now consumed in v17. The newly accepted Rugs 1–8 and Decor 1–2 are **not** counted as canonical until Workstream 08 independently performs its metadata/file/content checks and integrates their exact hashes.

## Automated evidence

- Manifest-v17 integration tests: **PASS — full npm test workflow**
- Manifest-v17 production build: **PASS — Vite production build**
- Rugs 5–8 recovery metadata/readback/decode/tests/build: **PASS** in run **35671441228**
- Decor 1–2 recovery metadata/readback/decode/tests/build: **PASS** in run **35671542628**
- Catalog-induced safety/learning P0 in executed v17 checks: **none observed**
- Manifest-v17 desktop/phone Store visual smoke: **NOT TESTED / pending**
- Physical-device visual/performance gate: **NOT TESTED**
- VoiceOver/TalkBack/NVDA release gate: **NOT TESTED**

No redundant full CI was launched for review/documentation-only commits.

## Original reference QA

The original Home/Store/Quest screenshots are present and hash-verified. The stale “reference pixels unavailable” blocker remains removed.

Run **35670445111** passed reference-input verification and the production build but was **cancelled during deterministic screenshot capture**. It has no reusable artifact. Therefore exact reference comparison remains **NOT TESTED**.

Rules retained:

- originals remain unmodified;
- raw pixel diff is diagnostic only;
- no static screenshot overlays or hidden controls;
- real balance/learning-content differences and safety substitutions must be disclosed rather than faked;
- no mobile/tablet pixel-identical claims because no mobile/tablet originals were supplied.

The next acceptable proof is one completed deterministic capture of the exact current candidate runtime/assets, followed by side-by-side and region-level visual observations.

## Release blockers

1. **Catalog completeness:** 192/192 current hashes are not independently accepted + canonical.
2. **Reviewer-14 production backlog:** Wall 1–12, Rugs 9–12, Decor 3–12 still need replacement art.
3. **Desk evidence:** Desk 2–4 current bytes fail WebP signature validation; reviewer-05 disposition is blocked until valid current bytes are restaged/rendered.
4. **Canonical follow-through:** Rugs 1–8 and Decor 1–2 exact ACCEPTs need Workstream-08 integration checks.
5. **Store visual safeguard:** v17 desktop/phone Store art smoke is pending.
6. **Final duplicate gate:** complete accepted-set exact-content + rendered near-duplicate audit cannot finish before all 192 current final hashes exist.
7. **Reference fidelity:** no completed exact-current Home/Store/Quest capture artifact yet.
8. **Deferred nonvisual release checks:** physical-device performance and screen-reader smoke remain unresolved.

Home structural geometry retains prior **PASS** unless new evidence reopens it. Store 4 / Quest 6 measured geometry blockers remain an ART/VISUALS finishing backlog after catalog clearance; they do not block catalog production.

## Handoff

- **08:** integrate Rugs 1–8 and Decor 1–2 only by the accepted exact hashes after metadata/file/content checks; run affected Store visual safeguards.
- **03 / 15:** repair current Desk 2–4 bytes; do not use stale `-w03-v1` art as review evidence.
- **05:** continue Wall replacement production; independently review valid Desk hashes once rendered.
- **07:** preserve accepted Rugs 1–8; continue only Rugs 9–12 replacement work.
- **09:** preserve accepted Decor 1–2; continue Decor 3–12 in bounded premium batches.
- **10 / 14:** obtain a completed current-head deterministic Home/Store/Quest capture and review region-level composition/reference differences.
- **15:** alone controls phase/readiness; remain in ART_VISUALS/CATALOG until the actual gates clear.

**ART_VISUALS_COMPLETE = NO. No deployment permission exists.**
