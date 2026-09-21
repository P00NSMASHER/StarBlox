# Workstream 14 — Visual Release QA

STATUS: **CATALOG_SPRINT / 98-TEST CI PASS / STAGED-REPLACEMENT FIXTURE PASS / 4 LIGHTING ACCEPTS / CATALOG GATE FAIL**

Branch: `screenshot-match-preproduction` only  
Delivery policy: `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Replit/Floot: **untouched**  
Main: **not merged or modified**  
Real player data: **not used**

## Release decision

**READY FOR SINGLE REPLIT INTEGRATION: NO.**

The game runtime/build gate remains green, and this pass produced the first independently accepted premium replacement hashes. The catalog is still not release-ready because the full 192-item exact-hash acceptance/canonical-wiring gate is far from complete, the complete final duplicate/near-duplicate gate cannot run until that final set exists, real-browser persistence stress remains unproven, and original reference screenshot pixels are unavailable for pixel-identical sign-off.

Store/Quest geometry remains `GAME_FINISHING` work and does **not** block catalog phase completion. Home's last measured structural geometry remains PASS unless a new regression is observed.

## Fresh test/build evidence

Normal CI run `35657434360`, job `106524446604`, on `00d6cebfaf0e645ce08c150db1a93245d3eed148` completed successfully after the staged-art workflow change:

- install: **PASS**;
- Vitest: **22/22 files PASS, 98/98 tests PASS**;
- production Vite build: **PASS**;
- modules transformed: **1,613**;
- CSS: **167.39 kB / 35.69 kB gzip**;
- JS: **304.14 kB / 93.34 kB gzip**.

The suite includes 192-item catalog invariants, manifest metadata/path checks, interim-art promotion guard, SVG active-content safety, learning semantic/source guards, persistence recovery, durable purchase/Quest reload-replay transactions, rapid action guards, shell navigation and mobile accessibility helpers. No catalog-induced P0 learning defect is recorded.

## Shared staged-art render fixture

I reused and narrowly extended `.github/workflows/catalog-staged-art-qa.yml`; no second framework was created. The existing Playwright fixture now discovers repository-staged versioned replacement files even when a producer lane report is stale or uses `decision`/`reviewStatus` rather than top-level `status`. It supports SVG, PNG, JPG/JPEG and WEBP, records repository path + computed Git blob SHA, renders a card contact sheet and 800×800 detail capture, and keeps one compact artifact.

Latest proven run: `35657747373` on `20515bb8fe8da83c56843ec3b690574699eeb2f7`.

Artifact: `10665857539`, digest `sha256:1480d7f858cb7ecfffe7f53871d71aad230ff39df864d0a4ebd0a3025d5dc63f`.

Results:

- reviewer-14 collections: **48/48 HTTP 200 + decoded + screenshot captured + zero errors**;
- staged replacements: **27/27 HTTP 200 + decoded + screenshot captured + zero errors**;
- replacement set currently includes **Auras 1–8, Desks 2–4, Lighting 1–4 and Tops 1–12**;
- exact replacement IDs/paths/blob SHAs are recorded in the artifact `report.json`.

The fixture renders other partitions only to unblock their reviewers. Workstream 14 made no Tops/Auras/Desks visual decision.

## Independent Workstream-14 catalog review

Partition: Lighting / Wall / Rugs / Decor = **48 IDs**.

Current exact-hash disposition: **48 reviewed / 4 ACCEPT / 44 REWORK / 0 BLOCKED**.

### Lighting 1–4 replacement hashes — ACCEPT

The actual pixels materially correct the prior flat/front-facing vector defects:

| ID | Replacement | Exact Git blob | Decision |
|---|---|---|---|
| lighting-1 | `/assets/catalog/lighting-1-v2.jpg` | `9d8aa142fa53f06dbad9ce59e9c8d34c1096ddc3` | **ACCEPT** |
| lighting-2 | `/assets/catalog/lighting-2-v2.jpg` | `8c10fe689d6d7e398e85b24eb1ca1323cee07ea3` | **ACCEPT** |
| lighting-3 | `/assets/catalog/lighting-3-v2.jpg` | `fc21ddf5a608ee393410ff9682cf2ef87a56c46d` | **ACCEPT** |
| lighting-4 | `/assets/catalog/lighting-4-v2.jpg` | `7975e490a9fb97574f03081acf9fc871c22224f3` | **ACCEPT** |

They now show clear exact identity/theme, dimensional construction, believable material/emissive response, grounded/cast lighting and strong card/detail readability. Workstream 08 may consume these exact hashes immediately after its own metadata/file/content checks. A second universal visual review is not required by V2.

### Current REWORK families

- Lighting 5–12: **8 REWORK** on the still-current legacy hashes. Producer 04 has generated Lighting 5–8 remotely but those bytes are not yet repository-staged; 9–12 still require replacement production.
- Wall 1–12: **12 REWORK**. They read as flat UI/emblem treatments rather than physical mounted objects with frame/glass/metal/fabric/neon depth.
- Rugs 1–12: **12 REWORK**. They read as upright/floating badges rather than floor textiles with pile/weave/edge thickness and contact/perspective.
- Decor 1–12: **12 REWORK**. Identities are distinct, but the objects remain shallow icon-like product art with weak physical material response and insufficient high-tier progression.

All 48 Workstream-14 hashes are exact-content unique. Manual rendered review found no identity-level near-duplicate collision; repeated flat backgrounds/templates remain quality defects, not duplicate content.

Machine-readable decisions: `docs/preproduction/catalog-sprint/reviews/14.json`.

## Cross-partition review status

Disjoint reviewer shards currently contain at least one exact-hash review for **155 / 192 unique item IDs**:

- reviewer 01: 36;
- reviewer 02: 35;
- reviewer 05: 36;
- reviewer 14: 48.

This number is **review coverage, not final acceptance**. Many decisions are against legacy hashes and are superseded when a replacement version appears. Only the current replacement hash can be accepted for release.

The staged-art fixture now exposes the exact current replacement pixels needed by reviewers 01/05, including Tops 1–12, Auras 1–8 and Desks 2–4. They own those decisions.

## Canonical catalog gate

Canonical manifest remains v12:

- target Store IDs: **192**;
- legacy `final-portable` labels: **99**;
- interim-not-verified: **23**;
- manifest/runtime mappings: **122**;
- duplicate manifest paths: **0**.

Those labels are historical bookkeeping, not premium visual acceptance.

Current gate classification:

| Gate | Status |
|---|---|
| Exactly 192 stable Store IDs | **PASS** |
| Current wired metadata/path integrity | **PASS — automated** |
| Workstream-14 48-ID review partition | **PASS — fully dispositioned** |
| Qualified exact-hash accepted replacements known to this gate | **4** |
| All 192 current final hashes independently accepted | **FAIL** |
| All 192 accepted hashes canonically wired | **FAIL** |
| Complete final exact-content duplicate scan | **NOT TESTED — final set incomplete** |
| Complete rendered near-duplicate review | **NOT TESTED — final set incomplete** |
| Post-integration desktop/phone Store art verification | **NOT TESTED — first accepted batch not yet integrated** |
| Catalog-induced learning P0 | **PASS — automated** |
| Automated purchase / final-Quest reload-replay | **PASS** |
| Synthetic real-browser persistence timing/concurrency/recovery | **NOT TESTED — release blocker** |
| Physical-device performance | **NOT TESTED** |
| VoiceOver/TalkBack/NVDA smoke | **NOT TESTED** |
| Pixel-identical original-reference parity | **BLOCKED — original reference pixels unavailable to repository QA** |

## Exact blockers and next owners

1. **08 — canonical integration:** consume Lighting 1–4 v2 ACCEPT hashes now, then run affected catalog tests/build and actual canonical Store smoke. Do not wait for all 192 or old monolithic review files.
2. **04 — Lighting:** preserve Lighting 1–4 accepted versions; stage already-generated Lighting 5–8; continue Lighting 9–12 repairs.
3. **05 — Wall:** repair Wall 1–12 in versioned batches from reviewer-14 defects.
4. **07 — Rugs:** repair Rugs 1–12 so they read as grounded floor textiles rather than upright badges.
5. **09 — Decor:** repair Decor 1–12 with physical construction/material depth and stronger tier progression.
6. **01 / 05 — cross-partition decisions:** consume the current staged-art artifact for Tops/Auras/Desks and write their own hash-bound decisions. Workstream 14 must not decide them.
7. **13 — persistence:** close the synthetic real-browser purchase/equip/place/reload, final-feedback refresh, multi-tab replay and storage-recovery timing gate.
8. **15 — phase owner:** keep `CATALOG_SPRINT` until all 192 current hashes are stored, correct, unique, independently accepted, canonically wired and Store-verified with no catalog-induced safety P0.

## Deferred GAME_FINISHING release work

When catalog PASS is reached, remeasure the then-current UI before fixing anything. Retained measured backlog is Store **4** structural blockers and Quest **6** structural blockers. Home is currently structurally PASS. Final release QA must also cover actual navigation/mobile controls, real purchase/equip/place/Quest flows, migration/recovery, semantic learning, keyboard/focus/contrast, screen-reader smoke, normal/reduced-motion performance and reference fidelity.

The original three user reference screenshots remain authoritative. Their actual pixels are still not repository-accessible, so **pixel-identical sign-off is BLOCKED**; frozen target/design contracts may guide development but generated promotional collages are never proof.

**Replit/Floot untouched. `main` untouched. No deployment authorized.**
