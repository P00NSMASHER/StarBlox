# StarBlox architecture contracts

This document defines the stable internal contracts that imported and newly built systems must target.

## Rules

1. StarBlox owns the canonical schema. Upstream projects adapt into it; they do not become the schema.
2. Persisted content and gameplay references use immutable version/hash pairs.
3. Deterministic systems record the engine/generator version and seed needed to reconstruct their output.
4. Content sources and implementation sources are separate provenance domains.
5. Existing v2 local player saves remain untouched until a later step explicitly migrates them.

## Canonical records

| Record | Purpose | Current schema |
| --- | --- | ---: |
| Question | Stable question identity + pointer to current version | 1 |
| QuestionVersion | Immutable prompt/choices/key/explanation/source snapshot | 1 |
| QuestionAttempt | Player response bound to an exact QuestionVersion hash | 1 |
| PlayerConceptState | Future FSRS/IRT state per player and concept | 1 |
| DailyBundle | Immutable daily content/gameplay release envelope | 1 |
| ReplayManifest | Deterministic replay identity and integrity envelope | 1 |
| ImplementationProvenance | Upstream repo + branch + full commit + path/reuse basis | 1 |

The executable constructors and validators live in `src/domainSchemas.js`.

## Question migration boundary

The current production bank remains a flat JavaScript structure consumed directly by the UI. Step 1 does not rewrite those 200 objects.

`canonicalizeLegacyQuestion()` creates the canonical representation when a subsystem needs versioned identity. This allows the existing Quest flow and QA suite to continue unchanged while later systems move onto the canonical contract.

A canonical question binds:

- stable question ID;
- content version;
- content hash;
- subject, district, skill and role;
- exact prompt/choices/answer/explanation/hint;
- difficulty/reward/mastery eligibility;
- content-source provenance.

Changing question content changes its hash. Future edits to a production question should increment its content version rather than silently replacing an existing version.

## Daily reconstruction boundary

A DailyBundle must record:

- Daily ID/date and deterministic seed;
- generator version;
- gameplay engine version;
- question-bank snapshot version/hash;
- balance version;
- exact question ID/version/content-hash references;
- level specification;
- solution certificate;
- compatibility result;
- deterministic bundle hash.

Later Daily-generation work must produce this shape before publication.

## Replay boundary

A ReplayManifest binds:

- replay ID;
- engine version;
- seed;
- initial-state hash;
- action codec;
- action count;
- action hash;
- final summary hash;
- manifest hash.

The manifest intentionally does not define the action codec itself. Step 2 will derive that deterministic action stream from the gameplay engine.

## Upstream implementation provenance

`src/upstreamProvenance.js` pins the source snapshot for every planned imported capability to a full Git commit.

The `reuseBasis` field records the project owner's confirmation of direct reuse rights. `repositoryLicense` preserves public upstream metadata for engineering provenance and does not override that separate rights basis.

When code is actually imported, the corresponding provenance record should be narrowed with the exact upstream path and referenced by the local adapter/module.

## Hashing

Step 1 uses a small deterministic FNV-1a 32-bit content hash because it works identically in browser JavaScript without introducing a dependency.

It is an identity/change-detection hash, not a cryptographic signature. A later server-authoritative release/signing layer may add SHA-256/signatures without changing the schema's version/hash contract.
