--!nonstrict
-- Client-only exploration toy. Nothing here can award currency, learning credit,
-- entitlement, or persistent progress.
local RunService=game:GetService("RunService")
local TweenService=game:GetService("TweenService")
local Model=require(script.Parent:WaitForChild("SessionCollectiblesModel"))

local Controller={}
Controller.__index=Controller

local COLORS={
 gold=Color3.fromRGB(255,214,123),
 pink=Color3.fromRGB(246,180,207),
 blue=Color3.fromRGB(177,220,239),
}
local DARK=Color3.fromRGB(43,53,78)
local CREAM=Color3.fromRGB(255,250,244)

function Controller.new(context)
 return setmetatable({
  context=context,connections={},caught={},active={},count=0,messageSerial=0,
  folder=nil,gui=nil,label=nil,
 },Controller)
end

function Controller:_connect(signal,callback)
 local c=signal:Connect(callback);table.insert(self.connections,c);return c
end

function Controller:_setHud(message)
 if not self.label then return end
 local progress=Model.progress(self.count)
 self.label.Text="✦ Fireflies  "..progress.caught.."/"..progress.total
 if message and message~="" then self.label.Text=self.label.Text.."\n"..message end
end

function Controller:_showMessage(message)
 self.messageSerial+=1
 local serial=self.messageSerial
 self:_setHud(message)
 task.delay(1.8,function()
  if self.label and self.messageSerial==serial then self:_setHud(nil) end
 end)
end

function Controller:_collect(id,part,prompt)
 if self.caught[id] then return end
 self.caught[id]=true
 self.count+=1
 prompt.Enabled=false
 self:_showMessage(Model.message(self.count))
 local light=part:FindFirstChildOfClass("PointLight")
 local tween=TweenService:Create(
  part,
  TweenInfo.new(.28,Enum.EasingStyle.Back,Enum.EasingDirection.In),
  {Size=Vector3.new(1.25,1.25,1.25),Transparency=1}
 )
 tween:Play()
 if light then TweenService:Create(light,TweenInfo.new(.22),{Brightness=0,Range=0}):Play() end
 task.delay(.32,function()
  self.active[id]=nil
  if part.Parent then part:Destroy() end
 end)
end

function Controller:_makeHud(playerGui)
 local gui=Instance.new("ScreenGui");gui.Name="LanternFireflyHUD";gui.ResetOnSpawn=false
 gui.IgnoreGuiInset=false;gui.DisplayOrder=4;gui.Parent=playerGui;self.gui=gui
 local label=Instance.new("TextLabel");label.Name="FireflyCounter";label.AnchorPoint=Vector2.new(0,1)
 label.Position=UDim2.new(0,12,1,-14);label.Size=UDim2.fromOffset(210,54)
 label.BackgroundColor3=DARK;label.BackgroundTransparency=.08;label.BorderSizePixel=0
 label.TextColor3=CREAM;label.Font=Enum.Font.GothamBold;label.TextSize=15
 label.TextWrapped=true;label.TextXAlignment=Enum.TextXAlignment.Left
 label.Parent=gui
 local corner=Instance.new("UICorner");corner.CornerRadius=UDim.new(0,15);corner.Parent=label
 local stroke=Instance.new("UIStroke");stroke.Color=CREAM;stroke.Transparency=.72;stroke.Thickness=1;stroke.Parent=label
 local pad=Instance.new("UIPadding");pad.PaddingLeft=UDim.new(0,12);pad.PaddingRight=UDim.new(0,8);pad.Parent=label
 self.label=label;self:_setHud(nil)
end

function Controller:_spawnFireflies(world)
 local folder=Instance.new("Folder");folder.Name="LocalFireflies_"..self.context.player.UserId
 folder.Parent=world;self.folder=folder
 for index,point in ipairs(Model.points()) do
  local orb=Instance.new("Part");orb.Name="Firefly_"..point.id;orb.Anchored=true
  orb.CanCollide=false;orb.CanTouch=false;orb.CastShadow=false
  orb.Shape=Enum.PartType.Ball;orb.Size=Vector3.new(.58,.58,.58)
  orb.Material=Enum.Material.Neon;orb.Color=COLORS[point.color] or COLORS.gold
  local base=Vector3.new(point.x,point.y,point.z);orb.Position=base
  orb:SetAttribute("FireflyId",point.id);orb:SetAttribute("Trail",point.trail);orb.Parent=folder
  local light=Instance.new("PointLight");light.Color=orb.Color;light.Brightness=.7;light.Range=7;light.Parent=orb
  local prompt=Instance.new("ProximityPrompt");prompt.Name="CatchFirefly";prompt.ActionText="Catch firefly"
  prompt.ObjectText="Pip's sparkle";prompt.HoldDuration=0;prompt.MaxActivationDistance=9
  prompt.RequiresLineOfSight=false;prompt.KeyboardKeyCode=Enum.KeyCode.F
  prompt.GamepadKeyCode=Enum.KeyCode.ButtonX;prompt.Parent=orb
  self.active[point.id]={part=orb,base=base,phase=index*.77}
  self:_connect(prompt.Triggered,function(triggeringPlayer)
   if triggeringPlayer and triggeringPlayer~=self.context.player then return end
   self:_collect(point.id,orb,prompt)
  end)
 end
end

function Controller:mount(playerGui)
 local world=workspace:FindFirstChild("LanternIslandWorld") or workspace:WaitForChild("LanternIslandWorld",10)
 if not world then return end
 self:_makeHud(playerGui)
 self:_spawnFireflies(world)
 self:_connect(RunService.RenderStepped,function()
  local now=os.clock()
  for id,item in pairs(self.active) do
   local part=item.part
   if not part.Parent then self.active[id]=nil
   elseif not self.caught[id] then
    local dy=math.sin(now*1.8+item.phase)*.28
    part.Position=item.base+Vector3.new(0,dy,0)
   end
  end
 end)
end

function Controller:destroy()
 for _,c in ipairs(self.connections) do c:Disconnect() end
 self.connections={}
 if self.folder then self.folder:Destroy();self.folder=nil end
 if self.gui then self.gui:Destroy();self.gui=nil end
 self.label=nil;self.active={};self.caught={}
end

return Controller