# Catalog Sprint — Workstream 14 Release QA

STATUS: **FAIL — CATALOG NOT RELEASE READY**

Branch: `screenshot-match-preproduction` only. Replit/Floot untouched. `main` unmodified. No real player data used.

## Material progress

Workstream 14 has now independently accepted the exact current replacement hashes for **Lighting 1–12**. Lighting 9–12 were reviewed from the existing shared staged-art Playwright artifact rather than promoted into the Store first. The four exact current hashes are:

- `lighting-9` → `d9a0e461a1a8ace589cf6be1ec93e61972ba7faf`
- `lighting-10` → `e4ca304730d4c330711534c2c7c52da218c9acfa`
- `lighting-11` → `995b6ae729b3daa9e1199dd032b24e128db0b61b`
- `lighting-12` → `ddb71949f485348a45e00c5105eb336ad55a010a`

Evidence is workflow run **35669695516**, artifact **10670588502**, digest `sha256:931d44eb5e0ca99b6046faca1dd7c395955e975143bd49392aaf8dc6d7d987f5`. The Lighting set rendered **12/12** with HTTP 200, successful decode, opaque pixels, screenshots and no item-level browser errors. Exact paths and screenshot hashes are recorded in `reviews/14.json`.

The full Workstream-14 partition is now **48 reviewed / 12 ACCEPT / 36 REWORK / 0 BLOCKED**:

- Lighting: **12/12 ACCEPT** current replacement hashes;
- Wall: **12/12 REWORK**;
- Rugs: **12/12 REWORK**;
- Decor: **12/12 REWORK**.

No identity-level near-duplicate collision was found in the current Lighting set. Wall/Rug/Decor template similarity remains a quality defect rather than exact duplicate content.

## Shared fixture boundary

The existing staged-art Playwright/GitHub Actions path remains the single candidate-render framework. It supports versioned SVG/PNG/JPG/JPEG/WEBP, computes exact Git blob hashes, produces card sheets and 800×800 detail captures, and rejects bad signatures or visually blank payloads. No second orchestration framework or Replit preview was introduced.

The cited artifact also rendered cross-partition producer candidates, but Workstream 14 did **not** disposition those families. Reviewer 01/02/05 authority remains unchanged.

The artifact selected stale `desks-2..4-w03-v1.webp` paths. Current `lane-03.json` now points at different exact Desk 2–4 hashes, so the old failure **must not transfer across hashes**. Current Desk 2–4 need a fresh shared-fixture render before reviewer 05 can decide. Desk 5–6 have separate clean browser evidence and remain reviewer-05 decisions.

## Canonical integration / CI

Current canonical integration snapshot is manifest **v16**:

- target Store IDs: **192**;
- manifest/runtime mappings: **130**;
- `finalPortable`: **114**;
- interim-not-verified: **16**;
- non-final: **78**;
- accepted exact hashes canonically wired: **27**;
- duplicate canonical paths: **0**;
- duplicate canonical content hashes: **0**;
- runtime/manifest agreement: **PASS 130/130**.

Manifest v16 passed full tests, production build and strict catalog mobile QA in headless emulation. Latest reusable full CI run **35670445113** on `aee2bfdcf63c23e4775b7c8ed93e0a8bc752ee30` also completed **SUCCESS**. The earlier `beds-1` metadata mismatch is resolved and is no longer a blocker.

Current reviewer evidence establishes a conservative minimum of **35 qualified exact replacement ACCEPTs**: 27 are already wired in manifest v16, and Lighting 5–12 supply eight later reviewer-14 accepts not present in that integration snapshot. This is still far short of the required 192 current accepted/wired hashes.

## Reference QA

Authoritative original Home/Store/Quest pixels are repository-accessible and verified. The missing-reference blocker is closed. A fresh deterministic reference capture, run **35670445111**, passed reference input verification and production build and was actively capturing Home/Store/Quest at this audit checkpoint.

Actual reference parity remains **NOT TESTED / NOT CLEARED** until that artifact completes and is inspected. Raw pixel-diff status is diagnostic only and cannot independently establish visual approval. No phone/tablet original reference images were supplied; responsive mobile/tablet checks must not invent pixel targets.

## Other retained gates

- Independent unique-ID review coverage: **180/192**; Desk remains the 12-ID coverage gap.
- Real-browser persistence/economy: **PASS** using synthetic profiles only.
- Catalog-induced learning P0: **PASS — none found in latest executed CI**.
- Physical-device performance: **NOT TESTED**.
- VoiceOver/TalkBack/NVDA smoke: **NOT TESTED**.
- Final 192-item exact-content duplicate scan: **NOT TESTED — accepted set incomplete**.
- Final rendered near-duplicate scan: **NOT TESTED — accepted set incomplete**.
- Home structural geometry remains **PASS** unless new evidence reopens it.
- Store 4 / Quest 6 geometry backlog remains GAME_FINISHING work, not a catalog-completion prerequisite.

## Current blockers

1. All **192** current final asset hashes are not yet independently accepted and canonically wired.
2. Wall 1–12, Rugs 1–12 and Decor 1–12 remain REWORK and need new versioned premium replacements.
3. Desk remains the independent-review coverage gap; current exact Desk 2–4 hashes need a fresh shared-fixture render before reviewer 05 can disposition them.
4. Lighting 5–12 are independently accepted and need Workstream 08 integration if a newer canonical batch has not already consumed them.
5. The eventual complete accepted set still needs full exact-content and rendered near-duplicate review plus final integrated Store/mobile verification.
6. Fresh reference comparison is running but not yet a PASS.
7. Physical-device performance and real screen-reader smoke remain NOT TESTED.

**READY FOR SINGLE REPLIT INTEGRATION: NO. Catalog gate remains FAIL.**
