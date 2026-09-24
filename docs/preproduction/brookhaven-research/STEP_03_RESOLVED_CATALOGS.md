# Brookhaven Research — Step 3 of 12: Resolve Catalogs

Status: **COMPLETE FOR IDENTIFIERS / PAYLOAD RESOLUTION REMAINS EXPLICITLY OPEN**

Step 3 resolves the catalog structure as far as the pinned public evidence supports without pretending a name or runtime ID is itself a recovered mesh.

Machine-readable result:

`docs/preproduction/brookhaven-research/resolved-catalogs-v1.json`

## Resolved property identifiers

- `001_Landmark`
- `031_House`
- `049_House`
- `052_House`
- `056_House`

`031_House` is explicitly marked as corroborated from an additional pinned public source rather than being silently folded into the original Step 1 artifact set.

## Resolved catalog roots

The runtime scan confirms loadable categories for:

- Houses
- Mansions
- Motels
- Apartments
- Jobs

The categories are resolved; their backing tables are **not yet recovered**.

## Resolved lots

29 numbered house lots are directly evidenced:

1–7, 11–24, and 28–35.

## Resolved vehicle names

Current/cross-source set:

- Cadillac
- Excavator
- FarmTruck
- FireTruck
- Jeep
- Limo
- MilitaryTruck
- NascarTruck
- SchoolBus
- SmartCar
- Snowplow
- Tank
- TowTruck

Legacy/versioned set:

- Thunderbird
- Ladybug
- Offroader
- Golf Cart

The runtime function `GetListOfPortedVehicles` is confirmed, but its return payload is not present in the frozen data. That remains a high-value unresolved target.

## Important distinction

**Resolved identifier != recovered asset.**

At the end of Step 3 we have the exact names/IDs and catalog surfaces needed to search or map assets, but no claim is made that the corresponding Brookhaven mesh/texture payload for each entry has been recovered.
