# Workstream 08 catalog integration

Status: **Deterministic Desk10 + Desk11 qualified exact-hash ACCEPTs PREPARED; VALIDATION PENDING**

Source head: `660b50d450bc1c3061f5aa6f2df821fa21970982`  
Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data untouched.

| ID | Name | Tier/theme | Canonical asset | Git blob | Decode |
|---|---|---|---|---|---|
| desks-10 | Neon Streaming Desk | T4 · Aqua Wave | `/assets/catalog-candidates/deterministic/desks-10-v16.svg` | `8eb15c972ec4a29e52db24d8c93e468348b55874` | SVG 800×800 |
| desks-11 | Dream Creator Station | T4 · Art Attack | `/assets/catalog-candidates/deterministic/desks-11-v13.svg` | `199b6bd5340ab02c4a302df2c2a67e19dd5b0d4d` | SVG 800×800 |

Every accepted blob was re-read from the repository, checked against authoritative Store identity/category/tier/theme, decoded/safety-checked, confirmed independent from its producer and checked for canonical path/content collisions.

After this batch: manifest v46; **183/192 legacy final-portable labels**, **10/192 strict independently accepted + canonical-wired current hashes**, **182 strict remaining**, **0 release-cleared**.

## Executed validation

Affected catalog mapping/content tests **PASS** and the Vite production build **PASS**. Strict changed-art Store/mobile QA was executed. It **PASSed**.

The unrelated full-suite harness issue remains separate: run `35677462826` collected `scripts/artPromptOptimizer.test.mjs` as a test file with no test suite. No assertion was weakened.
