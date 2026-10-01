local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local FoundationConfig = require(highSchool:WaitForChild("FoundationConfig"))
local FoundationState = require(highSchool:WaitForChild("FoundationState"))
local classRemotes = highSchool:WaitForChild("ClassRemotes")
local progressionRemotes = highSchool:WaitForChild("ProgressionRemotes")

local beginClass = classRemotes:WaitForChild("BeginClass")
local submitAnswer = classRemotes:WaitForChild("SubmitAnswer")
local leaveClass = classRemotes:WaitForChild("LeaveClass")
local getProgression = progressionRemotes:WaitForChild("GetProgression")

local ACTIVE_CLASS_ID = "math"

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
panel.AnchorPoint = Vector2.new(0.5, 0)
panel.Position = UDim2.new(0.5, 0, 0, 18)
panel.Size = UDim2.new(0.86, 0, 0, 210)
panel.BackgroundTransparency = 0.08
panel.Parent = gui

local sizeConstraint = Instance.new("UISizeConstraint")
sizeConstraint.MaxSize = Vector2.new(380, 210)
sizeConstraint.MinSize = Vector2.new(280, 190)
sizeConstraint.Parent = panel

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 6)
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

local periodLabel = makeLabel("PeriodLabel", 26, "School period: loading…")
local progressionLabel = makeLabel("ProgressionLabel", 26, "Points: loading…")
local statusLabel = makeLabel("StatusLabel", 32, "Ready")

local actionRow = Instance.new("Frame")
actionRow.Name = "ActionRow"
actionRow.Size = UDim2.new(1, -16, 0, 46)
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
questionFrame.Size = UDim2.new(1, -16, 0, 68)
questionFrame.BackgroundTransparency = 1
questionFrame.Visible = false
questionFrame.Parent = panel

local questionLayout = Instance.new("UIListLayout")
questionLayout.FillDirection = Enum.FillDirection.Vertical
questionLayout.Padding = UDim.new(0, 4)
questionLayout.Parent = questionFrame

local promptLabel = Instance.new("TextLabel")
promptLabel.Name = "Prompt"
promptLabel.Size = UDim2.new(1, 0, 0, 22)
promptLabel.BackgroundTransparency = 1
promptLabel.TextWrapped = true
promptLabel.TextSize = 17
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
local lastCompletedCount = nil
local lastPeriodId = nil

local function locationDisplayName(locationId)
    for _, location in ipairs(FoundationConfig.LOCATIONS) do
        if location.id == locationId then
            return location.name
        end
    end
    return tostring(locationId or "unknown")
end

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
        lastCompletedCount = result.progression.completedCount or 0
        progressionLabel.Text = string.format(
            "Points: %d • Completed: %d",
            result.progression.points or 0,
            lastCompletedCount
        )
        return true
    end

    progressionLabel.Text = "Points: unavailable"
    return false
end

local function waitForProgressionAdvance(previousCompletedCount)
    task.spawn(function()
        for attempt = 1, 6 do
            task.wait(math.min(0.5 * attempt, 2))
            local before = lastCompletedCount
            if refreshProgression() and previousCompletedCount ~= nil and lastCompletedCount > previousCompletedCount then
                statusLabel.Text = "Class complete. Progress saved."
                return
            end

            if previousCompletedCount == nil and before ~= lastCompletedCount then
                statusLabel.Text = "Class complete. Progress saved."
                return
            end
        end

        statusLabel.Text = "Class complete. Progress is still saving."
    end)
end

local function finishSession(message, shouldWaitForProgression)
    local previousCompletedCount = lastCompletedCount
    currentSessionId = nil
    questionFrame.Visible = false
    clearChoices()
    statusLabel.Text = message

    if shouldWaitForProgression then
        waitForProgressionAdvance(previousCompletedCount)
    else
        refreshProgression()
    end
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
        if response.reason == "SESSION_NOT_ACTIVE" or response.reason == "CLASS_PERIOD_ENDED" then
            finishSession("Class ended. Back to free roam.", false)
        else
            statusLabel.Text = response.reason or "Answer rejected."
        end
        return
    end

    if response.resolved then
        finishSession(response.explanation or "Class complete. Saving progress…", true)
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
        button.Size = UDim2.new(1 / math.max(1, #choices), -6, 0, 44)
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
        finishSession("Back to free roam.", false)
    else
        statusLabel.Text = "Could not leave class."
    end
end)

task.spawn(function()
    while gui.Parent do
        local snapshot = FoundationState.getSnapshot()
        local periodId = snapshot.periodId
        local locationName = locationDisplayName(snapshot.locationId)
        local secondsRemaining = math.max(0, math.ceil(tonumber(snapshot.secondsRemaining) or 0))

        periodLabel.Text = string.format(
            "Day %s • %s • %s • %ds",
            tostring(snapshot.dayIndex or "?"),
            tostring(periodId or "loading"),
            locationName,
            secondsRemaining
        )

        local classIsAvailable = periodId == ACTIVE_CLASS_ID
        attendButton.Active = classIsAvailable and currentSessionId == nil
        attendButton.AutoButtonColor = classIsAvailable and currentSessionId == nil
        attendButton.Text = classIsAvailable and "Attend Math" or "Class Unavailable"

        if periodId ~= lastPeriodId then
            if periodId == ACTIVE_CLASS_ID and currentSessionId == nil then
                statusLabel.Text = "Math is open — go to Math Classroom."
            elseif currentSessionId == nil then
                statusLabel.Text = "Free roam."
            end
            lastPeriodId = periodId
        end

        if currentSessionId and periodId ~= nil and periodId ~= ACTIVE_CLASS_ID then
            safeInvoke(leaveClass)
            finishSession("Class period ended. Back to free roam.", false)
        end

        task.wait(1)
    end
end)

refreshProgression()
