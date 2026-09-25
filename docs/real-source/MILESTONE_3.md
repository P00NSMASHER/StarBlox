# Release-hardening milestone 3 — real Roblox source proof

Milestone 3 is complete.

## Pinned source

- Project: SlashMayhem-Shadow
- Repository: `jasons-open-repo/SlashMayhem-Shadow`
- Commit: `cc6aed0509d10989a4505dff354f029efcd2bf27`
- Source: `Slash-Meyhem-Shadow-Edition.rbxl`
- Exact upstream Git blob: `134605d10270906eae89edbdaba006ce91963668`
- Rights status: **project-rights-verified**
- Rights basis: user's standing authorization covering Roblox and Brookhaven assets; verification was performed on the user's other account.

The source is pinned in this repository as base64 plus a provenance record so CI can deterministically reconstruct the exact binary without depending on the upstream repository remaining unchanged.

## Real capability review

StarBlox decoded the exact pinned binary and ran the normal safe ingestion path:

`preflight -> fingerprint handoff -> capability catalog -> ingestion receipt`

Observed catalog:

| Metric | Count |
|---|---:|
| Instances | 8,586 |
| Scripts | 596 |
| Asset IDs | 13,994 |
| Capability types | 16 |
| System candidates | 36 |
| UI trees | 26 |
| Models | 198 |
| Vehicles | 22 |
| Tools | 2 |
| Animations | 8 |
| Sounds | 5 |
| Remotes | 0 |
| Houses | 0 |

Catalog hash: `fnv1a32:67baef81`

The catalog surfaced one review flag:

- `unbounded-loop-review`

That flag remains visible for downstream review. It is not treated as a reason to execute or automatically migrate the source.

## Safety boundary

This milestone performed **static inspection only**.

- imported Luau executed: **false**
- migration started: **false**
- Studio mutation started: **false**
- publication started: **false**
- live activation allowed: **false**

No source unit is approved for migration merely because it appeared in the catalog.

## Acceptance result

Milestone 3 acceptance is satisfied because:

1. a real binary Roblox place was ingested;
2. the exact upstream Git blob was reproduced before parsing;
3. the source is materially richer than the earlier baseplate proof;
4. hundreds of scripts and substantial model/vehicle/UI structure were observed;
5. system candidates were generated;
6. risk flags were preserved;
7. all existing StarBlox provenance, migration, factory, certification, balance and production-build CI gates remained green.

## Next milestone

Release-hardening milestone 4 is the first **real Studio adaptation/playtest evidence cycle**: select a bounded candidate from verified migration evidence, stage/adapt it through an attested Studio connector, run Studio tests/playtest/log/screenshot proof, and issue the existing adaptation/promotion receipts without publishing or enabling production activation.
