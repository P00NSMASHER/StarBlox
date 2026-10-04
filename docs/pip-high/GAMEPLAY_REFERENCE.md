# Pip High gameplay reference and coordination contract

Source: three user-provided gameplay screen recordings of Roblox High School 2 (October 4, 2026). They are visual direction only. Build original assets, UI, writing, and mechanics; do not copy branded marks, map geometry, icons, or protected art.

Observed reference targets:
- Bright white, red, and blue campus with large school entrance, readable hallways, colored floor routing, classroom doors, gym/basketball court, outdoor roads and landscaping.
- Third-person avatar movement with clear status/name, school time/period at top, compact action icons at bottom, vertical secondary-action rail at right. Readable on phone; HUD must render even when gameplay services are delayed.
- Classes have meaningful activities and visible completion feedback, points/XP, and a report card/progression view.
- Free roam extends beyond classes: travel destinations, housing, jobs, sports, and short minigames. These are phased feature targets, not proof they already exist.
- Tone: colorful, lively, navigable, short interactions and immediate feedback. Prioritize original design and usability over literal visual duplication.

Source-of-truth repository: P00NSMASHER/StarBlox. High school code currently lives on rebuild/high-school-integration, under school/src; draft PR #188 proposes clock and three class activities. Confirm current branch, PR, CI, and Roblox publish revision on every run. Never claim a feature is live from source code alone.

Ten hourly lanes, numbered 01–10: (01) integration/director, (02) campus layout, (03) UI/mobile, (04) schedule and classes, (05) progression/report card, (06) free roam/travel/housing, (07) sports/jobs/minigames, (08) art and sound direction, (09) independent QA/performance/accessibility, (10) release/automation reliability.

Handoffs: work on an isolated automation/pip-high-NN branch or existing PR, inspect sibling PRs first, make one focused verified increment per run, and record changed files/tests/evidence/PR/blocker/next step. Lane 01 sequences dependencies and flags conflicts. Lane 09 independently checks producer work; lane 10 tracks CI and publish parity. No blind merges or production publishing; do not change secrets, billing, or player data. If blocked, fix a verifiable upstream issue or provide a concrete handoff. Staggered hourly schedules provide recurring work, not continuous execution.
