# Pip High integration status

Snapshot: 2026-10-07. This file records source and CI evidence only. It is not a production-live claim.

## Authoritative targets and published baseline

- Design brief: `GAMEPLAY_REFERENCE.md` blob `246b25101dfa37c6c0e4cf19edf0fc2521118cb9`. Build original Pip High assets and mechanics; Roblox High School 2 recordings are visual direction only.
- Clock/classes source: draft PR #188 at exact head `250d4b2b100083bc50127895586890094f5fe5fa`.
- Integration baseline: draft PR #193 exact head `df286ac89a1db15a3a3c20feb7f45b7a48995966`; all four school workflows passed, and artifact `11487563086` binds the same source SHA to place SHA-256 `912d2cdb8730fb9d34ddb3682f8edd59e4c13214083d693a5319caca91a00aff`.
- Current focused composition: lane 10 PR #189 advanced to `1da6d372c3244b7a19aa1354474843d37523ce1a` with an independent pre-upload verifier for receipt source SHA, artifact byte count, artifact SHA-256, and digest-sidecar filename/content. Its isolated three-file delta is composed here; the new PH 01 head must earn fresh evidence.
- Latest evidenced Pip High publish: workflow run `37007207448`, completed successfully on 2026-10-02. It published Roblox version `4` to Universe `10768955678` / Place `87245440673982` from external source SHA `2ab1584ee34e711828768cd999c86feba9202984`; validated build SHA-256 `7386c19c0af72a80e142abb8141f9b499c24d77c15bc56de0a29ef51d5c2160b`.
- No current Pip High lane candidate is proven published. Source CI and artifacts are not live parity.

## Lane graph

| Lane | Exact evidence | State | Next dependency-safe action |
|---|---|---|---|
| 01 Integration | PR #193 baseline `df286ac89a1db15a3a3c20feb7f45b7a48995966` is exact-head green; this increment composes lane 10's independent receipt verifier | Active | Require all four workflows, successful verifier step, and an exact-head receipt on the new composite SHA before nomination. |
| 02 Campus | PR #194 at `e61f5bf18d60aba1171e58b3165c4a7966e67fa0`; all four workflows passed on its lane-09 parent | Transitively stale | Wait for lane 09 to synchronize with lane 08 `9f928cc9`, then rebase the entrance/routes delta and repeat exact-head CI plus native walking checks. |
| 03 UI/mobile | Draft PR #195 at `c9baa19b86bfc8a9463263eb73b53bad75e69f40`; all four workflows passed, including Integration `37636202101` | Source-CI green; newer child available | After this release-contract increment, compose the focused loading-shell delta and perform native delayed-replication phone/tablet attendance. |
| 04 Schedule/classes | Draft PR #188 at `250d4b2b100083bc50127895586890094f5fe5fa` | Source candidate | Use the composed lane-01/03/10 contracts and capture Studio attendance, answer, completion, and period-transition evidence for Math, Language Arts, and Science. |
| 05 Progression/report card | No Pip High branch or PR found | Waiting | Start after native class-completion identity is stable; reuse the existing progression service and avoid a second persistence owner. |
| 06 Free roam | Draft PR #190 at `7e51223b3e8a0e2b0059385c095cc3ed1e005b14`; all four workflows passed | Source-CI green | Rebase the isolated destination check-in increment onto the nominated integration head before native proximity QA. |
| 07 Sports/jobs/minigames | Branch exists with inherited clock/classes overlap plus `CampusCourierActivity.lua`, but no focused PR | Conflict / unverified | Rebase and split the courier activity from inherited lane files; open one focused PR and obtain exact-head CI. |
| 08 Art/sound direction | PR #191 at `9f928cc936312be36a8132bf33e37745fa7d9bfe`; all four workflows passed; accessible audio-mix policy added | Source-CI green | Preserve as the visual/audio contract parent of lane 09; obtain native Studio contrast and sound-routing evidence. |
| 09 Independent QA | PR #192 remains at `59c3b1dfcd61a13d2671884c431a655db2791d90`, before lane 08 advanced | Blocked: stale parent | Synchronize with `9f928cc9`, rerun independent checks, then require lane 02 to follow the refreshed QA head. |
| 10 Release/reliability | Draft PR #189 at `1da6d372c3244b7a19aa1354474843d37523ce1a`; the isolated verifier delta is composed here | Contract composed; composite CI pending | Confirm the verifier runs after Rojo build and before upload, then validate source SHA, bytes, digest, and sidecar against the downloaded artifact. |

## Integration sequence

1. Validate the lane-10 receipt verifier on the new PR #193 exact head: all four workflows, verifier-before-upload ordering, Rojo build, artifact upload, and downloaded receipt/sidecar equality.
2. Compose lane 03's focused loading-shell child from `c9baa19b`, then have lanes 03/04 perform native mobile attendance and period-transition checks. Verify a class begun before modules/remotes load remains bound to the server-returned subject.
3. Synchronize lane 09 onto lane 08 `9f928cc`; then rebase lane 02 `e61f5bf` onto the refreshed QA head before composing the visual/audio/routes chain and lane 06.
4. Independently verify the resulting composite in lane 09. Do not reuse artifacts from any pre-composition head as evidence for a later SHA.
5. Rebase and split lane 07 before review; inherited clock/classes files prevent independent integration. Lane 05 remains gated by native class-completion evidence.
6. Only lane 10 may prepare a publish candidate after exact-head CI and native evidence. A successful source workflow alone is not publish evidence.
