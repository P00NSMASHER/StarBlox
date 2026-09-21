# Catalog Sprint — Workstream 13 Persistence / Economy QA

STATUS: **REAL-BROWSER PERSISTENCE / ECONOMY MATRIX PASS**

Branch: `screenshot-match-preproduction`  
Automated durable transaction baseline: `81bbf06dc070b0f72f942dde9c14ac4bba476922` — **22/22 files, 98/98 tests, production build PASS**  
Latest focused Quest browser head: `7fa1e46001d756f6333a609c1a493dd35017e22a`  
Replit/Floot: **untouched**  
`main`: **not merged or modified**  
Real player data: **not used or modified**

## Material result

The remaining Workstream-13 browser release blocker is closed. Synthetic Playwright Chromium now covers purchase/equip/place/reload, rapid interactions, multi-tab purchase replay, malformed import, localStorage-loss/IndexedDB recovery, unknown/no-art retained state, and the previously missing Quest wrong/retry + rapid-correct + immediate-final-refresh path.

No persistence runtime rewrite was required in this pass. The final successful Quest run fixed the QA harness so it uses the same hardened question-bank layers as the production app; the earlier locator mismatch was harness-only.

## Browser evidence

### Broad persistence stress

Run `35660627560`, job `106534723983`, head `795c2d6f9ee197c66bc725d6a7c53fe5f0fd3382`, Chromium `140.0.7339.16`, artifact `10667216430`, digest `sha256:4ca9e54fba30addccc003cb33d02e7dd1cb9e68bd4af76ce2f189b4ba08c0eef`:

- rapid permanent purchase + reload: **PASS exactly once**;
- equip + reload: **PASS**;
- underlying room Place/Put Away rapid double tap + reload: **PASS exactly once**;
- simultaneous same purchase in two tabs: **PASS exactly once**;
- malformed import through live UI: **PASS, no save mutation**;
- accepted catalog-art path and unknown/no-art ownership/equipment/placement/Dream Goal retention: **PASS**;
- production build: **PASS**, 1,613 modules.

### Focused IndexedDB recovery

Run `35660997658`, job `106535917074`, head `04a7e72f5b8adb6d36a164df2edc324c877de390`, artifact `10667273151`, digest `sha256:d121fa07b34419c9c04aa88aad6d96ee23157265bc04c1fc8a9d334fdb8b0620`:

- current synthetic critical state reaches IndexedDB backup: **PASS**;
- delete localStorage + reload + exact critical-state recovery from IndexedDB: **PASS**;
- Coins/Stars/XP, ownership, equipped IDs, room placement, Dream Goal and unknown/no-art IDs match pre-loss state.

### Quest timing / reward / refresh — PASS

Run `35662516044`, job `106540798056`, exact head `7fa1e46001d756f6333a609c1a493dd35017e22a`, Chromium `140.0.7339.16`, artifact `10668080723`, digest `sha256:4ae925dcaaa268ca79b9f8261981bee49306993dcff79565a257c4f840ce96f8`:

- production build: **PASS**, 1,613 modules;
- rendered hardened question mapping: **PASS**;
- first wrong answer recorded once: **PASS**;
- repeated wrong retry: **PASS — no additional Coins, Stars, XP or wrong evidence**;
- clue-assisted correct: **PASS — no Coins, Stars, transfer/mastery or independent-evidence credit**;
- rapid correct double-click: **PASS — one seen/correct/independent transition**;
- final Quest completion became durable in **186 ms**, before the **950 ms** presentation transition: **PASS**;
- immediate reload preserves final Coins/XP, Quest count, daily Quest completion, Buddy Bond and completion receipt: **PASS**;
- active Quest receipt clears after completion: **PASS**;
- unknown/no-art owned/equipped/room/Dream Goal state survives the same completion/reload path: **PASS**.

## Preservation matrix

| State / behavior | Evidence |
| --- | --- |
| Coins / Stars / XP | **PASS automated + Chromium** |
| Star Worth / Home progress | **PASS** |
| Owned inventory including unknown/no-art | **PASS** |
| Equipped gear including unknown/no-art | **PASS** |
| Room placement including unknown/no-art | **PASS** |
| Dream Goal including unknown/no-art | **PASS** |
| Mastery / transfer evidence separation | **PASS** |
| Buddy / Bond | **PASS** |
| District progress | **PASS** |
| Rapid purchase + reload | **PASS exactly once** |
| Multi-tab same purchase replay | **PASS exactly once** |
| Equip + reload | **PASS** |
| Room Place/Put Away rapid tap + reload | **PASS** |
| Malformed import | **PASS — no mutation** |
| localStorage loss + IndexedDB recovery | **PASS exact critical state** |
| Wrong/retry no farming | **PASS** |
| Assisted success not independent/mastery | **PASS** |
| Rapid correct answer | **PASS exactly once** |
| Final Quest immediate refresh | **PASS** |
| Missing/replaced art prunes ownership | **PASS — no pruning observed** |

## Catalog integration guard

No newly ACCEPTed canonical catalog mapping was observed during this Workstream-13 pass, so there was no new accepted-art integration to re-test. The standing invariant remains: artwork availability is presentation-only and may never filter `owned`, `equipped`, `roomDecor` or `dreamGoalId`, or alter stable IDs/prices/unlocks. Trigger the changed-collection retention test after the first accepted canonical mapping change.

## Separate Store UI routing issue

The screenshot Store selected-item right-rail `Place / Put Away` delegation previously failed while the underlying room transaction passed rapid double-tap, remove/place and reload testing. This remains a **Store UI routing issue for 04/15**, not a persistence transaction failure. Preserve the passing transaction semantics while fixing delegation.

## Handoff

**15:** Workstream 13's current real-browser persistence/economy release blocker is closed. Re-run the browser matrix only after relevant persistence/economy/runtime changes and once on the frozen final candidate.  
**04:** repair selected-item Store Place/Put Away routing without rewriting the underlying transaction/guard.  
**08:** after each accepted canonical art mapping, preserve stable IDs/prices/unlocks and trigger changed-collection ownership/equipment/room/Dream Goal retention checks.  
**12:** browser evidence now confirms wrong/retry no-farming and assisted-vs-independent evidence separation on the hardened rendered Quest.

No producer art, canonical catalog mapping, persistence runtime semantics, Replit, Floot, `main`, paid settings or real-player state were modified by Workstream 13.
