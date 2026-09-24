
# Roblox / Brookhaven Capability Catalog — Step 1

Step 1 creates a repeatable inventory and triage pipeline for authorized Roblox/Brookhaven place and model files.

The goal is not to copy an entire place blindly. The goal is to turn licensed Roblox content into a searchable engineering map so StarBlox can identify which systems, assets, UI, vehicles, houses, remotes and scripts are worth migrating.

## Supported source formats

The reader supports all four Roblox place/model formats through rbx-dom:

- .rbxl — binary place
- .rbxm — binary model
- .rbxlx — XML place
- .rbxmx — XML model

Source lineage is pinned to rojo-rbx/rbx-dom commit:

43d1f129f2eb1fd055512f039863ff35ae5a10f1

Relevant paths:

- rbx_binary/src/lib.rs
- rbx_xml/src/lib.rs
- rbx_dom_weak/src/viewer.rs

The Rust reader uses released rbx-dom crates matching that implementation generation:

- rbx_binary 3.0.0
- rbx_xml 3.0.0
- rbx_dom_weak 4.2.0

## Command

From the StarBlox repository:

npm run roblox:catalog -- --input /path/to/authorized/files

Optional arguments:

- --out path/to/catalog.json
- --report path/to/catalog.md
- --source-id licensed-brookhaven

The input may be one Roblox place/model file or a directory tree. The command recursively inventories every supported file.

Default outputs are:

- roblox-capability-catalog.json
- roblox-capability-catalog.md

These default outputs are gitignored so an operator does not accidentally commit source-derived proprietary metadata.

Catalog schema v2 also exposes a machine-readable `inventory` index for scripts, remotes, UI trees, models, vehicles, houses, tools, animations and sounds. These indexes point back to the exact source ID/file and instance path, so downstream tooling does not need to rescan the full instance array to answer common migration questions.

## What gets inventoried

Every Roblox instance is reduced to a stable catalog record containing:

- source file / source ID;
- normalized instance path;
- class name and instance name;
- property names;
- asset IDs referenced by properties;
- capability tags;
- reuse recommendation.

Scripts additionally store only derived engineering facts:

- stable source hash;
- source byte length;
- line count;
- Roblox services referenced with GetService;
- WaitForChild dependencies;
- numeric require asset IDs;
- named require expressions;
- remote call patterns;
- capability tags;
- security/provenance review flags.

The catalog intentionally does **not** retain full Luau source text.

The original source remains inside the authorized Roblox place/model file.

## Capability classification

The first classifier recognizes:

- housing;
- vehicles;
- UI;
- NPCs;
- quests/dialog;
- social/friend systems;
- economy;
- monetization;
- persistence;
- networking/remotes;
- placement/building;
- combat;
- tools;
- audio;
- animation;
- camera;
- teleport/travel;
- admin/moderation;
- security;
- world/environment;
- effects.

Classification uses instance classes, instance names and non-executed static script inspection.

No recovered/imported Luau code is executed by the cataloger.

## Dependency graph

The catalog combines serialized object relationships with non-executed static script analysis. Dependency edges include:

- explicit parent/child structure;
- serialized Roblox Ref-backed properties, resolved from stable rbx-dom referents to catalog instance paths when local;
- Roblox asset references;
- Roblox services used by scripts;
- numeric external module requires;
- nonnumeric require expressions;
- WaitForChild instance references;
- references that resolve to known RemoteEvent/RemoteFunction names.

This gives the next migration step a fuller dependency graph rather than forcing manual exploration in Studio.

## Reuse classes

Each instance receives one of the four migration outcomes from the original StarBlox plan.

### directly-reusable

World/model/UI/component structure with no identified behavior migration requirement. These are candidates for direct staging under the user's confirmed Roblox/Brookhaven rights, while still respecting system-level dependency checks.

### reusable-after-refactor

Scripts and remote contracts whose domain behavior may be valuable, but which must be adapted behind StarBlox's server-authoritative, tested boundaries before activation.

### asset-only

Visual/audio asset-bearing instances whose useful value is independent of the original behavior implementation.

### irrelevant

Instances for which the catalog finds no standalone StarBlox migration value. Downstream migration planning fails closed on this class and will not export it merely because a broad rule or explicit system name happens to match.

## Risk review is separate from reuse class

Security/provenance/runtime risk is represented independently with `reviewRequired` plus script `riskFlags`; it is not a fifth reuse outcome.

Current automatic review flags include:

- dynamic code/loadstring;
- external HTTP;
- numeric external module require;
- runtime environment/debug introspection;
- obvious unbounded loops.

A review flag does not declare the source unsafe or unusable. It means a reusable-after-refactor system must stay quarantined until the dependency is reviewed.

## System candidates

Top-level Roblox systems are grouped and scored using:

- instance count;
- script density;
- remote density;
- asset count;
- capability diversity.

The result is a sorted engineering-leverage queue.

## Exact source provenance

When files are ingested through the CLI, every .rbxl/.rbxm/.rbxlx/.rbxmx source is fingerprinted with SHA-256 plus byte length. The fingerprint is retained in `generatedFrom`, carried onto inventory instances and migration units, and verified again immediately before any migration export.

A same-named file that changes after catalog review is rejected instead of silently producing a bundle from different source bytes.

For a licensed Brookhaven place this should quickly surface systems such as:

- housing/garage systems;
- vehicles;
- wardrobe/avatar UI;
- job/economy systems;
- social/party systems;
- admin/moderation systems;
- interactive buildings;
- transport/teleport;
- furniture/placement;
- NPC/traffic systems.

The score is a triage heuristic, not a claim of product quality.

## Catalog integrity

Catalog contents receive a deterministic project-standard hash.

Tests prove:

- deterministic output regardless of source ordering;
- catalog tamper detection;
- script source is not copied into catalog output;
- asset-ID extraction;
- parent/property/asset/service/module/remote dependency discovery;
- exact source-fingerprint retention and validation;
- system grouping;
- capability classification;
- security-review flags.

## CI

StarBlox CI now validates both sides of the pipeline:

1. Rust unit tests compile and exercise rbx-dom XML deserialization.
2. A real .rbxmx fixture is read by the Rust binary.
3. The Node catalog command consumes the reader output.
4. JSON and Markdown artifacts are smoke-tested.
5. Migration smoke tests prove a deliberately changed source file is rejected.
6. The normal StarBlox tests, certification gate, balance gate and production build still run afterward.

## Rights / operational boundary

This tool is designed to process Roblox content the operator is authorized to use.

For this project, the user has stated commercial rights/licenses for the relevant Roblox and Brookhaven content.

The catalog does not fetch third-party assets, authenticate to Roblox, upload anything, execute scripts or modify source places.

It only reads local authorized place/model files and creates review metadata.

## What Step 1 deliberately does not do

Step 1 does not yet:

- rewrite or migrate Brookhaven scripts;
- convert systems into StarBlox modules;
- install BloxForge/Nixera;
- upload assets or places;
- modify Roblox Studio projects;
- automatically trust external module IDs;
- choose which Brookhaven systems to ship.

Those become downstream work after the real licensed source files are run through this inventory pipeline.
