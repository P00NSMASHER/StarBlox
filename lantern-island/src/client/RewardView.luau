--!nonstrict
-- Reward presentation is cosmetic. It never sends a grant or edits a profile.
local TweenService=game:GetService("TweenService")
local GuiService=game:GetService("GuiService")
local Journey=require(script.Parent:WaitForChild("RewardJourney"))
local View={};View.__index=View
local INK=Color3.fromRGB(43,53,78)
local GOLD=Color3.fromRGB(255,214,123)
local CREAM=Color3.fromRGB(255,250,244)
local function round(parent,r) Instance.new("UICorner",parent).CornerRadius=UDim.new(0,r) end
local function reducedMotion()
 local ok,value=pcall(function() return GuiService.ReducedMotionEnabled end)
 return ok and value==true
end
function View.new(context)
 return setmetatable({context=context,observer=Journey.newObserver(),connections={},tweens={},destroyed=false,serial=0},View)
end
function View:mount(ui)
 self.ui=ui
 local rail=Instance.new("Frame");rail.Name="RewardProgress";rail.BackgroundTransparency=1;rail.Position=UDim2.fromOffset(0,72);rail.Size=UDim2.new(1,0,0,24);rail.Parent=ui.tracker;self.rail=rail
 local label=Instance.new("TextLabel");label.Name="NextReward";label.Position=UDim2.fromOffset(67,0);label.Size=UDim2.new(1,-67,1,0);label.BackgroundTransparency=1;label.TextColor3=CREAM;label.Font=Enum.Font.GothamMedium;label.TextSize=12;label.TextXAlignment=Enum.TextXAlignment.Left;label.TextWrapped=true;label.Parent=rail;self.label=label
 self.glows={}
 for i=1,4 do local glow=Instance.new("Frame");glow.Name="Glow"..i;glow.Position=UDim2.fromOffset((i-1)*15,7);glow.Size=UDim2.fromOffset(10,10);glow.Rotation=45;glow.BackgroundColor3=GOLD;glow.BackgroundTransparency=.8;glow.BorderSizePixel=0;glow.Parent=rail;round(glow,3);table.insert(self.glows,glow) end
 local effects=Instance.new("Frame");effects.Name="RewardEffects";effects.Size=UDim2.fromScale(1,1);effects.BackgroundTransparency=1;effects.Active=false;effects.ZIndex=20;effects.Parent=ui.gui;self.effects=effects
 local banner=Instance.new("TextLabel");banner.Name="RewardCelebration";banner.AnchorPoint=Vector2.new(.5,0);banner.Position=UDim2.new(.5,0,0,68);banner.Size=UDim2.new(.84,0,0,60);banner.BackgroundColor3=INK;banner.TextColor3=CREAM;banner.TextWrapped=true;banner.Font=Enum.Font.GothamBold;banner.TextSize=17;banner.ZIndex=22;banner.Visible=false;banner.Active=false;banner.Parent=effects;round(banner,16);self.banner=banner
 table.insert(self.connections,self.context.stateChanged:Connect(function(state) self:_state(state) end))
 -- Prime from the actual loaded snapshot; never replay old unlocks on join.
 self:_state(self.context.getState())
end
function View:_state(state)
 if self.destroyed or not state or not state.mission then return end
 self:updateProgress(state)
 local events=self.observer:observe(state)
 if #events==0 then return end
 local last=events[#events]
 if last.kind=="collection" then self:celebrate("The whole collection is yours!\nPip's Starlight Trail is unlocked.",true)
 elseif last.kind=="unlock" then
  local item=Journey.item(last.itemId);self:celebrate(item.title.." unlocked!\n"..item.message,true)
 elseif last.kind=="checkpoint" then
  local messages={["firefly-scarf"]="The hill glows brighter!",["rainbow-bow"]="The ribbon studio is coming alive!",["moon-crown"]="The picnic trail is waking up!"}
  self:celebrate((messages[last.itemId] or "The island changed!").."\n"..last.solved.." of 4 clues restored.",false)
 end
end
function View:updateProgress(state)
 local progress=Journey.progress(state.mission,state.profile)
 local count=progress.owned and not progress.practice and 4 or progress.solved
 self.rail:SetAttribute("Solved",count);self.rail:SetAttribute("RewardId",progress.itemId or "")
 self.label.Text=progress.practice and (progress.solved.."/4  Practice - outfit yours") or (progress.owned and (progress.title.." - yours!") or (progress.solved.."/4  "..progress.title))
 for i,glow in ipairs(self.glows) do glow.BackgroundTransparency=i<=count and 0 or .8 end
end
function View:celebrate(message,big)
 if self.destroyed then return end
 self.serial+=1;local serial=self.serial
 self.banner.Text=message;self.banner.Visible=true;self.banner:SetAttribute("CelebrationCount",(self.banner:GetAttribute("CelebrationCount") or 0)+1)
 for _,tween in ipairs(self.tweens) do tween:Cancel() end;self.tweens={}
 for _,child in ipairs(self.effects:GetChildren()) do if child~=self.banner then child:Destroy() end end
 if not reducedMotion() then
  for i=1,(big and 14 or 6) do
   local particle=Instance.new("Frame");particle.Name="RewardSpark";particle.Size=UDim2.fromOffset(big and 9 or 6,big and 9 or 6);particle.AnchorPoint=Vector2.new(.5,.5);particle.Position=UDim2.new(.5,0,0,112);particle.Rotation=45;particle.BorderSizePixel=0;particle.BackgroundColor3=i%2==0 and GOLD or Color3.fromRGB(244,163,205);particle.Active=false;particle.ZIndex=21;particle.Parent=self.effects;round(particle,2)
   local angle=i*2.399;local target=UDim2.new(.5,math.cos(angle)*(big and 145 or 85),0,112+math.sin(angle)*65+50)
   local tween=TweenService:Create(particle,TweenInfo.new(.8,Enum.EasingStyle.Quad,Enum.EasingDirection.Out),{Position=target,BackgroundTransparency=1,Rotation=110+i*17});table.insert(self.tweens,tween);tween:Play()
  end
 end
 task.delay(big and 3.5 or 1.8,function()
  if self.destroyed or self.serial~=serial then return end
  self.banner.Visible=false
  for _,child in ipairs(self.effects:GetChildren()) do if child~=self.banner then child:Destroy() end end
  self.tweens={}
 end)
end
function View:_preview(ui,itemId)
 local source=workspace:FindFirstChild("LanternIslandWorld")
 source=source and source:FindFirstChild("Pip_"..self.context.player.UserId)
 if not source then return end -- Text reward and equip still work if pet replication is late.
 local viewport=Instance.new("ViewportFrame");viewport.Name="RewardPreview";viewport.Size=UDim2.new(1,0,0,154);viewport.LayoutOrder=-5;viewport.BackgroundColor3=Color3.fromRGB(231,225,247);viewport.Ambient=Color3.fromRGB(225,225,240);viewport.LightColor=Color3.new(1,1,1);viewport.LightDirection=Vector3.new(-1,-1,-2);viewport.Active=false;viewport.Parent=ui.scroll;round(viewport,16)
 local model=source:Clone();model.Name="PreviewPip"
 for _,inst in ipairs(model:GetDescendants()) do
  if inst:IsA("LuaSourceContainer") or inst:IsA("ProximityPrompt") or inst:IsA("BillboardGui") or inst:IsA("Trail") or inst:IsA("ParticleEmitter") then inst:Destroy()
  elseif inst:IsA("BasePart") then inst.Anchored=true;inst.CanCollide=false;if Journey.item(inst.Name) then inst.Transparency=inst.Name==itemId and 0 or 1 end end
 end
 model.Parent=viewport;model:PivotTo(CFrame.Angles(0,math.rad(-18),0))
 local camera=Instance.new("Camera");camera.FieldOfView=33;camera.CFrame=CFrame.lookAt(Vector3.new(0,1,-8.2),Vector3.new(0,.2,0));camera.Parent=viewport;viewport.CurrentCamera=camera
 viewport:SetAttribute("ItemId",itemId or "")
end
function View:decorate(ui)
 if self.destroyed or not ui.state or not ui.state.mission then return end
 local state=ui.state;local m=state.mission;local collection=Journey.collection(state.profile)
 self:updateProgress(state)
 if ui.mode=="quest" and m.status=="COMPLETED" then
  local item=Journey.item(m.rewardItemId)
  if item and collection.owned[item.id] then
   local title=ui:_addText("RewardRevealTitle",m.practice and ("Your "..item.title) or (item.title.." is yours!"),21);title.LayoutOrder=-6;title.Font=Enum.Font.GothamBold
   self:_preview(ui,item.id)
   ui:_addText("RewardCollectionGoal",collection.bonusUnlocked and "Collection complete! Pip leaves a Starlight Trail when moving.\nTake a little victory walk together." or (collection.count.."/3 outfits collected. Collect all three to unlock Pip's Starlight Trail."),16)
   if state.profile.saveStatus~="SAVED" and state.profile.saveStatus~="LOADED" then
    ui:_addText("RewardSaveScope",state.profile.saveStatus=="STUDIO_SESSION_ONLY" and "Studio practice: your collection lasts while this test server stays open." or "Reward earned in this session; saving is not confirmed yet.",13)
   end
  end
 elseif ui.mode=="wardrobe" then
  local itemId=state.profile and state.profile.equippedItemId
  if Journey.item(itemId) then self:_preview(ui,itemId) end
  local t=ui:_addText("CollectionProgress",collection.count.." / 3 outfits in your collection",18);t.LayoutOrder=-6;t.Font=Enum.Font.GothamBold
  ui:_addText("CollectionBonus",collection.bonusUnlocked and "BONUS UNLOCKED: Starlight Trail\nPip's trail comes with the whole collection. No extra coins or purchases." or "Your collection bonus: Pip's Starlight Trail.\nEarn all three outfits. Hints are always welcome and never reduce your prize.",16)
 elseif ui.mode=="map" then
  local restored=collection.count.." / 3 adventures restored"
  ui:_addText("IslandRestoration",restored,18).Font=Enum.Font.GothamBold
  ui:_addText("AdventureRewardGoal",collection.bonusUnlocked and "The Starlight Garden is awake! Replay any trail for fresh practice questions." or "Four clues transform a trail and earn its outfit. Restore all three to wake the Starlight Garden. Take breaks whenever you like.",16)
 end
end
function View:destroy()
 self.destroyed=true
 for _,c in ipairs(self.connections) do c:Disconnect() end
 for _,t in ipairs(self.tweens) do t:Cancel() end
 self.connections={};self.tweens={}
 if self.effects then self.effects:Destroy() end
 if self.rail then self.rail:Destroy() end
end
return View