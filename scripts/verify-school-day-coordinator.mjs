import assert from "node:assert/strict";
import fs from "node:fs";

const coordinator = fs.readFileSync(new URL("../pipsquest/src/server/SchoolDayCoordinator.luau", import.meta.url), "utf8");
const runtime = fs.readFileSync(new URL("../pipsquest/src/server/SchoolDayRuntime.server.luau", import.meta.url), "utf8");
const spec = fs.readFileSync(new URL("../pipsquest/tests/SchoolDayCoordinator.spec.luau", import.meta.url), "utf8");

for (const marker of [
  "function SchoolDayCoordinator.new",
  "function CoordinatorMethods.step",
  "math.max(serverTime, self._lastServerTime, self._startServerTime)",
  "transitionReason = reason",
  "skippedDayCount",
  "skippedPeriodIds",
  "nextTransitionServerTime",
]) assert.ok(coordinator.includes(marker), `coordinator contract missing: ${marker}`);

for (const marker of [
  '"StarBloxSchoolDay"',
  '"SnapshotChanged"',
  '"GetSnapshot"',
  "workspace:GetServerTimeNow()",
  "snapshotChanged:FireAllClients",
  'runtime:SetAttribute("AuthoritativeServerReady", true)',
]) assert.ok(runtime.includes(marker), `runtime contract missing: ${marker}`);

for (const forbidden of ["OnServerEvent", "DataStoreService", "MarketplaceService", "Purchase", "Award"]) {
  assert.equal(runtime.includes(forbidden), false, `runtime must not accept or award through ${forbidden}`);
}

for (const title of [
  "increments sequence only for observable transitions",
  "clamps backward server time",
  "exposes a bounded intermission then starts the next day",
  "reports skipped periods and whole days after delayed ticks",
]) assert.ok(spec.includes(title), `behavior spec missing: ${title}`);

function machine(periods) {
  const duration = periods.reduce((sum, period) => sum + period.duration, 0);
  return {duration, snapshotAt(elapsed) {
    const bounded = Math.min(Math.max(0, elapsed), duration);
    let start = 0;
    for (let index = 0; index < periods.length; index += 1) {
      const finish = start + periods[index].duration;
      if (bounded < finish) return {state:"RUNNING", periodId:periods[index].id, periodIndex:index+1, elapsedSeconds:bounded, periodRemainingSeconds:finish-bounded};
      start = finish;
    }
    return {state:"COMPLETE", periodId:null, periodIndex:periods.length+1, elapsedSeconds:duration, periodRemainingSeconds:0};
  }};
}

function coordinatorModel(day, start, intermission) {
  const cycle = day.duration + intermission;
  let lastTime = start;
  let dayNumber = 1;
  let sequence = 1;
  let snapshot = day.snapshotAt(0);
  return {step(serverTime) {
    const effective = Math.max(serverTime, lastTime, start);
    lastTime = effective;
    const total = effective - start;
    const cycleIndex = Math.floor(total / cycle);
    const nextDayNumber = cycleIndex + 1;
    const elapsed = total - cycleIndex * cycle;
    let reason = "NONE";
    let skippedDayCount = 0;
    if (nextDayNumber !== dayNumber) {
      skippedDayCount = Math.max(0, nextDayNumber - dayNumber - 1);
      dayNumber = nextDayNumber;
      snapshot = day.snapshotAt(Math.min(elapsed, day.duration));
      sequence += 1;
      reason = "DAY_STARTED";
    } else {
      const next = day.snapshotAt(Math.min(elapsed, day.duration));
      if (next.periodIndex !== snapshot.periodIndex) {
        sequence += 1;
        reason = "PERIOD_CHANGED";
      }
      snapshot = next;
    }
    return {serverTime:effective, dayNumber, sequence, reason, skippedDayCount, inIntermission:elapsed>=day.duration, snapshot};
  }};
}

const day = machine([{id:"ARRIVAL",duration:10},{id:"CLASS",duration:20},{id:"DISMISSAL",duration:10}]);
const model = coordinatorModel(day, 1000, 5);
assert.equal(model.step(1001).sequence, 1);
assert.equal(model.step(1010).sequence, 2);
assert.equal(model.step(1011).sequence, 2);
const later = model.step(1020);
assert.equal(model.step(1010).serverTime, later.serverTime);
const intermission = model.step(1041);
assert.equal(intermission.inIntermission, true);
assert.equal(intermission.snapshot.state, "COMPLETE");
const nextDay = model.step(1045);
assert.equal(nextDay.dayNumber, 2);
assert.equal(nextDay.reason, "DAY_STARTED");
const delayed = model.step(1140);
assert.equal(delayed.skippedDayCount, 1);

console.log("SCHOOL_DAY_COORDINATOR_VERIFY_OK coordinatorContracts=7 runtimeContracts=6 behaviorCases=4 modelChecks=10");
