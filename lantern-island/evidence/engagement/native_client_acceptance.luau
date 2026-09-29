-- Native-client acceptance probe, injected only into an isolated Studio session.
-- Real remotes and real UI/world are exercised. This does NOT simulate a finger or mouse click.
local Players=game:GetService("Players")
local Http=game:GetService("HttpService")
local RS=game:GetService("ReplicatedStorage")
local Run=game:GetService("RunService")
local player=Players.LocalPlayer
local receipt=RS:WaitForChild("LanternNativeReceipt",15)
local report={schemaVersion=1,sourceCommit="1165d7ed27107a018a23088116795479fe901649",checks={},failed={},scope="Native Roblox client/server request-result acceptance with scripted positioning; not physical input or full travel-path proof",physicalInput="NOT_RUN",cloudRejoin="NOT_RUN",isClient=Run:IsClient(),isStudio=Run:IsStudio()}
local function check(name,condition)
 if not condition then error(name,2) end
 table.insert(report.checks,name)
 print("LANTERN_NATIVE_CHECK "..name)
end
local ok,err=xpcall(function()
 check("probe executes on real Roblox client",Run:IsClient() and Run:IsRunning())
 local remotes=RS:WaitForChild("LanternIslandRemotes",15)
 local action=remotes:WaitForChild("Action",10);local stateRemote=remotes:WaitForChild("State",10)
 local packets={};local latest
 local connection=stateRemote.OnClientEvent:Connect(function(packet) latest=packet;packets[packet.requestId or "push"]=packet end)
 local function send(kind,fields,replay)
  task.wait(.38)
  local request=replay or {requestId=Http:GenerateGUID(false),action=kind}
  for k,v in pairs(fields or {}) do request[k]=v end
  packets[request.requestId]=nil;action:FireServer(request)
  local deadline=os.clock()+8
  while not packets[request.requestId] and os.clock()<deadline do task.wait(.05) end
  local response=packets[request.requestId];assert(response,"No native response for "..kind)
  task.wait(.15)
  return response,request
 end
 local packet=send("GetState")
 local deadline=os.clock()+20
 while (not packet.state or packet.state.profileStatus~="LOADED") and os.clock()<deadline do task.wait(.5);packet=send("GetState") end
 check("server and profile ready",packet.state.runtimeStatus=="READY" and packet.state.profileStatus=="LOADED")
 report.buildId=packet.state.buildId
 check("exact build identity",report.buildId=="c0b20d1f64fdd89f66fd4c1abafee10cbfbbd07c7de53c99f3a53f6b89b5f9bd")
 local pg=player:WaitForChild("PlayerGui",10);local gui=pg:WaitForChild("LanternIslandUI",10)
 check("production UI mounted",gui~=nil)
 local card=gui:FindFirstChild("ContextCard")
 check("startup begins in exploration",card and not card.Visible and gui.AdventureTracker.Visible)
 local startup=pg:FindFirstChild("LanternIslandStartup")
 check("startup error overlay is off",startup and not startup.Enabled)
 local character=player.Character or player.CharacterAdded:Wait();local root=character:WaitForChild("HumanoidRootPart",10);local humanoid=character:FindFirstChildOfClass("Humanoid")
 local before=root.Position;humanoid:MoveTo(before+Vector3.new(5,0,-5));task.wait(1.1)
 check("humanoid actually moves in world",(root.Position-before).Magnitude>2)
 local world=workspace:WaitForChild("LanternIslandWorld",10)
 local quests={
  {id="lantern-lift",station="LiftConsole",answers={"17","37","42","53"},item="firefly-scarf"},
  {id="ribbon-studio",station="RibbonConsole",answers={"rain","train","paint","snail"},item="rainbow-bow"},
  {id="moon-picnic",station="PicnicConsole",answers={"By the blue pond","Pip puts cups down","To keep the picnic dry","Pip carries the basket"},item="moon-crown"},
 }
 local total=0
 for qi,q in ipairs(quests) do
  for index,answer in ipairs(q.answers) do
   local target=world:FindFirstChild(index==1 and q.station or (q.id.."-checkpoint-"..index))
   assert(target,"Missing world clue")
   character:PivotTo(CFrame.new(target.Position+Vector3.new(0,3,4)))
   task.wait(.5)
   local start=send("StartMission",{missionId=q.id})
   check(q.id.." clue "..index.." starts",start.ok and start.state.mission.status=="ACTIVE")
   local m=start.state.mission
   check(q.id.." clue "..index.." has live options",#m.options==4 and card.Visible and card.CardContent:FindFirstChild("Answer_"..m.options[1].id)~=nil)
   local chosen,wrong
   for _,o in ipairs(m.options) do if o.label==answer then chosen=o.id else wrong=o.id end end
   assert(chosen,"Fixture key not present")
   local fields={missionId=q.id,payload={activityId=m.activityId,contentVersion=m.contentVersion,answer=chosen}}
   if qi==1 and index==1 then
    local wrongResult=send("SubmitAnswer",{missionId=q.id,payload={activityId=m.activityId,contentVersion=m.contentVersion,answer=wrong}})
    check("incorrect answer adds a visible teaching hint",wrongResult.code=="TRY_AGAIN" and wrongResult.state.mission.hint~="" and card.CardContent:FindFirstChild("PipHint")~=nil)
    send("CancelMission",{missionId=q.id});local resumed=send("StartMission",{missionId=q.id})
    check("native pause and resume preserve assistance",resumed.state.mission.assistance=="supported")
   end
   local result,request=send("SubmitAnswer",fields)
   total+=1
   check(q.id.." clue "..index.." returns success",result.ok and result.state.mission.completedCount==total)
   if index<4 then check(q.id.." clue "..index.." explains the result",result.state.mission.status=="BETWEEN" and card.CardContent:FindFirstChild("Explanation")~=nil)
   else
    check(q.id.." grants only its earned reward",result.code=="MISSION_COMPLETE" and result.state.profile.currency==qi*25 and #result.state.profile.ownedItemIds==qi)
    local duplicate=send("SubmitAnswer",nil,request)
    check(q.id.." duplicate request cannot repeat reward",duplicate.state.profile.currency==qi*25 and duplicate.state.mission.completedCount==total)
    local equipped=send("EquipItem",{itemId=q.item})
    check(q.id.." equips through real server handler",equipped.ok and equipped.state.profile.equippedItemId==q.item)
    local pip=world:WaitForChild("Pip_"..player.UserId,5);local visible=false
    for _,p in ipairs(pip:GetChildren()) do if p:IsA("BasePart") and p.Name==q.item and p.Transparency==0 then visible=true end end
    check(q.id.." outfit visibly replicated on Pip",visible)
   end
  end
 end
 local final=send("GetState")
 check("twelve clues credited without claiming mastery",final.state.mission.completedCount==12 and final.state.mission.supportedCount==1 and final.state.mission.independentCount==11 and final.state.mission.transferCount==3)
 check("world restoration is visible",world.LanternGlow.WarmLight.Enabled and world:FindFirstChild("FestivalRibbon")~=nil and world.PicnicReward.Blanket.Transparency==0)
 check("Studio save scope stays explicit",final.state.profile.saveStatus=="STUDIO_SESSION_ONLY")
 report.final={currency=final.state.profile.currency,outfits=#final.state.profile.ownedItemIds,clues=final.state.mission.completedCount,supported=final.state.mission.supportedCount,independent=final.state.mission.independentCount,saveStatus=final.state.profile.saveStatus}
 connection:Disconnect()
end,debug.traceback)
if not ok then table.insert(report.failed,tostring(err));warn("LANTERN_NATIVE_FAILURE "..tostring(err)) end
report.passed=#report.checks;report.failedCount=#report.failed;report.status=ok and "PASS_PROGRAMMATIC_NATIVE_ACCEPTANCE" or "FAIL"
receipt:FireServer(report)
