# Real Roblox Source Proofs

StarBlox keeps external Roblox source proofs separate from production game content.

## BloxForge baseplate proof

Pinned source:

- repository: `princeofscale/bloxforge`
- commit: `ef98c370b6e0dd93273eae245485b547b09aca53`
- path: `packages/core/assets/Baseplate.rbxl`
- upstream Git blob: `710aa68f25ae659157493d386a9d6508e0331e10`
- license: MIT

Purpose: prove the StarBlox reader and safe-ingestion pipeline can process a genuine binary `.rbxl` file from a pinned, licensed public source.

Observed CI review at merge of PR #57:

- 80 instances
- 0 scripts
- 0 remotes
- 7 capabilities
- 53 system candidates
- 1 UI tree
- no migration, Studio mutation, or publication

This is a compatibility proof, not a meaningful gameplay corpus.

## OpenChassis richer-corpus proof

Pinned source:

- repository: `OpenChassis/OpenChassis`
- commit: `7466df436875f81d923acf9b946e44f5dd3840a0`
- path: `demo clutter/DemoPlace.rbxl`
- upstream Git blob: `f68b29d449941b24cd070b4988a1852a2b67d5f3`
- license: MIT

The repository describes the place as its OpenChassis demo and states that OpenChassis is intended as a scriptable Roblox vehicle/chassis system.

Milestone-3 acceptance requires the safe-ingestion capability review to prove, at minimum:

- exactly one pinned source fingerprint;
- more than 80 instances;
- at least one script;
- more than 7 detected capabilities;
- more than 53 system candidates;
- `status=cataloged`;
- `migrationStarted=false`;
- `studioMutationStarted=false`;
- `publicationStarted=false`.

CI prints the complete summary and inventory counts as
`MILESTONE3_OPENCHASSIS_REVIEW=...`.

Passing this gate means StarBlox has proven its ingestion/catalog layer against both:

1. a real binary Roblox baseplate; and
2. a materially richer, rights-cleared Roblox system corpus.

It does **not** authorize migration, Studio mutation, publication, or live activation. Those remain separate later-stage authorities.
