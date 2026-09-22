# Workstream 02 — Current Gear & Seating Review Evidence

STATUS: **EVIDENCE AUDIT ONLY — NO NEW ACCEPT/REWORK LABEL THIS PASS**

Branch: `screenshot-match-preproduction` only  
Independent review partition: Shoes / Backgear / Handgear / Seating  
Authoritative structured decisions: `docs/preproduction/catalog-sprint/reviews/02.json`  
Canonical integrator: Workstream 08  
Shared-entrypoint / cross-lane coordinator: Workstream 15  
Replit/Floot, `main`, gameplay, curriculum, economy, persistence, player data, deployment, purchases, paid settings, secrets and regression gates: **untouched**

## Current audit at observed branch head

Observed source head before this audit write: `4de3cedcb98dceb89b6d73ff73129f576e13a888`.

No new in-partition producer candidate was eligible for a fresh `ACCEPT` or `REWORK`. The governing rule remains: an item-level decision requires the exact current candidate hash plus real card-scale and detail-scale render proof for those same bytes. Missing or mismatched proof is `BLOCKED_EVIDENCE_NOT_DECISION`, never a quality rejection.

### Shoes

The current reviewed PNG candidates for Shoes 7–10 still read back at the exact hashes already ACCEPTED in `reviews/02.json` schema 9:

| Item | Reviewed candidate | Current Git blob | Current disposition |
| --- | --- | --- | --- |
| `shoes-7` Chunky Sneakers | `/assets/catalog/shoes-7-w06-v3.png` | `cb8f02aaa4844d1a19a013edc3d0d1a15c0620a2` | preserve existing ACCEPT |
| `shoes-8` Trainers | `/assets/catalog/shoes-8-w06-v3.png` | `1aa21e1156f7645fc218402c337d2eebe95d81f8` | preserve existing ACCEPT |
| `shoes-9` Paint Kicks | `/assets/catalog/shoes-9-w06-v3.png` | `ff5e914eb935194a1541cebf5421264e5da2d543` | preserve existing ACCEPT |
| `shoes-10` Light Shoes | `/assets/catalog/shoes-10-w06-v3.png` | `489e37f25644d13a4ca9518f4047ebfb35747a47` | preserve existing ACCEPT |

Later-added `.webp` derivative paths are different bytes and are **not** independently relabeled by reviewer 02 merely because they exist. A derivative or canonical-format change only inherits a reviewer decision when the governing evidence explicitly binds that exact hash; otherwise 08 must preserve the accepted candidate binding or obtain exact-current proof before treating changed bytes as accepted.

No current Shoes 11–12 candidate with qualifying exact-hash card/detail proof surfaced in this audit.

### Seating

The stale historical text below predates later independent reviewer decisions. The authoritative `reviews/02.json` shard chain preserves the accepted current Seating decisions, including Seating 1, 4, 5, 6, 11 and 12. Reviewer 02 does not reopen or churn those accepted hashes without a newer exact candidate plus fresh matching card/detail evidence. No newer qualifying Seating candidate surfaced in this audit.

### Backgear / Handgear

No newer exact-hash Backgear or Handgear candidate with real card/detail proof surfaced. No label was emitted.

## Review learner gate and collection recipes

Every future decision must bind candidate provenance, exact Git blob identity, current item metadata, real card-scale pixels, real detail-scale pixels, the original Store reference, and the structured fields `physicalConstruction`, `silhouette`, `materialLighting`, `themeTierSpecificity`, `smallCardReadability`, `originalityNearDuplicateRisk`, and `technicalIntegrity`.

- **Shoes:** outsole/midsole/upper/tongue/laces-or-straps/seams must read as physically joined footwear; paired shoes need coherent but not sticker-duplicated construction; contact/sole shadow and material separation should survive card size; tier progression must come from topology/material/detail, not hue alone; reject near-duplicate silhouettes even when palettes differ.
- **Backgear:** straps/harness/anchor/wing-root/tank-frame attachment logic must be physically plausible; foreground/background layers need depth; material and cast/contact lighting must separate surfaces; the back-mounted silhouette must survive card size; no floating emblem/icon treatment; higher tiers need geometry/material escalation rather than recolor.
- **Handgear:** grip point, handle/shaft and head must visibly connect; guards/ribbons/ornaments must be physically integrated; material response and cast light should distinguish parts; tier growth should add topology/detail; grip-to-head silhouette must remain legible at card scale; avoid same-wand/staff renders with palette swaps.
- **Seating:** seat/back/base/legs-or-pedestal must form a plausible load path; cushions, seams, tufting, wood, metal or hard-shell construction should be dimensional; occupancy/contact logic and cast shadow should ground the object; theme/tier specificity must be expressed through geometry/materials; card silhouette must remain distinct from neighboring chairs.

## Handoff

**08:** there is **no new ACCEPT** and no new canonical mapping request from reviewer 02 in this audit. Preserve the existing exact-hash ACCEPT bindings. Do not infer acceptance for a different derivative hash without matching evidence.  
**15:** no shared-entrypoint change is requested. Continue coordinating candidate/render ownership.  
**Producers:** surface only current exact-hash candidates with real card/detail proof; do not regenerate accepted art to create work.

---

## Archived prior lane snapshot — historical only

The material below is preserved verbatim as prior producer/reviewer evidence. Its status lines are **not** the current reviewer state; current decisions are governed by `reviews/02.json` and the audit above.

# Catalog Sprint Lane 02 — Beds + Independent Shoes/Backgear/Handgear/Seating Review

STATUS: **SEATING 11–12 CURRENT VERSIONS BLOCKED ON EVIDENCE INTEGRITY / SEATING 4–6 EXACT BYTES STAGED WITH RENDER WORKFLOW IN PROGRESS / BEDS 1–4 READY FOR REVIEW 05**

Branch: `screenshot-match-preproduction` only  
Producer: Workstream 02 (`beds-1..12` only)  
Independent review partition: Shoes / Backgear / Handgear / Seating  
Bed independent reviewer: Workstream 05  
Canonical integrator: Workstream 08  
Replit/Floot, `main`, gameplay, curriculum, economy, player data, deployment: **untouched**

## Reference and metadata contract

The visual target remains the hash-verified original Store screenshot at `docs/preproduction/reference-screenshots/originals/store-1448x1086.jpeg` (`sha256:b26cb14947d85258bcfff211174e54f34f2e2a11b83c73560b2365167071071d`) plus `original-reference-manifest.json`. Authoritative item metadata comes from `src/gameModel.js`; do not alter metadata to fit artwork.

For Beds, the authoritative sequence is: Starter Bed / Garden Glow, Cloud Bed / Galaxy Glow, Pixel Bunk / Sunny Pop, Berry Daybed / Aqua Wave, Garden Canopy / Art Attack, Galaxy Gamer Bed / Star Luxe, Sunny Loft Bed / Midnight Neon, Aqua Bubble Bed / Candy Core, Art Studio Bed / Adventure Club, Neon Pod Bed / Cloud Pop, Dream Princess Loft / Pixel Party, Luxe Star Canopy / Berry Blast. The historical `beds-1` Aqua Wave mismatch is not repeated here: `beds-1` remains **Garden Glow**.

## Independent review state

Fresh exact-hash **ACCEPT** remains valid for Shoes 1–6 and Seating 2–3 / 7–10. Those accepted bytes stay frozen; no accepted art was regenerated.

### Seating 11–12 current exact versions — BLOCKED, not REWORK

The newer Workstream-06 Seating 11–12 files are staged, but an exact-hash integrity audit found that `lane-06.json` currently records near-match hashes that do **not** equal the workflow calculation or GitHub path readback. The true current candidate identities are:

| Item | Current candidate | Git blob SHA | SHA-256 | Bytes | Decision |
| --- | --- | --- | --- | ---: | --- |
| `seating-11` Moon Chair — Tier 4 / Galaxy Glow | `/assets/catalog/seating-11-w06-v2.png` | `5126e9abcec4a09ef281dccb33aac6ba59b38b94` | `2bf8b90027f58f24323121305d675edc91ccb996605cd10ca73ccbe077645c47` | 579001 | **BLOCKED** |
| `seating-12` Throne Chair — Tier 5 / Sunny Pop | `/assets/catalog/seating-12-w06-v2.png` | `793b32f60ed10fffa80b549e75b66858ac0d7e4f` | `5891818da864e528aaceb598f93d2b3426cb91c3eb1acd0375e4f57cbe7d69df` | 577216 | **BLOCKED** |

Evidence source: staging workflow run `35672223467`, job `106571013165`, asset commit `efe5551ad0f42e23bb4524578f367a42e9a6b4cb`, plus direct GitHub content readback of both current paths. The workflow emitted no independent card/detail artifact. A read-only browser fallback resolved the Seating-11 source image but returned only a browser-local report rather than reusable exact-current-candidate card/detail pixels; the Seating-12 source fallback failed with `ERR_TUNNEL_CONNECTION_FAILED`.

Therefore reviewer 02 made **no visual-quality rejection**. Workstream 06 should correct only the recorded hashes, preserve both staged images, and Workstream 14 should render these exact current candidate hashes at card and detail scale. Reviewer 02 can then make the visual decision without regeneration.

Full version-bound evidence is recorded in `docs/preproduction/catalog-sprint/reviews/02.json` schema v6.

### Seating 4–6 — ready bytes, render not yet dispositioned

A new exact-byte repair batch arrived at commit `a4600faaa608310b91ff202bd58d54c83eab0693` from workflow run `35673301701`:

- `seating-4` Heart Chair — Tier 2 / Midnight Neon — blob `55d1fb2edddb7638f87c5962bd03b6ac745a1f4b`, SHA-256 `ed23dbccfd3501122c20b3fff77bb8d3f4273cb902e4df745e66fdbfa2c86710`, 1024×1024, 914302 bytes.
- `seating-5` Reading Chair — Tier 2 / Candy Core — blob `252f0b24b3ede29d6abfbe7fc661a7da751de565`, SHA-256 `817b9316d3b1d4ccf2c3fc488732fc17831f4c00797185b5b09bfebe590af657`, 1024×1024, 1050854 bytes.
- `seating-6` Gamer Chair — Tier 2 / Adventure Club — blob `f4f00fb739aaae4ce970a4c4d1d738bca729ff40`, SHA-256 `d3e8e8d96beec53a6f4a094d3cf1717c0790b9b9ae56fee26df6672e20e4f01e`, 1024×1024, 941578 bytes.

At the last check that workflow was still executing its browser/render/regression steps, so no premature ACCEPT/REWORK was recorded. Once it publishes exact-hash card/detail evidence, Seating 4–6 are the next review priority.

## Beds 1–4 pilot — frozen pending reviewer 05

The four-item Bed pilot remains repository-staged with exact-byte readback and independent-render evidence already available. Workstream 02 does **not** self-approve it.

| Item | Exact candidate path | Git blob SHA | Bytes | Dimensions | Status |
| --- | --- | --- | ---: | --- | --- |
| `beds-1` Starter Bed — Tier 1 / Garden Glow | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-1-w02-v1.png` | `0b9f4213f84c9cde0de5ede646345c0ebc851127` | 673746 | 1024×1024 | READY_FOR_REVIEW_05 |
| `beds-2` Cloud Bed — Tier 1 / Galaxy Glow | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-2-w02-v1.png` | `67a0fe2874f975cedb1b4b994e0237ac55d2fb3e` | 825777 | 1024×1024 | READY_FOR_REVIEW_05 |
| `beds-3` Pixel Bunk — Tier 1 / Sunny Pop | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-3-w02-v1.png` | `22b1d9f6802cc0b442c9226511ff96e8ea0bbacc` | 879492 | 1024×1024 | READY_FOR_REVIEW_05 |
| `beds-4` Berry Daybed — Tier 2 / Aqua Wave | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-4-w02-v1.png` | `18fa8722d9831af1113e07c2103b373acc41c3c0` | 981252 | 1024×1024 | READY_FOR_REVIEW_05 |

Shared artifact `10671012131` contains their card/contact-sheet and exact detail evidence; detail SHA-256 values remain recorded in `lane-02.json`. Preserve these bytes until reviewer 05 decides them. Do **not** scale into Beds 5–8 before that pilot disposition; repair only an exact rejected version if 05 returns REWORK.

## Handoff

**06:** correct Seating 11/12 ledger hashes to the exact values above; do not regenerate. **14:** render those exact current Seating 11/12 hashes through the shared fixture. **02:** consume Seating 4–6 exact render evidence as soon as the existing workflow publishes it, then continue Shoes 7–12 and Backgear/Handgear ready repairs. **05:** independently disposition Beds 1–4 from existing exact-hash render evidence. **08:** preserve all 12 previously accepted reviewer-02 hashes; do not integrate Seating 11/12 until their hash metadata is corrected and exact-current pixels receive an independent ACCEPT. **15:** coordinate the shared fixture and keep Bed review independent.

No nonvisual feature scope, test weakening, service purchase, paid-setting change, real-player change, deployment, main merge, Replit call or Floot call was made by this pass.
