# Workstream 08 catalog integration

Status: **Tops 7-10 + Bottoms 1-4 + Headwear 1-4 exact-hash ACCEPTs PREPARED; VALIDATION PENDING**

Source head: `bda51b8b17c088d4bdc4a5d37ecded732205cb1f`  
Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data untouched.

| ID | Name | Tier/theme | Canonical asset | Git blob | Decode |
|---|---|---|---|---|---|
| tops-7 | Colorblock Hoodie | T3 · Aqua Wave | `/assets/catalog/tops-7-w09-v3.jpg` | `1c85689d80f3457bb30b2508386d3e1ea387c029` | JPEG 600×600 |
| tops-8 | Puffer Vest | T3 · Art Attack | `/assets/catalog/tops-8-w09-v3.jpg` | `58aadd95fb9bdd3bb461a9fec9d458d9bf5df79e` | JPEG 600×600 |
| tops-9 | Art Smock | T3 · Star Luxe | `/assets/catalog/tops-9-w09-v3.jpg` | `9011648da2461f63a4ac9e203833cf70eb1d6fe0` | JPEG 600×600 |
| tops-10 | Star Bomber | T4 · Midnight Neon | `/assets/catalog/tops-10-w09-v3.jpg` | `5449283ed30dbfade70290cc976f85bace94fa0a` | JPEG 600×600 |
| bottoms-1 | Jeans | T1 · Garden Glow | `/assets/catalog/bottoms-1-w05-v2.png` | `8af6b7c9d2f10c41c5abf2cba0368dda6c9c412c` | PNG 768×768 |
| bottoms-2 | Joggers | T1 · Galaxy Glow | `/assets/catalog/bottoms-2-w05-v2.png` | `17031c030198b20867aeeffeab67ad60e99397e1` | PNG 768×768 |
| bottoms-3 | Cargo Pants | T1 · Sunny Pop | `/assets/catalog/bottoms-3-w05-v2.png` | `b7025444f62bd6e65325835ecf51a5bbe6cee897` | PNG 768×768 |
| bottoms-4 | Pleat Skirt | T2 · Aqua Wave | `/assets/catalog/bottoms-4-w05-v2.png` | `b618e3990a0e4b049278f5a748325d57cb81955e` | PNG 768×768 |
| headwear-1 | Headband | T1 · Midnight Neon | `/assets/catalog/headwear-1-w12-v2.jpg` | `4d4424962a49f5145422723b625778d6649a4b26` | JPEG 768×768 |
| headwear-2 | Cloud Clips | T1 · Candy Core | `/assets/catalog/headwear-2-w12-v2.jpg` | `595c8fe9182f4aecd5355856f19947c7c83daa11` | JPEG 768×768 |
| headwear-3 | Pixel Cap | T1 · Adventure Club | `/assets/catalog/headwear-3-w12-v2.jpg` | `86db079b85360dc64e669aeca53cba874176c693` | JPEG 768×768 |
| headwear-4 | Berry Bow | T2 · Cloud Pop | `/assets/catalog/headwear-4-w12-v2.jpg` | `4257b4a959153fba985fa2a97720c379b6d63e33` | JPEG 768×768 |

Every accepted blob was re-read from the repository, checked against authoritative Store identity/category/tier/theme, decoded/safety-checked, confirmed independent from its producer and checked for canonical path/content collisions.

After this batch: manifest v19; **132/192 legacy final-portable labels**, **57/192 strict independently accepted + canonical-wired current hashes**, **135 strict remaining**, **0 release-cleared**.

## Executed validation

Affected catalog mapping/content tests **PASS** and the Vite production build **PASS**. Strict changed-art Store/mobile QA was executed. It remains **BLOCKED** in the shared navigation fixture: Playwright times out while performing the visible Store sidebar pointer click before any changed Store artwork is reached. This does not convert any item to release-cleared; release clearance remains 0.

The unrelated full-suite harness issue remains separate: run `35677462826` collected `scripts/artPromptOptimizer.test.mjs` as a test file with no test suite. No assertion was weakened.
