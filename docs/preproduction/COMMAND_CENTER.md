# StarBlox Screenshot-Match Command Center

STATUS: **CATALOG_SPRINT / RUNTIME CI GREEN / CATALOG REVIEW-INTEGRATION BOTTLENECK / NOT READY FOR REPLIT**

Branch: `screenshot-match-preproduction` only  
Observed branch head: `9b2ec2accb67f8627d7e1257d1b14746016c803a`  
Latest runtime-affecting CI-proven head: `f654431b2bb76d2eceb322dd35c613dfad17e7ae`  
Delivery policy: `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Phase authority: Workstream 15  
Canonical catalog manifest/runtime writer: Workstream 08  
Replit: **untouched**  
Main: **not merged or modified**

> The five commits after `f654431...` are documentation/coordination/QA-report changes only. Git comparison shows no runtime or catalog-asset change after that proven runtime head, so the existing CI proof remains applicable until a runtime/asset integration occurs.

## Overall completion

**Estimated coordinated screenshot-match completion: 78%.**

This is intentionally held rather than increased from scheduling activity or newly staged-but-unreviewed art. Production candidates, independent visual acceptance, canonical wiring and release clearance are separate states.

**READY FOR SINGLE REPLIT INTEGRATION: NO.**

## Current completion matrix

| Area | Completion | Gate state | Current assessment |
| --- | ---: | --- | --- |
| HUD / Shell | **82%** | Implemented / final render QA pending | Shared HUD/nav is integrated; final logo/chrome/focus/viewport fidelity belongs to GAME_FINISHING. |
| Home | **84%** | Implemented / geometry fixes deferred | Latest whole-game QA previously measured three Home geometry failures; remeasure after catalog switch before fixing. |
| Store | **78%** | Implemented / catalog critical path | Store structure and mobile browsing work; final visual completeness depends on accepted catalog art and later lower-band/detail geometry fixes. |
| Quest | **88%** | Implemented / geometry fixes deferred | Learning flow is coherent and automated learning gates are green; six prior geometry failures require remeasurement in GAME_FINISHING. |
| Avatar / Buddy | **80%** | Implemented / final equipment fidelity pending | Saved IDs/Buddy state preserved. Companion/aura visual acceptance is still catalog work; true layered try-on fidelity remains later work. |
| Progression | **90%** | Automated state gate PASS / render pending | Five tiers, Dream Goal, Daily/mastery widgets remain real-state bound. |
| Catalog Art | **52% canonical final / 82 candidates reported outside canonical final set** | **Primary blocker** | Manifest remains 99/192 final-portable plus 23 interim-not-verified. Seven production handoffs now report 82 assigned candidates; desks-2..12 still have no lane-03 handoff. No V2 review shard exists yet, so these candidates are not independently accepted. |
| Environments | **82%** | Structurally implemented / fidelity+perf pending | Home learning/store scenes exist; final crop/material/depth/room-tier proof is GAME_FINISHING work. |
| Mobile / Accessibility | **84%** | Catalog browser-emulation gate PASS on audited hashes | Workstream 10 reports zero release-blocking failures for the current canonical Store at desktop/390/320 emulation. Physical device and screen-reader evidence remain untested. |
| Motion / Game Feel | **84%** | Automated helper PASS / real perf pending | Runtime motion remains intact; real normal/reduced-motion paint/composite proof is later release work. |
| Learning Integrity | **96%** | **PASS on runtime head `f654431...`** | 20/20 test files, 85/85 tests and production build passed; no catalog-induced learning P0 found. Semantic/source integrity remains protected. |
| Persistence / Economy | **90%** | Automated baseline green / catalog-specific browser report missing | Existing automated recovery and duplicate-action guards are green, but `catalog-sprint/persistence-qa.json` is not yet present and live refresh/re-entry/IndexedDB timing remains required. |
| QA / Release | **58%** | CI green / visual acceptance system starting | Existing whole-game Playwright geometry evidence is useful, but V2 staged-asset review shards/fixture and final catalog release QA are not yet complete. |

## Current catalog accounting

Canonical manifest is still v12:

- target IDs: **192**;
- canonical `final-portable`: **99**;
- canonical interim-not-verified: **23**;
- canonical non-final relative to final-portable labels: **93**;
- duplicate manifest paths recorded: **0**.

Current production handoffs observed outside the canonical final count:

- CHAT seating: **11** candidates;
- 04 lighting: **12** candidates;
- 05 wall: **12** candidates;
- 06 companions: **11** existing interim candidates;
- 07 rugs: **12** candidates;
- 09 room decor: **12** candidates;
- 11 auras: **12** existing interim candidates.

Total with current lane handoffs: **82 candidate IDs**. This is a production/staging count, not an acceptance or final count. `lane-03.json` for desks-2..12 is still absent at this head, leaving **11 assigned IDs without a current production handoff**.

The old Workstream 08 `integration.json` snapshot reports only 46 candidates and four lanes because it predates the 07/09/11 handoffs. It is stale as a current total and must be refreshed by Workstream 08 after V2 review decisions arrive.

## Review and integration critical path

V2 deliberately removes the old monolithic-review deadlock. Current state at this head:

- review partition directory/shards: **not yet present**;
- qualified V2 exact-hash independent ACCEPT decisions: **0 recorded**;
- canonical integrations based on V2 accepts: **0**;
- catalog gate: **NOT_STARTED**.

Next owner/action sequence:

1. **03 — desks:** create the missing `lane-03.json/.md` with actual stored desk assets or an exact supported-tool blocker. Do not substitute status-only documentation for stored/read-back art.
2. **14 — render harness + room-art review:** create/reuse the branch-local staged-candidate card/detail fixture and write `reviews/14.json` for lighting/wall/rugs/decor from actual pixels. This is the oldest shared bottleneck because review must occur before 08 may promote candidates.
3. **01 / 02 / 05 — parallel review shards:** independently review their disjoint 48-ID partitions and create `reviews/01.json`, `reviews/02.json`, `reviews/05.json`. Start with pending candidates, then legacy final-portable art lacking visual acceptance. No self-approval.
4. **08 — incremental integration:** consume each qualified exact-hash ACCEPT immediately. One valid independent review plus automated mapping/file checks is enough for micro-batch integration; do not wait for all 192 or the old `art-review.json` + `release-qa.json` pair.
5. **13 — persistence evidence:** create the missing catalog-specific persistence report from synthetic real-browser purchase/equip/place/reload/recovery checks. Existing automated guards may be reused by hash but live timing is still unproven.
6. **10 / 12:** stay change-aware. Re-run affected catalog/mobile or learning checks after actual runtime/asset integrations, not on unchanged documentation-only heads.
7. **15:** reconcile any rejection/repair ownership, update assignments only after in-flight work is accounted for, and keep phase in CATALOG_SPRINT until the complete catalog gate passes.

No worker may count READY_FOR_REVIEW, XML validity, unique filenames, generated posters, local ZIPs or source inspection as screenshot-quality acceptance.

## Automated integration gate retained

GitHub Actions run `35641273312`, job `106470895718`, on `f654431b2bb76d2eceb322dd35c613dfad17e7ae` completed successfully:

- install dependencies: **PASS**;
- test files: **20/20 PASS**;
- tests: **85/85 PASS**;
- Vite production build: **PASS**;
- modules transformed: **1,612**;
- CSS: **167.22 kB / 35.66 kB gzip**;
- JS: **300.96 kB / 92.19 kB gzip**.

Because the current branch changes after that head are documentation/coordination evidence only, a redundant full suite is not rerun in this Command Center pass. Any runtime or canonical asset integration invalidates the affected proof and must earn fresh tests/build according to V2.

## Mobile catalog evidence retained

Workstream 10's audited canonical Store run reports zero release-blocking failures across all 16 collections for desktop 1408×1056, phone 390×844 and phone 320×568 browser emulation, including navigation, overflow, touch targets, readable states, semantics, image loading/dimensions, visible focus, reduced-motion context, keyboard card activation, phone two-column grid, runtime errors, long scroll and layout stability.

Limitations remain explicit: this is headless Chromium evidence, not physical iPhone/iPad/Android performance or VoiceOver/TalkBack/NVDA proof. It also predates future canonical art integrations and must be rerun change-aware.

## Protected invariants

Every integration must preserve:

- 192 permanent stable Store IDs, prices and unlock rules;
- Coins, XP, Mastery Stars, Star Worth/Home progress, owned/equipped IDs, room placement, Dream Goal, mastery/evidence, Buddy/Bond and valid daily state;
- exactly five default Quest learning actions;
- source-bounded Grade-2 content and one defensible correct answer;
- independent versus clue/retry evidence separation;
- no wrong-answer currency/progress loss or reward farming;
- unknown/no-art owned IDs surviving saves/imports/recovery;
- no public child chat/profiles, stranger discovery, ads, loot boxes, FOMO or punitive streaks;
- original StarBlox art only: no Roblox/Brookhaven or third-party branded/character assets.

Current learning guard reports **0 catalog-induced P0 learning defects** on its audited runtime head. No phase switch is authorized by that fact alone.

## Shared design/runtime authority

- `docs/preproduction/DESIGN_SYSTEM_CONTRACT.md` remains the measurable visual contract.
- `src/shellChrome.css` remains shared shell-token/chrome authority.
- screen owners may tune screen-specific geometry but must not fork a second global HUD/nav/palette system.
- avatar/buddy presentation remains centralized rather than copied screen by screen.
- Store detail actions must proxy the existing permanent purchase/equip/place/Dream Goal paths.
- catalog art maps by exact stable item ID; art availability may never determine ownership.
- remove duplicated legacy CSS/runtime only after rendered evidence proves the rule dead or conflicting; do not do broad cleanup while the catalog is on the critical path.

## Catalog gate and automatic switch

Workstream 15 may set `GAME_FINISHING` only when all **192 actual IDs** have:

- correct, unique, stored canonical assets;
- independent exact-hash rendered visual acceptance;
- zero unresolved interim/placeholders/art defects;
- duplicate path/content and inappropriate near-duplicate checks cleared;
- manifest/runtime agreement and safe decoding;
- applicable catalog tests/build green on the integrated candidate;
- actual desktop/phone Store loading, scrolling and readability checks green;
- no catalog-induced learning, persistence or economy P0.

Unrelated Home/Store/Quest geometry is **not** a catalog-gate requirement. It resumes immediately after this switch through the original screen owners.

## Final release gate after catalog

GAME_FINISHING priorities remain: remeasure/fix the actual Home/Store/Quest geometry backlog, finish avatar equipment/try-on and environment/room-tier/logo fidelity, close phone/keyboard/screen-reader/contrast and normal/reduced-motion performance evidence, perform real browser save/reward recovery stress, rerun semantic learning checks after UI changes, then freeze a candidate and run the final clean regression/build/reference/safety package.

**READY FOR SINGLE REPLIT INTEGRATION stays NO** until those release blockers clear. Even a future YES is only a staged-development readiness state and is **not deployment permission**. Replit and `main` remain untouched until the user separately approves the final integration.
