import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../pipsquest/src/server/SchoolDayTransitionJournal.luau", import.meta.url), "utf8");
const runtime = fs.readFileSync(new URL("../pipsquest/src/server/SchoolDayRuntime.server.luau", import.meta.url), "utf8");
const spec = fs.readFileSync(new URL("../pipsquest/tests/SchoolDayTransitionJournal.spec.luau", import.meta.url), "utf8");

for (const marker of [
  "function SchoolDayTransitionJournal.new",
  "function JournalMethods.append",
  "function JournalMethods.readAfter",
  "envelope.sequence <= latest.sequence",
  "#self._events > self._capacity",
  "gapDetected",
  "return table.freeze(SchoolDayTransitionJournal)",
]) assert.ok(source.includes(marker), `journal contract missing: ${marker}`);

for (const marker of [
  '"GetUpdates"',
  "SchoolDayTransitionJournal.new(REPLAY_CAPACITY)",
  "journal:append(result.envelope)",
  'errorCode = "INVALID_SEQUENCE_CURSOR"',
  "journal:readAfter(afterSequence)",
  "journal:append(initialEnvelope)",
]) assert.ok(runtime.includes(marker), `runtime replay contract missing: ${marker}`);

for (const forbidden of ["OnServerEvent", "DataStoreService", "MarketplaceService", "Award", "Purchase"]) {
  assert.equal(source.includes(forbidden), false, `journal must not own ${forbidden}`);
  assert.equal(runtime.includes(forbidden), false, `runtime must not own ${forbidden}`);
}

for (const title of [
  "retains transitions in ascending sequence order",
  "rejects duplicate and stale transition sequences",
  "bounds memory and reports a replay gap",
  "returns only transitions newer than the client cursor",
]) assert.ok(spec.includes(title), `behavior spec missing: ${title}`);

class JournalModel {
  constructor(capacity) {
    assert.ok(Number.isInteger(capacity) && capacity > 0);
    this.capacity = capacity;
    this.events = [];
  }
  append(envelope) {
    const latest = this.events.at(-1);
    if (latest && envelope.sequence <= latest.sequence) return false;
    this.events.push(envelope);
    if (this.events.length > this.capacity) this.events.shift();
    return true;
  }
  readAfter(sequence) {
    const oldest = this.events[0];
    const latest = this.events.at(-1);
    return {
      events: this.events.filter((event) => event.sequence > sequence),
      gapDetected: Boolean(oldest && sequence < oldest.sequence - 1),
      oldestSequence: oldest?.sequence,
      latestSequence: latest?.sequence,
    };
  }
}

const journal = new JournalModel(2);
assert.equal(journal.append({sequence: 1}), true);
assert.equal(journal.append({sequence: 2}), true);
assert.equal(journal.append({sequence: 2}), false);
assert.equal(journal.append({sequence: 1}), false);
assert.equal(journal.append({sequence: 3}), true);
assert.deepEqual(journal.readAfter(0), {
  events: [{sequence: 2}, {sequence: 3}],
  gapDetected: true,
  oldestSequence: 2,
  latestSequence: 3,
});
assert.deepEqual(journal.readAfter(2).events, [{sequence: 3}]);
assert.equal(journal.readAfter(2).gapDetected, false);

console.log("SCHOOL_DAY_TRANSITION_JOURNAL_VERIFY_OK journalContracts=7 runtimeContracts=6 behaviorCases=4 modelChecks=8");
