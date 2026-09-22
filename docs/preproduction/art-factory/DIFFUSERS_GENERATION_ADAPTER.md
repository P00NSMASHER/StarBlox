# Diffusers generation adapter

The StarBlox Art Factory now has a concrete generation bridge between
`scripts/artFactoryJob.mjs` and
`docs/preproduction/art-factory/verify_staged_output.py`.

## Safety boundary

The generator may only:

- consume an existing `STARBLOX_ART_FACTORY_JOB`;
- generate a versioned PNG under `public/assets/catalog/`;
- emit a generation receipt.

It may **not** review art, write `catalog-art-manifest.json`, edit
`src/catalogArtRuntime.js`, deploy, or modify gameplay/state.

## Cheap contract verification

```bash
python scripts/artFactoryDiffusers.py self-test
python scripts/test_artFactoryDiffusers.py
```

These commands do not import torch/Diffusers and require no model download.

## Dry-run a compiled job

```bash
python scripts/artFactoryDiffusers.py dry-run \
  --repo-root . \
  --job artifacts/art-factory-jobs/decor-5.json \
  --attempt-id <attempt-id> \
  --repo-path public/assets/catalog/decor-5-w09-v4.png \
  --receipt artifacts/art-factory-generation/decor-5-v4.dry-run.json
```

Dry-run validates:

- immutable plan hash;
- exact item/producer/version path;
- deterministic seed;
- pinned Diffusers repository commit;
- exact base-model ID + revision;
- rights basis;
- reference-image hash binding.

## Real generation

Install an environment containing torch and Diffusers from the Art Factory
pinned revision, plus the chosen model dependencies. Then run:

```bash
python scripts/artFactoryDiffusers.py generate \
  --repo-root . \
  --job artifacts/art-factory-jobs/decor-5.json \
  --attempt-id <attempt-id> \
  --repo-path public/assets/catalog/decor-5-w09-v4.png \
  --receipt artifacts/art-factory-generation/decor-5-v4.json \
  --device cuda \
  --dtype float16
```

The job manifest is the authority for base-model identity, revision, prompt,
seed, and the StarBlox rights basis. The adapter refuses to ignore a
`controlImageSha256`; ControlNet support must be added explicitly rather than
silently dropping bound conditioning.

### Optional IP-Adapter reference conditioning

The job must already bind `referenceAssetSha256`. Then provide the exact local
reference bytes and exact adapter identity:

```bash
python scripts/artFactoryDiffusers.py generate \
  ... \
  --reference-image docs/preproduction/references/<owned-reference>.png \
  --ip-adapter-model-id <repo-id> \
  --ip-adapter-revision <exact-revision> \
  --ip-adapter-weight-name <weight-file>
```

The adapter hashes the local reference and refuses generation if it does not
match the job.

## Mandatory next gate

A successful generation receipt has status:

`GENERATED_SOURCE_BYTES_UNVERIFIED`

It is **not** an art acceptance. Immediately bind the real source bytes back to
the deterministic job:

```bash
python docs/preproduction/art-factory/verify_staged_output.py verify \
  --repo-root . \
  --job artifacts/art-factory-jobs/decor-5.json \
  --attempt-id <attempt-id> \
  --repo-path public/assets/catalog/decor-5-w09-v4.png \
  --output artifacts/art-factory-outputs/decor-5-v4.json
```

Then continue through the existing real-render, independent exact-hash review,
and Workstream 08 integration gates.
