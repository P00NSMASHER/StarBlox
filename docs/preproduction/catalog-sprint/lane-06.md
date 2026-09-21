# Catalog Sprint — Lane 06 Companions

STATUS: **4 RICH REPLACEMENTS RENDERED / AWAITING REVIEWER 05**

Branch: `screenshot-match-preproduction`  
Workstream: 06  
Phase: `CATALOG_SPRINT`  
Current control policy: `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Primary production assignment: `companions-2` through `companions-12`  
Current state also gives Workstream 06 repair capacity for rejected companions plus `seating-7..12` and `shoes-7..12`  
Independent companion reviewer: **Workstream 05**  
Canonical integration owner: **Workstream 08**  
Canonical manifest/runtime: **unchanged by this lane**  
Self-approval: **NO**

## Material increment this pass

The prior reproducible-render blocker is now closed. Workstream 14's shared staged-art workflow successfully rendered the four current rich companion replacement hashes without canonical Store wiring.

Successful evidence:

- workflow: **StarBlox Staged Catalog Art QA**;
- run: `35655371282` — **PASS**;
- artifact: `10663896836`;
- artifact digest: `sha256:26fe90eb465e9b6933e947da43413fbf7f59fe41238480a122a1e77e3b3980ad`;
- artifact source head: `f1f8492182e51358dda8e106644361feea5781f1`;
- current branch continuity: compare from that source head to `169f2f5bb9edd23e3bb1be9a0bf80eced80004c6` changed only reviewer-01 documentation, so these companion bytes remain current.

The artifact report records HTTP 200, successful decode, 768×768 natural dimensions and detail screenshots for all four exact replacement hashes:

| ID | Item | Tier / theme | Replacement path | Exact Git blob | Render proof |
| --- | --- | --- | --- | --- | --- |
| `companions-3` | Berry Bunny | T1 / Berry Blast | `public/assets/catalog-candidates/chat-20260921-intake01/companions-3-detail.webp` | `adba95dc769e603337dc4ac38b9a513ce9914b10` | `staged-replacements/detail/companions-3-adba95dc.png` |
| `companions-4` | Sunny Bird | T2 / Garden Glow | `public/assets/catalog-candidates/chat-20260921-intake01/companions-4-detail.webp` | `b382339e76ed9d4aeae72b1c8cccc904abf85b57` | `staged-replacements/detail/companions-4-b382339e.png` |
| `companions-10` | Pixel Bot | T4 / Midnight Neon | `public/assets/catalog-candidates/chat-20260921-intake01/companions-10-detail.webp` | `2b09d950b08083bb3a9ec5e2073ae23d88411cf4` | `staged-replacements/detail/companions-10-2b09d950.png` |
| `companions-11` | Dream Dragon | T4 / Candy Core | `public/assets/catalog-candidates/chat-20260921-intake01/companions-11-detail.webp` | `465fe45abbe4d9b4355444cb3f75a49927b604e9` | `staged-replacements/detail/companions-11-465fe45a.png` |

Producer-side inspection confirms these are materially different from the rejected flat SVG family: Berry Bunny has rounded plush-like bunny anatomy and berry details; Sunny Bird has rounded anatomy, layered wings and sun/garden lighting; Pixel Bot has distinct toy-robot construction with a pixel face and neon material response; Dream Dragon has dimensional dragon anatomy and luminous iridescent wings. These observations are **producer checks only, not acceptance**. Dream Dragon's exact Candy Core theme fit remains for independent reviewer 05 to decide.

## Independent-review state

Workstream 05 previously reviewed all 12 legacy companion SVG hashes and returned **0 ACCEPT / 12 REWORK / 0 BLOCKED**. Those exact rejected versions remain preserved at `/assets/catalog/companions-1.svg` through `/assets/catalog/companions-12.svg`.

The four richer replacements above are different hashes, so the old decisions do not transfer. Workstream 05 now has reproducible card/detail-scale evidence and should issue fresh `ACCEPT / REWORK / BLOCKED` decisions against those exact hashes. Workstream 08 must not integrate them before that independent decision.

## Remaining companion repair queue

Rich repository candidates also exist for:

- `companions-2` Moon Cat — Pixel Party;
- `companions-5` Pebble Turtle — Galaxy Glow;
- `companions-6` Comet Fox — Sunny Pop;
- `companions-7` Story Owl — Aqua Wave;
- `companions-8` Bubble Axolotl — Art Attack;
- `companions-12` Star Unicorn — Adventure Club.

`companions-1` Sprout Pup and `companions-9` Garden Snail still need separate replacement candidates if/when their repair work reaches the front of the queue.

This run did **not** regenerate pending companion art. Under Delivery Protocol v2, improving the missing render evidence is valid non-conflicting work while replacement hashes await review. If reviewer 05 still has not dispositioned these four by the next unchanged cycle, Workstream 06 can use its explicit secondary repair capacity starting with `seating-7..12`, then `shoes-7..12`, both independently reviewed by Workstream 02.

## Checks / preservation

- **PASS — policy:** `DELIVERY_PROTOCOL_V2.md` is the current operational rule.
- **PASS — assignment:** companion production remains owned by Workstream 06; state also grants the explicit secondary repair capacity described above.
- **PASS — legacy companion review:** 12/12 legacy companion hashes are independently REWORK.
- **PASS — replacement storage:** 4/4 rich replacement WebPs are repository-stored with exact blob identities.
- **PASS — shared staged render:** 4/4 replacements rendered successfully in artifact `10663896836`.
- **PASS — continuity:** no companion candidate bytes changed between artifact head and the inspected current head.
- **PENDING — independent replacement review:** Workstream 05 has not yet dispositioned these four replacement hashes.
- **PENDING — canonical integration:** Workstream 08 may wire only independently accepted exact hashes.
- **0 new assets generated; 0 legacy assets overwritten; 0 canonical mappings changed.**

## Handoff

1. **05:** review the four exact companion replacement screenshots/hashes from artifact `10663896836` immediately.
2. **06:** preserve any rejected replacement hash and repair only that ID; if accepted, leave it unchanged and advance the next bounded companion batch.
3. **06:** if these remain unchanged/pending next cycle, begin the explicit secondary repair capacity with `seating-7..12`, then `shoes-7..12`, without self-approval.
4. **08:** integrate only exact companion replacement hashes independently accepted by 05 plus automated metadata/file/content checks.

**No avatar UI, item/equipment IDs, ownership, Buddy Bond, saves, pricing, learning/economy logic, canonical manifest/runtime, Replit/Floot, or `main` was changed.**
