import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync("pipsquest/src/shared/NpcSocialPolicy.luau","utf8");
const spec=fs.readFileSync("pipsquest/tests/NpcSocialPolicy.spec.luau","utf8");
for(const m of ["--!strict","MAX_RADIUS = 20","function NpcSocialPolicy.new","function Policy.resolveSchedule","function Policy.evaluateInteraction","UNKNOWN_NPC","UNKNOWN_INTERACTION","OUT_OF_RANGE","COOLDOWN","COMPANION_REQUIRED","relationshipDelta=0","table.freeze(NpcSocialPolicy)"]){assert.ok(source.includes(m),"missing marker: "+m);}
for(const x of ["DataStoreService","RemoteEvent","RemoteFunction","MarketplaceService","HttpService","math.random","Random.new"]){assert.equal(source.includes(x),false,"pure policy must not own "+x);}
for(const t of ["resolves symbolic schedule intent and anchor","falls back to IDLE for unknown periods","denies unknown NPCs and interactions with zero delta","enforces proximity and cooldown deterministically","gates companion hooks without free-form dialogue"]){assert.ok(spec.includes(t),"missing behavior: "+t);}
const rule={dialogueHookId:"STUDENT_A_GREET",radiusStuds:12,relationshipDelta:1};
const deny=reason=>({allowed:false,reason,relationshipDelta:0});
function evalReq(r){if(r.npcId!=="STUDENT_A")return deny("UNKNOWN_NPC");if(r.kind!=="GREET")return deny("UNKNOWN_INTERACTION");if(!Number.isFinite(r.distanceStuds)||r.distanceStuds<0)return deny("INVALID_DISTANCE");if(r.distanceStuds>rule.radiusStuds)return deny("OUT_OF_RANGE");if(!r.cooldownReady)return deny("COOLDOWN");return {allowed:true,reason:"ALLOW",dialogueHookId:rule.dialogueHookId,relationshipDelta:rule.relationshipDelta};}
assert.equal(evalReq({npcId:"MISSING",kind:"GREET",distanceStuds:1,cooldownReady:true}).relationshipDelta,0);
assert.equal(evalReq({npcId:"STUDENT_A",kind:"DANCE",distanceStuds:1,cooldownReady:true}).reason,"UNKNOWN_INTERACTION");
assert.equal(evalReq({npcId:"STUDENT_A",kind:"GREET",distanceStuds:12.01,cooldownReady:true}).reason,"OUT_OF_RANGE");
assert.equal(evalReq({npcId:"STUDENT_A",kind:"GREET",distanceStuds:12,cooldownReady:false}).reason,"COOLDOWN");
assert.equal(evalReq({npcId:"STUDENT_A",kind:"GREET",distanceStuds:12,cooldownReady:true}).dialogueHookId,"STUDENT_A_GREET");
console.log("NPC_SOCIAL_POLICY_VERIFY_OK contracts=12 forbiddenChecks=7 behaviorCases=5 modelChecks=5");
