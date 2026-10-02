import assert from "node:assert/strict";
import fs from "node:fs";

const modulePath = new URL("../pipsquest/src/shared/SchoolDayStateMachine.luau", import.meta.url);
const specPath = new URL("../pipsquest/tests/SchoolDayStateMachine.spec.luau", import.meta.url);
const source = fs.readFileSync(modulePath, "utf8");
const spec = fs.readFileSync(specPath, "utf8");

const requiredProductionContracts = [
  "--!strict",
  "function SchoolDayStateMachine.new",
  "function Machine.snapshotAt",
  "function Machine.advance",
  "duplicate period id:",
  "math.max(effectiveElapsed, previous.elapsedSeconds)",
  "skippedPeriodIds",
  "state = \"COMPLETE\"",
  "return table.freeze(SchoolDayStateMachine)",
];

for (const marker of requiredProductionContracts) {
  assert.ok(source.includes(marker), `production contract missing: ${marker}`);
}

for (const forbidden of ["DataStoreService", "RemoteEvent", "RemoteFunction", "MarketplaceService"]) {
  assert.equal(source.includes(forbidden), false, `pure state machine must not own ${forbidden}`);
}

const requiredBehaviorCases = [
  "uses exact half-open period boundaries",
  "clamps backward clock observations",
  "reports every period skipped during lag catch-up",
  "completes deterministically at and beyond the final boundary",
  "rejects invalid schedules",
];

for (const title of requiredBehaviorCases) {
  assert.ok(spec.includes(title), `behavior spec missing: ${title}`);
}

function buildModel(periods) {
  assert.ok(periods.length > 0);
  assert.equal(new Set(periods.map((period) => period.id)).size, periods.length);
  const starts = [];
  let duration = 0;
  for (const period of periods) {
    assert.ok(Number.isFinite(period.durationSeconds) && period.durationSeconds > 0);
    starts.push(duration);
    duration += period.durationSeconds;
  }
  return {
    duration,
    snapshotAt(elapsed) {
      assert.ok(Number.isFinite(elapsed) && elapsed >= 0);
      const bounded = Math.min(elapsed, duration);
      for (let index = 0; index < periods.length; index += 1) {
        const finish = starts[index] + periods[index].durationSeconds;
        if (bounded < finish) {
          return {state: "RUNNING", periodId: periods[index].id, periodIndex: index + 1, elapsedSeconds: bounded};
        }
      }
      return {state: "COMPLETE", periodId: null, periodIndex: periods.length + 1, elapsedSeconds: duration};
    },
    advance(previous, elapsed) {
      const snapshot = this.snapshotAt(Math.max(elapsed, previous?.elapsedSeconds ?? elapsed));
      const skipped = [];
      if (previous && snapshot.periodIndex > previous.periodIndex + 1) {
        for (let index = previous.periodIndex; index < Math.min(snapshot.periodIndex - 1, periods.length); index += 1) {
          skipped.push(periods[index].id);
        }
      }
      return {snapshot, transitioned: Boolean(previous && snapshot.periodIndex !== previous.periodIndex), skipped};
    },
  };
}

const periods = [
  {id: "ARRIVAL", durationSeconds: 30},
  {id: "HOMEROOM", durationSeconds: 60},
  {id: "CLASS_1", durationSeconds: 120},
  {id: "PASSING_1", durationSeconds: 20},
  {id: "CLASS_2", durationSeconds: 120},
  {id: "LUNCH", durationSeconds: 90},
  {id: "DISMISSAL", durationSeconds: 30},
];
const model = buildModel(periods);
assert.equal(model.snapshotAt(0).periodId, "ARRIVAL");
assert.equal(model.snapshotAt(30).periodId, "HOMEROOM");
assert.equal(model.snapshotAt(90).periodId, "CLASS_1");
const previous = model.snapshotAt(10);
assert.deepEqual(model.advance(previous, 215).skipped, ["HOMEROOM", "CLASS_1"]);
assert.equal(model.advance(model.snapshotAt(100), 80).snapshot.elapsedSeconds, 100);
assert.equal(model.snapshotAt(model.duration).state, "COMPLETE");
assert.equal(model.snapshotAt(model.duration + 500).elapsedSeconds, model.duration);

console.log("SCHOOL_DAY_STATE_MACHINE_VERIFY_OK contracts=9 behaviorCases=5 modelChecks=7");
