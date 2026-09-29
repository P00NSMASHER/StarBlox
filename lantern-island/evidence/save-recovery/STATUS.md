# Save recovery repair

Tested source: `8e249454bbc5e8ea1794e9c0f159f358780f2eb3`.
Parent: `4ddbfeba21e1fe75e1a3f7a769b96587ef61578e`.
This change is isolated on `lantern-save-recovery-20260929`; concurrent development on the native-adventures branch was not overwritten.

## Reproduced failure and repair

The unchanged previous ProfileService was executed with a datastore adapter that committed a write and then raised a lost-acknowledgement error. The first save correctly returned an unconfirmed failure, but retrying returned SAVE_CONFLICT permanently. The first regression failed with `retry failed: SAVE_CONFLICT` before the repair.

The repaired service retains the exact pending snapshot and a unique transaction token. A retry accepts only the same stored transaction, revision and progress. A different writer still causes a conflict rather than an overwrite. When play has advanced since an uncertain save, the old transaction is reconciled first and the newer clues/outfit are then saved. Loading bypasses stale read cache. Malformed records/revisions fail closed instead of becoming writable blank profiles. Failed calls release the saving lock. The existing session-only Studio adapter and production namespace remain unchanged.

## Executed checks

All 20 source/test/build files in the new manifest were compared byte-for-byte against the exact GitHub revision before building.
The exact build passed 92 offline checks: 38 protocol, 32 mission/reward/UI-model, 3 answer-layout and 19 profile-persistence checks. The persistence suite loads and executes the actual unmodified ProfileService source with mocked Roblox services; it is not a separate reimplementation.
Thirteen production files and four test files compiled. The protocol strict analysis passed. Two Rojo builds had identical hashes.
A further 17 assertions passed in a real Roblox Studio process against the exact new ProfileService module in temporary isolated test folders. These covered actual module loading, real cache-options/GUID APIs, session save/release/reload, outfit and assistance retention, separate players, and simulated lost-acknowledgement recovery through the actual _commit method. Temporary test modules were removed afterwards. Existing gameplay scripts and real player profiles were not modified.

## Evidence boundaries

The native checks are service-level checks, not a new end-to-end run of the entire game. A fresh Studio launch of the new artifact failed before opening the place because requests to Roblox's OAuth metadata endpoint timed out; a separate public endpoint request also timed out. No authentication bypass or credential changes were attempted.
The unchanged parent build has separate local evidence for 69 native request-result checks and 128 simulated input/walking checks; those prior results are not relabeled as end-to-end evidence for this new revision.
Cloud datastore leave/rejoin on an actually published experience remains NOT_RUN. Physical phone input, child engagement and learning gains remain unverified. Studio session reload is not cloud persistence. This repair has not been published to a Roblox experience or merged into main.

## Artifact

`LanternIsland-Adventures.rbxlx`, 86,420 bytes.
SHA256: `6cc0563d5a8776edc28f0b575d25f2aa7fdf171d8ca7b045c7c8e4fcc8369f30`.
Source fingerprint: `e8fea5c417661746a99b676a1196b1767f11ddc4e5e2835719749ee2b2e8f5cb`.
Local artifact: `%USERPROFILE%\LanternIslandBuilds\save-recovery-20260929\lantern-island\dist\LanternIsland-Adventures.rbxlx`.
No new paid services, purchases or scheduled development tasks were created for this repair.
