--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local QuickChatService = {}
QuickChatService.__index = QuickChatService

local REMOTE_ROOT_NAME = "StarBloxQuickChat"
local COOLDOWN_SECONDS = 10

local OPTIONS = table.freeze({
	Phrases = table.freeze({
		"Thank you",
		"Sorry",
		"Ready to go",
		"Be my parent",
		"Be my child",
		"Follow me",
		"Look here",
		"Stop",
	}),
	Emojis = table.freeze({
		"😁", "😂", "😭", "❤️", "👍", "👎", "😡", "💀", "🤨",
		"💤", "😎", "🤓", "🥱", "🤡", "🥀", "💩", "👏",
	}),
})

local ALLOWED = {}
for _, values in OPTIONS do
	for _, value in values do
		ALLOWED[value] = true
	end
end

function QuickChatService.new()
	local self = setmetatable({}, QuickChatService)
	self._lastSentAt = {}

	local old = ReplicatedStorage:FindFirstChild(REMOTE_ROOT_NAME)
	if old then
		old:Destroy()
	end

	local root = Instance.new("Folder")
	root.Name = REMOTE_ROOT_NAME
	root:SetAttribute("CooldownSeconds", COOLDOWN_SECONDS)
	root.Parent = ReplicatedStorage

	local getOptions = Instance.new("RemoteFunction")
	getOptions.Name = "GetOptions"
	getOptions.Parent = root

	local send = Instance.new("RemoteFunction")
	send.Name = "Send"
	send.Parent = root

	local message = Instance.new("RemoteEvent")
	message.Name = "Message"
	message.Parent = root

	self._root = root
	self._message = message

	getOptions.OnServerInvoke = function(_player)
		return {
			ok = true,
			cooldownSeconds = COOLDOWN_SECONDS,
			categories = {
				Phrases = table.clone(OPTIONS.Phrases),
				Emojis = table.clone(OPTIONS.Emojis),
			},
		}
	end

	send.OnServerInvoke = function(player, value)
		return self:_send(player, value)
	end

	return self
end

function QuickChatService:_send(player: Player, value: any)
	if type(value) ~= "string" or ALLOWED[value] ~= true then
		return {ok = false, code = "invalid_quick_chat"}
	end

	local now = os.clock()
	local previous = self._lastSentAt[player] or -math.huge
	local elapsed = now - previous
	if elapsed < COOLDOWN_SECONDS then
		return {
			ok = false,
			code = "quick_chat_cooldown",
			remainingSeconds = math.ceil(COOLDOWN_SECONDS - elapsed),
		}
	end

	self._lastSentAt[player] = now
	self._message:FireAllClients({
		userId = player.UserId,
		name = player.Name,
		displayName = player.DisplayName,
		text = value,
	})
	return {
		ok = true,
		cooldownSeconds = COOLDOWN_SECONDS,
	}
end

function QuickChatService:PlayerRemoving(player: Player)
	self._lastSentAt[player] = nil
end

function QuickChatService:Destroy()
	self._lastSentAt = {}
	if self._root ~= nil and self._root.Parent ~= nil then
		self._root:Destroy()
	end
end

return QuickChatService
