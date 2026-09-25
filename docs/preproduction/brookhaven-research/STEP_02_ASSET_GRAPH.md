# Brookhaven Research — Step 2 of 12: Asset Graph

Status: **COMPLETE — normalized research graph; no asset payload integration**

The machine-readable graph is:

`docs/preproduction/brookhaven-research/asset-graph-v1.json`

It converts the frozen Step 1 evidence into typed nodes and evidence-backed relationships covering:

- property/house identifiers;
- current and legacy vehicle names;
- numbered house lots;
- house interaction/features;
- town institutions/destinations;
- loadable Brookhaven content categories;
- vehicle runtime capability names retained as architecture metadata only.

Every non-root node carries an evidence pointer. Runtime remotes are deliberately modeled as **architecture metadata**, not executable integration targets.

A validator is provided at:

`scripts/validateBrookhavenResearchArtifacts.mjs`

Step 2 does not copy third-party meshes, textures, place files, or executable payloads into StarBlox.
