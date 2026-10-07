local ReplicatedStorage = game:GetService("ReplicatedStorage")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local destinationVisited = highSchool
    :WaitForChild("DestinationRemotes")
    :WaitForChild("DestinationVisited")

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
label.Parent = toast

local displaySequence = 0

destinationVisited.OnClientEvent:Connect(function(payload)
    if type(payload) ~= "table"
        or type(payload.locationId) ~= "string"
        or type(payload.locationName) ~= "string"
        or type(payload.message) ~= "string"
    then
        return
    end

    displaySequence += 1
    local sequence = displaySequence
    label.Text = payload.message
    toast.Visible = true

    task.delay(2.5, function()
        if sequence == displaySequence then
            toast.Visible = false
        end
    end)
end)
