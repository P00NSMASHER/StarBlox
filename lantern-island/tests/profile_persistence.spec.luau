-- Offline execution of the unchanged production ProfileService with mocked Roblox services.
local Data=require("../src/server/ProfileData")
local function clone(v) if type(v)~="table" then return v end;local c={};for k,x in pairs(v) do c[k]=clone(x) end;return c end
local function fixture(studio)
 local store={data=nil,updates=0,writes=0,mode=nil,getCount=0}
 function store:GetAsync(_key,_options) self.getCount+=1;self.lastOptions=_options;if self.readFail then error("READ_OFFLINE") end;return clone(self.data) end
 function store:UpdateAsync(_key,fn)
  self.updates+=1;if self.alwaysFail then error("ALWAYS_OFFLINE") end;if self.beforeCallback then self.beforeCallback() end;if self.mode=="before" then self.mode=nil;error("FAILED_BEFORE_WRITE") end
  local value=fn(clone(self.data));if self.repeatCallback then value=fn(clone(self.data)) end;if self.raceData then self.data=clone(self.raceData);self.raceData=nil;value=fn(clone(self.data)) end;if value==nil then return nil end
  self.data=clone(value);self.writes+=1
  if self.mode=="after" then self.mode=nil;error("COMMITTED_BUT_ACK_LOST") end
  return clone(self.data)
 end
 local serviceLookups=0;local guid=0;local warnings={}
 local fakeGame={GetService=function(_,name)
  if name=="DataStoreService" then return {GetDataStore=function() serviceLookups+=1;if studio then error("UNPUBLISHED_STUDIO") end;return store end} end
  if name=="RunService" then return {IsStudio=function()return studio end} end
  if name=="HttpService" then return {GenerateGUID=function() guid+=1;return "transaction-"..guid end} end
  error("unexpected service "..name)
 end}
 local chunk=assert(loadstring(PROFILE_SOURCE,"ProfileService.production"))
 setfenv(chunk,setmetatable({game=fakeGame,script={Parent={WaitForChild=function()return "PROFILE_DATA" end}},require=function(value)assert(value=="PROFILE_DATA");return Data end,
 Instance={new=function(class)assert(class=="DataStoreGetOptions");return {} end},task={wait=function()end},warn=function(...)table.insert(warnings,{...})end},{__index=getfenv()}))
 local Service=chunk();local context={services={},dataStoreNamespace="TEST_ONLY"};local service=Service.new(context);local player={UserId=7}
 return {service=service,store=store,player=player,context=context,lookups=function()return serviceLookups end,warnings=warnings}
end
local passed,failed=0,0
local function check(name,fn)local ok,err=pcall(fn);if ok then passed+=1;print("PASS "..name)else failed+=1;print("FAIL "..name..": "..tostring(err))end end
check("committed write with lost acknowledgement can recover without conflict",function()
 local f=fixture(false);assert(f.service:load(f.player));local p=f.service:get(f.player);p.ownedItemIds={"firefly-scarf"};p.equippedItemId="firefly-scarf";p.completions["lantern-lift"]=true
 f.store.mode="after";local saved=f.service:save(f.player);assert(not saved,"uncertain write must not claim saved");assert(f.store.data and f.store.data.revision==1)
 local recovered,code=f.service:save(f.player);assert(recovered,"retry failed: "..tostring(code));assert(f.service:publicState(f.player).saveStatus=="SAVED");assert(f.store.data.equippedItemId=="firefly-scarf")
end)
check("unpublished Studio never opens a cloud store",function()
 local f=fixture(true);assert(f.lookups()==0);assert(f.service:load(f.player));assert(f.service:save(f.player));assert(f.service:publicState(f.player).saveStatus=="STUDIO_SESSION_ONLY")
end)
check("cloud load explicitly bypasses stale read cache",function()
 local f=fixture(false);assert(f.service:load(f.player));assert(f.store.lastOptions and f.store.lastOptions.UseCache==false)
end)
check("failure before writing recovers without duplicate reward",function()
 local f=fixture(false);f.service:load(f.player);local p=f.service:get(f.player);p.ownedItemIds={"rainbow-bow"};p.equippedItemId="rainbow-bow"
 f.store.mode="before";assert(not f.service:save(f.player));assert(f.store.data==nil);assert(f.service:save(f.player));assert(#f.store.data.ownedItemIds==1 and f.store.data.currency==25)
end)
check("new clues after an ambiguous save are preserved on recovery",function()
 local f=fixture(false);f.service:load(f.player);local p=f.service:get(f.player);p.learning["lift-1"]={assisted=true,transfer=false}
 f.store.mode="after";assert(not f.service:save(f.player));local token=f.store.data.writeToken
 p.learning["lift-2"]={assisted=false,transfer=false};p.ownedItemIds={"firefly-scarf"};p.equippedItemId="firefly-scarf"
 assert(f.service:save(f.player));assert(f.store.data.learning["lift-1"].assisted and not f.store.data.learning["lift-2"].assisted)
 assert(f.store.data.equippedItemId=="firefly-scarf" and f.store.data.revision==2 and f.store.data.writeToken~=token)
end)
check("a different writer is never overwritten",function()
 local f=fixture(false);f.service:load(f.player);f.store.data=Data.blank();f.store.data.revision=1;f.store.data.writeToken="other-session";f.store.data.ownedItemIds={"moon-crown"}
 local ok,code=f.service:save(f.player);assert(not ok and code=="SAVE_CONFLICT");assert(f.store.writes==0 and f.store.data.ownedItemIds[1]=="moon-crown")
 local attempts=f.store.updates;assert(not f.service:save(f.player));assert(f.store.updates==attempts)
end)
check("same revision alone cannot confirm an uncertain save",function()
 local f=fixture(false);f.service:load(f.player);f.store.mode="after";assert(not f.service:save(f.player));f.store.data.writeToken="different-transaction"
 local ok,code=f.service:save(f.player);assert(not ok and code=="SAVE_CONFLICT")
end)
check("repeated UpdateAsync callbacks do not duplicate progress",function()
 local f=fixture(false);f.service:load(f.player);f.store.repeatCallback=true;assert(f.service:save(f.player));assert(f.store.writes==1 and f.store.data.revision==1)
end)
check("a racing writer during callback retry wins safely",function()
 local f=fixture(false);f.service:load(f.player);f.store.raceData=Data.blank();f.store.raceData.revision=1;f.store.raceData.writeToken="racing-writer"
 local ok,code=f.service:save(f.player);assert(not ok and code=="SAVE_CONFLICT" and f.store.data.writeToken=="racing-writer" and f.store.writes==0)
end)
check("nested save is rejected while original save completes",function()
 local f=fixture(false);f.service:load(f.player);local nested
 f.store.beforeCallback=function()f.store.beforeCallback=nil;local ok,code=f.service:save(f.player);nested=not ok and code=="SAVE_IN_PROGRESS" end
 assert(f.service:save(f.player));assert(nested and f.service.saving[f.player]==nil)
end)
check("read failure never becomes a blank writable profile",function()
 local f=fixture(false);f.store.readFail=true;assert(not f.service:load(f.player));assert(f.service:get(f.player)==nil);assert(not f.service:save(f.player));assert(f.store.updates==0)
end)
check("invalid stored records fail closed without replacement",function()
 for _,data in ipairs({"broken",false,{revision=-1},{revision=1.5},{revision="2"},{revision=false},{revision=0/0}})do
  local f=fixture(false);f.store.data=data;local ok,code=f.service:load(f.player);assert(not ok and code=="LOAD_INVALID");assert(f.service:get(f.player)==nil and f.store.updates==0)
 end
end)
check("old profiles without revision retain their earned outfit",function()
 local f=fixture(false);f.store.data={ownedItemIds={"firefly-scarf"},equippedItemId="firefly-scarf",completions={["lantern-lift"]=true}}
 assert(f.service:load(f.player));assert(f.service:save(f.player));assert(f.store.data.equippedItemId=="firefly-scarf" and f.store.data.revision==1)
end)
check("successful release unloads service and mission state",function()
 local f=fixture(false);f.service:load(f.player);local removed=false;f.context.services.MissionService={removePlayer=function(_,p)removed=p==f.player end}
 assert(f.service:release(f.player));assert(removed and f.service:get(f.player)==nil and f.service.pending[f.player]==nil)
end)
check("release retries a lost acknowledgement and reload keeps learning",function()
 local f=fixture(false);f.service:load(f.player);local p=f.service:get(f.player)
 p.ownedItemIds={"firefly-scarf"};p.equippedItemId="firefly-scarf";p.completions["lantern-lift"]=true;p.learning["lift-1"]={assisted=true,transfer=false}
 f.store.mode="after";assert(f.service:release(f.player));assert(f.service:load(f.player));local loaded=f.service:get(f.player)
 assert(loaded.equippedItemId=="firefly-scarf" and loaded.completions["lantern-lift"] and loaded.learning["lift-1"].assisted)
end)
check("persistent service errors retain recoverable in-memory progress",function()
 local f=fixture(false);f.service:load(f.player);f.service:get(f.player).ownedItemIds={"rainbow-bow"};f.store.alwaysFail=true
 assert(not f.service:release(f.player));assert(f.service:get(f.player)~=nil and f.service.saving[f.player]==nil and #f.warnings>0)
 f.store.alwaysFail=false;assert(f.service:save(f.player));assert(f.store.data.ownedItemIds[1]=="rainbow-bow")
end)
check("public profile never exposes transaction or answer metadata",function()
 local f=fixture(false);f.service:load(f.player);f.service:save(f.player);local view=f.service:publicState(f.player)
 assert(view.writeToken==nil and view.pending==nil and view.learning==nil);assert(f.store.data.writeToken~=nil)
end)
check("outfits completions checkpoints and hint history all round trip",function()
 local f=fixture(false);f.service:load(f.player);local p=f.service:get(f.player)
 p.ownedItemIds={"firefly-scarf","rainbow-bow","moon-crown"};p.equippedItemId="moon-crown";p.completions["ribbon-studio"]=true
 p.questProgress["moon-picnic"]={index=3,attempts=2,hintLevel=2};p.learning["picnic-2"]={assisted=true,transfer=false}
 assert(f.service:release(f.player));assert(f.service:load(f.player));p=f.service:get(f.player)
 assert(#p.ownedItemIds==3 and p.currency==75 and p.equippedItemId=="moon-crown" and p.completions["ribbon-studio"])
 assert(p.questProgress["moon-picnic"].attempts==2 and p.questProgress["moon-picnic"].hintLevel==2 and p.learning["picnic-2"].assisted)
end)
check("an exception does not leave the saving lock stuck",function()
 local f=fixture(false);f.service:load(f.player);f.store.alwaysFail=true;assert(not f.service:save(f.player));assert(f.service.saving[f.player]==nil)
 f.store.alwaysFail=false;assert(f.service:save(f.player))
end)
print("RESULT "..passed.." profile persistence tests passed; "..failed.." failed; mock cloud adapter only")
if failed>0 then error("Profile persistence regression failures: "..failed) end
