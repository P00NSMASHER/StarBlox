--!nonstrict
-- Responsive, scrollable cards; learning controls never replace Roblox movement controls.
local UIController={}
UIController.__index=UIController
local C={ink=Color3.fromRGB(44,62,75),cream=Color3.fromRGB(255,247,230),gold=Color3.fromRGB(255,207,109),
 pink=Color3.fromRGB(245,170,203),blue=Color3.fromRGB(163,219,240),mint=Color3.fromRGB(183,230,193),muted=Color3.fromRGB(216,221,222)}
local QUESTS={
 {id="lantern-lift",title="Light the hilltop",detail="Follow the golden path. Count glowstones. Earn a scarf.",color=C.gold,reward="firefly-scarf",item="Firefly Scarf"},
 {id="ribbon-studio",title="Pip's ribbon studio",detail="Follow the pink path. Solve word clues. Make a bow.",color=C.pink,reward="rainbow-bow",item="Rainbow Bow"},
 {id="moon-picnic",title="The missing picnic",detail="Follow the blue path. Read clues. Find the picnic.",color=C.blue,reward="moon-crown",item="Moon Crown"},
}
local function round(gui,r) local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,r or 14);c.Parent=gui end
local function text(parent,words,size,bold)
 local t=Instance.new("TextLabel");t.BackgroundTransparency=1;t.Size=UDim2.new(1,0,0,0);t.AutomaticSize=Enum.AutomaticSize.Y
 t.Text=words;t.TextSize=size or 18;t.Font=bold and Enum.Font.GothamBold or Enum.Font.GothamMedium
 t.TextColor3=C.ink;t.TextWrapped=true;t.TextXAlignment=Enum.TextXAlignment.Left;t.TextYAlignment=Enum.TextYAlignment.Top;t.Parent=parent;return t
end
local function owns(profile,id) for _,owned in ipairs(profile and profile.ownedItemIds or {}) do if owned==id then return true end end;return false end
function UIController.new(context)
 return setmetatable({context=context,connections={},pageConnections={},state=nil,mode="quests",busy=false},UIController)
end
function UIController:_button(parent,words,color,callback,height)
 local b=Instance.new("TextButton");b.Size=UDim2.new(1,0,0,height or 52);b.BackgroundColor3=color or C.gold
 b.Text=words;b.Font=Enum.Font.GothamBold;b.TextSize=17;b.TextWrapped=true;b.TextColor3=C.ink;b.AutoButtonColor=true
 b.Active=not self.busy;b.Parent=parent;round(b,14)
 table.insert(self.pageConnections,b.Activated:Connect(function() if not self.busy then callback() end end));return b
end
function UIController:_send(action,fields)
 local id,code=self.context.send(action,fields)
 if not id then self:toast(code=="BUSY" and "One moment - checking that action." or "Check the connection, then try again.") end
end
function UIController:mount(playerGui)
 local gui=Instance.new("ScreenGui");gui.Name="LanternIslandUI";gui.ResetOnSpawn=false;gui.IgnoreGuiInset=false;gui.Parent=playerGui;self.gui=gui
 local top=Instance.new("Frame");top.Size=UDim2.new(1,-20,0,50);top.Position=UDim2.fromOffset(10,8);top.BackgroundTransparency=1;top.Parent=gui
 local function nav(label,x,width,callback)
  local b=Instance.new("TextButton");b.Position=UDim2.new(x,0,0,0);b.Size=UDim2.new(width,-6,1,0)
  b.BackgroundColor3=C.ink;b.TextColor3=C.cream;b.Font=Enum.Font.GothamBold;b.TextSize=16;b.Text=label;b.Parent=top;round(b)
  table.insert(self.connections,b.Activated:Connect(callback));return b
 end
 self.map=nav("Adventures",0,.42,function() self.mode="quests";self:render(self.state) end)
 self.outfits=nav("Pip's outfits",.42,.38,function() self.mode="wardrobe";self:render(self.state) end)
 self.close=nav("Explore",.80,.20,function() self.mode="explore";self:render(self.state) end)
 local guide=Instance.new("TextLabel");guide.Position=UDim2.fromOffset(14,64);guide.Size=UDim2.new(1,-28,0,43)
 guide.BackgroundColor3=C.ink;guide.BackgroundTransparency=.12;guide.TextColor3=C.cream;guide.TextSize=15;guide.TextWrapped=true;guide.Font=Enum.Font.GothamMedium;guide.Parent=gui;round(guide);self.guide=guide
 local card=Instance.new("Frame");card.AnchorPoint=Vector2.new(.5,0);card.BackgroundColor3=C.cream;card.Parent=gui;round(card,22);self.card=card
 local scroll=Instance.new("ScrollingFrame");scroll.Size=UDim2.fromScale(1,1);scroll.BackgroundTransparency=1;scroll.BorderSizePixel=0
 scroll.ScrollBarThickness=5;scroll.ScrollingDirection=Enum.ScrollingDirection.Y;scroll.AutomaticCanvasSize=Enum.AutomaticSize.Y;scroll.CanvasSize=UDim2.new();scroll.Parent=card;self.scroll=scroll
 local pad=Instance.new("UIPadding");pad.PaddingLeft=UDim.new(0,17);pad.PaddingRight=UDim.new(0,17);pad.PaddingTop=UDim.new(0,17);pad.PaddingBottom=UDim.new(0,20);pad.Parent=scroll
 local layout=Instance.new("UIListLayout");layout.Padding=UDim.new(0,12);layout.SortOrder=Enum.SortOrder.LayoutOrder;layout.Parent=scroll
 local toast=Instance.new("TextLabel");toast.AnchorPoint=Vector2.new(.5,0);toast.Position=UDim2.new(.5,0,0,110);toast.Size=UDim2.new(.88,0,0,58)
 toast.BackgroundColor3=C.ink;toast.TextColor3=C.cream;toast.Font=Enum.Font.GothamBold;toast.TextSize=16;toast.TextWrapped=true;toast.ZIndex=20;toast.Visible=false;toast.Parent=gui;round(toast);self.toastLabel=toast
 local function resize()
  local camera=workspace.CurrentCamera;local size=camera and camera.ViewportSize or Vector2.new(390,844)
  local landscape=size.X>size.Y
  card.Position=UDim2.new(landscape and .58 or .5,0,0,landscape and 112 or 120)
  card.Size=UDim2.fromOffset(math.min(500,size.X*(landscape and .56 or .92)),math.max(120,size.Y-(landscape and 180 or 250)))
 end
 resize()
 if workspace.CurrentCamera then table.insert(self.connections,workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(resize)) end
 table.insert(self.connections,self.context.pendingChanged:Connect(function(value) self.busy=value;self:render(self.state) end))
 table.insert(self.connections,self.context.resultReceived:Connect(function(result)
  if result.code=="FOLLOW_BEACON" then self.mode="explore";self:toast("Follow the colored path to the adventure sign. Tap Play adventure there.")
  elseif result.code=="MISSION_STARTED" or result.code=="MISSION_RESUMED" or result.code=="MISSION_ALREADY_COMPLETE" then self.mode="mission"
  elseif result.code=="CHECKPOINT_COMPLETE" then self:toast("Another spark is glowing! See how you solved it.")
  elseif result.code=="MISSION_COMPLETE" then self:toast("You brought the island to life! A new outfit is yours.")
  elseif result.code=="PRACTICE_COMPLETE" then self:toast("Practice complete! Take Pip exploring or try another adventure.")
  elseif result.code=="TRY_AGAIN" then self:toast("Let's work it out together. Pip has a clue below.")
  elseif result.code=="ITEM_EQUIPPED" then self:toast("Look at Pip - your new outfit is on!")
  elseif result.code=="PROGRESS_SAVE_PENDING" then self:toast("That worked here, but saving is not confirmed. Please keep the game open.")
  elseif result.ok==false and result.code~="HINT_READY" then self:toast("That action did not finish. Check your connection and try again.") end
  self:render(self.state)
 end))
end
function UIController:toast(words)
 if not self.toastLabel then return end
 self.toastSerial=(self.toastSerial or 0)+1;local serial=self.toastSerial
 self.toastLabel.Text=words;self.toastLabel.Visible=true
 task.delay(4,function() if self.toastLabel and self.toastSerial==serial then self.toastLabel.Visible=false end end)
end
function UIController:_clear()
 for _,connection in ipairs(self.pageConnections) do connection:Disconnect() end;self.pageConnections={}
 for _,child in ipairs(self.scroll:GetChildren()) do if child:IsA("GuiObject") then child:Destroy() end end
end
function UIController:_blocks(representation)
 if not representation or representation.tensA==nil then return end
 text(self.scroll,"Build it with tens and ones",16,true)
 for _,side in ipairs({"A","B"}) do
  local tens,ones=representation["tens"..side],representation["ones"..side]
  local row=Instance.new("Frame");row.Size=UDim2.new(1,0,0,39);row.BackgroundTransparency=1;row.Parent=self.scroll
  local layout=Instance.new("UIListLayout");layout.FillDirection=Enum.FillDirection.Horizontal;layout.Padding=UDim.new(0,4);layout.VerticalAlignment=Enum.VerticalAlignment.Center;layout.Parent=row
  for _=1,tens do local rod=Instance.new("TextLabel");rod.Size=UDim2.fromOffset(27,36);rod.Text="10";rod.TextSize=13;rod.Font=Enum.Font.GothamBold;rod.BackgroundColor3=C.gold;rod.TextColor3=C.ink;rod.Parent=row;round(rod,5) end
  for _=1,ones do local dot=Instance.new("TextLabel");dot.Size=UDim2.fromOffset(19,23);dot.Text="1";dot.TextSize=12;dot.BackgroundColor3=C.blue;dot.TextColor3=C.ink;dot.Parent=row;round(dot,5) end
 end
end
function UIController:render(state)
 self.state=state;if not self.gui or not state or not state.mission then return end
 local m=state.mission;local profile=state.profile
 local key=self.mode..":"..m.missionId..":"..m.status..":"..m.activityId
 if self.pageKey~=key then self.scroll.CanvasPosition=Vector2.new(0,0);self.pageKey=key end
 local warning=profile and (profile.saveStatus=="SAVE_FAILED" or profile.saveStatus=="SAVE_CONFLICT")
 self.guide.Text=warning and "Saving is not confirmed. Your progress is only in this session." or (m.status=="AVAILABLE" and m.objective or "Pip follows you! Explore, choose an adventure, or try an outfit.")
 self.card.Visible=self.mode~="explore"
 self:_clear();if not self.card.Visible then return end
 local page=self.scroll
 if self.mode=="quests" then
  text(page,"What shall we do, adventurer?",24,true)
  text(page,"Three little adventures. Choose your own order. Walk, jump, explore - there is no timer.",17)
  for _,quest in ipairs(QUESTS) do
   local earned=owns(profile,quest.reward)
   self:_button(page,(earned and "Done!  " or "")..quest.title,quest.color,function()
    self.mode="mission";self:_send("StartMission",{missionId=quest.id})
   end)
   text(page,quest.detail,15)
  end
  if m.status=="ACTIVE" or m.status=="BETWEEN" then self:_button(page,"Continue my puzzle",C.mint,function() self.mode="mission";self:render(self.state) end) end
 elseif self.mode=="wardrobe" then
  text(page,"Pip's dress-up corner",24,true)
  text(page,"Everything here is earned by playing. No purchases. Choose one accessory for Pip.",17)
  for _,quest in ipairs(QUESTS) do
   local earned=owns(profile,quest.reward);local equipped=profile and profile.equippedItemId==quest.reward
   self:_button(page,(equipped and "Wearing: " or (earned and "Wear " or "Locked: "))..quest.item,earned and quest.color or C.muted,function()
    if earned then self:_send("EquipItem",{itemId=quest.reward}) else self:toast("Finish "..quest.title.." to earn this accessory.") end
   end)
  end
  text(page,tostring(profile and profile.currency or 0).." earned stars | "..m.completedCount.." unique practice checks\nStars are rewards, not a learning score.",16)
 else
  text(page,m.title,24,true)
  if m.status=="ACTIVE" then
   text(page,m.passage or "",17)
   text(page,m.prompt,21,true)
   if m.hint~="" then text(page,"Pip's help: "..m.hint,17);self:_blocks(m.representation) end
   local answers=Instance.new("Frame");answers.Size=UDim2.new(1,0,0,116);answers.BackgroundTransparency=1;answers.Parent=page
   local grid=Instance.new("UIGridLayout");grid.CellSize=UDim2.new(.5,-5,0,53);grid.CellPadding=UDim2.fromOffset(10,10);grid.SortOrder=Enum.SortOrder.LayoutOrder;grid.Parent=answers
   for _,option in ipairs(m.options) do
    self:_button(answers,option.label,C.blue,function()
     self:_send("SubmitAnswer",{missionId=m.missionId,payload={activityId=m.activityId,contentVersion=m.contentVersion,answer=option.id}})
    end)
   end
   self:_button(page,m.hint=="" and "Pip, show me how" or "Show the next clue",C.mint,function() self:_send("RequestHint",{missionId=m.missionId}) end,48)
   self:_button(page,"Take an exploring break",C.muted,function() self.mode="explore";self:_send("CancelMission",{missionId=m.missionId}) end,48)
  elseif m.status=="BETWEEN" then
   text(page,"You lit another spark!",21,true);text(page,m.objective,19)
   self:_button(page,"Next little challenge",C.gold,function() self:_send("StartMission",{missionId=m.missionId}) end)
   self:_button(page,"Explore for a bit",C.mint,function() self.mode="explore";self:render(self.state) end)
  elseif m.status=="COMPLETED" then
   text(page,m.objective,18)
   self:_button(page,"Dress up Pip",C.pink,function() self.mode="wardrobe";self:render(self.state) end)
   self:_button(page,"Choose another adventure",C.blue,function() self.mode="quests";self:render(self.state) end)
   self:_button(page,"Practice this adventure again",C.mint,function() self:_send("StartMission",{missionId=m.missionId}) end)
  else
   text(page,m.objective,19)
   self:_button(page,"I'm at the adventure sign",C.gold,function() self:_send("StartMission",{missionId=m.missionId}) end)
   self:_button(page,"Explore the island",C.mint,function() self.mode="explore";self:render(self.state) end)
  end
 end
 text(page,state.lesson and state.lesson.sourceLabel or "Original sample practice - not current homework",12)
 if profile and profile.saveStatus=="STUDIO_SESSION_ONLY" then text(page,"Studio test: progress lasts only in this running test server.",12) end
 if warning then text(page,"SAVE NOT CONFIRMED. A reconnect may lose unsaved progress.",15,true) end
 local order=0;for _,child in ipairs(page:GetChildren()) do if child:IsA("GuiObject") then order+=1;child.LayoutOrder=order end end
end
function UIController:destroy()
 for _,c in ipairs(self.connections) do c:Disconnect() end
 for _,c in ipairs(self.pageConnections) do c:Disconnect() end
 if self.gui then self.gui:Destroy() end;self.gui=nil;self.toastLabel=nil
end
return UIController
