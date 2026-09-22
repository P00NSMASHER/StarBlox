# Workstream 05 — Quest reference material/composition specification v2

ART_AND_VISUALS_ONLY. This document is review/implementation guidance only. It does not change Quest runtime, learning content, scoring, reward/economy state, catalog mappings, shared entrypoints, or release gates.

## Evidence inspected

- Preserved original Quest pixels: `docs/preproduction/reference-screenshots/originals/quest-1448x1086.jpeg` and the exact uniform-scale `quest-desktop-1408x1056.png` from workflow `35663779668`, artifact `10668417625`.
- Historical deterministic running Quest capture at head `b187186e62519ffa77bd0f7b166c601c90bdc416`: workflow `35663655650`, artifact `10668287632`, at 1408x1056, 390x844 and 320x568.
- Reviewer-14 comparison: `docs/preproduction/visuals/chat-reference-comparison-14-v1.json` at branch head `fd438e4e54861bf713be3c6622953de91dd7ab5a`.

The historical capture is used only to diagnose composition/material deltas. It is not relabeled as current-head proof or a parity PASS.

## Highest-value desktop deltas from actual pixels

1. **Restore a warm room around the live learning UI, not inside it.** The reference gets most of its authored depth from peach/wood shelving, plants, window light, warm floor/furniture, pink-violet bounce and gold sparkles. The historical capture is dominated by cold navy/cyan planes. Keep the real prompt/answers on white/light surfaces, but let the peripheral scene carry warm material and light so the UI does not have to fake richness with heavier blue chrome.
2. **Use blue/cyan as structure and rim light, not the dominant environment material.** Cyan belongs on panel edges, selected states and small emissive accents. It should not wash the white reading surface or turn the room into one blue slab. Gold belongs on Quest identity/earned emphasis only; it should not imply unearned rewards.
3. **Preserve a three-depth-plane stack.** Background room: shelves/window/props with atmospheric depth. Midground character/world vignette: large readable avatar plus buddy without covering controls. Foreground learning/evidence UI: crisp white cards with shallow physical elevation and restrained shadow. Avoid flattening environment, avatar and controls onto one visual plane.
4. **Reduce dead white space without inventing learning content.** In the historical 1408 capture the left mission panel has a large empty white zone between its small top label and the real prompt near the lower half. The reference fills equivalent space with real story text and contextual illustration, but that text must not be copied. For shorter real prompts, use adaptive spacing and non-semantic contextual art placement; never fabricate passage copy, answers or evidence simply to fill the card.
5. **Keep the answer cluster visually attached to the prompt.** The historical right column leaves a large empty interval between the three real choices and the pre-hint helper. Tighten the visual grouping of real controls before adding ornament. The helper can explain clue-after-first-miss behavior, but must not reveal the actual clue early.
6. **Make the character/world share large enough to carry emotion.** The reference uses a large expressive lower-left avatar with readable face/hands and warm scene context. The current/historical composition keeps the character legible but materially smaller and flatter. Future visual integration should increase character presence inside the left stage envelope while keeping every instructional surface and navigation control unobstructed.
7. **Make evidence rails feel collectible without faking state.** The reference right rail has strong card separation, icons, material depth and progression rhythm. Reproduce that depth language with the actual mastery/today-learning values only. Do not add decorative completed bars, locks, counts, stars or rewards that are not backed by state.
8. **Earned summary stays visually premium but factually bounded.** The reference gives the reward footer strong gold/blue treatment. The runtime must render only actual earned outcomes. No fake balance, streak, mastery or reward amount may be imported from the screenshot.

## Material and lighting acceptance rubric

A future Quest render should be REWORK if any of these are true:

- the environment still reads primarily as a flat dark-blue rectangle rather than a dimensional room;
- the white/light learning surface is tinted by scene art enough to reduce instructional contrast;
- cyan bloom is stronger than the warm room key light across most of the viewport;
- shelf/window/desk/plant assets appear pasted on without overlap, cast/contact shadow or foreground/background separation;
- the avatar reads as a small sticker rather than a staged character with clear silhouette and scene anchoring;
- panel shadows become heavy black slabs instead of shallow elevation;
- decorative stars, progress bars or badges could be mistaken for real earned state;
- any generated/context art contains answer wording, answer keys, fake balances or pseudo-controls.

A future Quest render is directionally acceptable when the outer scene reads warm and dimensional at a glance, the center remains a light readable work surface, the avatar/world layer clearly sits between room and UI, and the live prompt/answers remain the strongest functional hierarchy.

## Phone composition specification from actual 390x844 and 320x568 pixels

There is no authoritative phone reference, so these are readability/composition requirements, not invented pixel parity.

- At 390x844, the historical capture spends most of the initial viewport on shared HUD/stage/character before the prompt, and the answers are below the fold. At 320x568, the first viewport shows the avatar, prompt and decorative mission scene but no answer choice.
- **Do not let decorative mission-scene art separate the real prompt from the actionable answer choices on phone.** After responsive reflow, prompt -> answer choices should remain the shortest visual path. Non-semantic scene art may move below the answer group or compress substantially at narrow widths.
- Compact the avatar/room vignette on phone rather than deleting it. It should establish character/world quickly, then yield vertical space to the learning task.
- The four-stage strip may compact/reflow visually, but Diagnose/Practice/Review/Transfer identity and the real current stage must remain truthful. Do not use a fake completed stage to save space.
- Bottom navigation must not mask an answer, helper, retry state or earned summary. Use content padding/reflow rather than shrinking instructional type below the established phone minimum.
- Mastery/today-learning evidence may follow the action loop on phone; it must not be promoted above the prompt/answers merely to match desktop column order.

## Next rendered-proof checklist

When Workstream 15 schedules the next Quest visual render, reviewer 05 should compare actual 1408x1056 plus 390x844 and 320x568 pixels and record:

1. warm-room vs blue-chrome visual balance;
2. avatar silhouette/scale and overlap safety;
3. prompt-to-answer spatial distance;
4. dead-space use with short prompts;
5. panel depth/material separation;
6. mastery/earned-state truthfulness;
7. phone first-action reachability and bottom-nav clearance;
8. preservation of immediate scoring, clue-after-first-miss/retry, read-aloud, five-action flow, correct keys and independent-vs-assisted evidence.

Do not introduce a decorative `Check My Answer` control over the existing immediate-scoring behavior. Full visual PASS still requires current-head real render evidence plus affected tests/build; this specification does not close those gates.
