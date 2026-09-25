# Brookhaven Research — Step 8 of 12: Neutral Vehicle System

Status: **COMPLETE — hardened neutral vehicle system; runtime remains not wired live**

Step 8 is complete at the research boundary.

## Core vehicle runtime

The existing local StarBlox-neutral vehicle runtime remains unchanged:

- `docs/preproduction/brookhaven-research/vehicle-system-blueprint-v1.json`
- `src/vehicleSystemRuntime.js`
- `src/vehicleSystemRuntime.test.js`

It supports the 13 evidenced current vehicle identifiers with local-only spawn/despawn state, headlights, hazards, cosmetic paint/wheel tokens, driving-mode metadata, and emergency lights/siren only for the emergency archetype.

The four legacy identifiers remain research/runtime metadata only and are not included in the current neutral definition catalog.

## Hardened neutral definition layer

Step 8 now also includes a closed, rights-aware definition boundary:

- `docs/preproduction/brookhaven-research/neutral-vehicle-definition-schema-v1.json`
- `docs/preproduction/brookhaven-research/neutral-vehicle-definition-catalog-v1.json`
- `src/neutralVehicleDefinitionCatalog.js`
- `src/neutralVehicleDefinitionCatalog.test.js`

The catalog contains exactly 13 current neutral definitions. It is deterministic, deeply frozen after loading, and remains `identifier-only`: no mesh, texture, or other geometry payload is claimed or attached.

Definitions require `project-rights-verified`, prohibit external runtime and remote dependencies, and prohibit weapon behavior.

## Read-only runtime preview and parity proof

The final Step 8 hardening layer is:

- `src/neutralVehicleRuntimePreview.js`
- `src/neutralVehicleRuntimePreview.test.js`

The adapter converts the validated neutral catalog into a deterministic, deeply frozen, read-only runtime-preview/config shape.

The adapter itself does **not** import or invoke `vehicleSystemRuntime.js`, spawning actions, networking, or the live application. Tests compare the preview against the existing current runtime contract and fail if the 13 current IDs, archetypes, eras, asset status, or capabilities drift apart.

Special boundaries remain explicit:

- `tank` is display-only and has no weapon behavior.
- `fire-truck` is the emergency archetype and is the only current definition with emergency-light/siren capabilities.

## Completion receipt

Machine-readable completion proof:

- `docs/preproduction/brookhaven-research/step-08-vehicle-completion-v2.json`

The Brookhaven research validator enforces the receipt and its safety boundaries.

## Live-product boundary

Step 8 completion does **not** authorize or perform live integration.

There are no Brookhaven remote calls, no external runtime dependency, no live `App.jsx` wiring, no persistence changes, no economy changes, no networking changes, and no deployment.

Authorized visual payloads may only be attached later through the Step 5 neutral conversion contract after content and technical QA.
