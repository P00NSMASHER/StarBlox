import {readFile,writeFile} from "node:fs/promises";

const apiKey=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY||"").trim();
const universeId=String(process.env.ROBLOX_UNIVERSE_ID||"").trim();
const placeId=String(process.env.ROBLOX_PLACE_ID||"").trim();
if(!apiKey) throw new Error("ROBLOX_OPEN_CLOUD_API_KEY is required");
if(universeId!=="6027194615") throw new Error("unexpected universe target");
if(placeId!=="17602626136") throw new Error("unexpected place target");

const bytes=await readFile("Brookhaven.rbxl");
const url="https://apis.roblox.com/universes/v1/"+universeId+"/places/"+placeId+"/versions?versionType=Published";
let response;
let text="";
for(let attempt=0;attempt<10;attempt++){
  response=await fetch(url,{
    method:"POST",
    headers:{
      "x-api-key":apiKey,
      "content-type":"application/octet-stream"
    },
    body:bytes
  });
  text=await response.text();
  if(response.ok) break;

  const transient=response.status===409||response.status===429||response.status>=500;
  if(!transient||attempt===9){
    throw new Error("Roblox publish failed HTTP "+response.status+": "+text.slice(0,2000));
  }

  const retryAfterSeconds=Number(response.headers.get("retry-after")||0);
  const fallbackMs=Math.min(30000,3000*(attempt+1));
  const waitMs=Math.max(retryAfterSeconds*1000,fallbackMs);
  console.log("publish retry after HTTP "+response.status+" in "+waitMs+"ms");
  await new Promise(resolve=>setTimeout(resolve,waitMs));
}
if(!response?.ok) throw new Error("Roblox publish failed without success: "+text.slice(0,2000));
const payload=JSON.parse(text);
const versionNumber=Number(payload.versionNumber);
if(!Number.isInteger(versionNumber)||versionNumber<1) throw new Error("missing published versionNumber");
await writeFile("published-version.txt",String(versionNumber));
await writeFile("publish-response.json",JSON.stringify(payload,null,2)+"\n");
console.log("CLEAN_BROOKHAVEN_PUBLISHED version="+versionNumber);
