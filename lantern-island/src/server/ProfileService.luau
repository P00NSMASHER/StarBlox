--!strict
local DataStoreService=game:GetService("DataStoreService")
local RunService=game:GetService("RunService")
local ProfileService={}
ProfileService.__index=ProfileService
local function blank() return {currency=0,equippedItemId="",ownedItemIds={},completions={}} end
local function copy(source:any)
 local p=blank();if not source then return p end
 p.currency=tonumber(source.currency) or 0
 if type(source.equippedItemId)=="string" then p.equippedItemId=source.equippedItemId end
 if type(source.ownedItemIds)=="table" then for _,id in ipairs(source.ownedItemIds) do if type(id)=="string" then table.insert(p.ownedItemIds,id) end end end
 if type(source.completions)=="table" then for id,done in pairs(source.completions) do if type(id)=="string" and done==true then p.completions[id]=true end end end
 return p
end
function ProfileService.new(context:any)
 local self=setmetatable({context=context,profiles={}},ProfileService)
 self.store=DataStoreService:GetDataStore(context.dataStoreNamespace.."_profiles")
 return self
end
function ProfileService:load(player:Player)
 if self.profiles[player] then return true,"ALREADY_LOADED" end
 local p
 if RunService:IsStudio() then p=blank() else
  local ok,data=pcall(function() return self.store:GetAsync("u:"..player.UserId) end)
  if not ok then return false,"LOAD_FAILED" end;p=copy(data)
 end
 self.profiles[player]=p;return true,"LOADED"
end
function ProfileService:get(player:Player) return self.profiles[player] end
function ProfileService:publicState(player:Player)
 local p=self.profiles[player];if not p then return {currency=0,equippedItemId="",ownedItemIds={},saveStatus="NOT_LOADED"} end
 return {currency=p.currency,equippedItemId=p.equippedItemId,ownedItemIds=table.clone(p.ownedItemIds),saveStatus=RunService:IsStudio() and "STUDIO_SESSION" or "LOADED"}
end
function ProfileService:save(player:Player)
 local p=self.profiles[player];if not p then return false,"NOT_LOADED" end
 if RunService:IsStudio() then return true,"STUDIO_SESSION" end
 local snapshot=copy(p);local ok=pcall(function() self.store:UpdateAsync("u:"..player.UserId,function() return snapshot end) end)
 return ok,ok and "SAVED" or "SAVE_FAILED"
end
function ProfileService:release(player:Player)
 local ok,code=self:save(player);if ok then self.profiles[player]=nil end;return ok,code
end
return ProfileService