# Screenshot-Match Preproduction Coordination

## Live state authority — accelerated finishing

While `docs/preproduction/art-factory/ACTIVE_BATCH.json` has an active release-blocker status, current execution state is resolved in this order:

1. the current `screenshot-match-preproduction` branch head;
2. `catalog-art-manifest.json` and `src/catalogArtRuntime.js`;
3. `docs/preproduction/art-factory/ACTIVE_BATCH.json`;
4. exact current-hash review, provenance, render, and handoff evidence.

Older rollups such as `COMMAND_CENTER.md`, `CATALOG_SPRINT_STATE.json`, `catalog-sprint/integration.json`, `catalog-sprint/release-qa.json`, and `catalog-sprint/mobile-qa.json` are historical evidence unless their recorded source head / manifest version explicitly matches the live branch. They must not override the live manifest or ACTIVE_BATCH assignments and workers should not spend cycles reconciling stale counts.

Acceleration routing while visible fallback art remains:
- 07: exact-byte recovery/import for already-generated fallback assets;
- 09: Decor 5/7 only;
- 03: one provenance-compliant replacement version for Decor 6/8 after a compliant generator runtime is available;
- 13: revision/provenance-capable generation-runtime unblock, then Wall 9-12 production;
- 10: final browser/mobile/reference QA continuously in parallel rather than waiting for catalog completion.

Workstream 15 keeps these four release slots non-overlapping and reassigns an idle slot after one blocked cycle without bypassing the 2–4 item pilot rule or independent review.

## Active priority — catalog first

User direction (2026-09-21): finish the catalog first, then return to normal development and finish the game. Read `docs/preproduction/CATALOG_SPRINT_STATE.json` and `docs/preproduction/CATALOG_SPRINT.md` before normal workstream instructions. While phase is `CATALOG_SPRINT`, use the temporary exclusive assignments there: eight art-production lanes, independent quality review, single-writer manifest integration, safety guards, and Command Center. Do not continue unrelated screen redesigns or take another lane's items. Only 15 changes the phase after the verified 192-item catalog gate; all tasks then resume their normal roles automatically. A raw `finalCount: 192` does not satisfy the gate. Keep existing schedules; do not create replacement tasks. A missing/unreadable control file is BLOCKED, not permission to deploy or guess the phase.

## Operating rule
All development happens on `screenshot-match-preproduction` until the full visual rebuild is integrated, tested, and signed off. **Do not call Replit update/publish tools and do not merge to `main` during preproduction.** Do not use Floot as an alternate production or image-generation target.

## Shared priorities
1. Match the three screenshot references in hierarchy, density, visual language, and polish.
2. Preserve learning correctness and source-grounded question behavior.
3. Preserve all save/inventory/economy state.
4. Keep assets original and child-safe.
5. Maintain responsive phone/tablet usability and performance.
6. Integrate once, near the end, to minimize Replit credits.

## Normal workstream ownership — resumes after catalog gate
01 Visual target / design tokens
02 HUD + shell + navigation
03 Home screen
04 Store screen
05 Quest screen
06 Avatar + companion presentation
07 Progression / Dream Goal / Daily Quest widgets
08 Catalog-art pipeline
09 Environment / room backgrounds
10 Responsive + accessibility
11 Motion / game-feel polish
12 Learning correctness integration
13 Persistence + economy safety
14 QA + performance + visual regression
15 Command Center / integrator

## Coordination contract
- Inspect the branch head before each change.
- Read `VISUAL_NORTH_STAR.md`, `RELEASE_STATUS.md`, `QUESTION_QA_LEDGER.md`, `catalog-art-manifest.json`, and `docs/preproduction/SCREENSHOT_MATCH_TARGET.md` when relevant.
- Stay inside the active phase's owned workstream unless a narrow verified safety fix is necessary.
- Do not overwrite another workstream's changes blindly. Read the latest file SHA before every write; never force-push.
- Prefer additive components/modules over giant rewrites of `src/App.jsx`; the Command Center owns final consolidation.
- During the catalog sprint, production handoffs go under `docs/preproduction/catalog-sprint/`; normal workstream notes remain intact for the later return.
- In normal development, update the workstream note under `docs/preproduction/workstreams/` with STATUS, changes, tests, visual gaps, blockers and handoff.
- Run relevant tests/build checks before reporting PASS.
- Label anything not actually tested as NOT TESTED.
- No task may update Replit. Command Center may only recommend that final integration is ready; a separate user-approved action will update Replit later.
