# StarBlox Same-Day Vertical-Slice Pipeline

## Goal

Turn the authorized world and highest-leverage donor systems into a verified internal StarBlox vertical slice through one resumable command.

The pipeline is deliberately **not a publisher**. A successful run produces a review-ready local/internal slice plus immutable evidence. Publication remains disabled.

## Critical path

```text
AUTHORIZED WORLD + PLACE DONORS
        │
        ├─ safe static ingestion
        ├─ capability catalog
        ├─ migration plans
        └─ exact artifact export
                 │
                 ▼
AUTHORIZED CODE DONORS
Arnis + A-Chassis + Flex-with-Friends + Rorooms
                 │
                 ▼
SAFE ROJO STAGING PLACE
(script-free donor assets only)
                 │
                 ▼
STUDIO ATTESTATION
                 │
                 ▼
SERIAL FACTORY ADAPTATION
Brookhaven → Robbing → Arnis → A-Chassis → Flex → Rorooms
                 │
                 ▼
QUEST / MASTERY WIRING
                 │
                 ▼
INTEGRATED PLAYTEST + SCREENSHOT + LOG REVIEW
                 │
                 ▼
BOUNDED AUTOMATIC REPAIR
                 │
                 ▼
MOBILE + SECURITY + PERFORMANCE GATES
                 │
                 ▼
INTERNAL VERTICAL-SLICE REVIEW ARTIFACT
```

Independent non-Studio work is parallelized up to `maxParallel`. Studio mutation remains serialized.

## Authorized source inputs

Default manifest: `config/same-day/pipeline.example.json`

Place inputs:

- `sources/authorized/Brookhaven.rbxl`
- `sources/authorized/Robbing-Simulator.rbxl`

These files are intentionally gitignored. If either file is missing, the default manifest downloads the exact previously audited public source automatically over HTTPS and verifies both its byte count and SHA-256 before static ingestion. If upstream bytes drift, the pipeline fails closed rather than accepting the replacement.

Pinned code donors are fetched automatically at exact commits:

- `adpena/arnis-roblox@ff7984f990336da1d9f303d54b3f2e223bfdab35`
- `lisphm/A-Chassis@3533c32ed04210fd11eaa8d4c45ddc5da951f6fb`
- `bsantanna/roblox-flex-with-friends@f23ff0b06c759e60aa651a6618a8d81692719fc9`
- `Rorooms/Rorooms@3d06941343b5bd70a92044b45fe25deb3e4e2095`

The pipeline verifies each checkout is clean, has the expected origin, and ends at the exact pinned SHA.

## Runtime prerequisites

1. Node / Rust / Rojo toolchain installed.
2. Roblox Studio opened with the StarBlox generated place.
3. StarBlox Studio connector polling the local bridge.
4. A factory-agent wrapper configured through:
   - `STARBLOX_AGENT_COMMAND`
   - optional `STARBLOX_AGENT_ARGS` JSON array.
5. The local bridge running:
   `npm run studio:bridge`

The agent wrapper receives JSON on stdin with:

```json
{
  "protocol": "starblox-factory-agent-v1",
  "role": "plan|code|review|repair|visual-review",
  "context": {}
}
```

It must return one JSON object on stdout.

## Plan without touching sources or Studio

```bash
npm run same-day:pipeline -- \
  --manifest config/same-day/pipeline.example.json \
  --plan-only
```

Output:

- `artifacts/same-day-starblox/same-day-pipeline-plan.json`

## Start the real pipeline

```bash
npm run same-day:pipeline -- \
  --manifest config/same-day/pipeline.example.json
```

The orchestrator stops immediately on a failed stage and writes durable state.

## Resume after correcting a blocker

```bash
npm run same-day:pipeline -- \
  --manifest config/same-day/pipeline.example.json \
  --resume
```

A changed manifest cannot silently resume old state because the state is bound to the deterministic plan hash.

## Safety boundary

### Automatically staged

Only migration artifacts satisfying all of these conditions are mounted into the generated Rojo place:

- export disposition = `staging`;
- migration strategy = `extract` or `asset-only`;
- zero scripts;
- zero remotes;
- zero risk flags;
- exact exported artifact hash matches the approved migration bundle.

### Never auto-activated

Script-bearing/refactor units remain quarantined and must pass through the AI Development Factory.

The factory keeps:

- bounded mutations;
- rollback evidence;
- tests;
- live playtest evidence;
- viewport/visual review;
- logs;
- repository gates;
- repair-cycle limits.

No stage can publish the experience.

## Parallel stages

The orchestrator may run these independent stages concurrently:

- source ingestion;
- migration planning;
- migration export;
- code-donor checkout;
- final evidence gates.

The following remain serialized:

- staging-place construction;
- Studio attestation;
- donor adaptation;
- code-donor integration;
- quest/mastery wiring;
- integrated verification and repair.

That is intentional. Multiple agents mutating the same Studio DataModel simultaneously would save time in roughly the same sense that using two steering wheels saves commute time.

## Final evidence

A successful integrated factory run must produce:

- Studio tests;
- live playtest;
- runtime logs;
- viewport capture;
- visual-review acceptance;
- performance telemetry;
- repository test/certification/balance/build proof.

The final three gates emit independent receipts:

- `gate-mobile-receipt.json`
- `gate-security-receipt.json`
- `gate-performance-receipt.json`

Each receipt contains a SHA-256 of the exact integrated development-run artifact.

The finalizer verifies all three bind to the same development run and emits:

- `same-day-slice-summary.json`

A successful summary has:

- `readyForInternalVerticalSliceReview: true`
- `publicationAllowed: false`

## Definition of same-day slice

The verification task is scoped to prove the following where feasible:

- spawn into the district;
- phone/world navigation;
- one home interaction;
- one vehicle path;
- one NPC educational quest;
- one shop interaction;
- one minigame;
- Star Coin / XP / mastery reward integrity;
- durable/rejoin-visible state;
- mobile/touch usability acceptance;
- no runtime error logs;
- performance evidence.

This is an internal vertical slice, not a claim of public-production certification.