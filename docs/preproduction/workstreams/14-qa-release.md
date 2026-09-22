# Workstream 14 — Visual Release QA

STATUS: **CATALOG_SPRINT / REVIEWER-14 LIGHTING 12/12 ACCEPT / WALL-RUGS-DECOR 36 REWORK / 180 OF 192 IDS INDEPENDENTLY DISPOSITIONED / CATALOG GATE FAIL**

Branch: `screenshot-match-preproduction` only  
Delivery policy: `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Replit/Floot: **untouched**  
Main: **not merged or modified**  
Real player data: **not used**

## Release decision

**READY FOR SINGLE REPLIT INTEGRATION: NO.**

This pass materially advanced Workstream 14's own partition. The exact current replacement hashes for **Lighting 9–12** were independently reviewed from real card/detail pixels and accepted, bringing Lighting to **12/12 current hashes ACCEPT**. Wall, Rugs and Decor remain **12/12 REWORK each** at their reviewed hashes. Workstream 14 therefore stands at **48 reviewed / 12 ACCEPT / 36 REWORK / 0 BLOCKED**.

The catalog is still the release-critical phase. Canonical manifest v16 has **27 exact accepted hashes wired**; current reviewer evidence establishes a conservative minimum of **35 qualified exact replacement ACCEPTs**, because Lighting 5–12 were accepted after that integration snapshot. This is not 35 release-cleared items: all 192 must ultimately be current-hash accepted, canonical, unique and Store-verified.

## Shared staged-art fixture and exact evidence

The existing Playwright/GitHub Actions staged-art fixture remains the single framework. It supports SVG/PNG/JPG/JPEG/WEBP, computes Git blob identity, renders card sheets plus 800×800 detail captures, rejects invalid/blank imagery and preserves compact workflow artifacts. No production Store wiring or Replit preview is required for candidate review.

For Lighting 9–12, the exact reusable evidence is:

- workflow run **35669695516** on `4ad15b615907c4a3b3180db127ae8cac4acb2e91`;
- artifact **10670588502**, digest `sha256:931d44eb5e0ca99b6046faca1dd7c395955e975143bd49392aaf8dc6d7d987f5`;
- Lighting set: **12/12 HTTP 200, decoded, opaque, screenshot captured, no item errors**;
- contact sheet SHA-256 `27135f72c3630586cf0527d14b34117747d7a584c0fcbfbf2e2dce2408dc235e`.

The overall workflow run was later cancelled after artifact publication because a newer run superseded it. That does **not** convert failed cross-partition Desk evidence to PASS; it also does not invalidate the already-complete, exact-hash Lighting subset. The artifact report is preserved and the four Lighting detail captures were independently inspected.

## Lighting 9–12 decisions

| ID | Exact current Git blob | Decision | Pixel finding |
|---|---|---|---|
| `lighting-9` Color Lamp | `d9a0e461a1a8ace589cf6be1ec93e61972ba7faf` | **ACCEPT** | Faceted translucent crystal shade, warm emitter, substantial metallic pedestal and rainbow dispersion read as physical Star Luxe lighting at card/detail scale. |
| `lighting-10` Neon Strip Tower | `e4ca304730d4c330711534c2c7c52da218c9acfa` | **ACCEPT** | Beveled dark chassis, embedded cyan/magenta strips and floor spill produce clear Tier-4 Midnight Neon depth. |
| `lighting-11` Aurora Light | `995b6ae729b3daa9e1199dd032b24e128db0b61b` | **ACCEPT** | Layered translucent aurora ribbons, warm core and metallic base provide distinct Candy Core material/light response. |
| `lighting-12` Crystal Chandelier | `ddb71949f485348a45e00c5105eb336ad55a010a` | **ACCEPT** | Suspended antique-gold arms, candle emitters, chain hierarchy and faceted crystals give unmistakable Tier-5 chandelier identity. |

All four pass identity, theme/tier, silhouette, material/light, card readability, originality and near-duplicate checks. Combined with prior Lighting 1–8 decisions, the current Lighting set has no identity-level near-duplicate collision. Exact decisions and screenshot hashes are in `catalog-sprint/reviews/14.json`.

## Cross-partition rendering boundary

Workstream 14 renders other producers' candidates but does not disposition their families. Reviewers 01/02/05 remain the only decision owners for those partitions.

The cited staged-art artifact rendered stale `desks-2..4-w03-v1.webp` paths and correctly found them unusable. **Do not transfer that verdict to current Desk hashes.** Current `lane-03.json` points at different exact Desk 2–4 versions, so those current hashes require a fresh shared-fixture render before reviewer 05 can decide. Desk 5–6 have separate clean scoped browser evidence and likewise remain reviewer-05 decisions.

Independent unique-ID review coverage therefore remains **180/192**, with Desk still the 12-ID coverage gap until current exact hashes receive usable rendered evidence and review.

## Canonical integration and automated safeguards

Current integration snapshot is manifest **v16**:

- target IDs: **192**;
- manifest/runtime mappings: **130**;
- `finalPortable`: **114**;
- interim-not-verified: **16**;
- non-final: **78**;
- exact accepted hashes canonically wired: **27**;
- duplicate canonical paths: **0**;
- duplicate canonical content hashes: **0**;
- runtime/manifest agreement: **PASS 130/130**.

The v16 integration ran full tests and production build successfully and passed strict catalog mobile QA in headless emulation. Latest reusable full CI run **35670445113** on `aee2bfdcf63c23e4775b7c8ed93e0a8bc752ee30` also completed **SUCCESS**. This Workstream-14 review update changes documentation/decisions only, so unchanged runtime/build proof is reused rather than launching another redundant heavy suite.

The earlier `beds-1` metadata mismatch is **resolved**; do not carry that stale blocker forward.

## Reference fidelity

Authoritative Home/Store/Quest original pixels are repository-accessible and verified. Missing-reference is no longer a blocker. A fresh deterministic reference-capture run **35670445111** passed reference-input verification and production build and was actively capturing Home/Store/Quest at this audit checkpoint.

Reference parity remains **NOT TESTED / NOT CLEARED** until that run completes and its artifacts are inspected. A raw pixel-diff status is diagnostic only; it cannot by itself prove visual acceptance. No tablet/phone originals exist, so responsive layouts are judged for usability/composition rather than invented pixel parity.

## Other retained release evidence

- Real-browser persistence/economy matrix: **PASS**, synthetic profiles only, no real player data.
- Latest catalog-induced learning P0 check: **PASS / none found** in current executed CI.
- Physical-device performance: **NOT TESTED**.
- VoiceOver/TalkBack/NVDA smoke: **NOT TESTED**.
- Final 192-item exact-content duplicate scan: **NOT TESTED — final accepted set incomplete**.
- Final rendered near-duplicate review: **NOT TESTED — final accepted set incomplete**.
- Home structural geometry: retain **PASS** unless new evidence reopens it.
- Store 4 / Quest 6 geometry backlog remains deferred to GAME_FINISHING and does not block catalog completion.

## Exact current blockers / handoff

1. **08 — Lighting integration:** consume exact ACCEPTs for Lighting 5–12 after normal metadata/file/content checks; preserve Lighting 1–4 and all other accepted canonical mappings.
2. **03 / 14 / 05 — Desk evidence:** render the current exact Desk 2–4 paths through the existing shared fixture and let reviewer 05 decide; do not reuse the stale-path failure. Continue current Desk candidates without weakening blank/signature checks.
3. **05 — Wall production:** Wall 1–12 remain REWORK and need physical mounted-object replacements.
4. **07 — Rugs production:** Rugs 1–12 remain REWORK and must read as floor textiles with perspective/pile/edge/contact.
5. **09 — Decor production:** Decor 1–12 remain REWORK and need dimensional product/object replacements.
6. **14 — reference QA:** inspect fresh Home/Store/Quest capture artifacts when complete; report region-level differences and keep raw diff separate from visual approval.
7. **15 — phase:** remain in `CATALOG_SPRINT` until 192/192 current hashes are stored, correct, unique, independently accepted, canonical and Store-verified.

**Catalog gate remains FAIL. Art progress is material, but it is not deployment permission. Replit/Floot/main remain untouched.**
