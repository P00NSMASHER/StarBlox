# StarBlox delivery protocol v2

User authorization, 2026-09-21: optimize the existing 15 active scheduled tasks to finish the game as quickly and thoroughly as possible. This replaces the older three-hour cadence and review allocation, NOT the catalog-first requirement, screenshot target, quality standard or deployment freeze.

## Scope and current bottleneck

Repository: P00NSMASHER/StarBlox. Shared integration branch: screenshot-match-preproduction. Read CATALOG_SPRINT_STATE.json for phase/assignments. This protocol is the current operational rule; CATALOG_SPRINT.md and COORDINATION.md retain compatible product and safety requirements. User/system access rules always take precedence over repository instructions.

Inspected baseline: 32330fe91417d7aaf87e785a218ffad5a5a286aa. Workstream 08's integration.json is explicitly BLOCKED_ON_INDEPENDENT_REVIEW. Its snapshot is older than several producer handoffs: do not copy its staged counts as current totals. No lane-03.json existed at the inspected head. Catalog mobile-qa.json records successful headless Chromium checks, not physical-device or screen-reader acceptance. Prior whole-game QA still records 13 geometry failures on its own audited head; remeasure before resolving them. These observations are scheduling inputs, not new art or release approvals.

## Cadence and output discipline

Reuse the same 15 automation IDs once per hour, staggered in America/New_York as a single factory flow: 15 :00; 03 :04; 04 :07; 06 :10; 07 :13; 09 :16; 11 :19; 12 :22; 13 :25; 14 :30; 01 :35; 02 :39; 05 :43; 08 :48; 10 :54. The order is director -> primary producers -> shared exact-byte render gate -> independent reviewers / mixed review-first workers -> canonical integration -> mobile visual proof. Offsets reduce contention; they do NOT guarantee completion order. Consume the newest valid hash-bound output, including prior-cycle evidence, rather than polling, sleeping, or repeating work.

Start with branch head, phase, own report, changed dependencies and current rejection/approval records. Cache stable design/source documents by hash instead of rereading the whole repository every pass. Each productive run must yield a saved usable asset, actual per-item visual decisions, tested integration, verified defect fix, or previously missing test evidence. Scheduling changes, generated promotional posters, source inspection alone, and repeating a handoff are not completion.

One active micro-batch per producer, usually 2–6 items and never more than 12. Prefer a finished, uploaded, reviewed increment over a large uncommitted batch. Reviewers normally handle 12–24 actual images per pass, only as many as they can inspect properly. A target quantity never forces approval. Do not regenerate a READY_FOR_REVIEW item while waiting. Check its hash; complete its evidence or fix an actual review defect.

## Art Factory v2 execution path

The art factory at `docs/preproduction/art-factory/` is the shared production path. Every producer first reconciles live ownership/review state, then uses `scripts/artPromptOptimizer.mjs` and `scripts/artFactoryJob.mjs` for an actionable REWORK/unaccepted item before generation. The job compiler enforces 2–4 distinct prompt variants, stable seeds, exact runtime/model revisions and the user-attested model/checkpoint rights basis. Repository code/data/API/custom-node rights remain separate.

Generation never implies acceptance. Preserve source and derivative bytes, stage/read back exact repository bytes, then run `docs/preproduction/art-factory/verify_staged_output.py` to bind the planned attempt to the real raster's SHA-256, Git-blob SHA, dimensions, byte count, lineage and correct independent-review route. Only `STAGED_EXACT_BYTES_VERIFIED` outputs proceed to the real StarBlox card/detail or target-surface render and assigned independent exact-hash review. pHash/dHash/color hash/SSIM prioritize inspection only; they never auto-accept or auto-rework. Workstream 15 maintains `docs/preproduction/art-factory/ACTIVE_BATCH.json` only on material assignment changes, with at most four concurrent production micro-batches and one per producer. Workers revalidate it against newer branch/review evidence before writing.

## Single ownership and concurrency

Preserve the current productionAssignments, including CHAT's seating reservation. Production workers own only assigned asset paths and their lane report. New assets/replacements use versioned paths; preserve previous candidates for comparison. Replacements require an evidenced defect, not merely a final/interim label. Recheck assignment and asset hash immediately before writes.

08 alone writes catalog-art-manifest.json and src/catalogArtRuntime.js. 15 alone changes phase/reassignments and coordinates shared entrypoints, package/lock/config files and integration conflicts. 14 owns the common visual/render/CI harness; 10, 12 and 13 own their targeted test scripts and reports. During GAME_FINISHING each original screen owner owns its screen-specific modules; request shared-file changes through 15 rather than everyone editing src/main.jsx or adding another global CSS/MutationObserver layer.

Use current content SHAs or non-force fast-forward commits. Commit coherent multi-file changes together when a supported tool permits it. On conflict, reread and merge; never force-push, reset the shared branch, discard another worker's commit, or overwrite a whole manifest from an old snapshot. Before reassignment, 15 reconciles any in-flight work and writes an explicit handoff. Do not use a separate stale lane list embedded in an old prompt.

## Four independent review partitions

The partitions cover all 16 collections / 192 existing IDs, including the 99 labeled final-portable. They do not transfer asset production ownership.

- 01: tops, bottoms, headwear, facegear (48 IDs).
- 02: shoes, backgear, handgear, seating (48 IDs). Do not produce CHAT's seating assets.
- 05: beds, desks, companions, auras (48 IDs). Continue repairing owned wall candidates only when 14 supplies a concrete rejection.
- 14: lighting, wall, rugs, decor (48 IDs), plus release verification and contested reviews.

Review the oldest READY_FOR_REVIEW candidates first within the partition, then legacy final-portable entries without actual visual acceptance. Do not author and approve the same asset/version. Check production provenance, including prior roles; if conflicted, request another reviewer. 15 can rebalance exact review IDs only after reconciling current claims. Different reviewers write different shard files, never contend over one giant review ledger.

Each reviewer owns docs/preproduction/catalog-sprint/reviews/<NN>.json. A missing shard is an authorized output to create, not a prerequisite to wait for. Minimum format:

    {"schemaVersion":1,"reviewer":"02","reviews":[{"itemId":"seating-2","assetPath":"/assets/catalog/<actual-file>","assetHash":"<actual measured hash>","hashAlgorithm":"sha256 or git-blob-sha1","sourceHead":"<actual head>","producer":"CHAT","decision":"ACCEPT | REWORK | BLOCKED","reviewedAt":"<actual time>","evidenceRefs":["<actual screenshot/contact-sheet path or artifact>"],"reason":"<item-specific observed reason>","checks":{"identity":"PASS/FAIL","themeTier":"PASS/FAIL","silhouette":"PASS/FAIL","materialLighting":"PASS/FAIL","cardReadability":"PASS/FAIL","originality":"PASS/FAIL","duplicateVisual":"PASS/FAIL"}}]}

Append history; approval is for an exact asset hash, never an item name alone. Actual rendered card-size and detail-size inspection is required. Source/XML validity, distinct filenames, fancy gradients and no clipping do not prove premium dimensional quality. Reject simple stand-ins or recolors that fall short of the supplied screenshots. Inspect exact name, category, collection, tier and theme without inventing replacements or renaming catalog items. Preserve attractive Starter art and genuinely richer higher tiers.

One qualified independent per-item visual ACCEPT plus passing automated/mapping checks is sufficient for 08 to integrate that item. Do NOT wait for all 192 reviews, both old monolithic review files, or whole-game geometry clearance before integrating an approved micro-batch. 14's independent release check remains required for the catalog gate. An actual reviewer disagreement blocks the specific image until resolved. Absence of a second review is not a rejection. Do not waive existing objections.

01 may maintain art-review.json as a rollup, but shards are direct evidence and the rollup is not a dependency. 14 maintains release-qa.json. 08 consumes both new shards and valid prior hash-bound evidence; no schema migration may manufacture approvals.

## Execution and asset persistence

Use available image-generation tools for new art or exact approved assets already accessible. No Replit/Floot generation or paid external purchases. Produce separate item images, not a promotional sheet with invented IDs or claims such as 'verified'. Use only original StarBlox artwork; no third-party characters/brands or Roblox/Brookhaven assets. Keep full-quality originals and measured phone-friendly derivatives. Do not substitute simple SVG geometry just because a text-only connector can upload it.

A local generated file or sandbox link is NOT a repository asset. Save bytes to a supported authorized repository/asset path and read them back before marking STAGED. Check exact ID/path/hash, format, dimensions and bytes. If only local output exists, mark GENERATED_LOCAL / UPLOAD_BLOCKED. Do not embed binary data in fields that do not support it, expose credentials, fabricate upload success or use another paid service without approval.

14 must provide/reuse a branch-local asset-review fixture that renders staged candidates independently of canonical Store wiring. This breaks the review-before-wiring deadlock: test candidate paths in an isolated QA fixture without promoting them in the child app. Use existing GitHub Actions/Playwright and supported artifact-download tools for real screenshots/contact sheets; no Replit preview is needed. Build/test the actual branch in local or CI execution. Never say tests require a main merge or Replit spend when the repository already has a working branch-local path.

Original user screenshots are authoritative. 01 should preserve accessible original reference pixels and hashes through supported tools. If unavailable, report exactly what is missing, use the existing measured contract for work that can proceed, and escalate one concrete reference-access request. Never relabel a later AI collage as a reference or running-game screenshot. Exact pixel parity stays unverified until real comparison is possible.

## Tests, cost control and safety

Use cached installs and a reproducible lockfile where present. Reuse unchanged hash-bound evidence, run affected tests for a micro-batch and full regression/build at coherent integration milestones. 14 may suppress duplicate documentation-only heavy jobs through narrow workflow filters/concurrency with 15 coordinating shared changes. Keep only one newest pending heavy QA job per relevant ref where supported; do not discard its last useful evidence. No tight polling, repeated identical renders or 15 copies of the same full suite. Candidate proofs and final production proofs are different.

08 validates catalog IDs, metadata, paths, file hashes, safe decodes, missing-asset fallback and manifest/runtime agreement. 14 validates actual duplicate contents and visual near-duplicates, not just filenames. 10 owns Store browsing, text/targets/focus/contrast and loading/scrolling, on 1408x1056, 1024x768, 390x844 and 320x568 as applicable; label emulation honestly. 12 owns semantic learning/source/evidence correctness. 13 owns saves/economy and real browser recovery/concurrency stress. Keep these protections active during catalog work; do not repeatedly retest unchanged data merely to create activity.

No save reset, loss of permanent inventory/currency, unapproved curriculum, multiple-defensible-answer questions, assisted-as-independent mastery, wrong-answer reward farming, false multiplayer promises, public child chat/profiles, ads, loot boxes, FOMO or punitive streak mechanics. A UI debounce is not durable reward idempotency. Unknown/no-art IDs remain owned. Fix verified P0 safety defects immediately; catalog priority never excuses them.

## Anti-stall behavior

Record a concrete blocked dependency/tool result once with owner, attempted supported path and smallest next action. If no input changed, do not retry the same failing action or rewrite the same report. Escalate unresolved blockers after two scheduled cycles to 15. While blocked, take only non-conflicting work: another already assigned asset, independent review within your partition, evidence packaging, or an untested safety case. No unauthorized lane stealing or new feature scope. 15 resolves blocked ownership/access or asks the user for a required missing capability; it does not mark BLOCKED as PASS.

## Automatic return and finishing

Only 15 sets phase GAME_FINISHING after 192 actual IDs have unique correct canonical assets, exact-hash independent visual acceptance, zero unresolved interim/placeholders/art defects, passing catalog tests/build/desktop+phone checks, and no catalog-induced learning/save/economy P0. Record immutable source/asset/manifest/evidence references. 13 unrelated screen geometry failures are NOT catalog gate requirements.

After the catalog gate, all 15 tasks automatically resume their original normalRoles at the hourly cadence. Prioritize: measured Quest/Home/Store layout defects; real avatar equipment/try-on and environment/room-tier fidelity; complete phone/keyboard/screen-reader/contrast/reduced-motion and performance evidence; browser save/reward recovery; final clean regression/build/reference proof. Do not rewrite architecture or add social/multiplayer/curriculum/features for novelty. Product tests must exercise real purchase/equip/place/Quest actions, not only decorators or mocked helper functions.

15 records a release candidate head and immutable content digests. Run final full tests/build and all critical release gates against that candidate. Unrelated documentation commits need not invalidate runtime proofs when identical runtime/asset hashes are demonstrated. Any changed asset invalidates its review; any changed runtime invalidates affected tests.

Keep deployment blocked until all release gates pass and the user separately approves. On READY_FOR_SINGLE_REPLIT_INTEGRATION, provide a verified preview/evidence package, migration/rollback plan and exact candidate hash. Do not update Replit, call its agent/build/publish tools, touch Floot, merge main, deploy elsewhere or change paid settings. Once genuinely ready and the user has been notified, 15 may pause only these 15 development tasks to avoid endless polishing; leave unrelated automations alone.

## Reporting

Each worker updates its own concise evidence report only on material change. Include input/output heads, IDs/paths/hashes, actual checks and next owner/action. Generated / stored / independently accepted / canonical-wired / release-cleared are separate counts. The Command Center is the sole consolidated progress reporter except urgent blockers; notify about milestones, needed user actions or credible release risk, not 15 repetitive reports. No ETA or percentage inferred from scheduled runs, commits, file existence or generated mockups. Recalculate from accepted deliverables and keep the catalog count distinct from game readiness.
