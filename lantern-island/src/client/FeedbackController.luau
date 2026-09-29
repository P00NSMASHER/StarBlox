--!nonstrict
-- Client presentation only. No answers, rewards, profiles or server rules change here.
local Lighting=game:GetService("Lighting")
local RunService=game:GetService("RunService")
local GuiService=game:GetService("GuiService")
local FeedbackController={}
FeedbackController.__index=FeedbackController
function FeedbackController.new(context)
 local self=setmetatable({context=context,connections={},destroyed=false,ambient={},ambientSet={}},FeedbackController)
 table.insert(self.connections,context.resultReceived:Connect(function(result)
  if result.code=="MISSION_COMPLETE" then
   local cam=workspace.CurrentCamera
   if cam then
    local original=cam.FieldOfView;cam.FieldOfView=original-3
    task.delay(.18,function() if not self.destroyed and cam.Parent then cam.FieldOfView=original end end)
   end
  end
 end))
 return self
end
function FeedbackController:_present(instance)
 if instance:IsA("PointLight") and instance.Name=="WarmLight" then
  instance.Brightness=.65;instance.Range=16
 elseif instance:IsA("BillboardGui") then
  -- Distant station signs were covering the pet and the path across the island.
  local pet=instance.Parent and instance.Parent.Name=="Body"
  instance.MaxDistance=pet and 12 or 24
  instance.AlwaysOnTop=false
  if not pet then instance.Size=UDim2.fromOffset(154,42) end
 elseif instance:IsA("ProximityPrompt") and instance.Name=="PetPip" then
  instance.UIOffset=Vector2.new(0,64)
 elseif instance:IsA("BasePart") and instance:GetAttribute("AmbientFloat")==true and not self.ambientSet[instance] then
  self.ambientSet[instance]=true;table.insert(self.ambient,instance)
 end
end
function FeedbackController:_prompts(state)
 local mission=state and state.mission
 if not mission or not self.world then return end
 for _,p in ipairs(self.world:GetDescendants()) do
  if p:IsA("ProximityPrompt") then
   local mid=p:GetAttribute("MissionId")
   if type(mid)=="string" then
    local index=p:GetAttribute("CheckpointIndex")
    p.Enabled=mission.status~="ACTIVE" and (
     (mid==mission.missionId and mission.status~="COMPLETED" and index==mission.checkpointIndex)
     or (mid~=mission.missionId and index==1))
   elseif p.Name=="PetPip" then
    local owner=p.Parent and p.Parent.Parent and p.Parent.Parent:GetAttribute("OwnerUserId")
    p.Enabled=owner==self.context.player.UserId and mission.status~="ACTIVE"
   end
  end
 end
end
function FeedbackController:mount(_playerGui)
 self.previousExposure=Lighting.ExposureCompensation
 Lighting.ExposureCompensation=-.25
 self.bloom=Instance.new("BloomEffect");self.bloom.Name="LanternClientBloom";self.bloom.Intensity=.08;self.bloom.Size=14;self.bloom.Threshold=1.85;self.bloom.Parent=Lighting
 self.color=Instance.new("ColorCorrectionEffect");self.color.Name="LanternClientColor";self.color.Saturation=.06;self.color.Contrast=.025;self.color.Brightness=.01;self.color.Parent=Lighting
 self.sun=Instance.new("SunRaysEffect");self.sun.Name="LanternClientSun";self.sun.Intensity=.03;self.sun.Spread=.7;self.sun.Parent=Lighting
 local reduced=false;pcall(function() reduced=GuiService.ReducedMotionEnabled==true end)
 if not reduced then
  table.insert(self.connections,RunService.RenderStepped:Connect(function()
   local now=os.clock()
   for i=#self.ambient,1,-1 do
    local p=self.ambient[i]
    if not p.Parent then self.ambientSet[p]=nil;table.remove(self.ambient,i)
    else
     local baseY=p:GetAttribute("FloatBaseY");local phase=p:GetAttribute("FloatPhase") or 0
     if type(baseY)=="number" then
      p.Position=Vector3.new(p.Position.X,baseY+math.sin(now*1.25+phase)*.32,p.Position.Z)
      p.Transparency=.08+(.5+.5*math.sin(now*1.7+phase))*.16
     end
    end
   end
  end))
 end
 task.spawn(function()
  local world=workspace:WaitForChild("LanternIslandWorld",10)
  if not world or self.destroyed then return end
  self.world=world
  for _,instance in ipairs(world:GetDescendants()) do self:_present(instance) end
  table.insert(self.connections,world.DescendantAdded:Connect(function(instance)
   self:_present(instance)
   if instance:IsA("ProximityPrompt") then self:_prompts(self.context.getState()) end
  end))
  table.insert(self.connections,self.context.stateChanged:Connect(function(state) self:_prompts(state) end))
  self:_prompts(self.context.getState())
 end)
end
function FeedbackController:destroy()
 self.destroyed=true
 for _,c in ipairs(self.connections) do c:Disconnect() end
 if self.bloom then self.bloom:Destroy() end;if self.color then self.color:Destroy() end;if self.sun then self.sun:Destroy() end
 if self.previousExposure~=nil and Lighting.ExposureCompensation==-.25 then Lighting.ExposureCompensation=self.previousExposure end
end
return FeedbackController