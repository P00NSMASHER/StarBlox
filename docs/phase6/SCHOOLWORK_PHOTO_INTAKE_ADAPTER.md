# Automatic Schoolwork Photo Intake Adapter

This is the Block 2 intake boundary for future schoolwork-photo batches.

It deliberately does **not** ingest or persist image bytes. A photo-analysis step must first reduce each page to a small structured observation payload. The adapter then converts that sanitized payload into the existing StarBlox schoolwork source-pack format and parent-review queue.

## Privacy boundary

The intake schema is allowlisted. Fields outside the documented schema fail closed.

Do not place any of the following in an intake payload:

- student names or other identity;
- raw OCR or worksheet text;
- student answers/responses;
- teacher marks or comments;
- grades or scores;
- image paths, filenames, bytes, or image hashes.

The generated source pack also retains the existing all-false privacy contract.

## Intake schema

```json
{
  "schemaVersion": 1,
  "intakeVersion": "schoolwork-photo-intake-v1",
  "batchId": "schoolwork-YYYY-MM-DD-001",
  "capturedDate": "YYYY-MM-DD",
  "pages": [
    {
      "pageRef": "page-01",
      "sourceCategories": ["phonics", "word-study"],
      "observations": [
        {
          "generatorKey": "short-vowel-identification",
          "confidence": 0.97,
          "coverageWeight": 5
        },
        {
          "reasonCode": "skill-classification-unclear",
          "candidates": [
            {
              "generatorKey": "reading-main-character",
              "confidence": 0.74,
              "coverageWeight": 4
            },
            {
              "generatorKey": "reading-setting",
              "confidence": 0.69,
              "coverageWeight": 4
            }
          ]
        }
      ]
    }
  ]
}
```

Supported source categories are:

- `phonics`
- `word-study`
- `spelling`
- `vocabulary`
- `reading-comprehension`
- `religion`

The adapter accepts only generator keys already implemented by the schoolwork question pipeline.

## Decision rules

- A single candidate at confidence **0.85 or greater**, with no ambiguity reason, is accepted automatically.
- Plausible candidates at confidence **0.55 or greater** that are ambiguous or below the auto-accept threshold are placed in `reviewQueue` with status `needs-review`.
- Candidates below **0.55** are omitted rather than guessed.
- Repeated auto-accepted skills are deduplicated and the strongest coverage weight is retained.
- Parent-review candidates remain inert until the existing review gate explicitly marks one candidate `accepted`.

## Command

```bash
npm run schoolwork:photos:intake -- path/to/sanitized-intake.json
```

Default outputs:

- `docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json`
- `docs/phase6/SCHOOLWORK_PHOTO_INTAKE_RECEIPT.json`

Custom output paths:

```bash
npm run schoolwork:photos:intake -- path/to/intake.json \
  --source-out /tmp/source.json \
  --receipt-out /tmp/intake-receipt.json
```

Then run the existing gate:

```bash
npm run schoolwork:photos:validate
```

That second gate applies parent-review decisions, validates the effective source pack, generates the question catalog, selects active questions, and writes the existing review receipt.

## Fail-closed behavior

The adapter returns a non-zero exit status and writes no output when:

- the input schema/version is wrong;
- page references are invalid or duplicated;
- a source category or generator key is unsupported;
- confidence or coverage values are invalid;
- more than three candidates are supplied for one observation;
- any unexpected field is present;
- the generated source pack or review queue fails the downstream validators.
