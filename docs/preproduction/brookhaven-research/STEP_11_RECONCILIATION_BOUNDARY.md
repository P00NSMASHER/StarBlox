# Brookhaven Research — Step 11 of 12: Reconciliation and Learning-Stack Separation

Status: **COMPLETE — controlled replay plan ready; no merge/deploy performed**

Step 11 deliberately does **not** merge the Brookhaven research branch into the moving product branch.

Current branch drift makes direct merging inappropriate:

- Brookhaven research vs current preproduction: **65 ahead / 342 behind**.
- Learning factory vs current preproduction: **200 ahead / 450 behind**.
- The two research lines do not even share the same current product merge base.

## Required integration strategy

When the other StarBlox updates are finished:

1. create a fresh integration branch from the then-current `screenshot-match-preproduction`;
2. replay Brookhaven research metadata/validation first;
3. replay residential, vehicle and town neutral runtimes second;
4. replay the read-only life-sim progression shadow model third;
5. manually re-add only the Brookhaven npm scripts to the current `package.json`;
6. verify build, tests, runtime boundary and separation gates after every group;
7. do **not** replay the old temporary catalog build-fix script;
8. do **not** transplant `App.jsx`, `main.jsx`, `gameModel.js`, or `storage.js` from the research branch.

The machine-readable replay plan is:

`docs/preproduction/brookhaven-research/step-11-replay-manifest-v1.json`

## Learning-factory separation

EdGameClaw + PSI-KT + Riff + adversarial QA remains a separate workstream until the product base and Brookhaven neutral environment layer are reconciled.

The new assertion:

`scripts/assertBrookhavenLearningSeparation.mjs`

fails if:

- a Brookhaven research runtime is imported into live `App.jsx`, `main.jsx`, `gameModel.js`, or `storage.js`; or
- a Brookhaven residential/vehicle/town/progression runtime imports the learning-factory modules.

This is a temporary integration boundary, not a permanent architectural ban. The six-system learning integration can proceed after controlled reconciliation onto the stabilized StarBlox lineage.

## Step 11 exit state

- replay order is explicit;
- live product files are excluded from replay;
- the obsolete inherited build workaround is excluded;
- Brookhaven and learning-factory research remain isolated;
- no branch merge was performed;
- no deployment was performed.

Step 11 is complete.
