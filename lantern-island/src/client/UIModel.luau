--!nonstrict
-- Pure view/action model shared by production controls and behavior tests.
local UIModel={}
UIModel.quests={
 {id="lantern-lift",title="Light the hill",subtitle="Glowstone math",reward="firefly-scarf",station="LiftConsole"},
 {id="ribbon-studio",title="Ribbon studio",subtitle="Word clues",reward="rainbow-bow",station="RibbonConsole"},
 {id="moon-picnic",title="Missing picnic",subtitle="Reading mystery",reward="moon-crown",station="PicnicConsole"},
}
UIModel.items={
 {id="firefly-scarf",title="Firefly Scarf",quest="Light the hill"},
 {id="rainbow-bow",title="Rainbow Bow",quest="Ribbon studio"},
 {id="moon-crown",title="Moon Crown",quest="Missing picnic"},
}
function UIModel.owns(profile,id)
 for _,owned in ipairs(profile and profile.ownedItemIds or {}) do if owned==id then return true end end
 return false
end
function UIModel.primary(state)
 local m=state and state.mission;if not m then return nil end
 if m.status=="COMPLETED" then
  if UIModel.owns(state.profile,m.rewardItemId) and state.profile.equippedItemId~=m.rewardItemId then return {label="Dress Pip in your reward",action="EquipItem",fields={itemId=m.rewardItemId}} end
  return {label="Choose another adventure",menu="map"}
 end
 return {label=m.status=="BETWEEN" and "Find the next glow" or "Open my clue",action="StartMission",fields={missionId=m.missionId}}
end
function UIModel.answer(state,optionId)
 local m=state and state.mission;if not m or m.status~="ACTIVE" then return nil end
 for _,option in ipairs(m.options or {}) do if option.id==optionId then
  return {action="SubmitAnswer",fields={missionId=m.missionId,payload={activityId=m.activityId,contentVersion=m.contentVersion,answer=optionId}}}
 end end
 return nil
end
function UIModel.target(m)
 if not m then return nil end
 local index=m.checkpointIndex or 1
 for _,quest in ipairs(UIModel.quests) do if quest.id==m.missionId then return index==1 and quest.station or (quest.id.."-checkpoint-"..index) end end
 return nil
end
function UIModel.layout(width,height,touch)
 width=math.max(width,1);height=math.max(height,1)
 local narrow=width<620;local landscape=width>height and height<560
 local mobile=touch==true or math.min(width,height)<520
 local panelWidth=math.min(mobile and 392 or 380,width-24)
 if landscape then panelWidth=math.min(mobile and 374 or 360,math.floor(width*.49)) end
 local ratio=landscape and (mobile and .82 or .73) or (mobile and .72 or .59)
 local panelHeight=math.max(180,math.min(mobile and 590 or 520,math.floor(height*ratio)))
 local top=landscape and 6 or math.floor(height*(mobile and .10 or .14))
 return {
  width=panelWidth,height=panelHeight,top=top,center=narrow and not landscape,landscape=landscape,mobile=mobile,
  trackerWidth=math.min(mobile and 316 or 300,landscape and width-panelWidth-36 or width-24),
  trackerHeight=mobile and 170 or 158,navHeight=mobile and 52 or 42,openHeight=mobile and 44 or 36,
  closeSize=mobile and 50 or 44,primaryHeight=mobile and 54 or 46,contentButtonHeight=mobile and 54 or 48,
  contentTextSize=mobile and 18 or 17,
 }
end
function UIModel.saveText(status)
 if status=="STUDIO_SESSION_ONLY" then return "Studio practice: saves last only while this test server stays open." end
 if status=="SAVED" or status=="LOADED" then return "Progress saved." end
 if status=="SAVING" then return "Saving progress..." end
 return "Progress is not confirmed saved. Please keep this session open."
end
return UIModel