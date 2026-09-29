--!nonstrict
-- Pure presentation model. Only server-confirmed inventory drives celebrations.
-- No random prizes, expiring streaks, lost lives, purchases, or mastery claims.
local Journey={}
Journey.catalog={
 {id="firefly-scarf",title="Firefly Scarf",quest="Light the hill",color={255,207,116},message="You brought the hill's warm glow back!"},
 {id="rainbow-bow",title="Rainbow Bow",quest="Ribbon studio",color={244,163,205},message="Your word clues made the ribbon studio shine!"},
 {id="moon-crown",title="Moon Crown",quest="Missing picnic",color={175,190,255},message="You followed the story and found the picnic!"},
}
for _,item in ipairs(Journey.catalog) do table.freeze(item.color);table.freeze(item) end
table.freeze(Journey.catalog)
function Journey.item(id)
 for _,item in ipairs(Journey.catalog) do if item.id==id then return item end end
 return nil
end
function Journey.collection(profile)
 local seen={};local count=0
 if type(profile)=="table" and type(profile.ownedItemIds)=="table" then
  for _,id in ipairs(profile.ownedItemIds) do if Journey.item(id) and not seen[id] then seen[id]=true;count+=1 end end
 end
 return {count=count,total=3,owned=seen,bonusUnlocked=count==3}
end
function Journey.progress(mission,profile)
 local item=Journey.item(mission and mission.rewardItemId)
 if not item then return {solved=0,total=4,title="Choose an adventure",owned=false,practice=false} end
 local owned=Journey.collection(profile).owned[item.id]==true
 local index=tonumber(mission.checkpointIndex) or 1
 local solved=math.clamp(math.floor(index)-1,0,4)
 if mission.status=="COMPLETED" then solved=4 end
 return {solved=solved,total=4,title=item.title,itemId=item.id,owned=owned,practice=mission.practice==true}
end
function Journey.newObserver()
 local initialized=false;local known={};local mostClues=0;local bonusSeen=false
 local observer={}
 function observer:observe(state)
  if type(state)~="table" or state.runtimeStatus~="READY" or state.profileStatus~="LOADED" or type(state.profile)~="table" or type(state.mission)~="table" then return {} end
  local collection=Journey.collection(state.profile)
  local clues=math.clamp(tonumber(state.mission.completedCount) or 0,0,12)
  if not initialized then
   initialized=true;known=collection.owned;mostClues=clues;bonusSeen=collection.bonusUnlocked
   return {} -- A reconnect is not a new reward.
  end
  local events={}
  for _,item in ipairs(Journey.catalog) do
   if collection.owned[item.id] and not known[item.id] then
    known[item.id]=true;table.insert(events,{kind="unlock",itemId=item.id})
   end
  end
  if collection.bonusUnlocked and not bonusSeen then bonusSeen=true;table.insert(events,{kind="collection",count=3}) end
  if clues>mostClues and #events==0 and not state.mission.practice then
   table.insert(events,{kind="checkpoint",solved=Journey.progress(state.mission,state.profile).solved})
  end
  mostClues=math.max(mostClues,clues)
  return events
 end
 return observer
end
return table.freeze(Journey)