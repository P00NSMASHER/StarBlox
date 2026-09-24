# Question Bank V2

Step 7 moves StarBlox from a flat runtime array toward a durable content-bank model without disrupting the current Quest UI.

## Source lineage

The design is directly adapted from two cleared production systems.

### Open edX

Commit:

`648d08b9f61695fea2e586abdb79beb527c7eee5`

Primary paths:

- `xmodule/item_bank_block.py` — persistent per-user subset assignment, invalid/over-limit/add semantics, stable assignment until the pool changes.
- `xmodule/capa_block.py` — attempt/grading/randomization semantics.

### gygy question-bank

Commit:

`6ccd09d670faad4de760cffffe26d4ef66a972b3`

Primary paths:

- `backend/app/models/question.py` — draft/pending/published/archived lifecycle and explicit content revision.
- `backend/app/crud/crud_question.py` — content revision increments only when publishable content actually changes.
- `backend/app/services/question_content.py` — centralized domain validation and strict content structure.

## Bank shape

Question Bank V2 stores each stable question ID once and keeps every immutable content version underneath it.

A bank question tracks:

- stable question ID;
- lifecycle: draft / pending / published / archived;
- current version + hash;
- subject/district/skill/role;
- concept IDs;
- tags;
- attempt/explanation policy;
- immutable version map.

Only `published` questions enter the default production snapshot.

## Legacy import

`importLegacyQuestionBank(gameModel.buildQuestions())` converts all current 200 production questions into published v1 records using the canonical Question/QuestionVersion contract from Step 1.

The existing `gameModel.buildQuestions()` array remains unchanged for the current UI. Step 7 is additive.

## Immutable revisions

`reviseQuestion()` creates a new `QuestionVersion` only if content actually changes.

Content includes:

- prompt;
- choices;
- answer;
- explanation;
- hint;
- difficulty/reward;
- source/provenance;
- subject/district/skill/role;
- mastery eligibility.

Metadata-only changes do not create fake content revisions.

Lifecycle, tags, concept membership and attempt policy increment the **bank revision** but leave the content version untouched.

## Published snapshots

`createQuestionBankSnapshot()` returns exact current refs:

`{questionId, version, contentHash}`

sorted by stable question ID.

Its content hash is based on published refs, not the bank revision number. Therefore changing a draft tag or other non-published metadata does not invalidate an otherwise identical production question-bank snapshot.

This is the snapshot contract later DailyBundles will freeze.

## Persistent assignments

`assignQuestionsFromBank()` follows the Open-edX ItemBank pattern:

1. keep previously assigned exact refs that remain valid;
2. remove refs that became invalid/archived/ineligible;
3. trim if the requested count decreased;
4. deterministically fill missing slots from the current eligible pool.

The result reports `invalid`, `overlimit` and `added` changes.

Assignments store exact versions, not loose IDs. Publishing v2 of an already-assigned question therefore does not silently rewrite an in-progress player's assignment.

`refreshAssignmentVersions()` is an explicit operation for moving pinned assignments to current versions.

`resetAssignment()` is disabled unless the caller explicitly opts in, mirroring mature LMS reset semantics rather than silently reshuffling learners.

## Attempt history

Step 1 already defined `QuestionAttempt`.

Step 7 adds a version-aware attempt ledger and four grading summaries inspired by Open edX:

- latest;
- first;
- highest;
- average.

Attempts retain exact question version/hash identity, so historical scoring remains interpretable after future revisions.

## Future integration

Question Bank V2 is intentionally independent of AI generation.

The next generation pipeline can submit candidate content into this bank as draft/pending records, and only validated/published versions will be eligible for production snapshots and player assignments.

## Scope boundary

Step 7 does not:

- generate questions with an LLM;
- change the current Quest selector;
- migrate player saves;
- deploy a content database/backend;
- replace the current UI question array.

It establishes the versioned content and assignment model first.
