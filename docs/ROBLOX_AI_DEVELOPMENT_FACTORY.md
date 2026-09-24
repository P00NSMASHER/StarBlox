# StarBlox AI Development Factory — Step 2

Step 2 establishes a provider-neutral Studio development loop inspired by BloxForge and Nixera AI Studio.

The factory does not publish Roblox places, buy assets, spend Robux, access secrets, or make external commitments.

## Control loop

The core flow is:

inspect -> plan -> code -> immutable mutation plan -> dry run -> approval when required -> apply -> tests -> playtest evidence -> logs -> viewport evidence -> review -> bounded repair -> re-test -> verified or rollback

## Mutation contract

Only these mutation operations are accepted:

- write_script
- edit_script
- create_instance
- delete_instance
- set_property
- set_attribute
- add_tag
- remove_tag

Anything resembling publish, purchase, deploy, billing, credential, token, secret or spending operations is outside the contract.

Every mutation plan is canonicalized and receives a deterministic plan hash.

Destructive operations and high-risk script edits require human approval.

## Evidence

The factory collects:

- Studio snapshot hash;
- dry-run receipt;
- mutation receipt + rollback identity;
- test summary;
- run state;
- optional bounded simulated input;
- logs;
- viewport screenshot digest;
- named gameplay assertions;
- reviewer result.

Images are represented by evidence hashes/sizes in the final artifact rather than embedding raw image bytes.

## Repair loop

Failed verification may enter a bounded repair loop.

Each repair is a new immutable mutation plan and is re-dry-run, re-approved if risky, applied and re-tested.

If the repair budget is exhausted, all applied receipts are rolled back in reverse order.

## Upstream lineage

BloxForge:
- princeofscale/bloxforge
- commit ef98c370b6e0dd93273eae245485b547b09aca53
- docs/tools-reference.md
- CHANGELOG.md

Nixera AI Studio:
- Nixera-Studio/roblox-ai-studio
- commit c88d2e57a5ca52381b49f488ee13a0fd7c3beae9
- coordinator/specialist/tool contracts
- Executor undo grouping
- PlaytestOps
- VisionOps
- TestOps

## Scope boundary

Step 2 is the StarBlox-owned orchestration/safety layer.

A later Studio bridge can map its adapter calls to BloxForge, Nixera, MCP, a custom plugin, or another authorized Studio automation surface without changing the factory state machine.
