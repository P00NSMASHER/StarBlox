# Target Architecture Step 3 — Safe Brookhaven World Deserialization

Step 3 is **verified**.

The frozen 3,182,943-byte Brookhaven serialized-world source is now parsed into a typed StarBlox intermediate representation without executing or evaluating Lua.

## Binding to earlier steps

- Step-1 source SHA-256: `e9abef1d41b85a8f83aca36ba661de41f4321562937c1e2eea907395c292d694`
- Step-2 world fingerprint: `sha256:fde35ba75526051a3c57936a2b2e437d2a33f82a146b88f495a67821fc45dbc1`
- Step-3 IR hash: `sha256:558cb27979f308a171fc33165bddc5ee078326bd4aed4483a1a46f4f7ba8caba`
- ordered canonical-entry hash sequence: `abea208104e4433431e7875df77c66b69a4e1e83dbf03e9453975aceb811c94d`
- ordered raw source-slice hash sequence: `54e1343151439f29557b3a4646e6700098392ce5c9c4be60571d5765d4e01cf8`
- verified CI run: `36184536713`

## Parsed world

Exactly **4,936** entries were parsed and typed.

Roblox target classes derived from the frozen shape data:

- Part: 4,385
- Seat: 271
- WedgePart: 247
- CornerWedgePart: 31
- VehicleSeat: 2

Optional nested content:

- decals: 494
- meshes: 62
- FileMesh meshes: 27
- unique Roblox asset IDs: 154

Every entry preserves:

- six surface values;
- reflectance;
- RGB color;
- anchored state;
- collision state;
- transparency;
- primary material;
- XYZ position;
- locked state;
- full 12-value CFrame;
- shape/class mapping;
- XYZ size;
- optional decal data;
- optional mesh data;
- per-entry source-slice SHA-256;
- per-entry canonical typed-data hash.

## Restricted grammar

The parser accepts only inert serialized data:

- finite numbers;
- quoted strings;
- booleans;
- keyed tables;
- bounded `Enum.NormalId.*` references;
- bounded `Enum.MeshType.*` references.

It rejects:

- arbitrary identifiers;
- `nil`;
- duplicate keys;
- unknown top-level or nested fields;
- function-like syntax;
- arbitrary Lua expressions;
- unsupported string escapes.

The implementation contains no JavaScript `eval`, no `Function` constructor, and no Node `vm` execution path.

## Exact legacy anomalies preserved

Two source values are structurally valid but outside modern expected property ranges. Step 3 does **not** clamp them:

1. Entry **832**: `reflectance = 5`.
2. Entry **844** mesh vertex color:
   `[3000000028082176, 2.999999954472962e31, 3000000028082176]`.

They are retained exactly in the IR and explicitly listed in the receipt so later Roblox-object generation can make a deliberate, evidence-bound adaptation decision.

## Safety boundary

Step 3 performs parsing and validation only:

- source executed: **false**
- source evaluated as Lua: **false**
- source inserted into Studio: **false**
- Roblox objects generated: **false**
- Roblox place mutated: **false**
- publication started: **false**
- live activation allowed: **false**

## Reproduction

```sh
npm run roblox:brookhaven-world:deserialize -- \
  --out /tmp/brookhaven-world-ir.json \
  --receipt /tmp/brookhaven-world-deserialization-receipt.json
```

The checked-in Step-3 snapshot is:

`docs/roblox-world/STEP_3_SAFE_DESERIALIZATION.json`

CI regenerates the full IR/receipt from the frozen source and requires the generated receipt to match the checked-in verified receipt.

## Next step

**Target Architecture Step 4: isolated world generation.**

The typed IR can now be converted into Roblox instances in an isolated generated-place layer, with every generated object traceable back to its Step-3 entry hash. StarBlox gameplay/runtime mounting remains separate.
