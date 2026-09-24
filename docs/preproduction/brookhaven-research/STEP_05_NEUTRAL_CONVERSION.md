# Brookhaven Research — Step 5 of 12: Neutral Conversion Pipeline

Status: **COMPLETE — deterministic neutral converter implemented**

The converter is:

`scripts/convertBrookhavenNeutralScene.mjs`

The contract is:

`docs/preproduction/brookhaven-research/conversion-contract-v1.json`

The converter does not fetch Roblox/Brookhaven servers and does not execute third-party code. It accepts only structured, provenance-described input and emits a deterministic StarBlox-neutral scene manifest.

Key rules:

- configurable source-units → meters normalization;
- default Roblox-style `[x,y,z] → [x,y,-z]` handedness conversion;
- deterministic object ordering;
- collision proxy normalization;
- source and output SHA-256 fingerprints;
- executable fields are rejected;
- a user-asserted rights state remains research-only until rights evidence is recorded;
- original StarBlox proxy geometry is eligible for QA immediately.

No raw Brookhaven mesh/texture payload has been claimed or fabricated in this step.
