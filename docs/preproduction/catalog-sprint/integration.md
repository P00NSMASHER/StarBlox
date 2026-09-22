# Workstream 08 catalog integration

Status: **Rug 11 v3 qualified exact-hash ACCEPT PREPARED; VALIDATION PENDING**

Source head: `187068cec23a87ecc256fd32010bf2d178da6065`  
Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data untouched.

| ID | Name | Tier/theme | Canonical asset | Git blob | Decode |
|---|---|---|---|---|---|
| rugs-11 | Dream Cloud Rug | T4 · Galaxy Glow | `/assets/catalog/rugs-11-w07-v3.png` | `2c93f18fb5960f7056819c341a3da8f7fff3fb9d` | PNG 1024×1024 |

Every accepted blob was re-read from the repository, checked against authoritative Store identity/category/tier/theme, decoded/safety-checked, confirmed independent from its producer and checked for canonical path/content collisions.

After this batch: manifest v25; **155/192 legacy final-portable labels**, **85/192 strict independently accepted + canonical-wired current hashes**, **107 strict remaining**, **0 release-cleared**.

## Executed validation

Affected catalog mapping/content tests **PASS** and the Vite production build **PASS**. Strict changed-art Store/mobile QA was executed. It remains **BLOCKED** in the shared navigation fixture: Playwright times out while performing the visible Store sidebar pointer click before any changed Store artwork is reached. This does not convert any item to release-cleared; release clearance remains 0.

The unrelated full-suite harness issue remains separate: run `35677462826` collected `scripts/artPromptOptimizer.test.mjs` as a test file with no test suite. No assertion was weakened.
