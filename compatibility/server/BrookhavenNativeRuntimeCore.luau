local RuntimeCore = {}

local DEFAULT_SKIN_TONES = {
	Alder = Color3.fromRGB(180, 128, 255),
	Black = Color3.fromRGB(27, 42, 53),
	Brown = Color3.fromRGB(124, 92, 70),
	["Pastel light blue"] = Color3.fromRGB(128, 187, 219),
	Flint = Color3.fromRGB(105, 102, 92),
	["Deep orange"] = Color3.fromRGB(255, 176, 0),
	["Forest green"] = Color3.fromRGB(31, 128, 29),
	["Hot pink"] = Color3.fromRGB(255, 0, 191),
	["Institutional white"] = Color3.fromRGB(248, 248, 248),
	["Light orange"] = Color3.fromRGB(234, 184, 146),
	["Lime green"] = Color3.fromRGB(0, 255, 0),
	Magenta = Color3.fromRGB(170, 0, 170),
	["Medium stone grey"] = Color3.fromRGB(163, 162, 165),
	["Navy blue"] = Color3.fromRGB(0, 32, 96),
	["New Yeller"] = Color3.fromRGB(255, 255, 0),
	["Really black"] = Color3.fromRGB(17, 17, 17),
	["Really blue"] = Color3.fromRGB(0, 0, 255),
	["Really red"] = Color3.fromRGB(255, 0, 0),
	["Royal purple"] = Color3.fromRGB(98, 37, 209),
	Toothpaste = Color3.fromRGB(0, 255, 255),
}

local PASS_ACTIONS = {
	BoughtMusic = {flag = "MusicPass"},
	BoughtPremium = {flag = "SilverPass"},
	BoughtColorSpeedLower = {flag = "ColorSpeedPassLower", vehicleSpeed = 70, noMotorSpeed = 35},
	BoughtSpeed200 = {flag = "SpeedPass200", vehicleSpeed = 200, noMotorSpeed = 45},
	BoughtHorse = {flag = "HorsePass"},
	BoughtFire = {flag = "FirePass"},
}

local function ensureValue(parent, className, name, defaultValue)
	local current = parent:FindFirstChild(name)
	if current and current:IsA(className) then
		return current
	end
	if current then
		current:Destroy()
	end
	local value = Instance.new(className)
	value.Name = name
	value.Value = defaultValue
	value.Parent = parent
	return value
end

local function setBodyColor(description, color)
	description.HeadColor = color
	description.LeftArmColor = color
	description.RightArmColor = color
	description.LeftLegColor = color
	description.RightLegColor = color
	description.TorsoColor = color
end

function RuntimeCore.applyNativeAvatarMutation(description, skinTones, action, a, b)
	if not description then
		return {ok = false, code = "description_missing"}
	end
	local tones = type(skinTones) == "table" and skinTones or DEFAULT_SKIN_TONES
	if action == "outfit" then
		local shirt = tonumber(a)
		local pants = tonumber(b)
		if not shirt or not pants then
			return {ok = false, code = "invalid_outfit"}
		end
		description.Shirt = shirt
		description.Pants = pants
		return {ok = true, action = action, shirt = shirt, pants = pants}
	elseif action == "scale" then
		local scale = math.clamp(tonumber(a) or 1, 0.5, 1)
		description.HeightScale = scale
		description.WidthScale = math.clamp(0.85 + (scale - 0.5) * 0.3, 0.85, 1)
		description.DepthScale = math.clamp(0.85 + (scale - 0.5) * 0.3, 0.85, 1)
		description.HeadScale = math.clamp(0.9 + (scale - 0.5) * 0.2, 0.9, 1)
		return {ok = true, action = action, scale = scale}
	elseif action == "skintone" then
		local color = tones[tostring(a)]
		if typeof(color) ~= "Color3" then
			return {ok = false, code = "unknown_skin_tone"}
		end
		setBodyColor(description, color)
		return {ok = true, action = action, skinTone = tostring(a)}
	end
	return {ok = false, code = "unknown_avatar_action"}
end

function RuntimeCore.applyPassActionToBag(bag, action)
	local def = PASS_ACTIONS[action]
	if not def then
		return {ok = false, code = "unknown_pass_action"}
	end
	ensureValue(bag, "BoolValue", def.flag, false).Value = true
	if def.vehicleSpeed then
		ensureValue(bag, "NumberValue", "VehicleSpeed", 55).Value = def.vehicleSpeed
	end
	if def.noMotorSpeed then
		ensureValue(bag, "NumberValue", "SpeedPassNoMotorVehicle", 25).Value = def.noMotorSpeed
	end
	return {ok = true, action = action, flag = def.flag}
end

function RuntimeCore.findVehicleTemplate(carBackup, singleVehicles, requestedName, noMotor)
	local storage = noMotor and singleVehicles or carBackup
	if storage then
		local template = storage:FindFirstChild(requestedName)
		if template and template:IsA("Model") then
			return template
		end
	end
	if noMotor and carBackup then
		local fallback = carBackup:FindFirstChild(requestedName)
		if fallback and fallback:IsA("Model") then
			return fallback
		end
	end
	return nil
end

function RuntimeCore.cloneVehicleTemplate(carBackup, singleVehicles, requestedName, noMotor)
	local template = RuntimeCore.findVehicleTemplate(carBackup, singleVehicles, requestedName, noMotor)
	if not template then
		return {ok = false, code = "vehicle_unavailable", vehicle = requestedName}
	end
	return {ok = true, vehicle = requestedName, model = template:Clone()}
end

function RuntimeCore.primaryVehicleSeat(model)
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("VehicleSeat") then
			return item
		end
	end
	return nil
end

function RuntimeCore.prepareNativeVehicle(model)
	local seat = RuntimeCore.primaryVehicleSeat(model)
	if not seat then
		return {ok = false, code = "vehicle_seat_missing"}
	end

	local required = {
		CylindricalBL = false,
		CylindricalBR = false,
		CylindricalFL = false,
		CylindricalFR = false,
	}
	local constraintCount = 0
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("CylindricalConstraint") and required[item.Name] ~= nil then
			required[item.Name] = true
			constraintCount += 1
		end
	end
	for name, present in pairs(required) do
		if not present then
			return {ok = false, code = "drivetrain_constraint_missing", constraint = name}
		end
	end

	seat.Anchored = false
	return {
		ok = seat.Anchored == false,
		seat = seat.Name,
		seatAnchored = seat.Anchored,
		driveConstraints = constraintCount,
	}
end


local function boundedText(value, maxBytes)
	local text = tostring(value or "")
	if #text > maxBytes then
		text = string.sub(text, 1, maxBytes)
	end
	return text
end

local function colorName(value)
	if typeof(value) == "Color3" then
		return BrickColor.new(value).Name
	end
	if typeof(value) == "BrickColor" then
		return value.Name
	end
	if typeof(value) == "Instance" then
		if value:IsA("BrickColorValue") then
			return value.Value.Name
		elseif value:IsA("Color3Value") then
			return BrickColor.new(value.Value).Name
		elseif value:IsA("StringValue") then
			return boundedText(value.Value, 64)
		end
		local ok, raw = pcall(function()
			return value.Value
		end)
		if ok then
			if typeof(raw) == "Color3" then
				return BrickColor.new(raw).Name
			elseif typeof(raw) == "BrickColor" then
				return raw.Name
			elseif type(raw) == "string" then
				return boundedText(raw, 64)
			end
		end
	end
	if type(value) == "string" then
		return boundedText(value, 64)
	end
	return nil
end

function RuntimeCore.applyRolePlayTextToBag(bag, action, value)
	local fieldByAction = {
		RolePlayName = {"RPName", 48},
		RolePlayBio = {"RPBio", 160},
		RolePlayFollow = {"RPFollowName", 48},
	}
	local row = fieldByAction[action]
	if not row then
		return {ok = false, code = "unknown_roleplay_text_action"}
	end
	local field = ensureValue(bag, "StringValue", row[1], "")
	field.Value = boundedText(value, row[2])
	return {ok = true, action = action, field = row[1], value = field.Value}
end

function RuntimeCore.applyRolePlayColorToBag(bag, action, value)
	local fieldByAction = {
		PickingRPNameColor = "RPNameColor",
		PickingRPBioColor = "RPBioColor",
		PickingRPFollowColor = "RPFollowColor",
	}
	local fieldName = fieldByAction[action]
	if not fieldName then
		return {ok = false, code = "unknown_roleplay_color_action"}
	end
	local name = colorName(value)
	if not name then
		return {ok = false, code = "invalid_roleplay_color"}
	end
	local field = ensureValue(bag, "StringValue", fieldName, "Institutional white")
	field.Value = name
	return {ok = true, action = action, field = fieldName, value = name}
end

function RuntimeCore.applyJobStateToBag(bag, action, jobName, titlePic, jobOrStudent)
	local job = ensureValue(bag, "BoolValue", "Job", false)
	local title = ensureValue(job, "StringValue", "JobTitlePic", "")
	local kind = ensureValue(job, "BoolValue", "JobOrStudent", false)
	local name = ensureValue(job, "StringValue", "JobName", "")
	ensureValue(job, "BoolValue", "OwnedLocker", false)

	if action == "QuitJob" then
		job.Value = false
		title.Value = ""
		kind.Value = false
		name.Value = ""
		return {ok = true, action = action, active = false}
	elseif action == "GiveJobUIMenu" then
		job.Value = true
		name.Value = boundedText(jobName, 64)
		title.Value = boundedText(titlePic, 64)
		kind.Value = jobOrStudent == true
		return {
			ok = true,
			action = action,
			active = true,
			jobName = name.Value,
			titlePic = title.Value,
			jobOrStudent = kind.Value,
		}
	end
	return {ok = false, code = "unknown_job_action"}
end


local function resolvedColor3(value)
	if typeof(value) == "Color3" then
		return value
	end
	if typeof(value) == "BrickColor" then
		return value.Color
	end
	if typeof(value) == "Instance" then
		if value:IsA("Color3Value") then
			return value.Value
		elseif value:IsA("BrickColorValue") then
			return value.Value.Color
		elseif value:IsA("StringValue") then
			local ok, brick = pcall(BrickColor.new, value.Value)
			return ok and brick.Color or nil
		end
		local ok, raw = pcall(function()
			return value.Value
		end)
		if ok then
			if typeof(raw) == "Color3" then
				return raw
			elseif typeof(raw) == "BrickColor" then
				return raw.Color
			elseif type(raw) == "string" then
				local parsed, brick = pcall(BrickColor.new, raw)
				return parsed and brick.Color or nil
			end
		end
	end
	if type(value) == "string" then
		local ok, brick = pcall(BrickColor.new, value)
		return ok and brick.Color or nil
	end
	return nil
end

function RuntimeCore.applyHomeBusinessMutation(house, action, value)
	if not (house and house:IsA("Model")) then
		return {ok = false, code = "house_missing"}
	end
	local business = house:FindFirstChild("001_HomeBasedBusiness", true)
	if not business then
		return {ok = false, code = "business_model_missing"}
	end
	local textBox = business:FindFirstChild("TextBox", true)
	if not (textBox and textBox:IsA("TextBox")) then
		return {ok = false, code = "business_textbox_missing"}
	end
	if action == "BusinessName" then
		textBox.Text = boundedText(value, 48)
		return {ok = true, action = action, text = textBox.Text}
	elseif action == "PickingBusinessNameColor" then
		local color = resolvedColor3(value)
		if not color then
			return {ok = false, code = "invalid_business_color"}
		end
		textBox.TextColor3 = color
		return {ok = true, action = action, color = color}
	end
	return {ok = false, code = "unknown_business_action"}
end




local function normalizeAssetId(value)
	local digits = string.match(tostring(value or ""), "(%d+)")
	local id = digits and tonumber(digits) or nil
	if not id or id <= 0 then
		return nil
	end
	return math.floor(id)
end

local function houseMusicSound(house)
	local existing = house:FindFirstChild("BrookhavenHouseMusic", true)
	if existing and existing:IsA("Sound") then
		return existing
	end
	local stereo = house:FindFirstChild("HouseStereo", true)
	local emitter = nil
	if stereo and stereo:IsA("Model") then
		for _, item in ipairs(stereo:GetDescendants()) do
			if item:IsA("BasePart") then
				emitter = item
				break
			end
		end
	end
	if not emitter then
		emitter = house.PrimaryPart
	end
	if not emitter then
		for _, item in ipairs(house:GetDescendants()) do
			if item:IsA("BasePart") then
				emitter = item
				break
			end
		end
	end
	if not emitter then
		return nil
	end
	local sound = Instance.new("Sound")
	sound.Name = "BrookhavenHouseMusic"
	sound.Looped = true
	sound.Volume = 0.5
	sound.RollOffMaxDistance = 90
	sound.Parent = emitter
	return sound
end

function RuntimeCore.applyHouseMusicMutation(house, action, value)
	if not (house and house:IsA("Model")) then
		return {ok = false, code = "house_missing"}
	end
	local sound = houseMusicSound(house)
	if not sound then
		return {ok = false, code = "house_music_emitter_missing"}
	end
	if action == "PickingHouseMusicText" then
		local id = normalizeAssetId(value)
		if not id then
			return {ok = false, code = "invalid_house_music_asset"}
		end
		sound.SoundId = "rbxassetid://" .. tostring(id)
		return {ok = sound.SoundId == "rbxassetid://" .. tostring(id), action = action, assetId = id}
	elseif action == "PickingHouseMusicPlay" then
		if sound.SoundId == "" then
			return {ok = false, code = "house_music_asset_missing"}
		end
		local ok = pcall(function()
			sound:Play()
		end)
		return {ok = ok, action = action, playing = sound.Playing, soundId = sound.SoundId}
	elseif action == "PickingHouseMusicStop" then
		local ok = pcall(function()
			sound:Stop()
		end)
		return {ok = ok, action = action, playing = sound.Playing, soundId = sound.SoundId}
	end
	return {ok = false, code = "unknown_house_music_action"}
end

function RuntimeCore.toggleCurtains(house)
	if not (house and house:IsA("Model")) then
		return {ok = false, code = "house_missing"}
	end
	local curtains = house:FindFirstChild("001_Curtains", true)
	if not (curtains and curtains:IsA("Model")) then
		return {ok = false, code = "curtains_unavailable"}
	end
	local main = house:FindFirstChild("MainHouseScript", true)
	local curtainOpen = main and main:FindFirstChild("CurtainOpen")
	local currentOpen = curtains:GetAttribute("StarBloxCurtainOpen") == true
	if curtainOpen and curtainOpen:IsA("BoolValue") then
		currentOpen = curtainOpen.Value
	end
	local nextOpen = not currentOpen
	local changed = 0
	for _, item in ipairs(curtains:GetDescendants()) do
		if item:IsA("BasePart") then
			if item:GetAttribute("StarBloxCurtainClosedTransparency") == nil then
				item:SetAttribute("StarBloxCurtainClosedTransparency", item.Transparency)
			end
			if item:GetAttribute("StarBloxCurtainClosedCanCollide") == nil then
				item:SetAttribute("StarBloxCurtainClosedCanCollide", item.CanCollide)
			end
			if nextOpen then
				item.Transparency = 1
				item.CanCollide = false
			else
				item.Transparency = tonumber(item:GetAttribute("StarBloxCurtainClosedTransparency")) or 0
				item.CanCollide = item:GetAttribute("StarBloxCurtainClosedCanCollide") == true
			end
			changed += 1
		end
	end
	curtains:SetAttribute("StarBloxCurtainOpen", nextOpen)
	if curtainOpen and curtainOpen:IsA("BoolValue") then
		curtainOpen.Value = nextOpen
	end
	local changing = main and main:FindFirstChild("CurtainchangingState")
	if changing and changing:IsA("BoolValue") then
		changing.Value = false
	end
	return {ok = changed > 0, open = nextOpen, parts = changed}
end


local function hairColorValue(value)
	if typeof(value) == "Color3" then
		return value
	end
	if typeof(value) == "BrickColor" then
		return value.Color
	end
	if typeof(value) == "Instance" then
		if value:IsA("Color3Value") then
			return value.Value
		elseif value:IsA("BrickColorValue") then
			return value.Value.Color
		end
		local ok, result = pcall(function()
			return value.Color
		end)
		if ok and typeof(result) == "Color3" then
			return result
		end
	end
	return nil
end

local function orderedHairAccessories(character)
	local rows = {}
	for _, item in ipairs(character:GetChildren()) do
		if item:IsA("Accessory") then
			local isHair = false
			local ok, accessoryType = pcall(function()
				return item.AccessoryType
			end)
			if ok and accessoryType == Enum.AccessoryType.Hair then
				isHair = true
			end
			if not isHair and string.find(string.lower(item.Name), "hair", 1, true) then
				isHair = true
			end
			if isHair then
				table.insert(rows, item)
			end
		end
	end
	table.sort(rows, function(a, b)
		return a.Name < b.Name
	end)
	return rows
end


local VEHICLE_MUSIC_TEXT_ACTIONS = {
	PickingCarMusicText = true,
	PickingScooterMusicText = true,
}
local VEHICLE_MUSIC_PLAY_ACTIONS = {
	CarMusicPlay = true,
	PickingScooterMusicPlay = true,
}
local VEHICLE_MUSIC_STOP_ACTIONS = {
	CarMusicStop = true,
	PickingScooterMusicStop = true,
}

local function vehicleMusicSound(model)
	if not (model and model:IsA("Model")) then
		return nil
	end
	local existing = model:FindFirstChild("BrookhavenVehicleMusic", true)
	if existing and existing:IsA("Sound") then
		return existing
	end
	local emitter = RuntimeCore.primaryVehicleSeat(model)
	if not emitter then
		for _, item in ipairs(model:GetDescendants()) do
			if item:IsA("BasePart") then
				emitter = item
				break
			end
		end
	end
	if not emitter then
		return nil
	end
	local sound = Instance.new("Sound")
	sound.Name = "BrookhavenVehicleMusic"
	sound.Looped = true
	sound.Volume = 0.5
	sound.RollOffMaxDistance = 80
	sound.Parent = emitter
	return sound
end

function RuntimeCore.applyVehicleMusicMutation(model, action, value)
	local sound = vehicleMusicSound(model)
	if not sound then
		return {ok = false, code = "vehicle_music_emitter_missing"}
	end
	if VEHICLE_MUSIC_TEXT_ACTIONS[action] then
		local id = normalizeAssetId(value)
		if not id then
			return {ok = false, code = "invalid_vehicle_music_asset"}
		end
		sound.SoundId = "rbxassetid://" .. tostring(id)
		return {ok = sound.SoundId == "rbxassetid://" .. tostring(id), action = action, assetId = id}
	elseif VEHICLE_MUSIC_PLAY_ACTIONS[action] then
		if sound.SoundId == "" then
			return {ok = false, code = "vehicle_music_asset_missing"}
		end
		local ok = pcall(function()
			sound:Play()
		end)
		return {ok = ok, action = action, playing = sound.Playing, soundId = sound.SoundId}
	elseif VEHICLE_MUSIC_STOP_ACTIONS[action] then
		local ok = pcall(function()
			sound:Stop()
		end)
		return {ok = ok, action = action, playing = sound.Playing, soundId = sound.SoundId}
	end
	return {ok = false, code = "unknown_vehicle_music_action"}
end

function RuntimeCore.isVehicleMusicAction(action)
	return VEHICLE_MUSIC_TEXT_ACTIONS[action] == true
		or VEHICLE_MUSIC_PLAY_ACTIONS[action] == true
		or VEHICLE_MUSIC_STOP_ACTIONS[action] == true
end



function RuntimeCore.inspectNativeHorse(horse)
	if not (horse and horse:IsA("Model")) then
		return {ok = false, code = "horse_missing"}
	end
	local humanoid = horse:FindFirstChildOfClass("Humanoid")
	local upperTorso = horse:FindFirstChild("UpperTorso")
	local seat = horse:FindFirstChild("Seat")
	local owner = horse:FindFirstChild("Owner")
	local mountButton = horse:FindFirstChild("MountButton")
	local click = mountButton and mountButton:FindFirstChildOfClass("ClickDetector")
	local gui = mountButton and mountButton:FindFirstChildWhichIsA("BillboardGui")
	local animations = horse:FindFirstChild("Animations")
	local requiredAnimations = {"Walk", "Idle", "Jump", "Fall"}
	local animationCount = 0
	if animations and animations:IsA("Folder") then
		for _, name in ipairs(requiredAnimations) do
			local animation = animations:FindFirstChild(name)
			if animation and animation:IsA("Animation") then
				animationCount += 1
			end
		end
	end
	local ok = humanoid ~= nil
		and upperTorso ~= nil and upperTorso:IsA("BasePart")
		and seat ~= nil and seat:IsA("BasePart")
		and owner ~= nil and owner:IsA("ObjectValue")
		and mountButton ~= nil and mountButton:IsA("BasePart")
		and click ~= nil
		and gui ~= nil
		and animationCount == #requiredAnimations
	return {
		ok = ok,
		hasHumanoid = humanoid ~= nil,
		hasUpperTorso = upperTorso ~= nil and upperTorso:IsA("BasePart"),
		hasSeat = seat ~= nil and seat:IsA("BasePart"),
		hasOwner = owner ~= nil and owner:IsA("ObjectValue"),
		hasMountClick = click ~= nil,
		hasMountGui = gui ~= nil,
		animationCount = animationCount,
	}
end

function RuntimeCore.setHorseMountEnabled(horse, enabled)
	local info = RuntimeCore.inspectNativeHorse(horse)
	if not info.ok then
		return info
	end
	local mountButton = horse:FindFirstChild("MountButton")
	local click = mountButton:FindFirstChildOfClass("ClickDetector")
	local gui = mountButton:FindFirstChildWhichIsA("BillboardGui")
	click.MaxActivationDistance = enabled and 10 or 0
	gui.Enabled = enabled == true
	horse:SetAttribute("StarBloxHorseMountEnabled", enabled == true)
	return {
		ok = click.MaxActivationDistance == (enabled and 10 or 0) and gui.Enabled == (enabled == true),
		enabled = enabled == true,
		maxActivationDistance = click.MaxActivationDistance,
	}
end

function RuntimeCore.prepareHorseMounted(horse)
	local info = RuntimeCore.inspectNativeHorse(horse)
	if not info.ok then
		return info
	end
	local parts = 0
	for _, item in ipairs(horse:GetDescendants()) do
		if item:IsA("BasePart") then
			if item:GetAttribute("StarBloxHorseSourceCanCollide") == nil then
				item:SetAttribute("StarBloxHorseSourceCanCollide", item.CanCollide)
			end
			if item:GetAttribute("StarBloxHorseSourceMassless") == nil then
				item:SetAttribute("StarBloxHorseSourceMassless", item.Massless)
			end
			if item:GetAttribute("StarBloxHorseSourceAnchored") == nil then
				item:SetAttribute("StarBloxHorseSourceAnchored", item.Anchored)
			end
			item.Anchored = false
			item.CanCollide = false
			item.Massless = true
			parts += 1
		end
	end
	local mount = RuntimeCore.setHorseMountEnabled(horse, false)
	return {ok = parts > 0 and mount.ok, parts = parts, mount = mount}
end

function RuntimeCore.restoreHorseAfterDismount(horse)
	local info = RuntimeCore.inspectNativeHorse(horse)
	if not info.ok then
		return info
	end
	local parts = 0
	for _, item in ipairs(horse:GetDescendants()) do
		if item:IsA("BasePart") then
			local canCollide = item:GetAttribute("StarBloxHorseSourceCanCollide")
			local massless = item:GetAttribute("StarBloxHorseSourceMassless")
			local anchored = item:GetAttribute("StarBloxHorseSourceAnchored")
			if type(canCollide) == "boolean" then
				item.CanCollide = canCollide
			end
			if type(massless) == "boolean" then
				item.Massless = massless
			end
			if type(anchored) == "boolean" then
				item.Anchored = anchored
			end
			parts += 1
		end
	end
	local mount = RuntimeCore.setHorseMountEnabled(horse, true)
	return {ok = parts > 0 and mount.ok, parts = parts, mount = mount}
end


function RuntimeCore.mountHorseToCharacter(horse, character)
	local info = RuntimeCore.inspectNativeHorse(horse)
	if not info.ok then
		return info
	end
	if not (character and character:IsA("Model")) then
		return {ok = false, code = "character_missing"}
	end
	local root = character:FindFirstChild("HumanoidRootPart")
	local upperTorso = horse:FindFirstChild("UpperTorso")
	if not (root and root:IsA("BasePart") and upperTorso and upperTorso:IsA("BasePart")) then
		return {ok = false, code = "mount_parts_missing"}
	end
	local prepared = RuntimeCore.prepareHorseMounted(horse)
	if not prepared.ok then
		return prepared
	end
	for _, item in ipairs(upperTorso:GetChildren()) do
		if item:IsA("WeldConstraint") and item.Name == "StarBloxHorseMountWeld" then
			item:Destroy()
		end
	end
	horse.Parent = character
	horse:PivotTo(root.CFrame * CFrame.new(0, -3.2, 0))
	local weld = Instance.new("WeldConstraint")
	weld.Name = "StarBloxHorseMountWeld"
	weld.Part0 = root
	weld.Part1 = upperTorso
	weld.Parent = upperTorso
	horse:SetAttribute("StarBloxHorseMounted", true)
	return {
		ok = horse.Parent == character and weld.Part0 == root and weld.Part1 == upperTorso,
		weld = weld,
		prepared = prepared,
	}
end

function RuntimeCore.dismountHorseToWorld(horse, character, targetParent)
	local info = RuntimeCore.inspectNativeHorse(horse)
	if not info.ok then
		return info
	end
	if not (targetParent and targetParent:IsA("Instance")) then
		return {ok = false, code = "target_parent_missing"}
	end
	local upperTorso = horse:FindFirstChild("UpperTorso")
	if upperTorso and upperTorso:IsA("BasePart") then
		local weld = upperTorso:FindFirstChild("StarBloxHorseMountWeld")
		if weld and weld:IsA("WeldConstraint") then
			weld:Destroy()
		end
	end
	local root = character and character:FindFirstChild("HumanoidRootPart")
	horse.Parent = targetParent
	if root and root:IsA("BasePart") then
		horse:PivotTo(root.CFrame * CFrame.new(5, -3, 0))
	end
	horse:SetAttribute("StarBloxHorseMounted", false)
	local restored = RuntimeCore.restoreHorseAfterDismount(horse)
	return {
		ok = restored.ok and horse.Parent == targetParent and horse:GetAttribute("StarBloxHorseMounted") == false,
		restored = restored,
	}
end

function RuntimeCore.applyHorseCustomization(horse, action, value)
	if not (horse and horse:IsA("Model")) then
		return {ok = false, code = "horse_missing"}
	end

	local head = horse:FindFirstChild("Head")
	local nameGui = head and head:FindFirstChild("NameGUI")
	local nameText = nameGui and nameGui:FindFirstChild("NameTxt")

	if action == "HorseName" then
		if not (nameText and (nameText:IsA("TextBox") or nameText:IsA("TextLabel"))) then
			return {ok = false, code = "horse_name_target_missing"}
		end
		nameText.Text = boundedText(value, 48)
		return {ok = true, action = action, text = nameText.Text}
	elseif action == "HorseNameColor" then
		if not (nameText and (nameText:IsA("TextBox") or nameText:IsA("TextLabel"))) then
			return {ok = false, code = "horse_name_target_missing"}
		end
		local color = resolvedColor3(value)
		if not color then
			return {ok = false, code = "invalid_horse_name_color"}
		end
		nameText.TextColor3 = color
		return {ok = true, action = action, color = color}
	end

	if action == "BlackHorseFree" or action == "BrownHorseFree" then
		local seat = horse:FindFirstChild("Seat")
		local horseSeat = seat and seat:FindFirstChild("HorseSeat")
		local preset = horseSeat and horseSeat:FindFirstChild(action == "BlackHorseFree" and "BlackHorse" or "BrownHorse")
		if not preset then
			return {ok = false, code = "horse_preset_missing"}
		end
		local actionByValue = {
			HorseBodyColor = "PickingHorseBodyColor",
			HorseHairColor = "PickingHorseHairColor",
			HorseSaddleColor = "PickingSaddleColor",
			HorseTexture = "PickingHorseTexture",
		}
		local applied = 0
		for valueName, mappedAction in pairs(actionByValue) do
			local stored = preset:FindFirstChild(valueName)
			if stored and stored:IsA("StringValue") and stored.Value ~= "" then
				local result = RuntimeCore.applyHorseCustomization(horse, mappedAction, stored.Value)
				if result.ok then
					applied += 1
				end
			end
		end
		return {ok = applied > 0, action = action, applied = applied, preset = preset.Name}
	end

	if action == "PickingHorseTexture" then
		local color = resolvedColor3(value)
		local raw = tostring(value or "")
		local assetId = string.match(raw, "(%d+)")
		local changed = 0
		for _, item in ipairs(horse:GetDescendants()) do
			if item:IsA("Texture") then
				if color then
					item.Color3 = color
					changed += 1
				elseif assetId then
					item.Texture = "rbxassetid://" .. assetId
					changed += 1
				end
			end
		end
		return {ok = changed > 0, action = action, changed = changed, color = color, assetId = assetId}
	end

	local color = resolvedColor3(value)
	if not color then
		return {ok = false, code = "invalid_horse_color"}
	end
	local brickName = BrickColor.new(color).Name
	local changed = 0

	if action == "PickingHorseBodyColor" then
		for _, item in ipairs(horse:GetDescendants()) do
			if item:IsA("BasePart") then
				local state = item:FindFirstChild("Color")
				if state and state:IsA("StringValue") then
					item.Color = color
					state.Value = brickName
					changed += 1
				end
			end
		end
	elseif action == "PickingHorseHairColor" then
		for _, partName in ipairs({"Mane", "Tail"}) do
			local item = horse:FindFirstChild(partName)
			if item and item:IsA("BasePart") then
				item.Color = color
				local state = item:FindFirstChild("HairColor")
				if state and state:IsA("StringValue") then
					state.Value = brickName
				end
				changed += 1
			end
		end
	elseif action == "PickingSaddleColor" then
		local saddle = horse:FindFirstChild("Saddle")
		if saddle and saddle:IsA("BasePart") then
			saddle.Color = color
			changed = 1
		end
	else
		return {ok = false, code = "unknown_horse_action"}
	end

	return {
		ok = changed > 0,
		action = action,
		changed = changed,
		color = color,
		colorName = brickName,
	}
end



function RuntimeCore.buildFollowerFromDisplayPart(displayPart, followerName)
	if not (displayPart and displayPart:IsA("BasePart")) then
		return {ok = false, code = "display_part_missing"}
	end

	local model = Instance.new("Model")
	model.Name = "FollowCharacter"
	model:SetAttribute("BrookhavenNativeDisplaySource", true)
	model:SetAttribute("BrookhavenNativeDisplayName", displayPart.Name)

	local torso = displayPart:Clone()
	torso.Name = "Torso"
	torso.Anchored = false
	torso.CanCollide = false
	torso.CanTouch = false
	torso.Massless = true
	pcall(function()
		torso.CanQuery = false
	end)
	for _, item in ipairs(torso:GetDescendants()) do
		if item:IsA("ClickDetector")
			or item:IsA("ProximityPrompt")
			or item:IsA("BillboardGui")
			or item:IsA("SurfaceGui")
		then
			item:Destroy()
		end
	end
	torso.Parent = model
	model.PrimaryPart = torso

	local humanoid = Instance.new("Humanoid")
	humanoid.Name = "Humanoid"
	humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	humanoid.RequiresNeck = false
	humanoid.Parent = model
	local animator = Instance.new("Animator")
	animator.Parent = humanoid

	local followName = Instance.new("StringValue")
	followName.Name = "FollowName"
	followName.Value = tostring(followerName or displayPart.Name)
	followName.Parent = model

	return {
		ok = model.PrimaryPart == torso
			and torso.Parent == model
			and torso.Anchored == false
			and torso.CanCollide == false
			and humanoid.Parent == model
			and followName.Parent == model,
		model = model,
		torso = torso,
		humanoid = humanoid,
		followName = followName,
		sourceName = displayPart.Name,
	}
end

function RuntimeCore.buildToolFromDisplayPart(displayPart, toolName)
	if not (displayPart and displayPart:IsA("BasePart")) then
		return {ok = false, code = "display_part_missing"}
	end
	local tool = Instance.new("Tool")
	tool.Name = tostring(toolName or displayPart.Name)
	tool.CanBeDropped = false
	tool.RequiresHandle = true
	tool:SetAttribute("BrookhavenNativeDisplaySource", true)
	tool:SetAttribute("BrookhavenNativeDisplayName", displayPart.Name)

	local handle = displayPart:Clone()
	handle.Name = "Handle"
	handle.Anchored = false
	handle.CanCollide = false
	handle.CanTouch = false
	handle.Massless = true
	pcall(function()
		handle.CanQuery = false
	end)
	for _, item in ipairs(handle:GetDescendants()) do
		if item:IsA("ClickDetector")
			or item:IsA("ProximityPrompt")
			or item:IsA("BillboardGui")
			or item:IsA("SurfaceGui")
		then
			item:Destroy()
		end
	end
	handle.Parent = tool

	return {
		ok = handle.Parent == tool and handle.Anchored == false and handle.CanCollide == false,
		tool = tool,
		handle = handle,
		sourceName = displayPart.Name,
		sourceClass = displayPart.ClassName,
	}
end


local HOUSE_FIRE_ON_ACTIONS = {
	PlayerWantsFire = true,
	PlayerWantsFireOnFirePass = true,
	PlayerWantsFireOnFirePassNotShowingAnyone = true,
}

function RuntimeCore.applyHouseFireMutation(house, action)
	if not (house and house:IsA("Model")) then
		return {ok = false, code = "house_missing"}
	end
	local enabled
	if HOUSE_FIRE_ON_ACTIONS[action] then
		enabled = true
	elseif action == "PlayerWantsFireOffFirePass" then
		enabled = false
	else
		return {ok = false, code = "unknown_house_fire_action"}
	end
	local fireModel = house:FindFirstChild("001_Fire", true)
	if not (fireModel and fireModel:IsA("Model")) then
		return {ok = false, code = "house_fire_model_missing"}
	end
	local changed = 0
	for _, item in ipairs(fireModel:GetDescendants()) do
		if item:IsA("Fire")
			or item:IsA("Smoke")
			or item:IsA("ParticleEmitter")
			or item:IsA("PointLight")
			or item:IsA("SpotLight")
			or item:IsA("SurfaceLight")
		then
			item.Enabled = enabled
			changed += 1
		end
	end
	fireModel:SetAttribute("StarBloxHouseFireEnabled", enabled)
	return {
		ok = changed > 0,
		action = action,
		enabled = enabled,
		effects = changed,
	}
end

function RuntimeCore.applyHairColor(character, action, value)
	if not (character and character:IsA("Model")) then
		return {ok = false, code = "character_missing"}
	end
	local indexByAction = {
		ChangeHairColor = 1,
		ChangeHairColor2 = 2,
		ChangeHairColor3 = 3,
	}
	local index = indexByAction[action]
	if not index then
		return {ok = false, code = "unknown_hair_color_action"}
	end
	local color = hairColorValue(value)
	if not color then
		return {ok = false, code = "invalid_hair_color"}
	end
	local accessories = orderedHairAccessories(character)
	local accessory = accessories[index]
	if not accessory then
		return {ok = false, code = "hair_accessory_missing", index = index, count = #accessories}
	end
	local changed = 0
	for _, item in ipairs(accessory:GetDescendants()) do
		if item:IsA("BasePart") then
			item.Color = color
			changed += 1
		end
	end
	return {
		ok = changed > 0,
		action = action,
		index = index,
		accessory = accessory.Name,
		parts = changed,
		color = color,
	}
end

function RuntimeCore.formatClockTime(clockTime)
	local raw = tonumber(clockTime) or 0
	raw = raw % 24
	local hour24 = math.floor(raw)
	local minute = math.floor(((raw - hour24) * 60) + 0.5)
	if minute >= 60 then
		minute = 0
		hour24 = (hour24 + 1) % 24
	end
	local suffix = hour24 >= 12 and "PM" or "AM"
	local hour12 = hour24 % 12
	if hour12 == 0 then
		hour12 = 12
	end
	return string.format("%d:%02d %s", hour12, minute, suffix)
end

function RuntimeCore.dayNameFromWeekday(weekday)
	local days = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"}
	local index = math.clamp(math.floor(tonumber(weekday) or 1), 1, 7)
	return days[index]
end


local SOCIAL_OFFSETS = {
	Piggyback = CFrame.new(0, 0.25, 1.35),
	Shoulders = CFrame.new(0, 1.65, 0),
	Carry = CFrame.new(1.15, 0.15, 0),
}

local function socialTorso(character)
	if not (character and character:IsA("Model")) then
		return nil
	end
	return character:FindFirstChild("UpperTorso")
		or character:FindFirstChild("Torso")
		or character:FindFirstChild("HumanoidRootPart")
end

function RuntimeCore.clearClient2ClientWeld(character)
	local torso = socialTorso(character)
	if not torso then
		return {ok = false, code = "torso_missing"}
	end
	local removed = 0
	for _, item in ipairs(torso:GetChildren()) do
		if item.Name == "Client_To_ClientWeld" and (item:IsA("Weld") or item:IsA("WeldConstraint")) then
			item:Destroy()
			removed += 1
		end
	end
	return {ok = true, removed = removed}
end

function RuntimeCore.createClient2ClientWeld(carrierCharacter, passengerCharacter, mode)
	local carrierTorso = socialTorso(carrierCharacter)
	local passengerTorso = socialTorso(passengerCharacter)
	if not carrierTorso or not passengerTorso then
		return {ok = false, code = "torso_missing"}
	end
	local offset = SOCIAL_OFFSETS[mode]
	if not offset then
		return {ok = false, code = "unknown_social_mode"}
	end

	RuntimeCore.clearClient2ClientWeld(carrierCharacter)
	RuntimeCore.clearClient2ClientWeld(passengerCharacter)

	local weld = Instance.new("Weld")
	weld.Name = "Client_To_ClientWeld"
	weld.Part0 = carrierTorso
	weld.Part1 = passengerTorso
	weld.C0 = offset
	weld.C1 = CFrame.new()
	weld:SetAttribute("BrookhavenSocialMode", mode)
	weld.Parent = passengerTorso

	pcall(function()
		passengerTorso.CFrame = carrierTorso.CFrame * offset
	end)

	return {
		ok = weld.Parent == passengerTorso
			and weld.Part0 == carrierTorso
			and weld.Part1 == passengerTorso,
		mode = mode,
		weld = weld,
		carrierTorso = carrierTorso,
		passengerTorso = passengerTorso,
	}
end

function RuntimeCore.setClient2ClientPairValue(bag, partner)
	if not bag then
		return {ok = false, code = "bag_missing"}
	end
	local pair = bag:FindFirstChild("Client2Client")
	if pair and not pair:IsA("ObjectValue") then
		pair:Destroy()
		pair = nil
	end
	if not pair then
		pair = Instance.new("ObjectValue")
		pair.Name = "Client2Client"
		pair.Parent = bag
	end
	pair.Value = partner
	return {ok = pair.Value == partner, value = pair}
end

function RuntimeCore.clearClient2ClientPairValue(bag)
	if not bag then
		return {ok = false, code = "bag_missing"}
	end
	local pair = bag:FindFirstChild("Client2Client")
	if pair then
		pair:Destroy()
		return {ok = true, removed = true}
	end
	return {ok = true, removed = false}
end



function RuntimeCore.attachNoMotorVehicle(model, character)
	if not (model and model:IsA("Model")) then
		return {ok = false, code = "no_motor_model_missing"}
	end
	if not (character and character:IsA("Model")) then
		return {ok = false, code = "character_missing"}
	end
	local root = character:FindFirstChild("HumanoidRootPart")
	local middle = model:FindFirstChild("Middle", true)
	if not (root and root:IsA("BasePart")) then
		return {ok = false, code = "character_root_missing"}
	end
	if not (middle and middle:IsA("BasePart")) then
		return {ok = false, code = "no_motor_middle_missing"}
	end

	model.Name = "NoMotorVehicleModel"
	model.Parent = character
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("BasePart") then
			item.Anchored = false
			item.CanCollide = false
			item.Massless = true
			if item ~= middle then
				local weld = Instance.new("WeldConstraint")
				weld.Name = "StarBloxNoMotorPartWeld"
				weld.Part0 = middle
				weld.Part1 = item
				weld.Parent = item
			end
		elseif item:IsA("BaseScript") then
			item.Disabled = true
		end
	end

	middle.CFrame = root.CFrame * CFrame.new(0, -2.5, 0)
	local rootWeld = Instance.new("WeldConstraint")
	rootWeld.Name = "StarBloxNoMotorRootWeld"
	rootWeld.Part0 = root
	rootWeld.Part1 = middle
	rootWeld.Parent = middle
	model:SetAttribute("BrookhavenNativeNoMotor", true)
	model:SetAttribute("BrookhavenNoMotorSourceName", model:GetAttribute("BrookhavenNoMotorSourceName") or "")
	return {
		ok = model.Parent == character
			and model.Name == "NoMotorVehicleModel"
			and rootWeld.Part0 == root
			and rootWeld.Part1 == middle
			and middle.Anchored == false,
		model = model,
		middle = middle,
		rootWeld = rootWeld,
	}
end

function RuntimeCore.inspectNativeHelicopter(heli)
	if not (heli and heli:IsA("Model")) then
		return {ok = false, code = "heli_missing"}
	end
	local seat = heli:FindFirstChild("VehicleSeat")
	if not (seat and seat:IsA("VehicleSeat")) then
		return {ok = false, code = "heli_seat_missing"}
	end
	local bodyGyro = seat:FindFirstChild("BodyGyro")
	local bodyVelocity = seat:FindFirstChild("BodyVelocity")
	local config = seat:FindFirstChild("Configuration")
	local maxSpeed = config and config:FindFirstChild("MaxSpeed")
	local maxForce = config and config:FindFirstChild("MaxForce")
	local turnSpeed = config and config:FindFirstChild("TurnSpeed")
	local gui = seat:FindFirstChild("HeliGui")
	local carSeat = gui and gui:FindFirstChild("CarSeat")
	local frame = gui and gui:FindFirstChild("Frame")
	local controls = frame and frame:FindFirstChild("VehicleControls")
	local takeOffBool = controls and controls:FindFirstChild("TakeOffBool")
	local giver = seat:FindFirstChild("Gui Giver")
	local owner = giver and giver:FindFirstChild("Owner")
	local landing = giver and giver:FindFirstChild("Landing")

	local ok = bodyGyro ~= nil and bodyGyro:IsA("BodyGyro")
		and bodyVelocity ~= nil and bodyVelocity:IsA("BodyVelocity")
		and config ~= nil and config:IsA("Configuration")
		and maxSpeed ~= nil and maxSpeed:IsA("NumberValue")
		and maxForce ~= nil and maxForce:IsA("NumberValue")
		and turnSpeed ~= nil and turnSpeed:IsA("NumberValue")
		and gui ~= nil and gui:IsA("ScreenGui")
		and carSeat ~= nil and carSeat:IsA("ObjectValue")
		and controls ~= nil and controls:IsA("LocalScript")
		and takeOffBool ~= nil and takeOffBool:IsA("BoolValue")
		and owner ~= nil and owner:IsA("StringValue")
		and landing ~= nil and landing:IsA("BoolValue")

	return {
		ok = ok,
		seat = seat,
		bodyGyro = bodyGyro,
		bodyVelocity = bodyVelocity,
		gui = gui,
		carSeat = carSeat,
		controls = controls,
		takeOffBool = takeOffBool,
		owner = owner,
		landing = landing,
		maxSpeed = maxSpeed and maxSpeed.Value or nil,
		maxForce = maxForce and maxForce.Value or nil,
		turnSpeed = turnSpeed and turnSpeed.Value or nil,
	}
end

function RuntimeCore.buildHelicopterGui(heli)
	local inspected = RuntimeCore.inspectNativeHelicopter(heli)
	if not inspected.ok then
		return inspected
	end
	local gui = inspected.gui:Clone()
	local carSeat = gui:FindFirstChild("CarSeat")
	local frame = gui:FindFirstChild("Frame")
	local controls = frame and frame:FindFirstChild("VehicleControls")
	local takeOffBool = controls and controls:FindFirstChild("TakeOffBool")
	if not (carSeat and carSeat:IsA("ObjectValue") and controls and controls:IsA("LocalScript") and takeOffBool and takeOffBool:IsA("BoolValue")) then
		gui:Destroy()
		return {ok = false, code = "heli_gui_contract_missing"}
	end
	gui.Name = "HeliGui"
	carSeat.Value = inspected.seat
	controls.Disabled = false
	takeOffBool.Value = false
	gui:SetAttribute("BrookhavenNativeHeliGui", true)
	return {
		ok = carSeat.Value == inspected.seat and controls.Disabled == false,
		gui = gui,
		seat = inspected.seat,
		carSeat = carSeat,
		controls = controls,
		takeOffBool = takeOffBool,
	}
end


function RuntimeCore.setHelicopterFlightEnabled(heli, enabled)
	local inspected = RuntimeCore.inspectNativeHelicopter(heli)
	if not inspected.ok then
		return inspected
	end
	local force = math.max(0, tonumber(inspected.maxForce) or 0)
	if enabled then
		local fullForce = Vector3.new(force, force, force)
		inspected.bodyGyro.MaxTorque = fullForce
		inspected.bodyGyro.CFrame = inspected.seat.CFrame
		inspected.bodyVelocity.MaxForce = fullForce
		inspected.takeOffBool.Value = false
		inspected.landing.Value = false
	else
		inspected.bodyVelocity.Velocity = Vector3.zero
		inspected.bodyVelocity.MaxForce = Vector3.zero
		inspected.bodyGyro.MaxTorque = Vector3.zero
		inspected.takeOffBool.Value = true
		inspected.landing.Value = true
	end
	local active = inspected.bodyVelocity.MaxForce.Magnitude > 0 and inspected.bodyGyro.MaxTorque.Magnitude > 0
	return {
		ok = enabled and active and inspected.takeOffBool.Value == false and inspected.landing.Value == false
			or (not enabled and not active and inspected.takeOffBool.Value == true and inspected.landing.Value == true),
		enabled = enabled == true,
		maxForce = force,
	}
end

function RuntimeCore.adjustHelicopterSpeed(heli, delta)
	local inspected = RuntimeCore.inspectNativeHelicopter(heli)
	if not inspected.ok then
		return inspected
	end
	local limit = math.max(5, tonumber(inspected.maxSpeed) or 80)
	local current = tonumber(inspected.seat.MaxSpeed) or 25
	local speed = math.clamp(current + (tonumber(delta) or 0), 5, limit)
	inspected.seat.MaxSpeed = speed
	return {ok = inspected.seat.MaxSpeed == speed, speed = speed, limit = limit}
end

function RuntimeCore.updateHelicopterVelocity(heli, verticalVelocity)
	local inspected = RuntimeCore.inspectNativeHelicopter(heli)
	if not inspected.ok then
		return inspected
	end
	if inspected.bodyVelocity.MaxForce.Magnitude <= 0 then
		return {ok = false, code = "heli_flight_disabled"}
	end
	if verticalVelocity ~= nil then
		inspected.bodyVelocity.Velocity = Vector3.new(0, tonumber(verticalVelocity) or 0, 0)
	else
		local look = inspected.seat.CFrame.LookVector
		local horizontal = Vector3.new(look.X, 0, look.Z)
		if horizontal.Magnitude > 0.001 then
			horizontal = horizontal.Unit
		else
			horizontal = Vector3.new(0, 0, -1)
		end
		inspected.bodyVelocity.Velocity = horizontal * inspected.seat.Throttle * inspected.seat.MaxSpeed
	end
	return {ok = true, velocity = inspected.bodyVelocity.Velocity, speed = inspected.seat.MaxSpeed}
end


function RuntimeCore.inspectNativeBanBlock(bannedLots, houseNumber)
	if not bannedLots then
		return {ok = false, code = "banned_lots_missing"}
	end
	local number = math.floor(tonumber(houseNumber) or 0)
	if number < 1 then
		return {ok = false, code = "invalid_house_number"}
	end
	local block = bannedLots:FindFirstChild("BannedBlock" .. tostring(number))
	if not (block and block:IsA("BasePart")) then
		return {ok = false, code = "banned_block_missing", houseNumber = number}
	end
	return {
		ok = true,
		houseNumber = number,
		block = block,
		descendants = #block:GetDescendants(),
	}
end

function RuntimeCore.cloneNativeBanBlock(bannedLots, houseNumber)
	local inspected = RuntimeCore.inspectNativeBanBlock(bannedLots, houseNumber)
	if not inspected.ok then
		return inspected
	end
	local clone = inspected.block:Clone()
	clone.Name = inspected.block.Name
	clone:SetAttribute("BrookhavenNativeBanBlock", true)
	return {
		ok = clone:IsA("BasePart") and clone.Name == "BannedBlock" .. tostring(inspected.houseNumber),
		houseNumber = inspected.houseNumber,
		block = clone,
		descendants = #clone:GetDescendants(),
	}
end

function RuntimeCore.setNativeHousePermission(permissionFolder, target, allowed)
	if not (permissionFolder and permissionFolder:IsA("Folder")) then
		return {ok = false, code = "permission_folder_missing"}
	end
	if not target then
		return {ok = false, code = "permission_target_missing"}
	end
	local key = tostring(target.Name)
	local existing = permissionFolder:FindFirstChild(key)
	if allowed == false then
		if existing then
			existing:Destroy()
		end
		return {ok = permissionFolder:FindFirstChild(key) == nil, allowed = false, key = key}
	end
	if existing and not existing:IsA("ObjectValue") then
		existing:Destroy()
		existing = nil
	end
	local entry = existing
	if not entry then
		entry = Instance.new("ObjectValue")
		entry.Name = key
		entry.Parent = permissionFolder
	end
	entry.Value = target
	return {
		ok = entry.Parent == permissionFolder and entry.Value == target,
		allowed = true,
		key = key,
		entry = entry,
	}
end


function RuntimeCore.toggleNativePoolCover(poolCovers, houseNumber)
	if not poolCovers then
		return {ok = false, code = "pool_covers_missing"}
	end
	local number = math.floor(tonumber(houseNumber) or 0)
	local cover = poolCovers:FindFirstChild(tostring(number))
	if not (cover and cover:IsA("BasePart")) then
		return {ok = false, code = "pool_cover_missing", houseNumber = number}
	end
	if cover:GetAttribute("BrookhavenPoolCoverSourceTransparency") == nil then
		cover:SetAttribute("BrookhavenPoolCoverSourceTransparency", cover.Transparency)
	end
	if cover:GetAttribute("BrookhavenPoolCoverSourceCanCollide") == nil then
		cover:SetAttribute("BrookhavenPoolCoverSourceCanCollide", cover.CanCollide)
	end
	local currentlyOn = cover.Transparency < 0.95 and cover.CanCollide == true
	local nextOn = not currentlyOn
	if nextOn then
		cover.Transparency = tonumber(cover:GetAttribute("BrookhavenPoolCoverSourceTransparency")) or 0
		cover.CanCollide = cover:GetAttribute("BrookhavenPoolCoverSourceCanCollide") == true
	else
		cover.Transparency = 1
		cover.CanCollide = false
	end
	cover:SetAttribute("BrookhavenPoolCoverOn", nextOn)
	return {
		ok = nextOn and cover.Transparency < 0.95 and cover.CanCollide == true
			or (not nextOn and cover.Transparency == 1 and cover.CanCollide == false),
		on = nextOn,
		houseNumber = number,
		cover = cover,
	}
end

function RuntimeCore.buildNativeCreditCardTool(displayPart, variant)
	if variant ~= "CreditCardBoy" and variant ~= "CreditCardGirl" then
		return {ok = false, code = "unknown_credit_card_variant"}
	end
	if not (displayPart and displayPart:IsA("BasePart")) then
		return {ok = false, code = "credit_card_display_missing"}
	end
	local built = RuntimeCore.buildToolFromDisplayPart(displayPart, variant)
	if not built.ok or not built.tool then
		return built
	end
	built.tool:SetAttribute("BrookhavenCreditCardVariant", variant)
	built.tool:SetAttribute("BrookhavenCreditCardSource", displayPart.Name)
	return {
		ok = built.tool.Name == variant
			and built.tool:GetAttribute("BrookhavenNativeDisplaySource") == true
			and built.tool:GetAttribute("BrookhavenCreditCardVariant") == variant,
		tool = built.tool,
		handle = built.handle,
		variant = variant,
		sourceName = displayPart.Name,
	}
end

function RuntimeCore.runBehaviorProbe()
	local ReplicatedStorage = game:GetService("ReplicatedStorage")
	local ServerStorage = game:GetService("ServerStorage")
	local remotes = ReplicatedStorage:WaitForChild("RemoteEvents")
	local poolFixture = Instance.new("Folder")
	poolFixture.Name = "001_PoolCovers"
	local poolCover = Instance.new("Part")
	poolCover.Name = "11"
	poolCover.Transparency = 0
	poolCover.CanCollide = true
	poolCover.Anchored = true
	poolCover.Parent = poolFixture
	local poolOff = RuntimeCore.toggleNativePoolCover(poolFixture, 11)
	local poolHidden = poolOff.ok and poolOff.on == false and poolCover.Transparency == 1 and poolCover.CanCollide == false
	local poolOn = RuntimeCore.toggleNativePoolCover(poolFixture, 11)
	local poolCoverOk = poolHidden and poolOn.ok and poolOn.on == true and poolCover.Transparency == 0 and poolCover.CanCollide == true
	poolFixture:Destroy()

	local cardDisplay = Instance.new("Part")
	cardDisplay.Name = "FakeBankKeyCard"
	cardDisplay.Size = Vector3.new(0.46, 0.05, 0.84)
	cardDisplay.Transparency = 0
	cardDisplay.Anchored = true
	local cardDecal = Instance.new("Decal")
	cardDecal.Parent = cardDisplay
	local boyCard = RuntimeCore.buildNativeCreditCardTool(cardDisplay, "CreditCardBoy")
	local girlCard = RuntimeCore.buildNativeCreditCardTool(cardDisplay, "CreditCardGirl")
	local bankCardOk = boyCard.ok and girlCard.ok
		and boyCard.tool.Name == "CreditCardBoy"
		and girlCard.tool.Name == "CreditCardGirl"
		and boyCard.handle.Anchored == false and girlCard.handle.Anchored == false
		and boyCard.tool:GetAttribute("BrookhavenCreditCardSource") == "FakeBankKeyCard"
		and girlCard.tool:GetAttribute("BrookhavenCreditCardSource") == "FakeBankKeyCard"
	if boyCard.tool then boyCard.tool:Destroy() end
	if girlCard.tool then girlCard.tool:Destroy() end
	cardDisplay:Destroy()

	local bannedLotsFixture = Instance.new("Model")
	bannedLotsFixture.Name = "BannedLots"
	local nativeBanSource = Instance.new("Part")
	nativeBanSource.Name = "BannedBlock11"
	nativeBanSource.Size = Vector3.new(12, 8, 1)
	nativeBanSource.Parent = bannedLotsFixture
	local banInspect = RuntimeCore.inspectNativeBanBlock(bannedLotsFixture, 11)
	local banClone = RuntimeCore.cloneNativeBanBlock(bannedLotsFixture, 11)
	local permissionFolder = Instance.new("Folder")
	permissionFolder.Name = "PermissionPlayers"
	local permissionTarget = Instance.new("Folder")
	permissionTarget.Name = "RoommatePlayer"
	local permissionOn = RuntimeCore.setNativeHousePermission(permissionFolder, permissionTarget, true)
	local permissionOff = RuntimeCore.setNativeHousePermission(permissionFolder, permissionTarget, false)
	local houseAccessOk = banInspect.ok
		and banClone.ok and banClone.block ~= nil
		and banClone.block.Name == "BannedBlock11"
		and banClone.block:GetAttribute("BrookhavenNativeBanBlock") == true
		and permissionOn.ok
		and permissionOff.ok
		and permissionFolder:FindFirstChild("RoommatePlayer") == nil
	if banClone.block then banClone.block:Destroy() end
	bannedLotsFixture:Destroy()
	permissionFolder:Destroy()
	permissionTarget:Destroy()

	local singleVehicles = ReplicatedStorage:WaitForChild("SingleVehicles")
	local noMotorKinds = {"Scooter", "SegwaySmall", "SkateBoard"}
	local noMotorResults = {}
	local noMotorOk = true
	for _, kind in ipairs(noMotorKinds) do
		local template = singleVehicles:FindFirstChild(kind)
		if not (template and template:IsA("Model")) then
			noMotorOk = false
			table.insert(noMotorResults, {kind = kind, ok = false, code = "template_missing"})
		else
			local character = Instance.new("Model")
			local root = Instance.new("Part")
			root.Name = "HumanoidRootPart"
			root.Anchored = true
			root.CFrame = CFrame.new(0, 50, 0)
			root.Parent = character
			local clone = template:Clone()
			clone:SetAttribute("BrookhavenNoMotorSourceName", kind)
			local attached = RuntimeCore.attachNoMotorVehicle(clone, character)
			local middle = clone:FindFirstChild("Middle", true)
			local expected = attached.ok
				and clone.Parent == character
				and clone.Name == "NoMotorVehicleModel"
				and clone:GetAttribute("BrookhavenNativeNoMotor") == true
				and middle and middle:IsA("BasePart")
				and middle.Anchored == false
				and middle.CanCollide == false
				and middle:FindFirstChild("StarBloxNoMotorRootWeld") ~= nil
			noMotorOk = noMotorOk and expected == true
			table.insert(noMotorResults, {kind = kind, ok = expected == true})
			character:Destroy()
		end
	end

	local heliFixture = Instance.new("Model")
	heliFixture.Name = "Heli"
	local heliSeat = Instance.new("VehicleSeat")
	heliSeat.Name = "VehicleSeat"
	heliSeat.Parent = heliFixture
	local heliGyro = Instance.new("BodyGyro")
	heliGyro.Name = "BodyGyro"
	heliGyro.P = 3000
	heliGyro.D = 500
	heliGyro.MaxTorque = Vector3.new(0, 0, 0)
	heliGyro.Parent = heliSeat
	local heliVelocity = Instance.new("BodyVelocity")
	heliVelocity.Name = "BodyVelocity"
	heliVelocity.P = 1250
	heliVelocity.MaxForce = Vector3.new(0, 0, 0)
	heliVelocity.Parent = heliSeat
	local heliConfig = Instance.new("Configuration")
	heliConfig.Name = "Configuration"
	heliConfig.Parent = heliSeat
	local heliMaxSpeed = Instance.new("NumberValue")
	heliMaxSpeed.Name = "MaxSpeed"
	heliMaxSpeed.Value = 80
	heliMaxSpeed.Parent = heliConfig
	local heliMaxForce = Instance.new("NumberValue")
	heliMaxForce.Name = "MaxForce"
	heliMaxForce.Value = 100000000
	heliMaxForce.Parent = heliConfig
	local heliTurnSpeed = Instance.new("NumberValue")
	heliTurnSpeed.Name = "TurnSpeed"
	heliTurnSpeed.Value = 4.5
	heliTurnSpeed.Parent = heliConfig
	local heliGiver = Instance.new("Script")
	heliGiver.Name = "Gui Giver"
	heliGiver.Parent = heliSeat
	local heliOwner = Instance.new("StringValue")
	heliOwner.Name = "Owner"
	heliOwner.Parent = heliGiver
	local heliLanding = Instance.new("BoolValue")
	heliLanding.Name = "Landing"
	heliLanding.Parent = heliGiver
	local heliGui = Instance.new("ScreenGui")
	heliGui.Name = "HeliGui"
	heliGui.Parent = heliSeat
	local heliCarSeat = Instance.new("ObjectValue")
	heliCarSeat.Name = "CarSeat"
	heliCarSeat.Parent = heliGui
	local heliFrame = Instance.new("Frame")
	heliFrame.Name = "Frame"
	heliFrame.Parent = heliGui
	local heliControls = Instance.new("LocalScript")
	heliControls.Name = "VehicleControls"
	heliControls.Disabled = false
	heliControls.Parent = heliFrame
	local heliTakeOff = Instance.new("BoolValue")
	heliTakeOff.Name = "TakeOffBool"
	heliTakeOff.Parent = heliControls
	local heliInspect = RuntimeCore.inspectNativeHelicopter(heliFixture)
	local heliGuiBuild = RuntimeCore.buildHelicopterGui(heliFixture)
	local heliFlightOn = RuntimeCore.setHelicopterFlightEnabled(heliFixture, true)
	local heliLift = RuntimeCore.updateHelicopterVelocity(heliFixture, 18)
	local heliSpeedUp = RuntimeCore.adjustHelicopterSpeed(heliFixture, 10)
	local heliSpeedCap = RuntimeCore.adjustHelicopterSpeed(heliFixture, 1000)
	local heliFlightOff = RuntimeCore.setHelicopterFlightEnabled(heliFixture, false)
	local heliFinal = RuntimeCore.inspectNativeHelicopter(heliFixture)
	local heliGuiOk = heliInspect.ok
		and heliInspect.maxSpeed == 80
		and heliInspect.maxForce == 100000000
		and math.abs((heliInspect.turnSpeed or 0) - 4.5) < 0.001
		and heliGuiBuild.ok
		and heliGuiBuild.carSeat.Value == heliSeat
		and heliGuiBuild.controls.Disabled == false
		and heliGuiBuild.takeOffBool.Value == false
		and heliGuiBuild.gui:GetAttribute("BrookhavenNativeHeliGui") == true
		and heliFlightOn.ok
		and heliLift.ok and heliLift.velocity.Y == 18
		and heliSpeedUp.ok and heliSpeedUp.speed > 25
		and heliSpeedCap.ok and heliSpeedCap.speed == 80
		and heliFlightOff.ok
		and heliFinal.bodyVelocity.MaxForce == Vector3.zero
		and heliFinal.bodyGyro.MaxTorque == Vector3.zero
		and heliFinal.landing.Value == true
	if heliGuiBuild.gui then
		heliGuiBuild.gui:Destroy()
	end
	heliFixture:Destroy()

	local socialCarrier = Instance.new("Model")
	socialCarrier.Name = "Carrier"
	local carrierTorso = Instance.new("Part")
	carrierTorso.Name = "UpperTorso"
	carrierTorso.Anchored = true
	carrierTorso.Parent = socialCarrier
	local socialPassenger = Instance.new("Model")
	socialPassenger.Name = "Passenger"
	local passengerTorso = Instance.new("Part")
	passengerTorso.Name = "UpperTorso"
	passengerTorso.Anchored = true
	passengerTorso.Parent = socialPassenger
	local socialPair = RuntimeCore.createClient2ClientWeld(socialCarrier, socialPassenger, "Piggyback")
	local socialWeld = passengerTorso:FindFirstChild("Client_To_ClientWeld")
	local socialBag = Instance.new("Folder")
	local socialPartner = Instance.new("Folder")
	local pairValue = RuntimeCore.setClient2ClientPairValue(socialBag, socialPartner)
	local pairValueCreated = pairValue.ok and socialBag:FindFirstChild("Client2Client") ~= nil and socialBag.Client2Client.Value == socialPartner
	local socialClear = RuntimeCore.clearClient2ClientWeld(socialPassenger)
	local pairClear = RuntimeCore.clearClient2ClientPairValue(socialBag)
	local socialOk = socialPair.ok
		and socialWeld ~= nil and socialWeld:IsA("Weld")
		and socialWeld.Part0 == carrierTorso and socialWeld.Part1 == passengerTorso
		and socialWeld:GetAttribute("BrookhavenSocialMode") == "Piggyback"
		and pairValueCreated
		and socialClear.ok and passengerTorso:FindFirstChild("Client_To_ClientWeld") == nil
		and pairClear.ok and socialBag:FindFirstChild("Client2Client") == nil
	socialCarrier:Destroy()
	socialPassenger:Destroy()
	socialBag:Destroy()
	socialPartner:Destroy()

	local musicFixture = Instance.new("Model")
	local stereoFixture = Instance.new("Model")
	stereoFixture.Name = "HouseStereo"
	stereoFixture.Parent = musicFixture
	local musicPart = Instance.new("Part")
	musicPart.Name = "MusicEmitter"
	musicPart.Parent = stereoFixture
	local musicSet = RuntimeCore.applyHouseMusicMutation(musicFixture, "PickingHouseMusicText", "123456")
	local musicPlay = RuntimeCore.applyHouseMusicMutation(musicFixture, "PickingHouseMusicPlay", "Play")
	local musicSound = musicFixture:FindFirstChild("BrookhavenHouseMusic", true)
	local musicStop = RuntimeCore.applyHouseMusicMutation(musicFixture, "PickingHouseMusicStop", "Stop")
	local houseMusicOk = musicSet.ok and musicPlay.ok and musicStop.ok
		and musicSound ~= nil
		and musicSound:IsDescendantOf(stereoFixture)
		and musicSound.SoundId == "rbxassetid://123456"
		and musicSound.Looped == true
	musicFixture:Destroy()

	local curtainFixture = Instance.new("Model")
	local curtainState = Instance.new("Script")
	curtainState.Name = "MainHouseScript"
	curtainState.Parent = curtainFixture
	local curtainOpen = Instance.new("BoolValue")
	curtainOpen.Name = "CurtainOpen"
	curtainOpen.Value = false
	curtainOpen.Parent = curtainState
	local curtainChanging = Instance.new("BoolValue")
	curtainChanging.Name = "CurtainchangingState"
	curtainChanging.Parent = curtainState
	local curtainModel = Instance.new("Model")
	curtainModel.Name = "001_Curtains"
	curtainModel.Parent = curtainFixture
	local curtainPart = Instance.new("Part")
	curtainPart.Transparency = 0.25
	curtainPart.CanCollide = true
	curtainPart.Parent = curtainModel
	local curtainOpenResult = RuntimeCore.toggleCurtains(curtainFixture)
	local curtainOpened = curtainOpenResult.ok and curtainOpenResult.open == true and curtainPart.Transparency == 1 and curtainPart.CanCollide == false and curtainOpen.Value == true
	local curtainCloseResult = RuntimeCore.toggleCurtains(curtainFixture)
	local curtainOk = curtainOpened and curtainCloseResult.ok and curtainCloseResult.open == false and math.abs(curtainPart.Transparency - 0.25) < 0.001 and curtainPart.CanCollide == true and curtainOpen.Value == false
	curtainFixture:Destroy()

	local vehicleMusicFixture = Instance.new("Model")
	local vehicleMusicSeat = Instance.new("VehicleSeat")
	vehicleMusicSeat.Name = "VehicleSeat"
	vehicleMusicSeat.Parent = vehicleMusicFixture
	local vehicleMusicSet = RuntimeCore.applyVehicleMusicMutation(vehicleMusicFixture, "PickingCarMusicText", "987654")
	local vehicleMusicPlay = RuntimeCore.applyVehicleMusicMutation(vehicleMusicFixture, "CarMusicPlay", "Play")
	local vehicleMusicSound = vehicleMusicFixture:FindFirstChild("BrookhavenVehicleMusic", true)
	local vehicleMusicStop = RuntimeCore.applyVehicleMusicMutation(vehicleMusicFixture, "CarMusicStop", "Stop")
	local scooterActionRecognized = RuntimeCore.isVehicleMusicAction("PickingScooterMusicPlay")
	local vehicleMusicOk = vehicleMusicSet.ok and vehicleMusicPlay.ok and vehicleMusicStop.ok
		and scooterActionRecognized
		and vehicleMusicSound ~= nil
		and vehicleMusicSound.SoundId == "rbxassetid://987654"
		and vehicleMusicSound.Looped == true
	vehicleMusicFixture:Destroy()

	local horseLifecycleFixture = Instance.new("Model")
	local lifecycleHumanoid = Instance.new("Humanoid")
	lifecycleHumanoid.Parent = horseLifecycleFixture
	local lifecycleUpperTorso = Instance.new("Part")
	lifecycleUpperTorso.Name = "UpperTorso"
	lifecycleUpperTorso.CanCollide = true
	lifecycleUpperTorso.Parent = horseLifecycleFixture
	local lifecycleSeat = Instance.new("Part")
	lifecycleSeat.Name = "Seat"
	lifecycleSeat.CanCollide = true
	lifecycleSeat.Parent = horseLifecycleFixture
	local lifecycleOwner = Instance.new("ObjectValue")
	lifecycleOwner.Name = "Owner"
	lifecycleOwner.Parent = horseLifecycleFixture
	local lifecycleMount = Instance.new("Part")
	lifecycleMount.Name = "MountButton"
	lifecycleMount.Parent = horseLifecycleFixture
	local lifecycleClick = Instance.new("ClickDetector")
	lifecycleClick.MaxActivationDistance = 10
	lifecycleClick.Parent = lifecycleMount
	local lifecycleGui = Instance.new("BillboardGui")
	lifecycleGui.Enabled = true
	lifecycleGui.Parent = lifecycleMount
	local lifecycleAnimations = Instance.new("Folder")
	lifecycleAnimations.Name = "Animations"
	lifecycleAnimations.Parent = horseLifecycleFixture
	for _, animationName in ipairs({"Walk", "Idle", "Jump", "Fall"}) do
		local animation = Instance.new("Animation")
		animation.Name = animationName
		animation.Parent = lifecycleAnimations
	end
	local horseLifecycleInspect = RuntimeCore.inspectNativeHorse(horseLifecycleFixture)
	local lifecycleCharacter = Instance.new("Model")
	local lifecycleRoot = Instance.new("Part")
	lifecycleRoot.Name = "HumanoidRootPart"
	lifecycleRoot.CFrame = CFrame.new(12, 8, -4)
	lifecycleRoot.Parent = lifecycleCharacter
	local lifecycleWorld = Instance.new("Folder")
	lifecycleWorld.Parent = ServerStorage
	local horseLifecycleMounted = RuntimeCore.mountHorseToCharacter(horseLifecycleFixture, lifecycleCharacter)
	local mountWeld = lifecycleUpperTorso:FindFirstChild("StarBloxHorseMountWeld")
	local mountedOk = horseLifecycleMounted.ok
		and horseLifecycleFixture.Parent == lifecycleCharacter
		and mountWeld ~= nil and mountWeld:IsA("WeldConstraint")
		and lifecycleUpperTorso.CanCollide == false
		and lifecycleUpperTorso.Massless == true
		and lifecycleSeat.CanCollide == false
		and lifecycleClick.MaxActivationDistance == 0
		and lifecycleGui.Enabled == false
	local horseLifecycleRestored = RuntimeCore.dismountHorseToWorld(horseLifecycleFixture, lifecycleCharacter, lifecycleWorld)
	local horseLifecycleOk = horseLifecycleInspect.ok and mountedOk and horseLifecycleRestored.ok
		and horseLifecycleFixture.Parent == lifecycleWorld
		and lifecycleUpperTorso:FindFirstChild("StarBloxHorseMountWeld") == nil
		and lifecycleUpperTorso.CanCollide == true
		and lifecycleUpperTorso.Massless == false
		and lifecycleSeat.CanCollide == true
		and lifecycleClick.MaxActivationDistance == 10
		and lifecycleGui.Enabled == true
	lifecycleWorld:Destroy()
	lifecycleCharacter:Destroy()

	local followerDisplay = Instance.new("Part")
	followerDisplay.Name = "BabyGirl"
	followerDisplay.Size = Vector3.new(1.4, 2.3, 0.9)
	followerDisplay.Color = Color3.fromRGB(255, 170, 204)
	followerDisplay.Anchored = true
	followerDisplay.CanCollide = true
	local followerMesh = Instance.new("SpecialMesh")
	followerMesh.Parent = followerDisplay
	local followerClick = Instance.new("ClickDetector")
	followerClick.Parent = followerDisplay
	local followerBuild = RuntimeCore.buildFollowerFromDisplayPart(followerDisplay, "BabyGirl2")
	local followerModel = followerBuild.model
	local followerTorso = followerModel and followerModel:FindFirstChild("Torso")
	local followerHumanoid = followerModel and followerModel:FindFirstChildOfClass("Humanoid")
	local followerName = followerModel and followerModel:FindFirstChild("FollowName")
	local followerOk = followerBuild.ok
		and followerModel ~= nil
		and followerModel.Name == "FollowCharacter"
		and followerModel.PrimaryPart == followerTorso
		and followerTorso ~= nil and followerTorso:IsA("BasePart")
		and followerTorso.Size == Vector3.new(1.4, 2.3, 0.9)
		and followerTorso.Anchored == false
		and followerTorso.CanCollide == false
		and followerTorso:FindFirstChildOfClass("SpecialMesh") ~= nil
		and followerTorso:FindFirstChildOfClass("ClickDetector") == nil
		and followerHumanoid ~= nil
		and followerName ~= nil and followerName:IsA("StringValue") and followerName.Value == "BabyGirl2"
		and followerModel:GetAttribute("BrookhavenNativeDisplaySource") == true
	if followerModel then
		followerModel:Destroy()
	end
	followerDisplay:Destroy()

	local displayPart = Instance.new("Part")
	displayPart.Name = "Basketball"
	displayPart.Size = Vector3.new(2, 2, 2)
	displayPart.Color = Color3.fromRGB(255, 128, 0)
	displayPart.Anchored = true
	displayPart.CanCollide = true
	local displayMesh = Instance.new("SpecialMesh")
	displayMesh.MeshType = Enum.MeshType.Sphere
	displayMesh.Parent = displayPart
	local displayClick = Instance.new("ClickDetector")
	displayClick.Parent = displayPart
	local displayGui = Instance.new("BillboardGui")
	displayGui.Parent = displayPart
	local displayToolResult = RuntimeCore.buildToolFromDisplayPart(displayPart, "Basketball")
	local displayTool = displayToolResult.tool
	local displayHandle = displayTool and displayTool:FindFirstChild("Handle")
	local toolVisualOk = displayToolResult.ok
		and displayTool ~= nil
		and displayHandle ~= nil
		and displayHandle:IsA("BasePart")
		and displayTool.Name == "Basketball"
		and displayHandle.Size == Vector3.new(2, 2, 2)
		and displayHandle.Color == Color3.fromRGB(255, 128, 0)
		and displayHandle.Anchored == false
		and displayHandle.CanCollide == false
		and displayHandle.Massless == true
		and displayHandle:FindFirstChildOfClass("SpecialMesh") ~= nil
		and displayHandle:FindFirstChildOfClass("ClickDetector") == nil
		and displayHandle:FindFirstChildOfClass("BillboardGui") == nil
		and displayTool:GetAttribute("BrookhavenNativeDisplaySource") == true
	if displayTool then
		displayTool:Destroy()
	end
	displayPart:Destroy()

	local horseFixture = Instance.new("Model")
	local horseHead = Instance.new("Part")
	horseHead.Name = "Head"
	horseHead.Parent = horseFixture
	local horseNameGui = Instance.new("BillboardGui")
	horseNameGui.Name = "NameGUI"
	horseNameGui.Parent = horseHead
	local horseNameText = Instance.new("TextBox")
	horseNameText.Name = "NameTxt"
	horseNameText.Parent = horseNameGui
	local horseTorso = Instance.new("Part")
	horseTorso.Name = "UpperTorso"
	horseTorso.Parent = horseFixture
	local horseBodyState = Instance.new("StringValue")
	horseBodyState.Name = "Color"
	horseBodyState.Parent = horseTorso
	local horseTexture = Instance.new("Texture")
	horseTexture.Name = "Texture"
	horseTexture.Parent = horseTorso
	local horseMane = Instance.new("Part")
	horseMane.Name = "Mane"
	horseMane.Parent = horseFixture
	local horseManeState = Instance.new("StringValue")
	horseManeState.Name = "HairColor"
	horseManeState.Parent = horseMane
	local horseTail = Instance.new("Part")
	horseTail.Name = "Tail"
	horseTail.Parent = horseFixture
	local horseTailState = Instance.new("StringValue")
	horseTailState.Name = "HairColor"
	horseTailState.Parent = horseTail
	local horseSaddle = Instance.new("Part")
	horseSaddle.Name = "Saddle"
	horseSaddle.Parent = horseFixture
	local horseSeat = Instance.new("Part")
	horseSeat.Name = "Seat"
	horseSeat.Parent = horseFixture
	local horseSeatScript = Instance.new("Script")
	horseSeatScript.Name = "HorseSeat"
	horseSeatScript.Parent = horseSeat
	local blackPreset = Instance.new("Folder")
	blackPreset.Name = "BlackHorse"
	blackPreset.Parent = horseSeatScript
	for valueName, storedValue in pairs({
		HorseBodyColor = "Really black",
		HorseHairColor = "Really black",
		HorseSaddleColor = "Brown",
		HorseTexture = "Really black",
	}) do
		local stored = Instance.new("StringValue")
		stored.Name = valueName
		stored.Value = storedValue
		stored.Parent = blackPreset
	end
	local horseNameResult = RuntimeCore.applyHorseCustomization(horseFixture, "HorseName", "Comet")
	local horseNameColorResult = RuntimeCore.applyHorseCustomization(horseFixture, "HorseNameColor", Color3.fromRGB(255, 0, 0))
	local horseBodyResult = RuntimeCore.applyHorseCustomization(horseFixture, "PickingHorseBodyColor", Color3.fromRGB(163, 162, 165))
	local horseHairResult = RuntimeCore.applyHorseCustomization(horseFixture, "PickingHorseHairColor", Color3.fromRGB(17, 17, 17))
	local horseSaddleResult = RuntimeCore.applyHorseCustomization(horseFixture, "PickingSaddleColor", Color3.fromRGB(124, 92, 70))
	local horseTextureResult = RuntimeCore.applyHorseCustomization(horseFixture, "PickingHorseTexture", Color3.fromRGB(255, 0, 0))
	local horseManualCustomizationOk = horseNameResult.ok
		and horseNameColorResult.ok
		and horseBodyResult.ok
		and horseHairResult.ok
		and horseSaddleResult.ok
		and horseTextureResult.ok
		and horseNameText.Text == "Comet"
		and horseNameText.TextColor3 == Color3.fromRGB(255, 0, 0)
		and horseTorso.Color == Color3.fromRGB(163, 162, 165)
		and horseBodyState.Value == "Medium stone grey"
		and horseMane.Color == Color3.fromRGB(17, 17, 17)
		and horseTail.Color == Color3.fromRGB(17, 17, 17)
		and horseSaddle.Color == Color3.fromRGB(124, 92, 70)
	local horsePresetResult = RuntimeCore.applyHorseCustomization(horseFixture, "BlackHorseFree")
	local horsePresetOk = horsePresetResult.ok
		and horseTorso.Color == Color3.fromRGB(17, 17, 17)
		and horseBodyState.Value == "Really black"
		and horseMane.Color == Color3.fromRGB(17, 17, 17)
		and horseTail.Color == Color3.fromRGB(17, 17, 17)
		and horseSaddle.Color == Color3.fromRGB(124, 92, 70)
	local horseCustomizationOk = horseManualCustomizationOk and horsePresetOk
	horseFixture:Destroy()

	local houseFireFixture = Instance.new("Model")
	local houseFireModel = Instance.new("Model")
	houseFireModel.Name = "001_Fire"
	houseFireModel.Parent = houseFireFixture
	local houseFirePart = Instance.new("Part")
	houseFirePart.Name = "Fire"
	houseFirePart.Parent = houseFireModel
	local nativeFire = Instance.new("Fire")
	nativeFire.Enabled = false
	nativeFire.Parent = houseFirePart
	local nativeFireLight = Instance.new("PointLight")
	nativeFireLight.Enabled = false
	nativeFireLight.Parent = houseFirePart
	local houseFireOn = RuntimeCore.applyHouseFireMutation(houseFireFixture, "PlayerWantsFireOnFirePass")
	local houseFireOnOk = houseFireOn.ok and nativeFire.Enabled == true and nativeFireLight.Enabled == true
	local houseFireOff = RuntimeCore.applyHouseFireMutation(houseFireFixture, "PlayerWantsFireOffFirePass")
	local houseFireOk = houseFireOnOk and houseFireOff.ok and nativeFire.Enabled == false and nativeFireLight.Enabled == false
	houseFireFixture:Destroy()

	local hairFixture = Instance.new("Model")
	for i = 1, 3 do
		local accessory = Instance.new("Accessory")
		accessory.Name = "Hair" .. tostring(i)
		local handle = Instance.new("Part")
		handle.Name = "Handle"
		handle.Color = Color3.fromRGB(255, 255, 255)
		handle.Parent = accessory
		accessory.Parent = hairFixture
	end
	local hairResult = RuntimeCore.applyHairColor(hairFixture, "ChangeHairColor2", Color3.fromRGB(255, 0, 0))
	local hair1 = hairFixture:FindFirstChild("Hair1").Handle
	local hair2 = hairFixture:FindFirstChild("Hair2").Handle
	local hair3 = hairFixture:FindFirstChild("Hair3").Handle
	local hairColorOk = hairResult.ok
		and hair1.Color == Color3.fromRGB(255, 255, 255)
		and hair2.Color == Color3.fromRGB(255, 0, 0)
		and hair3.Color == Color3.fromRGB(255, 255, 255)
	hairFixture:Destroy()

	local clockNoon = RuntimeCore.formatClockTime(12.5)
	local clockMidnight = RuntimeCore.formatClockTime(0)
	local dayName = RuntimeCore.dayNameFromWeekday(2)
	local clockOk = clockNoon == "12:30 PM" and clockMidnight == "12:00 AM" and dayName == "Monday"

	local avatarDescription = Instance.new("HumanoidDescription")
	local outfit = RuntimeCore.applyNativeAvatarMutation(avatarDescription, DEFAULT_SKIN_TONES, "outfit", 123456, 654321)
	local scale = RuntimeCore.applyNativeAvatarMutation(avatarDescription, DEFAULT_SKIN_TONES, "scale", 0.75)
	local skin = RuntimeCore.applyNativeAvatarMutation(avatarDescription, DEFAULT_SKIN_TONES, "skintone", "Really red")
	local avatarOk = outfit.ok and scale.ok and skin.ok
		and avatarDescription.Shirt == 123456
		and avatarDescription.Pants == 654321
		and math.abs(avatarDescription.HeightScale - 0.75) < 0.001
		and avatarDescription.HeadColor == Color3.fromRGB(255, 0, 0)
	avatarDescription:Destroy()

	local bag = ReplicatedStorage:WaitForChild("PlayersStartup"):WaitForChild("PlayersBag"):Clone()
	local music = RuntimeCore.applyPassActionToBag(bag, "BoughtMusic")
	local speed = RuntimeCore.applyPassActionToBag(bag, "BoughtSpeed200")
	local shopOk = music.ok and speed.ok
		and bag.MusicPass.Value == true
		and bag.SpeedPass200.Value == true
		and bag.VehicleSpeed.Value == 200
		and bag.SpeedPassNoMotorVehicle.Value == 45
	bag:Destroy()

	local profileBag = ReplicatedStorage:WaitForChild("PlayersStartup"):WaitForChild("PlayersBag"):Clone()
	local rpName = RuntimeCore.applyRolePlayTextToBag(profileBag, "RolePlayName", "Alex")
	local rpBio = RuntimeCore.applyRolePlayTextToBag(profileBag, "RolePlayBio", "Brookhaven resident")
	local rpColor = RuntimeCore.applyRolePlayColorToBag(profileBag, "PickingRPNameColor", Color3.fromRGB(255, 0, 0))
	local job = RuntimeCore.applyJobStateToBag(profileBag, "GiveJobUIMenu", "Police", "12345", false)
	local profileOk = rpName.ok and rpBio.ok and rpColor.ok and job.ok
		and profileBag.RPName.Value == "Alex"
		and profileBag.RPBio.Value == "Brookhaven resident"
		and profileBag.RPNameColor.Value == "Really red"
		and profileBag.Job.Value == true
		and profileBag.Job.JobName.Value == "Police"
	local quitJob = RuntimeCore.applyJobStateToBag(profileBag, "QuitJob")
	profileOk = profileOk and quitJob.ok and profileBag.Job.Value == false
	profileBag:Destroy()

	local houseFixture = Instance.new("Model")
	local business = Instance.new("Model")
	business.Name = "001_HomeBasedBusiness"
	business.Parent = houseFixture
	local pole = Instance.new("Part")
	pole.Name = "Pole"
	pole.Parent = business
	local surface = Instance.new("SurfaceGui")
	surface.Name = "SurfaceGUI"
	surface.Parent = pole
	local frame = Instance.new("Frame")
	frame.Parent = surface
	local businessText = Instance.new("TextBox")
	businessText.Name = "TextBox"
	businessText.Parent = frame
	local businessName = RuntimeCore.applyHomeBusinessMutation(houseFixture, "BusinessName", "Brookhaven Clinic")
	local businessColor = RuntimeCore.applyHomeBusinessMutation(houseFixture, "PickingBusinessNameColor", Color3.fromRGB(255, 0, 0))
	local houseBusinessOk = businessName.ok and businessColor.ok
		and businessText.Text == "Brookhaven Clinic"
		and businessText.TextColor3 == Color3.fromRGB(255, 0, 0)
	houseFixture:Destroy()

	local carBackup = ReplicatedStorage:WaitForChild("003_CarBackup")
	local singleVehicles = ReplicatedStorage:FindFirstChild("SingleVehicles")
	local children = carBackup:GetChildren()
	table.sort(children, function(a, b)
		return a.Name < b.Name
	end)
	local vehicleTemplate = children[1]
	local vehicleResult = vehicleTemplate and RuntimeCore.cloneVehicleTemplate(carBackup, singleVehicles, vehicleTemplate.Name, false)
		or {ok = false, code = "no_vehicle_templates"}
	local vehicleOk = false
	local vehicleName = nil
	local descendants = 0
	local hasVehicleSeat = false
	local driveReady = nil
	if vehicleResult.ok and vehicleResult.model then
		local model = vehicleResult.model
		driveReady = RuntimeCore.prepareNativeVehicle(model)
		model.Parent = ServerStorage
		local pivotOk = pcall(function()
			model:PivotTo(CFrame.new(0, -10000, 0))
		end)
		descendants = #model:GetDescendants()
		hasVehicleSeat = RuntimeCore.primaryVehicleSeat(model) ~= nil
		vehicleName = vehicleResult.vehicle
		vehicleOk = pivotOk and descendants > 0 and hasVehicleSeat and driveReady.ok == true
		model:Destroy()
	end

	local contractsOk = remotes:WaitForChild("Clothes"):IsA("RemoteEvent")
		and remotes:WaitForChild("UpdateAvatar"):IsA("RemoteEvent")
		and remotes:WaitForChild("Pass"):IsA("RemoteEvent")
		and remotes:WaitForChild("Car"):IsA("RemoteEvent")
		and remotes:WaitForChild("KeyFab"):IsA("RemoteFunction")
		and remotes:WaitForChild("Tools"):IsA("RemoteFunction")
		and remotes:WaitForChild("RPHouseEvent"):IsA("RemoteEvent")
		and remotes:WaitForChild("RPHouseEventColor"):IsA("RemoteEvent")
		and remotes:WaitForChild("HeliControls"):IsA("RemoteEvent")
		and remotes:WaitForChild("Faster"):IsA("RemoteEvent")
		and remotes:WaitForChild("Slower"):IsA("RemoteEvent")

	return {
		ok = bankCardOk and poolCoverOk and houseAccessOk and socialOk and noMotorOk and heliGuiOk and followerOk and houseFireOk and toolVisualOk and vehicleMusicOk and horseLifecycleOk and horseCustomizationOk and hairColorOk and houseMusicOk and curtainOk and clockOk and avatarOk and shopOk and profileOk and houseBusinessOk and vehicleOk and contractsOk,
		poolCover = {ok = poolCoverOk, off = poolOff, on = poolOn},
		bankCard = {ok = bankCardOk, boy = boyCard, girl = girlCard},
		houseAccess = {ok = houseAccessOk, ban = banInspect, permissionOn = permissionOn, permissionOff = permissionOff},
		noMotorVehicles = {ok = noMotorOk, results = noMotorResults},
		helicopter = {ok = heliGuiOk, inspected = heliInspect, gui = heliGuiBuild, flightOn = heliFlightOn, lift = heliLift, speedUp = heliSpeedUp, speedCap = heliSpeedCap, flightOff = heliFlightOff},
		social = {ok = socialOk, pair = socialPair, pairValue = pairValueCreated, cleanup = socialClear},
		helicopterGui = {ok = heliGuiOk, inspected = heliInspect},
		follower = {ok = followerOk, sourceName = followerBuild.sourceName, selected = followerName and followerName.Value or nil},
		houseFire = {ok = houseFireOk, enabled = houseFireOn, disabled = houseFireOff},
		toolVisual = {ok = toolVisualOk, sourceName = displayToolResult.sourceName, sourceClass = displayToolResult.sourceClass},
		vehicleMusic = {ok = vehicleMusicOk, configured = vehicleMusicSet, played = vehicleMusicPlay, stopped = vehicleMusicStop},
		horseLifecycle = {ok = horseLifecycleOk, inspected = horseLifecycleInspect, mounted = horseLifecycleMounted, restored = horseLifecycleRestored},
		horseCustomization = {ok = horseCustomizationOk, name = horseNameResult, nameColor = horseNameColorResult, body = horseBodyResult, hair = horseHairResult, saddle = horseSaddleResult, texture = horseTextureResult, preset = horsePresetResult},
		hairColor = {ok = hairColorOk, result = hairResult},
		houseMusic = {ok = houseMusicOk, configured = musicSet, played = musicPlay, stopped = musicStop},
		curtains = {ok = curtainOk, opened = curtainOpenResult, closed = curtainCloseResult},
		clock = {ok = clockOk, noon = clockNoon, midnight = clockMidnight, day = dayName},
		avatar = {ok = avatarOk, outfit = outfit, scale = scale, skin = skin},
		shop = {ok = shopOk, music = music, speed = speed},
		profile = {ok = profileOk, rolePlayName = rpName, rolePlayBio = rpBio, rolePlayColor = rpColor, job = job, quitJob = quitJob},
		houseBusiness = {ok = houseBusinessOk, name = businessName, color = businessColor},
		vehicle = {ok = vehicleOk, vehicle = vehicleName, descendants = descendants, hasVehicleSeat = hasVehicleSeat, driveReady = driveReady},
		contracts = {ok = contractsOk},
	}
end

return RuntimeCore
