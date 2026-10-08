# Pip High integration status

Snapshot: 2026-10-08. This file records source and CI evidence only. It is not a production-live claim.

## Authoritative targets and published baseline

- Design brief: `GAMEPLAY_REFERENCE.md` blob `246b25101dfa37c6c0e4cf19edf0fc2521118cb9`. Build original Pip High assets and mechanics; Roblox High School 2 recordings are visual direction only.
- Clock/classes source: draft PR #188 at exact head `250d4b2b100083bc50127895586890094f5fe5fa`.
- Proven PH 01 baseline: draft PR #193 exact head `ed663ebfdc7e190ff9a001d9828635475c896249`; all four school workflows passed. Integration run `37706425390` verified the receipt before upload, and artifact `11519428742` binds the exact source SHA to place SHA-256 `912d2cdb8730fb9d34ddb3682f8edd59e4c13214083d693a5319caca91a00aff` with artifact digest `sha256:e77f776c82cc463cda46a08eb377d36e66d2e21558e973276adac51ef50396d1`.
- Current focused composition: lane 04 PR #196 exact head `b08e148848bbacf439c539f5ce556d71d22a92e7`. Its five-file class delta adds six rotating original activities and canonical classroom binding; its two inherited receipt files are excluded because PH 01 already contains the same repair. The new PH 01 head must earn fresh exact-head evidence.
- Latest evidenced Pip High publish: workflow run `37007207448`, completed successfully on 2026-10-02. It published Roblox version `4` to Universe `10768955678` / Place `87245440673982` from external source SHA `2ab1584ee34e711828768cd999c86feba9202984`; validated build SHA-256 `7386c19c0af72a80e142abb8141f9b499c24d77c15bc56de0a29ef51d5c2160b`.
- No current Pip High lane candidate is proven published. Source CI and artifacts are not live parity.

## Lane graph

| Lane | Exact evidence | State | Next dependency-safe action |
|---|---|---|---|
| 01 Integration | PR #193 baseline `ed663ebfdc7e190ff9a001d9828635475c896249` is exact-head green with independently verified artifact `11519428742`; this increment composes lane 04's isolated class delta | Active | Require all four workflows, successful receipt verifier, and a freshly uploaded exact-head artifact before the next composition. |
| 02 Campus | PR #194 at `d30a4910c94cc972c9659a079057065fd03ad927`, based exactly on lane 09 `1add17e7`; all four workflows passed, including Integration `37706934259` | Source-CI green | Preserve its original entrance/routes delta for a later composite and perform native phone walking/wayfinding checks. |
| 03 UI/mobile | Draft PR #195 at `4ed17fea4063c6ae595ce53d2d90ee006cd978d3`, based exactly on PH 01 `ed663eb`; all four workflows passed, including Integration `37706630737` | Source-CI green | Reconcile after lanes 04 and 05 so the loading-safe HUD can consume authoritative class identity and report-card rows; perform delayed-replication mobile QA. |
| 04 Schedule/classes | Draft PR #196 at `b08e148848bbacf439c539f5ce556d71d22a92e7`; all four workflows passed, including Integration `37707432038`, artifact digest `sha256:4fdf2c0a53974aec68a20588d4bc5391f476e4f37fe8cb4513ac737ea6977bff` | Composed; composite CI pending | Verify the new PH 01 exact head, then capture Studio attendance, wrong-room rejection, answer/completion, day rotation, and period closure. |
| 05 Progression/report card | Draft PR #197 at `a98df79191e7b301eb608fc0a7057bcd7845aaa1`, stacked exactly on lane 04; all four workflows passed, including Integration `37707965734` | Ready after lane 04 composite | Compose only its reducer/guard/test delta after PH 01 lane 04 is green; keep points derived from validated deduplicated receipts. |
| 06 Free roam | Draft PR #190 at `7e51223b3e8a0e2b0059385c095cc3ed1e005b14`; all four workflows passed | Source-CI green | Rebase the isolated destination check-in increment onto the nominated integration head before native proximity QA. |
| 07 Sports/jobs/minigames | Branch exists with inherited clock/classes overlap plus `CampusCourierActivity.lua`, but no focused PR | Conflict / unverified | Rebase and split the courier activity from inherited lane files; open one focused PR and obtain exact-head CI. |
| 08 Art/sound direction | PR #191 at `9f928cc936312be36a8132bf33e37745fa7d9bfe`; all four workflows passed; accessible audio-mix policy added | Source-CI green | Preserve as the visual/audio contract parent of lane 09; obtain native Studio contrast and sound-routing evidence. |
| 09 Independent QA | PR #192 at `1add17e7ced1ee0127a1a34545486d18a7b13e71`, synchronized with lane 08; Integration `37705391340` uploaded artifact digest `sha256:61a9fb598052ceac29fff765cc45adc6d436e5dd7a34c1d5145d1763499b888d` | Source-CI green | Independently verify every later composite without transferring evidence from an earlier SHA. |
| 10 Release/reliability | Receipt writer and independent verifier are composed in PH 01 `ed663ebfdc7e190ff9a001d9828635475c896249` and proved verifier-before-upload ordering | Contract green | Preserve the exact-head receipt contract through every composition; only prepare publish after native evidence and release approval. |

## Integration sequence

1. Validate the lane 04 composition on the new PR #193 exact head: all four workflows, six-activity/canonical-room guards, pure-Luau tests, receipt verification, Rojo build, and downloaded artifact receipt/sidecar equality.
2. Compose lane 05 PR #197's isolated progression delta, then reconcile lane 03 PR #195 so the loading-safe mobile HUD can consume server-authored class identity and report-card rows without moving reward authority client-side.
3. Compose the synchronized lane 08 → lane 09 → lane 02 visual/audio/routes chain and lane 06 one focused delta at a time, preserving exact-head evidence for each result.
4. Independently verify each resulting composite in lane 09. Do not reuse artifacts from any pre-composition head as evidence for a later SHA.
5. Rebase and split lane 07 before review; inherited clock/classes files prevent independent integration.
6. Run native Roblox Studio/mobile evidence for clock/day/next class, three-subject attendance, wrong-room rejection, activity rotation, report cards, wayfinding, destination interactions, contrast, and audio routing.
7. Only lane 10 may prepare a publish candidate after exact-head CI and native evidence. A successful source workflow alone is not publish evidence.
