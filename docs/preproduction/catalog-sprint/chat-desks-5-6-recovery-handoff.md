# Checkpoint — Desk 05–06 recovered and browser-verified

Status: **2 repository-staged candidates / 2 clean card-and-detail renders / independent visual acceptance pending**.
Original producer: **03**. Byte-transport/helper: **CHAT**. Independent visual reviewer: **05**. Canonical catalog writer: **08**.
Branch: `screenshot-match-preproduction` only. This is recovery of two existing generations, not two newly generated or final-approved items.

## Exact delivered artwork

The two Firefly generations previously remote-only in `lane-03.json` are now stored in versioned repository paths. Source PNGs and existing service JPEG renditions were copied without cropping, resizing, recompression, recoloring or regeneration.

| ID | Name | Tier / theme | Repository candidate | Git blob |
|---|---|---|---|---|
| desks-5 | Garden Book Desk | 2 / Pixel Party | public/assets/catalog/desks-5-w03-recovered-v2.jpg | 95fe65632e4f40b76b23cce30071ee2fdc5b4399 |
| desks-6 | Galaxy Gamer Setup | 2 / Berry Blast | public/assets/catalog/desks-6-w03-recovered-v2.jpg | 52df05265de236911927b904b07e68dac7a17828 |

Candidates: two 600×600 JPEGs, **86,526 bytes total** (51,545 and 34,981). Original 1024×1024 PNGs: **1,939,973 bytes total**, retained under `docs/preproduction/catalog-sprint/recovered-originals/desks-5-6-20260921/`. Exact file hashes, provenance and measurements are in `chat-desks-5-6-recovery-result.json`. These sizes are not phone-performance claims.

## Executed checks and immutable evidence

Workflow `.github/workflows/desks-recovery-5-6.yml`, run **35669227577**, job **106561715343**, concluded **SUCCESS**. Actual tested source/asset commit: **c37b2e46761cb38a4cd1ee22bd73f2687df0100c**.

- Authoritative exported Store metadata, including names, type/collection, tiers/themes, prices and unlocks: **PASS 2/2**.
- Original/candidate decode, nonblank-content and exact byte readback: **PASS 4/4**.
- Duplicate candidate content: **0**, with exact-content checks against other item files.
- Repeat intake: **PASS**, no re-download or regeneration.
- Full application regression suite: **PASS**, actually executed in the job.
- Production build: **PASS**, actually executed in the job.
- Scoped Desk image-only browser verification: **PASS 2/2**, one 200px-card contact sheet and two 800×800 detail captures; both images decode at 600×600 and opaqueFraction 1; **zero page/console/request errors**.
- Existing Lighting verifier default-contract compatibility: **PASS**, separately executed after the narrow parameterization.
- TypeScript typecheck: **NOT APPLICABLE**, no TypeScript application changes.
- Independent art acceptance / canonical Store wiring: **PENDING / NOT PERFORMED** by this helper.

Artifact **10670532506**, `desks-5-6-recovery-evidence`, ZIP SHA-256 **256584d73494b969d22165750f696b7c209f90ab9225e443b78e9c60459c7dc5**.

The interactive helper downloaded the artifact, verified its ZIP digest, all four stored asset hashes and all three screenshot hashes, then inspected the actual card contact sheet. Evidence paths:

- `artifacts/desks-5-6-recovery/report.json`
- `artifacts/desks-5-6-recovery/desks-5-6-card-contact-sheet.png`
- `artifacts/desks-5-6-recovery/desks-5-95fe6563-detail.png`
- `artifacts/desks-5-6-recovery/desks-6-52df0526-detail.png`

The pass reuses existing immutable intake primitives and the bounded image verifier; default Lighting behavior remains passing. It does not rewrite Workstream 14's shared renderer, suppress failed/blank-image assertions or touch canonical Store mappings. These image-only captures are not canonical Store or whole-catalog acceptance. Other Desk/shared-fixture failures remain separate and open.

## Visual concerns retained for independent review

Garden Book Desk has a dimensional warm-wood worktop, bookshelf, planter trough, articulated lamp and drawers. Galaxy Gamer Setup has a dark curved desk, galaxy monitor, controllers, speaker pair and orb lamp. The original user Store reference was also inspected.

Reviewer 05 must check **Pixel Party theme clarity** on Garden Book Desk and **small-card dark-detail readability / apparently floating headphone-like objects** on Galaxy Gamer Setup. The second image is noticeably darker at card scale. These are open visual concerns, not hidden or self-approved. Richer rendering and functional identity alone do not establish reference-quality acceptance.

03: reconcile remote-only flags to these exact stored versions; no duplicate generation/upload. Preserve Desk 2–4 versions and separate findings. Check assignments before the next genuinely missing Desk item.

05: review these exact hashes from the cited artifact and record ACCEPT/REWORK/BLOCKED in your sole-owned shard. Do not transfer old-version verdicts or count this helper preflight as independent approval.

14: discover these versioned paths or consume the exact-hash artifact. No new renderer is needed for their review. Do not relabel unrelated shared-fixture failures as resolved by this scoped run.

08: integrate only after qualified independent ACCEPT and normal checks. This pass adds **zero canonical promotions and zero final approvals**.

15: W03's byte-transfer blocker is cleared for Desk 5–6 only; independent quality approval is pending. Existing Lighting 9–12 and Shoes 1–6 were already staged by another worker and were not regenerated. Replit, Floot, main, player saves, economy and curriculum were untouched by this pass.
