local ReplicatedStorage = game:GetService("ReplicatedStorage")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local destinationRemotes = highSchool:WaitForChild("DestinationRemotes")
local destinationVisited = destinationRemotes:WaitForChild("DestinationVisited")
local getDestinationState = destinationRemotes:WaitForChild("GetDestinationState")

local playerGui = script.Parent
local existing = playerGui:FindFirstChild("DestinationFeedbackGui")
if existing then
    existing:Destroy()
end

local gui = Instance.new("ScreenGui")
gui.Name = "DestinationFeedbackGui"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.Parent = playerGui

local toast = Instance.new("Frame")
toast.Name = "Toast"
toast.AnchorPoint = Vector2.new(0.5, 1)
toast.Position = UDim2.new(0.5, 0, 1, -24)
toast.Size = UDim2.new(0.86, 0, 0, 64)
toast.BackgroundColor3 = Color3.fromRGB(28, 67, 128)
toast.BackgroundTransparency = 0.08
toast.Visible = false
toast.Parent = gui

local constraint = Instance.new("UISizeConstraint")
constraint.MinSize = Vector2.new(260, 64)
constraint.MaxSize = Vector2.new(420, 64)
constraint.Parent = toast

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 12)
corner.Parent = toast

local label = Instance.new("TextLabel")
label.Name = "Message"
label.Size = UDim2.new(1, -24, 1, -12)
label.Position = UDim2.fromOffset(12, 6)
label.BackgroundTransparency = 1
label.TextColor3 = Color3.new(1, 1, 1)
label.TextSize = 18
label.TextWrapped = true
label.TextXAlignment = Enum.TextXAlignment.Left
label.TextYAlignment = Enum.TextYAlignment.Center
label.Parent = toast

local displaySequence = 0
local activeRouteText = nil
local COURIER_ACTIVITY_ID = "campus_courier"

local function applyCourierState(payload)
    if type(payload) ~= "table" or payload.activityId ~= COURIER_ACTIVITY_ID then
        return
    end

    if payload.routeExpired == true then
        activeRouteText = nil
        return
    end

    if payload.resolved == true then
        activeRouteText = nil
    elseif type(payload.nextLocationId) == "string"
        and type(payload.nextActionLabel) == "string"
        and type(payload.objective) == "string"
        and type(payload.progressLabel) == "string"
    then
        activeRouteText = "Campus Courier • "
            .. payload.progressLabel
            .. " • "
            .. payload.nextActionLabel
            .. "\n"
            .. payload.objective
    end
end

destinationVisited.OnClientEvent:Connect(function(payload)
    if type(payload) ~= "table"
        or type(payload.locationId) ~= "string"
        or type(payload.locationName) ~= "string"
        or type(payload.message) ~= "string"
    then
        return
    end

    applyCourierState(payload)

    displaySequence += 1
    local sequence = displaySequence
    label.Text = payload.message
    toast.Visible = true

    task.delay(2.5, function()
        if sequence ~= displaySequence then
            return
        end

        if activeRouteText then
            label.Text = activeRouteText
            toast.Visible = true
        else
            toast.Visible = false
        end
    end)
end)

task.spawn(function()
    local sequenceAtRequest = displaySequence
    local ok, payload = pcall(function()
        return getDestinationState:InvokeServer()
    end)

    if not ok or displaySequence ~= sequenceAtRequest then
        return
    end

    applyCourierState(payload)
    if activeRouteText then
        displaySequence += 1
        label.Text = activeRouteText
        toast.Visible = true
    end
end)
