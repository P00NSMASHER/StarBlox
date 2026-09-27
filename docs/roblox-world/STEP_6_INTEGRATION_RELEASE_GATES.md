# Target Architecture Step 6 — Integration and Release Gates

Step 6 is the publication boundary for the Brookhaven-backed StarBlox architecture.

## Release prerequisite

A private publication or formal live-Studio proof must present a Step-6 release gate built from all of the following in one verified context:

- checked-in Step-5 snapshot;
- freshly regenerated Step-5 exactness lock;
- freshly regenerated v2 mount receipt;
- exact combined `.rbxlx`;
- exact 40-character source commit.

Any drift fails closed.

## World identity

The immutable witness contract is:

- model SHA-256: `4dfd451ae211dead959ec3f165e2b477a9725d04727febdc66472e95328917df`;
- canonical subtree SHA-256: `d2c88a68305a65475dfdab77220b69e4138d81e44250edd1849f69cee4c92a90`;
- canonical subtree instances: **5,493**;
- gameplay scripts/remotes inside witness: **0**;
- witness location: `ServerStorage/BrookhavenWorldBaseline`.

The playable projection is:

- runtime name: `BrookhavenWorldRuntime`;
- runtime location after boot: `Workspace/BrookhavenWorldRuntime`;
- absent from the static release artifact;
- cloned from the immutable witness at server boot;
- the only Brookhaven world tree that reviewed gameplay interactions may mutate.

## Static artifact verification

Before a release gate opens, native rbx-dom inspection must prove:

- the exact witness exists under ServerStorage;
- its canonical subtree digest equals the verified Step-5 digest;
- its canonical subtree contains exactly 5,493 instances;
- it contains zero Script, LocalScript, ModuleScript, RemoteEvent, RemoteFunction, or UnreliableRemoteEvent instances;
- `BrookhavenWorldRuntime` is absent from the static artifact;
- the three StarBlox runtime mounts exist outside the witness.

## Live server verification

After private publication, the server proof must additionally prove:

- `ServerStorage/BrookhavenWorldBaseline` still exists and remains structurally intact;
- `Workspace/BrookhavenWorldBaseline` does not exist;
- `Workspace/BrookhavenWorldRuntime` was created by `WorldProjectionService`;
- the runtime clone initially reproduces the expected serialized class counts;
- activities and plots resolve against the runtime clone;
- reviewed interactions are attached only to the runtime clone;
- StarBlox remotes/services boot successfully;
- production activation remains disabled.

## Authority boundary

A valid gate authorizes only:

- formal Studio playtesting;
- private-staging publication.

It does **not** authorize:

- public-access changes;
- experience-visibility changes;
- production/live activation.

## Current branch status

Historic Step-6 proofs verify the previous locked-Workspace architecture, not the new v2 witness/projection mount.

Therefore this branch deliberately treats the **new Step-6 v2 proof as pending CI verification**. Do not cite the older run as proof that the new mount architecture is release-ready.

Once the current branch completes the full CI chain, record the exact verified head/run and use that receipt for any subsequent private publish.
