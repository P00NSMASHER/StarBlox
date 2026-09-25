# Target Architecture — Step 1: Authoritative World Source

Status: **COMPLETE — pinned serialized world source; no conversion or publication**

## Frozen source

StarBlox now carries an exact, reconstructable copy of the pinned serialized Brookhaven map revision used as the world-clone source baseline.

- Gist: `hahssas/800060cf55ddf767c6d0e57e6248b51d`
- Revision: `6970071894be634d70b67b895b85d2299126b065`
- File: `gistfile1.txt`
- Title marker: `-- Brookhaven Map`
- Exact bytes: **3,182,943**
- SHA-256: `e9abef1d41b85a8f83aca36ba661de41f4321562937c1e2eea907395c292d694`
- Highest observed top-level serialized index: **4936**

The payload is stored in eight ordered chunks under:

`research-inputs/brookhaven/world-baseline/source/`

Concatenating those files in manifest order with **no separator** reproduces the exact pinned source bytes.

## Machine-readable authority

The source of truth is:

`research-inputs/brookhaven/world-baseline/WORLD_SOURCE_MANIFEST.json`

The verifier is:

`npm run roblox:world-source:verify`

The verifier fails closed on missing/reordered chunks, byte-size drift, per-chunk hash drift, whole-payload hash drift, missing title marker, missing terminal index witness, or an apparent truncated ending.

## Rights context

Project operating status remains **verified-for-project-use**, based on the user's previously confirmed rights evidence and current explicit authorization for commercial, educational, and other project purposes. Public-source provenance remains recorded separately.

## Exactness boundary

This step establishes an exact immutable baseline for **this pinned serialized map revision**.

It deliberately does **not** claim that the payload is byte-identical to the current live Brookhaven Roblox place. A global repository search did not locate a fuller Brookhaven `.rbxl` or `.rbxlx` source during Step 1. That limitation is encoded in the manifest so later steps cannot silently upgrade the claim.

## Safety / release boundary

Step 1 performs no:

- world conversion;
- Roblox Studio mutation;
- StarBlox runtime mounting;
- place publication;
- live activation.

Those are separate gated steps.

## Step 1 exit criteria

- full serialized source retrieved from the exact revision: **PASS**
- source frozen inside StarBlox: **PASS**
- exact whole-payload SHA-256 recorded: **PASS**
- deterministic reconstruction from repository chunks: **PASS**
- rights/provenance status bound to source manifest: **PASS**
- overclaim protection for live-place parity: **PASS**
- publication/live activation disabled: **PASS**

**Step 1 is complete.**
