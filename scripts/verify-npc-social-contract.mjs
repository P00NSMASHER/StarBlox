import fs from "node:fs";
import assert from "node:assert/strict";

const contract = fs.readFileSync("pipsquest/NPC_SOCIAL_CONTRACT.md", "utf8");

const required = [
  "Version: 1",
  "Server owns schedule state",
  "Unknown NPCs or interactions return DENY",
  "Unknown schedule periods resolve to IDLE",
  "IDLE, TRANSIT, LEARN, TEACH, or SOCIALIZE",
  "GREET, CHAT, ASK_HELP, COMPANION_INTRO",
  "Maximum interaction radius: 20 studs",
  "Dialogue output is a preauthored hook ID",
  "Denied interactions always produce relationship delta 0",
  "Allowed relationship delta is bounded to 0 or 1",
  "companionPresent boolean",
  "does not collect real-player personal data",
  "open PR #179"
];

for (const marker of required) {
  assert.ok(contract.includes(marker), `missing NPC social contract marker: ${marker}`);
}

assert.equal(contract.includes("random selection"), true);
assert.equal(contract.includes("Clients may request interactions but cannot author outcomes"), true);
assert.equal(contract.includes("runtime NPC service is added"), false);

console.log("NPC_SOCIAL_CONTRACT_VERIFY_OK markers=13 safetyChecks=3");
