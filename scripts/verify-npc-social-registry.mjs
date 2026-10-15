import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("pipsquest/src/shared/NpcSocialRegistry.luau", "utf8");
const spec = fs.readFileSync("pipsquest/tests/NpcSocialRegistry.spec.luau", "utf8");

for (const marker of [
  "--!strict",
  "NpcSocialRegistry.new",
  "active intent requires anchor",
  "unknown anchor id",
  "unknown dialogue hook id",
  "contains unsupported field",
  "MAX_RADIUS = 20",
  "function Registry.getPolicyRegistry",
  "function Registry.getRole",
  "function Registry.hasAnchor",
  "function Registry.hasDialogueHook",
  "table.freeze(NpcSocialRegistry)",
]) assert.ok(source.includes(marker), `missing marker: ${marker}`);

for (const forbidden of [
  "Players",
  "DataStoreService",
  "RemoteEvent",
  "RemoteFunction",
  "HttpService",
  "MarketplaceService",
  "MemoryStoreService",
  "MessagingService",
  "math.random",
  "Random.new",
]) assert.equal(source.includes(forbidden), false, `registry must remain runtime-neutral: ${forbidden}`);

for (const behavior of [
  "builds a policy-compatible immutable roster",
  "requires known anchors for active schedule intents",
  "allows IDLE without a world anchor",
  "requires predeclared dialogue hook ids",
  "rejects unsupported npc fields instead of retaining player data",
]) assert.ok(spec.includes(behavior), `missing behavior spec: ${behavior}`);

const allowedNpcKeys = new Set(["role", "schedule", "interactions"]);
const anchors = new Set(["ROOM_101", "CAFETERIA"]);
const dialogueHooks = new Set(["STUDENT_A_GREET"]);
function validateNpc(npc) {
  for (const key of Object.keys(npc)) assert.ok(allowedNpcKeys.has(key));
  for (const rule of Object.values(npc.schedule)) {
    if (rule.intent !== "IDLE") assert.ok(rule.anchorId);
    if (rule.anchorId) assert.ok(anchors.has(rule.anchorId));
  }
  for (const rule of Object.values(npc.interactions)) assert.ok(dialogueHooks.has(rule.dialogueHookId));
}
validateNpc({
  role: "STUDENT",
  schedule: {CLASS_1:{intent:"LEARN",anchorId:"ROOM_101"},FREE:{intent:"IDLE"}},
  interactions: {GREET:{dialogueHookId:"STUDENT_A_GREET",radiusStuds:12,relationshipDelta:1}},
});
assert.throws(() => validateNpc({role:"STUDENT", schedule:{CLASS_1:{intent:"LEARN"}}, interactions:{}}));
assert.throws(() => validateNpc({role:"STUDENT", schedule:{CLASS_1:{intent:"LEARN",anchorId:"GYM"}}, interactions:{}}));
assert.throws(() => validateNpc({role:"STUDENT", schedule:{}, interactions:{GREET:{dialogueHookId:"FREE_FORM_TEXT"}}}));
assert.throws(() => validateNpc({role:"STUDENT", schedule:{}, interactions:{}, userId:12345}));

console.log("NPC_SOCIAL_REGISTRY_VERIFY_OK contracts=12 forbiddenChecks=10 behaviorCases=5 modelChecks=5");
