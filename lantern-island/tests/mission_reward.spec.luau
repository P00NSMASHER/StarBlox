--!nonstrict
-- Runs actual production lesson/mission/reward/migration modules in the standalone Luau VM.
-- Roblox services are test doubles. This is NOT native engine, touch or DataStore proof.
local LessonService=require("../src/server/LessonService")
local MissionService=require("../src/server/MissionService")
local RewardService=require("../src/server/RewardService")
local ProfileData=require("../src/server/ProfileData")
local Protocol=require("../src/shared/Protocol")
local passed=0
local function test(name,fn)
 local ok,err=pcall(fn);assert(ok,"FAIL "..name..": "..tostring(err));passed+=1;print("PASS "..name)
end
local function fixture(saved,userId)
 local player={UserId=userId or 7};local profiles={[player]=ProfileData.copy(saved)}
 local disk={};local worlds={restored={},checkpoints={},equipped={}}
 local context={services={}};local services=context.services
 services.LessonService=LessonService.new(context)
 services.ProfileService={
  get=function(_,p) return profiles[p] end,
  save=function(_,p) if context.failSave then return false,"SAVE_FAILED" end;disk[p.UserId]=ProfileData.copy(profiles[p]);return true,"SAVED" end,
 }
 services.WorldBuilder={
  isNearMission=function() return context.near~=false end,
  restoreMission=function(_,mid) worlds.restored[mid]=true end,
  onCheckpoint=function(_,p,mid,index) worlds.checkpoints[mid..":"..index]=true end,
  setEquipped=function(_,p,id) worlds.equipped[p]=id end,
 }
 services.RewardService=RewardService.new(context);services.MissionService=MissionService.new(context)
 local f={context=context,services=services,player=player,profiles=profiles,disk=disk,world=worlds}
 function f:state() return self.services.MissionService:publicState(self.player) end
 function f:profile() return profiles[player] end
 function f:action(action,mid,payload)
  local request={requestId="test-"..passed,action=action,missionId=mid,payload=payload}
  local valid,code,clean=Protocol.validate(request);assert(valid,code)
  return services.MissionService:handle(player,clean)
 end
 function f:start(mid) return self:action("StartMission",mid) end
 function f:answer(correct)
  local s=self:state();local a=services.LessonService:getActivity(s.activityId)
  local chosen
  for _,option in ipairs(s.options) do if (option.label==a.answer)==correct then chosen=option.id;break end end
  assert(chosen,"No answer option available")
  return self:action("SubmitAnswer",s.missionId,{activityId=s.activityId,contentVersion=s.contentVersion,answer=chosen})
 end
 function f:finish(mid)
  self:start(mid)
  if self:state().status=="COMPLETED" then self:start(mid) end
  for _=1,4 do
   if self:state().status=="BETWEEN" then self:start(mid) end
   assert(self:answer(true).ok)
  end
 end
 return f
end
local f=fixture()
test("three original adventures and twelve unique cards",function()
 local seen={};local count=0
 assert(#f.services.LessonService:quests()==3)
 for _,q in ipairs(f.services.LessonService:quests()) do
  assert(#q.steps==4)
  for _,id in ipairs(q.steps) do assert(not seen[id]);seen[id]=true;count+=1 end
 end
 assert(count==12)
end)
for _,quest in ipairs(f.services.LessonService:quests()) do
 for _,id in ipairs(quest.steps) do
  test("content key and explanations: "..id,function()
   local a=f.services.LessonService:getActivity(id);assert(a and #a.hints==3 and #a.explanation>15)
   for _,uid in ipairs({-1,0,7,8,9999}) do
    local options=f.services.LessonService:options(id,uid);local labels={};local correct=0
    assert(#options==4)
    for _,option in ipairs(options) do assert(not labels[option.label]);labels[option.label]=true
     if f.services.LessonService:check(id,option.id,uid) then correct+=1 end
    end
    assert(correct==1,"Exactly one correct option is required")
   end
   if a.type=="math" then local r=a.representation;assert(r.tensA*10+r.onesA+r.tensB*10+r.onesB==tonumber(a.answer)) end
  end)
 end
end
test("sample is never represented as current homework",function() local s=f.services.LessonService:publicState(f.player);assert(s.reviewStatus=="SAMPLE" and s.sourceLabel:find("not current homework")) end)
test("unloaded profile rejects actions",function() f.profiles[f.player]=nil;assert(f:start("lantern-lift").code=="PROFILE_NOT_READY");f.profiles[f.player]=ProfileData.blank() end)
test("unknown quest has no mutation",function() assert(f:start("unknown").code=="MISSION_UNKNOWN" and f:profile().currency==0) end)
test("walking to station is required for initial start",function() f.context.near=false;assert(f:start("lantern-lift").code=="FOLLOW_BEACON" and f:state().status=="AVAILABLE");f.context.near=true end)
test("start produces live dynamic options",function() assert(f:start("lantern-lift").ok);assert(f:state().status=="ACTIVE" and #f:state().options==4) end)
test("client state has no expected answer or answer key",function() local s=f:state();assert(s.answer==nil and s.expectedAnswer==nil and s.explanation==nil);for _,o in ipairs(s.options) do assert(o.correct==nil and o.answer==nil) end end)
test("stale content cannot earn credit",function() local r=f:action("SubmitAnswer","lantern-lift",{activityId="lift-1",contentVersion="sample-v1",answer=17});assert(not r.ok and r.code=="CONTENT_MISMATCH" and f:profile().currency==0) end)
test("wrong answer supplies instruction not reward",function() local r=f:answer(false);assert(r.code=="TRY_AGAIN" and f:state().hint~="" and f:profile().currency==0) end)
test("starting again cannot erase attempts",function() f:start("lantern-lift");assert(f:profile().questProgress["lantern-lift"].attempts==1) end)
test("pause and resume cannot erase assistance",function() f:action("CancelMission","lantern-lift");f:start("lantern-lift");assert(f:state().assistance=="supported" and f:state().hint~="") end)
test("persisted snapshot retains assistance after simulated rejoin",function() local rejoined=fixture(f.disk[f.player.UserId]);rejoined:start("lantern-lift");assert(rejoined:state().assistance=="supported") end)
test("correct retry records supported work and a world change",function() assert(f:answer(true).code=="CHECKPOINT_COMPLETE");assert(f:profile().learning["lift-1"].assisted and f.world.checkpoints["lantern-lift:1"] and f:state().status=="BETWEEN") end)
test("feedback explains rather than only saying correct",function() assert(f:state().objective:find("tens") and f:state().objective:find("17")) end)
test("duplicate answer cannot advance a checkpoint",function() local r=f:action("SubmitAnswer","lantern-lift",{activityId="lift-1",contentVersion="sample-v2",answer=17});assert(not r.ok and f:profile().questProgress["lantern-lift"].index==2) end)
test("saved next checkpoint resumes instead of restarting",function() local rejoined=fixture(f.disk[f.player.UserId]);rejoined:start("lantern-lift");assert(rejoined:state().activityId=="lift-2" and rejoined.world.checkpoints["lantern-lift:1"]) end)
test("independent answer is separately recorded",function() f:start("lantern-lift");f:answer(true);assert(f:profile().learning["lift-2"].assisted==false) end)
test("requested hint prevents first-try independent credit",function() f:start("lantern-lift");f:action("RequestHint","lantern-lift");f:answer(true);assert(f:profile().learning["lift-3"].assisted==true) end)
test("new transfer problem differs from taught examples",function() f:start("lantern-lift");assert(f:state().activityId=="lift-4" and f:state().hint=="");f:answer(true);local e=f:profile().learning["lift-4"];assert(e.transfer and not e.assisted) end)
test("four steps grant one scarf and restore the hill",function() assert(f:state().status=="COMPLETED" and f:profile().currency==25 and #f:profile().ownedItemIds==1 and f.world.restored["lantern-lift"]) end)
test("earned item equips through actual reward handler",function() local r=f.services.RewardService:handle(f.player,{itemId="firefly-scarf"});assert(r.ok and f:profile().equippedItemId=="firefly-scarf" and f.world.equipped[f.player]=="firefly-scarf") end)
test("locked item cannot be equipped",function() assert(f.services.RewardService:handle(f.player,{itemId="moon-crown"}).code=="ITEM_NOT_OWNED") end)
test("completed profile restores completion and outfit on simulated rejoin",function()
 local rejoined=fixture(f.disk[f.player.UserId]);rejoined:state()
 assert(rejoined:profile().completions["lantern-lift"] and rejoined.world.restored["lantern-lift"] and rejoined.world.equipped[rejoined.player]=="firefly-scarf")
end)
test("replay changes neither stars nor original learning evidence",function()
 local before=ProfileData.summary(f:profile());f:finish("lantern-lift");local after=ProfileData.summary(f:profile())
 assert(f:profile().currency==25 and before.total==after.total and before.independent==after.independent and before.supported==after.supported)
end)
test("word quest completes and grants a bow",function() f:finish("ribbon-studio");assert(f:profile().currency==50 and f.world.restored["ribbon-studio"]) end)
test("reading quest completes and grants a crown",function() f:finish("moon-picnic");assert(f:profile().currency==75 and #f:profile().ownedItemIds==3 and f.world.restored["moon-picnic"]) end)
test("journal reports twelve observations not coin-derived mastery",function() local s=ProfileData.summary(f:profile());assert(s.total==12 and s.independent==10 and s.supported==2 and s.transfer==3) end)
test("completed world and all earned items survive simulated rejoin",function()
 local rejoined=fixture(f.disk[f.player.UserId]);rejoined:state()
 assert(rejoined:profile().currency==75 and rejoined.world.restored["ribbon-studio"] and rejoined.world.restored["moon-picnic"])
end)
test("other player has separate progress and wardrobe",function() local other=fixture(nil,9);other:state();assert(other:profile().currency==0 and other:profile().equippedItemId=="") end)
test("save failure never returns a saved-completion result",function() local broken=fixture();broken:start("lantern-lift");broken.context.failSave=true;assert(broken:answer(true).code=="PROGRESS_SAVE_PENDING" and broken.disk[7]==nil) end)
test("serialization is bounded, deep-copied and deduplicated",function()
 local raw={currency=99999,ownedItemIds={"firefly-scarf","firefly-scarf","injected"},equippedItemId="injected",questProgress={["lantern-lift"]={index=99,attempts=999,hintLevel=99}}}
 local copy=ProfileData.copy(raw);assert(copy.currency==25 and #copy.ownedItemIds==1 and copy.equippedItemId=="")
 assert(copy.questProgress["lantern-lift"].index==4 and copy.questProgress["lantern-lift"].hintLevel==3)
 raw.ownedItemIds[1]="moon-crown";assert(copy.ownedItemIds[1]=="firefly-scarf")
end)
test("malformed concrete answers fail rather than throwing",function() assert(not f.services.LessonService:check("lift-1",{tens="bad",ones=2},7));assert(not f.services.LessonService:check("lift-1",0/0,7)) end)
test("practice mode is explicitly labeled",function() f:start("moon-picnic");assert(f:state().passage:find("Practice replay") and f:state().assistance=="practice") end)
test("progress on inactive quest cannot be forged",function() local r=f:action("SubmitAnswer","lantern-lift",{activityId="lift-4",contentVersion="sample-v2",answer=53});assert(not r.ok and r.code=="MISSION_NOT_SELECTED") end)
print("RESULT "..passed.." mission/reward behavior tests passed; Roblox client NOT exercised")
