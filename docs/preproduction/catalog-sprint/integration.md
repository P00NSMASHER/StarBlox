# Workstream 08 catalog integration

Status: **Wall 1–4 exact-current-hash reviewer-14 ACCEPTs are integrated as manifest v29 and the exact canonical commit has completed catalog/test/build validation; Store/mobile proof remains blocked before Store content. Release is not cleared.**

Canonical art integration commit: `b91a8a9bf7806911d74e6f0972acf019f7056eaf` on `screenshot-match-preproduction`. Evidence refreshed against live branch head `7cf46b2a19af7f9de283b1b3ee68d5473e23bf97`. Replit/Floot/main/deploy/paid settings/player data remain untouched.

## Integrated accepted increment

Reviewer 14 independently reviewed actual current card/detail pixels from producer 05 and ACCEPTED the exact repository hashes for:

- `wall-1` **School Star Poster** — `/assets/catalog/wall-1-w05-v2.png` — blob `9908e774b4012cb89d3c86eed9ca3d10ce3bffe4` — Garden Glow / Tier 1.
- `wall-2` **Cloud Wall Flag** — `/assets/catalog/wall-2-w05-v2.png` — blob `febf517cd0db666f647962c0cb7d4e5af53d4b76` — Galaxy Glow / Tier 1.
- `wall-3` **Pixel Scoreboard** — `/assets/catalog/wall-3-w05-v2.png` — blob `5ad5aff97c9d365221de8c2d888abf3a26db547e` — Sunny Pop / Tier 1.
- `wall-4` **Heart Gallery** — `/assets/catalog/wall-4-w05-v2.png` — blob `bc38aee13c1c4840aa1e9657edfb67c8838a6a21` — Aqua Wave / Tier 2.

Before wiring, Workstream 08 verified exact live repository blobs/paths, authoritative `gameModel` names/tier/theme, scoped 1024×1024 PNG decode/render evidence, reviewer independence, and current catalog path/content uniqueness. The shared staged-art workflow's unrelated Desk failures were not relabeled as a global pass. Existing mappings and prior asset versions remain preserved; stable IDs, prices, unlocks, ownership, saves and gameplay metadata were not changed.

## Strict-count reconciliation

Reviewer 02's schema-10 evidence audit records `seating-7` through `seating-10` as **BLOCKED_EVIDENCE_NOT_DECISION**: producer lane text claimed reviewer acceptance, but reviewer 02's authored lineage has no qualifying visual decision and the required consumable current-hash card/detail pixels were absent. This is not a visual REWORK decision. Their canonical mappings are retained, but the four items are excluded from the strict independent-ACCEPT count until reviewer 02 performs a real exact-hash pixel review.

That correction makes the validated pre-Wall strict floor 87. Integrating the four qualified Wall ACCEPTs produces **91/192 independently accepted current hashes canonically wired**, not 95.

## Current counts

Manifest v29 has **168 canonical mappings**, **161 legacy `final-portable`**, **7 legacy interim-not-verified**, and **31 IDs outside the legacy final set** relative to the 192 target. The stricter V2 count is **91/192 independently accepted current hashes canonically wired**, leaving **101 strict remaining**. Release-cleared remains **0/192**.

Generated-local this increment: 0. Preserved-blob-only: 0. Newly branch-staged: 0. Qualified ACCEPTs consumed: 4. Strict canonical delta from the reconciled floor: +4.

## Exact-commit validation

On canonical commit `b91a8a9bf7806911d74e6f0972acf019f7056eaf`, StarBlox CI run `35720030954` / job `106720519290` completed successfully. The normal suite passed **22 test files / 99 tests**, including all four `catalogManifestQa` release invariants, catalog asset safety, the three Store screenshot-match runtime tests, and the retained learning/persistence/economy regression gates. The separate art-factory contract tests passed **12/12**. The production Vite build also passed (`vite 8.3.0`, 1,613 modules transformed).

The changed-art Store/mobile run `35720030949` / job `106720518752` built the production bundle successfully, then failed only after attempting to open Store. Artifact `10690563316` reports **6 release-blocking Store-navigation click timeouts before Store content opens**: reduced-motion 1408×1056, 1024×768, 390×844 and 320×568, plus normal-motion controls at 1024×768 and 390×844. This remains a shared navigation/fixture release blocker. It is **not** recorded as Store art proof, no assertion was weakened, and the independently accepted Wall mappings are not rolled back.

Workstream 08 has no separate screenshot-parity PASS for this Wall batch and makes no parity claim.

## Live review queue after validation

Reviewer 01 has no new qualified ACCEPT; Tops 11–12 v6 remain evidence-blocked. Reviewer 02 has no new qualified ACCEPT and Seating 7–10 remain evidence-blocked rather than visually rejected. Reviewer 05 has now independently reviewed current exact hashes for Companions 2/5/6/7 from actual card/detail pixels and returned **REWORK 4/4**, so none is integration-eligible. Reviewer 14's Wall 1–4 ACCEPTs are fully consumed by v29; no newer qualified exact-hash ACCEPT is present in the current reviewer shards.

Only Workstream 15 may declare ART_VISUALS_COMPLETE or change phase. Catalog/art completion does not authorize deployment.
