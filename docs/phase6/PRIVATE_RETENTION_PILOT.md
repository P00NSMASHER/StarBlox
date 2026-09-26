# Phase 6 private retention pilot

Phase 6 engineering is complete and privately deployed as Roblox place version **15**. Public activation remains disabled.

The retention pilot intentionally requires genuine private-player sessions. Do not synthesize, replay, or manufacture retention evidence.

Run `npm run roblox:phase6:retention-report` after private sessions have ended. The report measures time to first activity, full-loop completion, repeat-loop starts, average session duration, and first-activity preference without storing username, user ID, raw answers, chat, or session IDs in the aggregate.

The initial decision sample is **5 completed private sessions**. Reaching five sessions is a measurement threshold, not an automatic public-release approval. Review the measured friction and repeat-play behavior before any public-access or production-activation change.

The v15 release itself has already passed the exact server-boot gate, including the rotating certified question bank, retention store, locked Brookhaven world mount, real-world activity anchors, and world-derived spawn.
