import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("pipsquest/src/shared/NpcInteractionResolver.luau", "utf8");
const spec = fs.readFileSync("pipsquest/tests/NpcInteractionResolver.spec.luau", "utf8");
const contract = fs.readFileSync("pipsquest/NPC_SOCIAL_CONTRACT.md", "utf8");

for (const marker of [
  "--!strict",
  "function NpcInteractionResolver.new",
  "function Resolver.resolve",
  "NpcRelationshipModel.getTier",
  "DIALOGUE_UNAVAILABLE",
  "DIALOGUE_ROLE_MISMATCH",
  "NpcRelationshipModel.apply",
  "reputationContribution=score * 10",
  "table.freeze(NpcInteractionResolver)",
]) assert.ok(source.includes(marker), `missing resolver marker: ${marker}`);

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
]) assert.equal(source.includes(forbidden), false, `interaction resolver must remain pure: ${forbidden}`);

for (const behavior of [
  "preserves relationship state when policy denies an interaction",
  "resolves dialogue from the pre-interaction tier before applying relationship gain",
  "passes only companion presence into deterministic companion dialogue selection",
  "fails closed without relationship gain when approved dialogue is unavailable",
  "fails closed on dialogue role mismatch instead of showing the wrong persona",
  "keeps maxed relationships bounded while returning normalized reputation contribution",
]) assert.ok(spec.includes(behavior), `missing behavior spec: ${behavior}`);

for (const marker of [
  "Interaction resolver seam",
  "Policy denial returns immediately with no dialogue and no relationship change",
  "pre-interaction relationship tier",
  "dialogue/NPC role mismatch fails closed with no relationship gain",
  "normalized to 0-100",
  "owns no remotes, persistence, world Instances, random selection, player identifiers, profile data, or free-form text",
]) assert.ok(contract.includes(marker), `missing resolver contract marker: ${marker}`);

const tier = score => score >= 7 ? "TRUSTED" : score >= 3 ? "FRIENDLY" : score >= 1 ? "KNOWN" : "NEW";
const dialogue = {
  STUDENT_A_GREET: {role:"STUDENT", lines:{DEFAULT:"Hi there.", KNOWN:"Good to see you again."}},
  STUDENT_A_COMPANION: {role:"STUDENT", lines:{DEFAULT:"Your companion looks ready for school."}, companionLines:{TRUSTED:"You two make a great team."}},
};
function resolveDialogue(hook, currentTier, companionPresent, entries=dialogue) {
  const entry = entries[hook];
  if (!entry) return {found:false};
  if (companionPresent && entry.companionLines?.[currentTier]) return {found:true, role:entry.role, text:entry.companionLines[currentTier], variant:`COMPANION_${currentTier}`};
  const text = entry.lines[currentTier] ?? entry.lines.DEFAULT;
  return {found:true, role:entry.role, text, variant:entry.lines[currentTier] ? currentTier : "DEFAULT"};
}
function resolve({allowed=true, reason="ALLOW", hook="STUDENT_A_GREET", delta=1, expectedRole="STUDENT", score=2, companionPresent=false, entries=dialogue}) {
  const currentTier = tier(score);
  if (!allowed) return {allowed:false, reason, score, tier:currentTier, changed:false, reputation:score*10};
  const d = resolveDialogue(hook, currentTier, companionPresent, entries);
  if (!d.found) return {allowed:false, reason:"DIALOGUE_UNAVAILABLE", score, tier:currentTier, changed:false, reputation:score*10};
  if (d.role !== expectedRole) return {allowed:false, reason:"DIALOGUE_ROLE_MISMATCH", score, tier:currentTier, changed:false, reputation:score*10};
  const next = Math.min(10, score + delta);
  return {allowed:true, reason:"ALLOW", text:d.text, variant:d.variant, score:next, tier:tier(next), changed:next!==score, reputation:next*10};
}
assert.deepEqual(resolve({allowed:false, reason:"OUT_OF_RANGE", score:2}), {allowed:false, reason:"OUT_OF_RANGE", score:2, tier:"KNOWN", changed:false, reputation:20});
assert.deepEqual(resolve({score:2}), {allowed:true, reason:"ALLOW", text:"Good to see you again.", variant:"KNOWN", score:3, tier:"FRIENDLY", changed:true, reputation:30});
assert.equal(resolve({hook:"STUDENT_A_COMPANION", score:7, companionPresent:true}).variant, "COMPANION_TRUSTED");
assert.equal(resolve({entries:{}, score:2}).reason, "DIALOGUE_UNAVAILABLE");
assert.equal(resolve({entries:{STUDENT_A_GREET:{role:"TEACHER",lines:{DEFAULT:"x"}}}, score:2}).reason, "DIALOGUE_ROLE_MISMATCH");
assert.deepEqual(resolve({score:10}), {allowed:true, reason:"ALLOW", text:"Hi there.", variant:"DEFAULT", score:10, tier:"TRUSTED", changed:false, reputation:100});

console.log("NPC_INTERACTION_RESOLVER_VERIFY_OK contracts=9 forbiddenChecks=10 behaviorCases=6 modelChecks=6");
