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

## Proximity seam

Supported interaction kinds: GREET, CHAT, ASK_HELP, COMPANION_INTRO.

- Maximum interaction radius: 20 studs.
- Cooldown must be ready before success.
- Dialogue output is a preauthored hook ID.
- Denied interactions always produce relationship delta 0.
- Allowed relationship delta is bounded to 0 or 1.

## Companion seam

Companion integration is a single companionPresent boolean. COMPANION_INTRO may require it. The NPC policy does not own companion inventory, persistence, purchases, or profile state.

## Relationship foundation

The policy may output only a bounded relationship delta. Storage is owned elsewhere. Version 1 defines no negative delta.

## Safety and privacy

The policy consumes only gameplay-state values needed for the current interaction. It does not collect real-player personal data, free-form conversation history, or external-account data.

## Runtime dependency blocker

No runtime NPC service is added in this increment. The pure deterministic policy is now implemented at pipsquest/src/shared/NpcSocialPolicy.luau, but main still has no stable NPC roster or anchor registry, and the authoritative school-day runtime is still in open PR #179. Wiring live NPCs now would guess ownership and period-delivery interfaces and risk duplicating another lane.

Next: after the school-day snapshot contract is accepted, add one thin server adapter that maps its symbolic period ID into this policy plus a reviewed symbolic anchor registry. Do not add spawning, persistence, or networking until those contracts are explicit.
