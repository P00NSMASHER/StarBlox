--!nonstrict
-- Executes production lesson, mission, reward, migration and UI action-model modules.
-- World/persistence adapters are fakes here; this is NOT Roblox client proof.
local Lesson=require("../src/server/LessonService")
local Mission=require("../src/server/MissionService")
local Reward=require("../src/server/RewardService")
local Data=require("../src/server/ProfileData")
local UI=require("../src/client/UIModel")
local TargetPolicy=require("../src/server/TargetPolicy")
local passed=0
local function check(name,fn) local ok,err=pcall(fn);if not ok then error("FAIL "..name..": "..tostring(err)) end;passed+=1;print("PASS "..name) end
local function fixture(id)
 local player={UserId=id or 7};local profiles={[player]=Data.blank()};local services={};local c={services=services};local saved={};local events={};local near=true;local saveOk=true
 services.ProfileService={get=function(_,p) return profiles[p] end,save=function(_,p) if saveOk then saved[p]=Data.copy(profiles[p]) end;return saveOk,saveOk and "SAVED" or "SAVE_FAILED" end}
 services.WorldBuilder={isNearMission=function() return near end,onCheckpoint=function(_,p,mid,index) table.insert(events,{kind="checkpoint",player=p,mid=mid,index=index}) end,
  restoreMission=function(_,mid) table.insert(events,{kind="restore",mid=mid}) end,setEquipped=function(_,p,id) table.insert(events,{kind="equip",player=p,id=id}) end}
 services.LessonService=Lesson.new(c);services.RewardService=Reward.new(c);services.MissionService=Mission.new(c)
 local f={player=player,services=services,context=c,profiles=profiles,saved=saved,events=events}
 function f:state() return services.MissionService:publicState(player) end
 function f:act(action,mid,payload) return services.MissionService:handle(player,{action=action,missionId=mid or self:state().missionId,payload=payload}) end
 function f:answer(correct)
  local s=self:state();local a=services.LessonService:getActivity(s.activityId)
  for _,o in ipairs(s.options) do if (o.label==a.answer)==correct then return self:act("SubmitAnswer",s.missionId,{activityId=s.activityId,contentVersion=s.contentVersion,answer=o.id}) end end
  error("missing answer option")
 end
 function f:near(value) near=value end
 function f:saveOk(value) saveOk=value end
 function f:rejoin()
  local snapshot=saved[player];assert(snapshot,"no saved snapshot");profiles[player]=Data.copy(snapshot);services.MissionService=Mission.new(c)
 end
 function f:complete(mid)
  local r=self:act("StartMission",mid);assert(r.ok)
  if self:state().status=="COMPLETED" then self:act("StartMission",mid) end
  for i=1,4 do assert(self:state().status=="ACTIVE");local answer=self:answer(true);assert(answer.ok);if i<4 then assert(self:act("StartMission",mid).ok) end end
 end
 return f
end
check("three complete quests and twelve unique answer-keyed activities",function()
 local l=Lesson.new({});local seen={};local count=0
 for _,q in ipairs(l:quests()) do assert(#q.steps==4);for _,id in ipairs(q.steps) do
  assert(not seen[id]);seen[id]=true;count+=1;local a=l:getActivity(id);assert(a and #a.options==4 and #a.hints==3 and #a.explanation>0)
  local matches=0;local unique={};for _,label in ipairs(a.options) do assert(not unique[label]);unique[label]=true;if label==a.answer then matches+=1 end end;assert(matches==1)
 end end;assert(count==12)
end)
check("all arithmetic keys match representations",function()
 local l=Lesson.new({});for i=1,4 do local a=l:getActivity("lift-"..i);local r=a.representation;assert(tonumber(a.answer)==r.tensA*10+r.onesA+r.tensB*10+r.onesB) end
end)
check("one new final check for each practiced skill",function()
 local l=Lesson.new({});for _,q in ipairs(l:quests()) do for i,id in ipairs(q.steps) do local a=l:getActivity(id);assert(a.transfer==(i==4));assert(a.skill==l:getActivity(q.steps[1]).skill) end end
end)
check("option IDs match server keys for many player IDs",function()
 local l=Lesson.new({});for userId=-3,30 do for _,q in ipairs(l:quests()) do for _,id in ipairs(q.steps) do
  local a=l:getActivity(id);local right=0;for _,o in ipairs(l:options(id,userId)) do local ok=l:check(id,o.id,userId);assert(ok==(o.label==a.answer));if ok then right+=1 end end;assert(right==1)
 end end end
end)
check("answer positions are not always the same",function()
 local l=Lesson.new({});local positions={};for _,q in ipairs(l:quests()) do for _,id in ipairs(q.steps) do for i,o in ipairs(l:options(id,7)) do if l:check(id,o.id,7) then positions[i]=true end end end end
 local n=0;for _ in pairs(positions) do n+=1 end;assert(n>=3)
end)
check("raw string answer and malformed number blocks are rejected",function()
 local l=Lesson.new({});assert(not l:check("lift-1","17",7));assert(not l:check("lift-1",{tens="1",ones=7},7));assert(not l:check("lift-1",{tens=0,ones=17},7));assert(not l:check("ribbon-1",17,7))
end)
check("new session is exploration not a fullscreen question",function() local f=fixture();assert(f:state().status=="AVAILABLE" and #f:state().options==0) end)
check("mission start requires proximity",function() local f=fixture();f:near(false);assert(f:act("StartMission").code=="FOLLOW_BEACON");assert(f:state().status=="AVAILABLE");f:near(true);assert(f:act("StartMission").code=="MISSION_STARTED") end)
check("inactive answers cannot reward",function() local f=fixture();local r=f:act("SubmitAnswer",nil,{activityId="lift-1",contentVersion="sample-v2",answer=17});assert(not r.ok and f.profiles[f.player].currency==0) end)
check("wrong answer adds helpful hint and keeps activity active",function() local f=fixture();f:act("StartMission");assert(f:answer(false).code=="TRY_AGAIN");local s=f:state();assert(s.status=="ACTIVE" and s.hint~="" and s.assistance=="supported" and s.completedCount==0) end)
check("cancel and resume cannot clear hint/retry history",function() local f=fixture();f:act("StartMission");f:answer(false);f:act("CancelMission");f:act("StartMission");assert(f:state().assistance=="supported");f:answer(true);assert(f.profiles[f.player].learning["lift-1"].assisted) end)
check("switching quests preserves hint history",function() local f=fixture();f:act("StartMission");f:act("RequestHint");f:act("StartMission","ribbon-studio");f:act("StartMission","lantern-lift");assert(f:state().assistance=="supported") end)
check("saved rejoin keeps the current clue and help history",function() local f=fixture();f:act("StartMission");f:answer(true);f:act("StartMission");f:act("RequestHint");f:rejoin();local s=f:state();assert(s.activityId=="lift-2" and s.assistance=="supported" and s.completedCount==1) end)
check("correct answer explains why before the next question",function() local f=fixture();f:act("StartMission");assert(f:answer(true).code=="CHECKPOINT_COMPLETE");local s=f:state();assert(s.status=="BETWEEN" and s.objective:find("17",1,true) and #s.options==0) end)
check("next clue can require more exploration",function() local f=fixture();f:act("StartMission");f:answer(true);f:near(false);assert(f:act("StartMission").code=="FOLLOW_BEACON");assert(f:state().activityId=="lift-2" and f:state().status=="AVAILABLE") end)
check("stale activity/version cannot answer another question",function() local f=fixture();f:act("StartMission");assert(f:act("SubmitAnswer",nil,{activityId="lift-1",contentVersion="sample-v1",answer=17}).code=="CONTENT_MISMATCH");f:answer(true);f:act("StartMission");assert(f:act("SubmitAnswer",nil,{activityId="lift-1",contentVersion="sample-v2",answer=17}).code=="CONTENT_MISMATCH") end)
check("all three quests restore world and unlock distinct outfits",function()
 local f=fixture();for _,q in ipairs(f.services.LessonService:quests()) do f:complete(q.id) end
 local p=f.profiles[f.player];assert(p.currency==75 and #p.ownedItemIds==3);local s=f:state();assert(s.completedCount==12 and s.independentCount==12 and s.transferCount==3)
 local restored={};for _,e in ipairs(f.events) do if e.kind=="restore" then restored[e.mid]=true end end;assert(restored["lantern-lift"] and restored["ribbon-studio"] and restored["moon-picnic"])
end)
check("helped final clue is not an independent new-problem success",function()
 local f=fixture();f:act("StartMission");for _=1,3 do f:answer(true);f:act("StartMission") end;f:act("RequestHint");f:answer(true)
 local s=f:state();assert(s.supportedCount==1 and s.independentCount==3 and s.transferCount==0)
end)
check("replay cannot duplicate rewards or inflate learning credit",function()
 local f=fixture();f:act("StartMission");f:answer(false);f:answer(true);for _=2,4 do f:act("StartMission");f:answer(true) end
 f:complete("lantern-lift");local p=f.profiles[f.player];assert(p.currency==25 and #p.ownedItemIds==1 and f:state().completedCount==4 and p.learning["lift-1"].assisted and f:state().practice)
end)
check("saved completion and outfit survive model reload",function()
 local f=fixture();f:complete("lantern-lift");assert(f.services.RewardService:handle(f.player,{itemId="firefly-scarf"}).ok);f:rejoin()
 assert(f.profiles[f.player].completions["lantern-lift"] and f.profiles[f.player].equippedItemId=="firefly-scarf" and f:state().completedCount==4)
end)
check("unearned outfit rejected and every earned outfit equips",function()
 local f=fixture();assert(f.services.RewardService:handle(f.player,{itemId="moon-crown"}).code=="ITEM_NOT_OWNED")
 for _,q in ipairs(f.services.LessonService:quests()) do f:complete(q.id);assert(f.services.RewardService:handle(f.player,{itemId=q.reward}).ok);assert(f.profiles[f.player].equippedItemId==q.reward) end
end)
check("duplicate reward grant is idempotent",function() local f=fixture();for _=1,5 do assert(f.services.RewardService:grant(f.player,"rainbow-bow")) end;assert(f.profiles[f.player].currency==25 and #f.profiles[f.player].ownedItemIds==1) end)
check("save failure is exposed rather than reported saved",function() local f=fixture();f:act("StartMission");f:saveOk(false);assert(f:answer(true).code=="PROGRESS_SAVE_PENDING");assert(f.saved[f.player]==nil) end)
check("players have separate profiles and companion equip results",function()
 local f=fixture();local other={UserId=9};f.profiles[other]=Data.blank();f:complete("lantern-lift");f.services.RewardService:handle(f.player,{itemId="firefly-scarf"})
 assert(f.profiles[other].currency==0 and f.profiles[other].equippedItemId=="");local last=f.events[#f.events];assert(last.player==f.player)
end)
check("profile migration drops forged values and keeps earned originals",function()
 local p=Data.copy({currency=99999,equippedItemId="moon-crown",ownedItemIds={"firefly-scarf","firefly-scarf","unknown",{}},questProgress={["lantern-lift"]={index=999,attempts=999,hintLevel=999}},learning={["lift-1"]={assisted=true},unknown={assisted=false}}})
 assert(p.currency==25 and #p.ownedItemIds==1 and p.equippedItemId=="" and p.questProgress["lantern-lift"].index==4 and Data.summary(p).total==1)
end)
check("profile snapshots do not share mutable nested tables",function() local p=Data.blank();p.questProgress["lantern-lift"]={index=2,hintLevel=1,attempts=1};local copy=Data.copy(p);copy.questProgress["lantern-lift"].index=4;assert(p.questProgress["lantern-lift"].index==2) end)
check("UI answer action uses live IDs instead of hard-coded 42",function()
 local f=fixture();f:act("StartMission","ribbon-studio");local state={mission=f:state()};local o=state.mission.options[2];local command=UI.answer(state,o.id)
 assert(command.action=="SubmitAnswer" and command.fields.payload.answer==o.id and command.fields.payload.activityId=="ribbon-1");assert(UI.answer(state,"choice-999")==nil)
end)
check("UI hides answer actions outside an active mission",function() local f=fixture();assert(UI.answer({mission=f:state()},"choice-1")==nil) end)
check("UI reward action uses the specific quest reward",function()
 local f=fixture();f:complete("ribbon-studio");local state={mission=f:state(),profile=f.profiles[f.player]};local c=UI.primary(state);assert(c.action=="EquipItem" and c.fields.itemId=="rainbow-bow")
 f.services.RewardService:handle(f.player,c.fields);assert(UI.primary(state).menu=="map")
end)
check("UI target advances through the world clues",function() assert(UI.target({missionId="lantern-lift",checkpointIndex=1})=="LiftConsole");assert(UI.target({missionId="moon-picnic",checkpointIndex=3})=="moon-picnic-checkpoint-3") end)
check("portrait and landscape card bounds leave room for controls",function()
 for _,v in ipairs({{320,568},{390,844},{844,390},{1024,768},{1920,1080}}) do local l=UI.layout(v[1],v[2]);assert(l.width<=v[1]-24 and l.top+l.height<v[2]-60 and l.trackerWidth>0) end
end)
check("mobile layouts keep generous tap targets in portrait and landscape",function()
 for _,v in ipairs({{320,568},{390,844},{844,390},{1024,768}}) do
  local l=UI.layout(v[1],v[2],true)
  assert(l.mobile and l.contentButtonHeight>=54 and l.primaryHeight>=54 and l.closeSize>=50 and l.navHeight>=52 and l.openHeight>=44)
  assert(l.width<=v[1]-24 and l.top+l.height<v[2]-60)
 end
 local desktop=UI.layout(1440,900,false);assert(not desktop.mobile and desktop.contentButtonHeight==48)
end)
check("Studio-only and failed saves cannot be labeled durable",function() assert(UI.saveText("STUDIO_SESSION_ONLY"):find("test server",1,true));assert(UI.saveText("SAVE_FAILED"):find("not confirmed",1,true));assert(UI.saveText("SAVED")=="Progress saved.") end)

check("every completed quest replays with four fresh alternate activities",function()
 local l=Lesson.new({})
 for _,q in ipairs(l:quests())do
  local seen={}
  for _,base in ipairs(q.steps)do
   local alt=l:practiceActivityId(base);assert(type(alt)=="string" and alt~=base and not seen[alt]);seen[alt]=true
   local original,replay=l:getActivity(base),l:getActivity(alt);assert(replay and replay.skill==original.skill)
   assert(replay.prompt~=original.prompt and #replay.options==4 and #replay.hints==3)
  end
 end
end)
check("practice replay uses fresh questions without new rewards or learning credit",function()
 local f=fixture();f:complete("lantern-lift");assert(f:state().completedCount==4 and f.profiles[f.player].currency==25)
 assert(f:act("StartMission","lantern-lift").ok);local replay=f:state();assert(replay.practice and replay.activityId=="liftp-1" and replay.prompt:find("14",1,true))
 for i=1,4 do local answer=f:answer(true);assert(answer.ok);if i<4 then assert(f:act("StartMission","lantern-lift").ok)end end
 assert(f.profiles[f.player].currency==25 and #f.profiles[f.player].ownedItemIds==1 and f:state().completedCount==4)
end)
check("second replay rotates to another fresh deck without extra reward",function()
 local f=fixture();f:complete("lantern-lift")
 assert(f:act("StartMission","lantern-lift").ok)
 for i=1,4 do assert(f:answer(true).ok);if i<4 then assert(f:act("StartMission","lantern-lift").ok) end end
 assert(f:act("StartMission","lantern-lift").ok)
 local second=f:state();assert(second.practice and second.activityId=="liftq-1" and second.prompt:find("18",1,true))
 assert(f.profiles[f.player].currency==25 and #f.profiles[f.player].ownedItemIds==1 and second.completedCount==4)
end)check("release target policy allows Studio without weakening published target checks",function()
 assert(TargetPolicy.allowed(0,0,true))
 assert(TargetPolicy.allowed(6027194615,17602626136,true))
end)
check("release target policy allows only the known private staging target outside Studio",function()
 assert(TargetPolicy.allowed(6027194615,17602626136,false))
 assert(not TargetPolicy.allowed(6027194615,17602626137,false))
 assert(not TargetPolicy.allowed(6027194614,17602626136,false))
 assert(not TargetPolicy.allowed(0,0,false))
 assert(not TargetPolicy.allowed(nil,nil,false))
end)
print("RESULT "..passed.." mission/reward behavior tests passed; Roblox client NOT exercised")