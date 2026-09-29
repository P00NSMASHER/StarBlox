--!nonstrict
-- One network owner and one lifecycle. Gameplay controllers subscribe through context.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local statusGui = Instance.new("ScreenGui")
statusGui.Name = "LanternIslandStartup"
statusGui.ResetOnSpawn = false
statusGui.IgnoreGuiInset = false
statusGui.Parent = playerGui
local status = Instance.new("TextLabel")
status.Name = "Status"
status.AnchorPoint = Vector2.new(0.5, 0)
status.Position = UDim2.fromScale(0.5, 0.03)
status.Size = UDim2.new(0.88, 0, 0, 110)
status.BackgroundColor3 = Color3.fromRGB(22, 42, 51)
status.TextColor3 = Color3.fromRGB(248, 245, 223)
status.Font = Enum.Font.GothamMedium
status.TextSize = 18
status.TextWrapped = true
status.Text = "Lantern Island\nConnecting to this development build..."
status.Parent = statusGui
local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 16)
corner.Parent = status
local retry = Instance.new("TextButton")
retry.Name = "RetryConnection"
retry.AnchorPoint = Vector2.new(0.5, 0)
retry.Position = UDim2.new(0.5, 0, 0.03, 118)
retry.Size = UDim2.fromOffset(200, 48)
retry.Font = Enum.Font.GothamMedium
retry.TextSize = 18
retry.Text = "Check connection"
retry.BackgroundColor3 = Color3.fromRGB(243, 195, 99)
retry.TextColor3 = Color3.fromRGB(22, 42, 51)
retry.Parent = statusGui
Instance.new("UICorner", retry).CornerRadius = UDim.new(0, 12)

local shared = ReplicatedStorage:WaitForChild("LanternIslandShared", 15)
if not shared then status.Text = "Lantern Island\nBuild connection unavailable. Rejoin this test build."; retry.Visible = false; return end
local module = shared:WaitForChild("Protocol", 15)
if not module then status.Text = "Lantern Island\nProtocol module missing. This build is incomplete."; retry.Visible = false; return end
local Protocol = require(module)
local remoteFolder = ReplicatedStorage:WaitForChild(Protocol.REMOTE_FOLDER, 15)
if not remoteFolder then status.Text = "Lantern Island\nServer unavailable. This is not a playable release."; retry.Visible = false; return end
local actionRemote = remoteFolder:WaitForChild(Protocol.ACTION_REMOTE, 10)
local stateRemote = remoteFolder:WaitForChild(Protocol.STATE_REMOTE, 10)
if not actionRemote or not actionRemote:IsA("RemoteEvent") or not stateRemote or not stateRemote:IsA("RemoteEvent") then
    status.Text = "Lantern Island\nNetwork components missing. This build is incomplete."; retry.Visible = false; return
end
local stateChanged = Instance.new("BindableEvent")
local resultReceived = Instance.new("BindableEvent")
local pendingChanged = Instance.new("BindableEvent")
local pending = nil
local uncertainRequestId = nil
local mountFailed = false
local sequence = 0
local latestState = nil
local controllers = {}
local context = {
    player = player, playerGui = playerGui, protocol = Protocol,
    stateChanged = stateChanged.Event, resultReceived = resultReceived.Event,
    pendingChanged = pendingChanged.Event,
}
context.getState = function() return latestState end
context.send = function(action, fields)
    if pending then return nil, "BUSY" end
    if uncertainRequestId and action ~= "GetState" then return nil, "REFRESH_REQUIRED" end
    fields = fields or {}
    local envelope = { requestId = HttpService:GenerateGUID(false), action = action,
        missionId = fields.missionId, itemId = fields.itemId, payload = fields.payload }
    local valid, code, clean = Protocol.validate(envelope)
    if not valid then return nil, code end
    pending = clean
    pendingChanged:Fire(true)
    actionRemote:FireServer(clean)
    task.delay(Protocol.REQUEST_TIMEOUT, function()
        if pending and pending.requestId == clean.requestId then
            pending = nil
            if clean.action ~= "GetState" then uncertainRequestId = clean.requestId end
            pendingChanged:Fire(false)
            -- An uncertain acknowledgment is NOT an unsuccessful transaction; never auto-resubmit.
            resultReceived:Fire({ requestId = clean.requestId, ok = false, code = "ACK_UNCONFIRMED" })
            statusGui.Enabled = true
            status.Text = "Lantern Island\nConnection interrupted. Check your current progress before trying again."
        end
    end)
    return clean.requestId, "SENT"
end
local function mountControllers()
    if controllers.UIController then return true end
    if mountFailed then return false end
    for _, name in ipairs({ "UIController", "InteractionController" }) do
        local found = script.Parent:FindFirstChild(name)
        if not found or not found:IsA("ModuleScript") then return false end
    end
    local created = {}
    local ok = pcall(function()
        for _, name in ipairs({ "UIController", "InteractionController", "SpellingController", "ReadingController", "SessionCollectiblesController", "FeedbackController" }) do
            local found = script.Parent:FindFirstChild(name)
            if found and found:IsA("ModuleScript") then
                local definition = require(found)
                assert(type(definition.new) == "function", name .. ".new required")
                local controller = definition.new(context)
                assert(type(controller.destroy) == "function", name .. ":destroy required")
                created[name] = controller
                if controller.mount then controller:mount(playerGui) end
            end
        end
        assert(type(created.UIController.render) == "function", "UIController:render required")
    end)
    if not ok then
        mountFailed = true
        for _, controller in pairs(created) do pcall(function() controller:destroy() end) end
        return false
    end
    controllers = created
    return true
end
stateRemote.OnClientEvent:Connect(function(packet)
    if type(packet) ~= "table" or type(packet.sequence) ~= "number" or packet.sequence <= sequence then return end
    sequence = packet.sequence
    local wasRefresh = pending and packet.requestId == pending.requestId and pending.action == "GetState"
    if pending and packet.requestId == pending.requestId then pending = nil; pendingChanged:Fire(false) end
    if packet.requestId == uncertainRequestId or (wasRefresh and type(packet.state) == "table" and packet.state.mutationPending == false) then
        uncertainRequestId = nil
    end
    if type(packet.state) == "table" then latestState = packet.state end
    if latestState and latestState.runtimeStatus == "READY" and latestState.profileStatus == "LOADED" then
        if mountControllers() then
            local rendered = pcall(function() controllers.UIController:render(latestState) end)
            statusGui.Enabled = not rendered
            if not rendered then status.Text = "Lantern Island\nThe interface could not update. Please rejoin this test build." end
        else
            statusGui.Enabled = true
            status.Text = "Lantern Island\nGameplay controls are not integrated yet. This is a development build."
        end
    else
        statusGui.Enabled = true
        local text = latestState and latestState.runtimeStatus or "STATE_UNAVAILABLE"
        if latestState and latestState.runtimeStatus == "READY" then text = latestState.profileStatus end
        status.Text = "Lantern Island\nDevelopment status: " .. tostring(text) .. "\nYour existing StarBlox game is unchanged."
    end
    stateChanged:Fire(latestState)
    resultReceived:Fire({ requestId = packet.requestId, ok = packet.ok == true, code = packet.code })
end)
retry.Activated:Connect(function() context.send("GetState") end)
player.CharacterAdded:Connect(function() context.send("GetState") end)
context.send("GetState")
script.Destroying:Connect(function()
    for _, controller in pairs(controllers) do pcall(function() controller:destroy() end) end
    stateChanged:Destroy(); resultReceived:Destroy(); pendingChanged:Destroy(); statusGui:Destroy()
end)