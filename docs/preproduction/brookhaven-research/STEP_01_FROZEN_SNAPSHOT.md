# Brookhaven Research — Step 1 of 12: Frozen Source Snapshot

Status: **COMPLETE — research metadata only; no gameplay integration**

Research branch: `brookhaven-research-snapshot-v1`  
StarBlox base: `screenshot-match-preproduction@1d6d3e6130c83289fc270c0b543c31cffee1d226`

## What this step does

This step freezes the Brookhaven research inputs before any conversion, reconstruction, or StarBlox integration.

The machine-readable source of truth is:

`docs/preproduction/brookhaven-research/snapshot-v1.json`

For ordinary GitHub repositories the snapshot records:

- exact repository commit SHA;
- exact relevant file path;
- Git blob SHA-1 for the relevant artifact;
- observed file length;
- public repository-license status;
- the research role of the artifact.

The serialized Brookhaven Map Gist is recorded by stable Gist ID plus a content witness because the available connector did not expose a full Gist revision SHA/raw blob. This limitation is explicit in the manifest and must not be silently upgraded to an immutable hash claim.

## Frozen research sources

1. `alg783.../Aqui-chatgpt` — runtime/world inventory.
2. `HOSTI1315/Opensurs` — large Brookhaven source corpus and property/house identifiers.
3. `michel9881/Vazador` — concentrated source cross-check and vehicle catalog.
4. `yofriendfromschool1/test` — legacy vehicle/world schema.
5. `doodlebunnyhops/doodlebunnyhops.github.io` — semantic Brookhaven location research; repository license recorded as CC BY-SA 4.0.
6. `Full-mega-list-of-require-scripts` — module pointer for Roblox asset/module `110191289672557` labeled “Brookhaven Map”.
7. hahssas Gist `800060cf55ddf767c6d0e57e6248b51d` — serialized Brookhaven map reference.

## Rights/provenance handling

Project rights status is now **verified-for-project-use** based on prior rights evidence confirmed by the user. This project session did not re-audit or reattach that evidence. Public repository license/provenance metadata continues to be tracked separately.

The manifest separately records what can be observed from each public repository. A repository with no public LICENSE file is marked `none-detected-in-repository-tree`; that is not treated as proof either for or against the user's separate rights.

## Safety of this branch

This step deliberately does **not**:

- copy third-party asset payloads into StarBlox;
- execute or integrate exploit-oriented code;
- wire Brookhaven remotes into StarBlox;
- change live Quest/gameplay behavior;
- modify third-party repositories;
- deploy anything.

## Exit criterion

Step 1 is complete when exact repository sources can be reproduced from commit/blob identifiers and the exceptional Gist reference is recorded with its limitation. Those conditions are now represented in `snapshot-v1.json`.

The next step is **Step 2: build the Brookhaven Asset Graph** from these frozen references.
