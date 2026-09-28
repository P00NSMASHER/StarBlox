--!strict

local Players = game:GetService("Players")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local MobileShell = {}

MobileShell.Theme = table.freeze({
	white = Color3.fromRGB(248, 249, 250),
	surface = Color3.fromRGB(242, 245, 248),
	panel = Color3.fromRGB(245, 247, 249),
	tile = Color3.fromRGB(235, 239, 243),
	tileSelected = Color3.fromRGB(214, 233, 245),
	border = Color3.fromRGB(166, 176, 186),
	text = Color3.fromRGB(34, 39, 44),
	muted = Color3.fromRGB(91, 99, 107),
	red = Color3.fromRGB(204, 47, 47),
	green = Color3.fromRGB(67, 174, 88),
	blue = Color3.fromRGB(77, 157, 221),
	cyan = Color3.fromRGB(46, 190, 215),
	pink = Color3.fromRGB(228, 91, 157),
	dark = Color3.fromRGB(28, 34, 40),
	navy = Color3.fromRGB(31, 54, 84),
	glassTop = Color3.fromRGB(255, 255, 255),
	glassBottom = Color3.fromRGB(235, 240, 245),
	glassStroke = Color3.fromRGB(255, 255, 255),
	selected = Color3.fromRGB(211, 235, 248),
	icon = Color3.fromRGB(33, 40, 47),
	scrim = Color3.fromRGB(18, 22, 27),
})

MobileShell.Metrics = table.freeze({
	edge = 12,
	top = 8,
	radius = 12,
	button = 44,
	touch = 44,
	panelWidth = 300,
	panelTop = 64,
})

local persistent: {[string]: ScreenGui} = {}
local persistentSurfaces: {[string]: (boolean) -> ()} = {}
local overlays: {[string]: ScreenGui} = {}
local surfaceOverlays: {[string]: (boolean) -> ()} = {}
local activeOverlay: string? = nil
local suppressed = false

local function setRoleplayTagVisible(visible: boolean)
	local character = player.Character
	local head = character and character:FindFirstChild("Head")
	local tag = head and head:FindFirstChild("StarBloxRoleplayTag")
	if tag ~= nil and tag:IsA("BillboardGui") then
		tag.Enabled = visible
	end
end

local function sync()
	local showPersistent = activeOverlay == nil and not suppressed
	for _, gui in persistent do
		if gui.Parent ~= nil then
			gui.Enabled = showPersistent
		end
	end
	for _, setVisible in persistentSurfaces do
		setVisible(showPersistent)
	end
	for id, gui in overlays do
		if gui.Parent ~= nil then
			gui.Enabled = activeOverlay == id
		end
	end
	for id, setVisible in surfaceOverlays do
		setVisible(activeOverlay == id)
	end
	setRoleplayTagVisible(activeOverlay == nil)
end

function MobileShell.RegisterPersistent(id: string, gui: ScreenGui)
	persistent[id] = gui
	sync()
end

function MobileShell.RegisterPersistentSurface(id: string, setVisible: (boolean) -> ())
	persistentSurfaces[id] = setVisible
	setVisible(activeOverlay == nil and not suppressed)
	sync()
end

function MobileShell.RegisterOverlay(id: string, gui: ScreenGui)
	overlays[id] = gui
	if activeOverlay ~= id then
		gui.Enabled = false
	end
	sync()
end

function MobileShell.RegisterSurfaceOverlay(id: string, setVisible: (boolean) -> ())
	surfaceOverlays[id] = setVisible
	setVisible(activeOverlay == id)
	sync()
end

function MobileShell.Open(id: string): boolean
	if overlays[id] == nil and surfaceOverlays[id] == nil then
		return false
	end
	activeOverlay = id
	sync()
	return true
end

function MobileShell.Close(id: string)
	if activeOverlay == id then
		activeOverlay = nil
	end
	local gui = overlays[id]
	if gui ~= nil and gui.Parent ~= nil then
		gui.Enabled = false
	end
	local setVisible = surfaceOverlays[id]
	if setVisible ~= nil then
		setVisible(false)
	end
	sync()
end

function MobileShell.CloseAll()
	activeOverlay = nil
	sync()
end

function MobileShell.SetSuppressed(value: boolean)
	suppressed = value
	sync()
end

function MobileShell.ActiveOverlay(): string?
	return activeOverlay
end

function MobileShell.IsOverlayOpen(id: string): boolean
	return activeOverlay == id
end

function MobileShell.Round(object: GuiObject, radius: number?)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius or MobileShell.Metrics.radius)
	corner.Parent = object
end

function MobileShell.Stroke(
	object: GuiObject,
	color: Color3?,
	thickness: number?,
	transparency: number?
)
	local line = Instance.new("UIStroke")
	line.Color = color or MobileShell.Theme.border
	line.Thickness = thickness or 1
	line.Transparency = transparency or 0.52
	line.Parent = object
	return line
end

function MobileShell.Glass(object: GuiObject, radius: number?)
	MobileShell.Round(object, radius)
	local line = MobileShell.Stroke(
		object,
		MobileShell.Theme.glassStroke,
		1,
		0.52
	)
	line.Name = "GlassStroke"

	local gradient = Instance.new("UIGradient")
	gradient.Name = "GlassGradient"
	gradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, MobileShell.Theme.glassTop),
		ColorSequenceKeypoint.new(1, MobileShell.Theme.glassBottom),
	})
	gradient.Rotation = 90
	gradient.Parent = object
end

function MobileShell.ApplyModalCard(frame: Frame, radius: number?)
	frame.BackgroundColor3 = MobileShell.Theme.white
	frame.BackgroundTransparency = 0.04
	MobileShell.Glass(frame, radius or 14)
end

function MobileShell.ApplyScrim(frame: Frame, transparency: number?)
	frame.BackgroundColor3 = MobileShell.Theme.scrim
	frame.BackgroundTransparency = transparency or 0.30
	frame.BorderSizePixel = 0
end

function MobileShell.MakeCloseButton(parent: GuiObject, size: number?): TextButton
	local button = Instance.new("TextButton")
	button.Name = "Close"
	button.AnchorPoint = Vector2.new(1, 0)
	button.Position = UDim2.new(1, -8, 0, 8)
	button.Size = UDim2.fromOffset(size or 34, size or 34)
	button.BackgroundColor3 = MobileShell.Theme.red
	button.BackgroundTransparency = 0.02
	button.Text = "×"
	button.TextColor3 = Color3.new(1, 1, 1)
	button.Font = Enum.Font.GothamBold
	button.TextSize = 20
	button.ZIndex = parent.ZIndex + 2
	button.Parent = parent
	MobileShell.Round(button, 10)
	MobileShell.Stroke(button, Color3.fromRGB(150, 38, 38), 1, 0.35)
	return button
end

player.CharacterAdded:Connect(function()
	task.defer(sync)
end)

return MobileShell
