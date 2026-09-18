# StarBlox Question QA Ledger

Purpose: persistent audit trail for question/template validity. Re-audit an item only when the item itself, its shared generator, its source mapping, or the Quest selector changes.

Severity: **P0** = wrong key, multiple defensible answers, source contradiction, nonsense/unanswerable, malformed generation. **P1** = too easy, giveaway distractors, ambiguity, construct mismatch, inappropriate difficulty. **P2** = readability/polish only.

| Audit date | Question/template ID | Skill | Role | Source | Severity | Issue / audit finding | Disposition | Retested |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09-18 | `grammar-4` | language | transfer | ABVM Grade 2 current source pack | P0 | Old choices included both “Maya’s hands shook...” and “Maya was nervous.” A normal Grade-2 reader could defend both as showing nervousness. | Replaced the direct-label distractor with neutral/happy actions so only the physical nervous cue answers the stem. | Automated regression added |
| 2026-09-18 | `rhyme-bun` | phonics | transfer | ABVM Grade 2 current source pack + deterministic phonics rule | PASS | `sun` is the sole rhyme; `cake` and `bed` do not rhyme with `bun`. | Cleared unchanged. | Automated regression added |
| 2026-09-18 | `story-character-family-recipe` / `story-character-*` | character-reasoning | transfer | Original StarBlox practice passages aligned to current reading skill | P1 | Shared template used meta-text non-distractors (“passage has a beginning,” “story has words”), making the item a giveaway rather than character reasoning. | Replaced the family with passage-specific competing details and narrowed the stem to the character’s values/decision. | Automated regression added |
| 2026-09-18 | `religion-transfer-1` | religion-application | transfer | Approved Religion Unit 1 source | P0 | Old “Sign of the Cross” application added a detail not present in the approved source pack and overstated transfer. | Reclassified as review and changed to exact source-faithful identification of Father, Son, and Holy Spirit. | Automated regression added |
| 2026-09-18 | `religion-transfer-2` / `religion-transfer-*` | religion-application | transfer/review/practice | Approved Religion Unit 1 source | P1 | Shared family used obvious “good choice vs selfish/ignore” distractors; several items were too easy and two relied on broader application beyond the supplied source. | Rebuilt all five secondary Religion items from source-bounded prompts; only image/likeness and creation-care remain transfer. Trinity/Jesus are review; grace is practice. | Automated regression added |
| 2026-09-18 | `vocab-transfer-language` | vocabulary | transfer | Current-week vocabulary meaning | PASS | Keyed example matches the supplied meaning; alternate transfer examples target different vocabulary meanings. | Cleared unchanged. | Automated regression added |
| 2026-09-18 | `dailyPool` choice ordering | all | all | Generator invariant | P1 | Every canonical item stored its key first, and the prior seeded RNG collapsed to a constant value because the multiplier equaled the modulus. Daily order did not meaningfully vary and naïve choice shuffling would become predictable. | Replaced RNG with a 32-bit LCG and deterministically shuffles both daily question order and each item’s three choices. | Automated answer-position balance regression added |

## Open QA risks / next audit target

- **P1 open:** `hfw-use-*` (20 items) currently uses grammatically broken nonsense distractors. They are structurally valid but too easy and do not provide strong evidence of correct high-frequency-word use. Rebuild or quarantine this family next; do not count it as hardened until fixed.
- **P1 open:** `story-main-*`, `story-infer-*`, and `story-evidence-*` still use weak generic/meta distractors. The keyed answers appear text-supported, but distractor quality should be rebuilt with passage-specific alternatives.
- **P1 open:** base `religion-*` recognition items still use broad negative giveaway distractors. Source fidelity is intact, but difficulty/discrimination is weak.
- Continue explicit phonics review for every `rhyme-*` and `sound-*` target as the bank evolves; do not infer spelling mastery from phonics recognition.
- Do not treat structural invariants (unique IDs/choices/key presence) as proof of semantic validity.
