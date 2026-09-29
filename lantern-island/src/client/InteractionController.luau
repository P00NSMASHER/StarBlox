--!nonstrict
local ProximityPromptService=game:GetService("ProximityPromptService")
local InteractionController={};InteractionController.__index=InteractionController
function InteractionController.new(context) return setmetatable({context=context,connections={}},InteractionController) end
function InteractionController:mount(_playerGui)
 table.insert(self.connections,ProximityPromptService.PromptTriggered:Connect(function(prompt,player)
  if player~=self.context.player then return end
  local world=workspace:FindFirstChild("LanternIslandWorld")
  if not world or not prompt:IsDescendantOf(world) then return end
  local mid=prompt:GetAttribute("MissionId");if type(mid)=="string" then self.context.send("StartMission",{missionId=mid}) end
 end))
 table.insert(self.connections,ProximityPromptService.PromptShown:Connect(function(prompt)
  local mid=prompt:GetAttribute("MissionId");local owner=prompt.Parent and prompt.Parent.Parent and prompt.Parent.Parent:GetAttribute("OwnerUserId")
  if owner and owner~=self.context.player.UserId then prompt.Enabled=false end
  if type(mid)~="string" then return end
  local state=self.context.getState();local m=state and state.mission
  if m and m.missionId==mid and prompt:GetAttribute("CheckpointIndex")~=m.checkpointIndex then prompt.ActionText="Follow your next glow" end
 end))
end
function InteractionController:destroy() for _,c in ipairs(self.connections) do c:Disconnect() end;self.connections={} end
return InteractionController
