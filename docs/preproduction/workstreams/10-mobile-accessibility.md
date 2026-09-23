# Workstream 10 — Independent Release QA

STATUS: **QUEST POINTER BLOCKER CLOSED / FUNCTIONAL BROWSER GATES GREEN / PHONE COMPOSITION CLOSED / 19 FALLBACKS OPEN**

Branch: `screenshot-match-preproduction`  
Live head before this evidence: `54c1e36e7d77ec9be043715c61838e1b1b1cc628`  
Executable fixed head: `ce03757ae7b427a25b7b30e74ee3c4331d3a7a9f`  
Replit/Floot: **untouched**  
`main`: **not merged or modified**


## 2026-09-23 phone-composition closure

**This section supersedes the older phone REWORK dispositions later in this file.** The older screenshots remain historical evidence for why the repair was needed.

Current evidence:

- phone composition repair commit: `b7b93e3309cf2f169e96a52017583c9a53edc63b`
- catalog mobile/accessibility run `35930773595`, job `107416539590`: **PASS**, release-blocking count **0**
- structural visual QA run `35931018688`, job `107417335180`, head `cfa105d10c3a7805a6ff2a537a3a71d37ebfacef`
- structural visual QA artifact `10780754252`, digest `sha256:849ac3b32a79b55fd55f452e3450689cdfb5a00d652b6c30bd0d28d74d37bc8c`
- production build in the structural visual run: **PASS**
- Home 390×844: **PASS** — visible Home actions=13; all >=44px
- Home 320×568: **PASS** — visible Home actions=13; all >=44px
- Quest 390×844: **PASS** — 3 visible answers; all touch/readability safe
- Quest 320×568: **PASS** — 3 visible answers; all touch/readability safe
- desktop Home/Store/Quest geometry: **PASS**
- tablet Home/Store/Quest structural checks: **PASS**
- Store phone two-column layout, navigation, overflow and runtime checks: **PASS**
- the structural visual gate now has exactly **one** release-blocking class: `visible-final-art-fallbacks`, count **19**

Therefore the prior Home `REWORK_MOBILE_HERO_PRIORITY` and Quest `REWORK_PROMPT_ANSWER_PROXIMITY` blockers are **CLOSED** on current phone-composition bytes. Do not spend further art-sprint capacity on those two issues unless their bound CSS/runtime bytes change or a fresh current-head failure reproduces.

Current art/visual critical path is now the 19 visible fallback assets and their generation → provenance → render → independent review → canonical integration chain.

This is Chromium/GitHub-hosted evidence, not physical-device or screen-reader proof. It does not claim exact reference-pixel parity.

## Material disposition

The reproducible Quest real-pointer timeout is **PASS / CLOSED** on the exact fixed runtime. The remaining visual release work is now isolated to:

1. 19 visible generic Store fallbacks.
2. Home phone composition, where Room Progress dominates the initial viewport and pushes the avatar/room hero below the fold.
3. Quest phone composition, where the real prompt is visible but every answer choice is below the initial viewport.

Desktop/tablet Home and Quest composition remains structurally acceptable in this exact run. No physical-device, screen-reader, or final screenshot-parity PASS is claimed.

## Hash binding

Current exact hashes:

- motion runtime Git blob: `3c940e0eec7e490544502947fcf2f3cee71076ea`
- motion runtime test Git blob: `3e091677cd4a2767785e5a513275feacc0913e01`
- motion CSS Git blob: `d8797842f969973f81af2c56ec44d63ea54480ba`
- catalog manifest v33 Git blob: `3ce8dd5d16674ff556764402b712d215d3d22457`
- catalog runtime Git blob: `68dc4944988ee2850e634eb8966613b9663c163c`
- ACTIVE_BATCH schema 21 source: `54c1e36e7d77ec9be043715c61838e1b1b1cc628`

Reuse this evidence only while the relevant runtime, CSS, manifest and screenshot-state hashes remain unchanged.

## Exact-head functional browser evidence

### Persistence and exactly-once safeguards — PASS

Run `35826941176`, job `107070644139`:

- 10 passed / 0 failed
- `quest-retry-rapid-answer-and-final-refresh`: PASS
- `rapid-purchase-exactly-once-and-reload`: PASS
- `multi-tab-same-purchase-replay-exactly-once`: PASS
- equip reload, malformed-import preservation, IndexedDB recovery and final core-progress invariants: PASS
- artifact `10735841372`
- digest `sha256:5aaaba447daab30ff82df517194e15f0188171b42965d942515d10b7984cc3c8`

Root cause was a feedback `MutationObserver` loop: the non-correct Quest path issued no-op `classList.remove` writes for already-absent motion classes, and those writes emitted class mutation records. The fixed runtime guards both removals with `classList.contains` and adds a zero-mutation regression test. Gameplay, answer semantics, learning state, persistence and economy were preserved.

### Catalog mobile/accessibility — PASS

Run `35826941163`, job `107070644050`:

- release-blocking failures: 0
- reduced-motion matrix: 1408×1056, 1024×768, 390×844, 320×568
- normal-motion controls: 1024×768 and 390×844
- active reduced-motion animations: 0
- slow frames over 34 ms: 0/61 at every primary viewport
- overflow, runtime errors, touch targets, two-column phone grids, keyboard focus/activation, semantics, image loading and long-scroll reachability: PASS
- artifact `10735651794`
- digest `sha256:b8986b1c24625a56c0f502f950702db5c892e296c083faad27215ae34d94bbc1`

### Store observer regression — PASS

Run `35826941162`, job `107070644059` passes both source-module and production-preview diagnostics. The historical Store observer/event-loop hang did not return.

## State-specific actual-pixel review

Source artifact:

- run `35826941132`, job `107070644473`
- artifact `10734749455`
- artifact digest `sha256:808d9b62c257b63564382c268922f7837e168c3432eb3c1ae00c813a112a2748`
- exact executable head `ce03757ae7b427a25b7b30e74ee3c4331d3a7a9f`

### Home

- 1408×1056 screenshot SHA-256 `26beb3059160ffe3ce0a4bb909f2627234cedbdf2a6519ab739cb5a4e75ea36b` — **PASS_STRUCTURAL_COMPOSITION**
- 1024×768 screenshot SHA-256 `8b05418d9bd47d8d51e213c68489b3bbedc31e14398e7c625e1a7e6776827686` — **PASS_STRUCTURAL_COMPOSITION**
- 390×844 screenshot SHA-256 `36976a68f3f35c8948a72776c84564912dc691e3974476ebf831c2fe202277a6` — **REWORK_MOBILE_HERO_PRIORITY**
- 320×568 screenshot SHA-256 `62fff6507f1ab78261757d54ee4fb8097e1bf00f41c4255e68dd239f645b4565` — **REWORK_MOBILE_HERO_PRIORITY**

The phone views are usable and scrollable, but Room Progress consumes nearly all of the initial 320px viewport and most of the 390px viewport. The central room/avatar story is pushed below the fold; at 320px only the top of the avatar is visible above the fixed navigation. Repair should reduce/collapse initial progress height or deliberately stage the hero earlier without fabricating state or obscuring actions.

### Quest

- 1408×1056 screenshot SHA-256 `a16d975ee9c5e20b8e6f9045b4a08ba8e277bf744cea90a8d4290f66fa2039bd` — **PASS_STRUCTURAL_COMPOSITION**
- 1024×768 screenshot SHA-256 `8a04244e68b5001cec80874e1af2af1b1aff21942e4848679618ae0d452b127e` — **PASS_STRUCTURAL_COMPOSITION**
- 390×844 screenshot SHA-256 `01e254efa7c22bc9e1c56ad3d1f60e3384ec919a2b7c237acbb5743659720059` — **REWORK_PROMPT_ANSWER_PROXIMITY**
- 320×568 screenshot SHA-256 `edb693fb045ebe12b70be5993d42ac59608995690d3b87ad5fe726e91601e6b9` — **REWORK_PROMPT_ANSWER_PROXIMITY**

The phone views preserve the real prompt, mission scene and Read Aloud control, and downstream answer controls pass touch/readability checks when reached. However, zero answer choices are visible in the initial 390×844 or 320×568 screenshot. The learning prompt and first actionable answer are separated by avatar/phase, mission art and Read Aloud blocks. Repair should tighten phone-only vertical composition while preserving the five-action flow, immediate scoring, read-aloud, clue/retry, correct answer keys, mastery evidence and real earned state.

## Store visual release blocker

The structural visual run correctly remains **FAIL** for exactly one release-blocking class: 19 visible generic fallback-art instances.

Current canonical state:

- manifest version: 33
- canonical/runtime mappings: 173
- final portable: 166/192
- interim: 7
- accepted awaiting canonical: 0
- release-cleared: 0
- runtime mapping gap: 19

Blocked IDs:

- `desks-7` through `desks-12`
- `wall-8` through `wall-12`
- `decor-5` through `decor-12`

`ART_VISUALS_COMPLETE` and final release readiness remain **not evidenced**.

## Routing

- Workstream 15: retain the Quest interaction blocker as closed; keep the 19 fallbacks first on the critical path.
- EXT10 / current Home-Quest visual owner: repair only the two phone composition defects above, preserving the accepted desktop/tablet structure and all gameplay/state semantics.
- Workstream 10: rerun state-specific Home/Quest phone proof only after those visual bytes/CSS materially change; rerun the full release matrix only after a materially new canonical art head or blocker fix.
- Do not reopen the Store observer or Quest pointer investigation unless the bound runtime/CSS hashes change or a fresh current-byte failure reproduces.

## Honest limitations

Evidence is synthetic Playwright/Chromium on GitHub-hosted Ubuntu. No physical iPhone/iPad/Android, VoiceOver, TalkBack or NVDA PASS is claimed. Structural composition PASS is not a claim of exact reference pixel parity.

No canonical mapping, catalog asset, production UI, gameplay, learning, persistence/economy logic, CI/workflow file, deployment state, paid setting, secret or real player data was changed by this evidence update.
