# Lantern Island — September 28, 2026 deadline sprint

## Mandate
Build the original educational Roblox adventure described in the current user-approved plan. The user redirected the 15 active ChatGPT Brain tasks to this game and requested completion by 17:00 America/New_York on 2026-09-28 (21:00 UTC). This is a delivery target, not permission to fabricate success, weaken safety, or spend without authorization.

The working project is `lantern-island/` on branch `lantern-island/2026-09-28` in `P00NSMASHER/StarBlox`. The branch was created from `502fbc8212b19413e36da89033c016e0ad210a3c`; old code is present in Git history but MUST NOT be included by the new game's project file or imported into its runtime. It is a separate game project housed temporarily in the existing accessible repository, not another Brookhaven patch.

## Delivery definition and order
Aim for the six-mission Grade-2-first Lantern Island MVP, but finish the complete critical loop before expanding: join -> understand objective -> manipulate a learning puzzle -> server-validated outcome -> visible world restoration -> companion cosmetic reward -> equip -> leave/rejoin -> confirmed state restored.

Build one compact original island, a friendly companion, contextual mobile-first interactions, math/spelling/short reading activities, one earned currency, a very small cosmetic collection, and versioned approved lesson packs. Reuse a few interaction mechanics for six missions only after the first mission works. No vehicles, house system, custom avatar editor, Brookhaven assets/scripts, free-text child chat, AI child conversations, live model dependency, paid boosts, trading, public leaderboards, classroom backend, or new paid services.

A smaller verified build must be labeled PARTIAL rather than presented as the finished six-mission MVP. A Roblox source artifact is not a playable deployment; a browser mock is not Roblox runtime proof. Do not invent a play link or a published version.

## Ownership and integration
01 Director: owns this contract, priority decisions and final 17:00 report; no gameplay code.
02 Integrator: sole writer of the canonical sprint branch and sole authorized private-staging publisher, if a separate authorized target is actually available. Owns integration, packaging, rollback and exact release identity.
03 Foundation/runtime: `src/server/Main.server.luau`, `src/client/Main.client.luau`, `src/shared/Protocol.luau`, `default.project.json`, `tools/build*`; prove build/runtime access and connect modules. Shared API changes require a contract handoff.
04 Missions/math: `src/server/MissionService.luau`, `src/shared/MathRules.luau`, `tests/math*`, `tests/missions*`.
05 Spelling: `src/client/SpellingController.luau`, `src/shared/SpellingRules.luau`, `tests/spelling*`.
06 Reading: `src/client/ReadingController.luau`, `src/shared/ReadingRules.luau`, `tests/reading*`.
07 Lessons/content: `content/`, `src/server/LessonService.luau`, `tools/validate_lessons*`, `tests/content*`.
08 Persistence/rewards: `src/server/ProfileService.luau`, `src/server/RewardService.luau`, `tests/persistence*`, `tests/rewards*`.
09 World/art: `src/server/WorldBuilder.luau`, `assets/world/`, `assets/companion/`.
10 Mobile UI: `src/client/UIController.luau`, `src/client/InteractionController.luau`, `assets/ui/`, `tests/ui*`.
11 Audio/feedback: `src/client/FeedbackController.luau`, `assets/audio/`, `tests/feedback*`.
12 Adult authoring: `tools/lesson_editor/`, `docs/lesson-authoring.md`; an offline preview/validation interface first, no student database or login backend.
13 Security/regression: `tests/security*`, `tests/acceptance*`; independent tests, defect reports, no self-approval.
14 Roblox device QA: `evidence/14/`; native-client interaction testing and exact failure evidence, no production code.
15 Performance/delivery: `evidence/15/`, `docs/PLAYTEST.md`; independent package/performance check and handoff, no production code.

Producer lanes 03-13 create/reuse `lantern-lane-NN-20260928` branches from the newest canonical sprint branch. All their changes stay under `lantern-island/`. Open or update one PR per lane targeting `lantern-island/2026-09-28`, NEVER main. Only lane02 integrates. Reviewers may write evidence on their own lane branch. Every lane can write its own `evidence/NN/` and report defects in PR comments. Do not overwrite another lane's files. Re-fetch immediately before writes and before integration; no force pushes. Avoid duplicate PRs and unchanged status-only commits.

At each invocation, read this contract, the current canonical head, your open PR, and fresh handoffs. Make an executable implementation/test/art improvement, not another research plan. If a dependency is not ready, build your isolated module and tests against this contract rather than waiting indefinitely. Hand off exact paths, commit, test commands and runtime limitations. Reuse evidence only when the relevant code/content fingerprints match. Automation tasks are separate scheduled invocations, not a guarantee of continuous parallel workers or completion time.

## Minimal integration contract (v1)
Use standard Roblox character movement. The Rojo project, if used, maps ONLY this subdirectory, never repository-root legacy models/scripts. Server owns mission state, answer checking, reward entitlement, inventory and saving. Client requests actions and displays acknowledged state; it never submits an authoritative balance or completion flag.

Use a shared action envelope with `requestId`, `action`, `missionId`, `itemId`, `payload`; fields apply only to relevant actions. Validate types, lengths, allowed action names, player ownership, active mission/step, distance where relevant, and rate limits. Responses include `requestId`, `ok`, a stable error/status code and only the safe client state. Bounded requestId replay protection and mission/reward identifiers prevent duplicate awards. Exact durable reward semantics must be tested, not inferred from a marker string.

Public lesson prompts and representations are separate from server-only expected answers. A versioned lesson pack has `id`, `version`, `reviewStatus`, `source`, and activities with `id`, `skill`, `type` (math/spelling/reading), public prompt/representation, server answer rule, hints and assistance labels. Start with original clearly labeled sample material. Real current school material requires an authorized actual source and review; do not invent assignments, publish private worksheets, names or school records, or call original sample work current homework. A content digest/version accompanies attempts. Reject unsupported/invalid packs; an older approved pack is labeled older practice.

Record independent success separately from hint-assisted success and copied answers. Reading aloud is audio-supported reading, not proof of independent reading. Administrative reminders stay out of quiz generation. No claim of grade-level mastery or learning gains from mission completion alone.

## Runtime, privacy, permissions and budget
Use existing authorized tools and stored credentials only; never print, copy into prompts, commit or retrieve secrets from chat memory. Do not change credentials, protections, account settings, payment settings or existing budget ceilings. No new paid API/model calls, asset purchases or subscriptions without explicit budget authorization. Existing ChatGPT task use is the user's requested route; do not infer that GitHub or third-party compute is free or raise their limits.

Do not change Portfolio Brain, Trading, ABVM production or any other project. Do not change StarBlox main, existing workflow files, the old game's published place, production data or permissions. Do not repoint old workflows to the new game. Private staging is allowed only on a confirmed separate user-owned/authorized development target with isolated data. If none is accessible, package a build and report TARGET_ACCESS_BLOCKED. Public release, child account invitations, age eligibility bypasses and widening access are not authorized. Confirm audience eligibility through current official Roblox guidance before any child playtest. A locked desktop is not evidence that an interactive session is usable.

Do not store real child data or source school documents in this repository, even if repository privacy later changes. Use synthetic fixtures. Parent pairing is not consent. Defer external databases, account linking and roster uploads. Independent validation does not mean a second pass by the original producer counts as independent review.

## Deadline and freeze
Before 16:15 local: prioritize the first complete mission, then validated additional content. From 16:15: no new optional feature scope; repair, integrate and test. At 16:45: freeze the release candidate after lane02's final eligible integration; late producer outputs stay unmerged. After 17:00 local: no new development, deployment, paid work or schedule extension; only the deadline status/handoff is permitted. Check time again immediately before writes and publication. Existing runs may finish after their nominal trigger time; do not hide overruns or missing tests.

Lane14 independently tests the exact final candidate where native runtime is available: join, navigate, tap every relevant action, wrong answer/hint/retry, world result, reward/equip, repeated taps, disconnect/rejoin and save recovery. Retain device/client details, commit and place version plus logs or recording. Static/source presence, server-only execution and browser screenshots must be labeled as such.

Lane15 prepares the 16:55 delivery check. Lane01's 17:00 invocation sends the user the exact verified status, a real play/build link only if it exists, source commit and artifact identity, scope delivered, tests actually run, remaining blockers and no invented progress percentage. Readiness is READY only with the required exact-build runtime evidence; otherwise PARTIAL or BLOCKED. The scheduling RRULEs expire this evening; do not silently restore Brain tasks or extend the game sprint.
