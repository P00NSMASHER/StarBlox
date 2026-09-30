import { readFile, writeFile } from "node:fs/promises";

const apiKey = String(process.env.ROBLOX_OPEN_CLOUD_API_KEY || "").trim();
const universeId = String(process.env.ROBLOX_UNIVERSE_ID || "").trim();
const placeId = String(process.env.ROBLOX_PLACE_ID || "").trim();

if (!apiKey) throw new Error("ROBLOX_OPEN_CLOUD_API_KEY is required");
if (universeId !== "6027194615") throw new Error("unexpected universe target");
if (placeId !== "17602626136") throw new Error("unexpected place target");

const bytes = await readFile("pips-quest-playable.rbxlx");
const response = await fetch(
  "https://apis.roblox.com/universes/v1/" + universeId +
    "/places/" + placeId + "/versions?versionType=Published",
  {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/xml",
    },
    body: bytes,
  },
);

const text = await response.text();
if (!response.ok) {
  throw new Error("Roblox publish failed HTTP " + response.status + ": " + text.slice(0, 2000));
}

const payload = JSON.parse(text);
const versionNumber = Number(payload.versionNumber);
if (!Number.isInteger(versionNumber) || versionNumber < 1) {
  throw new Error("missing published versionNumber");
}

await writeFile("pips-quest-published-version.txt", String(versionNumber));
await writeFile("pips-quest-publish-response.json", JSON.stringify(payload, null, 2) + "\n");
console.log("PIPS_QUEST_PUBLISHED version=" + versionNumber);
