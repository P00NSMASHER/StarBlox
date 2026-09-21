# StarBlox Screenshot-Match Command Center

STATUS: **CATALOG_SPRINT / 119 HASH-BOUND REVIEWS ALL REWORK / REPLACEMENT RENDER PIPELINE ACTIVE / NOT READY FOR REPLIT**

Branch: `screenshot-match-preproduction` only  
Observed coordination head before this update: `acbc6035da9d57bc88043604caa5ec0b6352398e`  
Latest full game-runtime test/build proof: `da070b301e8ce57ca10d44bcb4ccd2078cfe4690`  
Delivery policy: `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Phase authority: Workstream 15  
Canonical catalog manifest/runtime writer: Workstream 08  
Replit: **untouched**  
Main: **not merged or modified**

The latest full game-runtime proof remains the inspected GitHub Actions run `35653350977`: **22/22 test files, 98/98 tests and the production Vite build PASS**. Since that runtime/public-asset candidate, subsequent changes relevant to this pass are preproduction review/QA documentation plus screenshot/render workflow/scripts; no canonical catalog mapping has been promoted. Reuse the proven runtime evidence until an actual runtime/canonical asset integration changes it.

## Overall completion

**Estimated coordinated screenshot-match completion: 78%.**

The estimate is intentionally held. Review coverage increased materially, but **no current replacement hash has yet earned independent ACCEPT or canonical promotion**. Review/rework throughput is progress, but not release completion.

**READY FOR SINGLE REPLIT INTEGRATION: NO.**

## Completion matrix

| Area | Completion | Gate state | Current assessment |
| --- | ---: | --- | --- |
| HUD / Shell | **82%** | Implemented / final fidelity pending | Shared HUD/nav is coherent; final logo/chrome/reference polish belongs to GAME_FINISHING. |
| Home | **88%** | **Structural geometry PASS** / final fidelity pending | Latest measured Home geometry is green. Preserve it unless new evidence shows regression. |
| Store | **78%** | Catalog critical path + 4 measured geometry blockers | Upper Store/grid works; avatar stage, selected-detail height and lower collection/value band still need GAME_FINISHING corrections. |
| Quest | **88%** | Learning behavior green / 6 measured geometry blockers | Header, phase strip, avatar/body/mastery and earned-summary geometry remain later release work. |
| Avatar / Buddy | **80%** | Implemented / replacement art + true try-on pending | Saved equipment/Buddy state remains protected; companion/aura art and final layered fidelity remain incomplete. |
| Progression | **90%** | Automated state gate PASS / final render pending | Five tiers, Dream Goal, Daily/mastery and ownership-bound progress remain intact. |
| Catalog Art | **52% legacy labels; 0 accepted replacement hashes** | **Primary blocker** | Legacy `final-portable` labels are not screenshot-quality proof. Independent review now covers 119 unique IDs and all 119 current/legacy hashes are REWORK. |
| Environments | **82%** | Structurally implemented / fidelity+perf pending | Bedroom/learning/Store scenes exist; final dimensional material/depth/tier proof is GAME_FINISHING work. |
| Mobile / Accessibility | **86%** | Headless browser + CI strong / physical proof pending | Canonical Store emulation is green across desktop/tablet/390/320; physical-device/screen-reader evidence remains open. |
| Motion / Game Feel | **84%** | Automated helpers PASS / real perf pending | Reduced-motion helpers are green; real normal/reduced paint/composite proof remains. |
| Learning Integrity | **96%** | **Automated PASS** | 200-question bank, five-action Quest and evidence/retry invariants remain green; latest learning QA verified the persistence refactor. |
| Persistence / Economy | **88%** | Automated reload/replay PASS / real-browser stress open | Durable purchase and final-Quest exactly-once semantics pass automated evidence; synthetic real-browser timing/concurrency/recovery remains required. |
| QA / Release | **65%** | Runtime CI green / replacement visual gate active | Review coverage and staged-art infrastructure improved; final accepted catalog, live persistence, physical accessibility and reference parity remain open. |

## Catalog accounting

Canonical manifest remains v12:

- target permanent IDs: **192**;
- legacy canonical `final-portable`: **99**;
- canonical interim-not-verified: **23**;
- canonical manifest/runtime mappings: **122**;
- duplicate manifest paths recorded: **0**;
- V2 current-hash canonical promotions: **0**.

Replacement/prepared state at the start of this pass:

- branch-stored replacement candidates awaiting fresh independent review: **12** — `tops-1..8`, `auras-1..4`;
- preserved Git-object-only Lighting replacements pending owner path attachment/readback: **4** — `lighting-1..4`;
- generated-local desk candidates pending repository staging: **3** — `desks-2..4`;
- desks still needing candidates after that batch: **8** — `desks-5..12`.

The binary Git/GitHub import-readback path is proven; binary transfer is no longer a project capability blocker.

## Independent visual review status

The four disjoint V2 review shards currently account for **119 / 192 unique item IDs**:

- reviewer 01: **24** — Tops 12 + Bottoms 12;
- reviewer 02: **23** — Seating 11 + Shoes 12;
- reviewer 05: **36** — Auras 12 + Companions 12 + Beds 12;
- reviewer 14: **36** — Lighting 12 + Wall 12 + Rugs 12.

Current disposition:

- **ACCEPT: 0**;
- **REWORK: 119**;
- **BLOCKED: 0**;
- **unreviewed unique IDs: 73**.

The repeated defect is now strongly evidenced across clothing, furniture, effects and pets: identities are generally readable, but legacy/current candidate art is too flat/front-facing/vector-like, with weak material response, three-quarter construction, contact/cast lighting and tier progression compared with the premium dimensional screenshot target. Legacy status labels must not be promoted as final visual acceptance.

Reviewer 14 also completed actual-pixel review of **Wall 1–12 and Rugs 1–12**; both families are REWORK. Wall assets read as UI-style emblems rather than physical mounted objects, while Rugs read as upright badges rather than floor textiles in three-quarter product/room perspective.

## Replacement render pipeline

Workstream 14 has now generalized the existing staged-art QA workflow rather than creating a second framework. Commit `acbc6035da9d57bc88043604caa5ec0b6352398e` updates `.github/workflows/catalog-staged-art-qa.yml` to:

- render assigned reviewer collections;
- automatically discover versioned READY_FOR_REVIEW replacements from producer lane files;
- support SVG/JPG/WEBP repository candidates;
- emit hash-bound contact sheets plus 800×800 detail captures;
- preserve exact replacement Git blob identity in the artifact report.

GitHub Actions run `35654620624` was launched on that exact commit to render all currently staged replacements. At Command Center inspection time it was **in progress**, so no reviewer may treat it as completed evidence yet. Reviewers 01 and 05 should consume the artifact immediately after a successful conclusion, prioritizing Tops 1–8 and Auras 1–4 replacement hashes before more untouched legacy review.

A deterministic reference-screenshot capture workflow/script was also added in this cycle. It prepares final Home/Store/Quest capture at controlled viewports, but **the original user reference image pixels are still not repository-accessible**, so pixel-identical sign-off remains unavailable until those originals are supplied through an accessible path. Generated promotional collages remain invalid reference evidence.

## Persistence / learning

Automated transaction safety remains strong:

- purchase durable receipt / reload / replay: **PASS automated**;
- final Quest completion reward reload / replay: **PASS automated**;
- IndexedDB hydration recovery: **PASS automated**;
- rapid Buy/room/Quest duplicate-action guards: **PASS automated**;
- unknown/no-art owned IDs survive recovery/import logic: **PASS automated**.

One release blocker remains: **PERSIST-REAL-BROWSER-TRANSACTION-STRESS**. Workstream 13 still needs isolated synthetic browser evidence for purchase/equip/place/reload, final-feedback refresh timing, multi-tab replay, malformed import and live localStorage/IndexedDB recovery. No real player data may be used.

Learning QA on the current persistence refactor remains green; no catalog-induced learning P0 is recorded. Preserve five default actions, one defensible answer, source-bounded Grade-2 content, and independent-versus-assisted evidence separation.

## Structural browser status retained for GAME_FINISHING

Home currently passes its measured structural geometry contract.

Store retains four measured blockers:

1. avatar try-on stage undersized;
2. selected-item detail too tall;
3. collection strip too low/narrow;
4. value panel too low.

Quest retains six measured blockers:

1. header too tall;
2. phase strip too low;
3. avatar zone offset/undersized;
4. learning body too low/short;
5. mastery rail too narrow/tall;
6. earned summary too wide/low.

These do not block catalog completion but must clear before final release readiness.

## Protected invariants

Every subsequent integration must preserve:

- exactly **192** stable permanent Store IDs, prices and unlock rules;
- Coins, XP, Mastery Stars, Star Worth/Home progress, owned/equipped IDs, room placement, Dream Goal, mastery/evidence, Buddy/Bond and valid daily state;
- exactly five default Quest learning actions;
- source-bounded Grade-2 content and one defensible keyed answer;
- independent versus clue/retry evidence separation;
- no wrong-answer progress/currency loss or reward farming;
- unknown/no-art owned IDs across save/import/recovery;
- no public child chat/profiles, stranger discovery, ads, loot boxes, FOMO or punitive streaks;
- original StarBlox art only; no Roblox/Brookhaven or third-party branded/character assets.

## Next critical path

1. **14 — complete the running replacement render gate:** inspect run `35654620624`; if PASS, preserve artifact/digest and hand exact Tops/Aura replacement pixels to 01/05. If FAIL, repair only the concrete harness defect and rerun once.
2. **01 / 05 — fresh replacement decisions:** review Tops 1–8 and Auras 1–4 exact replacement hashes immediately from the qualified artifact; old REWORK decisions never transfer across hashes.
3. **04 — Lighting 1–4:** attach the four already-preserved Firefly blobs to versioned owned paths and verify exact readback; do not regenerate.
4. **03 — desks:** stage existing `desks-2..4` producer-visible bytes through the proven binary path, then continue `desks-5..12` in bounded premium batches.
5. **14 — finish its partition:** review Decor 1–12 after replacement fixture handoff; Wall/Rugs are now already dispositioned REWORK.
6. **01 / 02 / 05 and assigned producers — parallel repair/review:** prioritize ready replacement hashes, then continue unreviewed Headwear/Facegear, Backgear/Handgear, Desks and remaining families. Never self-approve or double-assign.
7. **08 — incremental integration:** integrate the first qualified exact-hash ACCEPT immediately after metadata/file/content checks; do not wait for all 192 or old monolithic rollups.
8. **13 — real-browser persistence:** close the synthetic browser timing/recovery blocker using authorized branch-local/CI execution when available.
9. **15 — catalog gate:** switch to GAME_FINISHING only at 192/192 correct, stored, unique, independently accepted, canonically wired and Store-verified assets with no catalog-induced learning/save/economy P0.

## Catalog gate and final release

`catalogGate.status` remains **NOT_STARTED** because **zero current replacement hashes are independently accepted**. Phase stays **CATALOG_SPRINT**.

After catalog PASS, specialists automatically return to normal roles and finish Store/Quest geometry, avatar true try-on, environment/room-tier/logo quality, motion, mobile/accessibility, live persistence/reward stress, semantic learning and final reference/performance checks.

Only an exact frozen candidate that passes full clean regression/build plus browser/reference/safety/accessibility/performance/persistence gates may be marked **READY FOR SINGLE REPLIT INTEGRATION: YES**. That is still **not deployment permission**. Replit and `main` remain untouched until separate user approval.
