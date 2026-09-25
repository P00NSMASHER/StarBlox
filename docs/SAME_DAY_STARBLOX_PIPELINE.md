# StarBlox Same-Day Integration Pipeline

## Goal

Turn the highest-value authorized donor systems into a verified StarBlox vertical slice with one resumable orchestration command.

The pipeline is intentionally optimized for a **same-day internal vertical slice**, not for automatic public publication.

## Fast lane

The default one-day manifest uses only the donors that remove the most critical-path work:

1. **Authorized Brookhaven** — world, houses, vehicles, avatar/presentation.
2. **Robbing Simulator** — NPC/event/housing/placeable server patterns.
3. **Flex-with-Friends** — traffic, phone travel, child-oriented quests/minigames.
4. **Rorooms** — profiles/social/items/emotes/world-navigation UI.
5. **Existing StarBlox** — ProfileStore, Replica/network authority, Quest/mastery, Star Coins/XP, AI NPC boundaries, certification.

Keep these as escalation donors rather than importing them by default:

- Bloxburg — build/furniture UX.
- RoCitizens — careers/tasks/phone/trade.
- MeepCity — pets/estates/family activities.
- Jailbreak + A-Chassis — vehicle/garage depth.
- Miner's Haven + Infarmous — progression/placement/economy patterns.
- Arnis — additional generated districts and streaming/LOD where the authorized world does not already satisfy the slice.

This minimizes integration churn while preserving fallback options.

## Stage graph

```text
AUTHORIZED WORLD
      ↓
SAFE INGEST + FINGERPRINT
      ↓
MIGRATION PLAN
      ↓
EXACT EXPORT
      ↓
FACTORY ADAPT
      ↓
BEST DONOR INTEGRATION TASKS
      ↓
QUEST / MASTERY WIRING
      ↓
STUDIO TEST + BUILD
      ↓
AUTOMATED PLAYTEST
      ↓
SCREENSHOT + LOG REVIEW
      ↓
BOUNDED AUTOMATIC REPAIR
      ↓
MOBILE EVIDENCE GATE
      ↓
SECURITY EVIDENCE GATE
      ↓
PERFORMANCE EVIDENCE GATE
      ↓
INTERNAL VERTICAL-SLICE REVIEW
```

Public publication remains disabled.

## Durable orchestration

Core implementation:

- `src/sameDayPipeline/sameDayPipeline.js`
- `scripts/same-day-pipeline.mjs`
- `scripts/same-day-evidence-gate.mjs`
- `config/same-day/pipeline.example.json`

The orchestrator creates:

- a deterministic plan hash;
- stage-by-stage status;
- attempt counts;
- exact artifact paths;
- migration receipts;
- development-run receipts;
- release-gate evidence;
- a final internal-review summary.

A failed stage stops the pipeline. Run with `--resume` after fixing the blocker.

## Source classes

### Roblox place/model donors

`.rbxl`, `.rbxlx`, `.rbxm`, and `.rbxmx` sources go through:

```text
preflight
→ SHA-256 fingerprint
→ capability catalog
→ migration plan
→ exact export
→ factory migration-evidence verification
→ Studio adaptation
```

Imported Luau is never executed during catalog/migration.

### Source-code donors

Repositories such as Flex-with-Friends and Rorooms enter through explicit factory integration tasks instead of pretending they are Roblox place files.

The default task files are:

- `config/same-day/integrate-flex-task.json`
- `config/same-day/integrate-rorooms-task.json`

Their source checkouts are expected at the paths named in those tasks.

## Factory adapter

`config/same-day/factory-adapter.mjs` is provider-neutral.

It connects:

- the StarBlox local Studio bridge; and
- any local AI-agent wrapper supplied through `STARBLOX_AGENT_COMMAND`.

The agent wrapper protocol is:

- read one JSON object from stdin;
- receive the role as the final command-line argument;
- return one JSON object on stdout.

Roles:

- `plan`
- `code`
- `review`
- `repair`
- `visual-review`

This avoids hard-wiring StarBlox to a specific model vendor.

## Studio runtime proof

The integrated slice task requires:

- Studio tests;
- live playtest;
- runtime logs;
- viewport capture;
- visual review;
- runtime state sampling;
- performance telemetry.

The built-in Studio connector now samples performance with:

- average runtime frequency;
- average frame time;
- p95 frame time;
- total memory when available.

## Final gates

### Mobile

Requires:

- explicit mobile/touch acceptance criteria;
- viewport evidence;
- visual-review acceptance;
- clean runtime evidence.

This gate is evidence-based, but true device/emulator coverage should still be expanded as additional Studio emulation tools become available.

### Security

Requires:

- verified integrated development run;
- valid Studio connector attestation;
- clean rollback state;
- passing repository tests/certification/balance/build;
- no verification errors.

### Performance

Default example thresholds:

- average runtime frequency >= 25 Hz;
- p95 frame time <= 50 ms.

Thresholds are configurable in the manifest.

## Setup

Place authorized Roblox source files under a local source directory such as:

```text
sources/authorized/
  Brookhaven.rbxl
  Robbing-Simulator.rbxl
```

Place authorized source-code repositories under:

```text
vendor/authorized/
  roblox-flex-with-friends/
  Rorooms/
```

These large/private source corpora do not need to be committed to StarBlox.

Start the Studio bridge:

```bash
npm run studio:bridge
```

Connect the StarBlox Studio plugin and configure an agent wrapper:

```bash
export STARBLOX_AGENT_COMMAND=/path/to/agent-wrapper
```

Optional arguments:

```bash
export STARBLOX_AGENT_ARGS='["--project","StarBlox"]'
```

## Plan without mutating Studio

```bash
npm run same-day:pipeline -- \
  --manifest config/same-day/pipeline.example.json \
  --plan-only
```

## Execute

```bash
npm run same-day:pipeline -- \
  --manifest config/same-day/pipeline.example.json
```

## Resume after a blocker

```bash
npm run same-day:pipeline -- \
  --manifest config/same-day/pipeline.example.json \
  --resume
```

The saved state refuses to resume if the manifest changed, preventing a partially completed run from silently switching plans.

## One-day slice acceptance target

The fast lane aims to verify:

- one polished district;
- avatar spawn;
- one home interaction;
- one usable vehicle path;
- ambient traffic;
- 3–5 NPCs;
- 2–3 educational missions;
- Star Coin/XP/mastery reward flow;
- one shop;
- one minigame;
- save/rejoin-visible state;
- phone/mobile HUD;
- clean playtest logs;
- accepted screenshot review;
- security/performance evidence.

Anything beyond that should be pulled from escalation donors only after the core slice passes.
