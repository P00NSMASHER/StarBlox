# Workstream 08 catalog integration

Status: **Seating 2-6 exact-hash ACCEPTs PREPARED; VALIDATION PENDING**

Source head: `d977323a353d8755c821c8166c54f83ef3b2c365`  
Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data untouched.

| ID | Name | Tier/theme | Canonical asset | Git blob | Decode |
|---|---|---|---|---|---|
| seating-2 | Cloud Pouf | T1 · Art Attack | `/assets/catalog/seating-2-w01-recovered-v2.jpg` | `c3d4705b7182b1be735b1a762b2ae79d58928aa5` | JPEG 600×600 |
| seating-3 | Pixel Beanbag | T1 · Star Luxe | `/assets/catalog/seating-3-w01-recovered-v2.jpg` | `5d69a2f6adf1e4cf9b4ec413dbeedba84c41813b` | JPEG 600×600 |
| seating-4 | Heart Chair | T2 · Midnight Neon | `/assets/catalog/seating-4-chat-v2.png` | `55d1fb2edddb7638f87c5962bd03b6ac745a1f4b` | PNG 1024×1024 |
| seating-5 | Reading Chair | T2 · Candy Core | `/assets/catalog/seating-5-chat-v2.png` | `252f0b24b3ede29d6abfbe7fc661a7da751de565` | PNG 1024×1024 |
| seating-6 | Gamer Chair | T2 · Adventure Club | `/assets/catalog/seating-6-chat-v2.png` | `f4f00fb739aaae4ce970a4c4d1d738bca729ff40` | PNG 1024×1024 |

Every accepted blob was re-read from the repository, checked against authoritative Store identity/category/tier/theme, decoded/safety-checked, confirmed independent from its producer and checked for canonical path/content collisions.

After this batch: manifest v20; **137/192 legacy final-portable labels**, **62/192 strict independently accepted + canonical-wired current hashes**, **130 strict remaining**, **0 release-cleared**.

## Executed validation

Affected catalog mapping/content tests **PASS** and the Vite production build **PASS**. Strict changed-art Store/mobile QA was executed. It remains **BLOCKED** in the shared navigation fixture: Playwright times out while performing the visible Store sidebar pointer click before any changed Store artwork is reached. This does not convert any item to release-cleared; release clearance remains 0.

The unrelated full-suite harness issue remains separate: run `35677462826` collected `scripts/artPromptOptimizer.test.mjs` as a test file with no test suite. No assertion was weakened.
