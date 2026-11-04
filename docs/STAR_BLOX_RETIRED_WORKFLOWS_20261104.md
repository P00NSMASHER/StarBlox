# StarBlox retired workflow consolidation — November 4, 2026

This repository is retired. Its original publisher files, source and Git history are preserved, not erased. The complete historical tree before consolidation is **`74224d497b50be60c0530035b83ab7bd42b3d92d`**.

## Current active workflow inventory
- `.github/workflows/retired-roblox-quarantine.yml`: read-only exact-PR-head policy regression on changes to workflows and the guard.
- `.github/workflows/school-day-foundation-ci.yml`: read-only deterministic historic source tests, no Roblox API or deployment.

## Removed from current GitHub Actions inventory
The fourteen former workflows were thirteen inert, manually dispatchable retired publisher stubs plus the historical `build-brookhaven-compat.yml` build pipeline. They had no required scheduled execution. Their historical definitions remain readable via Git at the SHA above.

`build-brookhaven-compat.yml`, `build-publish-full-maze-world.yml`, `inspect-maze-world-live.yml`, `publish-clean-brookhaven.yml`, `publish-pip-high.yml`, `publish-pips-quest.yml`, `publish-pristine-maze-world.yml`, `publish-rhs-exact.yml`, `restart-pips-quest.yml`, `verify-clean-brookhaven.yml`, `verify-maze-v133.yml`, `verify-pips-quest.yml`, `verify-restart-pips-quest.yml`, `verify-rhs-exact-live-v5.yml`

The replacement policy in `scripts/assert-retired-roblox-workflows.mjs` rejects new workflows, any old publisher file, scheduled work, write-permission workflows, Roblox publication credentials/routes, and unexpected external mutations. Its source-bound adversarial tests must pass on a PR before merge. This does **not** archive or delete the repository, alter secrets, touch live Roblox systems, or modify research hunters. The separate research reassignment is tracked in `P00NSMASHER/github-value-hunt-ledger` PR #991.

All history remains reachable by commit; future reactivation would require a separate, reviewed, explicitly authorized source change.
