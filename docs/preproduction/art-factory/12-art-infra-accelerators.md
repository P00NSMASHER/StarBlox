# Workstream 12 — Art Infrastructure Accelerator Handoff

Scope: `screenshot-match-preproduction` only. This is production tooling, not gameplay or canonical-art authority. Workstream 08 remains the only canonical catalog writer; reviewers keep exact-hash independence rules.

## Current decision

The previous model/checkpoint rights hold is **cleared for StarBlox by explicit user attestation of full model/checkpoint rights**. Exact model IDs/revisions still must be recorded in provenance. Repository code licenses, datasets/reference assets, APIs/services and custom-node terms remain independent and must not be conflated with model rights.

The authoritative implementation contract is now:
- `docs/preproduction/art-factory/README.md`
- `docs/preproduction/art-factory/ART_FACTORY_V2.json`
- `docs/preproduction/art-factory/pilot_art_accelerators.py`
- `docs/preproduction/art-factory/verify_staged_output.py`
- `.github/workflows/art-factory-preflight.yml`

## Preferred production stack

1. **Generation** — `huggingface/diffusers@7263f3317f6b392d62f41e9d75ed9d7e21fc5a5c` (Apache-2.0 code).
2. **Reference consistency** — `tencent-ailab/IP-Adapter@62e4af9d0c1ac7d5f8dd386a0ccf2211346af1a2` (Apache-2.0 code), plus ControlNet surfaces available through Diffusers.
3. **Perceptual triage** — `JohannesBuchner/imagehash@7a405c9a27571ee8c998b661ce751639c34b7355` (BSD-style) and optional `scikit-image@2dff163516e1a7c528b48d5eda8cf40788f0ade3` SSIM. Metrics remain report-only.
4. **Alpha refinement** — `pymatting/pymatting@6d5c4a6bed0e5672abac0bad078e594423ffe4fd` (MIT).
5. **Optional alpha/background paths** — `danielgatis/rembg@202e42649a8492a7c49f808de36608a7d1cbbfe3` (MIT) and `lllyasviel/LayerDiffuse_DiffusersCLI@3061d9aed52a6c52a13fcf2b196c0fef4d727824` (Apache-2.0 code).
6. **Optional restoration/upscale** — `xinntao/Real-ESRGAN@a4abfb2979a7bbff3f69f58f58ae324608821e27` (BSD-3-Clause code); preserve the original and treat output as a derivative.
7. **Scale-up orchestration** — `invoke-ai/InvokeAI@9e1540962bcca7f8fa668d7d8e02cf79d75fda3b` (Apache-2.0).
8. **Alternate isolated workflow authoring** — `Comfy-Org/ComfyUI@e638023d54497dbe0579565e5de4bb7076899592` (GPL-3.0 code); custom-node/model terms remain separate.

## Production rules

- Existing `scripts/artPromptOptimizer.mjs` stays upstream of every new generation attempt.
- Generate only an unfinished/REWORK candidate, never an independently ACCEPTed exact current hash.
- Pilot 2–4 variants, stage/read back exact bytes, render actual StarBlox card/detail or target surface, then obtain independent exact-hash review before scaling.
- Preserve source plus every derivative hash. Matting, background removal and super-resolution never overwrite the source.
- pHash/dHash/color hash/SSIM can prioritize review and flag suspicious similarity; they cannot approve or reject art automatically.
- Every source generation records prompt SHA, deterministic seed, runtime commit, exact model/checkpoint revision, conditioning/reference hashes, output dimensions and exact hashes.
- Do not preserve secrets/private data, leaked/confidential material, exploit paths or unauthorized-access material in any prompt, artifact or provenance record.

## Concrete first pilots

1. Run the manual **StarBlox Art Factory Preflight** workflow and preserve its report-only evidence.
2. Use one current assigned REWORK item (not an ACCEPTed hash) for a 2–4 variant Diffusers/IP-Adapter or equivalent authorized-model pilot.
3. Pass candidates through source-preserving alpha/matting only if transparency helps that exact item.
4. Stage/read back exact bytes, run `verify_staged_output.py` to bind hashes/dimensions/lineage/reviewer routing to the compiled attempt, then render card/detail evidence through the existing fixture.
5. Let the correct independent reviewer decide the exact hashes.
6. Feed the outcome back into `artPromptOptimizer`; scale the recipe only if the bounded pilot improves acceptance/readability/reference fidelity.

No main/deploy/Replit/Floot/paid settings/purchases/secrets/real player data changes are authorized by this handoff.
