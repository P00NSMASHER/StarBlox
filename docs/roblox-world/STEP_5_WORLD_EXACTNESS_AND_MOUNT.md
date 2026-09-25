# Target Architecture Step 5 — World Exactness and StarBlox Mount

Step 5 is **verified**.

The Step-4 Brookhaven native world is now treated as a read-only baseline and StarBlox is mounted alongside it without changing the world subtree.

## Locked world identity

- generated model SHA-256: `4dfd451ae211dead959ec3f165e2b477a9725d04727febdc66472e95328917df`
- generated model bytes: **5,303,322**
- verified source entries: **4,936**
- approved legacy adaptations: **2** (entries 832 and 844 only)
- baseline subtree instances after Roblox/Rojo round-trip: **5,493**
- isolated subtree SHA-256: `d2c88a68305a65475dfdab77220b69e4138d81e44250edd1849f69cee4c92a90`
- mounted subtree SHA-256: `d2c88a68305a65475dfdab77220b69e4138d81e44250edd1849f69cee4c92a90`

The equal subtree digests prove the Brookhaven layer did not change during the combined build.

## Runtime separation

StarBlox is mounted only in:

- `ReplicatedStorage/StarBlox`
- `ServerScriptService/StarBlox`
- `StarterPlayer/StarterPlayerScripts/StarBlox`

No StarBlox script, remote, or gameplay object is parented inside `Workspace/BrookhavenWorldBaseline`.

The Step-5 verifier also fails closed if the normal StarBlox Rojo project begins owning `Workspace`, preventing runtime development from silently taking control of the world baseline.

## Artifact policy

The generated Brookhaven model, combined mounted place, and ephemeral Step-5 Rojo project are **not committed**. CI regenerates them from the frozen source and verifies their identities.

This keeps the world-development layer separate from runtime/integration work while retaining a reproducible exactness gate.

## Next step

**Target Architecture Step 6 — integration and release gates.**

Step 6 should consume a verified world version, run StarBlox gameplay/integration tests against it, and require the Step-5 exactness/mount receipts before any private publication or release transition.
