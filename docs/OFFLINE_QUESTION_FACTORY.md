
# Offline Question Factory — Steps 8 and 9

Steps 8 and 9 add the generation and quality-control layers above Question Bank V2.

## Source lineage

This design is directly adapted from the cleared Recall.cs generation stack at commit:

9cfaa8b7537f61413c2739e9d1df99ff9bb73f4d

Primary source paths:

- eval/generation/generate_qa.py
- eval/generation/batch_generate.py
- eval/generation/validate_qa.py
- eval/generation/score_questions.py
- eval/generation/llm_review.py

The central production rule is preserved: normal StarBlox gameplay never waits for a live model. Questions are generated, reviewed, validated, deduplicated, evidence-linked, checkpointed, and placed into the bank before they become eligible for production.

## Step 8 — offline generation

runOfflineGeneration accepts source chunks, a provider adapter with generate(request), a generation run ID, and a resumable checkpoint.

The provider can be a local model, a hosted model API, or a test fixture. The core factory has no provider SDK dependency.

Every candidate receives:

- a stable generated candidate ID;
- source chunk ID, header, source and subject context;
- concept IDs;
- atomic facts;
- exact evidence quotes;
- generation run/provider/model metadata.

A processed chunk is checkpointed whether generation succeeds or fails. Re-running with the same checkpoint skips already processed chunks. A missing checkpoint starts a new run; an existing unreadable or invalid checkpoint is not silently ignored.

The command:

npm run questions:generate -- --chunks path/to/chunks.json --provider path/to/provider.mjs --checkpoint path/to/checkpoint.json

loads any provider module that exports generate(request). This is an operator/offline workflow, never a live Quest dependency.

## Step 9 — validation and quality control

validateGeneratedCandidates layers independent quality gates.

### Structural validation

The deterministic gate requires:

- a meaningful prompt;
- exactly three unique choices;
- exactly one keyed answer;
- explanation and hint;
- subject, district, skill and role;
- bounded difficulty/reward;
- at least one atomic fact.

### Source evidence

Model-supplied evidence is not trusted on declaration alone.

Every quote must be an exact case- and punctuation-preserving substring of a supplied source chunk after whitespace normalization only. The original generation source chunk must have at least one verified quote. Verified evidence records retain the exact quote plus a stable source-chunk hash for ingestion provenance.

### Independent reviewer

A reviewer adapter returns keep, rewrite, or reject with a 0–100 score and reasons.

Strict mode is fail-closed. Missing or failed review means rejection.

Reviewer rewrites are treated only as candidate edits. Rewritten content must pass the same structural and source-evidence gates again.

### Supporting chunk links

A deterministic local lexical pass attaches the original source chunk plus relevant supporting chunks. It does not require network retrieval.

### Deduplication

Accepted candidates are compared with one another and with every historical Question Bank V2 prompt. Exact normalized matches and high Jaccard similarity are rejected as duplicates.

### Ingestion

ingestValidatedCandidates is a fail-closed release boundary.

It accepts only candidates carrying a successful strict-review receipt with clean structural and evidence gates, and it always inserts them as pending. The generated ingestion API does not permit callers to override lifecycle to published.

The stored Question Bank provenance retains:

- the originating source chunk and source-chunk hash;
- the generation run and candidate ID;
- the strict reviewer decision, score, effective score, and threshold receipt hash;
- every verified evidence quote and its source-chunk hash.

Pending questions are excluded from production snapshots. Generation plus validation therefore cannot publish content automatically.

Hybrid and deterministic validation modes remain useful for diagnostics and offline analysis, but their accepted candidates cannot cross the ingestion boundary. A separate publishing decision is still required.

## Live-game invariant

The current Quest UI and answer loop remain independent of the factory.

No LLM call is necessary to start, answer, retry, or finish a normal player Quest.
