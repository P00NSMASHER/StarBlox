# Brookhaven Research — Step 9 of 12: Town System Reconstruction

Status: **COMPLETE — hardened neutral town system; runtime remains not wired live**

Step 9 is complete at the research boundary.

## Core town runtime

The existing local StarBlox-neutral town runtime remains unchanged:

- `docs/preproduction/brookhaven-research/town-system-blueprint-v1.json`
- `src/townSystemRuntime.js`
- `src/townSystemRuntime.test.js`

It preserves 17 evidence-backed location concepts, with exactly 15 player-facing locations and 2 research-deferred locations. It supports local unlock state, visits, and deterministic routing through unlocked locations.

The two research-deferred locations are:

- `mystery-zone`
- `restricted-zone`

They cannot enter player-facing runtime state.

## Hardened neutral location layer

Step 9 now includes a closed, rights-aware location definition boundary:

- `docs/preproduction/brookhaven-research/neutral-town-location-schema-v1.json`
- `docs/preproduction/brookhaven-research/neutral-town-location-catalog-v1.json`
- `src/neutralTownLocationCatalog.js`
- `src/neutralTownLocationCatalog.test.js`

The catalog contains exactly 17 deterministic neutral location definitions and preserves the exact 15/2 player-facing/deferred split.

The loader returns an independent deeply frozen snapshot and fails closed on duplicate IDs, eligibility/category drift, rights drift, remote/runtime dependencies, exact-source-coordinate claims, and open-contract fields.

## Original StarBlox proxy topology

Topology is formalized separately from source evidence:

- `docs/preproduction/brookhaven-research/starblox-proxy-town-topology-v1.json`
- `src/starBloxProxyTownTopology.js`
- `src/starBloxProxyTownTopology.test.js`

The graph contains exactly 14 undirected edges across the 17 location IDs.

This topology is explicitly **original StarBlox proxy design**. Step 9 makes no claim that it reproduces the source game's exact coordinates, road layout, or topology.

Both deferred locations have topology degree zero and cannot leak into the player-facing proxy graph.

The topology loader fails closed on unknown, duplicate, self, or deferred-zone edges; source-map parity claims; runtime/remote dependencies; and live quest routing.

## Read-only runtime preview and parity proof

The final Step 9 hardening layer is:

- `src/neutralTownRuntimePreview.js`
- `src/neutralTownRuntimePreview.test.js`

The adapter converts the validated location catalog and proxy topology into a deterministic, deeply frozen, read-only runtime-preview/config shape.

The adapter itself does **not** import or invoke `townSystemRuntime.js`, unlock/visit/route actions, networking, or the live application.

Tests independently prove:

- exact parity for all 17 runtime location IDs;
- exact label/category/player-facing eligibility parity;
- exact undirected parity with all 14 `STARBLOX_PROXY_TOWN_EDGES`;
- exactly 15 player-facing and 2 deferred locations;
- zero adjacency for the two deferred locations;
- no exact-source coordinate, road-layout, or topology claim.

## Completion receipt

Machine-readable completion proof:

- `docs/preproduction/brookhaven-research/step-09-town-completion-v2.json`

The Brookhaven research validator independently enforces the receipt, catalog, topology, parity boundaries, and source/live-system separation.

## Live-product boundary

Step 9 completion does **not** authorize or perform live integration.

There are no source-game remotes, no external runtime dependency, no live `App.jsx` wiring, no live Quest routing, no persistence changes, no economy changes, no networking changes, and no deployment.
