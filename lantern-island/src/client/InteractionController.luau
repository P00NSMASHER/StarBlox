--!strict
local InteractionController={}
InteractionController.__index=InteractionController
function InteractionController.new(context:any) return setmetatable({context=context,connections={}},InteractionController) end
function InteractionController:mount(_playerGui:PlayerGui)
 task.spawn(function()
  local world=workspace:WaitForChild("LanternIslandWorld",10)
  local console=world and world:FindFirstChild("LiftConsole")
  local prompt=console and console:FindFirstChildOfClass("ProximityPrompt")
  if prompt then table.insert(self.connections,prompt.Triggered:Connect(function(player)
   if player==self.context.player then self.context.send("StartMission",{missionId="lantern-lift"}) end
  end)) end
 end)
end
function InteractionController:destroy() for _,c in ipairs(self.connections) do c:Disconnect() end;self.connections={} end
return InteractionController