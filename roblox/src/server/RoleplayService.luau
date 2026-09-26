--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TextService = game:GetService("TextService")

local RoleplayService = {}
RoleplayService.__index = RoleplayService

local REMOTE_ROOT_NAME = "StarBloxRoleplay"
local TAG_NAME = "StarBloxRoleplayTag"

local JOBS = table.freeze({
	"Citizen",
	"Student",
	"Teacher",
	"Police Officer",
	"Firefighter",
	"Doctor",
	"Nurse",
	"Chef",
	"Mechanic",
	"News Reporter",
	"Taxi Driver",
	"Parent",
})

local JOB_SET = {}
for _, job in JOBS do
	JOB_SET[job] = true
end

local function ensureRoleplay(profileData)
	profileData.Social = profileData.Social or {}
	profileData.Social.Roleplay = profileData.Social.Roleplay or {
		DisplayName = "",
		Age = "",
		Job = "Citizen",
	}
	local state = profileData.Social.Roleplay
	state.DisplayName = type(state.DisplayName) == "string" and state.DisplayName or ""
	state.Age = type(state.Age) == "string" and state.Age or ""
	state.Job = type(state.Job) == "string" and JOB_SET[state.Job] == true and state.Job or "Citizen"
	return state
end

local function cleanAge(value: any): string?
	if type(value) ~= "string" and type(value) ~= "number" then
		return nil
	end
	local text = tostring(value)
	if #text > 3 then
		return nil
	end
	if string.match(text, "^%d+$") == nil then
		return nil
	end
	local age = tonumber(text)
	if age == nil or age < 1 or age > 120 then
		return nil
	end
	return tostring(math.floor(age))
end

local function filterDisplayName(player: Player, value: any): string?
	if type(value) ~= "string" then
		return nil
	end
	local trimmed = string.gsub(value, "^%s*(.-)%s*$", "%1")
	if trimmed == "" then
		return ""
	end
	if #trimmed > 24 then
		return nil
	end

	local ok, result = pcall(function()
		local filter = TextService:FilterStringAsync(trimmed, player.UserId)
		return filter:GetNonChatStringForBroadcastAsync()
	end)
	if not ok or type(result) ~= "string" then
		return nil
	end
	return string.sub(result, 1, 24)
end

local function attachTag(player: Player, character: Model, roleplayState)
	local head = character:WaitForChild("Head", 5)
	if head == nil or not head:IsA("BasePart") then
		return
	end

	local existing = head:FindFirstChild(TAG_NAME)
	if existing then
		existing:Destroy()
	end

	local billboard = Instance.new("BillboardGui")
	billboard.Name = TAG_NAME
	billboard.Size = UDim2.fromOffset(180, 42)
	billboard.StudsOffsetWorldSpace = Vector3.new(0, 2.9, 0)
	billboard.AlwaysOnTop = false
	billboard.MaxDistance = 90
	billboard.Adornee = head
	billboard.Parent = head

	local nameLabel = Instance.new("TextLabel")
	nameLabel.Name = "RoleplayName"
	nameLabel.Size = UDim2.new(1, 0, 0, 22)
	nameLabel.BackgroundTransparency = 1
	nameLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
	nameLabel.TextStrokeTransparency = 0.6
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.TextScaled = true
	nameLabel.Text = roleplayState.DisplayName ~= "" and roleplayState.DisplayName or player.DisplayName
	nameLabel.Parent = billboard

	local detail = Instance.new("TextLabel")
	detail.Name = "RoleplayDetail"
	detail.Position = UDim2.fromOffset(0, 22)
	detail.Size = UDim2.new(1, 0, 0, 18)
	detail.BackgroundTransparency = 1
	detail.TextColor3 = Color3.fromRGB(225, 230, 242)
	detail.TextStrokeTransparency = 0.7
	detail.Font = Enum.Font.GothamMedium
	detail.TextScaled = true
	local ageText = roleplayState.Age ~= "" and (" • Age " .. roleplayState.Age) or ""
	detail.Text = roleplayState.Job .. ageText
	detail.Parent = billboard
end

function RoleplayService.new(profiles, replicas)
	assert(profiles ~= nil, "profiles dependency is required")
	assert(replicas ~= nil, "replicas dependency is required")

	local self = setmetatable({}, RoleplayService)
	self._profiles = profiles
	self._replicas = replicas
	self._characterConnections = {}

	local old = ReplicatedStorage:FindFirstChild(REMOTE_ROOT_NAME)
	if old then
		old:Destroy()
	end

	local root = Instance.new("Folder")
	root.Name = REMOTE_ROOT_NAME
	root.Parent = ReplicatedStorage

	local getState = Instance.new("RemoteFunction")
	getState.Name = "GetState"
	getState.Parent = root
	local setJob = Instance.new("RemoteFunction")
	setJob.Name = "SetJob"
	setJob.Parent = root
	local saveBio = Instance.new("RemoteFunction")
	saveBio.Name = "SaveBio"
	saveBio.Parent = root
	local resetAvatar = Instance.new("RemoteFunction")
	resetAvatar.Name = "ResetAvatar"
	resetAvatar.Parent = root

	getState.OnServerInvoke = function(player)
		return self:_state(player)
	end
	setJob.OnServerInvoke = function(player, job)
		return self:_setJob(player, job)
	end
	saveBio.OnServerInvoke = function(player, displayName, age)
		return self:_saveBio(player, displayName, age)
	end
	resetAvatar.OnServerInvoke = function(player)
		return self:_resetAvatar(player)
	end

	return self
end

function RoleplayService:_state(player: Player)
	local result = nil
	self._profiles:WithProfile(player, function(data)
		local rp = ensureRoleplay(data)
		result = {
			ok = true,
			jobs = JOBS,
			job = rp.Job,
			displayName = rp.DisplayName,
			age = rp.Age,
		}
	end)
	return result or {ok = false, code = "profile_unavailable"}
end

function RoleplayService:_refreshTag(player: Player)
	local character = player.Character
	if character == nil then
		return
	end
	self._profiles:WithProfile(player, function(data)
		attachTag(player, character, ensureRoleplay(data))
	end)
end

function RoleplayService:_setJob(player: Player, job: any)
	if type(job) ~= "string" or JOB_SET[job] ~= true then
		return {ok = false, code = "invalid_job"}
	end

	local success = false
	self._profiles:WithProfile(player, function(data)
		local rp = ensureRoleplay(data)
		rp.Job = job
		self._replicas:Sync(player, data)
		player:SetAttribute("StarBloxJob", job)
		success = true
	end)
	if not success then
		return {ok = false, code = "profile_unavailable"}
	end
	self:_refreshTag(player)
	return {ok = true, job = job}
end

function RoleplayService:_saveBio(player: Player, displayName: any, ageValue: any)
	local filteredName = filterDisplayName(player, displayName)
	local clean = cleanAge(ageValue)
	if filteredName == nil or clean == nil then
		return {ok = false, code = "invalid_bio"}
	end

	local success = false
	self._profiles:WithProfile(player, function(data)
		local rp = ensureRoleplay(data)
		rp.DisplayName = filteredName
		rp.Age = clean
		self._replicas:Sync(player, data)
		player:SetAttribute("StarBloxRoleplayName", filteredName)
		player:SetAttribute("StarBloxRoleplayAge", clean)
		success = true
	end)
	if not success then
		return {ok = false, code = "profile_unavailable"}
	end
	self:_refreshTag(player)
	return {ok = true, displayName = filteredName, age = clean}
end

function RoleplayService:_resetAvatar(player: Player)
	local ok, description = pcall(function()
		return Players:GetHumanoidDescriptionFromUserId(player.UserId)
	end)
	if not ok or description == nil then
		return {ok = false, code = "avatar_unavailable"}
	end

	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if humanoid == nil then
		return {ok = false, code = "character_unavailable"}
	end

	local applied, reason = pcall(function()
		humanoid:ApplyDescriptionReset(description)
	end)
	if not applied then
		return {ok = false, code = "avatar_apply_failed", reason = tostring(reason)}
	end
	return {ok = true}
end

function RoleplayService:PlayerReady(player: Player, profileData)
	local rp = ensureRoleplay(profileData)
	player:SetAttribute("StarBloxJob", rp.Job)
	player:SetAttribute("StarBloxRoleplayName", rp.DisplayName)
	player:SetAttribute("StarBloxRoleplayAge", rp.Age)

	local previous = self._characterConnections[player]
	if previous then
		previous:Disconnect()
	end
	self._characterConnections[player] = player.CharacterAdded:Connect(function(character)
		task.defer(function()
			attachTag(player, character, rp)
		end)
	end)

	if player.Character ~= nil then
		task.defer(function()
			attachTag(player, player.Character :: Model, rp)
		end)
	end
end

function RoleplayService:PlayerRemoving(player: Player)
	local connection = self._characterConnections[player]
	if connection then
		connection:Disconnect()
		self._characterConnections[player] = nil
	end
end

function RoleplayService:Destroy()
	for player, connection in self._characterConnections do
		connection:Disconnect()
		self._characterConnections[player] = nil
	end
end

return RoleplayService
