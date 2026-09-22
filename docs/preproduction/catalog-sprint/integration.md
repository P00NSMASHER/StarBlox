# Workstream 08 catalog integration

Status: **Desks 2-4 plus Auras 5/9/10/12 exact-hash ACCEPTs PREPARED; VALIDATION PENDING**

Source head: `45d930cc61b1d798b8a1a90f5d138260ce3cb708`  
Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data untouched.

| ID | Name | Tier/theme | Canonical asset | Git blob | Decode |
|---|---|---|---|---|---|
| desks-2 | Cloud Study Desk | T1 · Candy Core | `/assets/catalog/desks-2-chat-v2.png` | `277eb1e38e8a69caa0dab6d4d27bbb91796746f8` | PNG 1024×1024 |
| desks-3 | Pixel Mini Setup | T1 · Adventure Club | `/assets/catalog/desks-3-chat-v2.png` | `aeebeacdc4a95bf75af36583dae6e2391d9a1d9e` | PNG 1024×1024 |
| desks-4 | Berry Vanity Desk | T2 · Cloud Pop | `/assets/catalog/desks-4-chat-v2.png` | `6f87e1527ec7d9bf1a3f81e1f54320f462dbb025` | PNG 1024×1024 |
| auras-5 | Garden Fireflies | T2 · Pixel Party | `/assets/catalog/auras-5-w11-v3.jpg` | `ae3bef6cbbf4333aa740dc9a3fddf4f2b5540192` | JPEG 600×600 |
| auras-9 | Art Confetti | T3 · Sunny Pop | `/assets/catalog/auras-9-w11-v3.jpg` | `9331e516a7a1a2fa32abafaf3bbf0932c3ca792d` | JPEG 600×600 |
| auras-10 | Neon Trail | T4 · Aqua Wave | `/assets/catalog/auras-10-w11-v3.jpg` | `6f07fe7f5c8be236f3c17df5f55afc550888f52e` | JPEG 600×600 |
| auras-12 | Luxe Starstorm | T5 · Star Luxe | `/assets/catalog/auras-12-w11-v3.jpg` | `d0fcf528ff4ee91e56760932fdcf357ab264dd3d` | JPEG 600×600 |

Every accepted blob was re-read from the repository, checked against authoritative Store identity/category/tier/theme, decoded/safety-checked, confirmed independent from its producer and checked for canonical path/content collisions.

After this batch: manifest v23; **152/192 legacy final-portable labels**, **81/192 strict independently accepted + canonical-wired current hashes**, **111 strict remaining**, **0 release-cleared**.

## Executed validation

Affected catalog mapping/content tests **PASS** and the Vite production build **PASS**. Strict changed-art Store/mobile QA was executed. It remains **BLOCKED** in the shared navigation fixture: Playwright times out while performing the visible Store sidebar pointer click before any changed Store artwork is reached. This does not convert any item to release-cleared; release clearance remains 0.

The unrelated full-suite harness issue remains separate: run `35677462826` collected `scripts/artPromptOptimizer.test.mjs` as a test file with no test suite. No assertion was weakened.
