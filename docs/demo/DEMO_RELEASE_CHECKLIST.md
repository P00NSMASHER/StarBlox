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

- [ ] 192/192 catalog entries release-cleared, or the seven companion live-parity exceptions are explicitly resolved
- [ ] CI passes on the exact demo head
- [ ] Visual browser QA passes on the exact demo head
- [ ] Persistence browser QA passes on the exact demo head
- [ ] Quest completes start-to-finish
- [ ] Buy/equip/place flow verified
- [ ] No obvious console/runtime errors
- [ ] Phone and desktop layouts verified
- [ ] Reset Demo restores the staged profile
- [ ] Replit deployment matches the frozen demo head
- [ ] Immutable demo tag created

## Deferred until after demo freeze

- PR #46
- Roblox backbone/runtime reconciliation
- Production persistence/network migration
- Major security/performance architecture changes
