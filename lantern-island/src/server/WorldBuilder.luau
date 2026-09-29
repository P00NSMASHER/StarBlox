--!nonstrict
-- Original toy island. No external meshes, image IDs, marketplace calls, or paid purchases.
local Lighting=game:GetService("Lighting")
local RunService=game:GetService("RunService")
local WorldBuilder={}
WorldBuilder.__index=WorldBuilder
local C={grass=Color3.fromRGB(123,181,140),rock=Color3.fromRGB(110,123,143),path=Color3.fromRGB(249,226,184),
 wood=Color3.fromRGB(145,99,87),gold=Color3.fromRGB(255,206,99),pink=Color3.fromRGB(244,144,187),
 blue=Color3.fromRGB(126,203,229),cream=Color3.fromRGB(255,242,212),mint=Color3.fromRGB(159,226,189)}
local STATIONS={
 ["lantern-lift"]={name="LiftConsole",pos=Vector3.new(7,3,-10),color=C.gold,label="LIGHT THE HILL\nFollow the golden path"},
 ["ribbon-studio"]={name="RibbonConsole",pos=Vector3.new(23,3,6),color=C.pink,label="PIP'S RIBBON STUDIO\nWord magic + a bow"},
 ["moon-picnic"]={name="PicnicConsole",pos=Vector3.new(-23,3,-6),color=C.blue,label="THE MISSING PICNIC\nFollow the reading clues"},
}
local function part(parent,name,size,position,color,shape,collide)
 local p=Instance.new("Part");p.Name=name;p.Anchored=true;p.CanCollide=collide~=false
 p.Size=size;p.Position=position;p.Color=color;p.Material=Enum.Material.SmoothPlastic
 p.TopSurface=Enum.SurfaceType.Smooth;p.BottomSurface=Enum.SurfaceType.Smooth
 if shape then p.Shape=shape end;p.Parent=parent;return p
end
local function disk(parent,name,radius,height,position,color)
 local p=part(parent,name,Vector3.new(height,radius*2,radius*2),position,color,Enum.PartType.Cylinder)
 p.Orientation=Vector3.new(0,0,90);return p
end
local function label(parent,text,width,height)
 local gui=Instance.new("BillboardGui");gui.Size=UDim2.fromOffset(width or 210,height or 70)
 gui.StudsOffset=Vector3.new(0,3.5,0);gui.AlwaysOnTop=true;gui.MaxDistance=110;gui.Parent=parent
 local t=Instance.new("TextLabel");t.BackgroundColor3=Color3.fromRGB(44,62,75);t.BackgroundTransparency=.15
 t.Size=UDim2.fromScale(1,1);t.Text=text;t.TextColor3=C.cream;t.TextSize=17;t.TextWrapped=true
 t.Font=Enum.Font.GothamBold;t.Parent=gui;Instance.new("UICorner",t).CornerRadius=UDim.new(0,14)
end
local function makePip(parent)
 local pip=Instance.new("Model");pip.Name="Pip";pip.Parent=parent
 local body=part(pip,"Body",Vector3.new(2.6,2.4,2.3),Vector3.new(0,0,0),C.cream,Enum.PartType.Ball,false)
 pip.PrimaryPart=body
 for _,x in ipairs({-.78,.78}) do
  local ear=part(pip,"Ear",Vector3.new(.7,1,.65),Vector3.new(x,1.08,0),C.cream,Enum.PartType.Ball,false)
  ear.Orientation=Vector3.new(0,0,x*22)
  part(pip,"Paw",Vector3.new(.7,.55,.85),Vector3.new(x,-.94,-.55),C.cream,Enum.PartType.Ball,false)
  part(pip,"Eye",Vector3.new(.29,.38,.16),Vector3.new(x*.65,.12,-1.07),Color3.fromRGB(44,47,68),Enum.PartType.Ball,false)
  part(pip,"EyeShine",Vector3.new(.09,.1,.08),Vector3.new(x*.65-.04,.21,-1.16),Color3.new(1,1,1),Enum.PartType.Ball,false)
 end
 part(pip,"Nose",Vector3.new(.24,.18,.15),Vector3.new(0,-.12,-1.17),C.pink,Enum.PartType.Ball,false)
 part(pip,"Tail",Vector3.new(.55,.6,1.4),Vector3.new(1,-.4,.9),C.cream,Enum.PartType.Ball,false)
 local scarf=part(pip,"firefly-scarf",Vector3.new(2.4,.36,2.25),Vector3.new(0,-.5,0),C.gold,nil,false);scarf.Transparency=1
 for _,x in ipairs({-.38,.38}) do
  local bow=part(pip,"rainbow-bow",Vector3.new(.85,.65,.35),Vector3.new(x,1.2,-.65),x<0 and C.pink or C.blue,Enum.PartType.Ball,false);bow.Transparency=1
 end
 for i=-1,1 do
  local crown=part(pip,"moon-crown",Vector3.new(.36,.68-math.abs(i)*.18,.4),Vector3.new(i*.45,1.4,-.15),C.gold,nil,false)
  crown.Orientation=Vector3.new(0,0,i*12);crown.Transparency=1
 end
 label(body,"Pip",75,27);return pip
end
function WorldBuilder.new(context) return setmetatable({context=context,restored={},companions={},stations={}},WorldBuilder) end
function WorldBuilder:build()
 local old=workspace:FindFirstChild("LanternIslandWorld");if old then old:Destroy() end
 local foundation=workspace:FindFirstChild("FoundationGround");if foundation then foundation.Transparency=1;foundation.CanCollide=false end
 Lighting.Brightness=2.3;Lighting.ClockTime=17.2;Lighting.Ambient=Color3.fromRGB(145,141,167);Lighting.OutdoorAmbient=Color3.fromRGB(170,171,175)
 local atmosphere=Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere")
 atmosphere.Density=.18;atmosphere.Color=Color3.fromRGB(229,221,242);atmosphere.Parent=Lighting
 local f=Instance.new("Folder");f.Name="LanternIslandWorld";f.Parent=workspace;self.folder=f
 disk(f,"IslandRock",45,8,Vector3.new(0,-5,0),C.rock)
 disk(f,"IslandGrass",43,4,Vector3.new(0,-1,0),C.grass)
 local pond=disk(f,"Pond",9,.2,Vector3.new(-23,1.12,-18),C.blue);pond.CanCollide=false
 for _,station in pairs(STATIONS) do
  for i=1,9 do
   local alpha=i/10;local position=Vector3.new(0,1.15,14):Lerp(Vector3.new(station.pos.X,1.15,station.pos.Z),alpha)
   disk(f,"PathStone",1.5,.2,position,C.path)
  end
 end
 for i=1,10 do
  local angle=i*math.pi/5;local x,z=math.cos(angle)*35,math.sin(angle)*35
  part(f,"TreeTrunk",Vector3.new(1.3,5,1.3),Vector3.new(x,3,z),C.wood)
  part(f,"TreeCanopy",Vector3.new(6,6,6),Vector3.new(x,7,z),i%2==0 and C.mint or C.pink,Enum.PartType.Ball)
 end
 disk(f,"LanternHill",11,5,Vector3.new(0,2.5,-25),C.mint)
 -- Walkable stairs supplement the lift; no player can become trapped on a moving platform.
 for i=1,8 do part(f,"HillStep",Vector3.new(6,.65,2.4),Vector3.new(-8,1+i*.5,-10-i*2),C.path) end
 part(f,"LiftPlatform",Vector3.new(7,.7,7),Vector3.new(1,1.5,-13),C.gold)
 local post=part(f,"LanternPost",Vector3.new(.9,6,.9),Vector3.new(0,8,-25),C.wood)
 local glow=part(f,"LanternGlow",Vector3.new(3,3.5,3),Vector3.new(0,12,-25),C.rock,nil,false)
 local light=Instance.new("PointLight");light.Name="WarmLight";light.Enabled=false;light.Range=32;light.Brightness=3;light.Color=C.gold;light.Parent=glow
 for mid,definition in pairs(STATIONS) do
  local console=part(f,definition.name,Vector3.new(3,3,1.5),definition.pos,definition.color)
  self.stations[mid]=console;label(console,definition.label)
  local prompt=Instance.new("ProximityPrompt");prompt.ActionText="Play adventure";prompt.ObjectText=definition.label:match("[^\n]+")
  prompt.HoldDuration=0;prompt.MaxActivationDistance=12;prompt.RequiresLineOfSight=false;prompt:SetAttribute("MissionId",mid);prompt.Parent=console
  for i=1,4 do
   local orb=part(f,mid.."-spark-"..i,Vector3.new(.9,.9,.9),definition.pos+Vector3.new((i-2.5)*1.25,2,0),C.rock,Enum.PartType.Ball,false)
   orb:SetAttribute("RestColor",definition.color)
  end
 end
 local lift=self.stations["lantern-lift"]
 local ride=Instance.new("ProximityPrompt");ride.Name="RideLift";ride.ActionText="Ride to lantern";ride.ObjectText="Repaired lift";ride.Enabled=false
 ride.HoldDuration=0;ride.MaxActivationDistance=10;ride.RequiresLineOfSight=false;ride.KeyboardKeyCode=Enum.KeyCode.R;ride.Parent=workspace.LanternIslandWorld.LiftPlatform;self.ride=ride
 ride.Triggered:Connect(function(player)
  local profile=self.context.services.ProfileService:get(player)
  if profile and profile.completions["lantern-lift"] and self:isNearMission(player,"lantern-lift") and player.Character then
   player.Character:PivotTo(CFrame.new(0,8,-22))
  end
 end)
 local picnic=Instance.new("Folder");picnic.Name="PicnicReward";picnic.Parent=f;self.picnic=picnic
 part(picnic,"Blanket",Vector3.new(9,.15,7),Vector3.new(-16,1.25,4),C.pink).Transparency=1
 for i=1,3 do part(picnic,"Cup",Vector3.new(.6,.8,.6),Vector3.new(-19+i*1.5,1.75,4),i%2==0 and C.blue or C.cream).Transparency=1 end
 self.template=makePip(nil)
 self.heartbeat=RunService.Heartbeat:Connect(function(dt)
  for player,pip in pairs(self.companions) do
   local character=player.Character;local root=character and character:FindFirstChild("HumanoidRootPart")
   if root and pip.Parent then
    if root.Position.Y < -16 then character:PivotTo(CFrame.new(0,6,14)) end
    local target=root.Position+root.CFrame.RightVector*3.3-root.CFrame.LookVector*1.7+Vector3.new(0,-.9+math.sin(os.clock()*2)*.12,0)
    local current=pip:GetPivot();local position=current.Position:Lerp(target,math.min(1,dt*5))
    local facing=Vector3.new(root.Position.X,position.Y,root.Position.Z)
    if (facing-position).Magnitude>.1 then pip:PivotTo(CFrame.lookAt(position,facing)) else pip:PivotTo(CFrame.new(position)) end
   end
  end
 end)
 return true
end
function WorldBuilder:isNearMission(player,mid)
 local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
 local station=self.stations[mid]
 return root~=nil and station~=nil and (root.Position-station.Position).Magnitude<=18
end
function WorldBuilder:onCheckpoint(_player,mid,index)
 local orb=self.folder and self.folder:FindFirstChild(mid.."-spark-"..index)
 if orb then orb.Color=orb:GetAttribute("RestColor");orb.Material=Enum.Material.Neon end
end
function WorldBuilder:restoreMission(mid)
 if self.restored[mid] then return end;self.restored[mid]=true
 if not self.folder then return end
 for i=1,4 do self:onCheckpoint(nil,mid,i) end
 if mid=="lantern-lift" then
  local glow=self.folder:FindFirstChild("LanternGlow");glow.Color=C.gold;glow.Material=Enum.Material.Neon;glow.WarmLight.Enabled=true;self.ride.Enabled=true
 elseif mid=="ribbon-studio" then
  for i=1,5 do local flag=part(self.folder,"FestivalRibbon",Vector3.new(.2,2.4,1.3),Vector3.new(25,6,1+i*2),i%2==0 and C.pink or C.blue,nil,false);flag.Orientation=Vector3.new(0,0,-25) end
 elseif mid=="moon-picnic" then for _,p in ipairs(self.picnic:GetChildren()) do p.Transparency=0 end end
end
function WorldBuilder:setRestored(value) if value then self:restoreMission("lantern-lift") end end
function WorldBuilder:setEquipped(player,itemId)
 if not self.folder or not self.template then return end
 local pip=self.companions[player]
 if not pip then
  pip=self.template:Clone();pip.Name="Pip_"..player.UserId;pip.Parent=self.folder
  local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
  pip:PivotTo(CFrame.new(root and root.Position+Vector3.new(3,0,0) or Vector3.new(3,3,14)));self.companions[player]=pip
 end
 for _,p in ipairs(pip:GetChildren()) do
  if p:IsA("BasePart") and (p.Name=="firefly-scarf" or p.Name=="rainbow-bow" or p.Name=="moon-crown") then p.Transparency=p.Name==itemId and 0 or 1 end
 end
end
function WorldBuilder:removePlayer(player)
 local pip=self.companions[player];if pip then pip:Destroy() end;self.companions[player]=nil
end
return WorldBuilder
