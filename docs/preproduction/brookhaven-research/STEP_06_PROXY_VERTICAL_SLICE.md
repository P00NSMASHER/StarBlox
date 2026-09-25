# Brookhaven Research — Step 6 of 12: Proxy Vertical Slice

Status: **COMPLETE — original proxy vertical slice built and converter-validated**

This step deliberately uses **original StarBlox proxy primitives**, not unrecovered Brookhaven meshes.

Source fixture:

`docs/preproduction/brookhaven-research/fixtures/vertical-slice-proxy-source-v1.json`

Visual preview:

`docs/preproduction/brookhaven-research/vertical-slice-preview-v1.svg`

Validator:

`scripts/validateBrookhavenProxyVerticalSlice.mjs`

The slice contains all five roles required by the integration plan:

1. one house;
2. one School Bus proxy;
3. one neighborhood block with road/sidewalks;
4. one school;
5. one clothing shop.

The house proxy also contains a front door, garage door, and mailbox so Step 7 can begin against a real normalized feature surface.

The validator passes the source through the Step 5 neutral converter, then verifies role coverage, meters/right-handed coordinates, collision bounds, scene size, provenance, and production eligibility.

This is a **pipeline/layout prototype**, not a claim of Brookhaven visual parity.
