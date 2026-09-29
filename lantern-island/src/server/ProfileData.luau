--!nonstrict
-- Pure, bounded migration/serialization used by the actual Roblox profile service.
local ProfileData={}
local QUEST_IDS={"lantern-lift","ribbon-studio","moon-picnic"}
local ITEMS={["firefly-scarf"]=true,["rainbow-bow"]=true,["moon-crown"]=true}
local function integer(value,lo,hi,default)
 if type(value)~="number" or value~=value or value%1~=0 then return default end
 return math.clamp(value,lo,hi)
end
function ProfileData.blank()
 return {currency=0,equippedItemId="",ownedItemIds={},completions={},questProgress={},learning={},revision=0}
end
function ProfileData.copy(source)
 local p=ProfileData.blank();if type(source)~="table" then return p end
 p.revision=integer(source.revision,0,100000000,0)
 local seen={}
 if type(source.ownedItemIds)=="table" then
  for _,id in ipairs(source.ownedItemIds) do
   if ITEMS[id] and not seen[id] then seen[id]=true;table.insert(p.ownedItemIds,id) end
  end
 end
 -- These are earned stars, not money. Reconcile them from unique entitlements.
 p.currency=#p.ownedItemIds*25
 if type(source.equippedItemId)=="string" and seen[source.equippedItemId] then p.equippedItemId=source.equippedItemId end
 for _,mid in ipairs(QUEST_IDS) do
  if type(source.completions)=="table" and source.completions[mid]==true then p.completions[mid]=true end
  local q=type(source.questProgress)=="table" and source.questProgress[mid]
  if type(q)=="table" then p.questProgress[mid]={index=integer(q.index,1,p.completions[mid] and 5 or 4,1),attempts=integer(q.attempts,0,100,0),hintLevel=integer(q.hintLevel,0,3,0)} end
 end
 for _,prefix in ipairs({"lift","ribbon","picnic"}) do
  for n=1,4 do
   local id=prefix.."-"..n
   local e=type(source.learning)=="table" and source.learning[id]
   if type(e)=="table" and type(e.assisted)=="boolean" then
    p.learning[id]={assisted=e.assisted,transfer=n==4}
   end
  end
 end
 return p
end
function ProfileData.summary(profile)
 local total,independent,supported,transfer=0,0,0,0
 for _,e in pairs(profile.learning or {}) do
  total+=1
  if e.assisted then supported+=1 else independent+=1;if e.transfer then transfer+=1 end end
 end
 return {total=total,independent=independent,supported=supported,transfer=transfer}
end
return ProfileData
