--!strict

local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")

local AuthoritativeActionService = {}
AuthoritativeActionService.__index = AuthoritativeActionService

local DEFAULTS = {
	HistoryWindowSeconds = 1.0,
	MaxClientLeadSeconds = 0.15,
	MaxClientLagSeconds = 1.2,
	MinDt = 0.002,
	MaxDt = 0.1,
	MaxMoveMagnitude = 1.001,
	ProcessedFireLimit = 256,
}

local FORBIDDEN_INPUT_FIELDS = {
	Position = true,
	Velocity = true,
	Health = true,
	Damage = true,
	Target = true,
	TargetId = true,
	Score = true,
	Outcome = true,
}

local function finite(value): boolean
	return type(value) == "number" and value == value and value ~= math.huge and value ~= -math.huge
end

local function positiveInteger(value): boolean
	return finite(value) and value >= 0 and math.floor(value) == value
end

local function cleanId(value, maxLength: number): string?
	if type(value) ~= "string" then
		return nil
	end
	local clean = string.gsub(value, "^%s*(.-)%s*$", "%1")
	if clean == "" or #clean > maxLength then
		return nil
	end
	return clean
end

local function hasOutcomeFields(payload): string?
	for key in payload do
		if FORBIDDEN_INPUT_FIELDS[key] then
			return tostring(key)
		end
	end
	return nil
end

local function pushSnapshot(state, snapshot, now: number, windowSeconds: number)
	table.insert(state.History, {
		Time = now,
		Position = snapshot.Position,
		Velocity = snapshot.Velocity,
		Health = snapshot.Health,
	})

	local cutoff = now - windowSeconds
	while #state.History > 2 and state.History[1].Time < cutoff do
		table.remove(state.History, 1)
	end
end

local function sampleHistory(state, atTime: number)
	local history = state.History
	if #history == 0 then
		return nil
	end
	if atTime <= history[1].Time then
		return history[1]
	end
	if atTime >= history[#history].Time then
		return history[#history]
	end

	for index = 2, #history do
		local after = history[index]
		if after.Time >= atTime then
			local before = history[index - 1]
			local span = after.Time - before.Time
			local alpha = if span > 0 then math.clamp((atTime - before.Time) / span, 0, 1) else 0
			return {
				Time = atTime,
				Position = before.Position:Lerp(after.Position, alpha),
				Velocity = before.Velocity:Lerp(after.Velocity, alpha),
				Health = if alpha < 0.5 then before.Health else after.Health,
			}
		end
	end
	return history[#history]
end

local function pointRayDistance(origin: Vector3, direction: Vector3, maxRange: number, point: Vector3)
	local offset = point - origin
	local along = offset:Dot(direction)
	if along < 0 or along > maxRange then
		return nil
	end
	local closest = origin + direction * along
	return along, (point - closest).Magnitude
end

local function safeSnapshot(raw)
	if type(raw) ~= "table" then
		return nil
	end
	if typeof(raw.Position) ~= "Vector3" or typeof(raw.Velocity) ~= "Vector3" or not finite(raw.Health) then
		return nil
	end
	return {
		Position = raw.Position,
		Velocity = raw.Velocity,
		Health = math.max(0, raw.Health),
	}
end

function AuthoritativeActionService.new(adapters, telemetrySink)
	local self = setmetatable({}, AuthoritativeActionService)
	self._adapters = adapters or {}
	self._telemetry = telemetrySink
	self._states = {}
	self._processedFire = {}
	self._config = table.clone(DEFAULTS)
	for key, value in self._adapters.Config or {} do
		if self._config[key] ~= nil and finite(value) then
			self._config[key] = value
		end
	end
	return self
end

function AuthoritativeActionService:_state(player: Player)
	local current = self._states[player]
	if current then
		return current
	end

	local now = Workspace:GetServerTimeNow()
	local snapshot = nil
	if self._adapters.GetPlayerState then
		local ok, value = pcall(function()
			return self._adapters.GetPlayerState(player)
		end)
		if ok then
			snapshot = safeSnapshot(value)
		end
	end
	snapshot = snapshot or {
		Position = Vector3.zero,
		Velocity = Vector3.zero,
		Health = 100,
	}

	current = {
		LastSeq = -1,
		LastClientTime = nil,
		LastFireSeq = -1,
		LastFireAt = {},
		History = {},
	}
	pushSnapshot(current, snapshot, now, self._config.HistoryWindowSeconds)
	self._states[player] = current
	return current
end

function AuthoritativeActionService:RecordSnapshot(player: Player)
	if self._adapters.GetPlayerState == nil then
		return false, "action state adapter unavailable"
	end
	local ok, raw = pcall(function()
		return self._adapters.GetPlayerState(player)
	end)
	if not ok then
		return false, "action state adapter failed"
	end
	local snapshot = safeSnapshot(raw)
	if snapshot == nil then
		return false, "action state adapter returned invalid state"
	end
	local state = self:_state(player)
	pushSnapshot(state, snapshot, Workspace:GetServerTimeNow(), self._config.HistoryWindowSeconds)
	return true, snapshot
end

function AuthoritativeActionService:SubmitInput(player: Player, payload)
	if type(payload) ~= "table" then
		return false, "action input must be a table"
	end
	local forbidden = hasOutcomeFields(payload)
	if forbidden then
		return false, "client-authored action outcome field: " .. forbidden
	end
	if self._adapters.ApplyInput == nil then
		return false, "server movement adapter unavailable"
	end

	local seq = payload.Seq
	local clientTime = payload.ClientTime
	local dt = payload.Dt
	local moveX = payload.MoveX
	local moveZ = payload.MoveZ
	if not positiveInteger(seq) or not finite(clientTime) or not finite(dt)
		or not finite(moveX) or not finite(moveZ) then
		return false, "invalid action input"
	end

	local state = self:_state(player)
	if seq <= state.LastSeq then
		return false, "stale or duplicate action sequence"
	end

	local now = Workspace:GetServerTimeNow()
	if clientTime > now + self._config.MaxClientLeadSeconds then
		return false, "client action is too far ahead"
	end
	if clientTime < now - self._config.MaxClientLagSeconds then
		return false, "client action is too old"
	end
	if dt < self._config.MinDt or dt > self._config.MaxDt then
		return false, "action dt outside server bounds"
	end
	if Vector2.new(moveX, moveZ).Magnitude > self._config.MaxMoveMagnitude then
		return false, "movement input magnitude exceeds one"
	end

	local safeCommand = {
		Seq = seq,
		ClientTime = clientTime,
		Dt = dt,
		MoveX = moveX,
		MoveZ = moveZ,
		Jump = payload.Jump == true,
		ServerTime = now,
	}

	local ok, raw = pcall(function()
		return self._adapters.ApplyInput(player, safeCommand)
	end)
	if not ok then
		return false, "server movement simulation rejected input"
	end
	local snapshot = safeSnapshot(raw)
	if snapshot == nil then
		return false, "server movement simulation returned invalid state"
	end

	state.LastSeq = seq
	state.LastClientTime = clientTime
	pushSnapshot(state, snapshot, now, self._config.HistoryWindowSeconds)

	if self._telemetry then
		pcall(function()
			self._telemetry("action_input", { Seq = seq })
		end)
	end

	return true, {
		ServerTime = now,
		AckSeq = seq,
		Position = snapshot.Position,
		Velocity = snapshot.Velocity,
		Health = snapshot.Health,
	}
end

function AuthoritativeActionService:SubmitFire(player: Player, payload)
	if type(payload) ~= "table" then
		return false, "fire intent must be a table"
	end
	local forbidden = hasOutcomeFields(payload)
	if forbidden then
		return false, "client-authored fire outcome field: " .. forbidden
	end
	if self._adapters.GetWeaponDefinition == nil or self._adapters.ApplyDamage == nil
		or self._adapters.WorldRaycast == nil then
		return false, "server combat adapters unavailable"
	end

	local fireSeq = payload.Seq
	local requestId = cleanId(payload.RequestId, 120)
	local weaponId = cleanId(payload.WeaponId, 80)
	local shotTime = payload.ShotTime
	if not positiveInteger(fireSeq) or requestId == nil or weaponId == nil or not finite(shotTime)
		or typeof(payload.Origin) ~= "Vector3" or typeof(payload.Direction) ~= "Vector3" then
		return false, "invalid fire intent"
	end
	if payload.Direction.Magnitude < 0.0001 then
		return false, "invalid fire direction"
	end

	local shooterState = self:_state(player)
	if fireSeq <= (shooterState.LastFireSeq or -1) then
		return false, "stale or duplicate fire sequence"
	end

	local requestKey = tostring(player.UserId) .. ":" .. requestId
	if self._processedFire[requestKey] then
		return false, "duplicate fire request"
	end

	local now = Workspace:GetServerTimeNow()
	if shotTime > now + self._config.MaxClientLeadSeconds then
		return false, "shot timestamp is in the future"
	end
	if shotTime < now - self._config.HistoryWindowSeconds then
		return false, "shot timestamp is outside rewind history"
	end

	local okWeapon, weapon = pcall(function()
		return self._adapters.GetWeaponDefinition(player, weaponId)
	end)
	if not okWeapon or type(weapon) ~= "table" then
		return false, "unknown server weapon"
	end
	local damage = weapon.Damage
	local cooldown = weapon.CooldownSeconds
	local maxRange = weapon.MaxRange
	local hitRadius = weapon.HitRadius
	local originTolerance = weapon.OriginTolerance
	if not finite(damage) or damage < 0 or not finite(cooldown) or cooldown < 0
		or not finite(maxRange) or maxRange <= 0 or not finite(hitRadius) or hitRadius <= 0
		or not finite(originTolerance) or originTolerance <= 0 then
		return false, "invalid server weapon definition"
	end

	local shooterPose = sampleHistory(shooterState, shotTime)
	if shooterPose == nil or (payload.Origin - shooterPose.Position).Magnitude > originTolerance then
		return false, "shot origin does not match server rewind state"
	end

	local previousFire = shooterState.LastFireAt[weaponId] or -math.huge
	if now - previousFire < cooldown then
		return false, "weapon cooldown"
	end

	local direction = payload.Direction.Unit
	local okRay, rayResult = pcall(function()
		return self._adapters.WorldRaycast(player, payload.Origin, direction * maxRange, shotTime)
	end)
	if not okRay then
		return false, "server world raycast failed"
	end
	local worldLimit = maxRange
	if rayResult and typeof(rayResult.Position) == "Vector3" then
		worldLimit = math.min(worldLimit, (rayResult.Position - payload.Origin).Magnitude)
	end

	local bestPlayer = nil
	local bestDistance = math.huge
	for targetPlayer, targetState in self._states do
		if targetPlayer ~= player and targetPlayer.Parent == Players then
			local pose = sampleHistory(targetState, shotTime)
			if pose and pose.Health > 0 then
				local along, miss = pointRayDistance(payload.Origin, direction, worldLimit, pose.Position)
				if along and miss and miss <= hitRadius and along < bestDistance then
					bestDistance = along
					bestPlayer = targetPlayer
				end
			end
		end
	end

	local appliedDamage = 0
	local targetHealth = nil
	if bestPlayer then
		local okDamage, result = pcall(function()
			return self._adapters.ApplyDamage(player, bestPlayer, damage, {
				RequestId = requestId,
				WeaponId = weaponId,
				ShotTime = shotTime,
			})
		end)
		if not okDamage or type(result) ~= "table" or result.Ok ~= true then
			return false, "server damage application failed"
		end
		appliedDamage = damage
		targetHealth = if finite(result.Health) then math.max(0, result.Health) else nil
		if targetHealth ~= nil then
			local targetState = self:_state(bestPlayer)
			local latest = targetState.History[#targetState.History]
			pushSnapshot(targetState, {
				Position = latest.Position,
				Velocity = latest.Velocity,
				Health = targetHealth,
			}, now, self._config.HistoryWindowSeconds)
		end
	end

	shooterState.LastFireSeq = fireSeq
	shooterState.LastFireAt[weaponId] = now
	self._processedFire[requestKey] = true
	local processedCount = 0
	for _ in self._processedFire do
		processedCount += 1
	end
	if processedCount > self._config.ProcessedFireLimit then
		-- Correlation receipts may be compacted because LastFireSeq remains the
		-- authoritative replay boundary for this player session.
		self._processedFire = {[requestKey] = true}
	end

	local event = {
		Seq = fireSeq,
		RequestId = requestId,
		WeaponId = weaponId,
		Hit = bestPlayer ~= nil,
		Target = bestPlayer,
		Damage = appliedDamage,
		TargetHealth = targetHealth,
		ServerTime = now,
		ShotTime = shotTime,
	}

	if self._telemetry then
		pcall(function()
			self._telemetry("action_fire", {
				weaponId = weaponId,
				hit = bestPlayer ~= nil,
			})
		end)
	end
	return true, event
end

function AuthoritativeActionService:PlayerRemoving(player: Player)
	self._states[player] = nil
	local prefix = tostring(player.UserId) .. ":"
	for key in self._processedFire do
		if string.sub(key, 1, #prefix) == prefix then
			self._processedFire[key] = nil
		end
	end
end

return AuthoritativeActionService
