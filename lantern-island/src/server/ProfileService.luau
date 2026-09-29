--!nonstrict
local DataStoreService=game:GetService("DataStoreService")
local RunService=game:GetService("RunService")
local ProfileData=require(script.Parent:WaitForChild("ProfileData"))
local ProfileService={}
ProfileService.__index=ProfileService
function ProfileService.new(context)
 local self=setmetatable({context=context,profiles={},studioPersist={},status={},saving={},revisions={}},ProfileService)
 self.store=DataStoreService:GetDataStore(context.dataStoreNamespace.."_profiles")
 return self
end
function ProfileService:load(player)
 if self.profiles[player] then return true,"ALREADY_LOADED" end
 local source
 if RunService:IsStudio() then source=self.studioPersist[player.UserId]
 else
  local ok,data=pcall(function() return self.store:GetAsync("u:"..player.UserId) end)
  if not ok then self.status[player]="LOAD_FAILED";return false,"LOAD_FAILED" end
  source=data
 end
 local p=ProfileData.copy(source);self.profiles[player]=p;self.revisions[player]=p.revision
 self.status[player]=RunService:IsStudio() and "STUDIO_SESSION_ONLY" or "LOADED"
 return true,"LOADED"
end
function ProfileService:get(player) return self.profiles[player] end
function ProfileService:publicState(player)
 local p=self.profiles[player]
 if not p then return {currency=0,equippedItemId="",ownedItemIds={},saveStatus="NOT_LOADED"} end
 return {currency=p.currency,equippedItemId=p.equippedItemId,ownedItemIds=table.clone(p.ownedItemIds),saveStatus=self.status[player] or "UNCONFIRMED"}
end
function ProfileService:save(player)
 local p=self.profiles[player];if not p then return false,"NOT_LOADED" end
 if self.saving[player] then return false,"SAVE_IN_PROGRESS" end
 if self.status[player]=="SAVE_CONFLICT" then return false,"SAVE_CONFLICT" end
 self.saving[player]=true;self.status[player]="SAVING"
 local snapshot=ProfileData.copy(p);local expected=self.revisions[player] or 0;snapshot.revision=expected+1
 if RunService:IsStudio() then
  self.studioPersist[player.UserId]=snapshot;p.revision=snapshot.revision;self.revisions[player]=snapshot.revision
  self.status[player]="STUDIO_SESSION_ONLY";self.saving[player]=nil;return true,"STUDIO_SESSION_ONLY"
 end
 local matched=false
 local ok=pcall(function()
  self.store:UpdateAsync("u:"..player.UserId,function(old)
   matched=false;local revision=type(old)=="table" and (old.revision or 0) or 0
   if revision~=expected then return nil end -- Never clobber a newer session.
   matched=true;return snapshot
  end)
 end)
 self.saving[player]=nil
 if ok and matched then
  self.revisions[player]=snapshot.revision;p.revision=snapshot.revision;self.status[player]="SAVED";return true,"SAVED"
 end
 self.status[player]=ok and "SAVE_CONFLICT" or "SAVE_FAILED";return false,self.status[player]
end
function ProfileService:release(player)
 local deadline=os.clock()+15
 while self.saving[player] and os.clock()<deadline do task.wait(.1) end
 local ok,code=self:save(player)
 if not ok and code=="SAVE_FAILED" then task.wait(1);ok,code=self:save(player) end
 if ok then
  self.profiles[player]=nil;self.revisions[player]=nil;self.status[player]=nil
  local mission=self.context.services.MissionService;if mission then mission:removePlayer(player) end
 else warn("LANTERN_PROGRESS_NOT_SAVED",code) end
 return ok,code
end
return ProfileService
