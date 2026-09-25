# StarBlox Demo Release Checklist

Baseline: `screenshot-match-preproduction@d8cdc27fd943cc3ecde632ca4247bf9650d77c29`

## Scope frozen for the demo

- Home with avatar, Buddy, Room Progress, and Dream Goal
- Full five-action Quest loop
- Star Market artwork and purchase flow
- Customize/equipment
- Room placement/progression
- Coins, Stars, XP, and mastery/progression
- Persistence across reload
- Mobile and desktop responsiveness
- Controlled showcase profile and Reset Demo

## Release gates

- [ ] 192/192 catalog entries release-cleared — 185/192 complete; seven companion entries require post-deploy live parity.
- [x] CI passes on tested runtime head `b0ce0fa42ad70c3b524ffd16945e3c3d97c6df3d` (run `36116529084`)
- [x] Visual browser QA passes on tested runtime head: desktop, landscape, 390px phone, 320px phone; zero release-blocking failures (run `36116438644`)
- [x] Persistence browser QA passes on tested runtime head (run `36116529246`)
- [x] Quest completes start-to-finish and survives immediate refresh
- [x] Buy/equip/place flow verified, including rapid/multi-tab purchase protection and reload
- [x] No pageerror or console.error events in Home/Store/Quest visual QA
- [x] Phone and desktop layouts verified at 1408x1056, 1024x768, 390x844, and 320x568
- [x] Reset Demo restores the staged profile and survives reload
- [ ] Replit deployment matches the tested demo runtime head — BLOCKED: Replit rejected publish because the account has no remaining credits.
- [ ] Immutable demo tag created

## Deferred until after demo freeze

- PR #46
- Roblox backbone/runtime reconciliation
- Production persistence/network migration
- Major security/performance architecture changes
