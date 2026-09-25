# Release-hardening milestone 4 — real Studio execution packet

Milestone 4 is **prepared but not yet complete** because the live Roblox Studio environment is not reachable from this session.

## Exact bounded unit

The real-source migration selector chose the smallest low-risk refactor candidate under the deterministic selection policy:

- system: **StarterGui**
- unit: `slash-mayhem-shadow-cc6aed05-slash-meyhem-shadow-edition-rbxl-startergui-0982d021`
- root: `DataModel/StarterGui`
- capability: `ui`
- instances: **4**
- scripts: **1**
- assets: **4**
- remotes: **0**
- external dependencies: **0**
- risk flags: **none**
- migration strategy: `refactor`
- export disposition: `quarantine`
- suggested target: `ServerStorage/StarBloxMigration/Quarantine/startergui`
- remaining code-review blocker: `logic-refactor-required`

## Repository-side proof completed

CI run `36160314907` proved all repository-side steps:

1. exact rich real `.rbxl` source ingestion;
2. migration discovery planning;
3. deterministic bounded-unit selection;
4. rebuilt **single-unit** migration plan;
5. exact migration planning receipt;
6. exact quarantined subtree export;
7. exact migration export receipt;
8. factory admission verification against the export receipt;
9. rejection of an unattested adapter **before** Studio/planner/coder execution;
10. full StarBlox unit tests, certification, balance and production build.

The execution task requires Studio tests, a single-player playtest, runtime logs and viewport evidence, and forbids publishing/live activation.

## Why the milestone is not marked complete

The connected desktop is currently unavailable. A direct remote-device probe returned no connected devices, so a real Roblox Studio edit peer cannot be attested in this session.

Milestone 4 requires evidence that cannot be truthfully synthesized in CI:

- live Studio bridge attestation;
- a persistent Studio mutation against the quarantined candidate;
- Studio test execution;
- real single-player playtest lifecycle;
- runtime logs;
- viewport/screenshot capture;
- verified development-run artifact;
- migration adaptation receipt;
- quarantine-exit promotion receipt.

The factory correctly refuses to run the real migration task without this attestation.

## Self-contained live execution path

The repository now reconstructs the complete Milestone-4 packet locally from the pinned real source:

```
npm run roblox:m4:prepare -- --overwrite
```

That command independently rebuilds and verifies:

1. the pinned real Roblox source bytes and exact upstream Git blob;
2. safe ingestion and capability catalog;
3. discovery migration plan;
4. deterministic selection of the exact approved `StarterGui` unit;
5. a single-unit migration plan and planning receipt;
6. the exact quarantined migration export and export receipt;
7. a neutral `StarterGuiSource` quarantine container;
8. a native StarBlox staging `.rbxlx` place containing that inert source under `ServerStorage`;
9. a self-contained copy of the complete export evidence chain;
10. the exact factory task and factory migration-admission evidence.

The authoritative exported migration artifact is not rewritten. The staging place derives a neutral `Folder` container from the exported service root so imported source can remain inert under `ServerStorage`.

The live cycle does not need an external AI coding provider. The deterministic adapter only:

- inspects the exact quarantine source;
- verifies imported script evidence exists without executing it;
- adds exact unit/state provenance markers inside quarantine;
- installs one bounded test module under `ServerScriptService/Tests`;
- requires the test to pass;
- requires a real single-player Studio playtest;
- checks runtime logs;
- requires non-empty viewport evidence;
- runs repository tests, certification, balance, and build;
- emits the existing adaptation and promotion receipts only after those proofs pass.

When the authorized machine has Studio plus the StarBlox connector installed, the full live path is:

```
npm run roblox:m4:live -- --launch-studio
```

The runner can start the loopback StarBlox bridge, launch the prepared staging place, wait for the exact `starblox-studio-connector-v1` edit-peer attestation, run a native Studio playtest preflight, execute the deterministic factory cycle, certify quarantine exit, and emit `live/milestone4-completion-receipt.json`.

That completion receipt is written **only** when Studio tests, runtime playtest, logs, viewport proof, repository gates, adaptation receipt, and promotion receipt are all valid. Publication and production activation remain false.

## Exact completion boundary

When the authorized desktop is connected:

1. start the StarBlox local Studio bridge;
2. open the StarBlox place in Roblox Studio with the built-in plugin;
3. confirm the edit peer advertises `starblox-studio-connector-v1`;
4. reconstruct the exact single-unit export using the pinned source and selection script;
5. stage the quarantined `StarterGui` unit;
6. run the factory task;
7. require Studio tests + single-player playtest + logs + viewport proof;
8. verify the resulting development run;
9. emit `migration-adaptation-receipt.json`;
10. run the quarantine-exit certification to emit `migration-promotion-receipt.json`.

Publication and production activation remain separate and disabled.
