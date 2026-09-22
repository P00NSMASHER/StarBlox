# Catalog Sprint — Lane 11 Auras

STATUS: **AURAS 1–10 + 12 ACCEPTED/CANONICAL / AURA 11 EXACT RENDER QA PASS / REVIEWER 05 PENDING**

Branch: `screenshot-match-preproduction`  
Workstream: 11  
Phase: `CATALOG_SPRINT` / `ART_AND_VISUALS_ONLY`  
Independent reviewer: **05**  
Canonical integrator: **08**  
Coordinator: **15**  
Replit/Floot/main/deploy: **untouched**  
Player state / learning / persistence / economy / live Aura logic: **unchanged**

## Current authoritative Aura state

Per current Workstream-15 coordination, reviewer-05 evidence and Workstream-08 canonical state, **Auras 1–10 and 12 are accepted and canonical**. Their exact hashes are preserved. Workstream 11 did not regenerate, rewrite or churn any accepted Aura in this pass.

The sole unfinished Aura is:

- `auras-11` — **Dream Aurora**, Tier 4, Art Attack
- path: `public/assets/catalog/auras-11-w11-v3.jpg`
- exact Git blob: `7f3372c1584e07f18a3abfc7818013190fff1560`
- source dimensions: **600×600 JPEG**
- source bytes: **18,443**
- source SHA-256: `0a06996522c9cb999e82b8ba028e94bfe2cb8d16e043c94999065e0ae8ce1dc2`
- branch attachment/readback: **PASS exact hash**

The legacy Aura-11 hash `ddb2c81b49db8e6ea6369c8f70cb720228feb73c` remains historical REWORK evidence only. Its verdict does **not** transfer to the current v3 hash.

## Dream Aurora current-hash render QA

Workstream 14's shared staged-art workflow has now produced the required exact-current render evidence for `7f3372c1584e07f18a3abfc7818013190fff1560`.

Evidence:

- workflow run: **35678437306**
- workflow source head: `6bf28983c52a84f93e7f5ccfae12deecf55d873e`
- artifact: **10673089422** (`catalog-staged-art-review`)
- artifact digest: `sha256:126cf396d01cec7f0e19832ac3202f565ceec7332d740cafac9bd8b5c91c47aa`
- report SHA-256: `fbf8111402aa479271853c5bc5005c519525951b6dc3fb7e0521d11b9d3e6480`
- detail render: `staged-replacements/detail/auras-11-7f3372c1.png`
- detail render dimensions: **800×800**
- detail render SHA-256: `e175fcd79c8f0c8decf254748fd83d71103795fee717899bea76655de0350f73`
- contact sheet: `staged-replacements/staged-replacements-contact-sheet.png`
- contact sheet dimensions: **1200×7381**
- contact-sheet SHA-256: `1dff84d3e8827eea89a88ad496e08a4e3608d39d1797358abbaebf820a434294`

The scoped report confirms the exact Aura-11 repository path/blob with HTTP **200**, natural dimensions **600×600**, `opaqueFraction: 1`, a captured screenshot, and **no item errors**. The artifact report itself contains no errors or warnings. The overall shared workflow run finished in failure for work outside this scoped Aura-11 render, but that does not erase the preserved exact-hash card/detail evidence.

This is render evidence only, **not producer approval**. Reviewer 05 still owns the independent visual decision.

## Handoff

**05:** Review only Dream Aurora v3 exact hash `7f3372c1584e07f18a3abfc7818013190fff1560` using artifact `10673089422` and issue a fresh exact-hash `ACCEPT` or `REWORK`. Do not inherit the legacy verdict.  
**08:** Preserve canonical Auras 1–10 and 12. Aura 11 remains ineligible until reviewer 05 independently accepts this exact hash; 08 alone may then wire it.  
**15:** No Aura production is currently eligible. If Aura 11 is ACCEPT, route it to 08 and reassign Workstream 11. If Aura 11 is REWORK, authorize only a new versioned Aura-11 micro-repair from the concrete reviewer finding.  
**11:** Do not regenerate or alter Aura 11 while this current-hash decision is pending, and do not churn accepted Auras.

Current counts: **11/12 accepted + canonical; 1/12 pending reviewer 05; 0 eligible Aura regeneration IDs.**

No deployment action was taken. General motion/game-feel remains outside this Aura wait state unless Workstream 15 explicitly reassigns it under the all-art/visuals sprint.
