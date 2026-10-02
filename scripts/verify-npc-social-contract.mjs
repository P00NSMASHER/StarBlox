import fs from "node:fs";
import assert from "node:assert/strict";

const c=fs.readFileSync("pipsquest/NPC_SOCIAL_CONTRACT.md","utf8");
for(const m of [
  "Version: 1",
  "Server owns schedule state",
  "Unknown NPCs or interactions return DENY",
  "Unknown schedule periods resolve to IDLE",
  "Maximum interaction radius: 20 studs",
  "Denied interactions always produce relationship delta 0",
  "companionPresent boolean",
  "does not collect real-player personal data",
  "open PR #179",
]) assert.ok(c.includes(m), `missing marker: ${m}`);

assert.ok(c.includes("No random selection in the policy layer"));
assert.ok(c.includes("Clients may request interactions but cannot author outcomes"));
assert.ok(c.includes("No runtime NPC service is added in this increment"));

const relationship=fs.readFileSync("pipsquest/src/shared/NpcRelationshipModel.luau","utf8");
for(const m of [
  "MAX_SCORE = 10",
  "function NpcRelationshipModel.getTier",
  "function NpcRelationshipModel.apply",
  "function NpcRelationshipModel.projectReputation",
  "denied outcome must carry zero relationship delta",
  "allowed relationship delta must be 0 or 1",
  "table.freeze(NpcRelationshipModel)",
]) assert.ok(relationship.includes(m), `missing relationship marker: ${m}`);

for(const x of ["DataStoreService","RemoteEvent","RemoteFunction","HttpService","math.random","Random.new"]) {
  assert.equal(relationship.includes(x), false, `relationship model must remain pure: ${x}`);
}

console.log("NPC_SOCIAL_CONTRACT_VERIFY_OK markers=9 safetyChecks=3 relationshipChecks=13");
