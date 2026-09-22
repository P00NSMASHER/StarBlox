# StarBlox Art Factory v2

Status: **ACTIVE PREPRODUCTION SIDECAR**  
Repository/branch: `P00NSMASHER/StarBlox@screenshot-match-preproduction`

This factory accelerates art production. It does **not** change gameplay, canonical art, catalog metadata, saves, economy, learning logic, deployment, or release authority.

## Authority and rights

- The user has explicitly attested that StarBlox has full rights to use the model weights/checkpoints selected for this project.
- That clears the previous model/checkpoint-rights hold for StarBlox production pilots.
- Exact model ID + revision must still be recorded for reproducibility.
- Repository code licenses, datasets/training/reference assets, external APIs, custom nodes, and third-party services remain separate rights domains.
- No credentials, private data, leaked/confidential material, exploit paths, or unauthorized-access material may enter prompts, references, provenance, artifacts, or logs.

## Authoritative production path

1. **Reconcile live state**
   - Read `docs/preproduction/ART_VISUALS_SPRINT.json`, current lane/review/integration evidence, this runbook, and compatible `DELIVERY_PROTOCOL_V2.md`.
   - Preserve every independently ACCEPTed exact current hash.
   - Do not regenerate a blocked transfer problem or a candidate that is merely waiting on review.

2. **Build a repair-specific prompt**
   - Use `scripts/artPromptOptimizer.mjs`; do not fork prompt logic into provider-specific stores.
   - Tie every prompt to exact Store metadata and the exact review defect being repaired.
   - Default to **2–4 variants** per bounded pilot.

3. **Generate deterministically where the runtime supports it**
   - Preferred code foundation: Diffusers + ControlNet/IP-Adapter.
   - Record prompt SHA-256, seed, runtime repo/commit, exact model/checkpoint revision, conditioning/reference hashes, dimensions, sampler/scheduler where exposed, and output hashes.
   - Use a stable seed per attempt; never call two outputs the same attempt.

4. **Create derivatives without destroying source bytes**
   - Transparent-background removal/matting, crop/card derivatives, optimization, and optional super-resolution are separate versioned derivatives.
   - Preserve the source asset and hash.
   - PyMatting is preferred for deterministic alpha-edge refinement when a foreground mask/trimap path exists.
   - rembg/LayerDiffuse/Real-ESRGAN are optional only when their use measurably improves the actual Store render.

5. **Run report-only machine preflight**
   - Exact SHA-256/Git blob equality is the hard duplicate identity check.
   - pHash/dHash/color-hash and optional SSIM are evidence only until calibration against enough independently labeled ACCEPT/REWORK history.
   - Never auto-ACCEPT or auto-REWORK solely from perceptual metrics.

6. **Stage exact bytes in GitHub**
   - Candidate must exist at a versioned repo path on `screenshot-match-preproduction`.
   - Read it back and record path, Git blob SHA, SHA-256, byte count, dimensions, producer, attempt ID, prompt hash, seed, model revision and derivative lineage.
   - Local-only, artifact-only and Git-object-only bytes are not reviewable catalog candidates.

7. **Render in the real StarBlox context**
   - Produce actual card/detail pixels using the existing staged-art fixture.
   - For scene/character work, render the actual target surface and required desktop/phone/tablet evidence.
   - Synthetic contact sheets may help triage but never replace real rendered evidence.

8. **Independent exact-hash review**
   - Reviewers 01/02/05/14 retain disjoint catalog partitions and cannot approve their own produced art.
   - Review must bind to the exact current candidate hash and actual pixels.
   - A changed hash requires a new review; an old verdict never transfers automatically.

9. **Canonical integration**
   - Workstream 08 alone writes `catalog-art-manifest.json` and `src/catalogArtRuntime.js`.
   - Integrate only a genuinely new, independently ACCEPTed exact current hash after metadata/file/decode/uniqueness checks.
   - Preserve build/regression failures as blockers; never weaken a gate to make art pass.

10. **Learn from outcomes**
   - Record prompt blocks/attempt metadata and exact-hash review outcome.
   - Let `artPromptOptimizer` learn only from independent exact-hash outcomes.
   - Prefer recipes with evidence of higher acceptance, better small-card readability, better reference fidelity and lower duplicate rate.

## Determinism and provenance minimum

Every generated source candidate must be traceable to:

```json
{
  "attemptId": "unique",
  "itemId": "decor-3",
  "promptSha256": "...",
  "seed": 12345,
  "runtime": {"repo": "huggingface/diffusers", "commit": "..."},
  "models": [{"modelId": "...", "revision": "...", "rightsBasis": "USER_ATTESTED_FULL_RIGHTS"}],
  "conditioning": {
    "referenceAssetSha256": null,
    "controlImageSha256": null,
    "adapterScale": null
  },
  "output": {
    "repoPath": "...",
    "sha256": "...",
    "gitBlobSha": "...",
    "bytes": 0,
    "width": 1024,
    "height": 1024
  }
}
```

If a runtime cannot expose a parameter, write `null`; do not invent it.

## Preferred accelerator stack

See `ART_FACTORY_V2.json` for pinned revisions and reuse status. Current preferred ordering:

- Diffusers → generation runtime.
- IP-Adapter / ControlNet → reference identity/style/structure consistency.
- PyMatting → alpha-edge refinement.
- ImageHash (+ optional SSIM) → report-only perceptual triage.
- rembg / LayerDiffuse → optional transparent-background paths.
- Real-ESRGAN → optional derivative restoration/upscale.
- InvokeAI → optional queue/API orchestration if scale warrants it.
- ComfyUI → isolated workflow-authoring option, not the default runtime; code/custom-node/model licensing must remain explicit.

## Anti-stall rules

- Never wait on a blocked byte transfer when a non-conflicting assigned REWORK candidate is available.
- Never regenerate an ACCEPTed exact hash.
- Never scale a recipe past 2–4 items before independent disposition.
- Never repeat an unchanged failed transport/generation/review action just to create activity.
- When no owned candidate is actionable, improve evidence, calibration, tooling, or a non-overlapping visual study in the worker's assigned scope.
- Status-only commits are not progress.

## Deterministic job compiler

Before invoking any generator for an actionable REWORK/unaccepted item, compile the optimizer recommendation into a provider-neutral job manifest:

```bash
node scripts/artFactoryJob.mjs plan --repo-root . --item decor-3 --producer 09 \\
  --model-id <exact-model-id> --model-revision <exact-revision> --variants 4 \\
  --output artifacts/art-factory-jobs/decor-3.json
node scripts/artFactoryJob.mjs validate --job artifacts/art-factory-jobs/decor-3.json
```

The compiler refuses ACCEPTed/non-generating recommendations, enforces the 2–4 variant pilot, derives stable unique seeds from item+prompt+variant, binds the user-attested model-rights basis, records exact runtime/model revisions, and emits no fake output hashes before generation. The job manifest is the handoff into Diffusers/IP-Adapter, InvokeAI, an authorized image tool, or another approved generator; after real bytes exist, normal exact-byte staging/readback/render/review rules apply.

## Verified staged-output handoff

After a generator produces real bytes, bind them back to the deterministic job before render/review:

```bash
python docs/preproduction/art-factory/verify_staged_output.py verify \
  --repo-root . \
  --job artifacts/art-factory-jobs/decor-3.json \
  --attempt-id <exact-attempt-id> \
  --repo-path public/assets/catalog/decor-3-w09-v4.png \
  --output artifacts/art-factory-outputs/decor-3-w09-v4.json
```

The verifier checks the compiled plan hash, branch, user-attested model-rights basis, exact attempt/item/producer binding, versioned catalog path, independent reviewer routing, raster decode, dimensions, byte count, SHA-256 and Git-blob SHA. It emits `STAGED_EXACT_BYTES_VERIFIED` with review still pending. It cannot ACCEPT/REWORK art and cannot write canonical catalog/runtime files. Source bytes remain preserved; derivatives must record their parent SHA-256.

This closes the factory chain as: **review defect → optimizer → deterministic job → generation → exact-byte verifier → real render → independent exact-hash review → Workstream 08 canonical integration → outcome learning**.

## Validation

Manual preflight workflow: `.github/workflows/art-factory-preflight.yml`.

It verifies the prompt optimizer independently with Node's test runner, installs the exact pinned accelerator code revisions, runs the report-only perceptual/matting/provenance pilot, and uploads evidence. It intentionally does not run paid APIs, deploy, or infer production pixels on a CPU-only runner.


## Structured review corpus

Before prompt learning or regeneration decisions, normalize the independent exact-hash review ledgers:

```bash
node scripts/artReviewNormalizer.mjs \
  --repo-root . \
  --output artifacts/art-factory-pilot/review-corpus.json
```

The corpus preserves the human reason and exact asset hash while deriving a small machine-readable failure taxonomy such as `FLAT_COMPOSITION`, `WEAK_DEPTH`, `THEME_MISMATCH`, `SMALL_CARD_READABILITY`, and `NEAR_DUPLICATE_TEMPLATE`. These labels are learning inputs only: they never replace the reviewer's prose and never transfer an old verdict to a new hash. Self-review is explicitly marked non-independent and must not train the prompt optimizer.

## Provider-independent visual preflight

Run objective image evidence before spending reviewer time:

```bash
python scripts/catalogVisualPreflight.py self-test

python scripts/catalogVisualPreflight.py scan \
  --input public/assets/catalog/<candidate>.png \
  --neighbors public/assets/catalog \
  --output artifacts/art-factory-pilot/<candidate>-preflight.json
```

The preflight records source/thumbnail luminance range, entropy, edge density, alpha/content coverage, exact hashes, aHash/dHash signatures and nearest perceptual neighbors. It is deliberately **report-only** until thresholds are calibrated against enough independently labeled ACCEPT/REWORK examples. Exact byte identity remains authoritative for duplicate identity; perceptual metrics can warn but cannot ACCEPT or REWORK artwork.
