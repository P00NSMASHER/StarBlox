# Lantern Island Private Staging — Authoritative Status

Status: **published private staging, server-verified, cloud-persistence-verified**

## Roblox target

- Universe: `6027194615`
- Place: `17602626136`
- Published place version: **128**
- Visibility changed by Lantern release: **no**
- Public access changed by Lantern release: **no**
- Channel: private staging

## Exact published build

- Production source commit: `1f562a85bb54cf338fae60bf4e75533878f6cc70`
- Build fingerprint: `3b7990ab65c88f6c35b62f6310cf9fabe915b9e0c281da5fcd482c57fe97e19f`
- Artifact SHA256: `5beee39e9ac2cb0acb44cd9482470eec67056290acd7b304b5d731595925a183`
- Artifact bytes: `127409`
- Release ID: `lantern-island-private-staging-20260929-v2`

The exact artifact passed the guarded hash/size/build-identity checks before publishing.

## Published server verification

Guarded publish workflow run: `36616621807`

Result:
- Open Cloud target preflight passed.
- One new private place version was published.
- Roblox returned version **128**.
- Headless production verification ran against version 128.
- The published server exposed the exact build fingerprint.
- `TargetPolicy` was present.
- Shared runtime and client package were present.
- Lantern server bootstrap reached `READY`.
- `PipsPlaza` and ambient island world objects were present.
- Verification sentinel: `LANTERN_PRIVATE_STAGING_BOOT_OK`.

## Client/gameplay proof before publish

The underlying verified playable/mobile build passed:
- 114 native Roblox client/server gameplay checks.
- 127 simulated-control/walking checks at 810x410.
- 61 real `GuiButton.Activated` events.
- 21 `Humanoid.MoveTo` walking segments, with no teleport in the walking harness.
- All 12 learning clues.
- Wrong-answer teaching/hints.
- Three distinct outfit rewards.
- Reward previews/equipping.
- Per-clue island transformations.
- Restored plaza gates and Island Magic progression.
- Starlight Garden / Starlight Trail.
- Alternate replay decks without duplicate rewards or inflated learning credit.

The v2 server bootstrap extraction is structural: normal servers call `Bootstrap.start()` from `Main.server`; Open Cloud verification explicitly calls the same packaged Bootstrap because execution-session tasks do not auto-run Script instances.

## Real cloud persistence proof

Workflow run `36617214908`:
- Real DataStore save -> unload -> reload roundtrip passed.
- Outfits, equipped item, mission completion and learning evidence survived.
- Synthetic QA key was removed after verification.

Workflow run `36619278913`:
- Same proof repeated against the **actual production namespace** `LanternIsland_DEV_v1_profiles`.
- Three-entitlement / 75-star state survived reload.
- A stale concurrent writer was rejected with `SAVE_CONFLICT`.
- The stale writer did not clobber the newer cloud state.
- Synthetic negative-user QA keys were cleaned after the run.

## Local fallback

The existing local `Lantern Island - PLAY NOW` shortcut remains a separately verified local build. Private staging publication did not replace or delete the local rollback copies.

## Remaining gates

Not yet claimed:
- Physical iPhone/Android touch test.
- Real Roblox Player join on a physical/client installation for private staging version 128.
- Child playtest / enjoyment.
- Learning retention or measured learning gains.
- Public publication / public access.

Do not call the game a public release until those gates are intentionally cleared.
