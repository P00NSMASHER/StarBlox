# Brookhaven Research — Step 9 of 12: Town System Reconstruction

Status: **COMPLETE — neutral town graph/runtime implemented, not wired live**

Artifacts:

- `docs/preproduction/brookhaven-research/town-system-blueprint-v1.json`
- `src/townSystemRuntime.js`
- `src/townSystemRuntime.test.js`

The destination vocabulary comes from the Step 2 evidence graph, but the topology is deliberately an **original StarBlox proxy graph**. No claim is made that these edges reproduce Brookhaven's exact road layout or coordinates.

The runtime supports local unlock state, visits, deterministic route finding through unlocked destinations, and explicit player-facing eligibility.

Two source-derived areas are retained only as deferred research concepts and cannot enter player-facing state in this prototype.

No Brookhaven remote or server dependency is present.
