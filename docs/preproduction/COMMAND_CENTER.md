# StarBlox Screenshot-Match Command Center

STATUS: **CATALOG_SPRINT / CURRENT CI GREEN / 47 HASH-BOUND ART REWORKS / TWO PERSISTENCE RELEASE BLOCKERS / NOT READY FOR REPLIT**

Branch: `screenshot-match-preproduction` only  
Observed coordination head: `f1512099a2b9f467ff3e5e4ca985ca649bc3b15d`  
Latest runtime/test-proven head: `7b146f9deb9eb77429150ec104b092167d582859`  
Delivery policy: `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Phase authority: Workstream 15  
Canonical catalog manifest/runtime writer: Workstream 08  
Replit: **untouched**  
Main: **not merged or modified**

The coordination commit after the proven runtime head changes control documentation only. The exact runtime/test claim below remains bound to `7b146f9...`; any later runtime or canonical asset change must earn affected fresh evidence.

## Overall completion

**Estimated coordinated screenshot-match completion: 78%.**

The estimate is deliberately **held**, not increased. Home geometry and CI evidence improved, but the first 47 independently reviewed catalog hashes all require rework, no V2 art hash is accepted/canonically promoted yet, and two persistence/economy source gaps are now classified as release blockers. Scheduling activity, local generations, legacy `final-portable` labels and READY_FOR_REVIEW do not increase completion by themselves.

**READY FOR SINGLE REPLIT INTEGRATION: NO.**

## Current completion matrix

| Area | Completion | Gate state | Current assessment |
| --- | ---: | --- | --- |
| HUD / Shell | **82%** | Implemented / final fidelity pending | Shared HUD/nav stays coherent and current CI is green. Final logo/chrome/focus/reference polish resumes in GAME_FINISHING. |
| Home | **88%** | **Current structural browser geometry PASS** / final fidelity pending | Latest strict browser run clears the six measured desktop Home regions that previously failed. Reference-material/character/scene fidelity still needs final comparison after catalog. |
| Store | **78%** | Implemented / catalog + 4 geometry blockers | Upper Store/grid works; avatar stage is modestly undersized, selected detail too tall, and collection/value lower band remains too low/narrow. Catalog art is still the dominant blocker. |
| Quest | **88%** | Implemented / 6 geometry blockers | Learning behavior remains green; header, phase strip, avatar/body/mastery and earned-summary geometry still miss measured contracts. |
| Avatar / Buddy | **80%** | Implemented / catalog + try-on fidelity pending | Saved IDs/Buddy state remain protected. Companion/aura review and final layered equipment fidelity remain incomplete. |
| Progression | **90%** | Automated state gate PASS / final render pending | Five canonical room tiers, Dream Goal, Daily/mastery and ownership-bound progress remain intact. |
| Catalog Art | **52% legacy canonical labels; 0/47 current-hash reviews accepted** | **Primary visual blocker** | Manifest still has 99 legacy `final-portable` labels and 23 interim entries. 82 assigned IDs are repository-staged plus 3 desks generated locally; first reviewed families Tops, Seating, Auras and Lighting are 47/47 REWORK. |
| Environments | **82%** | Structurally implemented / fidelity+perf pending | Home/learning/Store scenes exist; final dimensional materials, room-tier scenes, crops and performance remain GAME_FINISHING work. |
| Mobile / Accessibility | **86%** | CI/browser-emulation improved / device proof pending | Store focus-tray fixes and tests are in; full CI is green. Existing canonical Store emulation is strong, while physical-device and screen-reader evidence remains unproven. |
| Motion / Game Feel | **84%** | Automated helpers PASS / real perf pending | Bounded/reduced-motion helpers remain green; actual phone/tablet normal/reduced-motion paint/composite proof remains later work. |
| Learning Integrity | **96%** | **Automated PASS** | Current full CI preserves 200 validated questions, five-action Quest, source/evidence guards and retry/mastery policy; no catalog-induced learning P0 is recorded. |
| Persistence / Economy | **88%** | IndexedDB race fixed / **2 release blockers open** | Hydration recovery regression is fixed and tested. Durable purchase idempotency and refresh-safe final Quest completion/reward semantics remain unresolved. |
| QA / Release | **63%** | CI green / visual and live gates fail | All four V2 review shards now exist, staged-art review is real, and strict visual QA identifies 10 remaining screen geometry blockers. Catalog acceptance, live persistence, device/accessibility and final reference gates remain open. |

## Current catalog accounting

Canonical manifest remains v12:

- target IDs: **192**;
- legacy canonical `final-portable`: **99**;
- canonical interim-not-verified: **23**;
- canonical manifest/runtime mappings: **122**;
- recorded duplicate manifest paths: **0**;
- V2 current-hash canonical promotions: **0**.

Production/staging accounting is intentionally separate:

- repository-staged assigned candidates: **82**;
- desks generated locally: **3** (`desks-2..4`), not yet repository-staged;
- assigned IDs with any repository/local candidate: **85**;
- desks without any current candidate: **8** (`desks-5..12`).

A supported binary GitHub import/readback path is now proven by Workstream 08. Workstream 03 is directed to use that path from its own run to upload its already-generated `desks-2..4` bytes without regeneration, then continue `desks-5..12`.

## Independent visual review status

All four V2 review shards now exist. Current exact-hash coverage:

- independently reviewed: **47 / 192**;
- ACCEPT: **0**;
- REWORK: **47**;
- BLOCKED: **0**;
- unreviewed: **145**.

Reviewed families and findings:

1. **Tops 1–12 — 12 REWORK:** readable identities but flat frontal/vector garments with inadequate fabric volume, construction, three-quarter collectible depth and tier spectacle.
2. **Seating 2–12 — 11 REWORK:** distinct/readable objects but insufficient dimensional materials, perspective, themed construction and premium collectible depth.
3. **Auras 1–12 — 12 REWORK:** weak card-scale contrast/theme identity and flat vector effect treatment; insufficient dimensional glow/particle richness.
4. **Lighting 1–12 — 12 REWORK:** coherent but shared pastel flat-vector treatment, shallow materials and inadequate three-quarter dimensional lighting presentation.

These findings invalidate any assumption that a legacy `final-portable` or interim label equals screenshot-quality acceptance. No currently reviewed hash is eligible for Workstream 08 promotion.

### Repair routing recorded in sprint state

The existing exclusive production assignments remain intact. Exact secondary repair routing is now explicit:

- **CHAT:** Seating 2–12;
- **04:** Lighting 1–12;
- **11:** Auras 1–12;
- **07:** Tops 1–6 after its staged Rugs lane has no immediate producer action;
- **09:** Tops 7–12 after its staged Decor lane has no immediate producer action.

Reviewer 01 remains independent for Tops, so 07/09 can repair without self-approval. Every replacement must preserve its old version and receive a fresh exact-hash review. Reviewer 14 should continue Wall/Rugs/Decor; reviewer 01 Bottoms/Headwear/Facegear; reviewer 02 Shoes/Backgear/Handgear; reviewer 05 Beds/companions and desks as they become stored.

## Persistence/economy priority

Workstream 13 produced the previously missing catalog persistence report and fixed a real IndexedDB hydration race: a default render could mask a recoverable IndexedDB backup before async hydration. The fix is regression-covered.

Two remaining source gaps are now explicit **release blockers and take priority over catalog throughput when shared App changes are required**:

1. **PERSIST-TRANSACTION-IDEMPOTENCY** — purchase eligibility is checked outside the functional state transition, while the update itself does not revalidate current ownership/currency or record a durable transaction receipt. Existing UI click guards protect ordinary rapid taps but do not prove exactly-once behavior under replay/concurrency.
2. **PERSIST-QUEST-COMPLETION-REFRESH** — the final correct answer waits about 950ms before `finishQuest` persists the completion reward/progress. Refresh during that interval can lose the completion record/reward because the in-progress Quest UI state is not durable.

Workstream 15 owns coordination of the shared App transaction wiring; 13 owns durable/additive semantics and regression/browser evidence. The fix must preserve existing balances, ownership, rewards, five-action learning behavior and backward-compatible saves.

## Current automated integration gate

GitHub Actions run `35648728446` on exact head `7b146f9deb9eb77429150ec104b092167d582859` completed successfully:

- dependency install: **PASS**;
- test files: **20/20 PASS**;
- tests: **87/87 PASS**;
- Vite production build: **PASS**;
- modules transformed: **1,612**;
- CSS: **167.39 kB / 35.69 kB gzip**;
- JS: **301.85 kB / 92.57 kB gzip**.

This includes the IndexedDB hydration regression and Store focus-tray accessibility tests. It does **not** close the two source-level persistence blockers above because the relevant durable transaction/completion behavior is not yet implemented/tested.

## Latest structural browser gate

Strict Playwright visual QA run `35648728457` built and rendered head `7b146f9...`. The workflow conclusion is FAIL because the visual gate correctly found **10 release-blocking geometry mismatches**, not because the app crashed or failed to build.

### Home — current structural gate PASS

The six measured desktop Home regions now pass their configured geometry contracts. Across tested screens/viewports, mount, primary navigation, phone touch targets and horizontal-overflow/runtime-error checks also remain healthy. This clears the historical three Home geometry blockers; final screenshot/reference fidelity still remains.

### Store — 4 structural blockers

- avatar try-on stage: **360×455px**, target about **378×470px**;
- selected-item detail: **261px high**, target **212px ±6.4**;
- collection strip begins around **x178 / y1046.4**, far below/narrower than the intended lower band around **x10 / y832**;
- value panel begins around **y1046.4**, versus target near **850px**.

### Quest — 6 structural blockers

- header: **83px**, target **71px ±6**;
- phase strip: **y168px**, target **153px ±14**;
- avatar zone remains offset/undersized;
- learning body remains too low/short;
- mastery rail remains too narrow/tall;
- earned summary remains far too wide and too low.

These screen-layout blockers are not prerequisites for switching out of CATALOG_SPRINT, but must be fixed in GAME_FINISHING before release readiness.

## Mobile/accessibility evidence

Existing Workstream 10 canonical Store browser emulation has zero release-blocking failures across all 16 collections at desktop 1408×1056, phone 390×844 and 320×568 for navigation, overflow, touch targets, card states, semantics, image loading/dimensions, focus visibility, keyboard activation, two-column phone layout, long scrolling and layout stability. Subsequent focus-tray runtime/test changes are covered by the successful 87-test CI/build above.

Physical iPhone/iPad/Android performance and VoiceOver/TalkBack/NVDA remain **NOT TESTED**. Headless evidence must not be described as physical-device or screen-reader proof.

## Protected invariants

Every subsequent change must preserve:

- all **192** permanent stable Store IDs, prices and unlock rules;
- Coins, XP, Mastery Stars, Star Worth/Home progress, owned/equipped IDs, room placement, Dream Goal, mastery/evidence, Buddy/Bond and valid daily state;
- exactly five default Quest learning actions;
- source-bounded Grade-2 content and one defensible correct answer;
- independent versus clue/retry evidence separation;
- no wrong-answer currency/progress loss or reward farming;
- unknown/no-art owned IDs surviving saves/imports/recovery;
- no public child chat/profiles, stranger discovery, ads, loot boxes, FOMO or punitive streaks;
- original StarBlox art only: no Roblox/Brookhaven or third-party branded/character assets.

## Next critical-path sequence

1. **15 + 13 — persistence release blockers:** implement and regression-test durable purchase idempotency and refresh-safe final Quest completion/reward behavior without changing user balances/prices/reward amounts.
2. **03 — desks:** stage existing generated `desks-2..4` through the proven binary path, read back hashes, then continue `desks-5..12` in bounded premium batches.
3. **CHAT / 04 / 11 / 07 / 09 — reviewed art repairs:** repair the exact rejected versions above in bounded batches; never overwrite history or self-approve.
4. **01 / 02 / 05 / 14 — parallel reviews:** continue their disjoint partitions while prioritizing replacement hashes as soon as they are READY_FOR_REVIEW.
5. **08 — incremental integration:** consume every independently ACCEPTed current hash immediately after metadata/file/content checks; do not wait for all 192 or old monolithic rollups.
6. **10 / 12 / 13 / 14 — change-aware gates:** rerun only affected checks per integration and full milestone gates at coherent catalog points.
7. **15 — catalog completion gate:** switch to GAME_FINISHING only after all 192 current hashes are correct/stored/unique/accepted, canonical wiring/build/Store checks pass, and no catalog-induced learning/save/economy P0 remains.

## Catalog gate and final release

`catalogGate.status` remains **NOT_STARTED** because there are currently zero V2 accepted hashes and unresolved art reworks. Phase therefore remains **CATALOG_SPRINT**.

After the 192-item catalog gate passes, the same specialists automatically return to normal roles. GAME_FINISHING will address the remaining Store/Quest geometry, actual avatar equipment/try-on, environment/room-tier/logo quality, motion, mobile/accessibility, live persistence/reward stress, semantic learning and final reference/performance checks.

Only after a frozen final candidate passes full clean regression/build plus real browser/reference/safety/accessibility/performance/persistence gates may this document change to **READY FOR SINGLE REPLIT INTEGRATION: YES**. That status is still **not deployment permission**. Replit and `main` remain untouched until separate user approval.
