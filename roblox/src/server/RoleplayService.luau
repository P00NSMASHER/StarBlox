--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TextService = game:GetService("TextService")

local RoleplayService = {}
RoleplayService.__index = RoleplayService

local REMOTE_ROOT_NAME = "StarBloxRoleplay"
local TAG_NAME = "StarBloxRoleplayTag"

local OUTFIT_SLOT_COUNT = 4
local DESCRIPTION_NUMBER_FIELDS = table.freeze({
	"Shirt", "Pants", "GraphicTShirt", "Face",
	"Head", "Torso", "LeftArm", "RightArm", "LeftLeg", "RightLeg",
	"ClimbAnimation", "FallAnimation", "IdleAnimation", "JumpAnimation",
	"RunAnimation", "SwimAnimation", "WalkAnimation",
	"BodyTypeScale", "DepthScale", "HeadScale", "HeightScale",
	"ProportionScale", "WidthScale",
})
local DESCRIPTION_STRING_FIELDS = table.freeze({
	"BackAccessory", "FaceAccessory", "FrontAccessory", "HairAccessory",
	"HatAccessory", "NeckAccessory", "ShouldersAccessory", "WaistAccessory",
})
local DESCRIPTION_COLOR_FIELDS = table.freeze({
	"HeadColor", "LeftArmColor", "RightArmColor", "LeftLegColor",
	"RightLegColor", "TorsoColor",
})

local AVATAR_PRESETS = table.freeze({
	original = table.freeze({Label = "Original"}),
	classic = table.freeze({Label = "Classic", BodyTypeScale = 0, ProportionScale = 0, HeightScale = 1, WidthScale = 1, DepthScale = 1, HeadScale = 1}),
	compact = table.freeze({Label = "Compact", HeightScale = 0.9, WidthScale = 0.9, DepthScale = 0.9, HeadScale = 1}),
	tall = table.freeze({Label = "Tall", HeightScale = 1.05, WidthScale = 0.94, DepthScale = 0.94, HeadScale = 0.95}),
	stylized = table.freeze({Label = "Stylized", BodyTypeScale = 1, ProportionScale = 1, HeightScale = 1, WidthScale = 0.9, DepthScale = 0.9, HeadScale = 1}),
	wide = table.freeze({Label = "Wide", HeightScale = 0.96, WidthScale = 1, DepthScale = 1, HeadScale = 1}),
	petite = table.freeze({Label = "Petite", HeightScale = 0.88, WidthScale = 0.86, DepthScale = 0.86, HeadScale = 1}),
	athletic = table.freeze({Label = "Athletic", HeightScale = 1.02, WidthScale = 0.96, DepthScale = 0.96, HeadScale = 0.96}),
	slim = table.freeze({Label = "Slim", HeightScale = 1, WidthScale = 0.82, DepthScale = 0.86, HeadScale = 0.96}),
	blocky = table.freeze({Label = "Blocky", BodyTypeScale = 0, ProportionScale = 0, HeightScale = 0.98, WidthScale = 1, DepthScale = 1, HeadScale = 1}),
	hero = table.freeze({Label = "Hero", BodyTypeScale = 0.75, ProportionScale = 0.75, HeightScale = 1.04, WidthScale = 0.93, DepthScale = 0.93, HeadScale = 0.94}),
	soft = table.freeze({Label = "Soft", BodyTypeScale = 0.55, ProportionScale = 0.45, HeightScale = 0.95, WidthScale = 0.92, DepthScale = 0.92, HeadScale = 1}),
})

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
	state.AvatarOutfits = type(state.AvatarOutfits) == "table" and state.AvatarOutfits or {}
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


local function colorToTable(color: Color3)
	return {
		R = math.floor((color.R * 255) + 0.5),
		G = math.floor((color.G * 255) + 0.5),
		B = math.floor((color.B * 255) + 0.5),
	}
end

local function tableToColor(value: any): Color3?
	if type(value) ~= "table" then
		return nil
	end
	local r = tonumber(value.R)
	local g = tonumber(value.G)
	local b = tonumber(value.B)
	if r == nil or g == nil or b == nil then
		return nil
	end
	return Color3.fromRGB(
		math.clamp(math.floor(r + 0.5), 0, 255),
		math.clamp(math.floor(g + 0.5), 0, 255),
		math.clamp(math.floor(b + 0.5), 0, 255)
	)
end

local function serializeDescription(description: HumanoidDescription)
	local output = {
		Numbers = {},
		Strings = {},
		Colors = {},
	}
	for _, field in DESCRIPTION_NUMBER_FIELDS do
		local ok, value = pcall(function()
			return (description :: any)[field]
		end)
		if ok and type(value) == "number" and value == value and value ~= math.huge and value ~= -math.huge then
			output.Numbers[field] = value
		end
	end
	for _, field in DESCRIPTION_STRING_FIELDS do
		local ok, value = pcall(function()
			return (description :: any)[field]
		end)
		if ok and type(value) == "string" then
			output.Strings[field] = value
		end
	end
	for _, field in DESCRIPTION_COLOR_FIELDS do
		local ok, value = pcall(function()
			return (description :: any)[field]
		end)
		if ok and typeof(value) == "Color3" then
			output.Colors[field] = colorToTable(value)
		end
	end
	return output
end

local function hydrateDescription(saved: any): HumanoidDescription?
	if type(saved) ~= "table" then
		return nil
	end
	local description = Instance.new("HumanoidDescription")
	for field, value in type(saved.Numbers) == "table" and saved.Numbers or {} do
		if type(value) == "number" and table.find(DESCRIPTION_NUMBER_FIELDS, field) ~= nil then
			pcall(function()
				(description :: any)[field] = value
			end)
		end
	end
	for field, value in type(saved.Strings) == "table" and saved.Strings or {} do
		if type(value) == "string" and table.find(DESCRIPTION_STRING_FIELDS, field) ~= nil then
			pcall(function()
				(description :: any)[field] = value
			end)
		end
	end
	for field, value in type(saved.Colors) == "table" and saved.Colors or {} do
		if table.find(DESCRIPTION_COLOR_FIELDS, field) ~= nil then
			local color = tableToColor(value)
			if color ~= nil then
				pcall(function()
					(description :: any)[field] = color
				end)
			end
		end
	end
	return description
end

local function getHumanoid(player: Player): Humanoid?
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if humanoid and humanoid:IsA("Humanoid") then
		return humanoid
	end
	return nil
end

local function applyDescription(player: Player, description: HumanoidDescription)
	local humanoid = getHumanoid(player)
	if humanoid == nil then
		description:Destroy()
		return {ok = false, code = "character_unavailable"}
	end
	local applied, reason = pcall(function()
		humanoid:ApplyDescriptionReset(description)
	end)
	description:Destroy()
	if not applied then
		return {ok = false, code = "avatar_apply_failed", reason = tostring(reason)}
	end
	return {ok = true}
end

local function validOutfitSlot(value: any): number?
	local slot = tonumber(value)
	if slot == nil or slot ~= math.floor(slot) or slot < 1 or slot > OUTFIT_SLOT_COUNT then
		return nil
	end
	return slot
end

local function publicOutfitSlots(roleplayState)
	local slots = {}
	for slot = 1, OUTFIT_SLOT_COUNT do
		slots[slot] = roleplayState.AvatarOutfits[tostring(slot)] ~= nil
	end
	return slots
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
	local saveOutfit = Instance.new("RemoteFunction")
	saveOutfit.Name = "SaveOutfit"
	saveOutfit.Parent = root
	local loadOutfit = Instance.new("RemoteFunction")
	loadOutfit.Name = "LoadOutfit"
	loadOutfit.Parent = root
	local deleteOutfit = Instance.new("RemoteFunction")
	deleteOutfit.Name = "DeleteOutfit"
	deleteOutfit.Parent = root
	local applyAvatarPreset = Instance.new("RemoteFunction")
	applyAvatarPreset.Name = "ApplyAvatarPreset"
	applyAvatarPreset.Parent = root

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
	saveOutfit.OnServerInvoke = function(player, slot)
		return self:_saveOutfit(player, slot)
	end
	loadOutfit.OnServerInvoke = function(player, slot)
		return self:_loadOutfit(player, slot)
	end
	deleteOutfit.OnServerInvoke = function(player, slot)
		return self:_deleteOutfit(player, slot)
	end
	applyAvatarPreset.OnServerInvoke = function(player, presetId)
		return self:_applyAvatarPreset(player, presetId)
	end

	return self
end

function RoleplayService:_state(player: Player)
	local result = nil
	self._profiles:WithProfile(player, function(data)
		local rp = ensureRoleplay(data)
		local presets = {}
		for id, preset in AVATAR_PRESETS do
			table.insert(presets, {Id = id, Label = preset.Label})
		end
		table.sort(presets, function(a, b)
			return a.Label < b.Label
		end)
		result = {
			ok = true,
			jobs = JOBS,
			job = rp.Job,
			displayName = rp.DisplayName,
			age = rp.Age,
			outfitSlots = publicOutfitSlots(rp),
			avatarPresets = presets,
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


function RoleplayService:_saveOutfit(player: Player, slotValue: any)
	local slot = validOutfitSlot(slotValue)
	if slot == nil then
		return {ok = false, code = "invalid_outfit_slot"}
	end
	local humanoid = getHumanoid(player)
	if humanoid == nil then
		return {ok = false, code = "character_unavailable"}
	end
	local ok, description = pcall(function()
		return humanoid:GetAppliedDescription()
	end)
	if not ok or description == nil then
		return {ok = false, code = "avatar_unavailable"}
	end
	local serialized = serializeDescription(description)
	description:Destroy()

	local outcome = nil
	self._profiles:WithProfile(player, function(data)
		local rp = ensureRoleplay(data)
		rp.AvatarOutfits[tostring(slot)] = serialized
		self._replicas:Sync(player, data)
		outcome = {
			ok = true,
			slot = slot,
			outfitSlots = publicOutfitSlots(rp),
		}
	end)
	return outcome or {ok = false, code = "profile_unavailable"}
end

function RoleplayService:_loadOutfit(player: Player, slotValue: any)
	local slot = validOutfitSlot(slotValue)
	if slot == nil then
		return {ok = false, code = "invalid_outfit_slot"}
	end

	local saved = nil
	self._profiles:WithProfile(player, function(data)
		local rp = ensureRoleplay(data)
		saved = rp.AvatarOutfits[tostring(slot)]
	end)
	if saved == nil then
		return {ok = false, code = "outfit_slot_empty"}
	end

	local description = hydrateDescription(saved)
	if description == nil then
		return {ok = false, code = "outfit_invalid"}
	end
	local outcome = applyDescription(player, description)
	if outcome.ok == true then
		outcome.slot = slot
	end
	return outcome
end

function RoleplayService:_deleteOutfit(player: Player, slotValue: any)
	local slot = validOutfitSlot(slotValue)
	if slot == nil then
		return {ok = false, code = "invalid_outfit_slot"}
	end
	local outcome = nil
	self._profiles:WithProfile(player, function(data)
		local rp = ensureRoleplay(data)
		rp.AvatarOutfits[tostring(slot)] = nil
		self._replicas:Sync(player, data)
		outcome = {
			ok = true,
			slot = slot,
			outfitSlots = publicOutfitSlots(rp),
		}
	end)
	return outcome or {ok = false, code = "profile_unavailable"}
end

function RoleplayService:_applyAvatarPreset(player: Player, presetId: any)
	if type(presetId) ~= "string" then
		return {ok = false, code = "invalid_avatar_preset"}
	end
	local preset = AVATAR_PRESETS[presetId]
	if preset == nil then
		return {ok = false, code = "unknown_avatar_preset"}
	end

	local baseOk, description = pcall(function()
		return Players:GetHumanoidDescriptionFromUserId(player.UserId)
	end)
	if not baseOk or description == nil then
		return {ok = false, code = "avatar_unavailable"}
	end

	if presetId ~= "original" then
		for field, value in preset do
			if field ~= "Label" and type(value) == "number" then
				pcall(function()
					(description :: any)[field] = value
				end)
			end
		end
	end
	local outcome = applyDescription(player, description)
	if outcome.ok == true then
		outcome.presetId = presetId
	end
	return outcome
end

function RoleplayService:_resetAvatar(player: Player)
	local ok, description = pcall(function()
		return Players:GetHumanoidDescriptionFromUserId(player.UserId)
	end)
	if not ok or description == nil then
		return {ok = false, code = "avatar_unavailable"}
	end
	return applyDescription(player, description)
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
