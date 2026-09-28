const key=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY||"").trim();
const universe=String(process.env.ROBLOX_UNIVERSE_ID||"").trim();
const place=String(process.env.ROBLOX_PLACE_ID||"").trim();

if(!key) throw new Error("ROBLOX_OPEN_CLOUD_API_KEY is required");
if(universe!=="6027194615"||place!=="17602626136") throw new Error("unexpected StarBlox target");

async function parse(response,label){
  const text=await response.text();
  let payload={};
  try{payload=text?JSON.parse(text):{};}catch{throw new Error(label+" non-JSON HTTP "+response.status);}
  if(!response.ok) throw new Error(label+" HTTP "+response.status+" "+JSON.stringify(payload).slice(0,1800));
  return payload;
}

const luau=[
  'local SG=game:GetService("StarterGui")',
  'local SP=game:GetService("StarterPlayer")',
  'local SS=game:GetService("ServerStorage")',
  'local RS=game:GetService("ReplicatedStorage")',
  'local client=SG:FindFirstChild("BrookhavenCompat")',
  'assert(client and client:IsA("LocalScript") and client.Disabled==false,"native UI fallback missing")',
  'assert(not string.find(client.Source,"StarCoinShop",1,true),"custom Star Shop still overrides Brookhaven")',
  'assert(not string.find(client.Source,"hideLegacyShopPages",1,true),"legacy shop hider still present")',
  'local avatar=SP:WaitForChild("StarterPlayerScripts"):FindFirstChild("AvatarEditor")',
  'assert(avatar and avatar:IsA("LocalScript"),"native AvatarEditor missing")',
  'assert(string.find(avatar.Source,"UpdateAvatar",1,true) and string.find(avatar.Source,"CharacterSizeUp",1,true),"native avatar callbacks missing")',
  'local remotes=RS:WaitForChild("RemoteEvents")',
  'assert(remotes.Clothes:IsA("RemoteEvent") and remotes.UpdateAvatar:IsA("RemoteEvent"),"native avatar remotes missing")',
  'assert(remotes.Pass:IsA("RemoteEvent") and remotes.Car:IsA("RemoteEvent"),"native shop/vehicle remotes missing")',
  'assert(remotes.KeyFab:IsA("RemoteFunction") and remotes.Tools:IsA("RemoteFunction"),"native function remotes missing")',
  'local probe=SS:WaitForChild("StarBloxNativeRuntimeTest",10)',
  'assert(probe and probe:IsA("BindableFunction"),"native runtime behavior probe missing")',
  'local contracts=probe:Invoke("contracts")',
  'assert(contracts and contracts.ok==true,"native contract behavior failed")',
  'local avatarResult=probe:Invoke("avatar")',
  'assert(avatarResult and avatarResult.ok==true,"avatar mutation behavior failed")',
  'local shopResult=probe:Invoke("shop")',
  'assert(shopResult and shopResult.ok==true,"shop pass behavior failed")',
  'local vehicleResult=probe:Invoke("vehicle")',
  'assert(vehicleResult and vehicleResult.ok==true,"vehicle clone/pivot behavior failed")',
  'assert(vehicleResult.hasVehicleSeat==true,"vehicle template has no controllable VehicleSeat")',
  'print("STARBLOX_NATIVE_BEHAVIOR_OK version="..tostring(game.PlaceVersion).." vehicle="..tostring(vehicleResult.vehicle).." descendants="..tostring(vehicleResult.descendants))'
].join("\n");

let response;
for(let attempt=0;attempt<8;attempt++){
  response=await fetch(`https://apis.roblox.com/cloud/v2/universes/${universe}/places/${place}/luau-execution-session-tasks`,{
    method:"POST",
    headers:{"x-api-key":key,"content-type":"application/json"},
    body:JSON.stringify({script:luau,timeout:"30s"})
  });
  if(response.status!==429&&response.status!==500) break;
  await new Promise(resolve=>setTimeout(resolve,2500*(attempt+1)));
}

let task=await parse(response,"create");
const raw=String(task.path||"");
const url="https://apis.roblox.com/cloud/v2/"+raw
  .replace(/^https:\/\/apis\.roblox\.com\/cloud\/v2\//,"")
  .replace(/^\/?cloud\/v2\//,"")
  .replace(/^\//,"");

while(String(task.state||"")==="PROCESSING"){
  await new Promise(resolve=>setTimeout(resolve,1000));
  task=await parse(await fetch(url,{headers:{"x-api-key":key}}),"status");
}

const logs=await parse(await fetch(url+"/logs",{headers:{"x-api-key":key}}),"logs");
const text=JSON.stringify(logs);
if(task.error||/FAIL|ERROR|CANCEL/i.test(String(task.state||""))){
  throw new Error("runtime task failed "+JSON.stringify(task).slice(0,2200));
}
if(!text.includes("STARBLOX_NATIVE_BEHAVIOR_OK")){
  throw new Error("native behavior sentinel missing: "+text.slice(0,4000));
}
console.log(text);
