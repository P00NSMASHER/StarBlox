# High School Swarm Protocol

Canonical product: an original feature-equivalent Roblox high-school life game inspired by publicly observable Roblox High School / Roblox High School 2 gameplay, using original code and original/properly licensed assets only. Maze/Pips and Brookhaven runtime-projection architecture are retired.

## Global rules
- GitHub/cloud first. PAAM-L044 is LOCAL_ONLY_REQUIRED only, background/headless only, never polled routinely.
- Never publish Roblox, spend money, weaken tests, broaden credentials, or copy proprietary/private code/assets/presentation.
- Tasks never disable, pause, delete, or reschedule themselves. Blocked lanes NOOP and remain enabled.
- Control Tower is the only authority for CURRENT_RELEASE_BLOCKER, canonical lineage, ACTIVE producer set, and WIP limit.
- Exact SHA beats branch name. Evidence tied to a stale SHA is stale.
- One owner per defect/blocker. No duplicate producer branches for the same objective.
- Producers commit product changes; reviewers do not silently implement producer scope.
- Never advance a downstream lane against an uncommitted or uncertified upstream contract.

## Hourly dependency order
1. Control Tower — refresh global state and blocker.
2. DevEx — repair automation/CI/evidence defects only.
3. Foundation — implement current Foundation objective.
4. Content QA — prepare/fix content only when schema-compatible.
5. Class & Education — starts only after Foundation contract is eligible.
6. Progression & Mobile — starts only after Class/Education contract is eligible.
7. QA & Contract — validate changed eligible producer SHAs.
8. Integration Director — assemble only exact-SHA QA/contract-eligible heads.
9. Integration Smoke — run only on changed integration SHA.
10. Release & Package Gate — run only after smoke PASS on same SHA.

## Canonical stage gates
### Foundation PASS
- isolated highschool project maps only original school runtime
- original spawn/free-roam campus
- exactly one authoritative school clock/day/period service
- original room/location registry
- zero Maze/Pips/Brookhaven/BHW runtime dependency in mapped project
- stable read-only lifecycle/state seam
- deterministic headless guards
- explicit mapped-asset provenance
- exact-head GitHub CI PASS

### Class & Education PASS
- class starts from authoritative Foundation schedule/location state
- one server-authoritative activity at a time
- correct answer never trusted from client
- duplicate/late submission rejected
- wrong-answer support does not soft-lock player
- completion occurs exactly once
- returns to free roam
- exact-head deterministic tests PASS

### Progression & Mobile PASS
- authoritative class completion credited exactly once
- save/rejoin idempotent
- read-only progression state exposed to UI
- compact mobile UI does not obstruct core controls/free roam
- no duplicate progression authority
- exact-head deterministic/static tests PASS

### QA & Contract PASS
- same exact producer lineage
- no duplicate clock/class/progression authority
- no client-trusted answers/grades
- no persistence duplication
- no stale/legacy runtime coupling
- rights/provenance PASS
- changed-surface + minimum critical seam tests PASS

### Integration PASS
- only approved exact producer SHAs included
- mechanical conflicts only; semantic conflicts returned to owner
- deterministic integrated-head tests PASS
- rights/provenance preserved

### Smoke PASS
- one exact integration SHA
- build/load seams
- school clock/schedule
- class entry/activity/completion
- progression/persistence
- mobile obstruction guards
- no duplicate authorities
- no contradictory exact-head evidence

### Release READY
- same exact integration SHA across QA, integration, smoke, package
- package hash/identity recorded
- provenance PASS
- no unresolved HIGH/CRITICAL blocker
- runtime/device-only checks may remain LOCAL_ONLY_REQUIRED but may not be fabricated

## Progress discipline
- A producer cycle must either create a tested commit, close a blocker, produce a precise blocking receipt, or NOOP because its upstream gate is not ready.
- Status-only churn is not progress.
- If the same blocker survives two Control Tower cycles without new commit/evidence, mark STALLED and change strategy.
- If GitHub write is blocked, make at most one write attempt per task per run; record CLOUD_WRITE_BLOCKED and continue next cycle.
- Never solve a write block by switching to local/GUI access.

## Handoff format
Every meaningful handoff/evidence record should include:
- lane
- candidate branch
- exact head SHA
- upstream SHA(s)
- objective
- tests/checks run
- PASS/BLOCKED
- blocker owner
- next exact exit criterion

This file is the shared coordination contract. Individual task prompts may narrow ownership but must not contradict it.


## Productive parallelism — required
While the release blocker is upstream, the swarm may still run up to 3 product producers **only when their file ownership and interfaces are independent**. Safe parallel work that cannot create downstream rework is allowed; downstream integration is not.

Current safe producer split until Foundation PASS:
1. **Foundation** — owns only `highschool/default.project.json`, `highschool/src/foundation/**`, and Foundation-specific tests/provenance.
2. **Class & Education** — before Foundation PASS, owns only standalone server-authoritative Education Core under `highschool/src/education/**` plus its deterministic tests. It MUST NOT bind to the world, clock, attendance, progression, UI, or Foundation implementation until Foundation PASS. After Foundation PASS it may add the class-attendance adapter.
3. **Content QA** — owns only original/sanitized content under `highschool/content/**` and content-schema tests. It may produce content before Class integration only against the stable content schema below.

### Stable Education content schema v1
Each activity record contains:
- `id`: stable unique string
- `subject`: string
- `skill`: string
- `difficulty`: integer 1-5
- `prompt`: original text
- `choices`: array of at least 2 objects with stable `id` and `text`
- `correctChoiceId`: server-only field; never included in client/public view
- `hint`: original support text
- `explanation`: original feedback text

Education Core public/client view MUST omit `correctChoiceId`. Server-side evaluation may read it.

### Producer cycle contract
When a lane is ACTIVE or has safe independent prep authorized above, a run MUST do one of:
- create a coherent product commit with relevant tests, or
- repair a concrete defect and commit it with a regression test, or
- produce a precise external/tooling blocker receipt after one failed write/tool attempt.
A run that only rewrites status, repeats old evidence, or narrates the same blocker is a defect.

### Work size
Prefer one coherent slice that can be reviewed and tested in one run. Do not split trivial files into separate status commits. Do not wait for a perfect large feature when a smaller executable/tested slice advances the stage gate.

### Handoff consumption
The next lane must consume the latest eligible exact-SHA handoff rather than re-discovering the same facts. Reviewers should validate new SHAs; they should not rerun unchanged evidence.


## Producer branch discipline
Safe parallel producers use dedicated branches so independent work cannot race the Foundation head:
- Foundation: `rebuild/high-school-foundation`
- Education Core: `rebuild/high-school-education-core`
- Content: `rebuild/high-school-content`

If an Education/Content branch is absent, that producer creates it from the **live canonical Foundation head at the moment of first write**, records that exact base SHA in its receipt, and then writes only its owned paths. Do not force-update or silently retarget another producer's branch. Foundation remains the only writer to the canonical Foundation branch.

Before Foundation PASS, Education and Content branches may advance independently without rebasing on every Foundation commit because they must not import Foundation implementation. At the first real binding/integration step, Integration Director uses exact producer SHAs and current certified Foundation SHA; stale ancestry is not semantic permission to copy legacy runtime code.

## NOOP write discipline
A NOOP means no GitHub mutation when the input fingerprint and blocker are unchanged. Do not commit a fresh receipt merely to record the same NOOP again. A lane may update a receipt only when the candidate fingerprint, verdict, blocker, evidence identity, or LOCAL_ONLY_REQUIRED set materially changes.
