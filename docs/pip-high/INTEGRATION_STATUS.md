# Pip High integration status

Snapshot: 2026-10-07. This file records source and CI evidence only. It is not a production-live claim.

## Authoritative targets and published baseline

- Design brief: `GAMEPLAY_REFERENCE.md` blob `246b25101dfa37c6c0e4cf19edf0fc2521118cb9`. Build original Pip High assets and mechanics; Roblox High School 2 recordings are visual direction only.
- Clock/classes source: draft PR #188 at exact head `250d4b2b100083bc50127895586890094f5fe5fa`.
- Integration baseline: draft PR #193 at prior exact head `f8b68436fa282df591e614fbc53c29e2fcf9970c`; all four school workflows passed and Integration artifact `11471857025` identifies that source SHA.
- Current focused composition: lane 03 PR #195 exact head `028630457e25bef031aea898e1ac1b81ee0416f8`, based directly on `f8b68436`, preserves the server-authored class identity while `FoundationState` loads. All four exact-head workflows passed.
- Latest evidenced Pip High publish: workflow run `37007207448`, completed successfully on 2026-10-02. It published Roblox version `4` to Universe `10768955678` / Place `87245440673982` from external source SHA `2ab1584ee34e711828768cd999c86feba9202984`; validated build SHA-256 `7386c19c0af72a80e142abb8141f9b499c24d77c15bc56de0a29ef51d5c2160b`.
- No current Pip High lane candidate is proven published. Source CI and artifacts are not live parity.

## Lane graph

| Lane | Exact evidence | State | Next dependency-safe action |
|---|---|---|---|
| 01 Integration | PR #193 composes the verified lane-03 two-file delta onto exact baseline `f8b68436fa282df591e614fbc53c29e2fcf9970c` | Active | Require all four workflows and an exact-head receipt on the new composite SHA before nomination. |
| 02 Campus | PR #194 at `465468372dcaee85280560372097a8b69d6fb18d`; prior CI passed, but GitHub reports it non-mergeable against obsolete lane-09 base `3e8c9f0b` | Blocked: stale parent | Rebase the isolated route increment onto current lane-09 head `59c3b1dfcd61a13d2671884c431a655db2791d90`, preserve the current visual/audio QA regressions, and rerun exact-head CI. |
| 03 UI/mobile | Draft PR #195 at `028630457e25bef031aea898e1ac1b81ee0416f8`; Foundation `37599762513`, Class `37599762267`, Progression `37599762466`, Integration `37599762463` all passed | Source-CI green; composed here | Perform native phone/tablet attendance while `FoundationState` is delayed; prove the server activity subject survives the first schedule snapshot. |
| 04 Schedule/classes | Draft PR #188 at `250d4b2b100083bc50127895586890094f5fe5fa` | Source candidate | Use the composed lane-01/03/10 contracts and capture Studio attendance, answer, completion, and period-transition evidence for Math, Language Arts, and Science. |
| 05 Progression/report card | No Pip High branch or PR found | Waiting | Start after native class-completion identity is stable; reuse the existing progression service and avoid a second persistence owner. |
| 06 Free roam | Draft PR #190 at `7e51223b3e8a0e2b0059385c095cc3ed1e005b14`; all four workflows passed | Source-CI green | Rebase the isolated destination check-in increment onto the nominated integration head before native proximity QA. |
| 07 Sports/jobs/minigames | Branch exists with inherited clock/classes overlap plus `CampusCourierActivity.lua`, but no focused PR | Conflict / unverified | Rebase and split the courier activity from inherited lane files; open one focused PR and obtain exact-head CI. |
| 08 Art/sound direction | PR #191 at `375b7fc5066070822d6dd99f87602a081be1bff4`; all four workflows passed | Source-CI green | Preserve as the visual/audio contract parent of lane 09; obtain native Studio contrast and sound-routing evidence. |
| 09 Independent QA | PR #192 at `59c3b1dfcd61a13d2671884c431a655db2791d90`; all four workflows passed, including Integration `37632051873` | Source-CI green | Independently verify each later composite; do not transfer artifacts or verdicts from pre-composition heads. |
| 10 Release/reliability | Draft PR #189 at `760970d5586c0a2d0f4166c1de2c09c74a73bb5a`; exact-head receipt contract is present in lane-01 baseline `f8b68436` | Integrated contract | Prepare a publish candidate only after composite exact-head CI and native evidence; do not treat source workflow success as live proof. |

## Integration sequence

1. Land the lane-03 delayed-state class-identity delta in PR #193 and require Foundation, Class/Education, Progression, Integration, pure Luau tests, Rojo build, and an exact-head receipt on one SHA.
2. Have lanes 03/04 perform native mobile attendance and period-transition checks. Verify a class begun before `FoundationState` loads remains bound to the server-returned Math, Language Arts, or Science activity.
3. Rebase lane 02 PR #194 onto lane 09 `59c3b1d`; only then compose the lane-08/09 visual chain, lane-02 routes, and lane-06 check-ins onto the nominated integration head.
4. Independently verify the resulting composite in lane 09. Do not reuse artifacts from `375b7fc`, `59c3b1d`, `4654683`, or `7e51223` as evidence for a later SHA.
5. Rebase and split lane 07 before review; inherited clock/classes files prevent independent integration. Lane 05 remains gated by native class-completion evidence.
6. Only lane 10 may prepare a publish candidate after exact-head CI and native evidence. A successful source workflow alone is not publish evidence.
