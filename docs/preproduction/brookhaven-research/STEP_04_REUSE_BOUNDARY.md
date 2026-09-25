# Brookhaven Research — Step 4 of 12: Reuse Boundary

Status: **COMPLETE — production/runtime boundary enforced**

Machine-readable policy:

`docs/preproduction/brookhaven-research/reuse-boundary-v1.json`

Static assertion:

`scripts/assertBrookhavenReuseBoundary.mjs`

## Rule

Brookhaven **assets/data** and Brookhaven **runtime/executor implementation** are now separate classes.

Potentially reusable after rights/provenance and conversion gates:

- authorized meshes/textures/geometry;
- object hierarchy;
- scene coordinates/layout;
- property and vehicle identifiers;
- materials/colors;
- house/town/vehicle feature vocabulary;
- semantic labels with their own license tracked.

Research-only / never a production dependency:

- Brookhaven `FireServer` / `InvokeServer` calls;
- `ReplicatedStorage.Remotes`;
- `Lot:BuildProperty` and `Lot:Claim` runtime calls;
- `PickingCustomHouse` / `PickingCar` executor flows;
- `loadstring(game:HttpGet(...))`;
- executor/exploit primitives;
- obfuscated runtime loaders;
- anti-cheat bypass or server-manipulation logic.

## Enforcement

The CI assertion recursively scans `src/**` and fails if known Brookhaven runtime/executor tokens appear in live StarBlox JavaScript/TypeScript.

This does **not** prevent research metadata from documenting those names in `docs/preproduction/brookhaven-research/**`. The purpose is to prevent the later asset integration from accidentally turning into a Brookhaven runtime dependency.

The only eventual production path for Brookhaven-derived visual content is:

authorized source → provenance record → neutral conversion → performance/content QA → normalized StarBlox asset.

No live gameplay integration was performed in Step 4.
