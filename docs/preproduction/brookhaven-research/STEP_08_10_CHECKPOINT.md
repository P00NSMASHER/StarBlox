# Brookhaven Research — Steps 8–10 Checkpoint

Status: **COMPLETE — CI green; live product remains unchanged**

## Rights status

The project now treats the Brookhaven material rights as **verified-for-project-use** based on prior evidence confirmed by the user. The underlying evidence was not re-audited in this project session. Public repository license/provenance metadata remains separately tracked.

## Step 8 — Vehicle system

Implemented a StarBlox-neutral local vehicle runtime for the 13 evidenced current vehicle identifiers plus 4 legacy identifiers.

The runtime supports local state for spawn/despawn, lights, hazards and cosmetic/control metadata without calling Brookhaven runtime services.

Visual payloads remain explicitly `identifier-only` until attached through the neutral conversion pipeline.

## Step 9 — Town system

Implemented a 17-location evidence-backed destination catalog with 15 player-facing entries.

The route topology is **original StarBlox proxy design**, not a claim of Brookhaven map-coordinate parity.

The runtime supports local unlocks, visits and deterministic routing through unlocked locations.

## Step 10 — Progression/reward integration

Implemented a **read-only shadow model** with 42 rules:

- 14 residential-feature rules;
- 13 vehicle rules;
- 15 town-location rules.

It consumes existing StarBlox Quest completion, Stars, Star Worth and unique mastery count. It does not award/deduct Coins, award Stars, change XP, change mastery, mutate persistence, or modify Quest rewards.

## Verification

GitHub Actions run `36028642145` passed:

- research artifact validation: **0 issues**;
- Brookhaven runtime boundary: **0 violations**;
- verified project-rights conversion eligibility: `candidate-after-content-and-technical-QA`;
- existing residential runtime: **4/4 tests**;
- Step 8–10 runtimes: **12/12 tests** across 3 files;
- proxy vertical slice: 17 objects, **0 issues**;
- isolated StarBlox build: **PASS** using the previously documented temporary inherited-base comma fix only in the CI workspace.

No deployment or live StarBlox integration occurred.
