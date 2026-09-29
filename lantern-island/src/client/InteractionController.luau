--!nonstrict
local ProximityPromptService=game:GetService("ProximityPromptService")
local StarterGui=game:GetService("StarterGui")
local InteractionController={};InteractionController.__index=InteractionController
function InteractionController.new(context)
 return setmetatable({context=context,connections={},coreGuiStates={}},InteractionController)
end
function InteractionController:mount(_playerGui)
 -- This adventure has no chat or leaderboard gameplay. Their default overlays
 -- cover the small-screen map and close button. Keep Roblox's menu/reporting,
 -- movement, jump, health and other platform controls unchanged.
 for _,kind in ipairs({Enum.CoreGuiType.Chat,Enum.CoreGuiType.PlayerList}) do
  local readOk,previous=pcall(function() return StarterGui:GetCoreGuiEnabled(kind) end)
  if readOk then
   local changed=pcall(function() StarterGui:SetCoreGuiEnabled(kind,false) end)
   if changed then self.coreGuiStates[kind]=previous else warn("LANTERN_OVERLAY_LAYOUT_UNCONFIRMED") end
  end
 end
 table.insert(self.connections,ProximityPromptService.PromptTriggered:Connect(function(prompt,player)
  if player~=self.context.player then return end
  local world=workspace:FindFirstChild("LanternIslandWorld")
  if not world or not prompt:IsDescendantOf(world) then return end
  local mid=prompt:GetAttribute("MissionId");if type(mid)=="string" then self.context.send("StartMission",{missionId=mid}) end
 end))
 table.insert(self.connections,ProximityPromptService.PromptShown:Connect(function(prompt)
  local mid=prompt:GetAttribute("MissionId")
  local owner=prompt.Parent and prompt.Parent.Parent and prompt.Parent.Parent:GetAttribute("OwnerUserId")
  if owner and owner~=self.context.player.UserId then prompt.Enabled=false end
  if type(mid)~="string" then return end
  local state=self.context.getState();local m=state and state.mission
  local index=prompt:GetAttribute("CheckpointIndex")
  prompt.ActionText=(m and m.missionId==mid and index~=m.checkpointIndex)
   and "Follow your next glow" or ("Open clue "..tostring(index or 1))
 end))
end
function InteractionController:destroy()
 for _,c in ipairs(self.connections) do c:Disconnect() end;self.connections={}
 for kind,previous in pairs(self.coreGuiStates) do
  pcall(function() StarterGui:SetCoreGuiEnabled(kind,previous) end)
 end
 self.coreGuiStates={}
end
return InteractionController
