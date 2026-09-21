# Catalog Sprint — Lane 03 Desks & Tech

STATUS: **DESKS 2–4 REPOSITORY-STAGED / CURRENT-HASH RENDER PENDING FOR REVIEWER 05; DESKS 5–6 EXACT ADOBE RECOVERY LINKS RESOLVED / BYTE TRANSFER ESCALATED TO 15 AFTER SECOND BLOCKED CYCLE**

Branch: `screenshot-match-preproduction`  
Workstream: 03  
Phase: `CATALOG_SPRINT`  
Canonical manifest/runtime: **not changed**  
Self-approval: **NO**  
Independent review owner: **05**  
Canonical integration owner: **08**

## Material progress this pass

The latest branch and current assignments were re-read before work. Workstream 03 still owns `desks-2..12`; `desks-1` remains preserved. No accepted or pending current desk was regenerated.

The important changed dependency is now explicit: reviewer 05 has the current staged `desks-2-v1`, `desks-3-v1`, and `desks-4-v1` hashes queued as **PENDING_SHARED_RENDER**. The earlier blank/transparent finding belongs to obsolete `-w03-v1` hashes and was not transferred to these current versions. Workstream 14 must render the current lane paths before reviewer 05 can disposition them.

For `desks-5` and `desks-6`, I resolved the exact preserved Firefly assets through Adobe again and obtained current `at.adobe.com` source/download and rendition URLs. That is materially different from the earlier Photoshop short-URL-only handoff and matches the transport shape already proven by the successful Lighting 5–8 recovery. Both actual current renditions were re-inspected; Garden Book Desk remains a dimensional warm-wood book/plant study desk and Galaxy Gamer Setup remains a dimensional indigo/berry-magenta gaming desk with clear tech identity.

I deliberately did **not** generate `desks-7..12` this cycle. The sprint rule is to finish a 2–4 item pilot through repository storage and independent review before scaling. Producing more local/remote art while `desks-5/6` cannot yet enter Git would only increase stranded inventory.

## Current exact staged candidates

| ID | Exact item | Tier | Theme | Repository path | Git blob SHA | Bytes | Review state |
|---|---|---:|---|---|---|---:|---|
| `desks-2` | Cloud Study Desk | 1 | Candy Core | `public/assets/catalog/desks-2-v1.webp` | `357f4ba8385e737499f12409c0bea141f9bc5e6a` | 30,866 | READY_FOR_REVIEW / current render pending |
| `desks-3` | Pixel Mini Setup | 1 | Adventure Club | `public/assets/catalog/desks-3-v1.webp` | `b3352961988d7e9c5ff48d1559fc4d2296d4eab3` | 36,084 | READY_FOR_REVIEW / current render pending |
| `desks-4` | Berry Vanity Desk | 2 | Cloud Pop | `public/assets/catalog/desks-4-v1.webp` | `711feeb78e6d08351fc2fd2d3176ddb1a288e8f2` | 39,394 | READY_FOR_REVIEW / current render pending |

Reviewer 05 explicitly says the stale fixture defect used obsolete desk hashes and must not be treated as a current decision. Workstream 14 owns correcting candidate selection/rendering for these three exact hashes.

## Exact recoverable Firefly candidates

The exact current game-model metadata remains:

- `desks-5` — **Garden Book Desk**, Tier 2, Pixel Party, price 181, star requirement 0.
- `desks-6` — **Galaxy Gamer Setup**, Tier 2, Berry Blast, price 254, star requirement 0.

### `desks-5`

- GenAI asset: `urn:aaid:sc:US:8962802a-f953-4cfe-bc19-c56fc7afcc74`
- Seed: `-244506822245710`
- Adobe rendition URL resolved this pass: `https://at.adobe.com/erUtDmd1Tm6AK332`
- Adobe source/download URL resolved this pass: `https://at.adobe.com/nNW24oiGxUt4gYTk`
- Intended candidate path after byte recovery: `public/assets/catalog/desks-5-w03-recovered-v2.jpg`
- Intended preserved source path: `docs/preproduction/catalog-sprint/recovered-originals/desks-5-6-20260921/desks-5-8962802a-f953-4cfe-bc19-c56fc7afcc74.ffgenimg`
- Producer pixels: **PASS** — complete three-quarter warm-wood desk, book shelf, integrated planter, articulated lamp, books, stationery and rounded drawer pedestal; centered and unclipped.

### `desks-6`

- GenAI asset: `urn:aaid:sc:US:bc5a80a0-b94a-4564-8360-9d521a05dde0`
- Seed: `3773566070365548`
- Adobe rendition URL resolved this pass: `https://at.adobe.com/cNu2n27bdRVX6IdN`
- Adobe source/download URL resolved this pass: `https://at.adobe.com/s1UsqTcWV9olEyMH`
- Intended candidate path after byte recovery: `public/assets/catalog/desks-6-w03-recovered-v2.jpg`
- Intended preserved source path: `docs/preproduction/catalog-sprint/recovered-originals/desks-5-6-20260921/desks-6-bc5a80a0-b94a-4564-8360-9d521a05dde0.ffgenimg`
- Producer pixels: **PASS** — complete three-quarter gaming desk with galaxy monitor, speakers, keyboard/controllers, planet light, drawer pedestal and berry-magenta accents; centered and unclipped.

These links are connector-resolved `at.adobe.com` URLs, the same URL class used by the already successful immutable Lighting byte-recovery path. They are a transport handoff, **not** repository delivery and not independent acceptance.

## Checks actually performed

- **PASS** — latest sprint state still assigns `desks-2..12` to Workstream 03.
- **PASS** — authoritative `src/gameModel.js` confirms exact Desks & Tech names; theme/tier derivation remains unchanged.
- **PASS** — `desks-2..4` preserved; no regeneration of current staged hashes.
- **PASS / changed dependency** — reviewer 05 currently lists `desks-2..4` as `PENDING_SHARED_RENDER`; stale blank renders belong to obsolete hashes only.
- **PASS 2/2** — exact preserved `desks-5/6` Firefly assets rediscovered in Adobe and current pixels re-inspected.
- **PASS 2/2** — connector-resolved `at.adobe.com` rendition plus source/download URLs obtained for central immutable recovery.
- **BLOCKED in lane 03** — this producer does not own shared recovery workflow/script paths and therefore did not create another transport framework.
- **PENDING** — Workstream 14 current-hash render for `desks-2..4`.
- **PENDING** — reviewer 05 independent visual decisions.
- **NOT RUN** — Workstream 08 canonical integration; correctly reserved for independently ACCEPTed staged hashes.

## Blocker escalation

This is the **second consecutive cycle** in which `desks-5/6` are finished premium images but cannot be written by Workstream 03 through its owned path alone. Per the anti-stall rule, the blocker is now escalated to Workstream 15 with everything needed for a one-time central transfer.

Requested helper action: reuse the already-proven immutable Adobe recovery pattern for exactly `desks-5` and `desks-6`; verify current Store metadata, fetch only the exact source/rendition URLs above, store versioned candidate/source bytes, verify decode/dimensions/SHA-256/Git blob/readback and non-duplicate content, and publish with a normal non-force latest-head commit. No regeneration, recompression, recoloring or canonical wiring. Return the exact stored hashes to lane 03; reviewer 05 then judges them and 08 alone integrates accepted hashes.

## Handoff / next productive action

1. **14** — render the current `desks-2-v1`, `desks-3-v1`, `desks-4-v1` paths/hashes rather than the obsolete `-w03-v1` files.
2. **05** — independently review those exact current pixels as soon as 14 publishes the corrected render artifact.
3. **15 / authorized byte-transport helper** — perform the one-time immutable Adobe recovery for exact `desks-5/6` links above.
4. **03** — consume the returned Git hashes, verify current-path readback, mark only those stored versions READY_FOR_REVIEW, and repair any concrete reviewer defect before further generation.
5. Only after this pilot has repository delivery plus independent disposition should 03 continue the next 2–4 item batch with `desks-7..12`.

**Replit/Floot were not touched. `main` was not merged or modified. Player data, 192 Store IDs, prices/unlocks, learning content, canonical manifest and runtime mappings were unchanged.**
