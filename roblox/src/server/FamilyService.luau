--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local FamilyService = {}
FamilyService.__index = FamilyService

local REMOTE_ROOT_NAME = "StarBloxFamily"
local INVITE_TTL_SECONDS = 60
local INVITE_DISTANCE_STUDS = 90

local function playerRoot(player: Player): BasePart?
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if root and root:IsA("BasePart") then
		return root
	end
	return nil
end

local function distanceBetween(a: Player, b: Player): number?
	local aRoot = playerRoot(a)
	local bRoot = playerRoot(b)
	if aRoot == nil or bRoot == nil then
		return nil
	end
	return (aRoot.Position - bRoot.Position).Magnitude
end

function FamilyService.new()
	local self = setmetatable({}, FamilyService)
	self._ownerByPlayer = {}
	self._membersByOwner = {}
	self._pendingInvites = {}

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

	local invite = Instance.new("RemoteFunction")
	invite.Name = "Invite"
	invite.Parent = root

	local respondInvite = Instance.new("RemoteFunction")
	respondInvite.Name = "RespondInvite"
	respondInvite.Parent = root

	local leave = Instance.new("RemoteFunction")
	leave.Name = "Leave"
	leave.Parent = root

	local removeMember = Instance.new("RemoteFunction")
	removeMember.Name = "RemoveMember"
	removeMember.Parent = root

	local stateChanged = Instance.new("RemoteEvent")
	stateChanged.Name = "StateChanged"
	stateChanged.Parent = root

	self._stateChanged = stateChanged

	getState.OnServerInvoke = function(player)
		return self:_state(player)
	end
	invite.OnServerInvoke = function(player, targetUserId)
		return self:_invite(player, targetUserId)
	end
	respondInvite.OnServerInvoke = function(player, ownerUserId, accept)
		return self:_respondInvite(player, ownerUserId, accept)
	end
	leave.OnServerInvoke = function(player)
		return self:_leave(player)
	end
	removeMember.OnServerInvoke = function(player, targetUserId)
		return self:_removeMember(player, targetUserId)
	end

	return self
end

function FamilyService:_cleanupInvitesFor(target: Player)
	local pending = self._pendingInvites[target]
	if pending == nil then
		return
	end
	local now = os.clock()
	for owner, expiresAt in pending do
		if owner.Parent ~= Players or expiresAt <= now then
			pending[owner] = nil
		end
	end
	if next(pending) == nil then
		self._pendingInvites[target] = nil
	end
end

function FamilyService:_familyOwner(player: Player): Player?
	local owner = self._ownerByPlayer[player]
	if owner ~= nil and owner.Parent ~= Players then
		self._ownerByPlayer[player] = nil
		return nil
	end
	return owner
end

function FamilyService:_ensureOwner(owner: Player)
	local existingOwner = self:_familyOwner(owner)
	if existingOwner ~= nil and existingOwner ~= owner then
		return nil
	end
	self._ownerByPlayer[owner] = owner
	local members = self._membersByOwner[owner]
	if members == nil then
		members = {}
		self._membersByOwner[owner] = members
	end
	members[owner] = true
	return members
end

function FamilyService:_notify(player: Player)
	if player.Parent == Players then
		self._stateChanged:FireClient(player)
	end
end

function FamilyService:_notifyFamily(owner: Player?)
	if owner == nil then
		return
	end
	local members = self._membersByOwner[owner]
	if members == nil then
		self:_notify(owner)
		return
	end
	for member in members do
		self:_notify(member)
	end
end

function FamilyService:_removeFromCurrentFamily(player: Player)
	local owner = self:_familyOwner(player)
	if owner == nil then
		return
	end
	local members = self._membersByOwner[owner]
	if owner == player then
		if members ~= nil then
			for member in members do
				self._ownerByPlayer[member] = nil
				if member ~= player then
					self:_notify(member)
				end
			end
		end
		self._membersByOwner[owner] = nil
	else
		if members ~= nil then
			members[player] = nil
		end
		self._ownerByPlayer[player] = nil
		self:_notifyFamily(owner)
	end
end

function FamilyService:_state(player: Player)
	self:_cleanupInvitesFor(player)
	local owner = self:_familyOwner(player)
	local familyMembers = {}
	if owner ~= nil then
		local members = self._membersByOwner[owner] or {}
		for member in members do
			if member.Parent == Players then
				table.insert(familyMembers, {
					UserId = member.UserId,
					DisplayName = member.DisplayName,
					Name = member.Name,
					IsOwner = member == owner,
					IsSelf = member == player,
				})
			end
		end
		table.sort(familyMembers, function(a, b)
			if a.IsOwner ~= b.IsOwner then
				return a.IsOwner
			end
			return string.lower(a.DisplayName) < string.lower(b.DisplayName)
		end)
	end

	local pendingInvites = {}
	for inviteOwner, expiresAt in self._pendingInvites[player] or {} do
		if inviteOwner.Parent == Players and expiresAt > os.clock() then
			table.insert(pendingInvites, {
				OwnerUserId = inviteOwner.UserId,
				OwnerDisplayName = inviteOwner.DisplayName,
			})
		end
	end

	local candidates = {}
	local currentOwner = owner
	for _, candidate in Players:GetPlayers() do
		if candidate ~= player and self:_familyOwner(candidate) == nil then
			local distance = distanceBetween(player, candidate)
			if distance ~= nil and distance <= INVITE_DISTANCE_STUDS then
				table.insert(candidates, {
					UserId = candidate.UserId,
					DisplayName = candidate.DisplayName,
					Name = candidate.Name,
					Distance = math.floor(distance + 0.5),
				})
			end
		end
	end
	table.sort(candidates, function(a, b)
		if a.Distance ~= b.Distance then
			return a.Distance < b.Distance
		end
		return string.lower(a.DisplayName) < string.lower(b.DisplayName)
	end)

	return {
		ok = true,
		inFamily = currentOwner ~= nil,
		isOwner = currentOwner == player,
		ownerUserId = if currentOwner then currentOwner.UserId else nil,
		members = familyMembers,
		pendingInvites = pendingInvites,
		candidates = candidates,
		inviteRadius = INVITE_DISTANCE_STUDS,
	}
end

function FamilyService:_invite(player: Player, targetUserId: any)
	local parsed = tonumber(targetUserId)
	if parsed == nil or parsed ~= math.floor(parsed) then
		return {ok = false, code = "invalid_target"}
	end
	local target = Players:GetPlayerByUserId(parsed)
	if target == nil or target == player then
		return {ok = false, code = "target_unavailable"}
	end

	local distance = distanceBetween(player, target)
	if distance == nil or distance > INVITE_DISTANCE_STUDS then
		return {ok = false, code = "target_not_nearby"}
	end

	local owner = self:_familyOwner(player)
	if owner ~= nil and owner ~= player then
		return {ok = false, code = "owner_only"}
	end
	if self:_familyOwner(target) ~= nil then
		return {ok = false, code = "target_in_family"}
	end

	local members = self:_ensureOwner(player)
	if members == nil then
		return {ok = false, code = "owner_only"}
	end

	local pending = self._pendingInvites[target]
	if pending == nil then
		pending = {}
		self._pendingInvites[target] = pending
	end
	pending[player] = os.clock() + INVITE_TTL_SECONDS
	self:_notify(target)
	self:_notify(player)
	return {ok = true, targetUserId = target.UserId}
end

function FamilyService:_respondInvite(player: Player, ownerUserId: any, accept: any)
	local parsed = tonumber(ownerUserId)
	if parsed == nil or parsed ~= math.floor(parsed) or type(accept) ~= "boolean" then
		return {ok = false, code = "invalid_response"}
	end

	self:_cleanupInvitesFor(player)
	local inviteOwner = Players:GetPlayerByUserId(parsed)
	local pending = self._pendingInvites[player]
	if inviteOwner == nil or pending == nil or pending[inviteOwner] == nil then
		return {ok = false, code = "invite_unavailable"}
	end
	pending[inviteOwner] = nil
	if next(pending) == nil then
		self._pendingInvites[player] = nil
	end

	if not accept then
		self:_notify(inviteOwner)
		self:_notify(player)
		return {ok = true, accepted = false}
	end

	local ownerMembers = self:_ensureOwner(inviteOwner)
	if ownerMembers == nil then
		return {ok = false, code = "invite_owner_unavailable"}
	end
	self:_removeFromCurrentFamily(player)
	ownerMembers[player] = true
	self._ownerByPlayer[player] = inviteOwner
	self:_notifyFamily(inviteOwner)
	return {ok = true, accepted = true, ownerUserId = inviteOwner.UserId}
end

function FamilyService:_leave(player: Player)
	local owner = self:_familyOwner(player)
	if owner == nil then
		return {ok = true, duplicate = true}
	end
	self:_removeFromCurrentFamily(player)
	self:_notify(player)
	return {ok = true}
end

function FamilyService:_removeMember(player: Player, targetUserId: any)
	local owner = self:_familyOwner(player)
	if owner ~= player then
		return {ok = false, code = "owner_only"}
	end
	local parsed = tonumber(targetUserId)
	if parsed == nil or parsed ~= math.floor(parsed) then
		return {ok = false, code = "invalid_target"}
	end
	local target = Players:GetPlayerByUserId(parsed)
	if target == nil or target == player or self:_familyOwner(target) ~= player then
		return {ok = false, code = "not_family_member"}
	end

	local members = self._membersByOwner[player]
	if members then
		members[target] = nil
	end
	self._ownerByPlayer[target] = nil
	self:_notify(target)
	self:_notifyFamily(player)
	return {ok = true}
end

function FamilyService:PlayerRemoving(player: Player)
	for target, pending in self._pendingInvites do
		pending[player] = nil
		if target == player or next(pending) == nil then
			self._pendingInvites[target] = nil
		end
	end
	self:_removeFromCurrentFamily(player)
	self._ownerByPlayer[player] = nil
	self._membersByOwner[player] = nil
end

function FamilyService:Destroy()
	self._ownerByPlayer = {}
	self._membersByOwner = {}
	self._pendingInvites = {}
	local root = ReplicatedStorage:FindFirstChild(REMOTE_ROOT_NAME)
	if root then
		root:Destroy()
	end
end

return FamilyService
