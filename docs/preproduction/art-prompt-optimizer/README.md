# StarBlox Art Prompt Optimizer

Status: **offline art-production tooling only**. It does not generate images, approve art, write the canonical catalog, alter gameplay, touch player data, deploy, or merge `main`.

## Purpose

Learn which reusable **prompt structures** correlate with independently ACCEPTed exact image hashes, then use that evidence plus current REWORK reasons to propose 2–4 distinct repair prompts for unfinished catalog items.

The optimizer is intentionally transparent. Its unit of learning is a named prompt block such as `physical`, `material`, `aura`, `card`, or `tier`—not an opaque free-form model weight.

## Non-negotiable evidence rules

1. A generation attempt is trainable only when its `itemId + assetHash` has an independent exact-hash `ACCEPT` or `REWORK` in `docs/preproduction/catalog-sprint/reviews/*.json`.
2. Producer self-review is excluded.
3. Reviewer disagreement is excluded instead of averaged away.
4. Pending / BLOCKED / stale-hash evidence does not update prompt acceptance statistics.
5. Existing ACCEPTed hashes are preserved; recommendations do not regenerate them.
6. Technical blockers such as corrupt/blank/signature/decode failures route to technical repair, not prompt regeneration.
7. The optimizer never writes `catalog-art-manifest.json` or `src/catalogArtRuntime.js`; Workstream 08 remains the canonical writer.
8. Actual card/detail pixels and independent review remain the authority. A high optimizer score is not art acceptance.

## Learning model

Each generation attempt records the prompt blocks it used. After an independent exact-hash review lands, those blocks receive an ACCEPT or REWORK observation.

The model keeps Beta-distribution acceptance counts globally, by collection, and by tier band. Recommendation ranking is shrunk toward global evidence when collection/tier support is thin, with a small exploration bonus so one early winner does not freeze the recipe forever.

Historical review prose is used only as a **bootstrap repair prior** (for example `FLAT_PRODUCT_ICON` -> physical construction/material/depth). It is not falsely treated as proof of which historical prompt caused an image, because many old generation prompts were not retained in the repository.

## Attempt ledger

`attempts.jsonl` is append-only. A typical record is:

```json
{"attemptId":"auras-5-w11-v4-A","itemId":"auras-5","assetHash":"<exact staged hash>","hashAlgorithm":"git-blob-sha1","producer":"11","generator":"image_gen","collectionId":"auras","tier":2,"promptBlocks":["metadata","aura","depth","card"],"promptText":"<exact prompt used>","promptSha256":"<sha256 of exact prompt>","generatedAt":"<ISO timestamp>","sourceHead":"<branch head>"}
```

Do not add an attempt until there is a real generated candidate and exact staged/read-back hash. The record may exist before review; it simply will not train the model until an independent matching review appears.

## CLI

Validate the current evidence corpus:

```bash
node scripts/artPromptOptimizer.mjs validate --repo-root .
```

Build the current learning model:

```bash
node scripts/artPromptOptimizer.mjs train --repo-root . --output /tmp/art-prompt-model.json
```

Generate 2–4 prompt variants for one item:

```bash
node scripts/artPromptOptimizer.mjs recommend --repo-root . --item auras-5 --variants 4
```

Generate repair recommendations only for current reviewed non-ACCEPT items:

```bash
node scripts/artPromptOptimizer.mjs recommend --repo-root . --all-rework --variants 4 --output /tmp/art-prompt-recommendations.json
```

Append a completed generation attempt:

```bash
node scripts/artPromptOptimizer.mjs record --repo-root . --attempt-json /tmp/attempt.json
```

## Variant strategy

Every prompt keeps the metadata lock, category identity, tier direction, theme integration, card readability, originality, and clean catalog-stage constraints. Variants differ in emphasis:

- **A-PHYSICAL** — construction, material, camera, depth.
- **B-READABILITY** — silhouette, card contrast, distinct geometry, controlled glow.
- **C-THEME-TIER** — theme integration, tier step-up, premium material specificity.
- **D-REPAIR** — current reviewer defect codes + collection-specific blocks + learned high-performing blocks.

This preserves the sprint rule that failed recipes must change and that a pilot should explore meaningfully different visual hypotheses rather than four palette swaps.
