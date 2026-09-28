-- Minimal compatibility layer for the pinned Brookhaven baseline.
-- It does not create or restyle UI; it only reconnects the existing controls.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local main = playerGui:WaitForChild("MainGUIHandler")
local noReset = playerGui:WaitForChild("NoResetGUIHandler")
local buttons = main:WaitForChild("MainButtons"):WaitForChild("Buttons")

local panels = {
    main:FindFirstChild("MainVehicleMenu"),
    main:FindFirstChild("MainAnimationsMenu"),
    noReset:FindFirstChild("MainToolMenu"),
    main:FindFirstChild("MainAvatarMenu"),
    noReset:FindFirstChild("MainEditor"),
    main:FindFirstChild("MainHouseMenu"),
    main:FindFirstChild("MainNoHouseMenu"),
    main:FindFirstChild("MainMotelMenu"),
}

local function closePanels(except)
    for _, panel in ipairs(panels) do
        if panel and panel ~= except then
            panel.Visible = false
        end
    end
end

local function fitGrids(root)
    if not root then return end
    for _, node in ipairs(root:GetDescendants()) do
        if node:IsA("ScrollingFrame") then
            local grid = node:FindFirstChildOfClass("UIGridLayout")
            if grid then
                node.CanvasSize = UDim2.new(0, 0, 0, grid.AbsoluteContentSize.Y)
            end
        end
    end
end

local function toggle(panel)
    if not panel then return end
    local show = not panel.Visible
    closePanels(panel)
    panel.Visible = show
    if show then
        fitGrids(panel)
    end
end

local function getHouseStructure()
    local bag = player:FindFirstChild("PlayersBag")
    local value = bag and bag:FindFirstChild("PlayerHouseStructure")
    return value and tostring(value.Value) or "No House"
end

local function openHousePanel()
    local structure = getHouseStructure()
    if structure == "House" then
        toggle(main:FindFirstChild("MainHouseMenu"))
    elseif structure == "Motel" then
        toggle(main:FindFirstChild("MainMotelMenu"))
    else
        toggle(main:FindFirstChild("MainNoHouseMenu"))
    end
end

local targetByName = {
    Car = main:FindFirstChild("MainVehicleMenu"),
    Animation = main:FindFirstChild("MainAnimationsMenu"),
    BackPack = noReset:FindFirstChild("MainToolMenu"),
    Character = main:FindFirstChild("MainAvatarMenu"),
    AvatarEditor = noReset:FindFirstChild("MainEditor"),
}

for _, button in ipairs(buttons:GetChildren()) do
    if button:IsA("GuiButton") then
        button.Activated:Connect(function()
            if button.Name == "House" then
                openHousePanel()
            else
                local target = targetByName[button.Name]
                if target then
                    toggle(target)
                end
            end
        end)
    end
end

for _, panel in ipairs(panels) do
    if panel then
        for _, node in ipairs(panel:GetDescendants()) do
            if node:IsA("GuiButton") and node.Name == "Close" then
                node.Activated:Connect(function()
                    panel.Visible = false
                end)
            end
        end
    end
end

local remoteFolder = ReplicatedStorage:WaitForChild("RemoteEvents")
local compat = remoteFolder:WaitForChild("BrookhavenCompatHouse")

local function updateHouseKey(number)
    local keyGui = noReset:FindFirstChild("HouseKey")
    if not keyGui then return end
    local house = keyGui:FindFirstChild("House")
    if not house then return end
    local key = house:FindFirstChild("Key")
    if key then
        pcall(function() key.Text = "#" .. tostring(number) end)
        local value = key:FindFirstChild("HouseKeyNumber")
        if value and value:IsA("ValueBase") then
            value.Value = number
        end
    end
    local label = house:FindFirstChild("SettingsLabel")
    if label and label:IsA("TextLabel") then
        label.Text = "House Controls"
    end
    keyGui.Visible = true
end

compat.OnClientEvent:Connect(function(action, ...)
    local args = {...}
    if action == "Claimed" then
        updateHouseKey(args[1])
        closePanels(main:FindFirstChild("MainHouseMenu"))
        local menu = main:FindFirstChild("MainHouseMenu")
        if menu then
            menu.Visible = true
            fitGrids(menu)
        end
    elseif action == "Sold" then
        local keyGui = noReset:FindFirstChild("HouseKey")
        if keyGui then keyGui.Visible = false end
        closePanels(main:FindFirstChild("MainNoHouseMenu"))
        local menu = main:FindFirstChild("MainNoHouseMenu")
        if menu then menu.Visible = true end
    end
end)

local function bindNamedButtons(root, name, callback)
    if not root then return end
    for _, node in ipairs(root:GetDescendants()) do
        if node:IsA("GuiButton") and node.Name == name then
            node.Activated:Connect(callback)
        end
    end
end

bindNamedButtons(main:FindFirstChild("MainHouseMenu"), "LeaveHome", function()
    compat:FireServer("Sell")
end)
bindNamedButtons(main:FindFirstChild("MainMotelMenu"), "LeaveHome", function()
    compat:FireServer("Sell")
end)
bindNamedButtons(main:FindFirstChild("MainHouseMenu"), "TeleportHome", function()
    compat:FireServer("TeleportHome")
end)
bindNamedButtons(main:FindFirstChild("MainMotelMenu"), "TeleportHome", function()
    compat:FireServer("TeleportHome")
end)
bindNamedButtons(main:FindFirstChild("MainNoHouseMenu"), "CamOpen", function()
    compat:FireServer("TeleportToAvailableLot")
end)

print("BROOKHAVEN_COMPAT_CLIENT_READY")
