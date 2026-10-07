local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local FoundationConfig = require(highSchool:WaitForChild("FoundationConfig"))

local remotes = highSchool:FindFirstChild("DestinationRemotes")
if remotes then
    remotes:Destroy()
end
remotes = Instance.new("Folder")
remotes.Name = "DestinationRemotes"
remotes.Parent = highSchool

local destinationVisited = Instance.new("RemoteEvent")
destinationVisited.Name = "DestinationVisited"
destinationVisited.Parent = remotes

local campus = Workspace:WaitForChild(FoundationConfig.CAMPUS_NAME)
local registry = campus:WaitForChild("Locations")
local lastCheckInByUserId = {}
local CHECK_IN_COOLDOWN_SECONDS = 0.75
local MAX_CHECK_IN_DISTANCE = 14

local function checkIn(player, marker, location)
    local character = player.Character
    local root = character and character:FindFirstChild("HumanoidRootPart")
    if not root then
        return
    end

    if (root.Position - marker.Position).Magnitude > MAX_CHECK_IN_DISTANCE then
        return
    end

    local now = os.clock()
    local lastCheckIn = lastCheckInByUserId[player.UserId] or 0
    if now - lastCheckIn < CHECK_IN_COOLDOWN_SECONDS then
        return
    end
    lastCheckInByUserId[player.UserId] = now

    destinationVisited:FireClient(player, table.freeze({
        locationId = location.id,
        locationName = location.name,
        message = "Checked in at " .. location.name .. ". Keep exploring Pip High!",
    }))
end

for _, location in ipairs(FoundationConfig.LOCATIONS) do
    local marker = registry:WaitForChild(location.id)
    local existing = marker:FindFirstChild("DestinationPrompt")
    if existing then
        existing:Destroy()
    end

    local prompt = Instance.new("ProximityPrompt")
    prompt.Name = "DestinationPrompt"
    prompt.ActionText = "Check In"
    prompt.ObjectText = location.name
    prompt.HoldDuration = 0
    prompt.MaxActivationDistance = 12
    prompt.RequiresLineOfSight = false
    prompt.KeyboardKeyCode = Enum.KeyCode.E
    prompt.GamepadKeyCode = Enum.KeyCode.ButtonX
    prompt.Parent = marker

    prompt.Triggered:Connect(function(player)
        checkIn(player, marker, location)
    end)
end

Players.PlayerRemoving:Connect(function(player)
    lastCheckInByUserId[player.UserId] = nil
end)
