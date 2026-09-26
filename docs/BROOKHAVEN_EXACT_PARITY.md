# Brookhaven Exact Parity Contract

## Scope

After the custom StarBlox opening sequence ends, the ordinary world experience should look and operate like the real Brookhaven reference recording supplied on 2026-09-26.

The opening sequence is explicitly outside this parity requirement and remains StarBlox-specific.

## Reference behaviors captured from the recording

The ordinary world view uses:

- Roblox's native upper-left system controls;
- Brookhaven Quick Chat near the upper-left/center;
- Home Cams and the current time/day at the upper-right;
- Family directly below the Home Cams/time cluster;
- a five-action right-side stack:
  1. Avatar Editor
  2. Tools
  3. Animations
  4. Vehicle
  5. House
- pale/translucent square action tiles;
- pale/translucent text labels to the left of the right rail with cyan arrows;
- Roblox mobile movement/jump controls left untouched;
- contextual menus that float over the 3D world instead of replacing it with a StarBlox dashboard.

## StarBlox exception rule

StarBlox learning, school, question, and learning-coin systems are allowed to appear when the player intentionally enters a learning context.

They must not create a persistent alternate HUD during normal Brookhaven-style free play.

The default client attribute StarBloxLearningOverlayVisible is therefore treated as false unless a learning flow intentionally enables it.

## World rule

This client parity work must not mutate the locked Brookhaven world baseline.

The existing world contract remains:

- mode: exact-frozen-brookhaven-world
- BrookhavenBaselineLocked: true
- RuntimeSystemsMayMutateBaseline: false

## Parity implementation sequence

1. **Persistent shell**
   - five-action right rail
   - Quick Chat
   - Home Cams
   - time/day
   - Family
   - remove persistent StarBlox dashboard

2. **Tools**
   - Brookhaven category rail
   - dense icon grid
   - equip/unequip behavior
   - matching close/clear controls

3. **Vehicle**
   - Brookhaven category rail
   - matching vehicle grid
   - spawn/despawn behavior
   - vehicle controls and camera behavior

4. **Avatar Editor**
   - outfit/body/accessory categories
   - outfit save slots
   - gender/category tabs
   - avatar reset and apply flows
   - on-world avatar preview behavior

5. **House**
   - vacant-lot selection
   - previous/next lot arrows
   - GO action
   - house category/style chooser
   - spawn/change/remove house flow

6. **Home Cams / Family / Quick Chat**
   - actual camera cycling
   - family invite/group role behavior
   - Brookhaven-style quick-chat operation

7. **Interaction parity**
   - seats
   - doors
   - lights
   - tools
   - usable world props
   - roleplay interactions
   - vehicle interactions
   - house interactions

8. **Visual exactness pass**
   - icon assets
   - spacing
   - font sizing
   - transparency
   - open/close transitions
   - safe-area/mobile scaling
   - side-by-side recording QA

## Acceptance rule

A post-opening screen is not parity-complete merely because it is Brookhaven-inspired.

For the portion under test, the layout, visible controls, interaction order, open/close behavior, and resulting player action must agree with the real Brookhaven reference closely enough that a side-by-side mobile recording shows no material behavioral mismatch other than StarBlox's deliberate learning/economy additions.
