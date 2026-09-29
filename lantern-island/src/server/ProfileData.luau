--!nonstrict
-- Bounded, pure migration used by ProfileService and executed regression tests.
local ProfileData={}
local QUESTS={"lantern-lift","ribbon-studio","moon-picnic"}
local ITEMS={["firefly-scarf"]=true,["rainbow-bow"]=true,["moon-crown"]=true}
local function integer(v,lo,hi,default)
 if type(v)~="number" or v~=v or v%1~=0 then return default end
 return math.clamp(v,lo,hi)
end
function ProfileData.blank()
 return {currency=0,equippedItemId="",ownedItemIds={},completions={},questProgress={},learning={},revision=0}
end
function ProfileData.copy(source)
 local p=ProfileData.blank();if type(source)~="table" then return p end
 p.revision=integer(source.revision,0,100000000,0)
 local seen={}
 if type(source.ownedItemIds)=="table" then for _,id in ipairs(source.ownedItemIds) do
  if type(id)=="string" and ITEMS[id] and not seen[id] then seen[id]=true;table.insert(p.ownedItemIds,id) end
 end end
 p.currency=#p.ownedItemIds*25
 if type(source.equippedItemId)=="string" and seen[source.equippedItemId] then p.equippedItemId=source.equippedItemId end
 for _,mid in ipairs(QUESTS) do
  if type(source.completions)=="table" and source.completions[mid]==true then p.completions[mid]=true end
  local q=type(source.questProgress)=="table" and source.questProgress[mid]
  if type(q)=="table" then p.questProgress[mid]={index=integer(q.index,1,p.completions[mid] and 5 or 4,1),attempts=integer(q.attempts,0,100,0),hintLevel=integer(q.hintLevel,0,3,0)} end
 end
 for _,prefix in ipairs({"lift","ribbon","picnic"}) do for n=1,4 do
  local id=prefix.."-"..n;local e=type(source.learning)=="table" and source.learning[id]
  if type(e)=="table" and type(e.assisted)=="boolean" then p.learning[id]={assisted=e.assisted,transfer=n==4} end
 end end
 return p
end
function ProfileData.summary(p)
 local summary={total=0,independent=0,supported=0,transfer=0}
 for _,e in pairs(p.learning or {}) do
  summary.total+=1
  if e.assisted then summary.supported+=1 else summary.independent+=1;if e.transfer then summary.transfer+=1 end end
 end
 return summary
end
return ProfileData
