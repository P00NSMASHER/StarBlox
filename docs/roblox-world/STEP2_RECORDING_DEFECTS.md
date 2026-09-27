# Step 2 — paired recording defect requirements

Audit date: 2026-09-27. Status: partial visual/flow evidence; no implementation or publication. Timestamps below are approximate recording-relative ranges, not simulation time. Observations do not establish underlying code causes.

## Evidence

- R1: `ScreenRecording_09-27-2026 06-32-17_1(1).mp4`, 83.67 seconds, stored 1112x512. Brookhaven branding and gameplay identify the reference. Shows town traversal, vacant plot, a placed house, and tool/vehicle catalog views. Exact place version and hardware are unknown.
- S1: `ScreenRecording_09-27-2026 06-34-01_1(1).mp4`, 69.63 seconds, stored 512x1112 with landscape content sideways. Rotate for comparison, without interpreting the encoding as a gameplay defect. Shows StarBlox playtest, Home Cams, four-question math lesson, avatar editor and house chooser. Exact runtime build is not proven by the clip.
- Both normalize to a comparable landscape aspect ratio. Matching physical device and graphics settings are not independently established. These clips do not cover every object or end-to-end flow.

SHA-256: R1 `07ad3a96e572eb91092fb1d077cd6e9f765f06938146d6db893fc8a52c404e4c`; S1 `4e0cc3a674d7655edaff0599c5506d6a63a95d10fe4f0e9c59799ac4ef33ea5a`.

## Testable differences

| ID / priority | Evidence and observation | Required pass result | Verification |
| --- | --- | --- | --- |
| REC-01 / P1 | S1 ~0–23s: school prompt dominates upper-middle play area; clock/status bands compete. R1 ~10–80s: compact reference HUD. | One coordinated HUD layout; no overlap among native controls, school status, Home Cams or menus; player/navigation remain visible outside deliberate full-screen panels. | Compare matched landscape frames and safe-area bounds on phone, tablet and computer, including menu-open states. |
| REC-02 / P0 | S1 ~10–23s: Home Cam view is dominated by a nearby gray wall; the view remains after its panel closes. | Camera cycling reaches usable reference-aligned views; close restores player camera subject/type and normal orbit/zoom. Repeat after respawn, lesson and house travel. | Record each transition; inspect camera state and obstruction before/after. A changed label alone fails. Cause remains unverified. |
| REC-03 / P1 | S1 ~5–23s and ~65s: oversized JOIN CLASS card covers the world. | A compact contextual invitation provides class, location and one action; yields to town menus and disappears when completed or ineligible. | Walk, open each menu, enter/leave class and complete it; inspect visibility at every state. |
| REC-04 / P1 | S1 ~25–43s: large plain white/gray question panel with substantial unused space and weak visual hierarchy. | School panel has consistent typography, spacing and controls; readable questions/answers, explicit progress/feedback, safe close behavior, no overlap with native controls. | Screenshot every question/feedback/completion state; tap every choice and close/reopen. School is an intentional addition, not a reference clone. |
| REC-05 / P0 | S1 ~43–50s completion transition followed by JOIN CLASS again near ~65s during the same displayed Math period. | Completed class remains completed for that class-session ID; prompt changes to completion/next class, not a fresh join. Retries cannot duplicate attendance or reward. | Complete once, reopen UI, leave/rejoin server and repeat submit; verify persisted state and exactly one reward. Recording does not prove whether duplicate rewards currently occur. |
| REC-06 / P1 | S1 throughout: several right-rail controls appear as outline-square glyphs, unlike R1's pictorial rail. | Every action has its correct loaded image/icon, recognizable at phone size; no unsupported-glyph boxes or blank placeholders. | Check asset loading and every rail/menu state on each device; record image IDs and screenshot mapping. |
| REC-07 / P1 | S1 ~55–63s: avatar/house UI styling and layout differ visibly from R1 catalog views ~45–70s. | Match reference menu anchoring, tile artwork, sizing, selected state and open/close behavior; school HUD respects menu focus. | Side-by-side captures per menu and catalog page, with control-level mapping to source ledger. Missing legacy assets remain explicit gaps. |
| REC-08 / P0 | S1 ~60–63s shows House #5 / Your plot / GO HOME / BUY-CHANGE, but does not demonstrate a successful complete home journey. R1 ~30–45s shows vacant plot then a rendered house. | Claim/select/purchase as applicable -> house appears -> enter -> leave -> GO HOME reaches owned house safely; rejection has clear reason and no charge. | Record full flow and verify ownership/currency on server, including competing players and rejoin. Status: unverified, not proven broken by this clip alone. |
| REC-09 / P0 | S1 lesson runs over the wall-dominated view; recording does not establish attendance at the intended classroom. | Schedule directs player to the actual school and correct room; attendance requires the defined classroom conditions; lesson/reward state cannot substitute a camera view for physical presence. | Trace town -> school entrance -> classroom -> attendance -> lesson -> reward -> exit with player position and server attendance evidence. Location defect remains unverified. |

P0 = blocks dependable core flow; P1 = blocks presentation acceptance. These are triage priorities, not measured implementation difficulty.

## What the clips do and do not prove

- Confirmed visual failures: HUD crowding, oversized prompt, inconsistent school/menu presentation and square-like action glyphs.
- Observed transitions requiring investigation: Home Cam close leaves a wall-dominated view; class invitation returns after lesson completion.
- Not proven: gray-scene root cause, purchase failure, successful home teleport, duplicate reward, wrong physical classroom, persistence or multiplayer correctness.
- Reference shows a richer live presentation than the pinned legacy source can currently certify. Keep legacy source identity and modern reference evidence separate.
- Still missing: uncapped asset inventory (especially image/audio/animation references), per-item runtime mapping, complete building/catalog flows, phone configuration confirmation, tablet/computer comparison, network/rejoin/multiplayer tests and measured performance.

Step 2 remains open. Do not advance to restoration or claim exact parity based on these clips.
