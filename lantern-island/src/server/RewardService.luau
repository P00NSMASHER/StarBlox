--!strict
local RewardService={}
RewardService.__index=RewardService
local ITEMS={["firefly-scarf"]=true}
function RewardService.new(context:any) return setmetatable({context=context},RewardService) end
local function owns(profile:any,id:string) for _,owned in ipairs(profile.ownedItemIds) do if owned==id then return true end end;return false end
function RewardService:grant(player:Player,itemId:string)
 local p=self.context.services.ProfileService:get(player)
 if not p or not ITEMS[itemId] then return false,"REWARD_UNAVAILABLE" end
 if not owns(p,itemId) then table.insert(p.ownedItemIds,itemId);p.currency+=25 end
 return true,"REWARD_GRANTED"
end
function RewardService:handle(player:Player,request:any)
 local p=self.context.services.ProfileService:get(player)
 if not p or not ITEMS[request.itemId] then return {ok=false,code="ITEM_UNAVAILABLE"} end
 if not owns(p,request.itemId) then return {ok=false,code="ITEM_NOT_OWNED"} end
 p.equippedItemId=request.itemId
 if self.context.services.WorldBuilder.setEquipped then self.context.services.WorldBuilder:setEquipped(player,request.itemId) end
 self.context.services.ProfileService:save(player)
 return {ok=true,code="ITEM_EQUIPPED"}
end
return RewardService