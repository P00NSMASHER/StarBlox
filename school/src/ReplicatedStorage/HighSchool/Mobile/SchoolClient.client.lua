local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local highSchool
local FoundationConfig
local FoundationState
local SchoolClock
local beginClass, submitAnswer, leaveClass, getProgression
local CLASS_NAMES = { math = "Math", ela = "Language Arts", science = "Science", arrival = "Arrival", lunch = "Lunch" }
local CLASS_PERIODS = table.freeze({ math = true, ela = true, science = true })
local REPORT_CARD_CLASS_IDS = table.freeze({ "math", "ela", "science" })
local FREE_ROAM_PANEL_HEIGHT = 264
local ACTIVITY_PANEL_HEIGHT = 356

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

local secondaryRail = Instance.new("Frame")
secondaryRail.Name = "SecondaryActionRail"
secondaryRail.AnchorPoint = Vector2.new(1, 0.5)
secondaryRail.Position = UDim2.new(1, -12, 0.5, 0)
secondaryRail.Size = UDim2.fromOffset(48, 48)
secondaryRail.BackgroundTransparency = 1
secondaryRail.Parent = gui

local reportCardButton = Instance.new("TextButton")
reportCardButton.Name = "ReportCardButton"
reportCardButton.Size = UDim2.fromOffset(48, 44)
reportCardButton.BackgroundColor3 = Color3.fromRGB(20, 38, 67)
reportCardButton.TextColor3 = Color3.fromRGB(255, 255, 255)
reportCardButton.TextSize = 14
reportCardButton.Text = "Grades"
reportCardButton.Parent = secondaryRail

local reportCardPanel = Instance.new("Frame")
reportCardPanel.Name = "ReportCardPanel"
reportCardPanel.AnchorPoint = Vector2.new(1, 0.5)
reportCardPanel.Position = UDim2.new(1, -68, 0.5, 0)
reportCardPanel.Size = UDim2.fromOffset(236, 132)
reportCardPanel.BackgroundColor3 = Color3.fromRGB(20, 38, 67)
reportCardPanel.BorderSizePixel = 0
reportCardPanel.Visible = false
reportCardPanel.ZIndex = 5
reportCardPanel.Parent = gui

local reportCardCorner = Instance.new("UICorner")
reportCardCorner.CornerRadius = UDim.new(0, 8)
reportCardCorner.Parent = reportCardPanel

local reportCardTitle = Instance.new("TextLabel")
reportCardTitle.Name = "Title"
reportCardTitle.Position = UDim2.fromOffset(10, 6)
reportCardTitle.Size = UDim2.new(1, -20, 0, 26)
reportCardTitle.BackgroundTransparency = 1
reportCardTitle.TextColor3 = Color3.fromRGB(255, 255, 255)
reportCardTitle.TextSize = 18
reportCardTitle.Font = Enum.Font.GothamBold
reportCardTitle.Text = "Report Card"
reportCardTitle.ZIndex = 6
reportCardTitle.Parent = reportCardPanel

local reportCardRows = {}
for index, classId in ipairs(REPORT_CARD_CLASS_IDS) do
    local row = Instance.new("TextLabel")
    row.Name = classId .. "Row"
    row.Position = UDim2.fromOffset(10, 34 + (index - 1) * 30)
    row.Size = UDim2.new(1, -20, 0, 28)
    row.BackgroundTransparency = 1
    row.TextColor3 = Color3.fromRGB(255, 255, 255)
    row.TextSize = 15
    row.TextXAlignment = Enum.TextXAlignment.Left
    row.Text = CLASS_NAMES[classId] .. " • loading…"
    row.ZIndex = 6
    row.Parent = reportCardPanel
    reportCardRows[classId] = row
end

local function setReportCardVisible(visible)
    reportCardPanel.Visible = visible
    reportCardButton.Text = visible and "Close" or "Grades"
end

reportCardButton.Activated:Connect(function()
    setReportCardVisible(not reportCardPanel.Visible)
end)

local function waitForHighSchool()
    if not highSchool then
        highSchool = ReplicatedStorage:WaitForChild("HighSchool")
    end
    return highSchool
end

local panel = Instance.new("Frame")
panel.Name = "Panel"
panel.AnchorPoint = Vector2.new(0.5, 0)
panel.Position = UDim2.new(0.5, 0, 0, 18)
panel.Size = UDim2.new(0.86, 0, 0, FREE_ROAM_PANEL_HEIGHT)
panel.BackgroundTransparency = 0.08
panel.Parent = gui

local sizeConstraint = Instance.new("UISizeConstraint")
sizeConstraint.MaxSize = Vector2.new(380, ACTIVITY_PANEL_HEIGHT)
sizeConstraint.MinSize = Vector2.new(280, 244)
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
local clockLabel = makeLabel("ClockLabel", 26, "School clock: loading…")
local nextLabel = makeLabel("NextLabel", 26, "Up next: loading…")
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
questionFrame.Size = UDim2.new(1, -16, 0, 160)
questionFrame.BackgroundTransparency = 1
questionFrame.Visible = false
questionFrame.Parent = panel

local questionLayout = Instance.new("UIListLayout")
questionLayout.FillDirection = Enum.FillDirection.Vertical
questionLayout.Padding = UDim.new(0, 4)
questionLayout.Parent = questionFrame

local promptLabel = Instance.new("TextLabel")
promptLabel.Name = "Prompt"
promptLabel.Size = UDim2.new(1, 0, 0, 40)
promptLabel.BackgroundTransparency = 1
promptLabel.TextWrapped = true
promptLabel.TextSize = 17
promptLabel.Parent = questionFrame

local choicesRow = Instance.new("Frame")
choicesRow.Name = "Choices"
choicesRow.Size = UDim2.new(1, 0, 0, 116)
choicesRow.BackgroundTransparency = 1
choicesRow.Parent = questionFrame

local choicesLayout = Instance.new("UIGridLayout")
choicesLayout.CellSize = UDim2.new(0.5, -3, 0, 56)
choicesLayout.CellPadding = UDim2.fromOffset(6, 4)
choicesLayout.FillDirection = Enum.FillDirection.Horizontal
choicesLayout.FillDirectionMaxCells = 2
choicesLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
choicesLayout.SortOrder = Enum.SortOrder.LayoutOrder
choicesLayout.Parent = choicesRow

local currentSessionId = nil
local currentClassId = nil
local answerPending = false
local lastCompletedCount = nil
local lastPeriodId = nil

local function locationDisplayName(locationId)
    for _, location in ipairs(FoundationConfig and FoundationConfig.LOCATIONS or {}) do
        if location.id == locationId then
            return location.name
        end
    end
    if CLASS_PERIODS[locationId] then
        return CLASS_NAMES[locationId] .. " Classroom"
    end
    return tostring(locationId or "unknown")
end

local function distanceHint(result)
    local distance = type(result) == "table" and tonumber(result.distanceStuds) or nil
    if not distance or distance < 0 then
        return ""
    end
    return string.format(" (%d studs away)", math.clamp(math.ceil(distance), 0, 999))
end

local function beginClassFailureMessage(result, invokeError)
    if invokeError == "SERVER_UNAVAILABLE" or not result then
        return "School services are loading. Try again."
    end

    local reason = result.reason
    if reason == "NOT_CLASS_PERIOD" then
        return "No class is open right now."
    end

    local classId = result.classId
    local className = CLASS_NAMES[classId] or "class"
    local expectedLocationName = locationDisplayName(result.expectedLocationId or classId)
    if reason == "NOT_AT_CLASS_LOCATION" then
        return "Go to " .. expectedLocationName .. distanceHint(result) .. " to attend " .. className .. "."
    end
    if reason == "CLASS_LOCATION_MISMATCH" then
        return "Classroom directions are updating. Go to " .. expectedLocationName .. "."
    end
    if reason == "CLASS_ALREADY_COMPLETED" then
        return className .. " is already complete for this period. Check Grades for your saved result."
    end
    if reason == "SESSION_START_FAILED" then
        return "Class is not ready yet. Try again."
    end

    return "Could not start class."
end


local function answerFailureMessage(response, invokeError)
    if invokeError == "SERVER_UNAVAILABLE" or not response then
        return "Could not submit answer. Check your connection and try again."
    end

    local reason = response.reason
    if reason == "SESSION_NOT_ACTIVE"
        or reason == "UNKNOWN_SESSION"
        or reason == "SESSION_CLOSED"
        or reason == "CLASS_PERIOD_ENDED"
    then
        return "Class ended. Back to free roam."
    end
    if reason == "LEFT_CLASS_LOCATION" then
        local expectedLocationName = locationDisplayName(response.expectedLocationId)
        return "You left " .. expectedLocationName .. distanceHint(response) .. ". Back to free roam."
    end
    if reason == "CLASS_LOCATION_MISMATCH" then
        local expectedLocationName = locationDisplayName(response.expectedLocationId)
        return "Classroom directions changed. Go to " .. expectedLocationName .. " before attending again."
    end
    if reason == "INVALID_SUBMISSION_ID" or reason == "INVALID_CHOICE" then
        return "That answer could not be sent. Try again."
    end
    if reason == "TOO_MANY_SUBMISSIONS" then
        return "Too many attempts. Leave and attend class again."
    end

    return "Answer was not accepted. Try again."
end

local function safeInvoke(remote, ...)
    if not remote then return nil, "SERVER_UNAVAILABLE" end
    local ok, result = pcall(function()
        return remote:InvokeServer(...)
    end)
    if not ok then
        return nil, "SERVER_UNAVAILABLE"
    end
    return result
end

local function setChoiceButtonsEnabled(enabled)
    for _, child in ipairs(choicesRow:GetChildren()) do
        if child:IsA("TextButton") then
            child.Active = enabled
            child.AutoButtonColor = enabled
        end
    end
end

local function clearChoices()
    answerPending = false
    for _, child in ipairs(choicesRow:GetChildren()) do
        if child:IsA("TextButton") then
            child:Destroy()
        end
    end
end

local function updateReportCard(reportCard)
    for _, classId in ipairs(REPORT_CARD_CLASS_IDS) do
        local subject = type(reportCard) == "table" and reportCard[classId] or nil
        if type(subject) == "table" then
            local completedCount = math.max(0, math.floor(tonumber(subject.completedCount) or 0))
            local points = math.max(0, math.floor(tonumber(subject.points) or 0))
            reportCardRows[classId].Text = string.format(
                "%s • %d complete • %d pts",
                CLASS_NAMES[classId],
                completedCount,
                points
            )
        else
            reportCardRows[classId].Text = CLASS_NAMES[classId] .. " • unavailable"
        end
    end
end

local function refreshProgression()
    local result = safeInvoke(getProgression)
    if result and result.ok and result.progression then
        lastCompletedCount = result.progression.completedCount or 0
        updateReportCard(result.progression.reportCard)
        progressionLabel.Text = string.format(
            "Points: %d • Completed: %d",
            result.progression.points or 0,
            lastCompletedCount
        )
        return true
    end

    progressionLabel.Text = "Points: unavailable"
    updateReportCard(nil)
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
    currentClassId = nil
    questionFrame.Visible = false
    panel.Size = UDim2.new(0.86, 0, 0, FREE_ROAM_PANEL_HEIGHT)
    progressionLabel.Visible = true
    clearChoices()
    statusLabel.Text = message

    if shouldWaitForProgression then
        waitForProgressionAdvance(previousCompletedCount)
    else
        refreshProgression()
    end
end

local function submitChoice(choiceId)
    if not currentSessionId or answerPending then
        return
    end

    answerPending = true
    setChoiceButtonsEnabled(false)
    statusLabel.Text = "Submitting answer…"

    local submissionId = HttpService:GenerateGUID(false)
    local response, invokeError = safeInvoke(submitAnswer, currentSessionId, submissionId, choiceId)
    if not response then
        answerPending = false
        setChoiceButtonsEnabled(true)
        statusLabel.Text = answerFailureMessage(response, invokeError)
        return
    end

    if not response.accepted then
        local reason = response.reason
        if reason == "SESSION_NOT_ACTIVE"
            or reason == "UNKNOWN_SESSION"
            or reason == "SESSION_CLOSED"
            or reason == "CLASS_PERIOD_ENDED"
            or reason == "LEFT_CLASS_LOCATION"
            or reason == "CLASS_LOCATION_MISMATCH"
        then
            finishSession(answerFailureMessage(response, invokeError), false)
        else
            answerPending = false
            setChoiceButtonsEnabled(true)
            statusLabel.Text = answerFailureMessage(response, invokeError)
        end
        return
    end

    if response.resolved then
        finishSession(response.explanation or "Class complete. Saving progress…", true)
    else
        answerPending = false
        setChoiceButtonsEnabled(true)
        statusLabel.Text = response.hint or "Try again."
    end
end

local function showActivity(activity)
    clearChoices()
    setReportCardVisible(false)
    progressionLabel.Visible = false
    panel.Size = UDim2.new(0.86, 0, 0, ACTIVITY_PANEL_HEIGHT)
    promptLabel.Text = activity.prompt or "Class activity"
    local choices = activity.choices or {}

    for index, choice in ipairs(choices) do
        local button = Instance.new("TextButton")
        button.Name = "Choice_" .. tostring(choice.id)
        button.LayoutOrder = index
        button.Size = UDim2.new(0.5, -3, 0, 56)
        button.BackgroundColor3 = Color3.fromRGB(20, 38, 67)
        button.TextColor3 = Color3.fromRGB(255, 255, 255)
        button.TextWrapped = true
        button.TextScaled = true
        button.Text = tostring(choice.text)
        button.Parent = choicesRow

        local textConstraint = Instance.new("UITextSizeConstraint")
        textConstraint.MinTextSize = 12
        textConstraint.MaxTextSize = 17
        textConstraint.Parent = button
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

    local result, invokeError = safeInvoke(beginClass)
    if not result or not result.ok then
        statusLabel.Text = beginClassFailureMessage(result, invokeError)
        return
    end

    currentSessionId = result.sessionId
    local activity = result.activity or {}
    currentClassId = activity.subject
    if not CLASS_PERIODS[currentClassId] then
        safeInvoke(leaveClass)
        finishSession("Class start could not be verified. Try again.", false)
        return
    end
    statusLabel.Text = "Class started."
    showActivity(activity)
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
        local snapshot = FoundationState and FoundationState.getSnapshot() or {}
        local periodId = snapshot.periodId
        local locationName = locationDisplayName(snapshot.locationId)
        if SchoolClock and snapshot.periodIndex and snapshot.secondsIntoPeriod then
            local displayTime, nextId = SchoolClock.getDisplay(snapshot)
            clockLabel.Text = "School time: " .. displayTime
            nextLabel.Text = "Up next: " .. (CLASS_NAMES[nextId] or nextId)
        end
        local secondsRemaining = math.max(0, math.ceil(tonumber(snapshot.secondsRemaining) or 0))

        periodLabel.Text = string.format(
            "Day %s • %s • %s • %ds",
            tostring(snapshot.dayIndex or "?"),
            tostring(periodId or "loading"),
            locationName,
            secondsRemaining
        )

        local classIsAvailable = CLASS_PERIODS[periodId] == true
        local canAttend = classIsAvailable and currentSessionId == nil and beginClass ~= nil
        attendButton.Active = canAttend
        attendButton.AutoButtonColor = canAttend
        if classIsAvailable and beginClass == nil then
            attendButton.Text = "Connecting…"
        elseif classIsAvailable then
            attendButton.Text = "Attend " .. CLASS_NAMES[periodId]
        else
            attendButton.Text = "Class Unavailable"
        end

        local canOpenReportCard = currentSessionId == nil
        reportCardButton.Active = canOpenReportCard
        reportCardButton.AutoButtonColor = canOpenReportCard
        if not canOpenReportCard then
            reportCardButton.Text = "In Class"
        elseif reportCardPanel.Visible then
            reportCardButton.Text = "Close"
        else
            reportCardButton.Text = "Grades"
        end

        if periodId ~= lastPeriodId then
            if classIsAvailable and currentSessionId == nil then
                statusLabel.Text = CLASS_NAMES[periodId] .. " is open — go to " .. locationName .. "."
            elseif currentSessionId == nil then
                statusLabel.Text = "Free roam."
            end
            lastPeriodId = periodId
        end

        if currentSessionId and periodId ~= nil and periodId ~= currentClassId then
            safeInvoke(leaveClass)
            finishSession("Class period ended. Back to free roam.", false)
        end

        task.wait(1)
    end
end)

task.spawn(function()
    FoundationConfig = require(waitForHighSchool():WaitForChild("FoundationConfig"))
end)
task.spawn(function()
    FoundationState = require(waitForHighSchool():WaitForChild("FoundationState"))
end)
task.spawn(function()
    SchoolClock = require(waitForHighSchool():WaitForChild("SchoolClock"))
end)
task.spawn(function()
    local classRemotes = waitForHighSchool():WaitForChild("ClassRemotes")
    beginClass = classRemotes:WaitForChild("BeginClass")
    submitAnswer = classRemotes:WaitForChild("SubmitAnswer")
    leaveClass = classRemotes:WaitForChild("LeaveClass")
end)
task.spawn(function()
    local progressionRemotes = waitForHighSchool():WaitForChild("ProgressionRemotes")
    getProgression = progressionRemotes:WaitForChild("GetProgression")
    refreshProgression()
end)
