# Target Architecture Step 5 — World Exactness and Runtime Projection

The Brookhaven **source exactness** remains verified. This branch upgrades the mount boundary to a v2 architecture so the game can support real Brookhaven-style interactions without ever mutating the exact source witness.

## Locked world identity

- generated model SHA-256: `4dfd451ae211dead959ec3f165e2b477a9725d04727febdc66472e95328917df`
- generated model bytes: **5,303,322**
- verified source entries: **4,936**
- approved legacy adaptations: **2** (entries 832 and 844 only)
- canonical subtree instances: **5,493**
- canonical subtree SHA-256: `d2c88a68305a65475dfdab77220b69e4138d81e44250edd1849f69cee4c92a90`

Those identities continue to bind the immutable Brookhaven source layer.

## v2 witness / projection architecture

The release artifact contains exactly one immutable Brookhaven witness:

- `ServerStorage/BrookhavenWorldBaseline`

It must retain the verified 5,493-instance canonical subtree, contain no gameplay scripts/remotes, and remain byte/subtree bound to the frozen source proof.

At server boot, StarBlox creates a separate mutable projection:

- `Workspace/BrookhavenWorldRuntime`

The projection is cloned from the witness before world-bound gameplay services start. Activities, player-house plot bindings, and reviewed world interactions target **only** this runtime projection.

This makes the responsibilities explicit:

- exactness witness: immutable, hidden in ServerStorage;
- playable world: mutable clone in Workspace;
- gameplay code/remotes: mounted outside both world trees;
- reviewed doors/lights/props may mutate only the runtime clone;
- the witness can always be rechecked against the frozen source identity.

## Static release-artifact rule

The candidate `.rbxlx` must contain:

- `ServerStorage/BrookhavenWorldBaseline`;
- `ReplicatedStorage/StarBlox`;
- `ServerScriptService/StarBlox`;
- `StarterPlayer/StarterPlayerScripts/StarBlox`.

It must **not** contain `Workspace/BrookhavenWorldRuntime`. That clone is created only by `WorldProjectionService` after the server boots.

## Runtime rule

At boot:

1. verify the immutable witness exists outside Workspace;
2. reject scripts/remotes inside the witness;
3. clone witness -> `Workspace/BrookhavenWorldRuntime`;
4. mark the clone as the StarBlox runtime projection;
5. start reviewed world interactions and other world-bound services;
6. on shutdown, restore/destroy interaction state before destroying the projection.

## Verification status on this branch

The historic Step-5 source exactness proof remains the source-of-truth for world identity.

The **v2 witness/projection mount proof is pending the current PR CI run**. The checked-in Step-5 JSON intentionally records this as pending rather than claiming the older Workspace mount run verifies the new architecture.

Once CI regenerates and verifies the v2 receipt, that new exact head/run should replace the pending verification metadata.
