-- Minimal house authority for the pinned Brookhaven baseline.
-- Uses the existing Brookhaven lots, house models and UI/remotes.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local remoteFolder = ReplicatedStorage:WaitForChild("RemoteEvents")
local compat = remoteFolder:FindFirstChild("BrookhavenCompatHouse")
if not compat then
    compat = Instance.new("RemoteEvent")
    compat.Name = "BrookhavenCompatHouse"
    compat.Parent = remoteFolder
end

local playerHouseChoice = remoteFolder:FindFirstChild("PlayerHouseChoice")
local playersHouse = remoteFolder:FindFirstChild("PlayersHouse")

local lotsRoot = Workspace:WaitForChild("001_Lots")
local ownerByLot = {}
local lotByPlayer = {}
local claimableLots = {}

local function ensureValue(parent, className, name, default)
    local value = parent:FindFirstChild(name)
    if not value then
        value = Instance.new(className)
        value.Name = name
        value.Value = default
        value.Parent = parent
    end
    return value
end

local function ensureBag(player)
    local bag = player:FindFirstChild("PlayersBag")
    if not bag then
        local startup = ReplicatedStorage:FindFirstChild("PlayersStartup")
        local template = startup and startup:FindFirstChild("PlayersBag")
        if template then
            bag = template:Clone()
        else
            bag = Instance.new("Model")
            bag.Name = "PlayersBag"
        end
        bag.Parent = player
    end

    ensureValue(bag, "BoolValue", "HouseOwn", false)
    ensureValue(bag, "NumberValue", "HouseNumber", 0)
    ensureValue(bag, "StringValue", "PlayerHouseStructure", "No House")
    ensureValue(bag, "BoolValue", "HouseBuilt", false)
    return bag
end

local function buyPart(lot)
    local direct = lot:FindFirstChild("BuyHouse")
    if direct and direct:IsA("BasePart") then return direct end
    local nested = lot:FindFirstChild("BuyHouse", true)
    if nested and nested:IsA("BasePart") then return nested end
    return nil
end

local function lotType(lot)
    local buy = buyPart(lot)
    local plot = buy and buy:FindFirstChild("PlotOfLand")
    if plot and plot:IsA("StringValue") and plot.Value ~= "" then
        return plot.Value
    end
    return "House"
end

local function houseNumber(lot, fallback)
    local buy = buyPart(lot)
    if buy then
        for _, name in ipairs({"HouseNumber", "Number"}) do
            local value = buy:FindFirstChild(name)
            if value and (value:IsA("IntValue") or value:IsA("NumberValue")) then
                return math.floor(value.Value)
            end
        end
    end
    return fallback
end

local function setBag(player, structure, number, owned)
    local bag = ensureBag(player)
    bag.HouseOwn.Value = owned
    bag.HouseNumber.Value = number
    bag.PlayerHouseStructure.Value = structure
    bag.HouseBuilt.Value = owned
end

local function release(player)
    local old = lotByPlayer[player]
    if old then
        ownerByLot[old] = nil
        lotByPlayer[player] = nil
    end
    setBag(player, "No House", 0, false)
    player:SetAttribute("BrookhavenCompatLot", nil)
    compat:FireClient(player, "Sold")
end

local function claim(player, lot, index)
    local currentOwner = ownerByLot[lot]
    if currentOwner and currentOwner ~= player then
        compat:FireClient(player, "Occupied")
        return
    end

    local previous = lotByPlayer[player]
    if previous and previous ~= lot then
        ownerByLot[previous] = nil
    end

    ownerByLot[lot] = player
    lotByPlayer[player] = lot

    local structure = lotType(lot)
    if structure ~= "Motel" then structure = "House" end
    local number = houseNumber(lot, index)
    setBag(player, structure, number, true)
    player:SetAttribute("BrookhavenCompatLot", index)
    compat:FireClient(player, "Claimed", number, structure, lot.Name)
end

local function teleportToLot(player, lot)
    local character = player.Character
    local root = character and character:FindFirstChild("HumanoidRootPart")
    local buy = buyPart(lot)
    if root and buy then
        character:PivotTo(buy.CFrame * CFrame.new(0, 4, -8))
    end
end

for _, lot in ipairs(lotsRoot:GetChildren()) do
    local buy = buyPart(lot)
    local hasHouse = lot:FindFirstChild("HousePickedByPlayer") ~= nil
    if buy and hasHouse then
        table.insert(claimableLots, lot)
        local index = #claimableLots
        local detector = buy:FindFirstChildOfClass("ClickDetector")
        if not detector then
            detector = Instance.new("ClickDetector")
            detector.MaxActivationDistance = 28
            detector.Parent = buy
        end
        detector.MouseClick:Connect(function(player)
            claim(player, lot, index)
        end)
    end
end

local function toggleHouseLights(player)
    local lot = lotByPlayer[player]
    if not lot then return end
    local house = lot:FindFirstChild("HousePickedByPlayer")
    if not house then return end
    local lights = {}
    for _, node in ipairs(house:GetDescendants()) do
        if node:IsA("Light") then
            table.insert(lights, node)
        end
    end
    if #lights == 0 then return end
    local enabled = not lights[1].Enabled
    for _, light in ipairs(lights) do
        light.Enabled = enabled
    end
end

compat.OnServerEvent:Connect(function(player, action)
    if action == "Sell" then
        release(player)
    elseif action == "TeleportHome" then
        local lot = lotByPlayer[player]
        if lot then teleportToLot(player, lot) end
    elseif action == "TeleportToAvailableLot" then
        for _, lot in ipairs(claimableLots) do
            if not ownerByLot[lot] then
                teleportToLot(player, lot)
                break
            end
        end
    end
end)

if playerHouseChoice then
    playerHouseChoice.OnServerEvent:Connect(function(player, action)
        if action == "PlayerSellHouse" then
            release(player)
        end
    end)
end

if playersHouse then
    playersHouse.OnServerEvent:Connect(function(player, action)
        if action == "Lights" then
            toggleHouseLights(player)
        elseif action == "LockDoors" then
            local locked = not (player:GetAttribute("BrookhavenCompatDoorsLocked") == true)
            player:SetAttribute("BrookhavenCompatDoorsLocked", locked)
            playersHouse:FireClient(player, locked and "LockDoorsTrue" or "LockDoorsFalse")
        end
    end)
end

Players.PlayerAdded:Connect(function(player)
    ensureBag(player)
end)
for _, player in ipairs(Players:GetPlayers()) do
    ensureBag(player)
end
Players.PlayerRemoving:Connect(function(player)
    local lot = lotByPlayer[player]
    if lot then ownerByLot[lot] = nil end
    lotByPlayer[player] = nil
end)

print("BROOKHAVEN_COMPAT_HOUSE_READY claimableLots=" .. tostring(#claimableLots))
