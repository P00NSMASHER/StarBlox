# CHAT intake 01 — durable candidate-art delivery

Checkpoint: **CATALOG-CHAT-INTAKE01-CANDIDATE**  
Asset commit: `3188204700c41b0196da112b55a0a74631198d65`  
Status: **FILES COMMITTED / INDEPENDENT ACCEPTANCE PENDING**  
Canonical final-count delta: **0**  
Replit/Floot/main/deployments: **untouched by this pass**

## What actually landed

32 actual image files for 11 catalog items, plus item-specific metadata and hash evidence. Ten companion sets reuse the existing high-resolution image-generation attachments from this conversation; they are not ten new generations. One additional Moon Chair image is an individual crop recovered from a generated sheet after an Adobe edit, not a claim that the originally requested seating batch succeeded.

All files below are under `public/assets/catalog-candidates/chat-20260921-intake01/` (served path prefix `/assets/catalog-candidates/chat-20260921-intake01/`). Companion sets each include `<id>-source.png` at 1254x1254, `<id>-card.webp` at 256x256, and `<id>-detail.webp` at 768x768. Existing canonical SVGs were not overwritten.

| Exact ID | Name | Candidate card file | Disposition |
| --- | --- | --- | --- |
| companions-2 | Moon Cat | companions-2-card.webp | HOLD_THEME_REVIEW — Pixel Party identity not established |
| companions-3 | Berry Bunny | companions-3-card.webp | READY_FOR_INDEPENDENT_REVIEW |
| companions-4 | Sunny Bird | companions-4-card.webp | READY_FOR_INDEPENDENT_REVIEW |
| companions-5 | Pebble Turtle | companions-5-card.webp | HOLD_THEME_REVIEW — Galaxy Glow identity not established |
| companions-6 | Comet Fox | companions-6-card.webp | HOLD_THEME_REVIEW — Sunny Pop identity not established |
| companions-7 | Story Owl | companions-7-card.webp | HOLD_THEME_REVIEW — Aqua Wave identity not established |
| companions-8 | Bubble Axolotl | companions-8-card.webp | HOLD_THEME_REVIEW — Art Attack identity not established |
| companions-10 | Pixel Bot | companions-10-card.webp | READY_FOR_INDEPENDENT_REVIEW |
| companions-11 | Dream Dragon | companions-11-card.webp | READY_FOR_INDEPENDENT_REVIEW — confirm Candy Core interpretation |
| companions-12 | Star Unicorn | companions-12-card.webp | HOLD_THEME_REVIEW — Adventure Club identity not established |
| seating-11 | Moon Chair | seating-11-card.png | READY_FOR_INDEPENDENT_REVIEW — Tier 4 / Galaxy Glow |

Moon Chair source is `seating-11-source.png` at 410x300 (130179 bytes); its padded card is 256x256 (69831 bytes). Do not pretend it is a full-resolution 3D render or upscale it as newly added detail. The companion card variants total **133462 bytes**; detail variants total **636312 bytes**. Source PNGs are retained for future lawful project edits, not intended as scrolling-card downloads.

Five candidates are ready for a different reviewer's assessment; six companion sources are explicitly on theme-review hold. **None is independently accepted in this report.** Companion owner 06 retains production ownership, reviewers 01/14 own acceptance, and 08 alone owns canonical manifest/runtime promotion.

## Executed verification

- Local image full-decode/hash checks: PASS for the 20 companion WebP variants; 10 source PNGs also loaded and matched their recorded source hashes.
- Local deterministic rebuild checks: PASS for 20 companion variants.
- Local safe-import tests: PASS for hash-verified extraction, identical rerun, rejection of conflicting existing bytes, and rejection of path traversal.
- Import workflow `35637260171`, job `106457599573`: SUCCESS.
- Existing regression suite: **84/84 tests, 19/19 files PASS**.
- Production Vite build: **PASS**.
- Tests ran against source head `f371e00ca215752c29ae67bb548e2005ad5fced5` with the candidate files staged. Safe rebase then preserved a concurrently added `integration.md`; comparison to asset commit `3188204...` contains only candidate images and documentation, not additional runtime changes.
- Archive SHA-256 verified in the runner: `e0458a2e5d04662fb332ef9a8c194e890b19440aab2d98dccb641d8e5388fc69`.
- 30 companion source/variant byte hashes are distinct; Moon source/card hashes are recorded in `chat-intake01-import.json`. This does not substitute for full-catalog near-duplicate review.
- TypeScript typecheck: NOT APPLICABLE; this pass changes no TypeScript or app logic. Python importer compilation passed.
- Individual companion contact sheet and Moon crop/padded-card pixels: inspected in chat.
- Independent final visual acceptance and actual Store-context/phone-scrolling verification of these candidates: **PENDING / NOT TESTED**.

## Failed generation and transfer attempts

Two native image generations (`643883ca-eb5b-48d1-8aa6-643e80e32311`, `1c0fea6f-2760-4b04-b3be-c05f0f8e6ade`) returned promotional grids with invented item IDs and completion numbers instead of the requested four-object and then single-object outputs. Their claims of 12 completed items / 111 of 192 are **false as project status** and must not be used. The sheets themselves were not wired as catalog assets.

The Adobe edit also failed the requested four-item layout. Its usable Moon Chair was isolated and checked as a single candidate; the other requested seating items were not silently counted complete. The initial automated square crop included neighboring objects and was rejected; the corrected crop removes them.

Two incomplete Sunny Bird binary transfers produced unlinked blobs. Neither was attached to a branch/tree. The valid Berry Bunny card was subsequently imported through the verified archive with all other companion variants; no production duplicate was introduced.

## Coordination and next action

While this import ran, another interactive seating handoff appeared in `lane-CHAT.md` with 11 SVG candidates. This report deliberately does **not** overwrite that handoff or those files. The PNG Moon Chair here is an alternate candidate for the same item, never a second catalog item. Reviewers should compare actual render quality and select a single accepted version.

01/14: assess these exact files against real names/themes/tiers and original screenshot quality; return item-specific ACCEPT/REWORK/BLOCKED tied to hashes. 06: use the preserved original companion PNGs for any evidenced theme corrections, avoiding unnecessary regeneration. 08: promote only accepted candidates through exact stable-ID mapping. 15: reconcile both seating deliveries before assigning new repairs.

Next CHAT production remains seating-2 Cloud Pouf, seating-3 Pixel Beanbag, seating-4 Heart Chair, and seating-5 Reading Chair **only when current reviewer evidence identifies a repair need**; do not regenerate the concurrently staged SVGs blindly. If those are accepted, proceed to the next actually unfinished/assigned seating item after reading the live control file.

At the asset checkpoint, canonical manifest v12 still records **99/192 final-portable, 93 non-final, 23 interim, zero recorded duplicate paths**. These are legacy registry labels, not 99 newly proven screenshot-quality approvals. No final count was increased by this candidate intake.
