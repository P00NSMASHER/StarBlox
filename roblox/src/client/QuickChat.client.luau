--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TextChatService = game:GetService("TextChatService")

local remotes = ReplicatedStorage:WaitForChild("StarBloxQuickChat")
local message = remotes:WaitForChild("Message") :: RemoteEvent

local function removeExisting(head: BasePart)
	local existing = head:FindFirstChild("StarBloxQuickChatBubble")
	if existing then
		existing:Destroy()
	end
end

local function showBubble(sender: Player, text: string)
	local character = sender.Character
	local head = character and character:FindFirstChild("Head")
	if head == nil or not head:IsA("BasePart") then
		return
	end

	removeExisting(head)

	local bubble = Instance.new("BillboardGui")
	bubble.Name = "StarBloxQuickChatBubble"
	bubble.Size = UDim2.fromOffset(220, 54)
	bubble.StudsOffsetWorldSpace = Vector3.new(0, 3.75, 0)
	bubble.AlwaysOnTop = true
	bubble.MaxDistance = 120
	bubble.Adornee = head
	bubble.Parent = head

	local frame = Instance.new("Frame")
	frame.Size = UDim2.fromScale(1, 1)
	frame.BackgroundColor3 = Color3.fromRGB(69, 171, 235)
	frame.BackgroundTransparency = 0.08
	frame.BorderSizePixel = 0
	frame.Parent = bubble

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, 12)
	corner.Parent = frame

	local stroke = Instance.new("UIStroke")
	stroke.Color = Color3.fromRGB(160, 220, 255)
	stroke.Thickness = 1.5
	stroke.Transparency = 0.15
	stroke.Parent = frame

	local bolt = Instance.new("TextLabel")
	bolt.Name = "QuickChatMark"
	bolt.Position = UDim2.fromOffset(7, 4)
	bolt.Size = UDim2.fromOffset(26, 46)
	bolt.BackgroundTransparency = 1
	bolt.Text = "⚡"
	bolt.TextColor3 = Color3.fromRGB(255, 224, 91)
	bolt.Font = Enum.Font.GothamBold
	bolt.TextScaled = true
	bolt.Parent = frame

	local label = Instance.new("TextLabel")
	label.Name = "Message"
	label.Position = UDim2.fromOffset(36, 5)
	label.Size = UDim2.new(1, -44, 1, -10)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = Color3.new(1, 1, 1)
	label.TextStrokeTransparency = 0.8
	label.Font = Enum.Font.GothamMedium
	label.TextScaled = true
	label.TextWrapped = true
	label.Parent = frame

	local limit = Instance.new("UITextSizeConstraint")
	limit.MinTextSize = 12
	limit.MaxTextSize = 18
	limit.Parent = label

	task.delay(4.5, function()
		if bubble.Parent ~= nil then
			bubble:Destroy()
		end
	end)
end

local function showLog(sender: Player, text: string)
	local channels = TextChatService:FindFirstChild("TextChannels")
	local general = channels and channels:FindFirstChild("RBXGeneral")
	if general and general:IsA("TextChannel") then
		pcall(function()
			general:DisplaySystemMessage(
				string.format("[Quick Chat] %s: %s", sender.DisplayName, text)
			)
		end)
	end
end

message.OnClientEvent:Connect(function(payload)
	if type(payload) ~= "table" then
		return
	end
	local userId = tonumber(payload.userId)
	local text = payload.text
	if userId == nil or type(text) ~= "string" then
		return
	end

	local sender = Players:GetPlayerByUserId(userId)
	if sender == nil then
		return
	end

	showBubble(sender, text)
	showLog(sender, text)
end)
