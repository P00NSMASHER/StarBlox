# Target Architecture Step 1 — Verification Gate

Step 1's frozen Brookhaven world source is stored under:

`research-inputs/brookhaven/world-baseline/`

The authoritative metadata is `AUTHORITATIVE_SOURCE.json`.

Run:

`npm run roblox:world-source:verify`

The verifier reconstructs the exact source from all eight ordered chunks and fails closed on:

- missing or reordered chunks;
- chunk byte-length drift;
- per-chunk SHA-256 drift;
- whole-source byte-length drift;
- whole-source SHA-256 drift;
- mismatch between repository bytes and manifest reconstruction claims;
- missing Brookhaven map title marker;
- missing serialized index 4936 witness;
- apparent truncation;
- any Step 1 boundary that claims execution, Roblox-place mutation, publication, or live activation.

Expected immutable identity:

- bytes: **3,182,943**
- SHA-256: `e9abef1d41b85a8f83aca36ba661de41f4321562937c1e2eea907395c292d694`
- Gist revision: `6970071894be634d70b67b895b85d2299126b065`

This gate verifies the exact pinned serialized-map revision used by StarBlox. It does not claim byte identity with the current live Brookhaven place.
