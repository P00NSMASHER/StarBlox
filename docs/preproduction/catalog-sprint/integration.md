# Workstream 08 catalog integration

Status: **Beds 1-4 + Desks 5-6 + Auras 1-4 v3 exact-hash ACCEPTs PREPARED; VALIDATION PENDING**

Source head: `9493c4c614161fdf61abd27cf4441ffa3c6ec850`  
Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data untouched.

| ID | Name | Tier/theme | Canonical asset | Git blob | Decode |
|---|---|---|---|---|---|
| beds-1 | Starter Bed | T1 · Garden Glow | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-1-w02-v1.png` | `0b9f4213f84c9cde0de5ede646345c0ebc851127` | PNG 1024×1024 |
| beds-2 | Cloud Bed | T1 · Galaxy Glow | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-2-w02-v1.png` | `67a0fe2874f975cedb1b4b994e0237ac55d2fb3e` | PNG 1024×1024 |
| beds-3 | Pixel Bunk | T1 · Sunny Pop | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-3-w02-v1.png` | `22b1d9f6802cc0b442c9226511ff96e8ea0bbacc` | PNG 1024×1024 |
| beds-4 | Berry Daybed | T2 · Aqua Wave | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-4-w02-v1.png` | `18fa8722d9831af1113e07c2103b373acc41c3c0` | PNG 1024×1024 |
| desks-5 | Garden Book Desk | T2 · Pixel Party | `/assets/catalog/desks-5-w03-recovered-v2.jpg` | `95fe65632e4f40b76b23cce30071ee2fdc5b4399` | JPEG 600×600 |
| desks-6 | Galaxy Gamer Setup | T2 · Berry Blast | `/assets/catalog/desks-6-w03-recovered-v2.jpg` | `52df05265de236911927b904b07e68dac7a17828` | JPEG 600×600 |
| auras-1 | Soft Sparkles | T1 · Midnight Neon | `/assets/catalog/auras-1-w11-v3.png` | `a7921c7b7c8f48fc47908595c1afa6f59217c7a5` | PNG 768×768 |
| auras-2 | Cloud Puffs | T1 · Candy Core | `/assets/catalog/auras-2-w11-v3.png` | `1e421c71217e5386c1b255dfedeade8215976bcb` | PNG 768×768 |
| auras-3 | Pixel Bits | T1 · Adventure Club | `/assets/catalog/auras-3-w11-v3.png` | `f164aefb93a21374a1cf0b9b7b7312a0ae68d34c` | PNG 768×768 |
| auras-4 | Berry Hearts | T2 · Cloud Pop | `/assets/catalog/auras-4-w11-v3.png` | `3357a67e4121ca631377e30033a31ef4c815ab61` | PNG 768×768 |

Every accepted blob was re-read from the repository, checked against authoritative Store identity/category/tier/theme, decoded/safety-checked, confirmed independent from its producer and checked for canonical path/content collisions.

After this batch: manifest v21; **143/192 legacy final-portable labels**, **72/192 strict independently accepted + canonical-wired current hashes**, **120 strict remaining**, **0 release-cleared**.

## Executed validation

Affected catalog mapping/content tests **PASS** and the Vite production build **PASS**. Strict changed-art Store/mobile QA was executed. It remains **BLOCKED** in the shared navigation fixture: Playwright times out while performing the visible Store sidebar pointer click before any changed Store artwork is reached. This does not convert any item to release-cleared; release clearance remains 0.

The unrelated full-suite harness issue remains separate: run `35677462826` collected `scripts/artPromptOptimizer.test.mjs` as a test file with no test suite. No assertion was weakened.
