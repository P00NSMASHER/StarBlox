# Workstream 08 catalog integration

Status: **Rugs 9-10 exact-hash ACCEPTs PREPARED; VALIDATION PENDING**

Source head: `9517ee8531e9a51cfbb23499b230b84f1576a663`  
Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data untouched.

| ID | Name | Tier/theme | Canonical asset | Git blob | Decode |
|---|---|---|---|---|---|
| rugs-9 | Splash Rug | T3 · Berry Blast | `/assets/catalog/rugs-9-w07-v2.jpg` | `9eef1db116e871d31c62de680d261cfbeccf49b3` | JPEG 600×600 |
| rugs-10 | Neon Grid Rug | T4 · Garden Glow | `/assets/catalog/rugs-10-chat-v2.png` | `e9ff2aabc5bfa90c7411d0b8a5c48f297d2d270d` | PNG 1024×1024 |

Every accepted blob was re-read from the repository, checked against authoritative Store identity/category/tier/theme, decoded/safety-checked, confirmed independent from its producer and checked for canonical path/content collisions.

After this batch: manifest v22; **145/192 legacy final-portable labels**, **74/192 strict independently accepted + canonical-wired current hashes**, **118 strict remaining**, **0 release-cleared**.

## Executed validation

Affected catalog mapping/content tests **PASS** and the Vite production build **PASS**. Strict changed-art Store/mobile QA was executed. It remains **BLOCKED** in the shared navigation fixture: Playwright times out while performing the visible Store sidebar pointer click before any changed Store artwork is reached. This does not convert any item to release-cleared; release clearance remains 0.

The unrelated full-suite harness issue remains separate: run `35677462826` collected `scripts/artPromptOptimizer.test.mjs` as a test file with no test suite. No assertion was weakened.
