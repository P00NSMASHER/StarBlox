--!strict

local Players = game:GetService("Players")

export type Profile = {
	Data: {[string]: any},
	AddUserId: (self: Profile, userId: number) -> (),
	Reconcile: (self: Profile) -> (),
	EndSession: (self: Profile) -> (),
	IsActive: (self: Profile) -> boolean,
	OnSessionEnd: {
		Connect: (self: any, callback: () -> ()) -> any,
	},
}

export type ProfileStoreLike = {
	StartSessionAsync: (self: ProfileStoreLike, key: string, options: {[string]: any}?) -> Profile?,
}

export type ProfileStoreModuleLike = {
	New: (name: string, template: {[string]: any}) -> ProfileStoreLike,
}

local ProfileSessionService = {}
ProfileSessionService.__index = ProfileSessionService

function ProfileSessionService.new(profileStoreModule: ProfileStoreModuleLike, profileTemplate: {[string]: any})
	assert(profileStoreModule ~= nil, "ProfileStore module is required")
	assert(profileTemplate ~= nil, "profile template is required")

	local self = setmetatable({}, ProfileSessionService)
	self._store = profileStoreModule.New("StarBloxPlayer_v1", profileTemplate)
	self._profiles = {}
	return self
end

function ProfileSessionService:Load(player: Player): Profile?
	local existing = self._profiles[player]
	if existing ~= nil and existing:IsActive() then
		return existing
	end

	local profile = self._store:StartSessionAsync(tostring(player.UserId), {
		Cancel = function()
			return player.Parent ~= Players
		end,
	})

	if profile == nil then
		return nil
	end

	profile:AddUserId(player.UserId)
	profile:Reconcile()

	profile.OnSessionEnd:Connect(function()
		if self._profiles[player] == profile then
			self._profiles[player] = nil
		end
	end)

	if player.Parent ~= Players then
		profile:EndSession()
		return nil
	end

	self._profiles[player] = profile
	return profile
end

function ProfileSessionService:Get(player: Player): Profile?
	local profile = self._profiles[player]
	if profile ~= nil and profile:IsActive() then
		return profile
	end
	return nil
end

function ProfileSessionService:WithProfile(player: Player, callback: (data: {[string]: any}) -> ()): boolean
	local profile = self:Get(player)
	if profile == nil then
		return false
	end

	callback(profile.Data)
	return true
end

function ProfileSessionService:Release(player: Player)
	local profile = self._profiles[player]
	if profile ~= nil then
		self._profiles[player] = nil
		profile:EndSession()
	end
end

function ProfileSessionService:ReleaseAll()
	for player, profile in self._profiles do
		self._profiles[player] = nil
		profile:EndSession()
	end
end

return ProfileSessionService
