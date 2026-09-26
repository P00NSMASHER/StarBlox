--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local PlayerSettingsService = {}
PlayerSettingsService.__index = PlayerSettingsService

local REMOTE_ROOT_NAME = "StarBloxSettings"

local BOOLEAN_DEFAULTS = table.freeze({
	SprintButton = true,
	HideUI = false,
	MuteOtherMusic = false,
	HideHouseSigns = false,
	HidePropsTool = false,
})

local BABY_CAR_SEAT_VALUES = table.freeze({
	Off = true,
	Blue = true,
	Pink = true,
})

local function ensureSettings(profileData)
	profileData.Settings = profileData.Settings or {}
	local root = profileData.Settings
	root.Brookhaven = type(root.Brookhaven) == "table" and root.Brookhaven or {}
	local settings = root.Brookhaven

	for key, defaultValue in BOOLEAN_DEFAULTS do
		if type(settings[key]) ~= "boolean" then
			settings[key] = defaultValue
		end
	end
	if type(settings.BabyCarSeat) ~= "string" or BABY_CAR_SEAT_VALUES[settings.BabyCarSeat] ~= true then
		settings.BabyCarSeat = "Off"
	end
	return settings
end

local function publicState(settings)
	return {
		SprintButton = settings.SprintButton == true,
		HideUI = settings.HideUI == true,
		BabyCarSeat = settings.BabyCarSeat,
		MuteOtherMusic = settings.MuteOtherMusic == true,
		HideHouseSigns = settings.HideHouseSigns == true,
		HidePropsTool = settings.HidePropsTool == true,
	}
end

function PlayerSettingsService.new(profiles, replicas)
	assert(profiles ~= nil, "profiles dependency is required")
	assert(replicas ~= nil, "replicas dependency is required")

	local self = setmetatable({}, PlayerSettingsService)
	self._profiles = profiles
	self._replicas = replicas

	local old = ReplicatedStorage:FindFirstChild(REMOTE_ROOT_NAME)
	if old then
		old:Destroy()
	end

	local root = Instance.new("Folder")
	root.Name = REMOTE_ROOT_NAME
	root.Parent = ReplicatedStorage
	self._root = root

	local getState = Instance.new("RemoteFunction")
	getState.Name = "GetState"
	getState.Parent = root

	local setSetting = Instance.new("RemoteFunction")
	setSetting.Name = "SetSetting"
	setSetting.Parent = root

	getState.OnServerInvoke = function(player)
		return self:_state(player)
	end
	setSetting.OnServerInvoke = function(player, key, value)
		return self:_set(player, key, value)
	end

	return self
end

function PlayerSettingsService:_state(player: Player)
	local result = nil
	self._profiles:WithProfile(player, function(data)
		result = {
			ok = true,
			settings = publicState(ensureSettings(data)),
		}
	end)
	return result or {ok = false, code = "profile_unavailable"}
end

function PlayerSettingsService:_set(player: Player, key: any, value: any)
	if type(key) ~= "string" then
		return {ok = false, code = "invalid_setting"}
	end

	local result = nil
	self._profiles:WithProfile(player, function(data)
		local settings = ensureSettings(data)

		if BOOLEAN_DEFAULTS[key] ~= nil then
			if type(value) ~= "boolean" then
				result = {ok = false, code = "invalid_setting_value"}
				return
			end
			settings[key] = value
		elseif key == "BabyCarSeat" then
			if type(value) ~= "string" or BABY_CAR_SEAT_VALUES[value] ~= true then
				result = {ok = false, code = "invalid_setting_value"}
				return
			end
			settings.BabyCarSeat = value
		else
			result = {ok = false, code = "unknown_setting"}
			return
		end

		self._replicas:Sync(player, data)
		player:SetAttribute("StarBloxSetting_" .. key, settings[key])
		result = {
			ok = true,
			settings = publicState(settings),
		}
	end)
	return result or {ok = false, code = "profile_unavailable"}
end

function PlayerSettingsService:PlayerReady(player: Player, profileData)
	local settings = ensureSettings(profileData)
	for key, value in publicState(settings) do
		player:SetAttribute("StarBloxSetting_" .. key, value)
	end
end

function PlayerSettingsService:Destroy()
	if self._root ~= nil and self._root.Parent ~= nil then
		self._root:Destroy()
	end
end

return PlayerSettingsService
