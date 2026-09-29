--!nonstrict
local RewardService={}
RewardService.__index=RewardService
local ITEMS={["firefly-scarf"]=true,["rainbow-bow"]=true,["moon-crown"]=true}
function RewardService.new(context) return setmetatable({context=context},RewardService) end
local function owns(p,id) for _,owned in ipairs(p.ownedItemIds) do if owned==id then return true end end;return false end
function RewardService:grant(player,itemId)
 local p=self.context.services.ProfileService:get(player)
 if not p or not ITEMS[itemId] then return false,"REWARD_UNAVAILABLE" end
 if not owns(p,itemId) then table.insert(p.ownedItemIds,itemId);p.currency=#p.ownedItemIds*25 end
 return true,"REWARD_GRANTED"
end
function RewardService:handle(player,request)
 local p=self.context.services.ProfileService:get(player)
 if not p or not ITEMS[request.itemId] then return {ok=false,code="ITEM_UNAVAILABLE"} end
 if not owns(p,request.itemId) then return {ok=false,code="ITEM_NOT_OWNED"} end
 p.equippedItemId=request.itemId;self.context.services.WorldBuilder:setEquipped(player,request.itemId)
 local saved=self.context.services.ProfileService:save(player)
 return {ok=true,code=saved and "ITEM_EQUIPPED" or "PROGRESS_SAVE_PENDING"}
end
return RewardService
