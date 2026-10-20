local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local mobile = ReplicatedStorage
    :WaitForChild("HighSchool")
    :WaitForChild("Mobile")

local templates = table.freeze({
    mobile:WaitForChild("SchoolClient"),
    mobile:WaitForChild("DestinationFeedback"),
})

local function install(player)
    local playerGui = player:WaitForChild("PlayerGui")

    for _, template in ipairs(templates) do
        local existing = playerGui:FindFirstChild(template.Name)
        if existing then
            existing:Destroy()
        end

        local clone = template:Clone()
        clone.Parent = playerGui
    end
end

Players.PlayerAdded:Connect(install)

for _, player in ipairs(Players:GetPlayers()) do
    task.spawn(install, player)
end
