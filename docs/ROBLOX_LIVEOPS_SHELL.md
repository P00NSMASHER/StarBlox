# Roblox LiveOps Shell — Step 6

Step 6 wraps StarBlox's existing authoritative learning/game events in a Roblox-native LiveOps layer without creating a second source of truth.

## Sources

The design is adapted from Roblox's official Creator feature packages at commit:

cb3cab58d53600b0f059a9ca01a4b197864a719c

Relevant paths:

- content/en-us/resources/feature-packages/missions.md
- content/en-us/resources/feature-packages/season-passes.md
- content/en-us/resources/feature-packages/engagement-rewards.md
- content/en-us/resources/feature-packages/bundles.md

The official packages provide the UI/package conventions for mission counters, season progression, daily/time rewards, and discounted bundles.

StarBlox keeps its own server-authoritative persistence and reward boundary.

## Authoritative event bridge

LiveOps consumes server-owned StarBlox events such as:

- daily_completed
- skill_mastered
- transfer_win
- district_progress
- boss_clear
- question_independent_correct
- play_seconds

Each event requires an idempotency event ID.

Duplicate event IDs are ignored.

Clients cannot directly award mission progress, XP, Coins, Stars, cosmetics, or season progress.

## Missions

Missions are defined as one or more count tasks.

A task has:

- taskId
- eventType
- target
- optional exact field matches

Mission progress advances only from matching authoritative events.

Rewards are emitted as receipts rather than directly mutating arbitrary player state.

## Seasons

Mission rewards can include seasonXp.

Season XP is routed to a named season.

Tier claims require:

- an active season window;
- enough server-tracked season XP;
- an unclaimed tier.

Tier rewards also return receipts for the server reward boundary.

## Engagement rewards

Two primitives are implemented:

- consecutive UTC-day visit streaks;
- authoritative play_seconds accumulation.

Daily and time-based rewards are idempotent and cannot be claimed before their thresholds.

## Bundles

In-experience Coin bundles can be authorized only after the server checks the player's current Coin balance.

Marketplace/Robux bundles are intentionally not authorized through the generic claim path.

They require the Roblox platform receipt callback through ProcessMarketplaceReceipt.

This prevents a client from claiming that a marketplace purchase occurred.

## Roblox runtime

ProfileTemplate gains a LiveOps namespace containing:

- counters
- mission state
- season state
- engagement state
- bundle purchase state
- processed event IDs

Processed event IDs remain server-only.

ReplicaStateService exposes the player-visible LiveOps projection.

LiveOpsService:

- records authoritative events;
- bridges them into an injected Roblox feature-package adapter;
- applies only supported reward receipts;
- synchronizes the public replica;
- exposes a separate marketplace-receipt path.

Bootstrap returns LiveOps beside Profiles, Replicas, ECS, Artifacts, Replays and IntelligenceShadow.

## Network contract

Zap gains:

- ClaimLiveOpsReward — reliable client intent only;
- LiveOpsState — reliable server state notification.

The client message contains a claim type and claim ID only. It does not contain rewards or authoritative progress.

## Current scope

Step 6 does not install Roblox feature-package Creator Store assets automatically and does not create marketplace products.

The Step 2 AI Development Factory can install/configure the official packages once the connected Studio project and product IDs are available.

The core LiveOps logic is provider-neutral and tested outside Studio so it remains deterministic and reviewable.

## Repair hardening: exactly-once rewards

Generic LiveOps claims now have server-owned durable ClaimReceipts keyed by claim type and claim ID. Marketplace purchases require a stable Roblox PurchaseId and are tracked in MarketplaceReceiptIds before the same receipt can ever be granted twice.

Feature-package adapters receive deep copies of profile/receipt data rather than the live profile table. Returned patches are limited to public LiveOps namespaces, and every reward receipt is validated before Coins, XP, Stars, or cosmetics are mutated.

ClaimReceipts and MarketplaceReceiptIds remain server-only.
