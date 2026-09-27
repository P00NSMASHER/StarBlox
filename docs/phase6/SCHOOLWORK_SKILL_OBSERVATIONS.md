# Schoolwork Skill Observations — Block 3

Block 3 converts privacy-safe schoolwork-photo evidence into structured learning observations that StarBlox can use without retaining the worksheet itself.

## Observation model

A structured intake observation may now carry:

- `attempted`: whether the observed item was attempted;
- `likelyCorrect`: `true`, `false`, or `null` when correctness is unknown;
- `confidence`: confidence in the sanitized skill classification.

The persisted observation artifact contains only skill-level metadata:

- skill and domain;
- generator/station identifiers;
- attempted status;
- likely-correct status;
- confidence;
- whether the signal was auto-accepted, parent-accepted, or legacy skill-only.

It does not contain raw images, OCR text, worksheet wording, student answers, teacher marks, grades, scores, filenames, image paths, or image hashes.

## Parent-review behavior

Ambiguous observations remain inert while their review item is `needs-review`. If a parent accepts one candidate, exactly that candidate becomes an active skill observation. Rejected observations never enter active evidence.

## Legacy batch

The September 26 source pack predates per-item correctness preservation. Its 12 accepted skill signals are represented conservatively as:

- `attempted = true`;
- `likelyCorrect = null`;
- `confidence = 0.5`.

StarBlox therefore knows those skills are current schoolwork, but does not fabricate whether the child got them right or wrong.

## Runtime seam

`roblox/src/shared/SchoolworkSkillEvidence.luau` contains aggregate current-skill facts only. `LearningPriority` treats those skills as current material through its existing `CurrentMaterialWeight` term.

Block 3 intentionally does **not** give teacher-marked correctness extra ranking weight. That evidence hierarchy belongs to Block 4.

## Regeneration

Legacy/source-pack mode:

```bash
npm run schoolwork:photos:skill-observations
```

Structured-intake mode:

```bash
npm run schoolwork:photos:skill-observations -- \
  --intake path/to/sanitized-intake.json \
  --source docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json
```

Outputs:

- `docs/phase6/SCHOOLWORK_SKILL_OBSERVATIONS.json`
- `docs/phase6/SCHOOLWORK_SKILL_OBSERVATION_RECEIPT.json`
- `roblox/src/shared/SchoolworkSkillEvidence.luau`
