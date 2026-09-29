--!nonstrict
-- Shared server bootstrap. Normal Roblox servers call this from Main; Open Cloud
-- verification can explicitly call the same packaged code because execution
-- sessions do not automatically run Script instances.
local Bootstrap={}
local started=false
local starting=false

function Bootstrap.start()
 if started then return true,"ALREADY_STARTED" end
 if starting then error("LANTERN_BOOTSTRAP_REENTRANT") end
 starting=true
 local Players=game:GetService("Players")
 local ReplicatedStorage=game:GetService("ReplicatedStorage")
 local RunService=game:GetService("RunService")
 local shared=ReplicatedStorage:WaitForChild("LanternIslandShared",15)
 assert(shared,"LanternIslandShared missing; build the isolated project")
 local Protocol=require(shared:WaitForChild("Protocol",15))
 local TargetPolicy=require(script.Parent:WaitForChild("TargetPolicy",15))
 if not TargetPolicy.allowed(game.GameId,game.PlaceId,RunService:IsStudio()) then
  error("LANTERN_TARGET_UNEXPECTED: release target is not authorized")
 end
 assert(not ReplicatedStorage:FindFirstChild(Protocol.REMOTE_FOLDER),"Duplicate Lantern Island bootstrap")
 local remotes=Instance.new("Folder");remotes.Name=Protocol.REMOTE_FOLDER
 remotes:SetAttribute("ProtocolVersion",Protocol.VERSION);remotes:SetAttribute("RuntimeStatus","BOOTING")
 local actionRemote=Instance.new("RemoteEvent");actionRemote.Name=Protocol.ACTION_REMOTE;actionRemote.Parent=remotes
 local stateRemote=Instance.new("RemoteEvent");stateRemote.Name=Protocol.STATE_REMOTE;stateRemote.Parent=remotes;remotes.Parent=ReplicatedStorage
 local services,sessions,missing={},{},{}
 local runtimeStatus="BOOTING"
 local identity=script.Parent:FindFirstChild("BuildIdentity")
 local buildId=identity and identity.Value or "source-development"
 local context={services=services,protocol=Protocol,isStudio=RunService:IsStudio(),buildId=buildId,dataStoreNamespace="LanternIsland_DEV_v1",serverRoot=script.Parent}
 local function copyFields(value,keys)
  local output={};if type(value)~="table" then return output end
  for _,key in ipairs(keys) do local field=value[key]
   if type(field)=="string" then output[key]=string.sub(field,1,1500)
   elseif type(field)=="boolean" then output[key]=field
   elseif type(field)=="number" and field==field and math.abs(field)<1000000000 then output[key]=field end
  end
  return output
 end
 local function publicState(player)
  local session=sessions[player]
  local state={runtimeStatus=runtimeStatus,buildId=buildId,missing=table.clone(missing),profileStatus=session and session.profileStatus or "NOT_LOADED",mutationPending=session and session.busy or false}
  if not session or not session.loaded or runtimeStatus~="READY" then return state end
  local profile=services.ProfileService:publicState(player)
  state.profile=copyFields(profile,{"currency","equippedItemId","saveStatus"});state.profile.ownedItemIds={}
  if type(profile)=="table" and type(profile.ownedItemIds)=="table" then for index,item in ipairs(profile.ownedItemIds) do
   if index>100 then break end;if type(item)=="string" then table.insert(state.profile.ownedItemIds,string.sub(item,1,64)) end
  end end
  state.lesson=copyFields(services.LessonService:publicState(player),{"id","version","title","sourceLabel","reviewStatus"})
  local mission=services.MissionService:publicState(player)
  state.mission=copyFields(mission,{"missionId","activityId","contentVersion","activityType","title","objective","prompt","passage","status","hint","assistance","completedCount","checkpointIndex","checkpointTotal","rewardItemId","independentCount","supportedCount","transferCount","practice"})
  state.mission.representation=copyFields(mission.representation,{"tensA","onesA","tensB","onesB","operation","displayWord","audioAssetId"})
  state.mission.options={}
  if type(mission.options)=="table" then for index,option in ipairs(mission.options) do
   if index>12 then break end;table.insert(state.mission.options,copyFields(option,{"id","label"}))
  end end
  return state
 end
 local function reply(player,requestId,result)
  local session=sessions[player];if not session or player.Parent~=Players then return end
  session.sequence+=1
  local ok,state=pcall(publicState,player)
  if not ok then state={runtimeStatus="STATE_UNAVAILABLE",buildId=buildId};result={ok=false,code="STATE_UNAVAILABLE"};warn("LANTERN_STATE_UNAVAILABLE") end
  stateRemote:FireClient(player,{requestId=requestId,ok=result.ok==true,code=result.code,sequence=session.sequence,state=state})
 end
 context.publish=function(player) reply(player,nil,{ok=true,code="STATE_CHANGED"}) end
 local function loadProfile(player,session)
  if session.loading or session.loaded or runtimeStatus~="READY" then return end
  session.loading=true;session.profileStatus="LOADING"
  local ran,loaded=pcall(function() return services.ProfileService:load(player) end)
  session.loading=false
  if sessions[player]~=session then if ran and loaded==true then pcall(function() services.ProfileService:release(player) end) end;return end
  session.loaded=ran and loaded==true;session.profileStatus=session.loaded and "LOADED" or "LOAD_FAILED"
  reply(player,nil,{ok=session.loaded,code=session.loaded and "PROFILE_READY" or "PROFILE_LOAD_FAILED"})
 end
 local function addPlayer(player)
  if sessions[player] then return end
  local session={limiter=Protocol.newLimiter(os.clock),replay=Protocol.newReplayCache(64),sequence=0,loaded=false,loading=false,busy=false,profileStatus="NOT_LOADED"}
  sessions[player]=session;task.spawn(loadProfile,player,session)
 end
 local function releaseProfile(player)
  local ran,saved=pcall(function() return services.ProfileService:release(player) end)
  if not ran or saved~=true then warn("LANTERN_PROFILE_RELEASE_UNCONFIRMED") end
 end
 local function removePlayer(player)
  local session=sessions[player];sessions[player]=nil;if not session then return end
  -- Finish the one in-flight handler before taking the final profile snapshot.
  local untilTime=os.clock()+15;while session.busy and os.clock()<untilTime do task.wait(.1) end
  if session.loaded then releaseProfile(player) end
  if services.WorldBuilder then pcall(function() services.WorldBuilder:removePlayer(player) end) end
  if services.MissionService then services.MissionService:removePlayer(player) end
 end
 Players.PlayerAdded:Connect(addPlayer);Players.PlayerRemoving:Connect(removePlayer)
 for _,player in ipairs(Players:GetPlayers()) do addPlayer(player) end
 
 actionRemote.OnServerEvent:Connect(function(player,raw)
  local session=sessions[player];if not session or not session.limiter.take() then return end
  local valid,_,request=Protocol.validate(raw);if not valid then return end
  if request.action=="GetState" then reply(player,request.requestId,{ok=true,code="STATE"});return end
  if runtimeStatus~="READY" then reply(player,request.requestId,{ok=false,code="RUNTIME_NOT_READY"});return end
  if not session.loaded then reply(player,request.requestId,{ok=false,code="PROFILE_NOT_READY"});return end
  if session.busy then reply(player,request.requestId,{ok=false,code="BUSY"});return end
  local accepted,replayCode,previous=session.replay.begin(request)
  if not accepted then reply(player,request.requestId,previous or {ok=false,code=replayCode});return end
  session.busy=true
  local ran,result=pcall(function()
   if request.action=="EquipItem" then return services.RewardService:handle(player,request) end
   return services.MissionService:handle(player,request)
  end)
  if not ran or type(result)~="table" or type(result.ok)~="boolean" or type(result.code)~="string" or #result.code>64 or not string.match(result.code,"^[%w_.:%-]+$") then
   result={ok=false,code="ACTION_FAILED"};warn("LANTERN_ACTION_FAILED")
  end
  session.replay.finish(request.requestId,result);session.busy=false;reply(player,request.requestId,result)
 end)
 local contracts={
  {name="ProfileService",methods={"load","publicState","release","get","save"}},
  {name="LessonService",methods={"publicState","quests","getQuest","getActivity","check","options"}},
  {name="WorldBuilder",methods={"build","setEquipped","onCheckpoint","restoreMission","isNearMission"}},
  {name="RewardService",methods={"handle","grant"}},
  {name="MissionService",methods={"handle","publicState","removePlayer"}},
 }
 for _,contract in ipairs(contracts) do local module=script.Parent:FindFirstChild(contract.name)
  if not module or not module:IsA("ModuleScript") then table.insert(missing,contract.name) end
 end
 if #missing>0 then runtimeStatus="DEPENDENCIES_MISSING"
 else
  local ok,err=pcall(function()
   for _,contract in ipairs(contracts) do
    local definition=require(script.Parent[contract.name]);assert(type(definition)=="table" and type(definition.new)=="function",contract.name..".new required")
    local service=definition.new(context)
    for _,method in ipairs(contract.methods) do assert(type(service[method])=="function",contract.name..":"..method.." required") end
    services[contract.name]=service
   end
   services.WorldBuilder:build()
  end)
  runtimeStatus=ok and "READY" or "BOOT_FAILED"
  if not ok then warn("LANTERN_BOOT_FAILED",tostring(err)) end
 end
 remotes:SetAttribute("RuntimeStatus",runtimeStatus)
 for player,session in pairs(sessions) do task.spawn(loadProfile,player,session) end
 print("LANTERN_RUNTIME_STATUS",runtimeStatus,buildId)
 game:BindToClose(function()
  local pending=0
  for player,session in pairs(sessions) do if session.loaded then
   pending+=1;task.spawn(function()
    local deadline=os.clock()+15;while session.busy and os.clock()<deadline do task.wait(.1) end
    releaseProfile(player);pending-=1
   end)
  end end
  local deadline=os.clock()+25;while pending>0 and os.clock()<deadline do task.wait(.1) end
  if pending>0 then warn("LANTERN_CLOSE_SAVE_UNCONFIRMED") end
 end)
 starting=false
 started=true
 return true,"STARTED"
end

return Bootstrap