--!nonstrict
local LessonService=require("../src/server/LessonService")
local RewardService=require("../src/server/RewardService")
local MissionService=require("../src/server/MissionService")
local passed=0
local function check(name,fn)
 local ok,err=pcall(fn);if not ok then error("FAIL "..name..": "..tostring(err)) end
 passed+=1;print("PASS "..name)
end
local player={UserId=7}
local profile={currency=0,equippedItemId="",ownedItemIds={},completions={}}
local services={}
local context={services=services}
services.LessonService=LessonService.new(context)
services.ProfileService={
 get=function(_self,_player) return profile end,
 save=function(_self,_player) return true,"SAVED" end,
}
local restored=0;local equipped=""
services.WorldBuilder={
 setRestored=function(_self,value) if value then restored+=1 end end,
 setEquipped=function(_self,_player,itemId) equipped=itemId end,
}
services.RewardService=RewardService.new(context)
services.MissionService=MissionService.new(context)
check("mission available",function() assert(services.MissionService:publicState(player).status=="AVAILABLE") end)
check("start mission",function() local r=services.MissionService:handle(player,{action="StartMission",missionId="lantern-lift"});assert(r.ok and r.code=="MISSION_STARTED") end)
check("wrong answer is gentle retry",function()
 local r=services.MissionService:handle(player,{action="SubmitAnswer",missionId="lantern-lift",payload={activityId="lift-1",contentVersion="sample-v1",answer=41}})
 assert(not r.ok and r.code=="TRY_AGAIN" and services.MissionService:publicState(player).status=="ACTIVE")
end)
check("hint marks assistance",function()
 local r=services.MissionService:handle(player,{action="RequestHint",missionId="lantern-lift"})
 local s=services.MissionService:publicState(player);assert(r.ok and s.assistance=="hint" and #s.hint>0)
end)
check("correct answer restores and rewards",function()
 local r=services.MissionService:handle(player,{action="SubmitAnswer",missionId="lantern-lift",payload={activityId="lift-1",contentVersion="sample-v1",answer={tens=4,ones=2}}})
 assert(r.ok and r.code=="MISSION_COMPLETE" and restored==1 and profile.currency==25 and #profile.ownedItemIds==1)
end)
check("completion cannot duplicate reward",function()
 local r=services.MissionService:handle(player,{action="StartMission",missionId="lantern-lift"})
 assert(r.ok and r.code=="MISSION_ALREADY_COMPLETE" and profile.currency==25 and #profile.ownedItemIds==1)
end)
check("earned scarf equips",function()
 local r=services.RewardService:handle(player,{itemId="firefly-scarf"})
 assert(r.ok and profile.equippedItemId=="firefly-scarf" and equipped=="firefly-scarf")
end)
print("RESULT "..passed.." mission/reward behavior tests passed; Roblox client NOT exercised")