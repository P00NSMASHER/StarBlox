# Original Equivalent Schoolwork Questions — Block 5

Block 5 converts sanitized skill evidence into fresh practice items instead of reconstructing worksheet questions.

## Anti-cloning boundary

The equivalent-item factory receives only:

- a supported `generatorKey`;
- a deterministic positive variant number.

It does **not** receive the source pack, page reference, OCR text, worksheet wording, student response, teacher mark, image path, or image hash.

This makes the source transformation one-way:

`schoolwork photo -> sanitized skill -> original equivalent item`

## Deterministic variants

Each supported schoolwork skill has at least two invented surface variants. Every variant contains:

- one direct item;
- one transfer item;
- one reasoning item.

Variant selection in the production ABVM sync is derived deterministically from the certified schoolwork source hash. The same certified snapshot therefore rebuilds identically; a changed certified schoolwork snapshot can select a different invented surface set.

Each equivalent question is tagged with:

- `provenance = original-practice-derived-from-sanitized-schoolwork-photos`;
- `sourceTransform = skill-only-equivalent-item-v1`;
- `originalEquivalent = true`;
- `generationVariant`.

The metadata participates in the production question content hash.

## Manual validation

```bash
node scripts/validate-schoolwork-photo-pack.mjs \
  docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json \
  --generation-variant 1 \
  --catalog-out /tmp/schoolwork-equivalent.json \
  --receipt-out /tmp/schoolwork-equivalent-receipt.json
```

Use `--generation-variant 2` to produce the second equivalent surface set.

## Default compatibility

Calling `buildSchoolworkQuestionCatalog` with generation variant `0` keeps the existing baseline schoolwork catalog behavior. Production sync uses a positive deterministic equivalent variant.
