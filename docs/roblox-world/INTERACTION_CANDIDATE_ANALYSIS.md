# Brookhaven Interaction Candidate Analysis

Status: candidate discovery only; runtime activation is disabled.

The frozen Brookhaven map contains geometry and seat classes but no scripts, remotes, object names, or behavior metadata. StarBlox therefore must not infer a door or light at runtime merely because a part has a plausible shape.

Deterministic scan of the exact 4,936-entry frozen source:

- regular Seat entries: 271
- Vehicle Seat entries: 2
- conservative door-shaped collidable Block candidates: 148
- conservative garage-sized thin collidable Block candidates: 173
- Neon parts: 206
- small Neon candidates: 137

`src/robloxWorld/interactionCandidateAnalyzer.js` reproduces these sets directly from the frozen serialized source without executing Lua. Its receipt always sets `activationAllowed=false` and `reviewRequired=true`.

Next gate: certify candidates against rendered world evidence and bind only confirmed objects by exact source entry ID. Unreviewed candidates must remain inert.