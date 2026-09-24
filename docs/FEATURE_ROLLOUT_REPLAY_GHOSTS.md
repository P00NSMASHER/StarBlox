
# Feature Rollouts, Kill Switches, Replay Ghosts and Shareable Challenges — Steps 18 and 19

Steps 18 and 19 add controlled rollout infrastructure and social replay primitives without changing authoritative scoring.

## Step 18 — feature cohorts and kill switches

### Source lineage

Directly adapted from Sentry at commit:

67610b2a57909ca921d6a52dcbf7410bc851b100

Primary paths:

- src/flagpole/__init__.py
- src/flagpole/evaluation_context.py
- src/sentry/killswitches.py

The useful production patterns are:

- features are globally enabled/disabled;
- segments contain explicit conditions;
- rollout assignment is deterministic for a stable identity;
- a break-glass kill switch can override normal feature rollout;
- kill-switch conditions may target a narrow context or use wildcard fields.

### StarBlox evaluation order

StarBlox uses one explicit precedence chain:

1. matching kill switch -> OFF
2. globally disabled feature -> OFF
3. first matching segment -> deterministic rollout bucket
4. no matching segment -> feature default

There is no per-session randomness.

A player's rollout bucket is a stable hash of:

- feature name;
- configured identity fields;
- the corresponding context values.

The same identity and feature config always return the same cohort.

### Segments

Supported condition operators are:

- equals
- not_equals
- in
- not_in
- exists

All conditions in one segment must match.

Segments are checked in order. The first matching segment supplies the rollout percentage.

### Kill switches

Kill-switch conditions use Sentry-style AND-within-condition / OR-across-conditions matching.

A null value is a wildcard.

Example:

{
  "feature": "replay-ghosts",
  "platform": "ios",
  "playerId": null
}

disables the feature for every iOS player while leaving other platforms untouched.

Because feature is injected into the kill-switch evaluation context automatically, emergency switches can target one feature without affecting unrelated experiments.

### Frozen rollout config

createFeatureControlConfig() normalizes and hashes the full feature configuration.

Each decision reports:

- enabled;
- reason;
- matching segment;
- rollout percentage;
- deterministic bucket;
- config version/hash;
- matching kill-switch conditions.

This gives telemetry and support tooling enough information to explain why a player did or did not receive a feature.

## Step 19 — replay ghosts

### Source lineage

Directly adapted from the cleared Neon Vector Defense replay/social stack at commit:

48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4

Primary paths:

- src/game/ghostCurve.ts
- src/game/replayReconstruct.ts
- src/game/runTelemetry.ts
- src/game/dossier.ts
- src/DossierShare.tsx

Neon's useful separation is preserved:

- replay truth comes from the deterministic action stream;
- reconstructed/ghost data is a read model for presentation;
- share links point back to exact replay identity;
- a social card/link must never become a source of authoritative run state.

### Verified ghost creation

createVerifiedReplayGhost() first runs the existing Step 3 deterministic replay verifier.

If the replay is:

- malformed -> no ghost;
- unverifiable -> no ghost;
- divergent -> no ghost;
- verified -> reconstruct a ghost timeline.

The ghost reconstruction uses the same:

- trusted initial state;
- deterministic reducer;
- replay seed;
- engine version;
- action stream.

It samples the verified run at deterministic tick intervals and records:

- tick;
- simulation time;
- deterministic state hash;
- caller-defined small presentation sample.

Long runs automatically increase the sampling interval to respect a maximum point count.

### Ghost identity

Every ghost binds:

- replay ID;
- replay manifest hash;
- action hash;
- final state hash;
- engine version;
- seed;
- final tick;
- sampled points hash;
- optional trusted challenge context.

The final ghostHash covers all of that data.

A ghost is therefore an inspectable read model of one verified replay, not an alternate replay format.

### Challenge context

When a ghost is intended for a Daily challenge, the server/trusted caller should bind:

- releaseId;
- Daily bundle hash;
- level hash.

The social layer verifies those values against the frozen release when a challenge capsule is created.

## Shareable challenge capsules

createShareableChallengeCapsule() binds:

- exact immutable Daily release ID;
- release date;
- Daily manifest hash;
- Daily bundle hash;
- frozen artifact hash;
- Daily seed;
- engine version;
- level hash;
- exact question refs;
- optional verified ghost reference.

The optional ghost reference contains only replay identity/hashes, not the whole replay.

### No score authority

Challenge capsules intentionally do not contain:

- player ID;
- correctness;
- selected answers;
- trusted score;
- reward claims.

A recipient can use the capsule to load/race the exact frozen content and ghost.

Any completed run must still be submitted through the Step 4 server-authoritative scoring/replay-verification boundary.

### Share token

encodeShareableChallengeCapsule() produces a URL-safe token:

sbx1.<base64url canonical JSON>

The payload contains a deterministic capsuleHash and challengeId.

This hash is an integrity/change-detection checksum, not a cryptographic signature.

A production public-link endpoint should still resolve the immutable release/replay identities server-side before accepting any competitive result.

## Rollout recommendation

Replay ghosts and challenge sharing should initially be enabled through the Step 18 feature-control layer.

This allows:

- internal cohort testing;
- percentage rollout;
- platform targeting;
- immediate global or targeted shutdown;
- telemetry comparison between active/control cohorts.

## Scope boundary

Steps 18 and 19 do not:

- replace authoritative replay verification;
- accept scores from share tokens;
- upload replay data;
- create a public social backend;
- automatically expose player identities;
- change the current Quest UI.

They provide the safe rollout and domain primitives for those later product surfaces.
