# Catalog Sprint — Workstream 10 Small-Card / Mobile Visual QA

STATUS: **BLOCKED — current canonical responsive Store entry remains unreachable after two unchanged real-pointer cycles; no identical rerun this cycle**

Branch: `screenshot-match-preproduction`  
Audited branch head before this cycle: `5227122d9dc4ddd36b467b1fbe9d0384edaa3be9`  
Phase: `ART_VISUALS_SPRINT`  
Catalog gate: **NOT APPROVED by Workstream 10**  
Replit/Floot/main/deployment/player data: **untouched**

## Change-aware decision

The canonical Store remains **manifest v27** (`27c77919cfbc5cf52570bf91871338b59cded055`) / runtime `a3b5b2b98a8507f5226191959a3cd91ef6729bdb`. The shared Store entry path has not changed since the second consecutive `CANONICAL_STORE_ENTRY_POINTER_TIMEOUT_BEFORE_CARD_RENDER` result, so DELIVERY_PROTOCOL_V2 does **not** justify another identical 1408/1024/390/320 browser run. The prior real-pointer blocker is reused exactly rather than converted into a PASS through a forced DOM click, keyboard substitution, skipped assertion or static-image overlay.

The new useful work this cycle is a genuinely untested staged-art case: independently accepted `rugs-12` v3, compared against accepted `rugs-11` as a stable small-card visual control.

## Newly accepted staged art — Rugs 12

Reviewer 14 independently accepted **Luxe Star Rug (`rugs-12`)** at exact Git blob `eea2fc5b78c1186342f91f597bc792160ab8f8fe`, SHA-256 `21a2f71224d9a7d4e0e60a672867cc629f21a481c3310fee6b1cac1c1be071b3`. Workstream 10 did not make or alter that approval. Workstream 08 remains the only canonical-mapping owner.

I inspected the preserved exact-hash staged fixture from workflow run `35690027258`, artifact `10677768162`, digest `sha256:fd733e0ab24793a71bc267c75cd0f95e5dd291d38ddb7dda048050e1550a5165`. The enclosing workflow failed elsewhere, but the scoped Rugs evidence is clean: selected binding, PNG signature/safety, HTTP/decode, card image and detail screenshot are present with no scoped errors. The Rugs contact sheet hash is `8bb20a752ad3b1382dcf3aa418b8b1b5b7bf366c70bac53180859fb782bba639`.

| Item | Role | Exact blob | Small-card finding |
| --- | --- | --- | --- |
| `rugs-11` Dream Cloud Rug | stable accepted control | `2c93f18fb5960f7056819c341a3da8f7fff3fb9d` | PASS diagnostic — moon/cloud silhouette and soft depth remain distinct at 210/140/110px; fine star/cloud texture becomes subordinate at 110px without collapsing the object. No clipping/edge artifact observed. |
| `rugs-12` Luxe Star Rug | newly accepted staged candidate, pending 08 wiring | `eea2fc5b78c1186342f91f597bc792160ab8f8fe` | PASS diagnostic — star silhouette, warm center, contrasting outer form and tassel extensions remain recognizable at 210/140/110px; Tier-5 richness survives reduction. Star points/tassels remain inside frame; no edge artifact observed. |

Detail screenshot hashes: Rugs 11 `f2eb8fd8150be3e6731efae29d9924161e1aa1ddb60ff253052dede224b3507c`; Rugs 12 `5a7a0f4b3ee1a9d11ce173ae32fd8f9755e9075e1a5b2746b2a3e75dfdf4b8d8`.

These are **staged-fixture diagnostics only**. They do not establish actual Store grid/detail behavior at 1408×1056, 1024×768, 390×844 or 320×568, nor normal/reduced-motion scrolling performance. `rugs-12` is not canonical yet, and Workstream 10 will not edit the manifest to make it testable.

## Real responsive Store blocker — unchanged, not rerun

Structured handoff label: **`CANONICAL_STORE_ENTRY_POINTER_TIMEOUT_BEFORE_CARD_RENDER`**.

The same failure was already reproduced twice on consecutive canonical batches:

- Shoes 7–10: run `35689825441`, artifact `10677978587`, source head `04eb1f4c4a6f9efcd0e6bea9d33e7580740dcfd4`.
- Aura 11: run `35690236073`, artifact `10678253907`, source head `ad8867efc70d1b123cbc5e2f157766bec58e510d`.

Both builds passed, but Playwright found the Store control visible/enabled/stable and then the **real pointer click timed out before any catalog card rendered**. That covered reduced-motion probes at 1408×1056, 1024×768, 390×844 and 320×568 plus normal-motion controls at 1024 and 390. Workstream 15 already owns coordination of this shared-entry blocker after the required two unchanged cycles.

Because the shared entrypoint has not changed, this cycle intentionally does **not** spend another browser run repeating the same failure. Once 15 repairs/co-ordinates the real pointer path and 08 canonically wires the next accepted batch, Workstream 10 should run only the changed collection plus a stable control at 1408/1024/390/320 in normal and reduced-motion modes.

## Other current evidence blockers

`tops-11` / `tops-12`: **`V7_EXACT_BYTES_UNAVAILABLE_NO_CURRENT_REPOSITORY_CARD_DETAIL_PIXELS`**. The v7 receipts exist, but the authoritative WEBP payload bytes are not currently repository-backed; v6 failed signature validation and v5 visual judgments do not transfer.

`headwear-5..8`: **`EXTERNAL_ONLY_NO_REPOSITORY_HASH_NO_QUALIFIED_CARD_STORE_PROOF`** remains in force until exact repository-backed bytes/hashes exist.

## Evidence boundary

The historical full responsive matrix remains run `35659760652`, artifact `10667595844`, source head `8a2c53aa2133baef23e263d8dda8b2a180dffe19`. It is valid only for unchanged hashes and responsive guards; it is not proof for later art.

Physical iPhone/iPad/Android performance and VoiceOver/TalkBack/NVDA remain **NOT TESTED**. Headless Chromium, staged fixture pixels and local diagnostic reductions are not physical-device/screen-reader evidence. The authoritative desktop Store target remains `docs/preproduction/reference-screenshots/originals/store-1448x1086.jpeg`, SHA-256 `b26cb14947d85258bcfff211174e54f34f2e2a11b83c73560b2365167071071d`.

No shared UI, canonical mapping, producer art, catalog metadata, gameplay, learning, persistence, economy, real player data, Replit, Floot, `main`, deployment, purchases or paid settings were changed by Workstream 10.
