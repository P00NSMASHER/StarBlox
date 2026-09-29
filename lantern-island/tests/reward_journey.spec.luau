--!nonstrict
local Journey=require("../src/client/RewardJourney")
local Reward=require("../src/server/RewardService")
local Data=require("../src/server/ProfileData")
local passed=0
local function check(name,fn)local ok,err=pcall(fn);assert(ok,name..": "..tostring(err));passed+=1;print("PASS "..name)end
local function state(ids,count,status,index,practice)
 return {runtimeStatus="READY",profileStatus="LOADED",profile={ownedItemIds=ids or {},saveStatus="SAVED"},mission={completedCount=count or 0,status=status or "ACTIVE",checkpointIndex=index or 1,rewardItemId="firefly-scarf",practice=practice==true}}
end
check("collection requires three distinct known outfits",function()
 local s=Journey.collection({ownedItemIds={"firefly-scarf","firefly-scarf","unknown"}});assert(s.count==1 and not s.bonusUnlocked)
 s=Journey.collection({ownedItemIds={"moon-crown","rainbow-bow","firefly-scarf"}});assert(s.count==3 and s.bonusUnlocked)
end)
check("nil and malformed inventory cannot unlock the bonus",function()assert(Journey.collection(nil).count==0);assert(Journey.collection({ownedItemIds=false}).count==0);assert(Journey.collection({ownedItemIds={{},false,12}}).count==0)end)
check("progress starts empty and counts solved clues not attempts",function()local s=state({},0);assert(Journey.progress(s.mission,s.profile).solved==0);s.mission.checkpointIndex=3;assert(Journey.progress(s.mission,s.profile).solved==2)end)
check("completion fills all four glows",function()local s=state({"firefly-scarf"},4,"COMPLETED",4);local p=Journey.progress(s.mission,s.profile);assert(p.solved==4 and p.owned and p.title=="Firefly Scarf")end)
check("replay is explicitly distinguishable from a new unlock",function()local s=state({"firefly-scarf"},4,"ACTIVE",2,true);local p=Journey.progress(s.mission,s.profile);assert(p.practice and p.owned and p.solved==1)end)
check("observer never celebrates old outfits on reconnect",function()local o=Journey.newObserver();assert(#o:observe(state({"firefly-scarf","rainbow-bow","moon-crown"},12))==0)end)
check("missing or loading snapshots do not establish a reward",function()local o=Journey.newObserver();assert(#o:observe(nil)==0);local s=state();s.profileStatus="LOADING";assert(#o:observe(s)==0);assert(#o:observe(state({},0))==0)end)
check("one solved clue creates one checkpoint moment",function()local o=Journey.newObserver();o:observe(state());local e=o:observe(state({},1,"BETWEEN",2));assert(#e==1 and e[1].kind=="checkpoint" and e[1].solved==1 and e[1].itemId=="firefly-scarf");assert(#o:observe(state({},1,"BETWEEN",2))==0)end)
check("hints and wrong answers do not invent rewards",function()local o=Journey.newObserver();o:observe(state());local s=state({},0);s.mission.hint="Try tens";s.mission.assistance="supported";assert(#o:observe(s)==0)end)
check("new owned outfit gets an unlock not a generic checkpoint",function()local o=Journey.newObserver();o:observe(state({},3));local e=o:observe(state({"firefly-scarf"},4,"COMPLETED",4));assert(#e==1 and e[1].kind=="unlock" and e[1].itemId=="firefly-scarf")end)
check("duplicate responses and stale snapshots do not repeat an unlock",function()local o=Journey.newObserver();o:observe(state());local s=state({"firefly-scarf"},4);assert(#o:observe(s)==1);assert(#o:observe(s)==0);o:observe(state());assert(#o:observe(s)==0)end)
check("whole collection creates exactly one final bonus moment",function()local o=Journey.newObserver();o:observe(state({"firefly-scarf","rainbow-bow"},8));local s=state({"firefly-scarf","rainbow-bow","moon-crown"},12);local e=o:observe(s);assert(#e==2 and e[1].kind=="unlock" and e[2].kind=="collection");assert(#o:observe(s)==0)end)
check("familiar replay never creates new learning celebrations",function()local o=Journey.newObserver();o:observe(state({"firefly-scarf"},4));assert(#o:observe(state({"firefly-scarf"},4,"BETWEEN",3,true))==0)end)
check("unconfirmed save does not hide an actually earned session reward",function()local o=Journey.newObserver();o:observe(state());local s=state({"firefly-scarf"},4);s.profile.saveStatus="SAVE_FAILED";assert(o:observe(s)[1].kind=="unlock");assert(s.profile.saveStatus=="SAVE_FAILED")end)
check("reward definitions do not mutate the server inventory",function()local s=state({"firefly-scarf"},4);Journey.collection(s.profile);Journey.progress(s.mission,s.profile);assert(#s.profile.ownedItemIds==1 and s.profile.ownedItemIds[1]=="firefly-scarf")end)
check("server celebration fires once per actual new entitlement",function()
 local p=Data.blank();local count=0;local player={UserId=7};local world={celebrateReward=function(_,who,item)assert(who==player and Journey.item(item));count+=1 end}
 local service=Reward.new({services={ProfileService={get=function()return p end},WorldBuilder=world}})
 for _=1,10 do assert(service:grant(player,"firefly-scarf")) end
 assert(count==1 and p.currency==25 and #p.ownedItemIds==1)
 assert(not service:grant(player,"forged-prize"));assert(count==1)
end)
check("all three rewards retain legacy star count and survive serialization",function()
 local p=Data.blank();local count=0;local service=Reward.new({services={ProfileService={get=function()return p end},WorldBuilder={celebrateReward=function()count+=1 end}}})
 for _,item in ipairs(Journey.catalog)do assert(service:grant({},item.id))end
 local copy=Data.copy(p);assert(count==3 and copy.currency==75 and Journey.collection(copy).bonusUnlocked)
end)
check("baseline reconnect and duplicate grants cannot manufacture a fourth prize",function()
 local p=Data.blank();local service=Reward.new({services={ProfileService={get=function()return p end},WorldBuilder={}}})
 for _,item in ipairs(Journey.catalog)do service:grant({},item.id);service:grant({},item.id)end
 assert(#p.ownedItemIds==3 and p.currency==75);assert(#Journey.newObserver():observe(state(p.ownedItemIds,12))==0)
end)
print("RESULT "..passed.." reward journey tests passed; real UI and trail checked separately in Roblox")