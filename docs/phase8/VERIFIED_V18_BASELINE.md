# Phase 8 — verified private v18 baseline

Private Roblox place version **18** is the current verified StarBlox baseline.

The Brookhaven world/map is the exact frozen source already locked by the repository. Dynamic StarBlox systems are parented outside that baseline. The connected sources do not contain the complete original Brookhaven gameplay package, so houses, vehicles, inventory, roleplay and UI behavior are StarBlox runtime implementations rather than a claim of byte-for-byte original Brookhaven gameplay code.

## Learning economy

Correct answers award **10 coins**. Challenge completion itself awards no coins. Coins purchase home upgrades, furniture/decor, vehicles and inventory tools.

The question system serves **12 current-material questions per station first**, then loops through **8 original Grade-2 STAR-aligned fallback questions** while waiting for refreshed curriculum material. Meta/list-recognition prompts such as “which is a sight word?” are explicitly rejected by CI.

## Live proof

The verify-only workflow run **36223088498** executed against exact place version **18** and verified both the production server boot and live core-loop behavior. It did not publish or create another Roblox version.

The private/public authority boundary remains unchanged: public access and production activation are disabled.
