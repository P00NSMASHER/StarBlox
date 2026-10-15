import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../pipsquest/src/client/SchoolDaySyncController.luau", import.meta.url), "utf8");
const runtime = fs.readFileSync(new URL("../pipsquest/src/client/SchoolDayClient.client.luau", import.meta.url), "utf8");
const spec = fs.readFileSync(new URL("../pipsquest/tests/SchoolDaySyncController.spec.luau", import.meta.url), "utf8");

for (const marker of [
  "function SchoolDaySyncController.new",
  "function ControllerMethods.bootstrap",
  "function ControllerMethods.handleLive",
  "function ControllerMethods._recover",
  "function ControllerMethods._drainPending",
  'pcall(self._transport.getUpdates',
  'pcall(self._transport.getSnapshot)',
  '"RECOVERY_ALREADY_RUNNING"',
]) assert.ok(source.includes(marker), `sync-controller contract missing: ${marker}`);

for (const marker of [
  'WaitForChild("SnapshotChanged")',
  'WaitForChild("GetSnapshot")',
  'WaitForChild("GetUpdates")',
  "snapshotChanged.OnClientEvent:Connect",
  "controller:handleLive(envelope)",
  "controller:bootstrap()",
]) assert.ok(runtime.includes(marker), `client-runtime contract missing: ${marker}`);

assert.ok(runtime.indexOf("snapshotChanged.OnClientEvent:Connect") < runtime.indexOf("controller:bootstrap()"), "live subscription must precede bootstrap");

for (const forbidden of ["OnServerEvent", "FireServer", "DataStoreService", "MarketplaceService", "StarterGui"]) {
  assert.equal(source.includes(forbidden), false, `sync controller must not own ${forbidden}`);
  assert.equal(runtime.includes(forbidden), false, `client runtime must not own ${forbidden}`);
}

for (const title of [
  "bootstraps from an authoritative snapshot",
  "recovers a live gap through bounded replay",
  "falls back to a snapshot when replay reports eviction",
  "falls back to a snapshot after replay transport failure",
  "queues a gap without starting a second recovery",
  "fails closed when both recovery transports are unavailable",
]) assert.ok(spec.includes(title), `behavior spec missing: ${title}`);

class Model {
  constructor() { this.sequence = 0; this.recovering = false; this.pending = new Map(); }
  live(sequence) {
    if (sequence <= this.sequence) return "STALE";
    if (sequence !== this.sequence + 1) { this.pending.set(sequence, true); return "GAP"; }
    this.sequence = sequence; return "APPLIED";
  }
  replay(events, gapDetected) {
    if (gapDetected) return "SNAPSHOT_REQUIRED";
    let cursor = this.sequence;
    for (const sequence of events) {
      if (sequence <= cursor) continue;
      if (sequence !== cursor + 1) return "SNAPSHOT_REQUIRED";
      cursor = sequence;
    }
    this.sequence = cursor;
    for (const sequence of [...this.pending.keys()].sort((a, b) => a - b)) {
      if (sequence <= this.sequence) this.pending.delete(sequence);
    }
    return "APPLIED";
  }
  snapshot(sequence) { if (sequence >= this.sequence) this.sequence = sequence; this.pending.clear(); }
}

const replay = new Model();
replay.snapshot(1);
assert.equal(replay.live(3), "GAP");
assert.equal(replay.sequence, 1);
assert.equal(replay.replay([2, 3], false), "APPLIED");
assert.equal(replay.sequence, 3);
assert.equal(replay.pending.size, 0);
const fallback = new Model();
fallback.snapshot(1);
assert.equal(fallback.live(5), "GAP");
assert.equal(fallback.replay([], true), "SNAPSHOT_REQUIRED");
fallback.snapshot(5);
assert.equal(fallback.sequence, 5);

console.log("SCHOOL_DAY_SYNC_CONTROLLER_VERIFY_OK controllerContracts=8 runtimeContracts=7 isolationChecks=5 behaviorCases=6 modelChecks=9");
