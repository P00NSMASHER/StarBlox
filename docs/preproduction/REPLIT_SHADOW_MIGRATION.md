# StarBlox Replit Shadow Migration

Status: **STARTED / UNPUBLISHED SHADOW BUILD**

Source repository: `P00NSMASHER/StarBlox`  
Source branch: `screenshot-match-preproduction`  
Initial migration baseline head: `a01af6a1227997b35d27738f8576ec3b97147852`  
Current published deployment: `https://star-blox.replit.app`  
Replit app ID: `821e329b-9d6b-4bc9-940d-b18a07aaa463`

## Safety contract

- Keep the currently published StarBlox deployment live until an explicit final publish action.
- Treat the Replit workspace as the unpublished shadow release candidate.
- Do not reset, replace, or migrate real player data during shadow work.
- Preserve StarBlox save compatibility, ownership, inventory, economy, quest receipts, Dream Goal, Buddy Bond, room state, district progress, mastery evidence, and daily progress.
- Do not publish, redeploy, or change paid settings without explicit user approval.
- Do not treat workspace preview success as deployment permission.

## Migration order

1. Stage frozen accepted artwork and reusable visual assets.
2. Mirror the React/Vite application and runtime modules from the release branch.
3. Preserve persistence/save-migration behavior exactly.
4. Reconcile catalog manifest/runtime mappings as the GitHub candidate advances.
5. Keep the Replit preview building while the final art/review pipeline continues.
6. After catalog and release gates close, sync only the final GitHub delta.
7. Run Replit-preview build, persistence/economy, mobile/responsive, Store/Quest/Home and asset-path smoke checks.
8. Record the exact final GitHub source head.
9. Publish only after explicit user approval.
10. Poll deployment status and smoke-test the public URL after publish.

## Daily credit strategy

Use the daily Replit budget for large coherent migration increments, not repeated micro-edits:
- primary allocation: source/assets synchronization,
- secondary allocation: Replit-specific build/preview fixes,
- maintain reserve for late release-candidate deltas.

## Current boundary

The GitHub catalog is still in accelerated finishing. The shadow build may be updated ahead of release, but unresolved/pending art must not be represented as final or used to overwrite accepted exact hashes.


## Shadow sync ledger

### 2026-09-22 — initial workspace sync
- Requested source baseline: `a01af6a1227997b35d27738f8576ec3b97147852`.
- Replit workspace update started in unpublished shadow mode.
- Published deployment remained `success` at `https://star-blox.replit.app`.

### 2026-09-22 — incremental runtime delta
- GitHub advanced to `812a05b27210da6ebd2e7fc21c5d4195fde15b08`, four commits beyond the initial migration baseline.
- Production-relevant runtime delta: reduced-motion sticky press-state fix in the motion/game-feel runtime plus its regression coverage.
- Replit shadow update instructed to reuse already-synchronized content and apply only the production-relevant delta rather than retransferring unchanged files.
- Replit Agent turn remains in `updating` phase; shadow preview/build verification is still pending.
- No publish/redeploy action was requested or authorized.

### Next migration action
When the current Replit Agent turn is no longer busy/updating, verify the unpublished preview/build state and record the exact synchronized source head. Then continue with the next coherent GitHub delta only; do not publish until the full StarBlox release gates pass and the user explicitly approves deployment.
