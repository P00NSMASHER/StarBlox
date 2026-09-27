# Schoolwork Photo Pipeline — Block 6 End-to-End Certification

Block 6 closes the schoolwork-photo pipeline as one fail-closed production transaction.

The certified path is now:

`sanitized source + parent review state -> skill evidence -> original equivalent questions -> Grade 2 QA -> Roblox runtime artifacts -> certification receipt`

## What Block 6 changes

### Parent review is production-authoritative

The source hash now includes the review queue whenever review items exist. Changing an item from `needs-review` to `accepted` or `rejected` therefore changes the certified schoolwork source identity.

An accepted candidate is applied before production question generation. It is no longer possible for the parent-review receipt to say “accepted” while the production question bank silently ignores that skill.

### Skill evidence uses the same reviewed source

Legacy/source-pack evidence generation also applies the review gate. Parent-accepted skills enter aggregate runtime evidence conservatively as:

- attempted: true;
- likelyCorrect: unknown;
- confidence: 0.5;
- reviewStatus: `parent-accepted-skill-only`.

Structured intake retains the richer attempted/correctness/confidence evidence already implemented in Block 3.

### One certification receipt

`npm run schoolwork:photos:certify` verifies that all of these agree:

- `SCHOOLWORK_PHOTO_SOURCE.json`;
- `SCHOOLWORK_SKILL_OBSERVATIONS.json`;
- `SCHOOLWORK_SKILL_OBSERVATION_RECEIPT.json`;
- `SCHOOLWORK_PHOTO_QUESTION_CATALOG.json`;
- `SCHOOLWORK_PHOTO_REVIEW_RECEIPT.json`;
- `ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json`;
- `SchoolworkSkillEvidence.luau`;
- `CoreQuestionBank.luau`.

It checks source hashes, batch IDs, observation hashes, review counts, active-question IDs, equivalent-item metadata, production generator version, privacy contracts, and runtime bindings.

If any artifact is stale or belongs to a different reviewed source, certification fails and no certification receipt is written.

## Automated refresh

The ABVM question-sync workflow now rebuilds the aggregate skill-evidence artifacts before rebuilding the question bank, runs all schoolwork-specific QA, performs the final end-to-end certification, and commits all generated artifacts together only after every gate passes.

This prevents half-updates such as:

- new questions with old skill evidence;
- accepted review decisions with an unchanged question bank;
- a new source pack with stale Roblox evidence;
- a changed generator with an old checked-in production bank.

## Privacy boundary

Block 6 does not add raw images, OCR text, student names, student responses, teacher marks, grades, scores, filenames, image paths, or image hashes to the repository or Roblox runtime.

Only the sanitized skill-level artifacts from the earlier blocks participate in certification.
