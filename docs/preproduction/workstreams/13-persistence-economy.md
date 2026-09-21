# Workstream 13 — Persistence + Economy Safety

STATUS: **REAL CHROMIUM PERSISTENCE / ECONOMY MATRIX PASS**

Branch: `screenshot-match-preproduction`  
Automated durable transaction baseline: `81bbf06dc070b0f72f942dde9c14ac4bba476922` — **22/22 files, 98/98 tests, production build PASS**  
Latest Quest browser evidence head: `7fa1e46001d756f6333a609c1a493dd35017e22a`  
Detailed evidence: `docs/preproduction/catalog-sprint/persistence-qa.json` and `.md`  
Replit/Floot: **untouched**  
`main`: **not merged or modified**  
Real player data: **not accessed or modified**

## Protected state contract

Screenshot-match work must not reset or prune Coins, Stars, XP, Star Worth/Home progress, permanent owned IDs, equipped gear, room placement, Dream Goal, mastery/evidence, Buddy/Bond, district progress, durable receipts or recoverable backups. Missing or replaced art is presentation-only: unknown/no-art IDs remain valid persisted state. Migrations remain additive/backward-compatible and duplicate-safe.

## Durable transaction implementation

The previously hardened runtime remains unchanged:

- permanent purchases revalidate ownership/receipt/currency inside the functional save transaction and record a durable receipt;
- final Quest completion commits reward/progress and completion receipt before the 950 ms presentation transition;
- missing localStorage remains a recovery state until IndexedDB is checked;
- saved ownership/equipment/room/Dream Goal IDs are never filtered by catalog-art presence.

No persistence runtime code was changed in this pass because the browser matrix reproduced no transaction race.

## Exact executed browser proof

### Purchase / equip / room / multi-tab / import / art retention

Run `35660627560`, job `106534723983`, head `795c2d6f9ee197c66bc725d6a7c53fe5f0fd3382`, Chromium `140.0.7339.16`, artifact `10667216430`:

- rapid purchase + reload: **PASS exactly once**;
- equip + reload: **PASS**;
- underlying room Place/Put Away rapid double tap + reload: **PASS exactly once**;
- same purchase from two tabs: **PASS exactly once**;
- malformed import: **PASS — existing save unchanged**;
- accepted art-path / unknown-no-art retention: **PASS**.

### localStorage loss / IndexedDB recovery

Run `35660997658`, job `106535917074`, head `04a7e72f5b8adb6d36a164df2edc324c877de390`, artifact `10667273151`:

- current critical state written to IndexedDB backup: **PASS**;
- localStorage deleted + reload: **PASS exact recovery**;
- Coins/Stars/XP, ownership, equipped gear, room placement, Dream Goal and unknown/no-art state matched pre-loss values.

### Quest wrong/retry / rapid correct / final refresh

Run `35662516044`, job `106540798056`, exact head `7fa1e46001d756f6333a609c1a493dd35017e22a`, Chromium `140.0.7339.16`, artifact `10668080723`, digest `sha256:4ae925dcaaa268ca79b9f8261981bee49306993dcff79565a257c4f840ce96f8`:

- production Vite build: **PASS**, 1,613 modules;
- wrong answer then repeated retry: **PASS — no repeat reward/evidence farming**;
- clue-assisted correct: **PASS — no Coins/Stars/transfer/mastery/independent evidence**;
- rapid correct double-click: **PASS — exactly one evidence transition**;
- final Quest completion durable in **186 ms** before the **950 ms** UI transition: **PASS**;
- immediate reload preserves completion Coins/XP, Quest count, daily Quest completion, Buddy Bond and completion receipt: **PASS**;
- active Quest receipt clears: **PASS**;
- unknown/no-art owned/equipped/room/Dream Goal state survives the completion/reload path: **PASS**.

The first version of this focused harness failed only because it compared the rendered hardened religion wording to the unhardened base bank. The harness was corrected to load the production question-quality, semantic and diagnostic hardening layers; the product runtime was not changed to obtain the PASS.

## Preservation matrix

| State / behavior | Result |
| --- | --- |
| Coins / Stars / XP | **PASS** |
| Star Worth / Home progress | **PASS** |
| Owned inventory including unknown/no-art | **PASS** |
| Equipped gear including unknown/no-art | **PASS** |
| Room placement including unknown/no-art | **PASS** |
| Dream Goal | **PASS** |
| Mastery / independent / transfer evidence | **PASS** |
| Buddy / Bond | **PASS** |
| District progress | **PASS** |
| Rapid purchase + reload | **PASS exactly once** |
| Multi-tab purchase replay | **PASS exactly once** |
| Equip + reload | **PASS** |
| Room rapid action + reload | **PASS exactly once** |
| Malformed import | **PASS — no mutation** |
| localStorage loss + IndexedDB recovery | **PASS exact critical state** |
| Wrong/retry farming | **PASS — prevented** |
| Assisted-as-independent mastery | **PASS — prevented** |
| Rapid correct answer | **PASS exactly once** |
| Final Quest immediate refresh | **PASS** |
| Missing/replaced art affects ownership | **PASS — no pruning** |

## Remaining handoff, not a Workstream-13 transaction blocker

The screenshot Store right-rail `Place / Put Away` delegation previously failed while the underlying original room action passed the exact transaction/double-tap/reload tests. This remains a **04/15 UI-routing issue**. Do not rewrite the passing persistence transaction while fixing that delegation.

No newly accepted canonical catalog mapping was observed in this pass. After an accepted mapping changes runtime art paths, rerun the changed-collection retention check to ensure stable IDs/prices/unlocks and saved ownership/equipment/room/Dream Goal remain untouched.

## Handoff

**15:** the current Workstream-13 browser release blocker is closed; preserve this evidence by hash and rerun only after relevant runtime changes or on the frozen final release candidate.  
**04:** fix Store right-rail room-action routing without changing transaction semantics.  
**08:** accepted catalog mapping changes must never filter saved IDs by image availability; trigger the changed-collection retention smoke after each coherent accepted batch.  
**12:** real Chromium now confirms wrong/retry no-farming and assisted-vs-independent evidence separation on the hardened rendered Quest.

No producer art, canonical catalog manifest/runtime, Replit, Floot, `main`, paid settings or real-player data were modified by Workstream 13.
