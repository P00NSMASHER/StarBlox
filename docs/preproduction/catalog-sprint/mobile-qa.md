# Catalog Sprint — Workstream 10 Small-Card / Mobile Visual QA

STATUS: **BLOCKED — MANIFEST v27 CHANGED ART CANNOT REACH THE REAL STORE; SAME POINTER-ENTRY FAILURE FOR TWO CONSECUTIVE CANONICAL BATCHES**

Branch: `screenshot-match-preproduction`  
Audited branch head before this report: `dd1603a937f9aad31874cdacd52b340412743e7c`  
Phase: `ART_VISUALS_SPRINT`  
Catalog gate: **NOT APPROVED by Workstream 10**  
Replit/Floot/main/deployment/player data: **untouched**

## Current canonical delta

Workstream 08 advanced the canonical Store to **manifest v27** (`27c77919cfbc5cf52570bf91871338b59cded055`) / runtime `a3b5b2b98a8507f5226191959a3cd91ef6729bdb`, with **90 strict accepted canonical hashes**. The latest change-aware scope is Shoes 7–10 plus Aura 11; unchanged full-matrix proof was intentionally reused only for unchanged hashes.

| Item | Exact Git blob | Independent decision | Staged exact-hash pixels | Actual responsive Store |
| --- | --- | --- | --- | --- |
| `shoes-7` Chunky Sneakers | `cb8f02aaa4844d1a19a013edc3d0d1a15c0620a2` | Reviewer 02 ACCEPT | PASS | **BLOCKED before Store render** |
| `shoes-8` Trainers | `1aa21e1156f7645fc218402c337d2eebe95d81f8` | Reviewer 02 ACCEPT | PASS | **BLOCKED before Store render** |
| `shoes-9` Paint Kicks | `ff5e914eb935194a1541cebf5421264e5da2d543` | Reviewer 02 ACCEPT | PASS | **BLOCKED before Store render** |
| `shoes-10` Light Shoes | `489e37f25644d13a4ca9518f4047ebfb35747a47` | Reviewer 02 ACCEPT | PASS | **BLOCKED before Store render** |
| `auras-11` Dream Aurora | `7f3372c1584e07f18a3abfc7818013190fff1560` | Reviewer 05 ACCEPT | PASS | **BLOCKED before Store render** |

Workstream 08 independently verified stored-path/blob readback, metadata, safe decode/render evidence and runtime/manifest agreement for all five. Workstream 10 did not edit those mappings or decisions.

## Real responsive Store result — blocker confirmed twice

Structured handoff label: **`CANONICAL_STORE_ENTRY_POINTER_TIMEOUT_BEFORE_CARD_RENDER`**  
Legacy equivalent: `STORE_ENTRY_POINTER_TIMEOUT_BEFORE_CATALOG_CONTENT`

The same real-pointer failure occurred on two consecutive canonical art cycles:

- Shoes 7–10: run `35689825441`, artifact `10677978587`, source head `04eb1f4c4a6f9efcd0e6bea9d33e7580740dcfd4`.
- Aura 11: run `35690236073`, artifact `10678253907`, source head `ad8867efc70d1b123cbc5e2f157766bec58e510d`.

Both production builds passed. In the browser gate, the Store nav control was found and reported visible, enabled and stable, scrolled into view, then the pointer click timed out before Store content appeared. The failure affected the reduced-motion probes at `1408×1056`, `1024×768`, `390×844`, and `320×568`, plus the normal-motion controls at tablet and 390px phone widths. Because no changed cards rendered, Workstream 10 makes **no claim** for current-hash two-column phone layout, crop/contain, detail-panel composition, image dimensions/alternatives, long-scroll reachability, layout stability, scroll cost or normal/reduced-motion art behavior.

This is now the second unchanged cycle, so the exact shared-entry blocker is handed to **Workstream 15**. Workstream 10 will not hide it with a forced DOM click, skipped assertion, static overlay or a shared UI patch. Once the entry path is repaired, the next run should be only **changed Shoes/Aura + stable Tops control** at 1408/1024/390/320, not another unchanged 16-collection sweep.

## Workstream-10 direct small-card pixel diagnostic

I directly inspected the exact-hash staged card/detail pixels from staged-art run `35687207417`, artifact `10676873799`, including diagnostic square reductions to **140px and 110px**. This is useful reduction evidence, but it is explicitly **not** a substitute for real 390/320 Store screenshots.

No new artwork-level failure was observed in this diagnostic:

- `shoes-7`: chunky sole silhouette and cloud motif survive reduction.
- `shoes-8`: paneling, pixel mark and cyan/magenta split remain distinct.
- `shoes-9`: paint-splash identity remains visible at the smallest diagnostic size.
- `shoes-10`: emissive sole/side panels and garden-leaf detail remain readable; premium treatment survives reduction.
- `auras-11`: mirrored aurora curtains, open center, floor ring and star/crystal accents remain recognizable and materially richer than a flat ring.

These observations do **not** self-approve any art; Shoes retain reviewer-02 authority and Aura 11 reviewer-05 authority.

## Current structured evidence blockers

**`SHARED_SIGNATURE_GATE_FAIL_NO_QUALIFIED_CARD_DETAIL_PIXELS`** — Tops 11–12 v6 remain evidence-BLOCKED rather than visually rejected. Their prior v5 visual findings do not transfer to the current hashes.

**`EXTERNAL_ONLY_NO_REPOSITORY_HASH_NO_QUALIFIED_CARD_STORE_PROOF`** — Headwear 5–8 currently exist only as preserved external 600×600 derivatives. Their planned repository paths have no exact current blob/hash, so external previews cannot be treated as staged or canonical small-card proof.

## Reused proof boundary

The last complete Workstream-10 browser matrix remains run `35659760652`, artifact `10667595844`, source head `8a2c53aa2133baef23e263d8dda8b2a180dffe19`. It covered all 16 collections at 1408/1024/390/320 in headless Chromium, including phone two-column layout, focus/keyboard, overflow, full-scroll reachability, reduced motion, normal-motion controls and scroll/layout probes. It is reused **only for unchanged hashes and responsive guards**, never as proof for later art.

Physical iPhone/iPad/Android performance and VoiceOver/TalkBack/NVDA remain **NOT TESTED**. Browser emulation is not physical-device or screen-reader evidence.

The authoritative desktop Store visual target remains `docs/preproduction/reference-screenshots/originals/store-1448x1086.jpeg`, SHA-256 `b26cb14947d85258bcfff211174e54f34f2e2a11b83c73560b2365167071071d`. Tablet and phone widths remain responsive-usability targets, not invented reference screenshots.

No shared UI, canonical manifest, producer art, item metadata, gameplay, learning, persistence, economy, real player data, Replit, Floot, `main`, deployment, purchase or paid setting was changed by Workstream 10.
