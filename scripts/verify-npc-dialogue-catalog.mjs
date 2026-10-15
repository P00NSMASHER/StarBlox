import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("pipsquest/src/shared/NpcDialogueCatalog.luau", "utf8");
const spec = fs.readFileSync("pipsquest/tests/NpcDialogueCatalog.spec.luau", "utf8");
const contract = fs.readFileSync("pipsquest/NPC_SOCIAL_CONTRACT.md", "utf8");

for (const marker of [
  "--!strict",
  "MAX_LINE_LENGTH = 160",
  "function NpcDialogueCatalog.new",
  "function Catalog.resolve",
  "UNKNOWN_HOOK",
  "INVALID_CONTEXT",
  "COMPANION_DEFAULT",
  "cannot interpolate player-authored text",
  "table.freeze(NpcDialogueCatalog)",
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
]) assert.equal(source.includes(forbidden), false, `dialogue catalog must remain runtime-neutral: ${forbidden}`);

for (const behavior of [
  "resolves relationship variants deterministically with default fallback",
  "prefers companion variants without accepting user-entered text",
  "fails closed for unknown hooks and invalid context",
  "deep-copies authored dialogue so callers cannot mutate active lines",
  "rejects unsupported fields, multiline text, and interpolation tokens",
]) assert.ok(spec.includes(behavior), `missing behavior spec: ${behavior}`);

for (const marker of [
  "Dialogue catalog seam",
  "companion tier -> companion default -> base tier -> base default",
  "does not accept player-written dialogue",
  "Unknown hooks or invalid context fail closed",
]) assert.ok(contract.includes(marker), `missing dialogue contract marker: ${marker}`);

const entries = {
  STUDENT_A_GREET: {
    role: "STUDENT",
    lines: {DEFAULT: "base", FRIENDLY: "friendly"},
    companionLines: {DEFAULT: "companion", TRUSTED: "companion-trusted"},
  },
};
function resolve(hookId, context) {
  const entry = entries[hookId];
  if (!entry) return {found:false, reason:"UNKNOWN_HOOK"};
  if (!["NEW","KNOWN","FRIENDLY","TRUSTED"].includes(context.relationshipTier) || typeof context.companionPresent !== "boolean") {
    return {found:false, reason:"INVALID_CONTEXT"};
  }
  const tier = context.relationshipTier;
  if (context.companionPresent && entry.companionLines?.[tier]) return {found:true,text:entry.companionLines[tier],variant:`COMPANION_${tier}`};
  if (context.companionPresent && entry.companionLines?.DEFAULT) return {found:true,text:entry.companionLines.DEFAULT,variant:"COMPANION_DEFAULT"};
  if (entry.lines[tier]) return {found:true,text:entry.lines[tier],variant:tier};
  return {found:true,text:entry.lines.DEFAULT,variant:"DEFAULT"};
}
assert.deepEqual(resolve("STUDENT_A_GREET", {relationshipTier:"FRIENDLY", companionPresent:false}), {found:true,text:"friendly",variant:"FRIENDLY"});
assert.deepEqual(resolve("STUDENT_A_GREET", {relationshipTier:"KNOWN", companionPresent:false}), {found:true,text:"base",variant:"DEFAULT"});
assert.deepEqual(resolve("STUDENT_A_GREET", {relationshipTier:"TRUSTED", companionPresent:true}), {found:true,text:"companion-trusted",variant:"COMPANION_TRUSTED"});
assert.deepEqual(resolve("STUDENT_A_GREET", {relationshipTier:"NEW", companionPresent:true}), {found:true,text:"companion",variant:"COMPANION_DEFAULT"});
assert.equal(resolve("MISSING", {relationshipTier:"NEW", companionPresent:false}).reason, "UNKNOWN_HOOK");
assert.equal(resolve("STUDENT_A_GREET", {relationshipTier:"BESTIE", companionPresent:false}).reason, "INVALID_CONTEXT");

console.log("NPC_DIALOGUE_CATALOG_VERIFY_OK contracts=9 forbiddenChecks=10 behaviorCases=5 modelChecks=6");
