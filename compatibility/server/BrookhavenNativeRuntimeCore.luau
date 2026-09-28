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

function RuntimeCore.runBehaviorProbe()
	local ReplicatedStorage = game:GetService("ReplicatedStorage")
	local ServerStorage = game:GetService("ServerStorage")
	local remotes = ReplicatedStorage:WaitForChild("RemoteEvents")
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

	return {
		ok = avatarOk and shopOk and profileOk and vehicleOk and contractsOk,
		avatar = {ok = avatarOk, outfit = outfit, scale = scale, skin = skin},
		shop = {ok = shopOk, music = music, speed = speed},
		profile = {ok = profileOk, rolePlayName = rpName, rolePlayBio = rpBio, rolePlayColor = rpColor, job = job, quitJob = quitJob},
		vehicle = {ok = vehicleOk, vehicle = vehicleName, descendants = descendants, hasVehicleSeat = hasVehicleSeat, driveReady = driveReady},
		contracts = {ok = contractsOk},
	}
end

return RuntimeCore
