# Catalog Sprint — Lane 03 Desks & Tech

STATUS: **DESKS 2–4 REPOSITORY-STAGED / READY FOR REVIEWER 05**

Branch: `screenshot-match-preproduction`  
Workstream: 03  
Phase: `CATALOG_SPRINT`  
Canonical manifest/runtime: **not changed**  
Self-approval: **NO**  
Independent review owner: **05**  
Canonical integration owner: **08**

## Material progress this pass

The prior binary-transfer blocker is cleared for this lane. I recovered the existing generated desk images rather than regenerating them, rebuilt the 512×512 WebP card derivatives, stored those exact bytes as Git blobs, attached all three to versioned repository paths in commit `264ca2d54e0cb09495d716512a9c6ad28bf0784f`, and read every path back from `screenshot-match-preproduction` with an exact Git-blob-SHA match.

| ID | Exact item | Tier | Theme | Repository path | Git blob SHA | WebP bytes | Status |
|---|---|---:|---|---|---|---:|---|
| `desks-2` | Cloud Study Desk | 1 | Candy Core | `public/assets/catalog/desks-2-v1.webp` | `357f4ba8385e737499f12409c0bea141f9bc5e6a` | 30,866 | READY_FOR_REVIEW |
| `desks-3` | Pixel Mini Setup | 1 | Adventure Club | `public/assets/catalog/desks-3-v1.webp` | `b3352961988d7e9c5ff48d1559fc4d2296d4eab3` | 36,084 | READY_FOR_REVIEW |
| `desks-4` | Berry Vanity Desk | 2 | Cloud Pop | `public/assets/catalog/desks-4-v1.webp` | `711feeb78e6d08351fc2fd2d3176ddb1a288e8f2` | 39,394 | READY_FOR_REVIEW |

The branch advanced concurrently after the asset commit; the desk commit is an ancestor of later work and no force push or reset was used. `desks-1` remains the preserved Tiny Homework Desk and was not regenerated.

## Provenance and producer checks

The staged cards come from the three existing OpenAI generations already recorded by this lane:

- `desks-2`: generation `fb99c969-1ab6-4774-a934-5a2f4b45a93d`; original 1254×1254 PNG SHA-256 `806215b41e9c4c85864118e7b2361fc3aaf6167a22e3c25029c9dc8a719ca9b1`; staged 512 WebP SHA-256 `c0b887c400535d468b23f4f70e2e921d2b90f9bd320f06f8b8698c1c21020ae1`.
- `desks-3`: generation `b108ca3b-cdf6-484d-b859-ce2d294c4645`; original SHA-256 `8c4b1c7cbfad56c6340e1d2a0b26d45e25408e738d02a12cddf94de4213bf9c4`; staged WebP SHA-256 `50db3c540f7e807c5f8dc00ba96740f802a992a7c028608778fc2cc914ca0126`.
- `desks-4`: generation `e6cfd295-02b8-49ea-9ec5-f7ce70ae0501`; original SHA-256 `d3e053d07743a15d3bec5813c25d312ba1293f76e822cf0b666aa5901f60d918`; staged WebP SHA-256 `ed9432f4dc9ac88544435621edc8d5ad8cd374f554b3ba9e828ce0d86bad3023`.

Producer pixel inspection remains PASS at card scale: each image is a separate dimensional product with a distinct silhouette and functional setup; no people, UI, logos, clipping, text-overlay artifact or malformed desk geometry was observed. This is producer validation only and is **not** independent visual acceptance.

## Checks actually performed

- **PASS** — current sprint state still assigns `desks-2..12` to Workstream 03.
- **PASS** — exact game-model names, tiers and themes for `desks-2..4`.
- **PASS** — preserved `desks-1`; no canonical manifest/runtime write.
- **PASS** — recovered existing generations instead of regenerating pending work.
- **PASS 3/3** — 512×512 WebP derivative creation and local decode.
- **PASS 3/3** — Git blob creation.
- **PASS 3/3** — versioned branch-path attachment with a normal non-force commit.
- **PASS 3/3** — branch readback returned the exact expected Git blob SHA.
- **PENDING** — independent reviewer 05 card/detail pixel decision on these exact hashes.
- **NOT RUN** — Workstream 08 canonical integration, correctly waiting for reviewer 05 ACCEPT.

## Handoff

Reviewer 05 should render and independently disposition the exact hashes above through the shared staged-art QA path. Workstream 08 may integrate only current hashes receiving `ACCEPT`.

Workstream 03 still owns `desks-5..12`. On the next pass, if `desks-2..4` are still pending review, start a fresh premium micro-batch with `desks-5` and `desks-6`; do not regenerate `desks-2..4` while they wait.

**Replit/Floot were not touched. `main` was not merged or modified. Player data, the 192 Store IDs, prices/unlocks, learning content, canonical manifest and runtime mappings were unchanged.**
