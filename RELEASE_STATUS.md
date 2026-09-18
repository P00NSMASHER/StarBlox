# StarBlox Release Status

Last integration/release pass: 2026-09-18 (America/New_York), automation cycle 3.

Canonical implementation target: private GitHub repository `P00NSMASHER/StarBlox` on `main`, with Replit app `StarBlox` (`821e329b-9d6b-4bc9-940d-b18a07aaa463`) as the target runtime. Floot is legacy reference only.

Canonical visual contract: `VISUAL_NORTH_STAR.md`.

Code-under-test for this pass: `22bbd3399154476c6c1305a9add0107df5588375`. The final status-ledger commit is documentation-only and is not substituted for the code-under-test SHA.

## Gate status

| Gate | Status | Evidence |
| --- | --- | --- |
| Dependency install | PASS | GitHub CI uses Node 22, runs `npm install --no-audit --no-fund`, then tests and a Vite production build. The most recent completed code CI before the final ledger update is green; the semantic-guard head is also covered by the same workflow and must remain green before release. |
| Automated tests | PASS on last completed code run / final semantic-guard CI pending at ledger write | Core tests cover the 200-question bank, 192-item catalog, 5-action selector, key/choice invariants, hardened high-risk question families, Home runtime regressions, and the rapid purchase guard. New semantic-family tests cover all 20 `hfw-cloze-*` and all 12 `context-*` items. |
| Production build | PASS on last completed code run / final semantic-guard CI pending at ledger write | The Vite production build passed after the Quest/Home/art specialist integrations and duplicate-purchase guard. The latest semantic-guard imports are being checked by the same CI workflow. |
| Import/file-path integrity | PASS on last completed code run / final semantic-guard CI pending | Main imports catalog art, Headwear/Facegear avatar wiring, question hardening, semantic guards, purchase guard, Home/Quest enhancement runtimes and their styles. |
| Question-bank structural invariants | PASS | Tests require exactly 200 questions, 200 unique IDs, non-empty unique choices, and exactly one keyed answer present in each choice set. |
| 5-action Quest selection | PASS | Automated test requires exactly five distinct adaptive actions and at least one transfer item. Correct responses auto-advance; retries do not count as independent evidence. |
| Question semantic QA | PASS WITH FIX for audited high-risk families | This cycle found a real multiple-defensible-answer risk in the generated HFW cloze family (`help`: the old sentence could also accept `see`) plus weaker same-vowel spelling-context ambiguity. All 20 HFW cloze and all 12 spelling-context items now use reviewed, narrowed semantic prompts/choice sets with dedicated regression coverage. Previous HFW-use/story/Religion high-risk families remain hardened. Ongoing human audit is still required whenever generators/source mappings change. |
| Store structural invariants | PASS | Automated test requires exactly 192 items, 192 unique IDs, positive prices, and non-negative Star requirements. |
| Wrong-answer reward farming | PASS (static) | First wrong attempt can receive the intentional learning reward; subsequent wrong retry attempts add 0 Coins/XP. Runtime abuse testing remains NOT TESTED. |
| Rapid duplicate purchase protection | PASS WITH FIX for the normal UI path / NOT TESTED under runtime stress | A stale-render rapid-double-click window existed because purchase eligibility was checked before the functional state update. This cycle added an imported capture-phase `Buy Forever` guard with a 1.2s duplicate window plus direct event-interception regression coverage. Browser stress/concurrency remains NOT TESTED. |
| Buy/equip/place/Dream Goal state | PASS (static) | Permanent ownership, equip/place state, Star Worth, room placement and Dream Goal all share persisted state keyed by stable item IDs. Runtime refresh/recovery remains NOT TESTED. |
| Home / Avatar / Buddy state consistency | PASS WITH FIX (static) | Previous integration fixes made Home enhancement fingerprints/accessory decoration idempotent. Headwear and Face & Glasses art are now mapped to exact equipped IDs. Base player body remains visually unfinished but state wiring is coherent. |
| Persistence safety | PASS WITH FIX (static) | Save v2 persists to localStorage and IndexedDB and preserves an IndexedDB-only backup during initial hydration. Browser recovery and cross-refresh interaction remain NOT TESTED. |
| Critical touch targets | PASS (static) | Critical Store controls have >=44px release overrides; nav, Read Aloud and answer controls meet the same baseline in source styling. |
| Reduced motion | PASS (static) | Global and Quest-specific reduced-motion rules are present. Rendered verification remains NOT TESTED. |
| Narrow mobile layout | PASS (static) / NOT TESTED (rendered) | Core and Quest CSS include <=900px and <=560px reflow rules, single-column Quest answers, bottom navigation and mobile Quest rail/layout changes. Actual 320px/390px rendering has not been observed. |
| Catalog manifest uniqueness | PASS (static) | Manifest v6 records 53 final portable assets with `duplicateAssetPaths: []` and exact stable item-ID mappings. |
| Catalog portable-path integrity | PASS for completed set | All completed entries use repo-local `/assets/catalog/...` paths. Runtime catalog mapping includes the same completed categories. |
| Catalog completion | FAIL — P1 visual blocker | 53/192 final portable thumbnails are complete; 139 remain. Finished: all Tops, all Bottoms, Sneakers + Slip-Ons, all Headwear, all Face & Glasses, Sprout Pup, Starter Bed and Tiny Homework Desk. Fallback initials remain below the North Star. |
| README/status accuracy | PASS WITH FIX | README was refreshed this cycle to GitHub/Replit canonical ownership, the illustrated Quest state, duplicate-purchase guard and current 53/192 art count. |
| False online/social claims | PASS (static) | Current source does not expose public child profiles/chat or claim real multiplayer/social state. |
| Replit runtime / preview | BLOCKED | Read-only Replit Agent smoke inspection timed out again. Startup, actual Home/Quest/Market render, runtime persistence, rapid-purchase interaction and phone behavior therefore remain unverified. |
| Replit publication | NOT TESTED / not deployed | Replit reports `found:false` for this repl's publication status. No publish is claimed. |

## Visual fidelity

The North Star fails simple CSS avatar geometry, initials as final item art, generic SaaS controls/cards, sparse gradient-only scenes, emoji placeholders, and unillustrated Home/Quest/Store presentation. Static source improvements are not treated as rendered PASS without runtime visual evidence.

| Area | Status | Fidelity evidence / remaining gap |
| --- | --- | --- |
| Home | FAIL — P1 visual blocker, substantial progress | Illustrated five-tier room scenes, room progression, Dream Goal, Daily Quests, Customize tray, Today I'm Learning, physical Sprout Pup, cobalt/cyan glass chrome and gold accents are present. Headwear and Face & Glasses now use exact finished art. Remaining blocker: the core player body is still CSS geometry and unfinished owned items can fall back to initials. Actual rendered composition is NOT TESTED. |
| Store | FAIL — P1 visual blocker | Functional 192-item catalog and 53 finished thumbnails are present, but the screen still centers on a card grid plus text filter rows. The approved large selected-item/right-side character preview and rich item-detail experience are absent; 139 items still lack final art. |
| Quest | FAIL — P1 pending rendered proof, major source-level improvement | Specialist work now supplies an illustrated environment, large original guide avatar + physical buddy, Diagnose/Practice/Review/Transfer strip, illustrated lesson card, stacked A/B/C answers, hint/why feedback, mastery/Today’s Learning rail and earned bar with phone reflow. It still reuses a Home room backdrop instead of a purpose-built learning-room scene, and Replit rendering could not be inspected; therefore it is not promoted to PASS. |
| Avatar / Buddy | FAIL — P1 visual blocker | Quest has a substantive original illustrated guide + buddy and Sprout Pup has portable art. Gameplay Avatar remains CSS geometry; Headwear and Face & Glasses are now real exact-ID art overlays, but top/bottom/shoes/back/hand/aura correspondence is still largely CSS/symbolic. |
| Catalog Art | FAIL — P1 visual blocker | 53/192 final portable thumbnails are complete and unique; 139 remain. The completed set is repo-owned and exact-ID mapped. |
| HUD / Nav / Logo | FAIL — P1 visual blocker | Coins/Stars/XP/Mastery HUD and left nav use cobalt/cyan tactile chrome and clear child-sized controls. The StarBlox mark remains styled text and nav uses standard icon treatment rather than fully illustrated premium game chrome. |
| Mobile | NOT TESTED (rendered) | Static responsive rules are substantially improved, including dedicated Quest reflow. Text clipping, density and touch behavior at actual 320px/390px Replit viewports remain unverified. |

## Integration and QA work in this cycle

1. Re-read `VISUAL_NORTH_STAR.md` and latest `main` before integration, then preserved specialist improvements rather than rolling them back.
2. Integrated/verified the specialist Quest composition, question hardening, complete Bottoms/Headwear/Face & Glasses art batches and exact avatar Headwear/Facegear mapping.
3. Found a release-blocking rapid-purchase risk in the normal Store UI path and added a narrow capture-phase duplicate `Buy Forever` guard without redesigning Store behavior.
4. Added unit coverage for guard timing plus a jsdom interaction regression proving the second rapid Buy Forever click does not reach the purchase handler.
5. Continued the question red team and found a real semantic ambiguity in `hfw-cloze-help`, plus weaker risks in automatically generated spelling context choices. Rebuilt all 20 HFW cloze and all 12 spelling-context items with curated semantic cues/choices and added family regressions.
6. Updated `QUESTION_QA_LEDGER.md` and README to match the actual current implementation rather than stale earlier state.
7. Attempted a Replit runtime smoke check; it timed out, so runtime/rendered gates remain BLOCKED/NOT TESTED rather than being guessed.

## Release blockers / unverified gates

1. **BLOCKED — Replit runtime:** startup and actual Home/Quest/Market rendering cannot be called PASS until the target Replit runtime can be inspected.
2. **FAIL — Store visual fidelity:** missing selected-item/character detail composition and 139 finished item thumbnails.
3. **FAIL — Avatar visual fidelity:** core player remains CSS geometry even though Headwear/Facegear wiring improved substantially.
4. **FAIL — Home visual fidelity:** illustrated environment is strong, but CSS avatar and fallback item treatment remain below the approved reference bar.
5. **FAIL / pending proof — Quest visual fidelity:** source now closely follows the requested composition, but purpose-built learning-room art and rendered proof remain missing.
6. **NOT TESTED — rendered mobile:** actual 320px/390px Home/Store/Quest behavior is unobserved.
7. **NOT TESTED — runtime persistence/reward stress:** IndexedDB recovery, rapid purchase stress and retry interaction need real browser execution.
8. **FAIL — catalog completion:** 139 item-specific final thumbnails remain.

## Highest-priority next action

**Render/smoke-test the new Quest composition in the target Replit runtime at desktop and 390px/320px widths, then fix only the concrete visual/layout defects revealed.** Quest is now structurally close to the approved reference in source, so observed runtime fidelity is the highest-value next gate before shifting primary visual effort to the Store selected-item/detail composition.
