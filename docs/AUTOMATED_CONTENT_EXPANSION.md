
# Automated Content Expansion — Step 10

Step 10 turns the systems built in Steps 1–9 into one bounded district/content-production pipeline.

The pipeline can automate planning, authorized asset/system selection, question generation/QA, solution-first quest generation, Roblox Studio build/test cycles and repair evidence.

It **cannot publish or activate production content**.

Every final artifact hard-codes:

- autoPublish: false
- liveActivationAllowed: false

A successful run becomes ready for human/release review, not live deployment.

## Inputs

A district brief contains:

- district ID/name;
- learning subject;
- skills;
- desired Roblox/Brookhaven capabilities;
- product request;
- solution-first stage/optional-node counts;
- question-generation parameters.

The pipeline also receives:

- a Step 1 Roblox Capability Catalog;
- authorized source chunks for learning content;
- the current Question Bank V2;
- optional migration staging adapter;
- strict question-generation/reviewer adapters;
- optional AI Development Factory Studio/agent adapters.

## Stage 1 — deterministic district plan

buildContentExpansionPlan() normalizes the brief and derives a stable seed when none is supplied.

It creates:

- an immutable expansion ID/hash;
- a Step 5 migration plan restricted to requested capabilities;
- a certified solution-first quest level;
- a district blueprint;
- exact question slots;
- a safe AI Development Factory task.

Risk-flagged catalog systems stay excluded unless migration policy explicitly changes.

The content-expansion layer itself never opts into includeRisky.

## Stage 2 — authorized migration staging

Selected systems are passed to the injected migrationStage adapter.

The returned artifact must pass the existing Step 5 MigrationBundle verifier.

Requirements:

- all outputs remain under migration staging/quarantine;
- liveActivationAllowed must remain false;
- unresolved quarantine/blocker review keeps the expansion blocked.

The content-expansion pipeline never uploads or activates migration content.

## Stage 3 — strict learning-question generation

The pipeline directly composes the existing Question Factory:

1. runOfflineGeneration();
2. validateGeneratedCandidates() in strict mode;
3. require exact source evidence;
4. require reviewer keep/rewrite scores at/above threshold;
5. deduplicate against the current Question Bank;
6. keep enough validated questions for every certified quest slot;
7. ingest only through ingestValidatedCandidates().

Generated questions therefore enter Question Bank V2 with lifecycle:

pending

They are not published by the expansion pipeline.

The final review artifact keeps question IDs/version hashes/lifecycle receipts rather than embedding answer content.

## Stage 4 — certified gameplay structure

The district uses the existing solution-first generator.

The plan retains:

- level hash;
- exact solution certificate;
- question-slot layout.

The review artifact retains the level hash plus solution-certificate hash.

This prevents a district proposal from claiming gameplay structure that differs from the certified plan.

## Stage 5 — AI Development Factory

When executeStudio=true, Step 10 invokes the existing AI Development Factory.

It inherits that system's safety controls:

- read/inspection phase;
- bounded mutations;
- transactional rollback coverage;
- no destructive actions by default;
- no arbitrary Luau execution by default;
- test gates;
- playtest/runtime evidence;
- optional screenshots/visual review;
- repository gates, including explicit certification;
- bounded reviewer-driven repair loops;
- rollback when verification fails.

Step 10 additionally forces:

- allowDestructive=false;
- allowExecuteLuau=false;
- allowUnrollbackable=false;
- keepFailedChanges=false.

A development run must finish status=verified before the district can be ready for review.

## Stage 6 — release-review candidate

The final artifact contains only evidence needed for release review:

### Migration

- migration bundle ID/hash;
- staging status;
- exported unit count;
- unresolved review reasons;
- liveActivationAllowed=false.

### Blueprint

- district identity;
- subject/skills;
- selected authorized systems;
- deterministic seed;
- level hash;
- solution-certificate hash;
- question slots.

### Questions

- required/generated/accepted/rejected/duplicate counts;
- exact pending Question Bank refs;
- resulting bank hash.

### Development

- Development Factory run ID/hash;
- verified/failed status;
- evidence-cycle count;
- final reviewer result;
- repository gate result.

### Review

- blockers;
- required human actions;
- autoPublish=false;
- liveActivationAllowed=false;
- readyForHumanReview.

There is deliberately no publishContent(), deploy(), purchase(), spend() or activate() API.

## Plan-only command

Operators can create a deterministic expansion plan without calling any AI or Studio service:

npm run content:expand -- --brief district-brief.json --catalog roblox-capability-catalog.json --chunks source-chunks.json --out content-expansion-plan.json

This command:

- reads only local files;
- does not call model providers;
- does not open Roblox Studio;
- does not mutate Roblox;
- does not publish anything.

The asynchronous runContentExpansionPipeline() API is what a future authorized orchestration worker can call with explicit adapters.

## Recommended production workflow

1. Run Step 1 catalog against the licensed Roblox/Brookhaven source set.
2. Write a district brief.
3. Generate the deterministic content expansion plan.
4. Review selected systems and migration strategies.
5. Run the Step 5 staging adapter.
6. Run strict offline question generation/review.
7. Run the AI Development Factory against a development Studio place.
8. Require tests/runtime/visual/repository evidence.
9. Review the generated release candidate.
10. Explicitly promote accepted Question Bank and Roblox artifacts into a versioned Step 18-style rollout/cohort process.

## Failure behavior

Any of the following blocks readyForHumanReview:

- missing requested-capability systems when required;
- missing learning source chunks;
- migration staging failure;
- invalid migration bundle;
- unresolved migration human-review blockers;
- missing strict question provider/reviewer;
- insufficient validated questions;
- Question Bank ingestion escaping pending lifecycle;
- Studio build/test not executed;
- Development Factory integrity failure;
- failed Studio tests/playtest/visual/repository evidence.

Failure never causes automatic publication.

## Existing source lineage

Step 10 is a composition layer over already-pinned sources and StarBlox implementations rather than a new third-party import.

It reuses lineage already recorded for:

- rbx-dom / Remodel asset migration;
- Recall question generation/review;
- Fruit Box solution-first generation;
- BloxForge mutation/test/telemetry/stage/safety concepts;
- Nixera Studio inspection/test/vision/log/executor concepts;
- StarBlox Question Bank V2;
- StarBlox AI Development Factory;
- StarBlox migration bundle safety boundary.

## Scope boundary

Step 10 does not:

- autonomously publish a district;
- autonomously make pending questions live;
- activate quarantined migration assets;
- buy Creator Store assets;
- spend Robux;
- modify production places without a separately supplied Studio adapter and confirmation;
- override StarBlox rollout/kill-switch controls.

It produces a complete, testable, reviewable content candidate.

## Repair hardening: promotion evidence

A review-ready expansion must carry a valid migration plan-binding proof and its selected migration unit IDs must exactly match the district blueprint's selected systems.

This is in addition to the existing requirements for verified Studio development, explicit tests/certification/balance/build repository proof, strict question validation, exact question-slot coverage, staging-only migration, and disabled automatic publication.
