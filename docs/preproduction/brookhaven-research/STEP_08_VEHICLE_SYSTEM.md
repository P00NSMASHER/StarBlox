# Brookhaven Research — Step 8 of 12: Neutral Vehicle System

Status: **COMPLETE — vehicle runtime implemented, not wired live**

Artifacts:

- `docs/preproduction/brookhaven-research/vehicle-system-blueprint-v1.json`
- `src/vehicleSystemRuntime.js`
- `src/vehicleSystemRuntime.test.js`

The runtime preserves the 13 evidenced current Brookhaven vehicle names as source metadata while exposing StarBlox-neutral IDs and local-only behavior.

It supports local spawn/despawn state, headlights, hazards, cosmetic paint/wheel tokens, driving-mode metadata, and emergency lights/siren only for the emergency archetype.

No Brookhaven remote call or server state is used.

The current visual state remains `identifier-only`: Step 8 does not claim that any vehicle mesh/texture payload has been recovered. Authorized visual payloads can be attached later through the Step 5 neutral conversion contract using `project-rights-verified`.
