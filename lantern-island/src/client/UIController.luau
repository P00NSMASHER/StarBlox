--!nonstrict
local RunService=game:GetService("RunService")
local UserInputService=game:GetService("UserInputService")
local UIModel=require(script.Parent:WaitForChild("UIModel"))
local RewardView=require(script.Parent:WaitForChild("RewardView"))
local UIController={};UIController.__index=UIController
local DARK=Color3.fromRGB(43,53,78);local WHITE=Color3.fromRGB(255,250,244);local PINK=Color3.fromRGB(246,180,207);local GOLD=Color3.fromRGB(255,214,123);local MINT=Color3.fromRGB(187,232,208);local BLUE=Color3.fromRGB(177,220,239)
local function corner(gui,r) Instance.new("UICorner",gui).CornerRadius=UDim.new(0,r or 14) end
local function text(parent,name,value,size)
 local t=Instance.new("TextLabel");t.Name=name;t.BackgroundTransparency=1;t.Size=UDim2.new(1,0,0,0);t.AutomaticSize=Enum.AutomaticSize.Y;t.Font=Enum.Font.GothamMedium;t.TextSize=size or 17;t.TextColor3=DARK;t.TextWrapped=true;t.TextXAlignment=Enum.TextXAlignment.Left;t.TextYAlignment=Enum.TextYAlignment.Top;t.Text=value;t.Parent=parent;return t
end
local function button(parent,name,value,color)
 local b=Instance.new("TextButton");b.Name=name;b.Size=UDim2.new(1,0,0,48);b.Font=Enum.Font.GothamBold;b.TextSize=17;b.TextWrapped=true;b.TextColor3=DARK;b.Text=value;b.BackgroundColor3=color or GOLD;b.AutoButtonColor=true;b.BorderSizePixel=0;b.Parent=parent;corner(b,13)
 local stroke=Instance.new("UIStroke");stroke.Color=DARK;stroke.Transparency=.82;stroke.Thickness=1.1;stroke.Parent=b
 local base=b.BackgroundColor3;local gradient=Instance.new("UIGradient");gradient.Color=ColorSequence.new(base:Lerp(WHITE,.18),base);gradient.Rotation=90;gradient.Parent=b
 return b
end
local function pad(parent,n)
 local p=Instance.new("UIPadding");p.PaddingTop=UDim.new(0,n);p.PaddingBottom=UDim.new(0,n);p.PaddingLeft=UDim.new(0,n);p.PaddingRight=UDim.new(0,n);p.Parent=parent
end
function UIController.new(context) return setmetatable({context=context,connections={},contentConnections={},mode=nil,state=nil,pending=false,toastSerial=0,welcomed=false},UIController) end
function UIController:_connect(signal,callback,content)
 local c=signal:Connect(callback);table.insert(content and self.contentConnections or self.connections,c);return c
end
function UIController:_send(action,fields)
 local id,code=self.context.send(action,fields)
 if not id then self:showToast(code=="BUSY" and "Pip is checking that..." or "Please check the connection, then try again.") end
 return id
end
function UIController:_command(command)
 if not command then return end
 if command.menu then self.mode=command.menu;self:_draw();return end
 self:_send(command.action,command.fields)
end
function UIController:mount(playerGui)
 local gui=Instance.new("ScreenGui");gui.Name="LanternIslandUI";gui.ResetOnSpawn=false;gui.IgnoreGuiInset=false;gui.ZIndexBehavior=Enum.ZIndexBehavior.Sibling;gui.Parent=playerGui;self.gui=gui
 local tracker=Instance.new("Frame");tracker.Name="AdventureTracker";tracker.Position=UDim2.fromOffset(12,8);tracker.Size=UDim2.fromOffset(290,120);tracker.BackgroundColor3=DARK;tracker.BackgroundTransparency=.04;tracker.BorderSizePixel=0;tracker.Parent=gui;corner(tracker,18);pad(tracker,12);self.tracker=tracker
 local trackerStroke=Instance.new("UIStroke");trackerStroke.Color=Color3.fromRGB(121,142,181);trackerStroke.Transparency=.55;trackerStroke.Thickness=1.2;trackerStroke.Parent=tracker
 local trackerGradient=Instance.new("UIGradient");trackerGradient.Color=ColorSequence.new(DARK:Lerp(BLUE,.12),DARK);trackerGradient.Rotation=120;trackerGradient.Parent=tracker
 local name=text(tracker,"Title","Pip's Island",19);name.TextColor3=WHITE;name.Size=UDim2.new(1,0,0,23);name.AutomaticSize=Enum.AutomaticSize.None
 local objective=text(tracker,"Objective","Pick a trail and explore with Pip.",14);objective.Position=UDim2.fromOffset(0,27);objective.Size=UDim2.new(1,0,0,40);objective.AutomaticSize=Enum.AutomaticSize.None;objective.TextColor3=WHITE;self.trackerText=objective
 local open=button(tracker,"OpenClue","Open clue",GOLD);open.Position=UDim2.fromOffset(0,98);open.Size=UDim2.new(1,0,0,36);open.TextSize=15;self.open=open
 local nav=Instance.new("Frame");nav.Name="ExploreButtons";nav.BackgroundTransparency=1;nav.Position=UDim2.fromOffset(12,136);nav.Size=UDim2.fromOffset(290,42);nav.Parent=gui;self.nav=nav
 for i,entry in ipairs({{"map","Adventures"},{"wardrobe","Dress Pip"},{"journal","Journal"}}) do
  local b=button(nav,entry[1],entry[2],i==2 and PINK or MINT);b.Size=UDim2.new(1/3,-5,1,0);b.Position=UDim2.new((i-1)/3,0,0,0);b.TextSize=13
  self:_connect(b.Activated,function() self.mode=self.mode==entry[1] and nil or entry[1];self:_draw() end)
 end
 local panel=Instance.new("Frame");panel.Name="ContextCard";panel.BackgroundColor3=WHITE;panel.BorderSizePixel=0;panel.Visible=false;panel.Parent=gui;corner(panel,20);self.panel=panel
 local panelStroke=Instance.new("UIStroke");panelStroke.Color=DARK;panelStroke.Transparency=.78;panelStroke.Thickness=1.1;panelStroke.Parent=panel
 local title=text(panel,"CardTitle","Adventure",20);title.Position=UDim2.fromOffset(16,14);title.Size=UDim2.new(1,-76,0,44);title.AutomaticSize=Enum.AutomaticSize.None;title.Font=Enum.Font.GothamBold;self.heading=title
 local close=button(panel,"CloseCard","X",PINK);close.AnchorPoint=Vector2.new(1,0);close.Position=UDim2.new(1,-10,0,10);close.Size=UDim2.fromOffset(44,44);self.close=close
 local scroll=Instance.new("ScrollingFrame");scroll.Name="CardContent";scroll.BackgroundTransparency=1;scroll.BorderSizePixel=0;scroll.Position=UDim2.fromOffset(14,66);scroll.Size=UDim2.new(1,-28,1,-132);scroll.CanvasSize=UDim2.new();scroll.AutomaticCanvasSize=Enum.AutomaticSize.Y;scroll.ScrollBarThickness=5;scroll.ScrollingDirection=Enum.ScrollingDirection.Y;scroll.Parent=panel;self.scroll=scroll
 local layout=Instance.new("UIListLayout");layout.Padding=UDim.new(0,12);layout.SortOrder=Enum.SortOrder.LayoutOrder;layout.Parent=scroll;self.contentLayout=layout
 local primary=button(panel,"PrimaryAction","Continue",GOLD);primary.Position=UDim2.new(0,14,1,-58);primary.Size=UDim2.new(1,-28,0,46);self.primary=primary
 local toast=Instance.new("TextLabel");toast.Name="PipFeedback";toast.AnchorPoint=Vector2.new(.5,0);toast.Position=UDim2.new(.5,0,0,6);toast.Size=UDim2.new(.74,0,0,62);toast.BackgroundColor3=DARK;toast.TextColor3=WHITE;toast.TextWrapped=true;toast.Font=Enum.Font.GothamBold;toast.TextSize=16;toast.Visible=false;toast.ZIndex=15;toast.Parent=gui;corner(toast,16);self.toast=toast
 self:_connect(open.Activated,function()
  local m=self.state and self.state.mission
  if m and (m.status=="ACTIVE" or m.status=="BETWEEN" or m.status=="COMPLETED") then self.mode="quest";self:_draw()
  else self:_command(UIModel.primary(self.state)) end
 end)
 self:_connect(close.Activated,function()
  if self.mode=="quest" and self.state and self.state.mission.status=="ACTIVE" then self:_send("CancelMission",{missionId=self.state.mission.missionId}) end
  self.mode=nil;self:_draw()
 end)
 self:_connect(primary.Activated,function()
  if self.mode=="quest" then
   local m=self.state.mission
   if m.status=="ACTIVE" then self:_send("RequestHint",{missionId=m.missionId})
   else local command=UIModel.primary(self.state);if m.status=="BETWEEN" then self.mode=nil end;self:_command(command) end
  else self.mode=nil;self:_draw() end
 end)
 self:_connect(self.context.pendingChanged,function(value) self.pending=value;self:_pending() end)
 self:_connect(self.context.resultReceived,function(result)
  local messages={TRY_AGAIN="Let's try another way. Pip added a clue.",CHECKPOINT_COMPLETE="A glow is back! Find the next one.",MISSION_COMPLETE="You helped Pip! A new outfit is yours.",PRACTICE_COMPLETE="Nice practice! Your outfits are still yours.",ITEM_EQUIPPED="Looking good, Pip!",FOLLOW_BEACON="Follow the glowing marker to your next clue.",PROGRESS_SAVE_PENDING="That worked, but saving is not confirmed yet.",ACK_UNCONFIRMED="Connection interrupted. Check progress before trying again.",ACTION_FAILED="That action did not finish. Please try again.",PROFILE_NOT_READY="Your progress is still loading."}
  if messages[result.code] then self:showToast(messages[result.code]) end
 end)
 local tick=0
 self:_connect(RunService.RenderStepped,function(dt)
  tick+=dt;if tick<.2 then return end;tick=0;self:_layout();self:_track()
 end)
 self.rewards=RewardView.new(self.context);self.rewards:mount(self)
 self:_layout()
end
function UIController:_layout()
 local camera=workspace.CurrentCamera;if not camera or not self.panel then return end
 local v=camera.ViewportSize;local l=UIModel.layout(v.X,v.Y,UserInputService.TouchEnabled)
 self.touchLayout=l.mobile
 self.panel.Size=UDim2.fromOffset(l.width,l.height);self.panel.AnchorPoint=Vector2.new(l.center and .5 or 1,0)
 self.panel.Position=l.center and UDim2.new(.5,0,0,l.top) or UDim2.new(1,-12,0,l.top)
 self.tracker.Size=UDim2.fromOffset(l.trackerWidth,l.trackerHeight)
 self.open.Position=UDim2.fromOffset(0,l.trackerHeight-l.openHeight-24);self.open.Size=UDim2.new(1,0,0,l.openHeight);self.open.TextSize=l.mobile and 16 or 15
 self.nav.Size=UDim2.fromOffset(l.trackerWidth,l.navHeight);self.nav.Position=UDim2.fromOffset(12,l.trackerHeight+14)
 self.close.Size=UDim2.fromOffset(l.closeSize,l.closeSize)
 self.heading.Size=UDim2.new(1,-(l.closeSize+32),0,44)
 self.primary.Size=UDim2.new(1,-28,0,l.primaryHeight);self.primary.Position=UDim2.new(0,14,1,-(l.primaryHeight+12))
 self.scroll.Size=UDim2.new(1,-28,1,-(l.primaryHeight+86));self.scroll.ScrollBarThickness=l.mobile and 7 or 5
 for _,b in ipairs(self.nav:GetChildren()) do if b:IsA("TextButton") then b.TextSize=l.mobile and 14 or 13 end end
 -- Keep exploration controls clear when a narrow portrait card is open.
 self.tracker.Visible=not (l.center and self.panel.Visible);self.nav.Visible=self.tracker.Visible
end
function UIController:_track()
 local m=self.state and self.state.mission;if not m then return end
 local world=workspace:FindFirstChild("LanternIslandWorld");local targetName=UIModel.target(m);local target=world and targetName and world:FindFirstChild(targetName)
 local root=self.context.player.Character and self.context.player.Character:FindFirstChild("HumanoidRootPart")
 local distance=root and target and math.floor((root.Position-target.Position).Magnitude) or nil
 self.trackerText.Text=m.title.."  "..(m.checkpointIndex or 1).."/"..(m.checkpointTotal or 4).."\n"..(m.status=="COMPLETED" and "Outfit earned! Dress Pip or explore." or ((distance and distance<=11) and "You're here! Open the clue." or "Follow your glow"..(distance and " - "..distance.." steps" or "")))
 if not self.highlight then local h=Instance.new("Highlight");h.Name="MyNextClue";h.FillColor=GOLD;h.OutlineColor=WHITE;h.FillTransparency=.55;h.DepthMode=Enum.HighlightDepthMode.AlwaysOnTop;h.Parent=self.gui;self.highlight=h end
 self.highlight.Adornee=target;self.highlight.Enabled=target~=nil and m.status~="COMPLETED"
 self.open.Text=m.status=="COMPLETED" and "See my reward" or (m.status=="BETWEEN" and "Pip's discovery" or "Open clue")
end
function UIController:_clear()
 for _,c in ipairs(self.contentConnections) do c:Disconnect() end;self.contentConnections={}
 for _,child in ipairs(self.scroll:GetChildren()) do if child~=self.contentLayout then child:Destroy() end end
 self.order=0;self.scroll.CanvasPosition=Vector2.zero
end
function UIController:_addText(name,value,size)
 self.order+=1;local t=text(self.scroll,name,value,size);t.LayoutOrder=self.order;return t
end
function UIController:_addButton(name,value,color,callback,enabled)
 self.order+=1;local b=button(self.scroll,name,value,color);b.LayoutOrder=self.order;b:SetAttribute("ActionEnabled",enabled~=false)
 if self.touchLayout then b.Size=UDim2.new(1,0,0,54);b.TextSize=18 end
 self:_connect(b.Activated,function() if b:GetAttribute("ActionEnabled") and not self.pending then callback() end end,true);return b
end
function UIController:_blocks(r)
 if type(r.tensA)~="number" then return end
 self:_addText("PlaceValue","Look at the tens and ones:",15)
 for i,pair in ipairs({{r.tensA,r.onesA},{r.tensB,r.onesB}}) do
  local frame=Instance.new("Frame");frame.Name="StoneGroups"..i;frame.Size=UDim2.new(1,0,0,54);frame.BackgroundColor3=MINT;frame.BackgroundTransparency=.45;self.order+=1;frame.LayoutOrder=self.order;frame.Parent=self.scroll;corner(frame,10)
  local t=text(frame,"GroupLabel",pair[1].." tens + "..pair[2].." ones",14);t.Position=UDim2.fromOffset(8,3)
  for j=1,pair[1] do local bar=Instance.new("Frame");bar.Size=UDim2.fromOffset(10,22);bar.Position=UDim2.fromOffset(10+(j-1)*15,26);bar.BackgroundColor3=DARK;bar.Parent=frame;corner(bar,3) end
  for j=1,pair[2] do local dot=Instance.new("Frame");dot.Size=UDim2.fromOffset(8,8);dot.Position=UDim2.fromOffset(88+(j-1)*12,33);dot.BackgroundColor3=DARK;dot.Parent=frame;corner(dot,5) end
 end
end
function UIController:_draw()
 if not self.panel or not self.state or not self.state.mission then return end
 self.panel.Visible=self.mode~=nil;self:_layout();self:_track();if not self.mode then return end
 self:_clear();self.primary.Text="Back to exploring"
 local state=self.state;local m=state.mission;local profile=state.profile
 if self.mode=="map" then
  self.heading.Text="Pick your adventure"
  self:_addText("Invitation","Pick a trail with Pip. Every solved clue changes the island, and completed adventures stay transformed.",17)
  local rewardNames={["firefly-scarf"]="Firefly Scarf",["rainbow-bow"]="Rainbow Bow",["moon-crown"]="Moon Crown"}
  for _,q in ipairs(UIModel.quests) do
   local owned=UIModel.owns(profile,q.reward);local color=q.id=="lantern-lift" and GOLD or (q.id=="ribbon-studio" and PINK or BLUE)
   local symbol=q.id=="lantern-lift" and "✦" or (q.id=="ribbon-studio" and "Aa" or "☾")
   local detail=owned and ("Restored ✓  •  Fresh practice available") or ("Earn "..(rewardNames[q.reward] or "an outfit").."  •  Change the island")
   local b=self:_addButton("Quest_"..q.id,symbol.."   "..q.title.."\n      "..q.subtitle.."  •  "..detail,color,function() self.mode=nil;self:_send("StartMission",{missionId=q.id});self:_draw() end)
   b.Size=UDim2.new(1,0,0,64);b.TextXAlignment=Enum.TextXAlignment.Left
   local inset=Instance.new("UIPadding");inset.PaddingLeft=UDim.new(0,14);inset.PaddingRight=UDim.new(0,10);inset.Parent=b
  end
 elseif self.mode=="wardrobe" then
  self.heading.Text="Pip's dress-up box"
  self:_addText("OutfitIntro","Your adventure rewards are free. Choose one for your very own Pip.",17)
  for _,item in ipairs(UIModel.items) do
   local owned=UIModel.owns(profile,item.id);local equipped=profile and profile.equippedItemId==item.id
   self:_addButton("Outfit_"..item.id,item.title..(equipped and "  [wearing]" or (owned and "  - Wear it!" or "\nEarn in "..item.quest)),owned and PINK or MINT,function() self:_send("EquipItem",{itemId=item.id}) end,owned and not equipped)
  end
 elseif self.mode=="journal" then
  self.heading.Text="Practice journal"
  self:_addText("Counts",(m.completedCount or 0).." clues solved\n"..(m.independentCount or 0).." first-try answers without hints\n"..(m.supportedCount or 0).." answers with help or retries\n"..(m.transferCount or 0).." new final clues solved first try",17)
  self:_addText("EvidenceLimit","These are practice results, not a mastery score. Replaying familiar clues does not add new learning credit.",16)
  self:_addText("Source",state.lesson and state.lesson.sourceLabel or "Original sample practice - not current homework",14)
  self:_addText("SaveState",UIModel.saveText(profile and profile.saveStatus),14)
 else
  self.heading.Text=m.title
  if m.practice then self:_addText("ReplayLabel","Practice replay - no extra stars or new learning credit",14) end
  if m.status=="ACTIVE" then
   self:_addText("Passage",m.passage or "",17);self:_addText("Question",m.prompt or "",20);self:_blocks(m.representation or {})
   if m.hint and m.hint~="" then self:_addText("PipHint","Pip's clue: "..m.hint,17) end
   for _,option in ipairs(m.options or {}) do self:_addButton("Answer_"..option.id,option.label,GOLD,function() self:_command(UIModel.answer(self.state,option.id)) end) end
   self.primary.Text=m.hint~="" and "Another clue, Pip" or "Help me, Pip"
  else
   self:_addText("Explanation",m.objective or "",18)
   if m.status=="COMPLETED" then
    self:_addText("RewardMessage",m.practice and "Great practicing! Your original rewards are safe." or "A new outfit is in your dress-up box.",17)
    self:_addButton("ReplayQuest","Practice this adventure again",MINT,function() self.mode=nil;self:_send("StartMission",{missionId=m.missionId});self:_draw() end)
   elseif m.status=="BETWEEN" then self:_addText("NextHint","Time to explore! Follow the next glowing marker.",17) end
   local command=UIModel.primary(state);self.primary.Text=command and command.label or "Continue"
  end
 end
 if self.rewards then self.rewards:decorate(self) end
 self:_pending()
end
function UIController:_pending()
 if not self.gui then return end
 for _,b in ipairs(self.scroll:GetChildren()) do if b:IsA("TextButton") then b.Active=not self.pending and b:GetAttribute("ActionEnabled")~=false;b.AutoButtonColor=b.Active;b.TextTransparency=b.Active and 0 or .35 end end
 self.primary.Active=not self.pending;self.primary.AutoButtonColor=not self.pending;self.open.Active=not self.pending
end
function UIController:render(state)
 local previous=self.state and self.state.mission;self.state=state;local m=state and state.mission
 if not self.welcomed and state and state.profileStatus=="LOADED" and m then
  self.welcomed=true
  local owned=state.profile and state.profile.ownedItemIds or {}
  if #owned==0 and (m.completedCount or 0)==0 and m.status=="AVAILABLE" then
   self.mode="map"
   task.delay(.2,function() if self.gui and self.mode=="map" then self:showToast("Pip found three glowing trails. Pick the one that looks fun!") end end)
  end
 end
 if m and (m.status=="ACTIVE" or m.status=="BETWEEN" or m.status=="COMPLETED") and (not previous or previous.status~=m.status or previous.missionId~=m.missionId or previous.activityId~=m.activityId) then self.mode="quest" end
 if m and m.status=="AVAILABLE" and self.mode=="quest" then self.mode=nil end
 self:_draw()
end
function UIController:showToast(message)
 if not self.toast then return end;self.toastSerial+=1;local serial=self.toastSerial;self.toast.Text=message;self.toast.Visible=true
 task.delay(3.2,function() if self.toast and self.toastSerial==serial then self.toast.Visible=false end end)
end
function UIController:destroy()
 if self.rewards then self.rewards:destroy() end
 for _,c in ipairs(self.connections) do c:Disconnect() end;for _,c in ipairs(self.contentConnections) do c:Disconnect() end
 if self.gui then self.gui:Destroy() end
end
return UIController