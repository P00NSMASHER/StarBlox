# Workstream 08 catalog integration

Status: **Rugs 12 exact-hash reviewer-14 ACCEPT integrated; catalog checks and production build pass; Store/mobile release proof remains blocked before Store content by the shared navigation click timeout.**

Canonical art integration commit: `6666f15536ac8d5cacedcd0a282ad24364abf146` on `screenshot-match-preproduction`. Evidence re-audited through branch head `6596caadf5b48099c6026f91ecf86860afe94aeb`. Replit/Floot/main/deploy/paid settings/player data untouched.

## Newly integrated accepted increment

`rugs-12` **Luxe Star Rug** is now canonical at `/assets/catalog/rugs-12-w07-v3.png`, Git blob `eea2fc5b78c1186342f91f597bc792160ab8f8fe`, SHA256 `21a2f71224d9a7d4e0e60a672867cc629f21a481c3310fee6b1cac1c1be071b3`, 1,039,033-byte 1024×1024 PNG. Reviewer 14 independently ACCEPTED the exact current hash from actual card/detail pixels; producer 07 did not self-review. The current reviewer-14 shard also synchronizes this exact hash as ACCEPT.

Before wiring, Workstream 08 verified exact live repository blob/path, authoritative Store identity `Luxe Star Rug` / Rugs / Tier 5 / Sunny Pop, PNG decode evidence, reviewer independence, no disagreement for the current hash, and uniqueness of the exact Git blob in the current repository tree. Existing accepted mappings and older asset versions remain preserved in Git history. IDs, prices, unlocks, ownership, saves and gameplay metadata were not changed.

## Current counts

Manifest v28 now has **164 canonical mappings**, **157 legacy `final-portable`**, **7 legacy interim-not-verified**, and **35 IDs outside the legacy final set** relative to the 192 target. The stricter V2 count is **91/192 independently accepted current hashes canonically wired**, leaving **101 strict remaining**. Release-cleared remains **0/192**. Duplicate canonical paths introduced by this increment: **0**; the integrated exact content blob occurs once in the current tree.

Generated-local this run: 0. Preserved-blob-only this run: 0. Newly branch-staged this run: 0. Qualified ACCEPTs consumed: 1. Strict canonical delta: +1.

## Validation

On canonical commit `6666f15536ac8d5cacedcd0a282ad24364abf146`, `src/catalogManifestQa.test.js` passed **4/4** and catalog runtime/Store tests passed. The enclosing CI wrapper remains red only because unrelated `scripts/artPromptOptimizer.test.mjs` is collected without a test suite; overall execution showed **99 tests passed, 2 skipped**, and no catalog assertion was weakened or bypassed.

The production Vite build passed in Catalog Mobile QA run `35707148100`. The strict changed-art Store/mobile safeguard then reproduced the known shared blocker in all six controls: Playwright resolves the visible Store button, but the pointer click times out before Store content opens at desktop, tablet, both phone viewports, and both normal-motion controls. Artifact: `10684444909`. Store proof is therefore **BLOCKED**, not passed, and the valid Rugs 12 mapping was not rolled back.

Deterministic reference run `35707148121` has verified the committed desktop reference inputs and passed its production build; its Home/Store/Quest capture step was still in progress at the last verified read. No reference-parity or release-clearance claim is made.

## Live reviewer recheck

Reviewer 01 has no newer qualified ACCEPT: Tops 11-12 v6 remain evidence-BLOCKED on the shared signature/card-detail path and Headwear 5-8 remain unqualified. Reviewer 02 has no new ACCEPT beyond already-canonical Shoes/Seating hashes. Reviewer 05 has no new ACCEPT beyond already-canonical Aura 11 and its preserved assigned accepts. Reviewer 14's current Rugs 12 `eea2fc5b…` ACCEPT is now consumed and canonical; no newer qualified exact-hash ACCEPT is present.

Only Workstream 15 may declare visual completion or change phase. Catalog/art completion does not authorize deployment.