
# Observability + Adaptive Music — Steps 20 and 21

Steps 20 and 21 add two production-oriented foundations without changing live player behavior by default.

## Step 20 — privacy-safe observability

Source lineage:

- openreplay/openreplay
- commit: 354828a17fd2fc90fcfb4965a43aa79100638d1f
- tracker/tracker/src/main/app/session.ts
- tracker/tracker/src/main/app/sanitizer.ts
- tracker/tracker/src/main/modules/network.ts
- tracker/tracker/src/main/modules/console.ts

The OpenReplay ideas retained here are:

1. explicit session identity + metadata;
2. privacy sanitization before persistence;
3. network timing/status capture without automatically storing sensitive payloads;
4. throttled/bounded diagnostic streams;
5. diagnostics separated from gameplay authority.

StarBlox implements these as a provider-neutral domain layer rather than directly coupling the app to an observability vendor.

### Diagnostic sessions

createDiagnosticSession() creates one hash-bound diagnostic object with:

- session ID;
- start/end timestamps;
- sanitized metadata;
- event counters;
- aggregated performance;
- bounded recent events;
- bounded recent errors;
- bounded network observations;
- deterministic diagnostic hash.

This object can later be persisted locally, posted to an observability service, or translated into an OpenReplay integration.

### Privacy model

The default policy is intentionally conservative.

Sensitive metadata keys are dropped, including names resembling:

- authorization;
- cookie;
- token;
- secret;
- password/passcode;
- email/phone/address;
- credentials/API keys.

Nested event/error context redacts those keys.

Strings additionally redact obvious:

- email addresses;
- Bearer credentials;
- JWT-like tokens;
- long numeric identifiers.

This sanitizer is also exported as a pure helper for any future vendor adapter.

### Network observations

recordNetworkObservation() stores only:

- timestamp;
- method;
- URL origin/path;
- status;
- duration;
- response size;
- failure flag.

It strips query strings and URL fragments.

It does not accept or retain request/response payloads or headers in the persisted row.

A failuresOnly mode allows production deployments to capture only requests that fail.

### Errors and noisy events

Errors are bounded and sanitized before storage.

Event streams support:

- per-type throttling inside a time window;
- maximum retained-event limits;
- total-event and dropped-event counters.

This prevents pointer/render/loop noise from overwhelming useful diagnostics.

### Performance

Performance capture aggregates:

- sample count;
- average/min FPS;
- average/max frame time;
- latest memory estimate when supplied;
- accumulated long-frame count.

Raw per-frame streams are not retained.

### Trust boundary

Observability is not authoritative gameplay data.

Diagnostics may reference build IDs, replay IDs, Daily release IDs, policy versions, or feature-rollout modes through sanitized metadata, but server scoring/replay verification never trusts diagnostic content.

## Step 21 — adaptive music director

Source lineage:

- markzuckerbergas/make-ready
- commit: 2c3df144fc42dfc774561e39aa93338f9654dcc6
- src/music.js

The Make Ready implementation contributes:

- persistent music zones;
- hysteresis before switching;
- phrase-grid transition commits;
- faster urgent transitions;
- beat-aligned crossfades;
- resumable calm tracks;
- restart-from-top battle/boss tracks;
- pause driven by the audio clock rather than gameplay simulation time.

StarBlox implements the state machine independently of any audio library.

### Music zones

The initial zones are:

- calm;
- explore;
- challenge;
- boss.

desiredMusicZone() derives a requested zone from cosmetic/gameplay-readonly signals such as:

- quest/explore state;
- challenge/combat state;
- boss state;
- timer urgency;
- pressure;
- completion/defeat.

The mapping can later be adapted to actual StarBlox scenes without changing transition semantics.

### Hysteresis

A requested zone must persist before a transition is scheduled.

Urgent challenge/boss destinations use a short dwell.

Calm/explore transitions use a longer dwell.

This prevents music thrashing when gameplay state flickers near a threshold.

### Phrase-grid commits

Transitions do not commit immediately.

If either side is urgent, the transition lands on a 1-cycle grid.

Calm/explore transitions use a 4-cycle phrase grid.

This keeps musical form aligned rather than crossfading at arbitrary points.

### Resume vs restart

Challenge and boss tracks restart from their opening ramp whenever entered.

Calm and explore remember their last local position and resume from a four-cycle-aligned point.

### Crossfade

Each zone has an independent weight.

updateAdaptiveMusic() moves those weights gradually toward the active zone rather than hard cutting.

musicMix() converts weights, per-zone master gains and user volume into adapter-ready gain values.

### Determinism boundary

The music director is cosmetic.

It receives a read-only snapshot and audio-clock timing.

It:

- never mutates the supplied gameplay snapshot;
- never writes game simulation state;
- never affects replay hashes;
- never affects scoring;
- should use the audio/scheduler clock, not deterministic simulation ticks.

Pause simply freezes music-state transitions while the eventual audio adapter suspends its own clock.

## Future integration

These steps intentionally stop before live wiring.

The rollout layer from Step 18 can later expose:

- diagnostics in shadow/limited cohorts;
- adaptive music to a small cohort;
- immediate kill switches for either feature.

A future OpenReplay adapter can consume diagnostic summaries or map sanitized events to vendor APIs.

A future audio adapter can map the four zone gains/offsets into actual StarBlox stems, loops or composed tracks.

## Scope boundary

Steps 20 and 21 do not:

- enable remote session recording;
- collect raw DOM contents;
- capture raw network bodies/authorization headers;
- send diagnostics to a third party;
- add an audio dependency;
- add soundtrack assets;
- change current Quest UI or deterministic gameplay.
