--!nonstrict
local Lighting=game:GetService("Lighting")
local TweenService=game:GetService("TweenService")
local WorldBuilder={}
WorldBuilder.__index=WorldBuilder
local C={grass=Color3.fromRGB(92,151,104),grass2=Color3.fromRGB(119,177,119),rock=Color3.fromRGB(91,104,104),path=Color3.fromRGB(228,210,171),wood=Color3.fromRGB(123,82,58),gold=Color3.fromRGB(255,204,92),glow=Color3.fromRGB(255,237,139),water=Color3.fromRGB(86,168,196)}
local function part(parent,name,size,cf,color,material,shape)
 local p=Instance.new("Part");p.Name=name;p.Anchored=true;p.CanCollide=true;p.Size=size;p.CFrame=cf;p.Color=color;p.Material=material or Enum.Material.SmoothPlastic
 if shape then p.Shape=shape end;p.TopSurface=Enum.SurfaceType.Smooth;p.BottomSurface=Enum.SurfaceType.Smooth;p.Parent=parent;return p
end
local function cyl(parent,name,r,h,pos,color,material)
 return part(parent,name,Vector3.new(h,r*2,r*2),CFrame.new(pos)*CFrame.Angles(0,0,math.rad(90)),color,material,Enum.PartType.Cylinder)
end
function WorldBuilder.new(context) return setmetatable({context=context,folder=nil,restored=false},WorldBuilder) end
function WorldBuilder:build()
 local old=workspace:FindFirstChild("LanternIslandWorld");if old then old:Destroy() end
 Lighting.Brightness=2.2;Lighting.ClockTime=16.9;Lighting.Ambient=Color3.fromRGB(105,120,132);Lighting.OutdoorAmbient=Color3.fromRGB(150,158,151)
 local atmosphere=Lighting:FindFirstChildOfClass("Atmosphere") or Instance.new("Atmosphere");atmosphere.Density=.22;atmosphere.Haze=1.2;atmosphere.Color=Color3.fromRGB(215,231,224);atmosphere.Parent=Lighting
 local f=Instance.new("Folder");f.Name="LanternIslandWorld";f.Parent=workspace;self.folder=f
 cyl(f,"IslandBase",46,8,Vector3.new(0,-5,0),C.rock,Enum.Material.Slate);cyl(f,"IslandGrass",43,4,Vector3.new(0,-1,0),C.grass,Enum.Material.Grass)
 for i=1,18 do local a=(i/18)*math.pi*2;local r=38+(i%3)*2;local s=cyl(f,"EdgeRock"..i,5+(i%2),4,Vector3.new(math.cos(a)*r,-2,math.sin(a)*r),i%2==0 and C.rock or Color3.fromRGB(111,122,116),Enum.Material.Slate);s.Orientation=Vector3.new(0,i*17,90) end
 cyl(f,"Pond",10,.7,Vector3.new(-22,.1,-10),C.water,Enum.Material.Glass).Transparency=.18
 for i=1,12 do cyl(f,"PathStone"..i,2.1,.35,Vector3.new(0,.25,15-(i-1)*2.5),C.path,Enum.Material.Sandstone) end
 cyl(f,"LanternHill",14,6,Vector3.new(0,1,-22),C.grass2,Enum.Material.Grass)
 part(f,"LiftBase",Vector3.new(10,1,10),CFrame.new(0,3,-14),C.wood,Enum.Material.WoodPlanks)
 local platform=part(f,"LiftPlatform",Vector3.new(8,.8,8),CFrame.new(0,4,-14),C.gold,Enum.Material.WoodPlanks);platform:SetAttribute("DownY",4);platform:SetAttribute("UpY",9)
 for _,x in ipairs({-4.5,4.5}) do part(f,"LiftPost",Vector3.new(.7,10,.7),CFrame.new(x,7,-14),C.wood,Enum.Material.Wood) end
 local console=part(f,"LiftConsole",Vector3.new(3,3,1.4),CFrame.new(6,4.5,-10),Color3.fromRGB(54,73,78),Enum.Material.Metal)
 local prompt=Instance.new("ProximityPrompt");prompt.ActionText="Repair lift";prompt.ObjectText="Lantern Lift";prompt.HoldDuration=0;prompt.MaxActivationDistance=10;prompt.RequiresLineOfSight=false;prompt.Parent=console
 part(f,"LanternPost",Vector3.new(1,10,1),CFrame.new(0,11,-27),C.wood,Enum.Material.Wood)
 local lantern=part(f,"LanternGlow",Vector3.new(3.5,4,3.5),CFrame.new(0,16,-27),Color3.fromRGB(120,126,117),Enum.Material.Glass);lantern.Transparency=.35;lantern.CanCollide=false
 local light=Instance.new("PointLight");light.Name="WarmLight";light.Enabled=false;light.Brightness=3;light.Range=28;light.Color=C.glow;light.Parent=lantern
 local pip=Instance.new("Model");pip.Name="Pip";pip.Parent=f
 local body=part(pip,"Body",Vector3.new(2.7,2.7,2.7),CFrame.new(6,2,-5),Color3.fromRGB(247,224,156),Enum.Material.SmoothPlastic,Enum.PartType.Ball);body.CanCollide=false
 local scarf=part(pip,"Scarf",Vector3.new(2.8,.45,2.8),CFrame.new(6,1.5,-5),Color3.fromRGB(221,91,92),Enum.Material.Fabric);scarf.CanCollide=false;scarf.Transparency=1
 local sign=part(f,"WelcomeSign",Vector3.new(13,5,.7),CFrame.new(-9,3,10)*CFrame.Angles(0,math.rad(-15),0),C.wood,Enum.Material.WoodPlanks)
 local gui=Instance.new("SurfaceGui");gui.Face=Enum.NormalId.Front;gui.Parent=sign
 local label=Instance.new("TextLabel");label.Size=UDim2.fromScale(1,1);label.BackgroundTransparency=1;label.Text="LANTERN ISLAND\nHelp Pip bring the lights back!";label.TextWrapped=true;label.Font=Enum.Font.GothamBold;label.TextColor3=Color3.fromRGB(255,246,214);label.TextScaled=true;label.Parent=gui
 return true
end
function WorldBuilder:setRestored(value)
 self.restored=value;if not self.folder then return end
 local lantern=self.folder:FindFirstChild("LanternGlow");local platform=self.folder:FindFirstChild("LiftPlatform")
 if lantern then lantern.Color=value and C.glow or Color3.fromRGB(120,126,117);local light=lantern:FindFirstChild("WarmLight");if light then light.Enabled=value end end
 if platform then TweenService:Create(platform,TweenInfo.new(1.2,Enum.EasingStyle.Back,Enum.EasingDirection.Out),{Position=Vector3.new(platform.Position.X,value and 9 or 4,platform.Position.Z)}):Play() end
end
function WorldBuilder:setEquipped(_player,itemId)
 if not self.folder then return end;local pip=self.folder:FindFirstChild("Pip");local scarf=pip and pip:FindFirstChild("Scarf");if scarf then scarf.Transparency=itemId=="firefly-scarf" and 0 or 1 end
end
function WorldBuilder:removePlayer(_player) end
return WorldBuilder