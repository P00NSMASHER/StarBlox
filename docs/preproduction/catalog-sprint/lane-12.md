# Workstream 12 — Accessory Art

Status: **GENERATED / TRANSFER BLOCKED / NOT READY FOR REVIEW**  
Branch: `screenshot-match-preproduction` only  
Active batch: `headwear-1..4`  
Producer: **12** · Independent reviewer: **01** · Canonical writer: **08**

## Current batch

The four replacement visuals already exist and were re-inspected against the stored original Store reference. No item was regenerated in this pass.

| ID | Item | Tier | Theme | Planned versioned path | State |
| --- | --- | ---: | --- | --- | --- |
| `headwear-1` | Headband | 1 | Midnight Neon | `public/assets/catalog/headwear-1-w12-v2.jpg` | generated, not staged |
| `headwear-2` | Cloud Clips | 1 | Candy Core | `public/assets/catalog/headwear-2-w12-v2.jpg` | generated, not staged |
| `headwear-3` | Pixel Cap | 1 | Adventure Club | `public/assets/catalog/headwear-3-w12-v2.jpg` | generated, not staged |
| `headwear-4` | Berry Bow | 2 | Cloud Pop | `public/assets/catalog/headwear-4-w12-v2.jpg` | generated, not staged |

The images directly address the legacy REWORK defects: Headband has real padded band thickness and neon trim; Cloud Clips visibly include metal clip hardware and layered glossy clouds; Pixel Cap has a thick brim, crown volume and seams; Berry Bow has fabric-like folds, loop thickness, a wrapped center and cast shadow. These are producer observations only, not reviewer-01 acceptance.

## Transport evidence

The Adobe 768×768 derivative for `headwear-1` was resolved as a JPEG download measuring **71,308 bytes**. `headwear-2` was independently resolved as a 768×768 JPEG measuring **64,660 bytes**. The downloads remained inside the read-only browser runtime, which did not expose raw bytes/base64 to the GitHub binary API. `headwear-3` and `headwear-4` were not retried after that browser transport path became unavailable.

GitHub binary staging itself is available through `create_blob` → tree → commit → non-force ref update, but it still requires the exact raw file bytes. The container cannot resolve Adobe hosts, the connected desktop is offline, and increasing browser-service capacity would violate the no-purchases/no-paid-settings constraint. Other lanes now use coordination-owned recovery workflows, but Workstream 12 is explicitly scoped to owned candidate paths plus `lane-12.json/.md`; it therefore did not create or edit shared workflow/import scripts.

## Second-cycle escalation

`W12-ADOBE-BYTE-TRANSFER` is unchanged for a second cycle and is escalated to Workstream 15. The smallest next action is for the coordination/shared-file lane to attach the **existing** four derivative bytes at the planned versioned paths (or provide one approved generic Adobe-short-URL → GitHub byte bridge), then return exact blob hashes/readback. **Do not regenerate these four images.**

Reviewer 01 should not review until repository paths and exact hashes exist. Workstream 08 has no canonical action until reviewer 01 independently ACCEPTs a staged current hash.

## Verification / freeze

No runtime, learning, economy, save, canonical catalog mapping, player data, Replit, Floot or `main` change was made. Tests/build were not rerun because this pass changed only Workstream-12 evidence documentation and did not stage or wire an asset. The authoritative structured record is `docs/preproduction/catalog-sprint/lane-12.json`.
