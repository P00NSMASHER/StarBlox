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
