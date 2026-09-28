--!nonstrict
local TweenService=game:GetService("TweenService")
local UIController={}
UIController.__index=UIController
local BG=Color3.fromRGB(27,49,55)
local CREAM=Color3.fromRGB(255,247,220)
local GOLD=Color3.fromRGB(255,199,84)
local GREEN=Color3.fromRGB(88,169,116)
local RED=Color3.fromRGB(223,108,98)
local function round(gui,r) local c=Instance.new("UICorner");c.CornerRadius=UDim.new(0,r or 16);c.Parent=gui end
local function stroke(gui,color,t) local s=Instance.new("UIStroke");s.Color=color;s.Thickness=t or 2;s.Transparency=.25;s.Parent=gui end
local function button(parent,text)
 local b=Instance.new("TextButton");b.AutoButtonColor=false;b.BackgroundColor3=GOLD;b.TextColor3=BG;b.Font=Enum.Font.GothamBold;b.TextSize=18;b.Text=text;b.Size=UDim2.new(1,0,0,52);b.Parent=parent;round(b,14)
 return b
end
function UIController.new(context)
 local self=setmetatable({context=context,connections={},state=nil},UIController)
 return self
end
function UIController:mount(playerGui)
 local gui=Instance.new("ScreenGui");gui.Name="LanternIslandUI";gui.ResetOnSpawn=false;gui.IgnoreGuiInset=false;gui.Parent=playerGui;self.gui=gui
 local top=Instance.new("Frame");top.AnchorPoint=Vector2.new(.5,0);top.Position=UDim2.fromScale(.5,.025);top.Size=UDim2.new(.92,0,0,64);top.BackgroundColor3=BG;top.BackgroundTransparency=.08;top.Parent=gui;round(top,18);stroke(top,Color3.fromRGB(255,255,255),1)
 local title=Instance.new("TextLabel");title.BackgroundTransparency=1;title.Position=UDim2.fromOffset(18,0);title.Size=UDim2.new(1,-130,1,0);title.Font=Enum.Font.GothamBold;title.TextSize=22;title.TextColor3=CREAM;title.TextXAlignment=Enum.TextXAlignment.Left;title.Text="Lantern Island";title.Parent=top;self.title=title
 local coins=Instance.new("TextLabel");coins.AnchorPoint=Vector2.new(1,.5);coins.Position=UDim2.new(1,-14,.5,0);coins.Size=UDim2.fromOffset(96,38);coins.BackgroundColor3=Color3.fromRGB(58,82,82);coins.TextColor3=CREAM;coins.Font=Enum.Font.GothamBold;coins.TextSize=16;coins.Text="✦ 0";coins.Parent=top;round(coins,12);self.coins=coins
 local card=Instance.new("Frame");card.AnchorPoint=Vector2.new(.5,1);card.Position=UDim2.new(.5,0,1,-22);card.Size=UDim2.new(.92,0,0,330);card.BackgroundColor3=CREAM;card.Parent=gui;round(card,24);stroke(card,Color3.fromRGB(73,96,91),2);self.card=card
 local pad=Instance.new("UIPadding");pad.PaddingTop=UDim.new(0,18);pad.PaddingBottom=UDim.new(0,18);pad.PaddingLeft=UDim.new(0,18);pad.PaddingRight=UDim.new(0,18);pad.Parent=card
 local layout=Instance.new("UIListLayout");layout.Padding=UDim.new(0,10);layout.SortOrder=Enum.SortOrder.LayoutOrder;layout.Parent=card
 local eyebrow=Instance.new("TextLabel");eyebrow.LayoutOrder=1;eyebrow.Size=UDim2.new(1,0,0,22);eyebrow.BackgroundTransparency=1;eyebrow.Font=Enum.Font.GothamBold;eyebrow.TextSize=13;eyebrow.TextColor3=Color3.fromRGB(87,122,102);eyebrow.TextXAlignment=Enum.TextXAlignment.Left;eyebrow.Text="PIP'S MISSION";eyebrow.Parent=card
 local heading=Instance.new("TextLabel");heading.LayoutOrder=2;heading.Size=UDim2.new(1,0,0,34);heading.BackgroundTransparency=1;heading.Font=Enum.Font.GothamBold;heading.TextSize=25;heading.TextColor3=BG;heading.TextXAlignment=Enum.TextXAlignment.Left;heading.Parent=card;self.heading=heading
 local body=Instance.new("TextLabel");body.LayoutOrder=3;body.Size=UDim2.new(1,0,0,55);body.BackgroundTransparency=1;body.Font=Enum.Font.GothamMedium;body.TextSize=17;body.TextWrapped=true;body.TextColor3=Color3.fromRGB(66,78,76);body.TextXAlignment=Enum.TextXAlignment.Left;body.TextYAlignment=Enum.TextYAlignment.Top;body.Parent=card;self.body=body
 local answer=Instance.new("Frame");answer.LayoutOrder=4;answer.Size=UDim2.new(1,0,0,110);answer.BackgroundTransparency=1;answer.Parent=card;self.answer=answer
 local grid=Instance.new("UIGridLayout");grid.CellPadding=UDim2.fromOffset(10,10);grid.CellSize=UDim2.new(.5,-5,.5,-5);grid.Parent=answer
 self.answers={}
 for _,value in ipairs({42,41,32,52}) do local b=button(answer,tostring(value));b.BackgroundColor3=Color3.fromRGB(240,222,167);b:SetAttribute("Answer",value);table.insert(self.answers,b) end
 local primary=button(card,"Start adventure");primary.LayoutOrder=5;self.primary=primary
 local secondary=button(card,"Need a hint");secondary.LayoutOrder=6;secondary.BackgroundColor3=Color3.fromRGB(219,230,214);secondary.Size=UDim2.new(1,0,0,44);secondary.TextSize=16;self.secondary=secondary
 local toast=Instance.new("TextLabel");toast.AnchorPoint=Vector2.new(.5,1);toast.Position=UDim2.new(.5,0,0,-10);toast.Size=UDim2.new(.9,0,0,48);toast.BackgroundColor3=BG;toast.TextColor3=CREAM;toast.Font=Enum.Font.GothamBold;toast.TextSize=16;toast.TextWrapped=true;toast.Text="";toast.Visible=false;toast.Parent=card;round(toast,14);self.toast=toast
 local function sendAnswer(value) local s=self.state;if s and s.mission then self.context.send("SubmitAnswer",{missionId=s.mission.missionId,payload={activityId=s.mission.activityId,contentVersion=s.mission.contentVersion,answer=value}}) end end
 for _,b in ipairs(self.answers) do table.insert(self.connections,b.Activated:Connect(function() sendAnswer(b:GetAttribute("Answer")) end)) end
 table.insert(self.connections,primary.Activated:Connect(function()
  local s=self.state;if not s or not s.mission then return end
  if s.mission.status=="AVAILABLE" then self.context.send("StartMission",{missionId=s.mission.missionId})
  elseif s.mission.status=="COMPLETED" then self.context.send("EquipItem",{itemId="firefly-scarf"}) end
 end))
 table.insert(self.connections,secondary.Activated:Connect(function() local s=self.state;if s and s.mission then self.context.send("RequestHint",{missionId=s.mission.missionId}) end end))
 table.insert(self.connections,self.context.resultReceived:Connect(function(result)
  local messages={TRY_AGAIN="Almost! Look at the tens and ones and try again.",MISSION_COMPLETE="You did it! The hilltop lantern is glowing again.",ITEM_EQUIPPED="Pip loves the Firefly Scarf!",HINT_READY="Hint unlocked below."}
  if messages[result.code] then self:showToast(messages[result.code],result.code=="TRY_AGAIN" and RED or GREEN) end
 end))
end
function UIController:showToast(text,color)
 if not self.toast then return end;self.toast.Text=text;self.toast.BackgroundColor3=color;self.toast.Visible=true;self.toast.TextTransparency=0
 task.delay(2.6,function() if self.toast and self.toast.Text==text then TweenService:Create(self.toast,TweenInfo.new(.25),{TextTransparency=1,BackgroundTransparency=1}):Play();task.wait(.26);if self.toast then self.toast.Visible=false;self.toast.BackgroundTransparency=0 end end end)
end
local function owns(profile,id) if not profile or type(profile.ownedItemIds)~="table" then return false end;for _,x in ipairs(profile.ownedItemIds) do if x==id then return true end end;return false end
function UIController:render(state)
 self.state=state;if not self.gui or not state.mission then return end
 self.coins.Text="✦ "..tostring(state.profile and state.profile.currency or 0)
 local m=state.mission;self.heading.Text=m.title or "Lantern Island";self.answer.Visible=false;self.secondary.Visible=false;self.primary.Visible=true
 if m.status=="AVAILABLE" then self.body.Text=(m.objective or "").."\nWalk to the lift console or tap below.";self.primary.Text="Fix the lift"
 elseif m.status=="ACTIVE" then
  self.body.Text=(m.prompt or "Solve the puzzle")..(m.hint~="" and "\nHint: "..m.hint or "")
  self.answer.Visible=true;self.secondary.Visible=m.hint=="";self.primary.Visible=false
 elseif m.status=="COMPLETED" then
  local equipped=state.profile and state.profile.equippedItemId=="firefly-scarf"
  self.body.Text=equipped and "The lantern is back and Pip is wearing the scarf you earned." or "The lantern is back! You earned Pip's Firefly Scarf."
  self.primary.Text=equipped and "Scarf equipped ✓" or (owns(state.profile,"firefly-scarf") and "Put scarf on Pip" or "Reward earned")
  self.primary.Active=not equipped
 end
end
function UIController:destroy() for _,c in ipairs(self.connections) do c:Disconnect() end;if self.gui then self.gui:Destroy() end end
return UIController