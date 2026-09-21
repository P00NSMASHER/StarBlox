# StarBlox Screenshot-Match Command Center

STATUS: **INTEGRATED PREPRODUCTION / AUTOMATED GATE GREEN / NOT READY FOR REPLIT**

Branch: `screenshot-match-preproduction` only
Last runtime-affecting source head with full green CI: `583872b4083cd8d28b312da3c5c567eb9ce72b13`
GitHub Actions: run `35627020800`, job `106423763469`
Replit: **untouched**
Main: **not merged or modified**

> Documentation-only Command Center/QA commits may sit after the verified source head. The runtime/test claim is tied explicitly to `583872b...`; any later runtime-affecting change must earn a new full green gate before release.

## Overall completion

**Estimated coordinated screenshot-match completion: 78%.**

This estimate gives full credit to the now-green automated integration gate, but deliberately withholds substantial credit for work that cannot be proven statically: rendered screenshot fidelity, real-device/browser accessibility, live persistence timing, motion/environment performance, and the unfinished catalog-art set.

**READY FOR SINGLE REPLIT INTEGRATION: NO.**

## Completion matrix

| Area | Completion | Gate state | Command Center assessment |
| --- | ---: | --- | --- |
| HUD / Shell | **82%** | Implemented / render QA pending | Shared floating HUD, five-item navigation, responsive dock and shell tokens are integrated. Needs actual viewport proof and final logo/chrome fidelity review. |
| Home | **84%** | Implemented / render QA pending | Reference composition, real-state Dream Goal/Daily/learning widgets and environment staging are integrated. Needs screenshot comparison and density/overlap proof. |
| Store | **78%** | Implemented / catalog + render blocked | Six-column reference hierarchy, selected-item rail, try-on stage, detail actions and permanent collection framing are integrated. Catalog coverage remains the dominant visual dependency. |
| Quest | **88%** | Implemented / render QA pending | Reference hierarchy, light reading surface, five-action contract, mastery rail and reward-safe presentation are integrated. Learning/regression tests pass; rendered viewport proof remains. |
| Avatar / Buddy | **80%** | Implemented / render QA pending | Exact saved IDs are preserved and original StarBlox character/buddy presentation is integrated. Per-equipment crop/proportion proof remains. |
| Progression | **90%** | Automated state gate PASS / render pending | Five canonical room tiers, Dream Goal, Daily Quests, mastery and collection widgets remain bound to real state. Automated invariants pass. |
| Catalog Art | **52%** | **Visual blocker** | 99/192 final-portable; 93 remain. 23 Aura/companion assets remain interim-not-verified. Zero duplicate paths. |
| Environments | **82%** | Implemented / render+perf pending | Original Brightside bedroom, learning room and boutique are integrated. Crop/readability/performance need browser proof. |
| Mobile / Accessibility | **84%** | Static+automated PASS / browser pending | Responsive containment, touch sizing, semantics, reduced-motion safety and mobile reflow are implemented. Real keyboard/screen-reader/contrast/overflow proof remains. |
| Motion / Game Feel | **84%** | Automated helper PASS / browser perf pending | Premium micro-motion, selection/equip feedback, Quest celebration and reduced-motion equivalents are integrated. Real-device paint/composite proof remains. |
| Learning Integrity | **96%** | **Automated PASS** | 200-question hardened bank, one keyed answer, audited semantic families, deterministic five-action Quest and retry/mastery evidence policy pass the consolidated suite. Browser legibility remains. |
| Persistence / Economy | **90%** | Automated PASS / live stress pending | Recovery, unknown/no-art ownership preservation and rapid purchase/room/Quest guards pass. IndexedDB/re-entry and completion timing still need live browser stress. |
| QA / Release | **55%** | Automated gate PASS / visual+live gates blocked | Full suite/build now pass; rendered screenshot QA, live persistence, real accessibility and performance gates remain. |

## Automated integration gate

On exact runtime source head `583872b4083cd8d28b312da3c5c567eb9ce72b13`:

- dependency install: **PASS**;
- Vitest: **18/18 files, 81/81 tests PASS**;
- Vite production build: **PASS**;
- **1,611 modules transformed**;
- output: CSS 164.29 kB / 35.15 kB gzip; JS 299.66 kB / 91.88 kB gzip.

The suite covers the hardened learning bank, deterministic Quest selection, reward/evidence rules, persistence recovery, rapid duplicate-action guards, 192-item Store invariant, catalog manifest integrity, avatar/buddy state preservation, progression, accessibility helpers, motion helpers, and Home/Store/Quest DOM idempotence.

## Integration conflicts resolved this cycle

1. **Store runtime browser API conflict** — removed the assumption that `CSS.escape` is always present and added a safe fallback. Also made queued Store scans safe after DOM teardown.
2. **Mobile accessibility queued-scan conflict** — guarded asynchronous rescans after DOM teardown.
3. **Quest MutationObserver self-trigger loop** — stopped redundant class writes that retriggered the observer indefinitely. This was the cause of the coordinated CI timeout; the fixed branch now completes all tests and build successfully.
4. **Test-only shim rejected** — a temporary global jsdom setup was removed instead of masking production-runtime defects. The final green gate is achieved by hardening the actual runtimes.

## Shared design-system authority

`docs/preproduction/DESIGN_SYSTEM_CONTRACT.md` is the measurable visual contract. `src/shellChrome.css` is the runtime authority for shared shell tokens including navy/blue/cyan/gold/pink/lilac/green values, chrome radii, bevel/glow language and shell geometry.

Command Center rules for subsequent work:

- screen CSS may define screen-specific geometry, but should consume the shared visual language rather than create another shell palette;
- the wide-desktop reference remains 1408×1056 first, then deliberate 1024/tablet/390/320 reflow;
- Home, Store and Quest may tune their own content envelopes but must not reposition the global HUD/nav independently;
- Avatar/Buddy appearance should stay centralized in `avatarBuddy.css`; screen builders should tune stage/container geometry rather than fork anatomy/equipment styling;
- Store detail actions must continue to proxy the existing purchase/equip/place/Dream Goal paths rather than duplicate economy logic;
- catalog artwork must attach by stable item ID only; missing art must never change ownership/equipment/room/Dream Goal state.

## CSS/runtime consolidation decision

The branch still contains older presentation layers beneath the final screenshot-match layers, especially around Quest/Home. The Command Center is **not deleting legacy CSS blindly before rendered proof**. The current import order is coherent and the automated gate is green; premature removal could create unmeasured regressions.

Consolidation policy:

1. treat `shellChrome.css` + the measurable design contract as shared-token authority;
2. treat each final screenshot-match stylesheet as the screen-specific override authority;
3. use rendered comparison to identify actual dead/conflicting rules;
4. remove or merge only rules proven redundant by browser evidence;
5. rerun the entire automated gate after every runtime-affecting cleanup.

This is deliberate risk reduction, not deferred ownership: duplicate visual rules are now bounded by explicit authority and will be cleaned from measured evidence rather than guesswork.

## Protected learning contract

The following are release invariants and must survive every visual integration:

- production bank remains 200 unique structurally valid questions;
- exactly one defensible keyed answer per three-choice item;
- source/provenance remains non-empty and source-bounded;
- default Quest remains exactly five distinct deterministic adaptive actions;
- clue-assisted success never becomes independent mastery or transfer evidence;
- repeated wrong retries never farm rewards;
- wrong answers never remove Coins, Stars, ownership or persistent progress;
- question-quality → semantic guard → diagnostic guard must load before React Quest rendering;
- visual/accessibility runtimes may decorate but must not rewrite keys, choices, source mapping, mastery eligibility or scoring semantics.

Current automated status: **PASS**.

## Protected persistence/economy contract

The following must never be reset or silently pruned by screenshot work:

Coins, XP, Mastery Stars, Star Worth/Home progress, permanent owned IDs, equipped gear, room placement, Dream Goal, mastery/evidence, Buddy/Bond, district progress and valid daily state.

Current automated coverage confirms:

- corrupted snapshots recover additively;
- unknown/no-art IDs remain owned rather than being filtered by current art availability;
- Buy Forever duplicate clicks are guarded across rerender;
- Place/Put Away double taps are guarded;
- Quest answer double taps are guarded;
- valid state round-trips through persistence/import-export tests.

Live browser timing/re-entry remains a release gate rather than being inferred from unit tests.

## Art inventory accounting

### Catalog

Current manifest v12:

- target: **192**;
- final-portable: **99**;
- remaining: **93**;
- final coverage: **51.56%**;
- interim-not-verified: **23** — all 12 Aura assets plus companions 2–12;
- duplicate paths: **0**.

The unfinished 93 items are explicitly accounted for, but the Store does not yet meet release-quality final-art coverage. Continue item-specific exact-ID batches; do not promote interim artwork without visual inspection.

### Environments

Implemented original reference-scale primary scenes:

- Brightside bedroom — Home;
- Brightside learning room — Quest/Study;
- Brightside boutique — Store.

No primary environment scene is missing structurally. Remaining environment work is rendered crop/readability/performance correction if browser QA exposes gaps.

## Historical RELEASE_STATUS.md note

`RELEASE_STATUS.md` reflects the older 2026-09-18 authoritative Replit/main cycle and is intentionally treated as historical baseline evidence for this preproduction branch. Its older catalog counts and visual failures do not override newer branch implementation/test evidence. Its core rule still applies: **static implementation is not rendered visual proof**.

## Release blockers

The project stays **NOT READY** until all of these are cleared:

1. **Rendered visual proof:** Home, Store and Quest at 1408×1056, 1024 landscape/tablet, 390 px and 320 px, compared against the approved references. Fix measured geometry, overflow, hierarchy, crop and fidelity defects only.
2. **Catalog release decision:** finish the remaining 93 final assets or explicitly approve a release set whose visible primary surfaces have final artwork; visually inspect the 23 interim Aura/companion assets before promotion.
3. **Live persistence/economy stress:** rapid buy/rerender, room double toggle, Quest double answer, refresh/re-entry around purchase/equip/place/completion, IndexedDB fallback, malformed import and no-art owned-ID survival.
4. **Real browser accessibility:** keyboard traversal, focus clipping, screen-reader smoke, measured contrast, no page-level horizontal overflow and fixed-HUD/dock clearance across target widths.
5. **Motion/environment performance:** reduced-motion browser proof plus phone/tablet paint/composite sanity check.
6. **Final Command Center pass:** rerun full tests/build after any runtime-affecting visual fixes, then update Workstream 14 and this file with the exact final source head and release decision.

## Next integration sequence

1. Keep Replit and `main` untouched.
2. Continue catalog art in controlled exact-ID batches while visual QA obtains executable browser proof.
3. Run screenshot comparison in the order **Quest → Home → Store** so the learning-critical screen clears first and Store can benefit from continued catalog completion during the earlier passes.
4. Perform live persistence/accessibility/performance stress on the same consolidated branch after visual corrections.
5. Rerun the entire CI gate.
6. Only when every blocker above is PASS may this file change to **READY FOR SINGLE REPLIT INTEGRATION: YES**.
