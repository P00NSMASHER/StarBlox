# Target Architecture Step 4 — Isolated Brookhaven World Generation

Step 4 is **verified**.

The exact Step-3 typed IR is now converted into a standalone Roblox-native world model and validated again through Roblox tooling before any StarBlox gameplay is mounted.

## Generated world identity

- Step-3 IR hash: `sha256:558cb27979f308a171fc33165bddc5ee078326bd4aed4483a1a46f4f7ba8caba`
- generated model format: `.rbxmx`
- generated model bytes: **5,303,322**
- generated model SHA-256: `4dfd451ae211dead959ec3f165e2b477a9725d04727febdc66472e95328917df`
- generated entry-sequence SHA-256: `6adb5fcc0d1bc5910d38b0495d84a77a8a844e47c4a72ce2525b4a24f9de0601`

Source identity is still preserved through generation:

- source canonical-entry sequence: `abea208104e4433431e7875df77c66b69a4e1e83dbf03e9453975aceb811c94d`
- source-slice sequence: `54e1343151439f29557b3a4646e6700098392ce5c9c4be60571d5765d4e01cf8`

## Native Roblox object proof

The generated model was read back through the pinned rbx-dom reader and built into a standalone `.rbxlx` place with Rojo.

Verified native classes:

- Model: 1
- Part: 4,385
- Seat: 271
- WedgePart: 247
- CornerWedgePart: 31
- VehicleSeat: 2
- Decal: 494
- SpecialMesh: 62

Total generated descendants plus root model: **5,493 model objects**.
The rbx-dom catalog sees **5,494 instances** including the DataModel container.

The generated world contains:

- scripts: **0**
- remotes: **0**
- StarBlox gameplay code: **0**
- unique Roblox asset IDs: **154**
- asset-ID set SHA-256: `95c0e8b97478ed6ae0a36948f8568878d15b94153ceaefbc34d7088b098a6552`

## Explicit legacy adaptation policy

The Step-3 IR remains lossless. Step 4 adapts only values that Roblox cannot safely accept as ordinary generated properties:

1. Entry **832**
   - source: `Reflectance = 5`
   - generated: `Reflectance = 1`

2. Entry **844**
   - source mesh vertex color:
     `[3000000028082176, 2.999999954472962e31, 3000000028082176]`
   - generated:
     `[1, 1, 1]`

All other **4,934** entries generate without policy adaptation.

## Isolation boundary

The generated world is a standalone model/build layer only:

- StarBlox gameplay mounted: **false**
- Studio mutation started: **false**
- production place mutated: **false**
- publication started: **false**
- live activation allowed: **false**

## Reproduction

```sh
npm run roblox:brookhaven-world:generate -- \
  --out /tmp/BrookhavenWorldBaseline.rbxmx \
  --receipt /tmp/generation-receipt.json
```

CI then reads the model back through rbx-dom, validates class and asset identity, and builds a standalone isolated place with Rojo.

## Next step

**Target Architecture Step 5 — world exactness verification and StarBlox mounting.**

Step 5 should compare the generated Roblox world against the Step-3/Step-4 identities at the property level, then mount StarBlox runtime namespaces alongside the locked world without changing the baseline-world geometry or asset structure.
