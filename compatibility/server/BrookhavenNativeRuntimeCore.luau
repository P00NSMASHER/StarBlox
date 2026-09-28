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

function RuntimeCore.runBehaviorProbe()
	local ReplicatedStorage = game:GetService("ReplicatedStorage")
	local ServerStorage = game:GetService("ServerStorage")
	local remotes = ReplicatedStorage:WaitForChild("RemoteEvents")
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

	return {
		ok = houseMusicOk and curtainOk and clockOk and avatarOk and shopOk and profileOk and houseBusinessOk and vehicleOk and contractsOk,
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
