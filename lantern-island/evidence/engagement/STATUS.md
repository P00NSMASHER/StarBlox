# Lantern Island: native-tested adventure candidate

Verified source revision: `1165d7ed27107a018a23088116795479fe901649`.
Build identity: `c0b20d1f64fdd89f66fd4c1abafee10cbfbbd07c7de53c99f3a53f6b89b5f9bd`.
Evidence-only commits after that revision do not change the tested production code.
Status: real Roblox client/server programmatic acceptance passed; not a published or fully device-certified release.

## Implemented for play and learning

Three original adventures with four clues each: Light the hill (addition and regrouping), Pip's ribbon studio (the long-a ai word pattern), and The missing picnic (reading details, order and reasons).
Each adventure alternates world clue locations and short question cards. Successful clues restore lights, festival ribbons or a picnic and unlock a free cosmetic item.
A per-player Pip companion follows the avatar. Its dress-up rewards are the Firefly Scarf, Rainbow Bow and Moon Crown. An owner-only pet interaction is implemented.
The initial interface is an exploration tracker rather than an open lesson panel. Adventures, Dress Pip and Journal are available; question cards scroll and can close.
Progressive hints and explanations support retries. Requesting hints, answering incorrectly, pausing, switching adventures and reloading saved progress cannot turn helped work into independent credit.
The journal separates first-try answers, supported answers and new final-clue checks. Rewards are not mastery scores. Familiar replays do not add reward or learning credit.
All questions are original sample practice, explicitly not current homework. No claim of demonstrated learning gains or child-tested engagement is made.

## Executed evidence

The offline build compiled 13 production Luau files and two test files, strictly checked the transport module, and passed 38 protocol plus 32 gameplay/reward/UI-model behavior tests (70 total).
Two Rojo builds produced identical artifact hashes. The final artifact was also parsed as Roblox XML and checked to exclude the injected native acceptance scripts.
The first native run exposed an unpublished-Studio startup failure: ProfileService requested a cloud DataStore handle before the Studio adapter was selected.
The repaired constructor uses session-only storage in Studio and retains the actual cloud store path outside Studio. The exact fixed source reached READY in Roblox.
A test-only LocalScript then ran on a real Roblox client with the production client UI and real server remotes. It passed 69 checks with zero failures.
Those checks included actual humanoid movement, starting and completing all twelve clues, wrong-answer hints, pause/resume assistance history, server-confirmed rewards, duplicate-request protection, equipped reward parts replicated to the client, and world restoration state.
The native run finished with 12 clues, 3 outfits, 75 earned stars, 11 independent answers and 1 supported answer. These are scripted test results, not a child's learning record.
The native probe used scripted positioning near clue stations and direct requests through the real action remote. It did not press the production buttons with a mouse or finger or walk every route.
See `offline-receipt.json`, `native-acceptance-receipt.json`, and the exact executed `native_client_acceptance.luau` alongside this document.

## Remaining release checks

Actual mouse/touch activation of the UI and movement controls: not verified.
Full traversal of the island, all navigation markers, lift and pet interactions: not fully acceptance-tested.
Phone-sized rendering and physical phone usability: not verified; only pure layout bounds were tested.
Cloud save and full leave/rejoin to a new server: not verified. The native test explicitly reports STUDIO_SESSION_ONLY.
Child engagement, difficulty fit and actual learning gains: not tested.
This candidate was not merged to main or published to a Roblox experience. The old live target guard remains in the development code.
Concurrent changes on `lantern-engagement-learning-20260929` were preserved. This tested work is saved separately on `lantern-native-adventures-20260929` and needs reconciliation before integration.

## Exact local artifact

Filename: `LanternIsland-Adventures.rbxlx`.
Bytes: 82,287.
SHA256: `5dd773126e32c48fd081825f3f10dd44905a97a1f0d4c81323b5e68c57ee97dd`.
Location on the authorized Windows development computer: `%USERPROFILE%\LanternIslandBuilds\engagement-650dfbc\lantern-island\dist\LanternIsland-Adventures.rbxlx`.
A `Lantern Island - Test Build.lnk` shortcut was created and read back successfully on the user's actual Desktop folder. It opens that exact file in the installed Roblox Studio, not the old live experience.
The shortcut and file are a local testing entry point, not a public Roblox play link.
