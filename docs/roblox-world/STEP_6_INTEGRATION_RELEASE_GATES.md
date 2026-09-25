# Target Architecture Step 6 — Integration and Release Gates

Step 6 defines the final release boundary for the Brookhaven-backed StarBlox architecture.

## Release prerequisite

A private publication or formal live-Studio proof must now present a **Step-6 release gate** built from all of the following in the same CI/workflow context:

- the checked-in Step-5 snapshot
- the freshly regenerated Step-5 exactness lock
- the freshly regenerated Step-5 mount receipt
- the exact combined `.rbxlx` produced by the Step-5 mount
- the exact 40-character source commit

If any one of those changes after gate creation, verification fails closed.

## World identity

The currently verified world contract is:

- baseline model SHA-256: `4dfd451ae211dead959ec3f165e2b477a9725d04727febdc66472e95328917df`
- mounted world subtree SHA-256: `d2c88a68305a65475dfdab77220b69e4138d81e44250edd1849f69cee4c92a90`
- baseline subtree instances: **5,493**
- gameplay scripts/remotes inside baseline: **0**

A world change from the separate world-development workflow therefore makes the current Step-5/Step-6 proof stale and blocks release until the world is re-fingerprinted and reverified.

## Publisher behavior

The private publisher no longer builds `roblox/default.project.json` itself.

It accepts only the exact release-gated Step-5 combined place, verifies its artifact digest and source-commit binding, publishes those bytes, then executes a Roblox-server verification against the newly published version.

The server must prove:

- `Workspace/BrookhavenWorldBaseline` exists
- the baseline contains exactly **5,493** instances including its root
- the baseline contains no Script, LocalScript, ModuleScript, RemoteEvent, or RemoteFunction
- all three StarBlox runtime mounts exist outside the baseline
- the deployment manifest carries the expected baseline and mounted-subtree fingerprints
- production activation remains disabled

## Authority boundary

A valid Step-6 gate authorizes only:

- formal Studio playtesting
- private-staging publication

It does **not** authorize:

- public-access changes
- experience-visibility changes
- production/live activation

## Verified completion

Target Architecture **6 / 6** is verified.

- verification workflow: **StarBlox CI**
- verified run: **36191024712**
- verified branch head: `8cb52626f28c219b5481ec2ae40df38b2b77daf3`
- Step-6 release-gate proof: **passed**
- full tests, certification gate, balance gate, and production bundle: **passed**
- ordinary PR Open Cloud probe: intentionally skipped to avoid consuming the shared Roblox Luau-task quota; actual release PR publication remains Open-Cloud-gated and fail-closed

A subsequent world-development change invalidates the Step-5/Step-6 world fingerprints and must be reverified before private publication.

## Completion

When the Step-6 policy is bound to a freshly generated release gate in CI and the full regression suite passes, the six-step Target Architecture is complete.


## Native release-artifact hardening

The final release gate now inspects the **exact candidate `.rbxlx` itself** with the pinned rbx-dom reader before authorization.

The artifact must prove:

- `Workspace/BrookhavenWorldBaseline` exists directly under Workspace;
- its canonical subtree SHA-256 equals the verified Step-5 mounted subtree `d2c88a68305a65475dfdab77220b69e4138d81e44250edd1849f69cee4c92a90`;
- its Brookhaven subtree contains exactly **5,493** instances including the root model;
- that subtree contains **zero** Script, LocalScript, ModuleScript, RemoteEvent, RemoteFunction, or UnreliableRemoteEvent instances;
- exactly these three runtime mounts exist outside the baseline:
  - `ReplicatedStorage/StarBlox`
  - `ServerScriptService/StarBlox`
  - `StarterPlayer/StarterPlayerScripts/StarBlox`.

Only after that native proof succeeds does Step 6 bind the artifact SHA-256 and source commit into the release gate. This closes the gap where a structurally unrelated RBXLX containing only expected names could otherwise have been hash-bound.

Hardening verification run: **36192237813** at code head `2153fb0e2c37382695b795559c05eb84162328c9`.
