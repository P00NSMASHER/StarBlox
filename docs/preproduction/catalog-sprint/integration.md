# Workstream 08 catalog integration

Status: **manifest v24 published; Seating 1/11/12 exact-hash ACCEPTs canonically wired. Catalog assertions and production build pass. Changed-art Store/mobile safeguard is blocked by the existing shared Store-navigation click failure before Store content.**

Canonical catalog commit: `30089f73e38a18b746dd1ae981041c4c181caa3a`  
Runtime-only precursor: `09da46794c604d40ef43b855590c442d98c07770`  
Audited source head before the batch: `edc84244f8563b7d4882a7bfbddd7209de57c27a`  
Branch: `screenshot-match-preproduction` only. Replit/Floot/main/deploy/player data untouched.

## Integrated V2 increment

| ID | Name | Tier/theme | Canonical asset | Git blob | Reviewer |
|---|---|---|---|---|---|
| `seating-1` | Floor Cushion | 1 / Aqua Wave | `/assets/catalog/seating-1-w01-v2.svg` | `50d5e16c2bd2647be4701e0c10b3ff9d786f41e1` | 02 (producer 01) |
| `seating-11` | Moon Chair | 4 / Galaxy Glow | `/assets/catalog/seating-11-w06-v2.png` | `5126e9abcec4a09ef281dccb33aac6ba59b38b94` | 02 (producer 06) |
| `seating-12` | Throne Chair | 5 / Sunny Pop | `/assets/catalog/seating-12-w06-v2.png` | `793b32f60ed10fffa80b549e75b66858ac0d7e4f` | 02 (producer 06) |

All three current repository objects matched reviewer-02's independent current-hash decisions and authoritative Store name/type/tier/theme metadata. The PNGs are valid 768×768 images; the SVG was rendered through the shared candidate fixture. Reviewer independence passed, there was no current-hash disagreement, and the new paths/content are distinct. No prices, unlocks, ownership, saves or other gameplay metadata changed.

## Canonical state

Manifest is **v24**, blob `1da7f25e408e24b5130b4bb07af3a507ae8a46ff`; runtime blob is `bdb28c0c5f445adf99879f62425ef896e22249ac`.

- target: **192**
- manifest/runtime mappings: **162 / 162**
- legacy `final-portable`: **154**
- legacy interim-not-verified: **8**
- legacy non-final/unmapped: **38**
- independently accepted current hashes canonically wired: **84 / 192**
- strict accepted-and-canonical remaining: **108**
- catalog release-cleared: **0 / 192**
- canonical duplicate paths: **0**
- canonical duplicate exact content: **0 known**

Legacy final labels are not treated as independent screenshot-quality acceptance.

## Validation on exact canonical commit

GitHub Actions checked out exact commit `30089f73...`.

- `src/catalogManifestQa.test.js`: **PASS 4/4 catalog invariants**.
- `src/catalogAssetSafety.test.js`: **PASS**.
- Store runtime tests: **PASS 3/3**.
- Executed test assertions: **99 PASS / 0 assertion failures**.
- General CI wrapper: **FAIL**, solely because unrelated `scripts/artPromptOptimizer.test.mjs` was collected as a test file but declares no test suite. Workstream 08 did not weaken or edit that harness.
- Vite production build: **PASS** on the exact canonical commit in Preproduction Visual QA run `35685092735` and Catalog Mobile QA run `35685092749`.
- Preproduction Visual QA run `35685092735`: **FAIL / 10 release blockers**. Store navigation times out while clicking the visible Store nav before Store content is reached at desktop, landscape, 390px and 320px. Six existing Quest desktop geometry checks also fail. Home structural checks pass. Artifact `10676830427`.
- Changed-art Catalog Mobile QA run `35685092749`: **FAIL / 6 release blockers**. The four reduced-motion viewports plus tablet and phone normal-motion controls all time out clicking the visible Store navigation before Store content is reached. Artifact `10677200113`. This is the same shared Store-entry defect already seen before this increment, not evidence of an item decode or mapping failure.
- Reference-capture run `35685092811`: build and reference-input verification passed; deterministic capture was still running at the last verified read.

The shared Store navigation timeout is outside Workstream 08's catalog ownership, so the independently accepted canonical mappings remain intact while 14/15 own shared navigation/reference visual proof.

## Handoff

Continue consuming reviewers 01/02/05/14 from the live head and integrate only newly qualified current exact-hash ACCEPTs. Do not re-integrate the 84 already canonical accepted hashes. Current remaining catalog risk is **108 strict items**, plus successful Store/mobile visual entry/proof and the final release duplicate/near-duplicate gate. Only Workstream 15 may change phase or declare visual completion; no catalog state authorizes deployment.
