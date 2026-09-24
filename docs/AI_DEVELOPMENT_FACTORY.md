
# StarBlox AI Development Factory — Step 2

Step 2 creates a provider-neutral control plane for AI-assisted Roblox Studio development.

The factory is designed around two proven upstream patterns:

- BloxForge: transactional mutations, safety budgets, rollback receipts, live gameplay assertions, playtest telemetry, and snapshot/apply/verify/rollback sequencing.
- Nixera Roblox AI Studio: Coordinator → Planner → Coder → Reviewer → Test Engineer collaboration, Studio inspection/editing, logs, viewport capture, input simulation, and undo-grouped mutations.

StarBlox owns the orchestration contract and can connect to either implementation style through an adapter.

## What the factory does

One development run follows this order:

1. Inspect the current Studio DataModel and scripts.
2. Ask the planner for an implementation plan and acceptance conditions.
3. Allow additional targeted inspection requested by the plan.
4. Ask the coder for a bounded set of Studio tool calls.
5. Validate every tool call against the Studio safety contract.
6. Capture rollback information before persistent mutations.
7. Apply one atomic mutation batch.
8. Run Studio tests.
9. Read Studio error logs.
10. Run or observe a playtest when runtime proof is required.
11. Optionally simulate keyboard/mouse input.
12. Optionally sample runtime state.
13. Optionally run gameplay assertions.
14. Optionally capture the live viewport and pass it to a visual reviewer before factory-started playtest teardown.
15. Run the repository tests, explicit certification gate, balance gate and production build.
16. Ask the reviewer to pass, repair, or fail.
17. If repair is requested, run a bounded repair cycle and verify again.
18. If the run does not verify, roll every reversible batch back in reverse order.

A run cannot loop forever. Repair cycles and mutation counts are hard-bounded.

## Agent contract

An adapter supplies:

- agents.plan(context)
- agents.code(context)
- agents.review(context)

Optional hooks:

- agents.repair(context)
- agents.visualReview(context)

This maps naturally to Nixera's Planner / Coder / Reviewer / Test Engineer model while allowing one model or another orchestration system to implement several roles.

The factory itself runs the deterministic proof steps instead of trusting an agent's statement that the feature works.

## Studio tool contract

The initial allowlisted Studio surface includes read operations such as:

- search_tree
- inspect_instance
- list_children
- script_grep
- read_script
- read_all_scripts

Mutation operations:

- write_script
- edit_script
- create_instance
- set_property

Runtime / QA operations:

- run_tests
- get_logs
- get_run_state
- simulate_input
- capture_viewport
- start_playtest
- stop_playtest
- playtest_sample_state
- run_gameplay_assertions
- run_playtest_episode
- summarize_episode

Destructive delete and arbitrary run_luau are disabled by default.

There are deliberately no tools for publishing places, purchasing assets, spending Robux, making external commitments, or changing production Open Cloud configuration.

## Safety rules

### Tool allowlist

Unknown tools are rejected before they reach Studio.

A request such as publish_place is therefore not merely discouraged — it is outside the factory protocol.

### Stage restrictions

Each tool is valid only in defined stages such as inspect, code, test, review, or repair.

For example, mutating tools cannot be introduced by the planner during inspection.

### Generic mutation boundaries

Generated script instances must be created through write_script with create=true. create_instance cannot create Script, LocalScript or ModuleScript instances.

Generic property mutation cannot write identity/source-sensitive fields such as Source, Parent, Name, ClassName, ScriptGuid, UniqueId or HistoryId. This prevents set_property/create_instance from bypassing generated-Luau scanning or invalidating path-based rollback plans.

### Script-size and input budgets

The factory caps:

- individual script source size;
- simulated-input action count;
- mutation calls per batch;
- total mutation calls across the complete run;
- repair cycles.

### Destructive operations

delete_instance is disabled in automated runs unless a caller deliberately opts into destructive mode and confirmation.

Protected Roblox roots receive additional warnings.

### Arbitrary Luau

run_luau is disabled by default.

When explicitly enabled, executable source is scanned after strings/comments are removed so calls such as Destroy, SetAsync, RemoveAsync, loadstring, getfenv, setfenv and debug APIs cannot hide behind string literals.

Calls matching dangerous patterns require explicit confirmation.

### Whole-batch preflight checkpoint

Before the first persistent mutation in a batch, the factory now performs a complete safety/rollback preflight across **every** requested operation.

It captures all readable prior script/property state up front. If any later operation lacks deterministic rollback coverage, the entire batch is rejected before the first write lands.

create_instance is the only deferred case because its rollback target path does not exist until Studio creates it; the returned created path must immediately become a deterministic delete rollback or the batch is treated as partial/high-risk.

This gives every mutation cycle a dry-run/checkpoint boundary rather than relying only on rollback after a later failure.

### Rollback coverage

Persistent mutations must have deterministic rollback coverage by default.

Before a script edit, the existing script Source is read and retained only inside the live rollback plan.

For write_script(create=true), a failed source read is **not** treated as proof that the target is absent. The factory also inspects the path before deciding that deletion would be a valid rollback. An existing-but-unreadable script therefore blocks the mutation rather than risking deletion of pre-existing work.

Before set_property, the current property value must be inspectable.

create_instance must return the exact created path so it can be deleted on rollback.

A mutation whose prior state cannot be captured is refused before it changes Studio.

Unrollbackable mutation paths can only be enabled through an explicit high-risk configuration option.

### Atomic batches

If one call fails in an atomic batch, previously applied calls are reversed immediately.

If any reversal itself fails, the receipt reports rollbackComplete=false / partial state instead of falsely claiming the place is clean.

### Failed development runs

A final reviewer rejection, failed proof, missing runtime evidence, exhausted repair budget, or failed repository gate triggers rollback of every successful batch unless keepFailedChanges was explicitly requested.

## Proof requirements

### Studio tests

When tests are required, an empty test suite does **not** count as green.

At least one test/result must execute and all failures must be zero.

Executable Studio test loading is restricted to dedicated test roots:

- ServerScriptService/Tests
- ReplicatedStorage/Tests
- ServerStorage/Tests

The planner cannot point run_tests at an arbitrary game subtree and cause unrelated ModuleScripts to execute as tests. The built-in Studio connector independently enforces the same boundary immediately before loading test source.

### Runtime proof

The preferred BloxForge-style path is run_playtest_episode, which must return an explicit pass/verified verdict or ok=true.

A vague object with no verdict no longer counts as success.

When episode mode is unavailable, the factory can use the lower-level flow:

start_playtest
→ get_run_state
→ simulate_input
→ playtest_sample_state
→ run_gameplay_assertions
→ get_logs
→ stop_playtest

If the adapter cannot start Play itself, an already-running Nixera-style Studio session can satisfy the same evidence path.

### Visual proof

When a plan marks visual verification as required, capture_viewport must succeed and an agents.visualReview hook must explicitly accept the image.

Raw screenshot bytes are never written into the development-run artifact.

Only dimensions and a stable artifact hash are retained.

### Repository proof

The bundled CLI runs:

npm test
npm run certification:gate
npm run balance:gate
npm run build

A Studio feature does not verify if the configured repository proof is missing or any required gate regresses. The bundled CLI requires tests, certification, balance and build receipts. Gate receipts may be simple booleans or structured command results with `ok: true`.

The core factory defaults to the same four required gates for programmatic callers. A specialized harness may deliberately pass `requiredRepositoryGates: []`, but the bundled CLI overwrites that field after adapter/task configuration so normal AI development runs cannot downgrade the release-proof requirement.

## Audit artifact

Each run produces an immutable JSON artifact containing:

- task identity;
- plan summary and acceptance conditions;
- stage/cycle history;
- mutation count and mutation hash;
- sanitized tool receipts;
- test/runtime/visual evidence summaries;
- reviewer findings;
- rollback result;
- repository gate result;
- deterministic run hash.

The artifact intentionally does not retain:

- full script Source;
- image/base64 pixel data;
- raw screenshot buffers.

Studio/log strings are passed through the existing privacy sanitizer before persistence in the run artifact.

The default file name ai-development-run.json is gitignored.

## CLI

Run a provider-specific adapter module with:

npm run studio:factory -- --task task.json --adapter ./my-studio-adapter.mjs --out ai-development-run.json

The adapter module must export:

- studio.call(tool, args)
- optionally studio.has(tool)
- agents.plan
- agents.code
- agents.review
- optionally agents.repair
- optionally agents.visualReview
- optional config

This keeps model-provider and Studio-transport choices outside StarBlox's core orchestration logic.

## Local bridge

A small provider-neutral queue bridge is included:

npm run studio:bridge

Default endpoint:

http://127.0.0.1:38473

Transport endpoints:

- POST /call — AI/factory submits a Studio tool request.
- POST /poll — a Studio connector polls for pending work.
- POST /result — the connector resolves or rejects a pending request.
- GET /health — bridge status.

The default bind is loopback-only.

If the bridge is bound to a non-loopback interface, STARBLOX_STUDIO_BRIDGE_TOKEN or --token is mandatory.

createStudioHttpAdapter() can send the same token.

The bridge is intentionally only transport.

StarBlox now also ships a built-in Studio connector at:

roblox/devFactoryPlugin/

It implements the default safe Studio tool subset directly, so BloxForge/Nixera are optional richer adapters rather than prerequisites.


## Built-in StarBlox Studio connector

The repository includes a minimal Studio-side connector under:

roblox/devFactoryPlugin/

Its Rojo project is:

roblox/devFactoryPlugin/default.project.json

The connector implements:

- search_tree;
- inspect_instance;
- list_children;
- script_grep;
- read_script;
- read_all_scripts;
- get_selection / set_selection;
- write_script;
- edit_script;
- create_instance;
- set_property;
- delete_instance;
- run_tests;
- get_logs;
- get_run_state;
- start_playtest / stop_playtest;
- simulate_input;
- playtest_sample_state;
- capture_viewport.

The connector deliberately omits:

- run_luau;
- dynamic gameplay-expression execution;
- Marketplace/Creator Store insertion;
- publishing;
- purchases / Robux spending;
- production Open Cloud mutation.

Each persistent edit is wrapped in Roblox ChangeHistoryService recording so it is also a single native Studio undo step.

The StarBlox factory still captures its own deterministic rollback plan before mutations, so native Studio undo is an additional safety layer rather than the only recovery path.

### Role-routed bridge

The local bridge routes each tool request to one of:

- edit;
- server;
- client;
- any.

Normal inspection/edit/test operations go to the edit DataModel.

Runtime state sampling is routed to the play server.

Synthetic input and viewport capture are routed to a play client.

This prevents a runtime plugin peer from accidentally consuming an edit-mode mutation request.

### Automated single-player playtests

The built-in connector adapts BloxForge's StudioTestService pattern.

start_playtest runs from the edit peer.

During Play, the same plugin code runs on the server/client peers and connects to the same local bridge.

stop_playtest uses a cross-DataModel plugin-setting request/acknowledgement handshake so the play server calls StudioTestService:EndTest and the edit peer waits for acknowledgement.

Visual evidence is captured **before** a factory-started playtest is torn down.

### Viewport payload bounds

Viewport images are read through CaptureService / EditableImage.

Before base64 transport, captures are downsampled to at most 960 x 540. This keeps local bridge payloads bounded and avoids freezing Studio on high-resolution displays.

### Running the built-in connector

1. Start the local bridge:

   npm run studio:bridge

2. Build/install roblox/devFactoryPlugin as a local Studio plugin using your normal Rojo workflow.

3. Enable HTTP requests in Studio so the plugin can reach the local loopback bridge.

4. Keep the bridge on 127.0.0.1 unless you have a specific reason to expose it elsewhere.

5. For a non-loopback bridge, set a shared bridge token; the Node bridge refuses non-loopback startup without one.

6. In a provider adapter, use createStarBloxLocalStudioAdapter() from src/devFactory/localStudioConnector.js for the studio side, and supply the planner/coder/reviewer hooks for your chosen model/provider.

The built-in connector advertises only the tools it actually implements. The factory therefore automatically falls back from unsupported BloxForge-only features such as run_playtest_episode or run_gameplay_assertions to the lower-level proof flow where possible.

## BloxForge mode

BloxForge can expose the richest proof loop:

- transactional/dry-run style mutations;
- start/stop playtest;
- state sampling;
- live gameplay assertions;
- runtime logs;
- viewport/screenshots;
- repair/verification loops.

The StarBlox factory remains responsible for run budgets, repository gates, redacted audit artifacts and final verification status.

## Nixera mode

Nixera-style integrations can use:

- search_tree / inspect_instance / script_grep;
- write/edit/create/set_property;
- run_tests;
- get_logs;
- get_run_state;
- simulate_input;
- capture_viewport.

If the plugin cannot start Play, the operator starts the Studio playtest and the factory takes over runtime input/evidence from there.

## Exact upstream sources

BloxForge commit:

ef98c370b6e0dd93273eae245485b547b09aca53

Pinned paths include:

- packages/core/src/builders/mutation-plan.ts
- packages/core/src/builders/gameplay-assertions.ts
- packages/core/src/builders/playtest-telemetry.ts
- packages/core/src/stage/coordinator.ts
- packages/core/src/safety/safety-manager.ts

Nixera Roblox AI Studio commit:

c88d2e57a5ca52381b49f488ee13a0fd7c3beae9

Pinned paths include:

- backend/src/agents/coordinator.ts
- backend/src/agents/specialists.ts
- backend/src/tools/studioTools.ts
- plugin/src/tools/Inspect.luau
- plugin/src/tools/TestOps.luau
- plugin/src/tools/PlaytestOps.luau
- plugin/src/tools/VisionOps.luau
- plugin/src/tools/LogOps.luau
- plugin/src/tools/Executor.luau

Additional BloxForge runtime source:

- studio-plugin/src/modules/handlers/TestHandlers.ts

## Scope boundary

Step 2 does not automatically:

- publish StarBlox to Roblox;
- upload paid assets;
- spend Robux;
- modify production data;
- bypass Studio confirmations;
- permit unlimited arbitrary Luau;
- keep failed changes after a failed proof;
- declare visual/runtime success without explicit evidence.

It creates the development factory and proof/repair loop first.

Live Roblox project migration and the production ProfileStore/ReplicaService/Zap/Matter backbone remain later sequence steps.


## Final transport/scripting hardening

The factory treats bridge delivery as a bounded lease rather than an open-ended instruction.

- Every queued Studio request carries an absolute expiry timestamp.
- A Node-side timeout removes the request from the queue as well as the pending-response map.
- The built-in Studio connector checks the expiry again immediately before execution.
- Therefore a mutation that timed out while still queued cannot be applied later when Studio reconnects.
- Runtime peer routing is owned by the adapter contract. Model/tool arguments cannot override whether a call belongs on the edit, server, or client peer.

Generated Luau is also scanned before mutation.

The same executable-pattern scanner used for optional arbitrary Luau is applied to:

- complete write_script source;
- edit_script replacement fragments.

Potentially destructive/high-risk patterns such as instance destruction, direct DataStore SetAsync/RemoveAsync, loadstring, environment mutation, and debug/runtime introspection require explicit confirmation. Matches that occur only inside comments or string literals are ignored.

These checks supplement rollback and tests; they do not replace them.
