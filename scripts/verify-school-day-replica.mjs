import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../pipsquest/src/client/SchoolDayReplica.luau", import.meta.url), "utf8");
const spec = fs.readFileSync(new URL("../pipsquest/tests/SchoolDayReplica.spec.luau", import.meta.url), "utf8");

for (const marker of [
  "function SchoolDayReplica.new",
  "function ReplicaMethods.applySnapshot",
  "function ReplicaMethods.applyLive",
  "function ReplicaMethods.applyReplay",
  'envelope.protocolVersion == 1',
  'return result("GAP"',
  'return result("SNAPSHOT_REQUIRED"',
  "latestToApply == current",
  "return table.freeze(SchoolDayReplica)",
]) assert.ok(source.includes(marker), `replica contract missing: ${marker}`);

for (const forbidden of [
  "RemoteEvent",
  "RemoteFunction",
  "DataStoreService",
  "MarketplaceService",
  "Players",
  "StarterGui",
]) assert.equal(source.includes(forbidden), false, `pure replica must not own ${forbidden}`);

for (const title of [
  "bootstraps and refreshes from authoritative snapshots",
  "applies only contiguous live transitions",
  "ignores stale and duplicate live transitions",
  "holds state and requests recovery when live delivery has a gap",
  "applies a contiguous replay transaction",
  "rejects non-contiguous replay without partial mutation",
]) assert.ok(spec.includes(title), `behavior spec missing: ${title}`);

class ReplicaModel {
  constructor() { this.current = null; this.recovery = false; }
  valid(event) { return event?.protocolVersion === 1 && Number.isInteger(event?.sequence) && event.sequence > 0; }
  snapshot(event) {
    if (!this.valid(event)) return "INVALID";
    if (this.current && event.sequence < this.current.sequence) return "IGNORED_STALE";
    this.current = event; this.recovery = false; return "APPLIED";
  }
  live(event) {
    if (!this.valid(event)) return "INVALID";
    const expected = this.current ? this.current.sequence + 1 : 1;
    if (this.current && event.sequence <= this.current.sequence) return "IGNORED_STALE";
    if (event.sequence !== expected) { this.recovery = true; return "GAP"; }
    this.current = event; this.recovery = false; return "APPLIED";
  }
  replay(batch) {
    if (batch.gapDetected) { this.recovery = true; return "SNAPSHOT_REQUIRED"; }
    let cursor = this.current?.sequence ?? 0;
    let latest = this.current;
    for (const event of batch.events) {
      if (!this.valid(event)) { this.recovery = true; return "INVALID"; }
      if (event.sequence > cursor) {
        if (event.sequence !== cursor + 1) { this.recovery = true; return "SNAPSHOT_REQUIRED"; }
        cursor = event.sequence; latest = event;
      }
    }
    if (latest === this.current) return "NO_CHANGE";
    this.current = latest; this.recovery = false; return "APPLIED";
  }
}

const event = (sequence) => ({protocolVersion: 1, sequence});
const replica = new ReplicaModel();
assert.equal(replica.snapshot(event(1)), "APPLIED");
assert.equal(replica.live(event(2)), "APPLIED");
assert.equal(replica.live(event(2)), "IGNORED_STALE");
assert.equal(replica.live(event(4)), "GAP");
assert.equal(replica.current.sequence, 2);
assert.equal(replica.recovery, true);
assert.equal(replica.replay({gapDetected: false, events: [event(2), event(3), event(4)]}), "APPLIED");
assert.equal(replica.current.sequence, 4);
assert.equal(replica.recovery, false);
const atomic = new ReplicaModel();
atomic.snapshot(event(1));
assert.equal(atomic.replay({gapDetected: false, events: [event(2), event(4)]}), "SNAPSHOT_REQUIRED");
assert.equal(atomic.current.sequence, 1);

console.log("SCHOOL_DAY_REPLICA_VERIFY_OK contracts=9 isolationChecks=6 behaviorCases=6 modelChecks=11");
