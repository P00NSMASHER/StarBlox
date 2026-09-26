--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local familyRemotes = ReplicatedStorage:WaitForChild("StarBloxFamily")
local getState = familyRemotes:WaitForChild("GetState") :: RemoteFunction
local createFamily = familyRemotes:WaitForChild("Create") :: RemoteFunction
local invite = familyRemotes:WaitForChild("Invite") :: RemoteFunction
local respondInvite = familyRemotes:WaitForChild("RespondInvite") :: RemoteFunction
local leave = familyRemotes:WaitForChild("Leave") :: RemoteFunction
local removeMember = familyRemotes:WaitForChild("RemoveMember") :: RemoteFunction
local stateChanged = familyRemotes:WaitForChild("StateChanged") :: RemoteEvent

local UI = {
	white = Color3.fromRGB(239, 239, 239),
	panel = Color3.fromRGB(63, 63, 63),
	panelSoft = Color3.fromRGB(102, 102, 102),
	text = Color3.fromRGB(34, 34, 34),
	muted = Color3.fromRGB(220, 220, 220),
	red = Color3.fromRGB(205, 37, 37),
	green = Color3.fromRGB(61, 183, 79),
	border = Color3.fromRGB(105, 105, 105),
}

local function round(object: GuiObject, radius: number)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = object
end

local function stroke(object: GuiObject, transparency: number?)
	local line = Instance.new("UIStroke")
	line.Color = UI.border
	line.Thickness = 1
	line.Transparency = transparency or 0.4
	line.Parent = object
end

local function constrain(label: TextLabel | TextButton, minSize: number, maxSize: number)
	local c = Instance.new("UITextSizeConstraint")
	c.MinTextSize = minSize
	c.MaxTextSize = maxSize
	c.Parent = label
end

local gui = Instance.new("ScreenGui")
gui.Name = "BrookhavenFamilyUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.DisplayOrder = 82
gui.Enabled = false
pcall(function()
	gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
end)
gui.Parent = playerGui

local openFamily = Instance.new("BindableEvent")
openFamily.Name = "OpenFamilyPanel"
openFamily.Parent = gui

local root = Instance.new("Frame")
root.Size = UDim2.fromScale(1, 1)
root.BackgroundTransparency = 1
root.Parent = gui

local scale = Instance.new("UIScale")
scale.Scale = 1
scale.Parent = root

local function updateScale()
	local camera = Workspace.CurrentCamera
	if camera == nil then
		return
	end
	scale.Scale = math.clamp(camera.ViewportSize.Y / 512, 0.72, 1.08)
end
updateScale()
Workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(updateScale)
if Workspace.CurrentCamera then
	Workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)
end

-- Recorded Brookhaven layout: detached red X above a compact "My Family" panel.
local panel = Instance.new("Frame")
panel.Name = "MyFamilyPanel"
panel.AnchorPoint = Vector2.new(1, 0)
panel.Position = UDim2.new(1, -198, 0, 160)
panel.Size = UDim2.fromOffset(205, 264)
panel.BackgroundColor3 = UI.white
panel.BackgroundTransparency = 0.08
panel.ZIndex = 83
panel.Parent = root
round(panel, 9)
stroke(panel, 0.35)

local title = Instance.new("TextLabel")
title.Name = "Title"
title.Position = UDim2.fromOffset(4, 2)
title.Size = UDim2.new(1, -8, 0, 35)
title.BackgroundColor3 = UI.white
title.BackgroundTransparency = 0.05
title.Text = "My Family"
title.TextColor3 = UI.text
title.Font = Enum.Font.GothamMedium
title.TextScaled = true
title.ZIndex = 84
title.Parent = panel
round(title, 7)
constrain(title, 18, 24)

local close = Instance.new("TextButton")
close.Name = "Close"
close.AnchorPoint = Vector2.new(0.5, 1)
close.Position = UDim2.new(1, 15, 0, -3)
close.Size = UDim2.fromOffset(44, 44)
close.BackgroundColor3 = UI.red
close.Text = "X"
close.TextColor3 = Color3.new(1, 1, 1)
close.Font = Enum.Font.GothamBold
close.TextScaled = true
close.ZIndex = 88
close.Parent = panel
round(close, 7)
stroke(close, 0.25)
constrain(close, 22, 29)

local list = Instance.new("ScrollingFrame")
list.Name = "FamilyList"
list.Position = UDim2.fromOffset(6, 42)
list.Size = UDim2.new(1, -12, 1, -70)
list.BackgroundColor3 = UI.panel
list.BackgroundTransparency = 0.18
list.BorderSizePixel = 0
list.ScrollBarThickness = 3
list.AutomaticCanvasSize = Enum.AutomaticSize.Y
list.CanvasSize = UDim2.fromOffset(0, 0)
list.ZIndex = 84
list.Parent = panel
round(list, 7)

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 5)
layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = list

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 8)
padding.PaddingBottom = UDim.new(0, 8)
padding.PaddingLeft = UDim.new(0, 6)
padding.PaddingRight = UDim.new(0, 6)
padding.Parent = list

local hideInvites = false

local hideButton = Instance.new("TextButton")
hideButton.Name = "HideInvites"
hideButton.Position = UDim2.new(0, 7, 1, -24)
hideButton.Size = UDim2.new(1, -14, 0, 20)
hideButton.BackgroundTransparency = 1
hideButton.TextColor3 = UI.text
hideButton.Font = Enum.Font.GothamMedium
hideButton.TextScaled = true
hideButton.TextXAlignment = Enum.TextXAlignment.Left
hideButton.ZIndex = 85
hideButton.Parent = panel
constrain(hideButton, 9, 12)

local state = nil
local refreshing = false

local function updateHideText()
	hideButton.Text = (hideInvites and "☑ " or "■ ") .. "Hide Invites"
end
updateHideText()

local function clearList()
	for _, child in list:GetChildren() do
		if child:IsA("GuiObject") and not child:IsA("UIListLayout") and not child:IsA("UIPadding") then
			child:Destroy()
		end
	end
end

local function row(
	name: string,
	text: string,
	order: number,
	accent: Color3?,
	callback: (() -> ())?
): TextButton
	local b = Instance.new("TextButton")
	b.Name = name
	b.LayoutOrder = order
	b.Size = UDim2.new(1, 0, 0, 39)
	b.BackgroundColor3 = UI.white
	b.BackgroundTransparency = 0.06
	b.Text = text
	b.TextColor3 = UI.text
	b.Font = Enum.Font.GothamMedium
	b.TextScaled = true
	b.TextWrapped = true
	b.AutoButtonColor = callback ~= nil
	b.Active = callback ~= nil
	b.ZIndex = 85
	b.Parent = list
	round(b, 8)
	stroke(b, 0.5)
	constrain(b, 10, 14)

	if accent ~= nil then
		local badge = Instance.new("Frame")
		badge.Name = "Accent"
		badge.Position = UDim2.fromOffset(6, 8)
		badge.Size = UDim2.fromOffset(7, 23)
		badge.BackgroundColor3 = accent
		badge.ZIndex = 86
		badge.Parent = b
		round(badge, 4)
	end

	if callback then
		b.Activated:Connect(callback)
	end
	return b
end

local function fetchState(): boolean
	if refreshing then
		return false
	end
	refreshing = true
	local ok, result = pcall(function()
		return getState:InvokeServer()
	end)
	refreshing = false
	if ok and type(result) == "table" and result.ok == true then
		state = result
		return true
	end
	return false
end

local render

render = function()
	clearList()
	if type(state) ~= "table" then
		row("Unavailable", "Family unavailable", 1, nil, nil)
		return
	end

	local order = 1

	-- This is the exact empty-state structure visible in the supplied recording.
	if state.inFamily ~= true then
		row("CreateFamily", "✚  Create a Family", order, UI.green, function()
			local ok, result = pcall(function()
				return createFamily:InvokeServer()
			end)
			if ok and type(result) == "table" and result.ok == true then
				fetchState()
				render()
			end
		end)
		order += 1

		if not hideInvites then
			for _, request in state.pendingInvites or {} do
				local ownerId = tonumber(request.OwnerUserId)
				local ownerName = tostring(request.OwnerDisplayName or "Player")
				row("Invite_" .. tostring(ownerId), "Join " .. ownerName, order, UI.green, function()
					pcall(function()
						respondInvite:InvokeServer(ownerId, true)
					end)
					fetchState()
					render()
				end)
				order += 1
				row("Decline_" .. tostring(ownerId), "Decline " .. ownerName, order, UI.red, function()
					pcall(function()
						respondInvite:InvokeServer(ownerId, false)
					end)
					fetchState()
					render()
				end)
				order += 1
			end
		end
		return
	end

	for _, member in state.members or {} do
		local memberId = tonumber(member.UserId)
		local displayName = tostring(member.DisplayName or member.Name or "Player")
		local suffix = if member.IsOwner == true then "  ★" elseif member.IsSelf == true then "  (You)" else ""
		local callback = nil
		if state.isOwner == true and member.IsSelf ~= true then
			callback = function()
				pcall(function()
					removeMember:InvokeServer(memberId)
				end)
				fetchState()
				render()
			end
		end
		row(
			"Member_" .. tostring(memberId),
			displayName .. suffix,
			order,
			member.IsOwner == true and UI.green or nil,
			callback
		)
		order += 1
	end

	if state.isOwner == true then
		for _, candidate in state.candidates or {} do
			local userId = tonumber(candidate.UserId)
			local displayName = tostring(candidate.DisplayName or candidate.Name or "Player")
			local distance = tostring(candidate.Distance or "?")
			row("Candidate_" .. tostring(userId), "✚  " .. displayName .. "  •  " .. distance .. " studs", order, UI.green, function()
				pcall(function()
					invite:InvokeServer(userId)
				end)
				fetchState()
				render()
			end)
			order += 1
		end
	end

	row("LeaveFamily", state.isOwner == true and "Disband Family" or "Leave Family", order, UI.red, function()
		pcall(function()
			leave:InvokeServer()
		end)
		fetchState()
		render()
	end)
end

local function closePanel()
	gui.Enabled = false
end

close.Activated:Connect(closePanel)

hideButton.Activated:Connect(function()
	hideInvites = not hideInvites
	updateHideText()
	render()
end)

openFamily.Event:Connect(function()
	if fetchState() then
		render()
	else
		state = nil
		render()
	end
	gui.Enabled = true
end)

stateChanged.OnClientEvent:Connect(function()
	if not gui.Enabled then
		return
	end
	if fetchState() then
		render()
	end
end)
