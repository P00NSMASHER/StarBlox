# Brookhaven → StarBlox Migration Layer — Step 5

Step 5 turns the Step 1 capability catalog into a repeatable staging compiler for authorized Roblox/Brookhaven systems.

The workflow is deliberately catalog → plan → export → review rather than copying an entire place into StarBlox and debugging it afterward.

## Goals

- Select high-leverage licensed systems from the capability catalog.
- Preserve exact source file SHA-256/byte-size and instance-path provenance.
- Distinguish direct assets from behavior that must be refactored.
- Expose external module and remote dependencies before migration.
- Export exact Roblox subtrees as standalone model files.
- Bind every exported file to an immutable migration plan and SHA-256 receipt.
- Keep all outputs in staging or quarantine until a later explicit activation step.

Nothing in Step 5 publishes a Roblox place or inserts migrated content into live Workspace or ServerScriptService.

## Source lineage

The exact file reader/writer remains the Step 1 pinned rbx-dom stack:

- rojo-rbx/rbx-dom
- commit 43d1f129f2eb1fd055512f039863ff35ae5a10f1
- rbx_binary/src/lib.rs
- rbx_xml/src/lib.rs

The extraction workflow is also adapted from rojo-rbx/remodel:

- commit 011748c4ecedda35aec79bbbf532deb08335b6e7
- examples/02-extract-models.lua

That upstream pattern loads a place, selects specific model subtrees, and writes them as individual Roblox model files. StarBlox adds catalog-driven selection, quarantine and immutable integrity metadata around the same idea.

## Migration plan

buildRobloxMigrationPlan consumes a verified Step 1 capability catalog.

Each unit records:

- immutable unit ID;
- source ID and source file;
- exact Roblox root path;
- capability tags;
- engineering-leverage score;
- asset IDs;
- dependency edges;
- external dependencies;
- risk flags;
- instance/script/remote/asset counts;
- migration strategy;
- staging target suggestion;
- selection reason and blockers.

The whole plan receives a deterministic StarBlox plan hash and ID.

## Migration strategies

### extract

Structure/assets with no identified executable behavior dependency. Exported to staging.

### asset-only

Visual/audio-heavy systems whose useful value is independent of original behavior. Exported to staging.

### refactor

Systems containing scripts/remotes but no catalog risk flag. The authorized subtree may be exported, but it goes to quarantine so the Step 2 factory can adapt it behind StarBlox server/client boundaries and tests.

### quarantine

Systems containing review flags such as dynamic code, external HTTP, numeric external module require, runtime introspection or obvious unbounded loops.

Risk-flagged units are excluded by default and require includeRisky to enter an export plan.

### ignore

Catalog systems classified as irrelevant are never selected for migration. An explicit includeSystems override cannot promote an irrelevant unit; it remains excluded and produces no staging artifact.

## Default migration focus

The default capability set is:

- housing;
- vehicles;
- UI;
- NPCs;
- quests;
- social systems;
- placement/building;
- animation;
- audio;
- world/environment;
- effects.

Legacy economy, persistence, networking and security logic is not selected merely because it exists. Those responsibilities generally belong behind the Step 3 production backbone.

## Rules

Example rules are committed at config/roblox-migration.rules.example.json.

Supported fields:

- includeCapabilities
- excludeCapabilities
- includeSystems
- excludeSystems
- minEngineeringLeverageScore
- includeRisky

Explicitly included system names bypass capability and minimum-score filters, but risk-flagged systems still require includeRisky and irrelevant systems remain excluded.

## Exact subtree exporter

tools/roblox_migration_exporter is a Rust CLI built on rbx-dom.

It:

1. loads rbxl, rbxm, rbxlx or rbxmx;
2. resolves the exact catalog path;
3. refuses ambiguous duplicate sibling names;
4. serializes only that subtree;
5. writes rbxmx or rbxm.

The migration operator command uses rbxmx because it is convenient for staging and inspection.

No Luau is executed.

## Operator command

Plan and export:

npm run roblox:migrate -- --catalog roblox-capability-catalog.json --source-root /path/to/authorized/brookhaven --out-dir roblox-migration-bundle

Custom rules:

npm run roblox:migrate -- --catalog roblox-capability-catalog.json --source-root /path/to/authorized/brookhaven --rules config/my-migration-rules.json

Plan only:

npm run roblox:migrate -- --catalog roblox-capability-catalog.json --out-dir roblox-migration-bundle

Explicit risk review:

npm run roblox:migrate -- --catalog roblox-capability-catalog.json --source-root /path/to/authorized/brookhaven --rules config/my-rules.json --include-risky

A one-off threshold may be supplied with --min-score.

## Output layout

roblox-migration-bundle/
- migration-plan.json
- migration-plan.md
- migration-bundle.json
- staging/<unit-id>.rbxmx
- quarantine/<unit-id>.rbxmx

The default output directory is gitignored because it can contain source-derived licensed models.

## Staging targets

Suggested targets always live under ServerStorage/StarBloxMigration/.

Buckets include Housing, Vehicles, UI, Social, Placement, World, Media, Effects and Quarantine.

These are staging suggestions only. Step 5 performs no Studio mutation.

## Bundle integrity

Every exported model is recorded with:

- migration unit ID;
- source ID/file/root path;
- migration strategy;
- staging/quarantine disposition;
- relative output path;
- SHA-256 file digest;
- byte size;
- suggested staging target;
- activation = staging-only.

migration-bundle.json is also protected by a deterministic StarBlox bundle hash.

The manifest explicitly contains liveActivationAllowed = false.

Step 5 exposes no function that changes that flag into deployment authority.

## Dependency handling

The migration plan carries the Step 1 dependency edges, including Roblox services, numeric module requires, instance/remote references and asset IDs.

External module requires and unresolved remote references become blockers before a migrated unit is considered activation-ready.

## Relationship to Steps 2–4

Step 2 AI Development Factory consumes quarantine/refactor units for inspection, script adaptation, transactional edits, tests, playtests, screenshots/log evidence and bounded repair loops.

Step 3 production backbone is the preferred target for persistence, replication, typed networking and high-volume ECS behavior instead of retaining legacy authority boundaries.

Step 4 intelligence remains server-side/shadow-gated and is not rewritten around imported systems.

## CI

CI proves the full migration chain on the committed Roblox fixture:

1. capability catalog generation;
2. migration exporter Rust tests;
3. migration plan generation;
4. exact subtree export;
5. staging/quarantine manifest creation;
6. liveActivationAllowed remains false;
7. every artifact remains staging-only;
8. normal StarBlox unit tests, balance gate and production build still pass.

## Scope boundary

Step 5 does not upload assets, insert models into a live place, publish a place, spend Robux, execute imported Luau, trust legacy persistence/remotes, or automatically convert Brookhaven logic into StarBlox services.

It creates exact, reviewable migration inputs for those later controlled steps.

## Repair hardening: exact plan binding

A migration bundle is no longer accepted merely because its own manifest hash is self-consistent.

verifyMigrationBundleAgainstPlan() rebinds the bundle to the exact migration plan and checks plan/catalog identities plus every selected unit's source, root path, migration strategy, disposition, and staging target. Every selected unit must appear exactly once.

The resulting plan-binding hash is carried into automated content-expansion evidence.
