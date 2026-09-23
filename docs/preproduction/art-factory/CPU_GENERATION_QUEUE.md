# StarBlox CPU generation queue

This queue is the bounded production handoff for the deterministic CPU fallback.
It does not approve art and it never writes canonical catalog mappings.

Create exactly one JSON file per batch under
`docs/preproduction/art-factory/runtime-queue/`.
The push workflow accepts 1–4 current item IDs from one existing
`STARBLOX_ART_FACTORY_BATCH_REQUEST`.

Required fields:

```json
{
  "schemaVersion": 1,
  "kind": "STARBLOX_ART_FACTORY_CPU_GENERATION_QUEUE",
  "queueId": "unique-batch-id",
  "branch": "screenshot-match-preproduction",
  "requestPath": "docs/preproduction/art-factory/requests/<request>.json",
  "producer": "13",
  "modelId": "stabilityai/stable-diffusion-xl-base-1.0",
  "modelRevision": "462165984030d82259a11f4367a4eed129e94a7b",
  "runtimeCommit": "7263f3317f6b392d62f41e9d75ed9d7e21fc5a5c",
  "items": ["wall-9"],
  "variantByItem": {"wall-9": "A-GALLERY-RAIL"},
  "reviewerByItem": {"wall-9": "02"},
  "versionByItem": {"wall-9": 1},
  "generation": {
    "width": 1024,
    "height": 1024,
    "steps": 12,
    "guidanceScale": 3.5,
    "dtype": "bfloat16"
  }
}
```

The queue consumer validates the pinned runtime/model, compiles the existing
request through `artFactoryJob.mjs plan-request`, generates one selected
attempt per item on isolated hosted CPU runners, verifies exact bytes with
`verify_staged_output.py`, then commits only versioned candidate bytes and
hash-bound evidence back to `screenshot-match-preproduction`.

A queue is invalid if the durable CPU runtime proof or any referenced proof
evidence fails `scripts/verifyCpuRuntimeProof.py`, an item is outside the
request scope, the reviewer is not 01/02/05/11/14, the reviewer equals the
producer, or any path/version/provenance binding fails. The verifier binds the
successful workflow head, deterministic job, runtime probe, generation
receipt, executed seed, exact model/runtime revisions, and preserved PNG bytes
before any production queue can start.
