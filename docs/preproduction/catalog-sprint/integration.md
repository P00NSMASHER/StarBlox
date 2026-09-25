# Workstream 08 catalog integration

Status: **Deterministic Decor11 + Wall9 qualified exact-hash ACCEPTs PREPARED; VALIDATION PENDING**

Source head: `ecd69a80e4f4793981a1851ec954c65f2b94d075`  
Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data untouched.

| ID | Name | Tier/theme | Canonical asset | Git blob | Decode |
|---|---|---|---|---|---|
| decor-11 | Dream Vanity Set | T4 · Art Attack | `/assets/catalog-candidates/deterministic/decor-11-v10.svg` | `8179542a5966926d4462bda26d01553cf1e72b0d` | SVG 800×800 |
| wall-9 | Art Gallery Wall | T3 · Adventure Club | `/assets/catalog-candidates/deterministic/wall-9-v13.svg` | `752423e322f394adb1af5f48c1166eaf888f9830` | SVG 800×800 |

Every accepted blob was re-read from the repository, checked against authoritative Store identity/category/tier/theme, decoded/safety-checked, confirmed independent from its producer and checked for canonical path/content collisions.

After this batch: manifest v47; **185/192 legacy final-portable labels**, **12/192 strict independently accepted + canonical-wired current hashes**, **180 strict remaining**, **0 release-cleared**.

## Executed validation

Affected catalog mapping/content tests **PASS** and the Vite production build **PASS**. Strict changed-art Store/mobile QA was executed. It **PASSed**.

The unrelated full-suite harness issue remains separate: run `35677462826` collected `scripts/artPromptOptimizer.test.mjs` as a test file with no test suite. No assertion was weakened.
