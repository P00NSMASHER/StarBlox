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

## Completion

When the Step-6 policy is bound to a freshly generated release gate in CI and the full regression suite passes, the six-step Target Architecture is complete.
