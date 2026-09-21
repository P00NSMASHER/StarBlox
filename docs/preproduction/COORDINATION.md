# Screenshot-Match Preproduction Coordination

## Operating rule
All development happens on `screenshot-match-preproduction` until the full visual rebuild is integrated, tested, and signed off. **Do not call Replit update/publish tools and do not merge to `main` during preproduction.**

## Shared priorities
1. Match the three screenshot references in hierarchy, density, visual language, and polish.
2. Preserve learning correctness and source-grounded question behavior.
3. Preserve all save/inventory/economy state.
4. Keep assets original and child-safe.
5. Maintain responsive phone/tablet usability and performance.
6. Integrate once, near the end, to minimize Replit credits.

## Workstream ownership
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
- Stay inside the owned workstream unless a narrow integration fix is necessary.
- Do not overwrite another workstream’s changes blindly.
- Prefer additive components/modules over giant rewrites of `src/App.jsx`; the Command Center owns final consolidation.
- Update or create a workstream note under `docs/preproduction/workstreams/` with: STATUS, changes, tests, visual gaps, blockers, handoff.
- Run relevant tests/build checks before reporting PASS.
- Label anything not actually tested as NOT TESTED.
- No task may update Replit. Command Center may only recommend that final integration is ready; a separate user-approved action will update Replit later.
