# Target Architecture Step 2 — Immutable Brookhaven World Fingerprint

Step 2 is **verified and corrected**.

The existing Step-1 gate remains the authoritative byte-identity check. Step 2 adds a deterministic **structural fingerprint** over those exact frozen bytes without evaluating the serialized Lua.

## Immutable identity

- source bytes: **3,182,943**
- source SHA-256: `e9abef1d41b85a8f83aca36ba661de41f4321562937c1e2eea907395c292d694`
- Step-2 fingerprint: `sha256:fde35ba75526051a3c57936a2b2e437d2a33f82a146b88f495a67821fc45dbc1`
- verified corrected CI run: `36182237878`
- rights status: `verified-for-project-use`

## Structural proof

The exact frozen source contains **4,936 top-level entries**, with every index from **1 through 4,936 present exactly once**.

- duplicates: **0**
- missing indices: **0**
- entry-index sequence SHA-256: `3a45f5552a960ee34564b25d17a96cb20e4062cb4acdb4b6a8486174e2279863`

Position bounds:

- min: `[-3705.706298828125, 3595.52783203125, -610.9105224609375]`
- max: `[-963.150634765625, 3904.85498046875, 2208.18701171875]`

Shape distribution:

- Block: 4,244
- Seat: 271
- Wedge: 247
- Cylinder: 136
- Corner: 31
- Ball: 5
- Vehicle Seat: 2

Other structural evidence includes:

- 4,936/4,936 positions fingerprinted — `b528da8fcca3e908d9d9cc776e6abafe1f4acec37a64c82ca5a3a71a82e7d6d0`
- 4,936/4,936 sizes fingerprinted — `c0c34c55b042331077f406076406f0a973d49650c29ea724a422fdca9ea357a3`
- 4,936/4,936 12-value CFrames fingerprinted — `e9790fa1d2dd287b070276344ae34de3abed79624c152f15b58211e4b04d43dc`
- 4,936/4,936 colors fingerprinted — `59924314fdbd941952f9ec3b365eb97d0e01a92384b0d8a754e9aa266610302b`
- 8 primary materials covering all 4,936 entries
- 494 decal blocks
- 62 mesh blocks
- 4,910 anchored entries
- 2,705 collidable entries
- 154 unique referenced Roblox asset IDs
- asset-ID set SHA-256: `95c0e8b97478ed6ae0a36948f8568878d15b94153ceaefbc34d7088b098a6552`

The full material and surface distributions are part of the reproducible fingerprint receipt produced by:

```
npm run roblox:brookhaven-world:verify -- --out /tmp/brookhaven-world-fingerprint.json
```

## Step-1 observation discrepancy

The frozen Step-1 manifest records `observedTopLevelEntryMarkers: 4935`.

Step 2 independently verified **4,936** top-level markers, with indices 1..4936 contiguous and unique. This is recorded as a metadata discrepancy rather than rewriting the frozen Step-1 provenance record.

The exact source byte count and SHA-256 match perfectly, so this does **not** indicate source drift.

## Safety boundary

Step 2 performs text/byte analysis only:

- source executed: **false**
- source evaluated as Lua: **false**
- source inserted into Studio: **false**
- Roblox place mutated: **false**
- publication started: **false**
- live activation allowed: **false**

## Next step

**Target Architecture Step 3: safe world deserialization.**

That step should parse this restricted serialized-world grammar into a typed intermediate representation without executing Lua, then validate each entry before any Roblox object generation.
