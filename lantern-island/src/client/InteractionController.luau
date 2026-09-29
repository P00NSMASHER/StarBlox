--!nonstrict
local ProximityPromptService=game:GetService("ProximityPromptService")
local InteractionController={}
InteractionController.__index=InteractionController
function InteractionController.new(context) return setmetatable({context=context,connections={}},InteractionController) end
function InteractionController:mount(_playerGui)
 -- One subscription also covers prompts replicated after the controller mounts.
 table.insert(self.connections,ProximityPromptService.PromptTriggered:Connect(function(prompt,player)
  if player~=self.context.player then return end
  local world=workspace:FindFirstChild("LanternIslandWorld")
  if not world or not prompt:IsDescendantOf(world) then return end
  local mid=prompt:GetAttribute("MissionId")
  if type(mid)=="string" then self.context.send("StartMission",{missionId=mid}) end
 end))
end
function InteractionController:destroy() for _,c in ipairs(self.connections) do c:Disconnect() end;self.connections={} end
return InteractionController
