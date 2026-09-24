
# Daily Freeze, Versioning, Scheduling and Activation — Steps 16 and 17

Steps 16 and 17 turn the certified Daily artifact into an immutable release object and add a provider-neutral control plane for scheduling and activation.

## Step 16 — deterministic freeze, fallback and versioning

Source lineage:

- pedromussi1/Purdle
- commit: 1678a1ec7d4b9a21e065c9b27a5fa233332210cf
- scripts/generate_puzzle.py
- .github/workflows/daily-puzzle.yml

Purdle's important operational properties are preserved:

- one date-specific artifact;
- existing date files are not silently regenerated;
- generation has a deterministic fallback path;
- a manifest records which dates exist;
- if today's content is missing, clients can resolve the most recent earlier artifact.

StarBlox strengthens the overwrite rule.

### Immutable releases

freezeCertifiedDaily() accepts only artifacts that already satisfy assertDailyPublishable().

The first frozen artifact for a date becomes:

daily-YYYY-MM-DD@v1

If the exact same certified artifact is frozen again, the operation is idempotent.

If different content is presented for the same date, it is rejected by default.

A caller may explicitly create a new version with:

- allowNewVersion: true
- a required reason

The result becomes @v2, @v3, and so on. Earlier releases are never mutated or deleted.

Each release freezes:

- exact certified artifact;
- artifact hash;
- Daily manifest hash;
- Daily bundle hash;
- lineage via supersedesReleaseId;
- optional frozen timestamp and version reason.

### Rollback

Rollback does not rewrite content.

setPreferredDailyRelease() changes only a date's preferred release pointer and requires a reason.

All historical versions remain addressable.

### Release manifest

buildDailyReleaseManifest() produces a sorted date index and preferred release identity for each date.

This serves the same operational role as Purdle's date manifest while retaining StarBlox's explicit release versions.

### Missing-date fallback

resolveFrozenDaily() resolves:

1. the exact preferred release for the requested date;
2. if permitted and exact content is missing, the most recent earlier frozen date.

It never:

- chooses future content;
- regenerates content;
- relabels yesterday's artifact as today's Daily.

The fallback response explicitly returns both requestedDate and resolvedDate.

Scheduling is stricter: Step 17 will not schedule an older fallback release under a new calendar date.

## Step 17 — schedule and activation control plane

Source lineage:

- kristiandrex/sabeo
- commit: 52210ee593e0e5c832cbf3cea8b6f228df073623
- supabase/migrations/20251118214523_schedule_daily_challenge_cron.sql
- supabase/migrations/20260108020023_update_schedule_daily_challenge_cron.sql
- src/app/api/schedule-daily-challenge/route.ts
- src/app/api/start-challenge/route.ts
- src/domain/challenge/start-challenge.ts

The Sabeo control flow is preserved conceptually:

> If today's schedule does not exist, create it. Otherwise, if its scheduled time has arrived and it has not triggered, activate it.

### Provider-neutral state

StarBlox does not yet have a selected production backend, so the control layer is a pure JSON-compatible state machine.

It stores:

- one schedule per calendar date;
- exact release ID;
- scheduled activation time;
- triggered time;
- retired time;
- optional message;
- active release per date;
- immutable event history;
- whole-state controlHash.

A later database adapter can persist this shape and use controlHash for optimistic compare-and-swap semantics.

### Deterministic activation windows

Sabeo selects a random 10-minute slot inside its operating window.

StarBlox instead derives the slot deterministically from:

- date;
- release ID;
- activation window settings.

The same inputs always produce the same timestamp, which avoids scheduler disagreement across workers.

With:

- startHourUtc = 13
- windowMinutes = 480
- slotMinutes = 10

the selector covers 13:00–21:00 UTC inclusive in the same 49-slot shape used by Sabeo.

### Scheduling rules

scheduleDailyRelease():

- requires an exact certified frozen release for the same date;
- creates at most one schedule per date;
- is idempotent when the exact request is repeated;
- rejects conflicting reschedules by default;
- allows an explicit pre-activation replacement only with replace=true and a reason;
- refuses replacement after activation.

### Activation rules

activateDueDaily():

- does nothing if no schedule exists;
- does nothing before scheduledAt;
- verifies the exact frozen release is still publishable;
- activates once when due;
- records triggeredAt;
- records an activation event;
- emits one notification intent with a stable idempotency key.

A repeated activation call returns already_active and emits no second notification intent.

The core never sends a notification itself.

### Cron-style cycle

runDailyControlCycle() mirrors Sabeo's updated cron flow.

If no schedule exists:

- it looks for the exact preferred frozen release for today;
- if found, it creates the schedule;
- if absent, it emits a daily-missing-release intent.

On later cycles:

- before scheduledAt -> not_due;
- when due -> activated;
- after activation -> already_active.

It deliberately does not use Step 16's previous-date fallback for scheduling. Missing today's certified Daily is an operational condition to surface, not something to hide.

### Retirement

retireDailyRelease() moves an active release into retired state without deleting:

- its frozen release;
- schedule;
- activation timestamp;
- control history.

## Lifecycle

The combined release lifecycle is:

generated -> certified -> scheduled -> active -> retired

"Frozen" is the immutable storage guarantee between certified and scheduled.

A certified release may remain frozen but unscheduled indefinitely.

## Persistence and concurrency boundary

This step intentionally does not deploy Supabase, Firebase, Convex, Postgres, or another backend.

The eventual persistence adapter should:

1. load the registry/control state with their hashes;
2. perform one pure transition;
3. commit only if the stored previous hash still matches;
4. retry on conflict;
5. use activation idempotency keys when dispatching notifications/jobs.

That gives multi-worker production semantics without coupling the domain model to a backend today.

## Scope boundary

Steps 16 and 17 do not:

- persist release/control state remotely;
- send notifications;
- choose a hosting provider;
- change the live Quest UI;
- activate the current Daily automatically.

They establish the immutable release and exactly-once control semantics that later deployment adapters can safely execute.
