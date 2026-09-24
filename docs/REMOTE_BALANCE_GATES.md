# Remote balance and automated balance gates

Step 6 adds a bounded LiveOps balance layer without requiring a backend provider.

## Source lineage

Directly adapted from the cleared Neon Vector Defense balance system at commit:

`48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4`

Primary source paths:

- `src/game/balanceConfig.ts`
- `scripts/balance-check.ts`
- `scripts/sim.ts`
- `scripts/balance.ts`

Neon's key design rules are preserved:

1. remote data only overrides static defaults;
2. missing/invalid remote data becomes identity;
3. every numeric override is bounded;
4. simulation reports are compared against a known baseline;
5. fail-level regressions stop CI.

## StarBlox balance document

The current StarBlox schema is intentionally small:

```json
{
  "version": "candidate-v1",
  "economy": {
    "coinsMult": 1.0,
    "xpMult": 1.0,
    "wrongXpMult": 1.0,
    "retryXpMult": 1.0
  },
  "quest": {
    "difficultyMult": 1.0,
    "stageCountOffset": 0,
    "optionalCountOffset": 0
  }
}
```

Remote balance cannot change code, canonical answers, Stars, mastery, transfer evidence, ownership, or district evidence.

## Runtime safety

`resolveBalanceDoc()` clamps every value to conservative ranges.

A missing document, network failure, timeout, or provider error resets the runtime to identity.

The provider-neutral `loadRemoteBalance(fetchDoc)` accepts an injected retrieval function so the same runtime can later use Supabase, Convex, Firebase, or another backend without changing balance semantics.

## Gate behavior

Runtime clamping protects players, but a candidate config that **needed clamping still fails the automated gate**. That prevents an unsafe admin request from silently becoming production configuration.

The gate also runs deterministic simulations.

### Certified level matrix

It generates solution-first quest levels across many seeds using the candidate stage/optional-node settings. Every generated level must retain a valid certificate.

### Synthetic learner matrix

Three monotonic regression profiles are simulated against the real StarBlox question bank:

- emerging;
- on-track;
- advanced.

This model is not an assessment model and is not used for real learners. It exists only to detect balance drift.

For every candidate it measures:

- first-try rate;
- retries;
- total actions;
- Coins;
- XP.

The candidate is compared against identity. Fail-level thresholds stop extreme changes to pacing, rewards, or synthetic difficulty.

## CI

`npm run balance:gate` evaluates `config/balance.candidate.json`.

CI runs the balance gate after the unit tests and before the production build.

The committed candidate is identity-equivalent today, so Step 6 changes no live player economy.

A future balance proposal can be reviewed as a small config diff plus the deterministic gate output before any remote publication.

## Scope boundary

Step 6 does not:

- publish a remote config;
- pick a backend;
- wire balance knobs into the current React Quest UI;
- change live player rewards;
- replace later IRT/FSRS player modeling.

It establishes the safe configuration and regression machinery first.
