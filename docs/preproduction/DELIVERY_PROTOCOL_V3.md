# StarBlox Delivery Protocol v3 — Catalog Repair Critical Path + Exact Screenshot Finish

User direction (2026-09-21): optimize the same 15 active scheduled tasks to finish StarBlox as quickly and thoroughly as possible and make the finished game match the supplied reference screenshots as closely as technically possible.

## Global rules

- Repository: `P00NSMASHER/StarBlox`
- Branch: `screenshot-match-preproduction`
- Do not update/publish/build through Replit or Floot during preproduction.
- Do not merge to `main`, deploy elsewhere, buy services, change paid settings, or alter real player records.
- Preserve all player progress/inventory, 192 stable permanent Store IDs, prices/unlocks, learning evidence, approved source-bound curriculum, child-safety rules, and original StarBlox identity.
- Never count scheduling activity, a status label, a generated collage, a local ZIP, an unreviewed candidate, or XML validity as completed visual work.
- Existing hash-bound PASS evidence may be reused while relevant runtime/assets are unchanged. Rerun affected gates after real changes; run full suites only at coherent milestones.
- No worker may approve artwork it authored. Every final asset version needs at least one qualified independent exact-hash rendered ACCEPT.
- Keep previous/rejected asset versions for audit/revert.
- No force-push. Re-read latest branch before writes and preserve concurrent work.

## Current critical-path reality

The old catalog labels are not screenshot-quality proof. Independent review has already found multiple entire families below the premium dimensional target. Replacement production, rendered review, and incremental canonical integration are therefore the catalog critical path.

Priority order:
1. Close any verified P0 save/learning defect.
2. Attach/generate premium replacement art for known REWORK items.
3. Render replacement hashes in the shared staged-art fixture.
4. Independently review exact replacement hashes.
5. Integrate each accepted micro-batch immediately.
6. Run change-aware Store/mobile/learning/persistence checks.
7. Repeat until 192/192 current hashes are accepted and canonical.
8. Switch automatically to GAME_FINISHING.
9. Fix remaining Store/Quest geometry and final character/environment/logo/material/reference fidelity.
10. Freeze a release candidate and run full final gates.

## Hourly dependency chain

Use one run per hour per task, staggered to shorten handoff latency:
- :00 Workstream 15 — reconcile prior cycle and assignments.
- :03 Workstream 03 — desks / assigned repairs.
- :06 Workstream 04 — lighting / assigned repairs.
- :09 Workstream 06 — companions / assigned repairs.
- :12 Workstream 07 — rugs + assigned Tops repairs.
- :15 Workstream 09 — decor + assigned Tops repairs.
- :18 Workstream 11 — auras / assigned repairs.
- :22 Workstream 14 — render fixture + its review partition + release QA.
- :27 Workstream 01 — its independent review partition + non-overlapping repair queue.
- :31 Workstream 02 — its independent review partition + non-overlapping repair queue.
- :35 Workstream 05 — its independent review partition + non-overlapping repair queue.
- :40 Workstream 08 — integrate every newly accepted exact hash.
- :45 Workstream 12 — learning/evidence guard on changed head.
- :50 Workstream 13 — persistence/economy/browser stress on changed head.
- :55 Workstream 10 — Store/mobile/accessibility/performance + screenshot-capture support.

Completion order can differ; each worker consumes the latest completed hash-bound outputs available at run start.

## Review partitions

- 01 reviews Tops, Bottoms, Headwear, Facegear.
- 02 reviews Shoes, Backgear, Handgear, Seating.
- 05 reviews Beds, Desks, Companions, Auras.
- 14 reviews Lighting, Wall, Rugs, Decor.

Each reviewer creates/maintains only its own `docs/preproduction/catalog-sprint/reviews/NN.json`. One qualified independent ACCEPT for the current exact hash plus required automated checks is enough for Workstream 08 to integrate that item. A genuine disagreement blocks only the affected item.

Review actual pixels at Store-card and detail scale. Judge exact identity/theme/tier, silhouette, 3D construction, materials, lighting, camera/framing, tier progression, originality, and inappropriate near-duplicate reuse. Flat frontal vector treatment, generic recolors, simple geometry, icons, emoji, promotional grids, and text-only stand-ins do not satisfy the target.

## Repair production pool

Existing primary producers keep their owned categories, but reviewed REWORK families must never wait for an interactive-chat-only owner or an idle lane. Workstream 15 assigns exact non-overlapping repair IDs to producers that do not review those families.

Current repair routing:
- 01: Seating 2–6.
- 02: Beds 1–12.
- 03: Desks 2–12; then available unowned repair IDs assigned by 15.
- 04: Lighting 1–12; then Shoes 1–6.
- 05: Bottoms 1–12; Wall repairs after reviewer-14 findings.
- 06: Companions 1–12; then Seating 7–12 and Shoes 7–12 as capacity permits.
- 07: Tops 1–6, plus Rugs 1–12 when reviewer-14 findings arrive.
- 09: Tops 7–12, plus Decor 1–12 when reviewer-14 findings arrive.
- 11: Auras 1–12; then a non-self-reviewed family assigned by 15.
- CHAT seating candidates remain historical versions only; scheduled tasks own any required replacement work.

Never double-assign a current replacement version. Workstream 15 records exact ownership before a producer begins. Replacement work takes priority over generating more legacy review candidates when a reviewed defect is actionable.

## Asset-generation and binary-delivery rule

Before a worker produces a large batch, prove a supported path from generated image bytes to a versioned repository path and exact readback. Supported binary transfer already exists through Git/GitHub blobs/tree/commit/ref with non-force branch updates; use it where authorized. Preserve full-quality originals and only claim optimized derivatives when measured.

A local-only file is GENERATED_LOCAL, not STAGED. A Git blob object not attached to a branch path is PRESERVED_BLOB, not STAGED. A repository path with exact readback is STAGED. A staged image becomes ACCEPTED only after independent exact-hash pixel review. It becomes CANONICAL only after Workstream 08 integration and applicable checks.

## Canonical integration

Workstream 08 alone writes `catalog-art-manifest.json` and `src/catalogArtRuntime.js` during catalog work.

Integrate accepted items in small coherent batches as soon as they qualify. Do not wait for all 192, an old monolithic review file, or unrelated screen geometry. Validate exact metadata, stable ID, file existence/decode, unique content/path, safe format, and review evidence. After mapping changes, run affected catalog tests/build and Store checks. Keep legacy `final-portable` counts separate from v3 independently accepted/current-hash counts.

## Catalog gate

Only Workstream 15 changes phase to GAME_FINISHING. Catalog PASS requires:
- exactly 192 permanent IDs remain;
- every current final image is stored, correctly mapped, unique, item-specific, and independently accepted by exact hash;
- no interim/placeholders or unresolved art defects;
- exact-content and rendered near-duplicate checks pass;
- canonical manifest/runtime agree with current files;
- applicable catalog tests/build pass;
- actual Store desktop and phone loading/scrolling/readability checks pass;
- no catalog-induced P0 learning, save, economy, or accessibility defect.

Unrelated Store/Quest layout geometry does not block the catalog phase switch.

## GAME_FINISHING

After catalog PASS, every task resumes its normal specialty automatically. Prioritize measured release defects over speculative redesign:
- Home: preserve current structural PASS and finish visual/material/character/reference fidelity.
- Store: fix avatar-stage size, selected-detail height, collection strip and value-panel lower-band geometry; preserve exact catalog art and real states.
- Quest: fix header, phase-strip, avatar/body/mastery/earned-summary geometry without touching answer/evidence correctness.
- Avatar/Buddy: true layered equipment and try-on; owned gear overrides reference outfit.
- Environments: final dimensional room/learning/store scenes and five-tier room progression.
- HUD/logo: final shared chrome/reference fidelity.
- Motion/accessibility/performance: bounded feedback, normal/reduced-motion, touch/keyboard/contrast/screen-reader/device evidence.
- Persistence: real-browser timing/replay/re-entry and migration/recovery proof using synthetic isolated profiles.
- Learning: semantic source fidelity, exactly one defensible answer, five-action flow, clue/retry evidence separation and real-browser interaction proof.

Do not add multiplayer, social systems, new curriculum, economy redesigns, or other scope not required for release.

## Exact screenshot target and reference pixels

The original three user screenshots remain the authority. Use the frozen screenshot/design contracts for development, but pixel-identical claims require the actual original reference pixels. Generated promotional collages are never reference evidence. If the original reference image files remain unavailable to repository/QA tooling, Workstream 15 must record that limitation and request one concrete user action before final pixel-parity sign-off rather than silently lowering the standard.

When reference pixels are available, Workstream 14 owns deterministic capture/diff at 1408×1056 plus responsive checks at 1024, 390, and 320 widths. Fix visible hierarchy, geometry, material, lighting, typography, crop, character, and polish mismatches; do not game the comparator by hiding content or replacing the app with a static image.

## Final release gate

Freeze an exact candidate runtime + asset-set hash. Run clean full tests/build and critical browser/reference/accessibility/performance/persistence/learning checks against that candidate. Prepare rollback/migration notes and actual screenshots.

`READY_FOR_SINGLE_REPLIT_INTEGRATION` means development is staged and verified; it is not deployment permission. Replit and main remain untouched until the user separately approves final integration.
