-- Isolated native service test; no real player profile or cloud store is accessed.
assert(game:GetService("RunService"):IsStudio(),"Studio only")
local folder=script.Parent.Parent
local Service=require(folder.Source.ProfileService)
local Http=game:GetService("HttpService")
local checks={}
local function check(name,value)assert(value,name);table.insert(checks,name)end
local context={services={},dataStoreNamespace="SAVE_RECOVERY_NATIVE_TEST_ONLY"}
local s=Service.new(context);local player={UserId=700001}
check("actual ProfileService module loads in Roblox",type(s.save)=="function")
check("unpublished Studio does not open a cloud datastore",s.store==nil)
local options=Instance.new("DataStoreGetOptions");options.UseCache=false
check("real cache-bypass options API is supported",options.UseCache==false)
check("native Studio profile loads",s:load(player)==true)
local p=s:get(player);p.ownedItemIds={"firefly-scarf","rainbow-bow"};p.equippedItemId="rainbow-bow";p.completions["lantern-lift"]=true
p.questProgress["moon-picnic"]={index=3,attempts=2,hintLevel=2};p.learning["picnic-2"]={assisted=true,transfer=false}
check("native session save succeeds",s:save(player)==true)
check("native save is labeled session-only",s:publicState(player).saveStatus=="STUDIO_SESSION_ONLY")
check("native release succeeds",s:release(player)==true)
check("native released profile unloads",s:get(player)==nil)
local rejoined={UserId=700001};check("fresh player object loads saved session",s:load(rejoined)==true)
local restored=s:get(rejoined)
check("native outfit and completed mission survive reload",restored.equippedItemId=="rainbow-bow" and restored.completions["lantern-lift"])
check("native help history survives reload",restored.questProgress["moon-picnic"].hintLevel==2 and restored.learning["picnic-2"].assisted)
local other={UserId=700002};s:load(other);check("another player receives separate progress",#s:get(other).ownedItemIds==0)
local token=Http:GenerateGUID(false);local data=nil;local loseAck=true
s.store={UpdateAsync=function(_,key,transform)
 check("transaction uses only the isolated test key",key=="u:700002")
 local candidate=transform(data);if candidate==nil then return nil end;data=candidate
 if loseAck then loseAck=false;error("SIMULATED_LOST_ACKNOWLEDGEMENT")end
 return data
end}
local entry={expected=0,token=token,snapshot={currency=0,equippedItemId="",ownedItemIds={},completions={},questProgress={},learning={},revision=1,writeToken=token}}
s.pending[other]=entry
local ok,code=s:_commit(other,entry);check("native commit reports lost acknowledgement as unconfirmed",not ok and code=="SAVE_FAILED")
ok,code=s:_commit(other,entry);check("native commit recognizes and recovers its own write",ok and code=="SAVED" and s.revisions[other]==1)
check("native recovery clears pending write",s.pending[other]==nil)
local result={sourceCommit="8e249454bbc5e8ea1794e9c0f159f358780f2eb3",status="PASS_NATIVE_SERVICE_ACCEPTANCE",passed=#checks,failed=0,checks=checks,
 scope="Exact production ProfileService in Roblox Studio; real module, session reload, real GUID/cache APIs and simulated datastore acknowledgement failure. No production gameplay replacement or cloud calls.",cloudRejoin="NOT_RUN",physicalDevice="NOT_RUN"}
script:SetAttribute("Receipt",Http:JSONEncode(result))
return result
