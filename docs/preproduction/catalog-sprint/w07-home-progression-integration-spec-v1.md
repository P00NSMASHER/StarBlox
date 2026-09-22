# Workstream 07 — Home Progression Visual Integration Spec v1

**Phase:** ART_AND_VISUALS_ONLY  
**Branch:** `screenshot-match-preproduction`  
**Owner:** Workstream 07 visual-spec only  
**Shared integration owner:** 15  
**Catalog canonical writer:** 08 only  
**Runtime/state ownership:** unchanged existing owners

This document is a **non-runtime visual handoff** for the already-staged Workstream 07 Home assets. It does not authorize CSS/runtime/state edits, does not claim pixel acceptance, and does not reopen any catalog family.

## Evidence boundary

Use these sources together; newer exact evidence wins over older mission text:

- `docs/preproduction/ART_VISUALS_SPRINT.json`
- `docs/preproduction/DELIVERY_PROTOCOL_V2.md`
- `docs/preproduction/reference-screenshots/original-reference-manifest.json`
- authoritative Home original: `docs/preproduction/reference-screenshots/originals/home-1448x1086.jpeg` — Git blob `cd4905ff1a8b97d784698ae1b0f8c3521937711e`
- current W07 asset inventory/hashes: `docs/preproduction/catalog-sprint/lane-07.json`
- current Home-v3 composition analysis: `docs/preproduction/catalog-sprint/lane-03.md`
- current coordination: `docs/preproduction/catalog-sprint/coordination-15-20260922-0705.json`

The reference set contains **desktop originals only**. There are no authoritative 390px or 320px reference pixels, so mobile work may prove reachability/readability but must not claim invented screenshot parity.

## Frozen inputs — do not regenerate

Catalog is closed for this lane. Tops 1–6 and Rugs 1–12 remain frozen at their accepted exact hashes. Rugs 12 is independently accepted at `eea2fc5b78c1186342f91f597bc792160ab8f8fe`; only 08 may canonical-wire it.

The following W07 Home visual assets are also preserved inputs for evaluation rather than prompts to make duplicates:

### Room / aspiration art

| Role | Asset | Exact Git blob |
|---|---|---|
| Tier 1 — Tiny Starter Studio | `/assets/home/room-tier-1-w07-v2.svg` | `2d3060ac1e260a53fd1ced809e7cf3bc760c5490` |
| Tier 2 — Cozy Loft | `/assets/home/room-tier-2-w07-v2.svg` | `21410fe2456a1605e044939118d9f2edf100b441` |
| Tier 3 — Creator Bedroom | `/assets/home/room-tier-3-w07-v2.svg` | `87cded45608fed8525c95cf48f60e51fb5c1811e` |
| Tier 4 — Skyline Penthouse | `/assets/home/room-tier-4-w07-v2.svg` | `9963a3abdc2426608b717e9d7eff0dd87b43cae8` |
| Tier 5 — Star Mansion | `/assets/home/room-tier-5-w07-v2.svg` | `c5eb44f34604737e085adfb7ad8c5d5e99087bb5` |
| Dream Goal | `/assets/home/dream-goal-w07-v2.svg` | `e894c6bca103fd506ad61173a39c2df05de3277b` |

### Existing progression decorative art

| Role | Asset | Exact Git blob |
|---|---|---|
| Daily Quests | `/assets/home/progression-daily-quests-w07-v1.svg` | `ca199e8368d0e6fde334dc364eea7babdba39d44` |
| Today Learning | `/assets/home/progression-today-learning-w07-v1.svg` | `568c78139c44a35fa93fa60312ea406ca9a74561` |
| Mastery | `/assets/home/progression-mastery-w07-v1.svg` | `bd6f7de3538281cca15b81dc82138957481da337` |
| Rewards + Customization | `/assets/home/progression-reward-customization-w07-v1.svg` | `8426e6af5829e225415d294f8cd1dd99019d97cb` |

These assets are decorative/aspirational only. Their pixels contain no authoritative counters, ownership, prices, mastery percentages, completion claims, streaks or timers.

## Reference-driven composition contract

The Home original reads as a **bedroom world with UI floating over it**, not as a dashboard with a decorative background. W13's current Home-v3 work owns the environment; W07 assets must fit that scene instead of competing with it.

1. **Protect the hero corridor.** Current Home-v3 evidence deliberately clears the center wall/floor for avatar/buddy placement. W07 imagery must stay inside its own cards/previews and must not introduce floating decoration into the shared center corridor.
2. **Room Progress remains image-led.** The five canonical room tiers should be distinguishable by silhouette/material richness before labels are read. Do not replace the five-tier visual sequence with icons, text-only milestones or a single generic room thumbnail.
3. **Dream Goal remains aspirational-room-led.** The room image is the emotional payoff; real goal text/counters remain separate live UI. Do not bake progress, currency, stars, dates or completion into the art.
4. **Lower progression surfaces remain visually bright but subordinate.** Daily/Today/Mastery/Reward art should support scanning inside existing panels, not become full-panel screenshots or new interaction affordances.
5. **Decoration yields before state.** If a narrow viewport cannot fit both decoration and real state/control content comfortably, reduce or omit decorative art first. Never hide, shrink into illegibility or replace real counters/actions to preserve artwork.

## Five-tier material ladder

The five rooms should escalate through **construction and material richness**, not palette swaps:

- **Tier 1 — Tiny Starter Studio:** attractive but simple; cotton/flat-weave textiles, light laminate or birch, basic painted surfaces, restrained hardware, clean floor contact.
- **Tier 2 — Cozy Loft:** added softness and layering; knit/boucle accents, warmer wood, thicker bedding, small framed/decor details, slightly richer edge shadows.
- **Tier 3 — Creator Bedroom:** visibly more built-out creator identity; ribbed/layered textiles, painted wood, matte metal, purposeful desk/storage details and stronger practical lighting depth.
- **Tier 4 — Skyline Penthouse:** premium architectural finish; walnut/metal, low-sheen stone or polished surface accents, deeper glazing, tailored fabrics and controlled specular response.
- **Tier 5 — Star Mansion:** spectacle through real construction; velvet/soft luxury textiles, architectural gold/brushed-metal trim, layered canopy/fixture detail, rich woven floor treatment and luminous accents with controlled bloom.

Across all tiers, keep a coherent three-quarter room camera, believable floor contact, object thickness and directional light. Higher tiers gain material/structural complexity; they should not simply add more glow.

## Progression-art state contract

The decorative assets intentionally encode only neutral concepts:

- **Daily Quests:** exactly three neutral stations; no fictional fourth goal, no checkmarks implying completion.
- **Today Learning:** book/pencil/geometry language only; no answer, score, subject percentage or skill claim.
- **Mastery:** evidence/medallion language only; no mastered-skill count or percentage.
- **Rewards + Customization:** wardrobe/room-style/reward-parcel language only; no catalog item ID, owned quantity, price or earned-reward claim.

Any real values must come from existing live state at integration time. Daily reset may change daily state only; permanent progress/mastery must not be represented as resettable visual state. No FOMO, expiry treatment, punitive streak language or scarcity countdown belongs in these visuals.

## Responsive framing contract

### Desktop / tablet targets

- At `1408×1056`, preserve the reference hierarchy: room scene first, image-led Room Progress near the upper center, Dream Goal visually strong at the side, dense lower widgets over the scene.
- At `1024×768`, preserve the same hierarchy while reducing decorative footprint before reducing real text/control readability.
- For W07 room-tier and Dream assets, use **contain-first framing**. Do not crop architectural anchors merely to fill a card.
- For the 480×280 progression assets, preserve the full symbolic composition when shown; avoid cover-crops that remove one of Daily Quests' three neutral stations or turn a decorative object into an apparent button.

### Phone targets

Required reachability checks remain `390×844` and `320×568`, but these are **verification sizes, not screenshot-reference sources**.

- Keep art in bounded image slots; do not let it become a full-width background behind live text.
- Prefer `contain`/letterboxed breathing room to destructive `cover` crops.
- Preserve all live labels, counters and controls as the primary readable layer.
- Maintain the W13 Home-v3 phone-safe center corridor; W07 art should not extend outside its card to refill that negative space.
- If vertical density becomes excessive, decoration collapses/reduces before stateful content is removed.
- No horizontal overflow or offscreen-only actionable content may be introduced for the sake of artwork.

## Integration acceptance checks for 15 / assigned finisher

This spec itself does not authorize wiring. When shared integration is assigned, verify only against the real app and current exact asset hashes:

1. **Hash binding:** each rendered asset resolves to the exact preserved blob above; no stale version or legacy path silently wins.
2. **State separation:** inspect DOM/runtime source and pixels to confirm decorative SVGs contain no injected fake numbers/state and do not cover real counters.
3. **Hierarchy:** Home still reads room → hero/progress → Dream → lower widgets, rather than a grid of equally loud cards.
4. **Tier differentiation:** all five room previews remain visually distinguishable at actual thumbnail size without relying only on labels.
5. **Daily count:** exactly three Daily Quest visual stations; no extra goal is implied.
6. **Responsive:** test `1408×1056`, `1024×768`, `390×844`, `320×568`; verify reachability, no horizontal overflow, image containment and no collision with avatar/buddy or controls.
7. **Motion:** normal and reduced-motion modes retain the same information/state hierarchy; decoration may reduce but state must not change.
8. **No parity overclaim:** desktop may be compared against the authoritative Home original; phone checks are usability/composition proof only because no original phone reference exists.

## Non-goals / ownership boundaries

- No W07 shared runtime, CSS, route, state, counter, economy, learning or persistence edit is authorized by this document.
- No W07 environment repaint is authorized; W13/15 own the current Home-v3 environment/composition path.
- No catalog art family is opened by this document.
- No accepted Tops/Rugs hash is changed or re-reviewed.
- No self-approval is claimed for W07 Home art; this is producer/integration guidance only.
- Replit/Floot/main/deploy/purchases/paid settings/real player data remain frozen.
