# Workstream 08 catalog integration

Status: **Rugs 1-8 + Decor 1-2 exact-hash ACCEPTs PREPARED; VALIDATION PENDING**

Source head: `328ea99adbd69a38096698629be66204f0b19bdc`  
Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data untouched.

| ID | Name | Tier/theme | Canonical asset | Git blob | Decode |
|---|---|---|---|---|---|
| rugs-1 | Starter Mat | T1 · Aqua Wave | `/assets/catalog/rugs-1-w07-v2.jpg` | `5e00d1456fa21af74de75e583c69de48c9f2ecd2` | JPEG 600×600 |
| rugs-2 | Cloud Rug | T1 · Art Attack | `/assets/catalog/rugs-2-w07-v2.jpg` | `578caf5cc81998d6c7563082892e468fc9186eec` | JPEG 600×600 |
| rugs-3 | Pixel Grid Rug | T1 · Star Luxe | `/assets/catalog/rugs-3-w07-v2.jpg` | `0c3b62a84182cd8e7fc3b8dc57f9b1015e54e920` | JPEG 600×600 |
| rugs-4 | Heart Rug | T2 · Midnight Neon | `/assets/catalog/rugs-4-w07-v2.jpg` | `d2c1a712dc530cec13ce72100657714900134ce2` | JPEG 600×600 |
| rugs-5 | Leaf Rug | T2 · Candy Core | `/assets/catalog/rugs-5-w07-v2.jpg` | `5a513011856679060df10137eae9f380377f5d78` | JPEG 600×600 |
| rugs-6 | Orbit Rug | T2 · Adventure Club | `/assets/catalog/rugs-6-w07-v2.jpg` | `cb96e0d40e0682770e79ef8ce6a1a86ecec3127f` | JPEG 600×600 |
| rugs-7 | Checker Rug | T3 · Cloud Pop | `/assets/catalog/rugs-7-w07-v2.jpg` | `184232121c9cd07c65fe1138893132ee0daa3fb3` | JPEG 600×600 |
| rugs-8 | Wave Rug | T3 · Pixel Party | `/assets/catalog/rugs-8-w07-v2.jpg` | `efe9bb6e887375a7e6ed74b15222391a1e2434bf` | JPEG 600×600 |
| decor-1 | Book Crate | T1 · Midnight Neon | `/assets/catalog/decor-1-w09-v2.jpg` | `7e0bad0b6f1dda6068c17109757c396de860892a` | JPEG 600×600 |
| decor-2 | Cloud Shelf | T1 · Candy Core | `/assets/catalog/decor-2-w09-v2.jpg` | `d5377bda54cba2071819da60bf4f4d4c52e393a6` | JPEG 600×600 |

Every accepted blob was re-read from the repository, checked against authoritative Store identity/category/tier/theme, decoded/safety-checked, confirmed independent from its producer and checked for canonical path/content collisions.

After this batch: manifest v18; **132/192 legacy final-portable labels**, **45/192 strict independently accepted + canonical-wired current hashes**, **147 strict remaining**, **0 release-cleared**.

## Executed validation

Affected catalog mapping/content tests **PASS** and the Vite production build **PASS**. Strict changed-art Store/mobile QA was executed. It remains **BLOCKED** in the shared navigation fixture: Playwright times out while performing the visible Store sidebar pointer click before any changed Store artwork is reached. This does not convert any item to release-cleared; release clearance remains 0.

The unrelated full-suite harness issue remains separate: run `35677462826` collected `scripts/artPromptOptimizer.test.mjs` as a test file with no test suite. No assertion was weakened.
