import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("pipsquest/src/shared/NpcSocialBundle.luau", "utf8");
const spec = fs.readFileSync("pipsquest/tests/NpcSocialBundle.spec.luau", "utf8");
const contract = fs.readFileSync("pipsquest/NPC_SOCIAL_CONTRACT.md", "utf8");

for (const marker of [
  "--!strict",
  "NpcSocialRegistry.new",
  "NpcSocialPolicy.new",
  "NpcDialogueCatalog.new",
  "NpcInteractionResolver.new",
  "declared dialogue hook missing catalog entry",
  "dialogue catalog hook must be declared",
  "dialogue role mismatch for npc",
  "assertOnlyKeys(rawConfig, ALLOWED_BUNDLE_KEYS, \"npc social bundle config\")",
  "table.freeze(NpcSocialBundle)",
]) assert.ok(source.includes(marker), `missing bundle marker: ${marker}`);

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
]) assert.equal(source.includes(forbidden), false, `bundle must remain runtime-neutral: ${forbidden}`);

for (const behavior of [
  "builds a cohesive validated stack that resolves an approved interaction",
  "rejects a declared dialogue hook that is missing from the catalog",
  "rejects catalog entries that were not explicitly declared",
  "rejects dialogue role mismatches before constructing the runtime-neutral stack",
  "rejects unsupported top-level fields instead of retaining player data",
]) assert.ok(spec.includes(behavior), `missing bundle behavior spec: ${behavior}`);

for (const marker of [
  "Bundle construction seam",
  "declared dialogue hook must have exactly one catalog entry",
  "dialogue role must match the owning NPC role",
  "validates the complete cross-contract configuration before returning",
  "no player identifiers, profile data, free-form text, persistence, networking, or world Instances",
]) assert.ok(contract.includes(marker), `missing bundle contract marker: ${marker}`);

const config = {
  registry: {
    dialogueHooks: ["STUDENT_A_GREET", "TEACHER_A_HELP"],
    npcs: {
      STUDENT_A: {role:"STUDENT", interactions:{GREET:{dialogueHookId:"STUDENT_A_GREET"}}},
      TEACHER_A: {role:"TEACHER", interactions:{ASK_HELP:{dialogueHookId:"TEACHER_A_HELP"}}},
    },
  },
  dialogue: {
    STUDENT_A_GREET: {role:"STUDENT"},
    TEACHER_A_HELP: {role:"TEACHER"},
  },
};
function validateCrossLinks(value) {
  assert.deepEqual(Object.keys(value).sort(), ["dialogue", "registry"]);
  const declared = new Set(value.registry.dialogueHooks);
  for (const hook of declared) assert.ok(value.dialogue[hook]);
  for (const hook of Object.keys(value.dialogue)) assert.ok(declared.has(hook));
  for (const [npcId, npc] of Object.entries(value.registry.npcs)) {
    for (const [kind, rule] of Object.entries(npc.interactions)) {
      assert.equal(value.dialogue[rule.dialogueHookId].role, npc.role, `${npcId}:${kind}`);
    }
  }
}
validateCrossLinks(config);
assert.throws(() => validateCrossLinks({...config, dialogue:{STUDENT_A_GREET:{role:"STUDENT"}}}));
assert.throws(() => validateCrossLinks({...config, dialogue:{...config.dialogue, UNDECLARED:{role:"STUDENT"}}}));
assert.throws(() => validateCrossLinks({...config, dialogue:{...config.dialogue, STUDENT_A_GREET:{role:"TEACHER"}}}));
assert.throws(() => validateCrossLinks({...config, playerUserId:12345}));

console.log("NPC_SOCIAL_BUNDLE_VERIFY_OK contracts=10 forbiddenChecks=10 behaviorCases=5 contractChecks=5 modelChecks=5");
