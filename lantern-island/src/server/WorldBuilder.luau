--!nonstrict
-- Original toy island and per-player pet. No marketplace assets or paid calls.
local Lighting=game:GetService("Lighting")
local RunService=game:GetService("RunService")
local WorldBuilder={};WorldBuilder.__index=WorldBuilder
local C={grass=Color3.fromRGB(123,181,140),rock=Color3.fromRGB(110,123,143),path=Color3.fromRGB(249,226,184),wood=Color3.fromRGB(145,99,87),gold=Color3.fromRGB(255,206,99),pink=Color3.fromRGB(244,144,187),blue=Color3.fromRGB(126,203,229),cream=Color3.fromRGB(255,242,212),mint=Color3.fromRGB(159,226,189)}
local STATIONS={
 ["lantern-lift"]={name="LiftConsole",pos=Vector3.new(7,3,-10),color=C.gold,label="LIGHT THE HILL",points={Vector3.new(7,3,-10),Vector3.new(-7,3,-11),Vector3.new(-8,6,-24),Vector3.new(0,7,-25)}},
 ["ribbon-studio"]={name="RibbonConsole",pos=Vector3.new(23,3,6),color=C.pink,label="PIP'S RIBBON STUDIO",points={Vector3.new(23,3,6),Vector3.new(29,3,0),Vector3.new(24,3,-9),Vector3.new(17,3,-2)}},
 ["moon-picnic"]={name="PicnicConsole",pos=Vector3.new(-23,3,-6),color=C.blue,label="THE MISSING PICNIC",points={Vector3.new(-23,3,-6),Vector3.new(-30,3,-14),Vector3.new(-18,3,-27),Vector3.new(-16,3,4)}},
}
local function part(parent,name,size,position,color,shape,collide)
 local p=Instance.new("Part");p.Name=name;p.Anchored=true;p.CanCollide=collide~=false;p.Size=size;p.Position=position;p.Color=color;p.Material=Enum.Material.SmoothPlastic
 p.TopSurface=Enum.SurfaceType.Smooth;p.BottomSurface=Enum.SurfaceType.Smooth;if shape then p.Shape=shape end;p.Parent=parent;return p
end
local function disk(parent,name,r,h,pos,color)
 local p=part(parent,name,Vector3.new(h,r*2,r*2),pos,color,Enum.PartType.Cylinder);p.Orientation=Vector3.new(0,0,90);return p
end
local function label(parent,text,width,height)
 local gui=Instance.new("BillboardGui");gui.Size=UDim2.fromOffset(width or 190,height or 50);gui.StudsOffset=Vector3.new(0,2.8,0);gui.AlwaysOnTop=true;gui.MaxDistance=65;gui.Parent=parent
 local t=Instance.new("TextLabel");t.BackgroundColor3=Color3.fromRGB(44,62,75);t.BackgroundTransparency=.15;t.Size=UDim2.fromScale(1,1);t.Text=text;t.TextColor3=C.cream;t.TextSize=16;t.TextWrapped=true;t.Font=Enum.Font.GothamBold;t.Parent=gui;Instance.new("UICorner",t).CornerRadius=UDim.new(0,12)
end

local function glowOrb(parent,name,position,color,size)
 local n=size or .8
 local orb=part(parent,name,Vector3.new(n,n,n),position,color,Enum.PartType.Ball,false)
 orb.Material=Enum.Material.Neon;orb.Transparency=.14
 local light=Instance.new("PointLight");light.Brightness=.25;light.Range=6;light.Color=color;light.Parent=orb
 return orb
end
local function milestoneFolder(root,mid,index)
 local name="Milestone_"..mid.."_"..index
 local existing=root:FindFirstChild(name);if existing then return existing,false end
 local folder=Instance.new("Folder");folder.Name=name;folder.Parent=root;return folder,true
end
local function makePip()

 local pip=Instance.new("Model");pip.Name="Pip"
 local body=part(pip,"Body",Vector3.new(2.6,2.4,2.3),Vector3.zero,C.cream,Enum.PartType.Ball,false);pip.PrimaryPart=body
 for _,x in ipairs({-.78,.78}) do
  local ear=part(pip,"Ear",Vector3.new(.7,1,.65),Vector3.new(x,1.08,0),C.cream,Enum.PartType.Ball,false);ear.Orientation=Vector3.new(0,0,x*22)
  part(pip,"Paw",Vector3.new(.7,.55,.85),Vector3.new(x,-.94,-.55),C.cream,Enum.PartType.Ball,false)
  part(pip,"Eye",Vector3.new(.29,.38,.16),Vector3.new(x*.65,.12,-1.07),Color3.fromRGB(44,47,68),Enum.PartType.Ball,false)
  part(pip,"EyeShine",Vector3.new(.09,.1,.08),Vector3.new(x*.65-.04,.21,-1.16),Color3.new(1,1,1),Enum.PartType.Ball,false)
 end
 part(pip,"Nose",Vector3.new(.24,.18,.15),Vector3.new(0,-.12,-1.17),C.pink,Enum.PartType.Ball,false)
 part(pip,"Tail",Vector3.new(.55,.6,1.4),Vector3.new(1,-.4,.9),C.cream,Enum.PartType.Ball,false)
 part(pip,"firefly-scarf",Vector3.new(2.4,.36,2.25),Vector3.new(0,-.5,0),C.gold,nil,false).Transparency=1
 for _,x in ipairs({-.38,.38}) do part(pip,"rainbow-bow",Vector3.new(.85,.65,.35),Vector3.new(x,1.2,-.65),x<0 and C.pink or C.blue,Enum.PartType.Ball,false).Transparency=1 end
 for i=-1,1 do local p=part(pip,"moon-crown",Vector3.new(.36,.68-math.abs(i)*.18,.4),Vector3.new(i*.45,1.4,-.15),C.gold,nil,false);p.Orientation=Vector3.new(0,0,i*12);p.Transparency=1 end
 local pet=Instance.new("ProximityPrompt");pet.Name="PetPip";pet.ActionText="Pet Pip";pet.ObjectText="Your adventure pal";pet.HoldDuration=0;pet.MaxActivationDistance=8;pet.RequiresLineOfSight=false;pet.KeyboardKeyCode=Enum.KeyCode.F;pet.Parent=body
 label(body,"Pip",65,25);return pip
end
function WorldBuilder.new(context) return setmetatable({context=context,restored={},companions={},stations={},petTimes={}},WorldBuilder) end
function WorldBuilder:build()
 local old=workspace:FindFirstChild("LanternIslandWorld");if old then old:Destroy() end
 local foundation=workspace:FindFirstChild("FoundationGround");if foundation then foundation.Transparency=1;foundation.CanCollide=false end
 Lighting.Brightness=2.3;Lighting.ClockTime=17.2;Lighting.Ambient=Color3.fromRGB(145,141,167);Lighting.OutdoorAmbient=Color3.fromRGB(170,171,175)
 local atmosphere=Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere");atmosphere.Density=.18;atmosphere.Color=Color3.fromRGB(229,221,242);atmosphere.Parent=Lighting
 local f=Instance.new("Folder");f.Name="LanternIslandWorld";f.Parent=workspace;self.folder=f
 disk(f,"IslandRock",45,8,Vector3.new(0,-5,0),C.rock);disk(f,"IslandGrass",43,4,Vector3.new(0,-1,0),C.grass)
 local pond=disk(f,"Pond",9,.2,Vector3.new(-23,1.12,-18),C.blue);pond.CanCollide=false
 local plaza=Instance.new("Folder");plaza.Name="PipsPlaza";plaza.Parent=f;self.plaza=plaza
 disk(plaza,"PlazaBase",7,.35,Vector3.new(0,1.05,14),C.cream)
 disk(plaza,"PlazaCenter",4.7,.16,Vector3.new(0,1.26,14),C.mint)
 local compass=glowOrb(plaza,"AdventureCompass",Vector3.new(0,3.1,14),C.gold,1.25);compass:SetAttribute("AmbientFloat",true);compass:SetAttribute("FloatBaseY",3.1);compass:SetAttribute("FloatPhase",0)
 for _,gate in ipairs({
  {name="GoldenTrail",pos=Vector3.new(5.5,2,9),color=C.gold},
  {name="RibbonTrail",pos=Vector3.new(7.4,2,17.5),color=C.pink},
  {name="MoonTrail",pos=Vector3.new(-7.4,2,17.5),color=C.blue},
 }) do
  local m=Instance.new("Model");m.Name=gate.name;m.Parent=plaza
  part(m,"Left",Vector3.new(.6,3,.6),gate.pos+Vector3.new(-1.4,0,0),gate.color,nil,false)
  part(m,"Right",Vector3.new(.6,3,.6),gate.pos+Vector3.new(1.4,0,0),gate.color,nil,false)
  local top=part(m,"Top",Vector3.new(3.4,.55,.6),gate.pos+Vector3.new(0,1.45,0),gate.color,nil,false)
 end
 local ambient=Instance.new("Folder");ambient.Name="AmbientFireflies";ambient.Parent=f
 for i=1,14 do
  local angle=i*2.399;local radius=16+(i%5)*4;local y=2.8+(i%4)*.65
  local color=i%3==0 and C.pink or (i%3==1 and C.gold or C.blue)
  local orb=glowOrb(ambient,"Firefly"..i,Vector3.new(math.cos(angle)*radius,y,math.sin(angle)*radius),color,.35)
  orb:SetAttribute("AmbientFloat",true);orb:SetAttribute("FloatBaseY",y);orb:SetAttribute("FloatPhase",i*.73)
 end
 for i=1,7 do
  local angle=i*.88;local pad=disk(f,"LilyPad"..i,1.1,.12,Vector3.new(-23+math.cos(angle)*5.3,1.25,-18+math.sin(angle)*5.3),i%2==0 and C.mint or C.grass);pad.CanCollide=false
 end
 for _,station in pairs(STATIONS) do for i=1,9 do
  local position=Vector3.new(0,1.15,14):Lerp(Vector3.new(station.pos.X,1.15,station.pos.Z),i/10)
  disk(f,"PathStone",1.4,.2,position,C.path)
 end end
 for i=1,10 do
  local angle=i*math.pi/5;local x,z=math.cos(angle)*35,math.sin(angle)*35
  part(f,"TreeTrunk",Vector3.new(1.3,5,1.3),Vector3.new(x,3,z),C.wood)
  part(f,"TreeCanopy",Vector3.new(6,6,6),Vector3.new(x,7,z),i%2==0 and C.mint or C.pink,Enum.PartType.Ball)
 end
 for i=1,36 do local a=i*2.4;local r=12+(i%6)*4;local p=part(f,"Flower",Vector3.new(.7,.4,.7),Vector3.new(math.cos(a)*r,1.3,math.sin(a)*r),i%2==0 and C.pink or C.gold,Enum.PartType.Ball,false) end
 disk(f,"LanternHill",11,5,Vector3.new(0,2.5,-25),C.mint)
 -- Wide low steps are the dependable route. A completed lift also offers a ride.
 for i=1,9 do part(f,"HillStep",Vector3.new(6,.65,2.8),Vector3.new(-8,1+i*.5,-8-i*1.9),C.path) end
 local platform=part(f,"LiftPlatform",Vector3.new(7,.7,7),Vector3.new(1,1.5,-13),C.gold)
 part(f,"LanternPost",Vector3.new(.9,6,.9),Vector3.new(0,8,-25),C.wood)
 local glow=part(f,"LanternGlow",Vector3.new(3,3.5,3),Vector3.new(0,12,-25),C.rock,nil,false)
 local light=Instance.new("PointLight");light.Name="WarmLight";light.Enabled=false;light.Range=32;light.Brightness=3;light.Color=C.gold;light.Parent=glow
 for mid,d in pairs(STATIONS) do
  for i,pos in ipairs(d.points) do
   local console=part(f,i==1 and d.name or (mid.."-checkpoint-"..i),Vector3.new(i==1 and 3 or 1.5,2,1.5),pos,d.color,nil,false)
   console:SetAttribute("MissionId",mid);console:SetAttribute("CheckpointIndex",i)
   if i==1 then self.stations[mid]=console;label(console,d.label) end
   local orb=part(f,mid.."-spark-"..i,Vector3.new(.9,.9,.9),pos+Vector3.new(0,1.65,0),C.rock,Enum.PartType.Ball,false);orb:SetAttribute("RestColor",d.color)
   local prompt=Instance.new("ProximityPrompt");prompt.ActionText="Open clue "..i;prompt.ObjectText=d.label;prompt.HoldDuration=0;prompt.MaxActivationDistance=9;prompt.RequiresLineOfSight=false;prompt:SetAttribute("MissionId",mid);prompt:SetAttribute("CheckpointIndex",i);prompt.Parent=console
  end
 end
 local ride=Instance.new("ProximityPrompt");ride.Name="RideLift";ride.ActionText="Ride to lantern";ride.ObjectText="Repaired lift";ride.Enabled=false;ride.HoldDuration=0;ride.MaxActivationDistance=9;ride.RequiresLineOfSight=false;ride.KeyboardKeyCode=Enum.KeyCode.R;ride.Parent=platform;self.ride=ride
 ride.Triggered:Connect(function(player)
  local p=self.context.services.ProfileService:get(player);local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
  if p and p.completions["lantern-lift"] and root and (root.Position-platform.Position).Magnitude<=12 then player.Character:PivotTo(CFrame.new(0,8,-22)) end
 end)
 local picnic=Instance.new("Folder");picnic.Name="PicnicReward";picnic.Parent=f;self.picnic=picnic
 part(picnic,"Blanket",Vector3.new(9,.15,7),Vector3.new(-16,1.25,4),C.pink).Transparency=1
 for i=1,3 do part(picnic,"Cup",Vector3.new(.6,.8,.6),Vector3.new(-19+i*1.5,1.75,4),i%2==0 and C.blue or C.cream,nil,false).Transparency=1 end
 self.template=makePip()
 self.heartbeat=RunService.Heartbeat:Connect(function(dt)
  for player,pip in pairs(self.companions) do
   local character=player.Character;local root=character and character:FindFirstChild("HumanoidRootPart")
   if root and pip.Parent then
    if root.Position.Y < -16 then character:PivotTo(CFrame.new(0,6,14)) end
    local happy=(self.petTimes[player] or 0)>os.clock()
    local bob=happy and math.abs(math.sin(os.clock()*9))*.8 or math.sin(os.clock()*2)*.12
    local target=root.Position+root.CFrame.RightVector*3.3-root.CFrame.LookVector*1.7+Vector3.new(0,-.9+bob,0)
    local position=pip:GetPivot().Position:Lerp(target,math.min(1,dt*5));local facing=Vector3.new(root.Position.X,position.Y,root.Position.Z)
    pip:PivotTo((facing-position).Magnitude>.1 and CFrame.lookAt(position,facing) or CFrame.new(position))
   end
  end
 end)
 return true
end
function WorldBuilder:isNearMission(player,mid,index)
 local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart");local d=STATIONS[mid];local target=d and d.points[math.clamp(index or 1,1,4)]
 return root~=nil and target~=nil and (root.Position-target).Magnitude<=12
end
function WorldBuilder:onCheckpoint(_player,mid,index)
 local orb=self.folder and self.folder:FindFirstChild(mid.."-spark-"..index)
 if orb then orb.Color=orb:GetAttribute("RestColor");orb.Material=Enum.Material.Neon end
 self:revealMilestone(mid,index)
end
function WorldBuilder:revealMilestone(mid,index)
 if not self.folder then return end
 local d=STATIONS[mid];if not d or not d.points[index] then return end
 local folder,created=milestoneFolder(self.folder,mid,index);if not created then return end
 local pos=d.points[index]
 if mid=="lantern-lift" then
  local pole=part(folder,"GlowPost",Vector3.new(.35,2.6,.35),pos+Vector3.new(2.2,1.1,0),C.wood,nil,false)
  glowOrb(folder,"WarmOrb",pole.Position+Vector3.new(0,1.55,0),C.gold,.7)
  for j=1,3 do glowOrb(folder,"Firefly"..j,pos+Vector3.new(1+j*.55,1.2+j*.3,(j-2)*.55),C.gold,.22) end
 elseif mid=="ribbon-studio" then
  part(folder,"RibbonPostL",Vector3.new(.28,2.5,.28),pos+Vector3.new(-1.4,1,1.4),C.wood,nil,false)
  part(folder,"RibbonPostR",Vector3.new(.28,2.5,.28),pos+Vector3.new(1.4,1,1.4),C.wood,nil,false)
  local ribbon=part(folder,"Ribbon",Vector3.new(3.1,.36,.18),pos+Vector3.new(0,2.15,1.4),index%2==0 and C.blue or C.pink,nil,false)
  glowOrb(folder,"RibbonSpark",ribbon.Position+Vector3.new(0,.55,0),index%2==0 and C.pink or C.blue,.28)
 elseif mid=="moon-picnic" then
  local pad=disk(folder,"MoonPad",1.4,.12,pos+Vector3.new(1.8,-1.68,1.2),index%2==0 and C.mint or C.blue);pad.CanCollide=false
  local stem=part(folder,"MoonStem",Vector3.new(.28,1.1,.28),pos+Vector3.new(-1.7,-.8,1),C.cream,nil,false)
  glowOrb(folder,"MoonBloom",stem.Position+Vector3.new(0,.7,0),index%2==0 and C.blue or C.pink,.65)
 end
 folder:SetAttribute("Revealed",true)
end
function WorldBuilder:restoreMission(mid)
 if self.restored[mid] or not self.folder then return end;self.restored[mid]=true
 for i=1,4 do self:onCheckpoint(nil,mid,i) end
 if mid=="lantern-lift" then local glow=self.folder:FindFirstChild("LanternGlow");glow.Color=C.gold;glow.Material=Enum.Material.Neon;glow.WarmLight.Enabled=true;self.ride.Enabled=true
 elseif mid=="ribbon-studio" then for i=1,5 do local flag=part(self.folder,"FestivalRibbon",Vector3.new(.2,2.4,1.3),Vector3.new(25,6,1+i*2),i%2==0 and C.pink or C.blue,nil,false);flag.Orientation=Vector3.new(0,0,-25) end
 elseif mid=="moon-picnic" then for _,p in ipairs(self.picnic:GetChildren()) do p.Transparency=0 end end
end
function WorldBuilder:setRestored(value) if value then self:restoreMission("lantern-lift") end end
function WorldBuilder:setEquipped(player,itemId)
 if not self.folder or not self.template then return end
 local pip=self.companions[player]
 if not pip then
  pip=self.template:Clone();pip.Name="Pip_"..player.UserId;pip:SetAttribute("OwnerUserId",player.UserId);pip.Parent=self.folder
  local root=player.Character and player.Character:FindFirstChild("HumanoidRootPart")
  pip:PivotTo(CFrame.new(root and root.Position+Vector3.new(3,0,0) or Vector3.new(3,3,14)));self.companions[player]=pip
  pip.Body.PetPip.Triggered:Connect(function(visitor)
   local r=visitor.Character and visitor.Character:FindFirstChild("HumanoidRootPart")
   if visitor==player and r and (r.Position-pip:GetPivot().Position).Magnitude<=10 then self.petTimes[player]=os.clock()+2 end
  end)
 end
 for _,p in ipairs(pip:GetChildren()) do if p:IsA("BasePart") and (p.Name=="firefly-scarf" or p.Name=="rainbow-bow" or p.Name=="moon-crown") then p.Transparency=p.Name==itemId and 0 or 1 end end
 self:updateCollection(player)
end
function WorldBuilder:updateCollection(player)
 local pip=self.companions[player];if not pip then return end
 local profile=self.context.services.ProfileService:get(player);if not profile then return end
 local owned={};for _,id in ipairs(profile.ownedItemIds or {}) do owned[id]=true end
 local unlocked=owned["firefly-scarf"] and owned["rainbow-bow"] and owned["moon-crown"] or false
 pip:SetAttribute("StarlightTrailUnlocked",unlocked)
 if unlocked and self.folder and not self.folder:FindFirstChild("StarlightGarden") then
  local garden=Instance.new("Folder");garden.Name="StarlightGarden";garden.Parent=self.folder
  local ring=disk(garden,"GardenRing",6,.16,Vector3.new(0,1.42,14),C.cream);ring.CanCollide=false
  for i=1,10 do
   local angle=i*math.pi/5;local color=i%3==0 and C.blue or (i%3==1 and C.gold or C.pink)
   local bloom=glowOrb(garden,"StarBloom"..i,Vector3.new(math.cos(angle)*4.8,1.8,14+math.sin(angle)*4.8),color,.42)
   bloom:SetAttribute("AmbientFloat",true);bloom:SetAttribute("FloatBaseY",1.8);bloom:SetAttribute("FloatPhase",i*.51)
  end
  local star=glowOrb(garden,"CollectionStar",Vector3.new(0,4.2,14),C.gold,1.5)
  star:SetAttribute("AmbientFloat",true);star:SetAttribute("FloatBaseY",4.2);star:SetAttribute("FloatPhase",1.3)
  garden:SetAttribute("CollectionComplete",true)
 end
 local body=pip:FindFirstChild("Body");if not body then return end
 local trail=body:FindFirstChild("StarlightTrail")
 if not trail and unlocked then
  local top=Instance.new("Attachment");top.Name="StarlightTop";top.Position=Vector3.new(0,.4,1.05);top.Parent=body
  local bottom=Instance.new("Attachment");bottom.Name="StarlightBottom";bottom.Position=Vector3.new(0,-.35,1.05);bottom.Parent=body
  trail=Instance.new("Trail");trail.Name="StarlightTrail";trail.Attachment0=top;trail.Attachment1=bottom;trail.Lifetime=.65;trail.MinLength=.06;trail.FaceCamera=true
  trail.Color=ColorSequence.new({ColorSequenceKeypoint.new(0,C.gold),ColorSequenceKeypoint.new(.5,C.pink),ColorSequenceKeypoint.new(1,C.blue)})
  trail.Transparency=NumberSequence.new({NumberSequenceKeypoint.new(0,.18),NumberSequenceKeypoint.new(1,1)})
  trail.WidthScale=NumberSequence.new({NumberSequenceKeypoint.new(0,.8),NumberSequenceKeypoint.new(1,0)});trail.Parent=body
 end
 if trail then trail.Enabled=unlocked end
end
function WorldBuilder:celebrateReward(player,_itemId)
 local profile=self.context.services.ProfileService:get(player);if not profile then return end
 self:setEquipped(player,profile.equippedItemId)
 self.petTimes[player]=os.clock()+1.8
end
function WorldBuilder:removePlayer(player)
 local pip=self.companions[player];if pip then pip:Destroy() end;self.companions[player]=nil;self.petTimes[player]=nil
end
return WorldBuilder

[executed on device: PAAM-L044 (c83a6c06-c0d3-4127-84de-311c7c6f1364)]