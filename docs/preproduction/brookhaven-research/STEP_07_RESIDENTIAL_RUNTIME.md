# Brookhaven Research — Step 7 of 12: Residential Feature Runtime

Status: **COMPLETE — StarBlox-neutral runtime implemented; not wired live**

Runtime:

`src/residentialFeatureRuntime.js`

Tests:

`src/residentialFeatureRuntime.test.js`

Research-to-neutral mapping:

`docs/preproduction/brookhaven-research/residential-feature-blueprint-v1.json`

The runtime converts the verified residential taxonomy into neutral StarBlox interactions:

- front / garage / sliding doors;
- mailbox and safe;
- oven, fridge, dishwasher;
- hot tub power;
- doorbell;
- room selection;
- house controls;
- fire/disaster-control concept;
- dresser/storage.

The module is deterministic and local-only. It has no Brookhaven RemoteEvent/RemoteFunction dependency and is not imported by `App.jsx`.

Progression, economy, unlock requirements, persistence migration, and player-facing UI are intentionally deferred to later plan steps so this branch does not collide with the still-moving StarBlox product work.
