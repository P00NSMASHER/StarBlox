local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local template = ReplicatedStorage
    :WaitForChild("HighSchool")
    :WaitForChild("Mobile")
    :WaitForChild("SchoolClient")

local function install(player)
    local playerGui = player:WaitForChild("PlayerGui")
    local existing = playerGui:FindFirstChild(template.Name)
    if existing then
        existing:Destroy()
    end

    local clone = template:Clone()
    clone.Parent = playerGui
end

Players.PlayerAdded:Connect(install)

for _, player in ipairs(Players:GetPlayers()) do
    task.spawn(install, player)
end
