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
  'local SSS=game:GetService("ServerScriptService")',
  'local RS=game:GetService("ReplicatedStorage")',
  'local client=SG:FindFirstChild("BrookhavenCompat")',
  'assert(client and client:IsA("LocalScript") and client.Disabled==false,"native UI fallback missing")',
  'assert(not string.find(client.Source,"StarCoinShop",1,true),"custom Star Shop still overrides Brookhaven")',
  'assert(not string.find(client.Source,"hideLegacyShopPages",1,true),"legacy shop hider still present")',
  'local avatar=SG:FindFirstChild("AvatarEditor")',
  'assert(avatar and avatar:IsA("LocalScript") and avatar.Disabled==false,"executing StarterGui AvatarEditor clone missing")',
  'assert(avatar:FindFirstChild("Button") and avatar:FindFirstChild("CharacterSizeNumber"),"AvatarEditor controller children missing")',
  'assert(string.find(avatar.Source,"UpdateAvatar",1,true) and string.find(avatar.Source,"CharacterSizeUp",1,true),"native avatar callbacks missing")',
  'local remotes=RS:WaitForChild("RemoteEvents")',
  'assert(remotes.Clothes:IsA("RemoteEvent") and remotes.UpdateAvatar:IsA("RemoteEvent"),"native avatar remotes missing")',
  'assert(remotes.Pass:IsA("RemoteEvent") and remotes.Car:IsA("RemoteEvent"),"native shop/vehicle remotes missing")',
  'assert(remotes.KeyFab:IsA("RemoteFunction") and remotes.Tools:IsA("RemoteFunction"),"native function remotes missing")',
  'local server=SSS:FindFirstChild("BrookhavenHouseCompat")',
  'assert(server and server:IsA("Script") and server.Disabled==false,"native server bridge missing")',
  'assert(string.find(server.Source,"BrookhavenNativeRuntimeCore",1,true),"live server is not wired to shared runtime core")',
  'assert(string.find(server.Source,"findNativeToolDisplay",1,true) and string.find(server.Source,"buildToolFromDisplayPart",1,true),"live Backpack source-display handoff missing")',
  'assert(string.find(server.Source,"spawnNativeHorse",1,true),"live server horse spawn handler missing")',
  'assert(string.find(server.Source,"RuntimeCore.mountHorseToCharacter",1,true),"live server horse mount handoff missing")',
  'assert(string.find(server.Source,"RuntimeCore.dismountHorseToWorld",1,true),"live server horse dismount handoff missing")',
  'assert(string.find(server.Source,"CheckPlayeForHorse",1,true) and string.find(server.Source,"HorseStart",1,true) and string.find(server.Source,"HorseDismountPlayer",1,true),"native horse client event sequence missing")',
  'local coreModule=SSS:WaitForChild("BrookhavenNativeRuntimeCore")',
  'assert(coreModule:IsA("ModuleScript"),"native runtime core ModuleScript missing")',
  'local core=require(coreModule)',
  'local result=core.runBehaviorProbe()',
  'assert(result,"native runtime behavior probe missing")',
  'print("NATIVE_SUBSYSTEMS social="..tostring(result.social and result.social.ok).." follower="..tostring(result.follower and result.follower.ok).." horseLifecycle="..tostring(result.horseLifecycle and result.horseLifecycle.ok).." horseCustomization="..tostring(result.horseCustomization and result.horseCustomization.ok).." toolVisual="..tostring(result.toolVisual and result.toolVisual.ok).." vehicleMusic="..tostring(result.vehicleMusic and result.vehicleMusic.ok).." hairColor="..tostring(result.hairColor and result.hairColor.ok).." houseFire="..tostring(result.houseFire and result.houseFire.ok).." houseMusic="..tostring(result.houseMusic and result.houseMusic.ok).." curtains="..tostring(result.curtains and result.curtains.ok).." clock="..tostring(result.clock and result.clock.ok).." avatar="..tostring(result.avatar and result.avatar.ok).." shop="..tostring(result.shop and result.shop.ok).." profile="..tostring(result.profile and result.profile.ok).." houseBusiness="..tostring(result.houseBusiness and result.houseBusiness.ok).." vehicle="..tostring(result.vehicle and result.vehicle.ok).." contracts="..tostring(result.contracts and result.contracts.ok))',
  'assert(result.contracts and result.contracts.ok==true,"native contract behavior failed")',
  'assert(result.social and result.social.ok==true,"social pair behavior failed")',
  'assert(result.follower and result.follower.ok==true,"BabyFollow native-display behavior failed")',
  'assert(result.toolVisual and result.toolVisual.ok==true,"Backpack source-display tool behavior failed")',
  'assert(result.vehicleMusic and result.vehicleMusic.ok==true,"vehicle music behavior failed")',
  'assert(result.horseLifecycle and result.horseLifecycle.ok==true,"horse mount/dismount lifecycle behavior failed")',
  'assert(result.horseCustomization and result.horseCustomization.ok==true,"horse customization behavior failed")',
  'assert(result.hairColor and result.hairColor.ok==true,"hair color behavior failed")',
  'assert(result.houseFire and result.houseFire.ok==true,"house fireplace behavior failed")',
  'assert(result.houseMusic and result.houseMusic.ok==true,"house music behavior failed")',
  'assert(result.curtains and result.curtains.ok==true,"curtain behavior failed")',
  'assert(result.clock and result.clock.ok==true,"clock/day behavior failed")',
  'assert(result.avatar and result.avatar.ok==true,"avatar mutation behavior failed")',
  'assert(result.shop and result.shop.ok==true,"shop pass behavior failed")',
  'assert(result.profile and result.profile.ok==true,"profile/job behavior failed")',
  'assert(result.houseBusiness and result.houseBusiness.ok==true,"house business-sign behavior failed")',
  'local lots=game.Workspace:WaitForChild("001_Lots")',
  'local realFireHouse=nil',
  'for _,lot in ipairs(lots:GetChildren()) do local house=lot:FindFirstChild("HousePickedByPlayer"); if house and house:FindFirstChild("001_Fire",true) then realFireHouse=house; break end end',
  'assert(realFireHouse~=nil,"real Brookhaven house fire source missing")',
  'local fireClone=realFireHouse:Clone()',
  'local fireOn=core.applyHouseFireMutation(fireClone,"PlayerWantsFireOnFirePass")',
  'assert(fireOn and fireOn.ok==true and fireOn.enabled==true and fireOn.effects>0,"real house fireplace enable failed")',
  'local fireOff=core.applyHouseFireMutation(fireClone,"PlayerWantsFireOffFirePass")',
  'assert(fireOff and fireOff.ok==true and fireOff.enabled==false,"real house fireplace disable failed")',
  'fireClone:Destroy()',
  'local worldCommon=game.Workspace:WaitForChild("WorkspaceCom")',
  'local realGiveTools=worldCommon:WaitForChild("001_GiveTools")',
  'local realDisplay=nil',
  'for _,item in ipairs(realGiveTools:GetDescendants()) do if item:IsA("BasePart") and item.Name=="Basketball" then realDisplay=item; break end end',
  'assert(realDisplay~=nil,"real Brookhaven Basketball display source missing")',
  'local realToolBuild=core.buildToolFromDisplayPart(realDisplay,"Basketball")',
  'assert(realToolBuild and realToolBuild.ok==true and realToolBuild.tool and realToolBuild.handle,"real Backpack source-display conversion failed")',
  'assert(realToolBuild.handle.Name=="Handle" and realToolBuild.handle.Anchored==false and realToolBuild.handle.CanCollide==false,"real Backpack handle physics invalid")',
  'assert(realToolBuild.tool:GetAttribute("BrookhavenNativeDisplaySource")==true,"real Backpack native-source attribution missing")',
  'assert(realToolBuild.handle:FindFirstChildOfClass("ClickDetector")==nil and realToolBuild.handle:FindFirstChildWhichIsA("BillboardGui")==nil,"real Backpack world UI leaked into Tool")',
  'realToolBuild.tool:Destroy()',
  'local realHorseTemplate=worldCommon:WaitForChild("003_CarBackup"):WaitForChild("Horse")',
  'local realHorseInfo=core.inspectNativeHorse(realHorseTemplate)',
  'assert(realHorseInfo and realHorseInfo.ok==true,"real Brookhaven horse template contract failed")',
  'local stableDoors=worldCommon:WaitForChild("001_HorseStableDoors")',
  'local stableClicks=0',
  'for _,door in ipairs(stableDoors:GetChildren()) do local clickPart=door:FindFirstChild("Click"); if clickPart and clickPart:FindFirstChildOfClass("ClickDetector") then stableClicks+=1 end end',
  'assert(stableClicks>=3,"native horse stable click targets missing")',
  'local realHorse=realHorseTemplate:Clone()',
  'local horseCharacter=Instance.new("Model")',
  'local horseRoot=Instance.new("Part"); horseRoot.Name="HumanoidRootPart"; horseRoot.Anchored=true; horseRoot.CFrame=CFrame.new(0,20,0); horseRoot.Parent=horseCharacter',
  'local horseWorld=Instance.new("Folder"); horseWorld.Parent=game:GetService("ServerStorage")',
  'local realHorseMount=core.mountHorseToCharacter(realHorse,horseCharacter)',
  'assert(realHorseMount and realHorseMount.ok==true and realHorse.Parent==horseCharacter,"real horse mount transition failed")',
  'local realHorseDismount=core.dismountHorseToWorld(realHorse,horseCharacter,horseWorld)',
  'assert(realHorseDismount and realHorseDismount.ok==true and realHorse.Parent==horseWorld,"real horse dismount transition failed")',
  'horseWorld:Destroy(); horseCharacter:Destroy()',
  'assert(result.ok==true,"native runtime behavior probe failed")',
  'local vehicleResult=result.vehicle',
  'assert(vehicleResult and vehicleResult.ok==true and vehicleResult.hasVehicleSeat==true,"vehicle clone/pivot/seat behavior failed")',
  'assert(vehicleResult.driveReady and vehicleResult.driveReady.ok==true,"vehicle drivetrain preparation failed")',
  'assert(vehicleResult.driveReady.seatAnchored==false,"vehicle seat remained anchored")',
  'assert(vehicleResult.driveReady.driveConstraints==4,"vehicle drivetrain constraint count changed")',
  'local backup=RS:WaitForChild("003_CarBackup")',
  'local proofTemplate=backup:FindFirstChild(vehicleResult.vehicle)',
  'local carHandler=proofTemplate and proofTemplate:FindFirstChild("CarHandler")',
  'local carClient=carHandler and carHandler:FindFirstChild("CarClient")',
  'assert(carClient and carClient:IsA("LocalScript"),"native CarClient handoff source missing")',
  'assert(carClient:FindFirstChild("Car") and carClient.Car:IsA("ObjectValue"),"native CarClient Car state missing")',
  'assert(carClient:FindFirstChild("Stop") and carClient.Stop:IsA("BoolValue"),"native CarClient Stop state missing")',
  'print("STARBLOX_NATIVE_BEHAVIOR_OK version="..tostring(game.PlaceVersion).." avatar="..tostring(result.avatar.ok).." toolVisual="..tostring(result.toolVisual.ok).." nativeToolVisual=true vehicleMusic="..tostring(result.vehicleMusic.ok).." horseLifecycle="..tostring(result.horseLifecycle.ok).." realHorse=true horseCustomization="..tostring(result.horseCustomization.ok).." hairColor="..tostring(result.hairColor.ok).." shop="..tostring(result.shop.ok).." profile="..tostring(result.profile.ok).." houseBusiness="..tostring(result.houseBusiness.ok).." houseFire="..tostring(result.houseFire.ok).." houseMusic="..tostring(result.houseMusic.ok).." curtains="..tostring(result.curtains.ok).." clock="..tostring(result.clock.ok).." vehicle="..tostring(vehicleResult.vehicle).." driveConstraints="..tostring(vehicleResult.driveReady.driveConstraints).." seatAnchored="..tostring(vehicleResult.driveReady.seatAnchored).." descendants="..tostring(vehicleResult.descendants))'
].join("\n");

let response;
for(let attempt=0;attempt<12;attempt++){
  response=await fetch(`https://apis.roblox.com/cloud/v2/universes/${universe}/places/${place}/luau-execution-session-tasks`,{
    method:"POST",
    headers:{"x-api-key":key,"content-type":"application/json"},
    body:JSON.stringify({script:luau,timeout:"30s"})
  });
  if(response.status!==429&&response.status!==500) break;
  if(attempt===11) break;
  const retryAfterSeconds=Number(response.headers.get("retry-after")||0);
  const fallbackMs=Math.min(30000,5000*(attempt+1));
  const waitMs=Math.max(retryAfterSeconds*1000,fallbackMs);
  console.log("native verifier backing off after HTTP "+response.status+" for "+waitMs+"ms");
  await new Promise(resolve=>setTimeout(resolve,waitMs));
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
