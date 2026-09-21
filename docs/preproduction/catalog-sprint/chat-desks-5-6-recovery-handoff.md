# Desk 5–6 recovery — W03 transport handoff

Original producer: **03**. Byte-transport/helper: **CHAT**. Independent visual reviewer: **05**. Canonical catalog writer: **08**.
Branch: `screenshot-match-preproduction` only. This is a two-item recovery batch, not two new generations or final approvals.

The exact two Firefly generations listed as remote-only in `lane-03.json` are now stored in versioned repository paths. The requested central-helper transfer is complete. Source PNGs and the existing service JPEG renditions were copied without cropping, resizing, recompression, recoloring or regeneration.

| ID | Name | Tier / theme | Repository candidate | Git blob |
|---|---|---|---|---|
| desks-5 | Garden Book Desk | 2 / Pixel Party | public/assets/catalog/desks-5-w03-recovered-v2.jpg | 95fe65632e4f40b76b23cce30071ee2fdc5b4399 |
| desks-6 | Galaxy Gamer Setup | 2 / Berry Blast | public/assets/catalog/desks-6-w03-recovered-v2.jpg | 52df05265de236911927b904b07e68dac7a17828 |

Candidates: two 600×600 JPEGs, **86,526 bytes total**. Original 1024×1024 PNGs: **1,939,973 bytes total**, preserved under `docs/preproduction/catalog-sprint/recovered-originals/desks-5-6-20260921/`. Every exact file hash, source generation ID, dimensions and byte count are in `chat-desks-5-6-recovery-result.json`. These file sizes are not device-performance claims.

Metadata was checked against the actual `store` export from `src/gameModel.js`, including ID/name/type/collection/tier/theme/price/unlock. All four files passed decoding, nonblank-content checks and exact readback. A repeated intake revalidates stored files without requesting another download. Candidate content is distinct; the intake rejects exact content reused by another item and conflicting destination bytes.

## Executed evidence

Workflow: `.github/workflows/desks-recovery-5-6.yml`, run **35669227577**, job **106561715343**.

Use the actual `checks` and `renderEvidence` fields in `chat-desks-5-6-recovery-result.json` and workflow outcomes. The existence of this handoff is not a test/build/render PASS. Initial publication finished; final CI/browser verification was still running when this handoff was first written.

The pass reuses the existing immutable intake primitives and parameterizes the existing bounded image verifier for exactly Desk 5–6. Its default Lighting 5–8 contract is retained and tested for compatibility. It does not rewrite Workstream 14's shared renderer, change any blank-image assertion or touch canonical Store mappings. Scoped image-only captures are not proof of canonical Store integration or whole-catalog correctness.

## Pixel preflight — not independent acceptance

The interactive helper inspected both resolved Adobe renditions beside the original user Store reference. Garden Book Desk has a warm wood worktop, bookshelf, planter trough, articulated lamp, books and drawers. Galaxy Gamer Setup has a dark curved desk, galaxy monitor, controllers, speaker pair and orb lamp.

Reviewer 05 must specifically check **Pixel Party theme clarity** on Garden Book Desk and **small-card dark-detail readability / apparently floating headphone-like objects** on Galaxy Gamer Setup. These are open visual concerns, not hidden or self-approved. Functional object identity and richer rendering alone do not guarantee reference-quality acceptance.

03: reconcile the old remote-only flags to these exact stored versions; do not regenerate or reupload them. Preserve all Desk 2–4 files and their separate open issues. Resume the next truly missing Desk item only after checking current assignments.

05: judge the exact stored hashes using the scoped card/detail evidence. Record ACCEPT/REWORK/BLOCKED in your sole-owned shard. Do not transfer an old version's verdict or count this helper's preflight as independent approval.

14: the versioned Desk paths are discoverable by the existing file scanner. Consume the exact-hash evidence without another transport framework. Other failed shared-fixture/Desk checks remain separate and are not waived.

08: integrate only after qualified independent ACCEPT and all normal metadata/file checks. This intake changes **zero canonical mappings** and **zero final status labels**.

15: W03's remote-byte transfer blocker is cleared for Desk 5–6 only. Artwork quality and independent acceptance are still pending. Replit, Floot, main, player progress, economy and learning were not changed.
