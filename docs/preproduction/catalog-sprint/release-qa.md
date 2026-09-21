# Catalog Sprint — Workstream 14 Release QA

STATUS: **FAIL — CATALOG NOT RELEASE READY**

Branch: `screenshot-match-preproduction` only. Replit/Floot untouched. `main` unmodified. No real player data used.

## Material progress this pass

The existing staged-art Playwright workflow was hardened rather than replaced. It still produces one compact artifact with hash-bound card and 800×800 detail evidence for Workstream-14 collections plus repository-staged versioned replacements from producer lanes. It supports SVG/PNG/JPG/JPEG/WEBP, records exact Git blob hashes, and now checks more than HTTP/decode dimensions: invalid file signatures and effectively fully transparent image payloads are release-blocking fixture findings.

The diagnostic run `35663502757` on `60e0f9a5cddfaf4925aae4800dd96816690a98ae` uploaded artifact `10668875135`, digest `sha256:a17eaf3d70986b473fa017cbdef1119ba2f86dbc9d15b6969262cec30ab81f54`. It correctly failed the current Desk replacement batch instead of silently accepting decodable-but-empty bytes:

- `desks-2-v1.webp`, `desks-3-v1.webp`, `desks-4-v1.webp`: invalid WebP signatures;
- `desks-2-w03-v1.webp`, `desks-3-w03-v1.webp`, `desks-4-w03-v1.webp`: valid 512×512 WebP decode but **opaqueFraction = 0**, so the rendered card/detail image is visually blank/transparent.

Other selected replacement assets in that diagnostic batch remained renderable. Workstream 14 does **not** disposition Desk art; this is a producer/evidence blocker for Workstream 03 and reviewer 05.

## Independent Workstream-14 visual review

Workstream 14's assigned partition remains fully dispositioned: **48 reviewed / 4 ACCEPT / 44 REWORK / 0 BLOCKED**.

Qualified exact replacement ACCEPTs remain:

- `lighting-1` → `9d8aa142fa53f06dbad9ce59e9c8d34c1096ddc3`
- `lighting-2` → `8c10fe689d6d7e398e85b24eb1ca1323cee07ea3`
- `lighting-3` → `fc21ddf5a608ee393410ff9682cf2ef87a56c46d`
- `lighting-4` → `7975e490a9fb97574f03081acf9fc871c22224f3`

Current Workstream-14 REWORK backlog is Lighting 5–12, Wall 1–12, Rugs 1–12 and Decor 1–12. Exact-content uniqueness remains PASS for the 48 reviewed Workstream-14 hashes; manual rendered review found no identity-level duplicate collision, although repeated flat/vector templates remain quality defects.

## Cross-partition review coverage

Current reviewer shards cover **180 / 192 unique item IDs** at at least one exact hash:

- reviewer 01: **48 / 48** Tops, Bottoms, Headwear, Facegear;
- reviewer 02: **48 / 48** Shoes, Backgear, Handgear, Seating;
- reviewer 05: **36 / 48** Auras, Companions, Beds; Desk remains the 12-ID coverage gap;
- reviewer 14: **48 / 48** Lighting, Wall, Rugs, Decor.

Known qualified replacement ACCEPTs currently total **14 exact hashes**: Tops 1–6, Companions 3/4/10/11, and Lighting 1–4. This is not the same as 14 release-cleared IDs: accepted hashes must also be current, canonically wired, and pass the remaining gates. Auras 1–4 v2 and later Tops 7–12 versions remain REWORK at their reviewed hashes.

## Canonical manifest / current CI

The canonical manifest is now **v13** with `finalCount = 103`; Workstream 08 has incrementally promoted accepted Companions 3, 4, 10 and 11. This demonstrates that V2 micro-batch integration is active.

The latest CI run `35663779638` on `a7003fb7715b1515b660a21670a2ec9c53f94511` is **FAIL**, not green:

- **98 / 99 tests PASS**;
- one exact metadata assertion fails: `beds-1` manifest theme is `Aqua Wave`, while current `gameModel` metadata is `Garden Glow`;
- production build is **NOT RUN** on that latest head because CI stops after the failing test.

The QA test was intentionally kept strict. Earlier stale assumptions that all final assets must be SVG or all companion replacements must remain interim were corrected to V2 behavior: repo-owned SVG/PNG/JPG/WEBP are supported and an independently accepted exact hash may be final. The `beds-1` mismatch is therefore a genuine canonical metadata blocker owned by Workstream 08, not a test to relax.

## Persistence / economy release gate

Workstream 13 has now closed its prior real-browser persistence blocker. Current `persistence-qa.json` is **PASS_REAL_BROWSER_PERSISTENCE_ECONOMY_MATRIX** with synthetic-only Chromium evidence for:

- purchase/equip/room state and reload;
- rapid and multi-tab exactly-once purchase behavior;
- malformed import no-mutation;
- exact IndexedDB recovery after localStorage loss;
- wrong/retry no-farming, assisted-vs-independent evidence, rapid correct exactly-once behavior;
- final Quest completion committed before the 950 ms presentation timer and surviving immediate reload;
- unknown/no-art ownership/equipment/room/Dream Goal retention.

No real player data was used. Persistence/economy therefore has **no current release blocker**; rerun only after relevant runtime changes or on the frozen final candidate.

## Original reference pixels — blocker removed

The previous “original reference pixels unavailable” blocker is now resolved. Commit `9d64486f85e8779faaabb87214af0bdf2f998ece` preserves the exact original Home, Store and Quest JPEG bytes plus verified 1408×1056 lossless comparison derivatives under `docs/preproduction/reference-screenshots/`.

The manifest records exact originals and hashes, including:

- Home SHA-256 `6a4b110aeaf12a6ab0c629f9181cc6cfa8d4f55a518d4f2a6adb3ac6e756c457`;
- Store SHA-256 `b26cb14947d85258bcfff211174e54f34f2e2a11b83c73560b2365167071071d`;
- Quest SHA-256 `70f1b952709a85c77bb11851ffe9ae704acf8b97640355e908b6ec537b5c73c9`.

Original-byte/dimension verification passed 3/3. Pixel-identical game comparison is now **NOT TESTED**, not BLOCKED by missing references: the first compare workflow could not reach build/capture because the current `beds-1` metadata CI failure stopped the job first. Generated promotional collages remain invalid reference evidence.

## Current gate classification

| Gate | Status |
|---|---|
| Exactly 192 stable Store IDs | **PASS** |
| Canonical metadata/path integrity | **FAIL — beds-1 theme mismatch** |
| Workstream-14 48-ID review partition | **PASS** |
| Independent unique-ID review coverage | **180 / 192 — Desk family remains** |
| Qualified exact replacement ACCEPTs known | **14** |
| All 192 current final hashes independently accepted | **FAIL** |
| All 192 accepted hashes canonically wired | **FAIL** |
| Complete final exact-content duplicate scan | **NOT TESTED — final set incomplete** |
| Complete rendered near-duplicate review | **NOT TESTED — final set incomplete** |
| Final integrated desktop/phone Store art verification | **NOT TESTED** |
| Catalog-induced learning P0 | **PASS — none found in latest executed tests** |
| Real-browser persistence/economy matrix | **PASS** |
| Physical-device performance | **NOT TESTED** |
| VoiceOver/TalkBack/NVDA smoke | **NOT TESTED** |
| Original reference pixels accessible | **PASS** |
| Pixel-identical Home/Store/Quest comparison | **NOT TESTED — current CI metadata failure prevents capture** |

Store/Quest geometry remains `GAME_FINISHING` work, not a catalog-completion prerequisite. Home's last measured structural geometry remains PASS unless new evidence shows a regression.

## Exact next owners

1. **08:** correct `beds-1` canonical theme metadata to the exact current `gameModel` value (`Garden Glow`) and rerun affected tests/build. Do not weaken the metadata assertion.
2. **03:** replace/restage Desks 2–4 with genuinely visible bytes. Current `-v1` aliases are invalid WebP files and current `-w03-v1` WebPs are fully transparent despite decoding. Continue remaining Desk production after that.
3. **05:** review Desk exact hashes only after the shared fixture produces visible card/detail pixels; do not convert the current blank files to PASS.
4. **08:** preserve already integrated accepted Companions 3/4/10/11; integrate qualified Tops 1–6 and Lighting 1–4 once the canonical metadata/build gate is clean and normal file/content checks pass.
5. **04 / 05 / 07 / 09 / 11 / 06:** continue bounded replacement work for existing REWORK families; each new hash needs fresh independent review.
6. **14:** keep the one staged-art fixture current, independently disposition only Lighting/Wall/Rugs/Decor replacements, and run complete final duplicate/near-duplicate/Store/reference gates at coherent milestones.
7. **15:** keep `CATALOG_SPRINT` until all 192 current hashes are stored, correct, unique, independently accepted, canonically wired and Store-verified with no catalog-induced safety P0.

**READY FOR SINGLE REPLIT INTEGRATION: NO.** Replit/Floot and `main` remain untouched.
