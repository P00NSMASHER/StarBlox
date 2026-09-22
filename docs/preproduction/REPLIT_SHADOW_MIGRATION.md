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
