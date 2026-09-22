# Workstream 12 — Art Infrastructure Accelerator Handoff

Scope: `screenshot-match-preproduction` only. This is a tooling handoff, not gameplay or canonical-art authority. Workstream 08 remains the only canonical catalog writer; producers/reviewers keep current exact-hash independence rules.

## What changed
A public-GitHub rights-clean infrastructure sweep found a practical stack that maps cleanly onto the existing `artPromptOptimizer` -> exact-byte staging -> real Store render -> independent review pipeline.

### Pilot now — perceptual preflight
Use **JohannesBuchner/imagehash@7a405c9a27571ee8c998b661ce751639c34b7355** (permissive BSD-style license) as the first external accelerator. It has tested pHash/dHash/color/crop-resistant hashing and requires no model weights.

Pilot contract:
1. Run only after candidate bytes pass existing signature/decode/readback checks.
2. Exact SHA-256/Git blob equality remains the hard duplicate check.
3. Normalize candidates to the same Store-card canvas used by staged-art QA.
4. Compute pHash + dHash + color hash against:
   - every accepted canonical catalog asset;
   - same-family accepted assets;
   - all candidates in the current batch.
5. Emit the five nearest neighbors and distances into staged-art evidence.
6. **REPORT ONLY** at first. Do not block or auto-REWORK from a perceptual threshold until thresholds are calibrated against existing exact-hash ACCEPT/REWORK history.
7. Feed only the warning/evidence to the independent reviewer and review learner; never let this metric approve an image.

Optional independent second signal: `scikit-image/scikit-image@2dff163516e1a7c528b48d5eda8cf40788f0ade3` SSIM (BSD family). Prefer a sidecar/offline QA dependency, not application runtime. Combine with pHash rather than treating SSIM as truth.

### Pilot now — alpha edge refinement
**pymatting/pymatting@6d5c4a6bed0e5672abac0bad078e594423ffe4fd** is MIT and its core classical matting path does not require a learned model checkpoint. For a non-canonical candidate that already has a foreground mask, generate a trimap by erode/dilate boundary expansion, refine alpha, preserve both source and derivative hashes, and compare actual Store-card halo/edge quality. Do not overwrite source bytes.

### Generation foundation — rights gate first
Preferred runtime: **huggingface/diffusers@7263f3317f6b392d62f41e9d75ed9d7e21fc5a5c** (Apache-2.0), with **tencent-ailab/IP-Adapter@62e4af9d0c1ac7d5f8dd386a0ccf2211346af1a2** (Apache-2.0) and ControlNet where a reference asset/structure is useful.

Do not generate production candidates until the **exact model checkpoint/revision license** is separately recorded. Repository code licensing does not cover FLUX/SDXL/base/refiner/ControlNet/IP-Adapter weights.

Minimum provider-neutral generation provenance record:
```json
{
  "itemId": "auras-N",
  "attemptId": "unique-id",
  "promptSha256": "...",
  "promptRecipeVersion": "...",
  "seed": 12345,
  "runtime": {
    "repo": "huggingface/diffusers",
    "commit": "7263f3317f6b392d62f41e9d75ed9d7e21fc5a5c"
  },
  "models": [
    {
      "modelId": "exact model repo/id",
      "revision": "exact revision",
      "licenseReviewed": true,
      "licenseReference": "stored evidence path"
    }
  ],
  "conditioning": {
    "referenceAssetHash": null,
    "controlImageHash": null,
    "adapterScale": null
  },
  "output": {
    "width": 1024,
    "height": 1024,
    "format": "png",
    "sha256": "...",
    "gitBlobSha": "..."
  }
}
```

The existing `scripts/artPromptOptimizer.mjs` already creates differentiated exact-metadata repair variants and should remain upstream of generation. Do not fork prompt logic into a model-provider-specific prompt store.

### Transparent-background options
- **danielgatis/rembg@202e42649a8492a7c49f808de36608a7d1cbbfe3**: MIT code; useful local batch/CLI background removal, alpha matting and decontamination. Its downloaded segmentation model is a separate rights gate.
- **lllyasviel/LayerDiffuse_DiffusersCLI@3061d9aed52a6c52a13fcf2b196c0fef4d727824**: Apache-2.0 code, native transparent SDXL generation, fixed-seed example. The LayerDiffuse safetensors and example base-model weights are separate rights domains and are not cleared by this handoff.
- Recommended experiment after weight clearance: native LayerDiffuse alpha versus local segmentation + PyMatting on the same four synthetic/non-canonical prompts, judged on checkerboard plus actual Store card/detail backgrounds.

### Optional postprocess
**xinntao/Real-ESRGAN@a4abfb2979a7bbff3f69f58f58ae324608821e27** is BSD-3-Clause code with tested alpha-aware/tiled inference. Its pretrained weights remain separate. Use only as an optional source-restoration derivative, preserve original bytes, and adopt only if independent Store-card review improves.

### Scale-up orchestration
If local generation becomes persistent/high-volume, evaluate **invoke-ai/InvokeAI@9e1540962bcca7f8fa668d7d8e02cf79d75fda3b** (Apache-2.0) for its tested batch queue/API/workflow layer rather than inventing another queue service.

**Comfy-Org/ComfyUI@e638023d54497dbe0579565e5de4bb7076899592** has mature `/prompt` + websocket workflow execution and tests, but its public code license is GPL-3.0 and custom-node/model licenses vary. It is not the preferred first foundation; keep it as an isolated workflow-authoring/architecture option if later justified.

## Order of operations
1. Add report-only perceptual-neighbor evidence to staged-art QA.
2. Correlate warnings with existing/new independent reviewer originality failures; calibrate, do not guess, a threshold.
3. Run the PyMatting non-canonical alpha-edge pilot.
4. Select and rights-review one exact generation checkpoint.
5. Run one four-variant Diffusers/IP-Adapter bounded pilot from a current prompt-optimizer recommendation.
6. Only then decide whether InvokeAI/ComfyUI orchestration or LayerDiffuse/Real-ESRGAN postprocessing measurably improves throughput/acceptance.

No main/deploy/Replit/Floot/paid settings/purchases/secrets/real player data changes are authorized by this handoff.
