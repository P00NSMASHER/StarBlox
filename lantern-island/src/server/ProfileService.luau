--!nonstrict
local DataStoreService=game:GetService("DataStoreService")
local RunService=game:GetService("RunService")
local HttpService=game:GetService("HttpService")
local ProfileData=require(script.Parent:WaitForChild("ProfileData"))
local ProfileService={};ProfileService.__index=ProfileService
local function revisionOf(source)
 if source==nil then return 0 end
 if type(source)~="table" then return nil end
 local r=source.revision;if r==nil then r=0 end
 return type(r)=="number" and r==r and r%1==0 and r>=0 and r<100000000 and r or nil
end
local function equal(a,b)
 if type(a)~=type(b) then return false end
 if type(a)~="table" then return a==b end
 for k,v in pairs(a) do if not equal(v,b[k]) then return false end end
 for k in pairs(b) do if a[k]==nil then return false end end
 return true
end
local function sameProgress(a,b)
 -- Sanitized, bounded copies omit transaction metadata; revision is not progress.
 local left,right=ProfileData.copy(a),ProfileData.copy(b)
 left.revision=0;right.revision=0;return equal(left,right)
end
function ProfileService.new(context)
 local self=setmetatable({context=context,profiles={},studioPersist={},status={},saving={},revisions={},pending={}},ProfileService)
 if not RunService:IsStudio() then self.store=DataStoreService:GetDataStore(context.dataStoreNamespace.."_profiles") end
 return self
end
function ProfileService:load(player)
 if self.profiles[player] then return true,"ALREADY_LOADED" end
 local source
 if RunService:IsStudio() then source=self.studioPersist[player.UserId]
 else
  local options=Instance.new("DataStoreGetOptions");options.UseCache=false
  local ok,data=pcall(function() return self.store:GetAsync("u:"..player.UserId,options) end)
  if not ok then self.status[player]="LOAD_FAILED";return false,"LOAD_FAILED" end
  source=data
 end
 if revisionOf(source)==nil then self.status[player]="LOAD_INVALID";return false,"LOAD_INVALID" end
 local p=ProfileData.copy(source);self.profiles[player]=p;self.revisions[player]=p.revision
 self.status[player]=RunService:IsStudio() and "STUDIO_SESSION_ONLY" or "LOADED"
 return true,"LOADED"
end
function ProfileService:get(player) return self.profiles[player] end
function ProfileService:publicState(player)
 local p=self.profiles[player]
 if not p then return {currency=0,equippedItemId="",ownedItemIds={},saveStatus=self.status[player] or "NOT_LOADED"} end
 return {currency=p.currency,equippedItemId=p.equippedItemId,ownedItemIds=table.clone(p.ownedItemIds),saveStatus=self.status[player] or "UNCONFIRMED"}
end
function ProfileService:_commit(player,entry)
 local ok,result=pcall(function()
  return self.store:UpdateAsync("u:"..player.UserId,function(old)
   local revision=revisionOf(old)
   -- An acknowledgement can be lost after a successful write. Recognize only
   -- this exact transaction, never a different session at the same revision.
   if revision==entry.expected+1 and type(old)=="table" and old.writeToken==entry.token and sameProgress(old,entry.snapshot) then return old end
   if revision~=entry.expected then return nil end
   return entry.snapshot
  end)
 end)
 if not ok then return false,"SAVE_FAILED" end
 if type(result)~="table" or result.revision~=entry.expected+1 or result.writeToken~=entry.token or not sameProgress(result,entry.snapshot) then
  return false,"SAVE_CONFLICT"
 end
 self.revisions[player]=result.revision;self.profiles[player].revision=result.revision;self.pending[player]=nil
 return true,"SAVED"
end
function ProfileService:_saveUnlocked(player)
 local p=self.profiles[player]
 if RunService:IsStudio() then
  local snapshot=ProfileData.copy(p);snapshot.revision=(self.revisions[player] or 0)+1
  self.studioPersist[player.UserId]=snapshot;p.revision=snapshot.revision;self.revisions[player]=snapshot.revision
  return true,"STUDIO_SESSION_ONLY"
 end
 local entry=self.pending[player]
 if entry then
  local ok,code=self:_commit(player,entry);if not ok then return false,code end
  if sameProgress(p,entry.snapshot) then return true,"SAVED" end
  -- Play can continue after a failed save. Reconcile the older write first,
  -- then persist newer clues/outfits instead of dropping those later changes.
 end
 local snapshot=ProfileData.copy(p);local expected=self.revisions[player] or 0
 if expected>=99999999 then return false,"SAVE_CONFLICT" end
 local token=HttpService:GenerateGUID(false);snapshot.revision=expected+1;snapshot.writeToken=token
 entry={expected=expected,token=token,snapshot=snapshot};self.pending[player]=entry
 return self:_commit(player,entry)
end
function ProfileService:save(player)
 if not self.profiles[player] then return false,"NOT_LOADED" end
 if self.saving[player] then return false,"SAVE_IN_PROGRESS" end
 if self.status[player]=="SAVE_CONFLICT" then return false,"SAVE_CONFLICT" end
 self.saving[player]=true;self.status[player]="SAVING"
 local ran,ok,code=pcall(function() return self:_saveUnlocked(player) end)
 self.saving[player]=nil
 if not ran then ok=false;code="SAVE_FAILED" end
 self.status[player]=code;return ok==true,code
end
function ProfileService:release(player)
 local deadline=os.clock()+15
 while self.saving[player] and os.clock()<deadline do task.wait(.1) end
 local ok,code=self:save(player)
 if not ok and code=="SAVE_FAILED" then task.wait(1);ok,code=self:save(player) end
 if ok then
  self.profiles[player]=nil;self.revisions[player]=nil;self.status[player]=nil;self.pending[player]=nil
  local mission=self.context.services.MissionService;if mission then mission:removePlayer(player) end
 else warn("LANTERN_PROGRESS_NOT_SAVED",code) end
 return ok,code
end
return ProfileService
