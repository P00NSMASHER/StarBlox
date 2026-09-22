# Catalog Sprint — Workstream 10 Small-Card / Mobile Visual QA

STATUS: **PARTIAL — MANIFEST v24 RESPONSIVE STORE EXECUTION IN PROGRESS; NO RESULT CLAIMED YET**

Branch: `screenshot-match-preproduction`  
Audited branch head before this report: `557068a467d3ff45f8d360bfaa8544e5ab5b04fe`  
Phase: `ART_VISUALS_SPRINT`  
Catalog gate: **NOT APPROVED by Workstream 10**  
Replit/Floot/main/deployment: **untouched**

## Change-aware canonical Store QA

The canonical catalog advanced to **manifest v24** with the independently accepted Seating replacements below. Workstream 10 is not extending older browser proof to these new hashes and did not start a schedule-only duplicate full matrix.

- `seating-1` Floor Cushion — `50d5e16c2bd2647be4701e0c10b3ff9d786f41e1` — SVG
- `seating-11` Moon Chair — `5126e9abcec4a09ef281dccb33aac6ba59b38b94` — 768×768 PNG
- `seating-12` Throne Chair — `793b32f60ed10fffa80b549e75b66858ac0d7e4f` — 768×768 PNG

Manifest v24 blob: `1da7f25e408e24b5130b4bb07af3a507ae8a46ff`  
Runtime blob: `bdb28c0c5f445adf99879f62425ef896e22249ac`

Workstream 08's exact-path/blob checks, safe decode/render checks, catalog assertions, Store runtime tests and production build passed for the three canonical mappings. Its first changed-art mobile run did **not reach catalog content**: real Store-navigation pointer actions timed out before content at the attempted viewports. That is labeled **`STORE_ENTRY_POINTER_TIMEOUT_BEFORE_CATALOG_CONTENT`** and is not evidence that the Seating art itself failed.

A fresh Workstream-10 change-aware browser execution is active as run `35687790334`, job `106618237485`, triggered from `5c7af5f68b5fc229c250702f6d26b6fa4dacebbb`. Scope, dependencies, Playwright installation, production build and local preview completed; the real Store browser step is still executing. Until it finishes and produces bound evidence, `1408×1056`, `1024×768`, `390×844`, `320×568`, normal/reduced motion, two-column phone layout, crop/contain, detail composition, scrolling and layout stability are **IN PROGRESS / NOT YET CLAIMED**, not PASS or FAIL.

The harness preserves real pointer failure as a release blocker. Keyboard continuation is diagnostic only and cannot convert a pointer failure into PASS. No forced DOM click is used to hide the interaction defect.

## Newly accepted staged art — Shoes 7–10

Reviewer 02 independently accepted four new producer-06 exact hashes. Shared staged fixture evidence contains real card/detail pixels at a 210px-high card image with `object-fit: contain`; reviewer 02 records small-card readability PASS for all four:

| Item | Exact hash | Staged small-card result | Canonical responsive Store |
| --- | --- | --- | --- |
| `shoes-7` Chunky Sneakers | `cb8f02aaa4844d1a19a013edc3d0d1a15c0620a2` | PASS | Not applicable until Workstream 08 wires this exact hash |
| `shoes-8` Trainers | `1aa21e1156f7645fc218402c337d2eebe95d81f8` | PASS | Not applicable until Workstream 08 wires this exact hash |
| `shoes-9` Paint Kicks | `ff5e914eb935194a1541cebf5421264e5da2d543` | PASS | Not applicable until Workstream 08 wires this exact hash |
| `shoes-10` Light Shoes | `489e37f25644d13a4ca9518f4047ebfb35747a47` | PASS | Not applicable until Workstream 08 wires this exact hash |

Evidence: staged-art workflow `35687207417`, artifact `10676873799`; contact-sheet SHA-256 `b869165362828b7ebfab2f601a227276fd2d375843bc6c03b05fe67dec14fad2`. Workstream 10 does **not** self-approve these assets and does not modify canonical mappings. Their real 1408/1024/390/320 Store behavior becomes Workstream-10 scope only after canonical integration.

## Tops 11–12 v6 — evidence blocker, not a visual rejection

Reviewer 01 independently blocked the current v6 hashes because qualified shared card/detail pixels do not exist for them:

- `tops-11` Cloud Jacket — `061a749472ad71e61732ac3a9629c42d54b4e580`
- `tops-12` Star Coat — `e9d462cb222c2ff20e220e237cb3890e1e6eb76c`

Structured Workstream-10 handoff label for both: **`SHARED_SIGNATURE_GATE_FAIL_NO_QUALIFIED_CARD_DETAIL_PIXELS`**.

The shared fixture reported invalid file signatures for the exact repository blobs, and two render attempts failed to produce qualified card/detail pixels. The prior v5 Workstream-10 visual signals are therefore **not transferred to v6**. These v6 assets are evidence-BLOCKED, not visually REWORKed, and Workstream 10 will not compensate by changing Store UI.

## Reused proof and evidence boundaries

The last complete historical Workstream-10 browser proof remains run `35659760652`, job `106532044131`, artifact `10667595844`, source head `8a2c53aa2133baef23e263d8dda8b2a180dffe19`. It covered all 16 collections at `1408×1056`, `1024×768`, `390×844`, and `320×568` in headless Chromium, with phone two-column layout, focus/keyboard checks, overflow, full-scroll reachability, reduced motion, normal-motion controls and scroll/layout probes.

That artifact is reused **only for unchanged hashes and responsive guards**. It is not proof for manifest-v24 Seating art, Shoes 7–10 before integration, or Tops 11–12 v6.

Physical iPhone/iPad/Android performance and VoiceOver/TalkBack/NVDA remain **NOT TESTED**. Browser viewport emulation is not physical-device or screen-reader proof.

## Original visual target

The authoritative original Store screenshot remains `docs/preproduction/reference-screenshots/originals/store-1448x1086.jpeg`, SHA-256 `b26cb14947d85258bcfff211174e54f34f2e2a11b83c73560b2365167071071d`. Home and Quest originals remain alongside it. Desktop originals are the visual target; 1024/390/320 are responsive usability targets, not invented exact-reference images.

## Handoff

**Workstream 15:** if the real Store pointer-entry timeout persists in the active run, coordinate the shared-entrypoint repair. Workstream 10 will not mask it with forced clicks or another global patch layer.

**Workstream 08:** Shoes 7–10 may be canonicalized only at reviewer-02's exact accepted hashes. Once wired, Workstream 10 should run changed Shoes plus a stable control rather than repeating an unchanged full matrix.

**Reviewer 01 / Producer 09:** Tops 11–12 v6 need new signature-valid repository bytes and fresh qualified pixels before independent visual judgment. Preserve item metadata; do not transfer v5 review outcomes.

**Workstream 14:** staged fixture evidence is reusable as staged exact-hash evidence only; keep it distinct from actual canonical responsive Store screenshots.

No canonical mapping, producer art, shared UI, gameplay, learning, economy, persistence, real player data, Replit, Floot, `main`, or deployment state was changed by Workstream 10 in this report update.
