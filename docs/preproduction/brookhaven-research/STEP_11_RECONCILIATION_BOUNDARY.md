# Brookhaven Research — Step 11 of 12: Hardened Reconciliation / Replay Boundary

Status: **COMPLETE — hardened controlled replay plan ready; no merge/deploy performed**

Step 11 is complete at the research boundary.

The hardened Steps 8–10 are **not** directly merged into the moving StarBlox product branch. Current divergence makes direct merging inappropriate and unsafe.

At the Step 11 v2 readiness observation:

- Brookhaven research vs `screenshot-match-preproduction`: **115 ahead / 459 behind**.
- Learning factory vs `screenshot-match-preproduction`: **200 ahead / 567 behind**.
- Brookhaven and learning-factory work remain on different research lineages and are reconciled separately.

## Authoritative Step 11 v2 artifacts

- `docs/preproduction/brookhaven-research/step-11-replay-manifest-v2.json`
- `docs/preproduction/brookhaven-research/step-11-reconciliation-readiness-v2.json`
- `scripts/assertBrookhavenLearningSeparation.mjs`

The original v1 Step 11 artifacts remain historical records. The v2 artifacts are the current hardened reconciliation contract.

## Integration strategy

When StarBlox's moving product work is stabilized:

1. create a fresh integration branch from the then-current `screenshot-match-preproduction`;
2. replay only the explicit v2 manifest groups, in order;
3. verify every group before the next group is allowed;
4. fail closed on unexpected changed files;
5. never transplant protected live entry points from the research branch;
6. reconcile the learning factory separately;
7. do not deploy merely because replay succeeds.

Direct branch merges remain disallowed by this plan.

## Six controlled replay groups

### Group 1 — Research boundary, metadata and validation

Replay rights/provenance, Brookhaven research documents, neutral schemas/catalogs/completion receipts, boundary validators, separation assertion, neutral conversion/preview validation, and the Brookhaven research workflow.

Verification requires zero research validation issues, zero reuse-boundary violations, zero learning-separation violations, and Steps 8–10 all complete.

### Group 2 — Residential neutral runtime

Replay only:

- `src/residentialFeatureRuntime.js`
- `src/residentialFeatureRuntime.test.js`

No live app, persistence, or economy wiring is permitted.

### Group 3 — Hardened Step 8 vehicle layer

Replay the existing neutral vehicle runtime together with:

- neutral vehicle definition loader/tests;
- neutral vehicle runtime preview/tests.

The 13-current-vehicle parity and Step 8 boundaries must remain green before continuing.

### Group 4 — Hardened Step 9 town layer

Replay the town runtime together with:

- neutral town location loader/tests;
- StarBlox proxy topology loader/tests;
- neutral town runtime preview/tests.

The exact 17-location, 15/2 eligibility, and 14-edge original-StarBlox proxy topology boundaries must remain green.

### Group 5 — Hardened Step 10 progression shadow

Replay the existing progression shadow together with:

- neutral progression rule loader/tests;
- neutral progression preview/tests.

The 42-rule 14/13/15 split, exact threshold parity, deferred-town exclusion, and zero-mutation boundary must remain green.

### Group 6 — Manual additive package script reapplication

Do **not** replay the historical `package.json` blob.

Only manually re-add these Brookhaven-specific scripts to the then-current product package:

- `validate:brookhaven-research`
- `test:brookhaven-residential`
- `test:brookhaven-step-8-10`
- `assert:brookhaven-learning-separation`

All current product scripts and dependencies must remain intact.

## Protected live files

These files may not be transplanted from the research branch:

- `src/App.jsx`
- `src/main.jsx`
- `src/gameModel.js`
- `src/storage.js`

Any replay that changes one of these files fails the v2 promotion contract.

## Explicit exclusions

The following are excluded from replay:

- `scripts/buildBrookhavenResearchWithKnownBaseFix.mjs` — historical temporary CI workaround;
- all protected live files listed above;
- all learning-factory files;
- raw/unresolved executable or remote-dependent source payloads.

Only explicit, neutralized, rights-cleared, validated research artifacts may enter a future integration branch.

## Hardened learning-factory separation

The separation assertion now covers the hardened Step 8–10 modules in addition to the original runtimes.

It fails if a live protected file imports any of these research modules, or if any Brookhaven neutral/runtime module imports learning-factory components.

This is an integration boundary, not a permanent architectural restriction. Learning-factory reconciliation can begin later from the same stabilized lineage after Brookhaven controlled replay is independently green.

## Promotion gates

Every replay group must pass before the next can proceed.

Promotion is blocked by:

- an unexpected changed file;
- a protected live-file change;
- a reuse-boundary violation;
- a learning-separation violation;
- any test failure;
- any build failure.

The Step 11 manifest **does not authorize deployment**.

## Exit state

- hardened Steps 8–10 are included in the replay contract;
- six replay groups are explicit and ordered;
- protected live files are excluded;
- package.json replacement is forbidden;
- the historical temporary build workaround is excluded;
- Brookhaven and learning-factory research remain separated;
- no direct merge was performed;
- no deployment was performed;
- no live integration is authorized by this step.

Step 11 is complete.
