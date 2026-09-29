--!nonstrict
-- Client presentation only. No answers, rewards, profiles or server rules change here.
local Lighting=game:GetService("Lighting")
local FeedbackController={}
FeedbackController.__index=FeedbackController
function FeedbackController.new(context)
 local self=setmetatable({context=context,connections={},destroyed=false},FeedbackController)
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
  instance.Brightness=.85;instance.Range=18
 elseif instance:IsA("BillboardGui") then
  -- Distant station signs were covering the pet and the path across the island.
  local pet=instance.Parent and instance.Parent.Name=="Body"
  instance.MaxDistance=pet and 12 or 24
  instance.AlwaysOnTop=false
  if not pet then instance.Size=UDim2.fromOffset(154,42) end
 elseif instance:IsA("ProximityPrompt") and instance.Name=="PetPip" then
  instance.UIOffset=Vector2.new(0,64)
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
 if self.previousExposure~=nil and Lighting.ExposureCompensation==-.25 then Lighting.ExposureCompensation=self.previousExposure end
end
return FeedbackController
