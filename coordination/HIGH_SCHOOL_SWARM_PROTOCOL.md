# High School Swarm Protocol

## Product
Build an original Roblox high-school life game with original code and original/properly licensed assets. Maze/Pips, Brookhaven projection/parity work, RHS-exact/licensed-exact work, and superseded experiments are noncanonical historical evidence unless the user explicitly changes direction.

## Resource and authority rules
- GitHub/cloud first.
- PAAM-L044 / Remote Desktop Commander are LOCAL_ONLY_REQUIRED only, with an exact reason, background/headless only.
- Never spend money or publish Roblox without explicit user instruction.
- Never weaken tests, fabricate evidence, broaden credentials/authority, or copy proprietary/private code/assets/presentation.
- Scheduled-task definitions are immutable from scheduled runs. No task may enable, disable, pause, delete, rename, reschedule, or rewrite any Roblox automation. Only explicit user chat instruction may change them.
- Control Tower is the sole writer of HIGH_SCHOOL_SWARM_STATE.json. Other lanes write only their own product files/tests/receipts.

## Canonical source root
- `school/**` is the only canonical runtime/test root.
- Existing `highschool/**` is staging/reference only until deliberately rehomed into `school/**` with deterministic tests and exact-head CI.
- Never map both roots in one canonical candidate.
- Exact live branch head + exact-head CI outrank receipts. A receipt whose SHA differs from the referenced live head is STALE and cannot authorize downstream work.

## Primary KPI
Validated playable progress on this vertical slice:
spawn -> authoritative school clock/period -> attend one class -> one server-authoritative activity -> exactly-once progression result -> return to free roam -> save/rejoin restores the committed result.

Commit count, branch count, receipt count, and hourly activity are not success metrics.

## WIP cap
At most 3 unintegrated product candidates may be live:
1. canonical base,
2. one upstream critical-path producer candidate,
3. one downstream speculative producer candidate behind a stable internal interface.

Other lanes may perform cheap delta checks, tests/harnesses tied to reproduced defects, content/provenance preparation, or WAITING_* reporting, but must not accumulate extra product-code candidates.

## Ownership
### Foundation
Owns canonical `school/default.project.json`, school spawn/location registry, exactly one SchoolClock/day/period authority, read-only FoundationState/lifecycle seam, Foundation tests, and provenance.

### Class & Education
Owns server-authoritative activity/session logic and class adapter. Correct answers remain server-only. No second clock or progression authority.

### Content
Owns original/sanitized activity content plus content validation/provenance. Content breadth is support work until the core vertical slice passes.

### Progression & Mobile
Owns exactly-once progression/persistence and minimal mobile UI/static guards. No clock, answer, class-lifecycle, or world authority.

### DevEx
Owns CI/evidence/coordination plumbing only. It may repair reproduced tooling defects but not gameplay/content semantics.

### QA & Contract
Validates changed exact-SHA surfaces and cross-seam contracts. It may improve QA-owned harnesses only for a reproduced coverage gap.

### Integration
Assembles QA-eligible exact producer SHAs. Mechanical conflicts only; semantic conflicts return to one producer owner.

### Smoke
Runs headless smoke only for a changed eligible integration SHA. Runtime/device-only evidence is LOCAL_ONLY_REQUIRED.

### Release & Package
Builds deterministic candidate packages only for changed eligible integration fingerprints and evaluates final readiness fail-closed.

## Dependency rules
Dependency order restricts real adapter/binding work, not safe independent preparation. Do not invent upstream semantics. Do not let unfinished interfaces authorize downstream binding.

## Stage gates
### Foundation PASS
- canonical `school/**` project exists and does not map `highschool/**`
- original spawn/free-roam campus slice
- exactly one SchoolClock/day/period authority
- unique location registry
- read-only FoundationState/lifecycle seam
- zero mapped Maze/Pips/Brookhaven/RHS-exact runtime dependency
- explicit provenance
- deterministic guards PASS
- exact-head GitHub CI PASS

### Class & Education PASS
- consumes certified Foundation schedule/location state
- one server-authoritative activity at a time
- answer key never trusted/exposed to client
- duplicate/late/stale submissions fail closed
- wrong-answer recovery cannot soft-lock
- completion exactly once
- returns to free roam
- exact-head deterministic tests PASS

### Progression & Mobile PASS
- authoritative completion credited exactly once
- save/rejoin idempotent
- stale/concurrent writes cannot silently lose successful completions
- read-only progression state
- compact mobile UI does not obstruct core controls/free roam
- exact-head deterministic/static tests PASS

### QA / Integration / Smoke / Release
All evidence must refer to the same eligible exact-SHA lineage. Rights/provenance must PASS. No HIGH/CRITICAL blocker may remain for READY.

## Unchanged fingerprint rule
If a lane's exact input fingerprint is unchanged:
- at most 2 cheap GitHub/cloud reads,
- 0 broad test reruns,
- 0 new branches,
- 0 product commits,
- 0 status-only receipt/comment writes.

Then report `WAITING_UNCHANGED` with the exact fingerprint and unblock condition.

If a dependency is missing after a bounded delta check, report `WAITING_DEPENDENCY` with exactly one owner and measurable exit criterion.

Never emit NOOP.

## Progress discipline
A productive mutation must do at least one of:
- add/fix tested product behavior,
- repair a reproduced tooling/coordination defect,
- add a deterministic regression test for a reproduced defect,
- integrate already-certified exact-SHA work,
- materially change readiness evidence.

Status-only churn is forbidden. New commits invalidate prior downstream certification for that branch until exact-head CI is green.

## Handoff format
Meaningful receipts include:
- lane
- branch
- exact head SHA
- upstream SHA(s)
- objective
- changed files
- tests/check identities
- PASS/BLOCKED
- blocker owner
- exact exit criterion
- provenance verdict
