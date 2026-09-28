import {createHash} from "node:crypto";
import {writeFile} from "node:fs/promises";

const url="https://raw.githubusercontent.com/IIIStatusIII/Roblox-Uncopylocked-Games/d92b5bf18bec7866356b154b56ffb525e137bd34/Brookhaven.rbxl";
const expectedBytes=1276795;
const expectedSha="ddc2248663770e968dfe2b27b97b577c0c12fd93177305b884bed9c929923217";

const response=await fetch(url,{redirect:"follow"});
if(!response.ok) throw new Error("source fetch failed HTTP "+response.status);
const bytes=Buffer.from(await response.arrayBuffer());
if(bytes.length!==expectedBytes) throw new Error("source byte count mismatch");
const sha=createHash("sha256").update(bytes).digest("hex");
if(sha!==expectedSha) throw new Error("source SHA-256 mismatch");
await writeFile("Brookhaven.rbxl",bytes);
console.log("PINNED_BROOKHAVEN_SOURCE_OK bytes="+bytes.length+" sha256="+sha);
