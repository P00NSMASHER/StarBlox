# StarBlox Art + Visuals Command Center

STATUS: **ART_VISUALS_SPRINT / CATALOG CRITICAL PATH / 35 ACCEPTED FLOOR / 27 CANONICAL-WIRED / NOT READY FOR REPLIT**

Branch: `screenshot-match-preproduction` only  
Observed coordination head before this update: `a2edafea67c1398c54143d97386105d62bea64a8`  
Authoritative allocation: `docs/preproduction/ART_VISUALS_SPRINT.json`  
Compatible delivery safeguards: `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Canonical catalog writer: **08 only**  
Cross-worker/shared-entrypoint coordinator: **15 only**  
Replit/Floot: **untouched**  
`main`: **not merged or modified**  
Deployment: **not authorized**

## Current visual accounting

These counts intentionally separate review coverage from accepted/current/canonical completion.

- Permanent catalog target: **192 IDs**
- Unique IDs with at least one usable independent visual disposition: **180 / 192**
- Remaining independent-review coverage gap: **12 IDs — Desks**
- Conservative floor of independently **ACCEPTED current replacement hashes: 35**
- Accepted current hashes already **canonical-wired: 27**
- Known accepted-but-not-yet-wired at the current coordination snapshot: **8 — Lighting 5–12**
- Catalog release-cleared IDs: **0 / 192** — release clearance waits for the complete accepted/wired/unique/Store-verified set, not status labels.
- Current canonical manifest: **v16**, **130 mappings**, **114 final-portable labels**, **16 interim-not-verified**, **78 non-final**, **0 duplicate paths**, **0 duplicate content hashes** in the latest integration evidence.

Legacy `final-portable` labels are not independent screenshot-quality acceptance. No percentage is increased merely because an asset was generated, stored, reviewed, or labeled ready.

## Immediate critical path

1. **08 — integrate Lighting 5–12:** Reviewer 14 independently ACCEPTed all eight exact current hashes after actual card/detail rendering. They are the oldest accepted-but-not-wired dependency. 08 has been explicitly handed the verified hashes/paths and an immediate run was requested; only 08 may change `catalog-art-manifest.json` / `src/catalogArtRuntime.js`.
2. **01 — Tops 7–10 v3 review:** Four new JPG replacements are branch-stored, exact-readback verified and actual card/detail rendered. Exact blobs: Tops 7 `1c85689d...`, 8 `58aadd95...`, 9 `9011648d...`, 10 `5449283e...`. Reviewer 01 must decide these new hashes independently; old v2 REWORK verdicts do not transfer.
3. **07 — Rugs 5–8 delivery:** These four owned repairs are already generated as exact Adobe assets and must **not** be regenerated. 07 must transfer the existing bytes to versioned GitHub paths, read them back, record exact hashes/dimensions/bytes, then hand them to 14. Do not scale to Rugs 9–12 until the pilot receives current-hash review.
4. **14 → 05 — Desks:** The only remaining 12-ID review-coverage family is Desks. Current Desk 2–4 exact paths/hashes require fresh shared-fixture rendering because prior blank/corrupt evidence referred to obsolete paths. Desk 5–6 already have separate browser render evidence but still require reviewer-05 disposition.
5. **12 — accessory art:** Continue Headwear / Facegear / Backgear / Handgear premium repair pilots. Reviewer ownership remains 01 for Headwear/Facegear and 02 for Backgear/Handgear; 12 never self-approves.
6. **13 — scenes/character art in parallel:** Continue versioned Home/Store/Quest character/environment/component art against the stored original references without changing saves, economy, curriculum, gameplay metadata or the reference files.

## Independent reviewer partitions

- **01:** Tops / Bottoms / Headwear / Facegear
- **02:** Shoes / Backgear / Handgear / Seating
- **05:** Beds / Desks / Companions / Auras
- **14:** Lighting / Wall / Rugs / Decor

One valid independent exact-hash ACCEPT plus required file/metadata/content checks allows 08 to integrate immediately. Old monolithic rollups and a second universal reviewer are not integration prerequisites. Reviewers may not approve their own art.

Reviewer 14's current partition evidence is **12 ACCEPT / 36 REWORK**: Lighting 1–12 are accepted; Wall 1–12, Rugs 1–12 legacy/current reviewed hashes, and Decor 1–12 remain REWORK until replacement versions earn new decisions.

## Latest replacement evidence

### Tops 7–10 v3
Recovery workflow run **35671172749** produced branch-stored 600×600 JPG candidates and preserved 1024×1024 originals. Metadata/readback/decode/tests/build passed; card/detail rendering passed **4/4**. Reviewer 01 decision is pending.

### Rugs 5–8
The exact already-generated Adobe assets are recorded in `docs/preproduction/catalog-sprint/chat-rugs-recovery-5-8-20260921.json`. They remain **generated/external, not branch-staged** until 07 completes exact byte transfer/readback. This is not accepted or wired progress yet.

### Desks
Current Desk 2–4 versions are `desks-2-v1.webp` blob `357f4ba8...`, `desks-3-v1.webp` blob `b3352961...`, and `desks-4-v1.webp` blob `711feeb7...`. The shared renderer must capture those exact hashes before reviewer 05 decides them. Stale `-w03-v1` evidence is invalid for these current hashes.

## Original screenshot references

The stale “reference pixels unavailable” blocker is closed.

Authoritative originals:
- `docs/preproduction/reference-screenshots/originals/home-1448x1086.jpeg`
- `docs/preproduction/reference-screenshots/originals/store-1448x1086.jpeg`
- `docs/preproduction/reference-screenshots/originals/quest-1448x1086.jpeg`

Verified SHA-256s are recorded in `original-reference-manifest.json`; uncropped 1408×1056 comparison PNGs are also stored. Import run **35663779668 / job 106544831661 passed**. These pixels are the authority for visual comparison. Generated promotional collages are not reference evidence.

Exact reference parity is **not yet cleared**. Raw pixel difference alone is diagnostic; independent visual interpretation must account for state/content differences without copying unsafe sale/FOMO text or fake player state.

## Screen visual status

- **Home:** measured structural geometry currently **PASS**. Preserve it unless a new regression is observed.
- **Store:** **4 measured geometry blockers** remain for post-catalog visual finishing: avatar try-on stage, selected-detail height, collection strip placement/width, value-panel vertical position.
- **Quest:** **6 measured geometry blockers** remain: header, phase strip, avatar zone, learning body, mastery rail, earned summary.
- After catalog reaches 192/192 accepted + canonical, **all 15 remain on ART AND VISUALS**. The next phase is visual finishing, not automatic return to general feature development.

## Regression safeguards retained

Latest reusable integration evidence records:

- full test suite: **PASS**
- production build: **PASS**
- integration-v16 catalog checks: **PASS**
- Store/mobile headless smoke for the integrated v16 batch: **PASS**
- synthetic real-browser persistence/economy matrix: **PASS**, using no real player data

These are safeguards, not permission to restart nonvisual feature work. Physical-device performance and VoiceOver/TalkBack/NVDA evidence remain **OPEN / NOT TESTED** unless later evidence closes them.

## Completion gates

`ART_VISUALS_COMPLETE` remains **NO**.

It requires:
1. **192/192** correct, unique, repository-stored current images;
2. independent exact-hash visual ACCEPT for all 192;
3. all 192 accepted versions canonically wired by 08;
4. final Store desktop/phone image loading/scrolling/visual checks and duplicate-content/near-duplicate audit;
5. independent acceptance of scoped Home/Store/Quest, avatar/try-on, room tiers, HUD/logo/icons, materials/lighting, mobile composition and motion;
6. actual comparison to the stored original reference pixels with meaningful differences explicitly accounted for;
7. relevant regression/build and real-browser visual proof.

Art/visual completion is **not** release completion. Any remaining physical accessibility, screen-reader or other nonvisual release evidence stays open afterward. `READY_FOR_SINGLE_REPLIT_INTEGRATION` is still **NO**, and even a future YES would not be deployment permission.
