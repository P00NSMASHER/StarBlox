# Brookhaven Exact Post-Opening Parity Contract

Status: **canonical Roblox runtime target**

Recorded: 2026-09-26

## User requirement

After the StarBlox opening sequence ends, StarBlox must **look and operate exactly like the real Brookhaven reference**, not merely use a Brookhaven-inspired style.

The opening sequence is the only currently authorized player-facing exception.

Any additional StarBlox-only player-facing HUD, navigation, menu, flow, overlay, economy presentation, learning screen, or interaction counts as a deviation until the user explicitly authorizes another exception.

## Authoritative visual reference

The user supplied a 49.633-second mobile screen recording of the real Brookhaven experience on 2026-09-26.

Observed post-opening reference states include:

- about 20s: free-roam world with Brookhaven's sparse mobile shell;
- about 24s: right-side interaction/action rail, Quick Chat, Home Cams, Family, time/day, and standard mobile movement controls;
- about 28s: inventory/tools grid with Brookhaven-style tiles and red close control;
- about 32s: alternate inventory/tool selection state;
- about 36s: house-selection flow with large left/right paging controls and lot/house presentation;
- about 40s+: ordinary free-roam state with minimal persistent UI.

The Brookhaven welcome/event overlay visible before the post-opening state is not part of the required parity contract because the user explicitly exempted StarBlox's opening sequence.

## Non-negotiable parity rules

1. **No approximation language.** A feature is either matched or not matched.
2. **No custom StarBlox shell after opening.** No left-side StarBlox navigation, custom dashboard, oversized coin/XP HUD, custom blue learning chrome, or bespoke menu family may remain visible after the opening unless separately exempted.
3. **Exact placement and interaction behavior.** Controls must match Brookhaven's screen edge, hierarchy, open/close behavior, paging behavior, selection behavior, and modal stacking.
4. **Exact mobile behavior.** Thumbstick, jump control, camera interaction, safe-area behavior, and menu reachability must be validated on a real touch client.
5. **Exact menu families.** Avatar/editor, tools/inventory, animations, vehicles, houses, bio/roleplay, jobs, family/home-camera/quick-chat surfaces and their visible transitions must be matched to the reference version before parity can pass.
6. **Exact world behavior.** House lots, vehicle spawning/despawning, tool equip/use, avatar/emote behavior, world interactions, travel/teleport behavior, and contextual prompts must match the Brookhaven reference version.
7. **No substitute iconography.** Text glyphs such as `☺`, `▣`, `✦`, `▰`, `⌂`, `JOB`, `◇`, and `$` are not parity-complete substitutes for Brookhaven's actual icon/button treatment.
8. **No substitute grid styling.** Generic white tiles with labels/prices are not parity-complete unless they match the real Brookhaven grid state shown by reference evidence.
9. **No hidden deviation via state logic.** Matching screenshots is insufficient if open/close state, selection, spawning, paging, ownership/availability, or touch behavior differs.
10. **No completion claim from a stale world source.** The existing frozen map baseline is verified against its pinned source revision, but the Step-1 documentation explicitly says it does not prove identity with the current live Brookhaven place. A claim of *current live Brookhaven exactness* therefore requires current-version evidence and a new version-bound exactness receipt.

## Existing systems that must not silently become exceptions

The current school/learning, coin economy, Quest, shop, roleplay, and other StarBlox systems may continue to exist as disabled or behind-the-scenes development modules, but they do not receive a player-facing exception automatically.

If any of those systems are exposed after the opening, their surface and behavior must first be reconciled with this parity contract or explicitly approved as another exception by the user.

## Current known mismatches

The current Roblox runtime is not yet exact.

Examples already present on `main`:

- `MirrorSidebar.client.luau` uses generic text symbols rather than Brookhaven's real button/icon treatment.
- The mirror panel uses a generic 356x326 light panel and generic 78x78 tiles rather than a proven exact Brookhaven menu implementation.
- `CoreGameLoop.client.luau` still owns StarBlox-specific learning/economy UI.
- `BrookhavenMirrorConfig.luau` still encodes StarBlox-specific economy and sidebar semantics.
- The current world baseline is exact to a frozen serialized public source, not proven exact to the current live Brookhaven build shown in the 2026-09-26 recording.

These mismatches mean the present build must not be described as exact Brookhaven parity.

## Release gate

Post-opening Brookhaven parity may be marked PASS only when all of the following are true for the same build:

- reference-version world evidence is pinned;
- world geometry/assets pass a current-version exactness receipt;
- post-opening shell screenshots match the reference at required device classes;
- touch interaction replay passes for every visible control family;
- inventory/tools flow passes;
- vehicle flow passes;
- house/lot flow passes;
- avatar/animation flow passes;
- roleplay/job/family/home-camera/quick-chat flows pass where present in the reference version;
- no unapproved StarBlox-only player-facing UI appears after opening;
- a real-device playtest confirms the same behavior on the target mobile client.

Until then the status is **NOT EXACT**.
