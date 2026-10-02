# NPC Social Contract

Version: 1

This is the integration contract for student and teacher NPC behavior. It stays runtime-neutral while the school-day authority is being introduced separately in PR #179.

## Deterministic authority

- Server owns schedule state, interaction acceptance, cooldown decisions, and relationship deltas.
- Clients may request interactions but cannot author outcomes.
- No random selection in the policy layer.
- Unknown NPCs or interactions return DENY.
- Unknown schedule periods resolve to IDLE.

## Schedule seam

Input is a symbolic school period ID. Each NPC maps a period to one intent: IDLE, TRANSIT, LEARN, TEACH, or SOCIALIZE. Destinations are symbolic anchor IDs. This lane does not own classroom geometry or building bindings.

## Roster and anchor registry

`NpcSocialRegistry` is the runtime-neutral boundary for NPC definitions before they enter `NpcSocialPolicy`.

- Roles are symbolic STUDENT or TEACHER values.
- Non-IDLE schedule intents require a declared symbolic anchor ID.
- IDLE may intentionally omit an anchor.
- Dialogue is referenced only by predeclared dialogue hook IDs.
- Unsupported NPC fields are rejected rather than retained.
- Registry construction deep-copies and freezes the policy-facing schedule and interaction maps.
- The registry owns no coordinates, Instances, spawning, remotes, persistence, player identifiers, usernames, or free-form conversation text.

The registry deliberately does not define actual classroom coordinates or world object bindings. Those remain owned by the school/world lane and can later map reviewed symbolic anchors to geometry.

## Proximity seam

Supported interaction kinds: GREET, CHAT, ASK_HELP, COMPANION_INTRO.

- Maximum interaction radius: 20 studs.
- Cooldown must be ready before success.
- Dialogue output is a preauthored hook ID.
- Denied interactions always produce relationship delta 0.
- Allowed relationship delta is bounded to 0 or 1.

## Companion seam

Companion integration is a single companionPresent boolean. COMPANION_INTRO may require it. The NPC policy does not own companion inventory, persistence, purchases, or profile state.

## Dialogue catalog seam

`NpcDialogueCatalog` resolves approved dialogue hook IDs into bounded, preauthored student or teacher lines.

- Selection is deterministic: companion tier -> companion default -> base tier -> base default.
- Relationship variants are limited to NEW, KNOWN, FRIENDLY, and TRUSTED, with DEFAULT as the required base fallback.
- Unknown hooks or invalid context fail closed and return no dialogue text.
- The resolver accepts only a hook ID, relationship tier, and companionPresent boolean; it does not accept player-written dialogue, usernames, profile fields, or interpolation arguments.
- Authored lines are single-line, capped at 160 characters, and reject player-name interpolation tokens.
- Catalog construction deep-copies and freezes active dialogue entries.
- The catalog performs no random selection, AI generation, networking, persistence, moderation logging, or external requests.

## Interaction resolver seam

`NpcInteractionResolver` is the pure composition boundary between the validated registry, social policy, dialogue catalog, and relationship model.

- Policy denial returns immediately with no dialogue and no relationship change.
- Allowed policy outcomes resolve preauthored dialogue using the pre-interaction relationship tier, so one interaction cannot promote itself into a friendlier line.
- Missing dialogue, missing role metadata, or a dialogue/NPC role mismatch fails closed with no relationship gain.
- Relationship deltas are applied only after policy acceptance and successful dialogue validation.
- `reputationContribution` is the resulting bounded per-NPC relationship score normalized to 0-100; it is not a persisted or global reputation record.
- The resolver accepts only current gameplay-state fields and a current bounded relationship score. It owns no remotes, persistence, world Instances, random selection, player identifiers, profile data, or free-form text.

## Bundle construction seam

`NpcSocialBundle` is the configuration-time composition boundary for the registry, policy, dialogue catalog, and interaction resolver.

- Every declared dialogue hook must have exactly one catalog entry; undeclared catalog entries are rejected.
- Every interaction dialogue role must match the owning NPC role before the stack is returned.
- Unsupported top-level bundle fields are rejected rather than retained.
- Bundle construction validates the complete cross-contract configuration before returning the registry, policy, dialogue catalog, and resolver together.
- Construction remains runtime-neutral and accepts no player identifiers, profile data, free-form text, persistence, networking, or world Instances.

## Relationship foundation

The policy may output only a bounded relationship delta. Storage is owned elsewhere. Version 1 defines no negative delta.

## Safety and privacy

The policy consumes only gameplay-state values needed for the current interaction. It does not collect real-player personal data, free-form conversation history, or external-account data. The roster registry rejects unsupported fields instead of silently retaining arbitrary data.

## Runtime dependency blocker

No live NPC service is added in this increment. No runtime NPC service is added in this increment. The deterministic policy, validated symbolic roster/anchor registry, bounded relationship model, deterministic dialogue catalog, and pure interaction resolver now exist on this branch, but the authoritative school-day runtime remains in open PR #179 and no accepted world binding currently maps symbolic anchors to classroom/social-space geometry. Wiring movement or spawning now would guess another lane's ownership.

Next: once the PR #179 snapshot interface is accepted, add a thin server adapter that consumes its `periodId`, resolves schedules through the validated registry/policy pair, and emits movement intents to a separately owned world-anchor binding. Do not add persistence, networking, or player-data collection to that adapter.
