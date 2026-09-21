# Catalog Sprint — Workstream 08 Integration

STATUS: **NO ACCEPTED INCREMENT YET / REVIEW REWORKS RECORDED / BINARY IMPORT PATH PROVEN**

Branch: `screenshot-match-preproduction` only  
Audited source head before this evidence update: `e85ee50298ac0028be962fef886d9b150a5ca829`  
Replit/Floot: **untouched**  
Main: **not merged or modified**

## Canonical catalog state

Workstream 08 remains the sole writer for `catalog-art-manifest.json` and `src/catalogArtRuntime.js`.

No canonical mapping changed in this pass because **zero current asset hashes have a qualified independent ACCEPT**. The manifest/runtime therefore remain exactly:

- Store target: **192 IDs**
- manifest version: **12**
- legacy `final-portable`: **99**
- `interim-not-verified`: **23**
- canonical non-final relative to the legacy label: **93**
- manifest entries: **122**
- exact-ID runtime mappings: **122**
- recorded duplicate asset paths: **0**
- V2 exact-hash independent ACCEPTs: **0**

The 99 `final-portable` labels are preserved for compatibility, but they are not reinterpreted as screenshot-quality approval. Reviewer 01 has now explicitly rejected the current Tops hashes on visual-quality grounds.

## Current prepared artwork

All eight production lanes now have reports. Repository-staged assigned item IDs currently cover **82** items:

- CHAT seating: 11
- 04 lighting: 12
- 05 wall: 12
- 06 companions: 11
- 07 rugs: 12
- 09 decor: 12
- 11 auras: 12

Of those 82, **59 are newly authored repository-staged candidates** and **23 are pre-existing interim companion/aura assets**.

Desk lane 03 has generated **3 local premium candidates** (`desks-2`, `desks-3`, `desks-4`) with 512×512 WebP derivatives, but **0 desk candidates are repository-staged**. Eight assigned desk IDs still have no generated candidate.

Lane 06 also records a richer companion intake under `public/assets/catalog-candidates/chat-20260921-intake01/`: **10 companion item IDs / 30 stored binary files**. Four are first-review candidates (`companions-3`, `companions-4`, `companions-10`, `companions-11`), six are held for theme direction, and `companions-9` has no rich candidate.

## V2 review state

Three review shards now exist and contain actual rendered-pixel decisions:

- **01 / Tops:** 12 reviewed, **0 ACCEPT / 12 REWORK / 0 BLOCKED**
- **02 / Seating 2–12:** 11 reviewed, **0 ACCEPT / 11 REWORK / 0 BLOCKED**
- **05 / Auras:** 12 reviewed, **0 ACCEPT / 12 REWORK / 0 BLOCKED**

That is **35 current hashes reviewed, 35 REWORK, 0 ACCEPT**.

The rework findings are consistent: the current versions are identifiable and generally readable, but they are too flat/vector-like and lack the dimensional materials, three-quarter construction, lighting depth and higher-tier spectacle required by the screenshot target.

`reviews/14.json` is still absent. However Workstream 14 has now added a branch-local staged-art QA workflow and lighting contact-sheet path, so the review-before-wiring deadlock is materially reduced. The next independent review dependency is 14's exact-hash lighting/wall/rugs/decor decisions.

## Binary asset import path — proven

Workstream 08 established and verified a supported binary-to-GitHub path without Replit, Floot, paid services or force pushes.

Probe:

- repository path: `docs/preproduction/catalog-sprint/binary-upload-probe.png`
- commit: `4db259027bc5d80513f81cee1d4ceb757ad0c493`
- Git blob SHA: `95b4328446e6af8fabd920f3330f6c688889ad94`
- decoded SHA-256: `391590d092f57b13968ea0174fda8726918550f84594de498c72482f1f2e9623`
- bytes: **68**
- dimensions: **2×2 PNG**
- exact base64 readback: **PASS**

Supported sequence:

1. encode actual generated file bytes as base64;
2. `create_blob(encoding=base64)`;
3. attach the blob with `create_tree(base_tree_sha=latest tree)`;
4. `create_commit(parent_sha=latest head)`;
5. `update_ref(force=false)`;
6. `fetch_file(encoding=base64)` and decode;
7. verify exact SHA-256 / dimensions / bytes.

A direct binary `fetch_blob` attempted UTF-8 decoding and is not the readback surface to use. `fetch_file(..., encoding=base64)` is the proven binary readback path.

I also attempted to materialize Lane 03's historical generated-file ID from this automation. The file is not visible across automation conversations, so Workstream 08 cannot recover those exact historical desk bytes here. **Lane 03 should upload the already-generated desks from its own run where the files are visible, using the proven blob/tree/commit/ref sequence; it should not regenerate them.**

## Canonical integration decision

Integrated IDs this pass: **0**.

This is not a missing-review-file deadlock anymore. Review evidence now exists, but every reviewed current hash is REWORK. Under V2, one qualified independent ACCEPT would be enough to integrate that exact hash immediately. There simply is no accepted hash yet.

Therefore `catalog-art-manifest.json` and `src/catalogArtRuntime.js` remain unchanged.

No post-integration catalog regression/build was rerun because there was no canonical mapping change. The stable catalog manifest/runtime hashes are still:

- manifest: `862894db70500087409396dc5a72d032cf00a693`
- runtime: `fcf502b18a51781b415b7ba3620e9b8eb66d37e3`
- game model: `79fdb8c3bed4d715e0b1c770f34db0037a7f7c3b`

## Exact next dependencies

1. **14:** run/reuse the staged-art fixture and publish `reviews/14.json`, beginning with `lighting-1..12`, then wall/rugs/decor.
2. **05:** review the repository-stored richer companion candidates (`companions-3`, `-4`, `-10`, `-11`) from actual pixels, then continue companions/beds/desks when available.
3. **03:** use the proven binary Git path to stage the existing `desks-2..4` derivatives and read back exact hashes. Do not regenerate them.
4. **15:** route repair production for current REWORK families — Tops, Seating, Auras — to producers who are independent from the reviewer of the replacement hash.
5. **08:** consume the first qualified exact-hash ACCEPT immediately; validate path/metadata/hash, update manifest/runtime, then run the affected catalog tests/build for that coherent batch.

The catalog phase remains active. Workstream 15 alone may change phase after the complete 192-item gate passes.
