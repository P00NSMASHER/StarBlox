local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local FoundationState = require(highSchool:WaitForChild("FoundationState"))
local classRemotes = highSchool:WaitForChild("ClassRemotes")
local progressionRemotes = highSchool:WaitForChild("ProgressionRemotes")

local beginClass = classRemotes:WaitForChild("BeginClass")
local submitAnswer = classRemotes:WaitForChild("SubmitAnswer")
local leaveClass = classRemotes:WaitForChild("LeaveClass")
local getProgression = progressionRemotes:WaitForChild("GetProgression")

local playerGui = script.Parent
local existing = playerGui:FindFirstChild("HighSchoolHud")
if existing then
    existing:Destroy()
end

local gui = Instance.new("ScreenGui")
gui.Name = "HighSchoolHud"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.Parent = playerGui

local panel = Instance.new("Frame")
panel.Name = "Panel"
panel.AnchorPoint = Vector2.new(0.5, 1)
panel.Position = UDim2.new(0.5, 0, 1, -18)
panel.Size = UDim2.new(0.92, 0, 0, 228)
panel.BackgroundTransparency = 0.08
panel.Parent = gui

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 8)
layout.FillDirection = Enum.FillDirection.Vertical
layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = panel

local function makeLabel(name, height, text)
    local label = Instance.new("TextLabel")
    label.Name = name
    label.Size = UDim2.new(1, -16, 0, height)
    label.BackgroundTransparency = 1
    label.TextWrapped = true
    label.TextScaled = false
    label.TextSize = 18
    label.Text = text
    label.Parent = panel
    return label
end

local periodLabel = makeLabel("PeriodLabel", 28, "School period: loading…")
local progressionLabel = makeLabel("ProgressionLabel", 28, "Points: loading…")
local statusLabel = makeLabel("StatusLabel", 34, "Ready")

local actionRow = Instance.new("Frame")
actionRow.Name = "ActionRow"
actionRow.Size = UDim2.new(1, -16, 0, 48)
actionRow.BackgroundTransparency = 1
actionRow.Parent = panel

local actionLayout = Instance.new("UIListLayout")
actionLayout.FillDirection = Enum.FillDirection.Horizontal
actionLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
actionLayout.Padding = UDim.new(0, 8)
actionLayout.Parent = actionRow

local function makeButton(parent, name, text)
    local button = Instance.new("TextButton")
    button.Name = name
    button.Size = UDim2.new(0.48, 0, 0, 44)
    button.TextSize = 18
    button.Text = text
    button.Parent = parent
    return button
end

local attendButton = makeButton(actionRow, "AttendClassButton", "Attend Class")
local leaveButton = makeButton(actionRow, "LeaveClassButton", "Leave Class")

local questionFrame = Instance.new("Frame")
questionFrame.Name = "QuestionFrame"
questionFrame.Size = UDim2.new(1, -16, 0, 74)
questionFrame.BackgroundTransparency = 1
questionFrame.Visible = false
questionFrame.Parent = panel

local questionLayout = Instance.new("UIListLayout")
questionLayout.FillDirection = Enum.FillDirection.Vertical
questionLayout.Padding = UDim.new(0, 4)
questionLayout.Parent = questionFrame

local promptLabel = Instance.new("TextLabel")
promptLabel.Name = "Prompt"
promptLabel.Size = UDim2.new(1, 0, 0, 26)
promptLabel.BackgroundTransparency = 1
promptLabel.TextWrapped = true
promptLabel.TextSize = 18
promptLabel.Parent = questionFrame

local choicesRow = Instance.new("Frame")
choicesRow.Name = "Choices"
choicesRow.Size = UDim2.new(1, 0, 0, 44)
choicesRow.BackgroundTransparency = 1
choicesRow.Parent = questionFrame

local choicesLayout = Instance.new("UIListLayout")
choicesLayout.FillDirection = Enum.FillDirection.Horizontal
choicesLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
choicesLayout.Padding = UDim.new(0, 6)
choicesLayout.Parent = choicesRow

local currentSessionId = nil

local function safeInvoke(remote, ...)
    local ok, result = pcall(function()
        return remote:InvokeServer(...)
    end)
    if not ok then
        return nil, "SERVER_UNAVAILABLE"
    end
    return result
end

local function clearChoices()
    for _, child in ipairs(choicesRow:GetChildren()) do
        if child:IsA("TextButton") then
            child:Destroy()
        end
    end
end

local function refreshProgression()
    local result = safeInvoke(getProgression)
    if result and result.ok and result.progression then
        progressionLabel.Text = string.format(
            "Points: %d • Completed: %d",
            result.progression.points or 0,
            result.progression.completedCount or 0
        )
    else
        progressionLabel.Text = "Points: unavailable"
    end
end

local function finishSession(message)
    currentSessionId = nil
    questionFrame.Visible = false
    clearChoices()
    statusLabel.Text = message
    refreshProgression()
end

local function submitChoice(choiceId)
    if not currentSessionId then
        return
    end

    local submissionId = HttpService:GenerateGUID(false)
    local response = safeInvoke(submitAnswer, currentSessionId, submissionId, choiceId)
    if not response then
        statusLabel.Text = "Could not submit answer."
        return
    end

    if not response.accepted then
        statusLabel.Text = response.reason or "Answer rejected."
        return
    end

    if response.resolved then
        finishSession(response.explanation or "Class complete.")
    else
        statusLabel.Text = response.hint or "Try again."
    end
end

local function showActivity(activity)
    clearChoices()
    promptLabel.Text = activity.prompt or "Class activity"
    local choices = activity.choices or {}

    for _, choice in ipairs(choices) do
        local button = Instance.new("TextButton")
        button.Name = "Choice_" .. tostring(choice.id)
        button.Size = UDim2.new(0, math.max(64, math.floor(250 / math.max(1, #choices))), 0, 44)
        button.TextSize = 17
        button.Text = tostring(choice.text)
        button.Parent = choicesRow
        button.Activated:Connect(function()
            submitChoice(choice.id)
        end)
    end

    questionFrame.Visible = true
end

attendButton.Activated:Connect(function()
    if currentSessionId then
        statusLabel.Text = "Finish or leave the current class first."
        return
    end

    local result = safeInvoke(beginClass)
    if not result or not result.ok then
        statusLabel.Text = (result and result.reason) or "Could not start class."
        return
    end

    currentSessionId = result.sessionId
    statusLabel.Text = "Class started."
    showActivity(result.activity or {})
end)

leaveButton.Activated:Connect(function()
    local result = safeInvoke(leaveClass)
    if result and result.ok then
        finishSession("Back to free roam.")
    else
        statusLabel.Text = "Could not leave class."
    end
end)

task.spawn(function()
    while gui.Parent do
        local snapshot = FoundationState.getSnapshot()
        periodLabel.Text = string.format(
            "Day %s • %s • %s",
            tostring(snapshot.dayIndex or "?"),
            tostring(snapshot.periodId or "loading"),
            tostring(snapshot.locationId or "unknown")
        )
        task.wait(1)
    end
end)

refreshProgression()
