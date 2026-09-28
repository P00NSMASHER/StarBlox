local fs = require('@lune/fs')
local roblox = require('@lune/roblox')
local luau = require('@lune/luau')
local process = require('@lune/process')

local placePath = process.args[1] or 'Brookhaven.rbxl'
local roots = roblox.deserializeModel(fs.readFile(placePath))

local function root(name, className)
	for _, item in roots do
		if item.Name == name and (className == nil or item.ClassName == className) then
			return item
		end
	end
	return nil
end

local function child(parent, name, className)
	local item = parent and parent:FindFirstChild(name)
	assert(item ~= nil, 'missing child ' .. tostring(name) .. ' under ' .. tostring(parent and parent:GetFullName()))
	if className then
		assert(item.ClassName == className, item:GetFullName() .. ' expected ' .. className .. ', got ' .. item.ClassName)
	end
	return item
end

local function compile(label, source)
	local ok, result = pcall(function()
		return luau.load(source)
	end)
	assert(ok, label .. ' failed Luau compilation: ' .. tostring(result))
	print('PATCHED_PLACE_COMPILE_OK ' .. label)
end

local starterPlayer = root('StarterPlayer', 'StarterPlayer')
assert(starterPlayer, 'real StarterPlayer service missing')
local playerScripts = child(starterPlayer, 'StarterPlayerScripts', 'StarterPlayerScripts')
local avatar = child(playerScripts, 'AvatarEditor', 'LocalScript')
assert(avatar.Disabled == false, 'AvatarEditor disabled')
assert(string.find(avatar.Source, 'UpdateAvatar', 1, true), 'AvatarEditor UpdateAvatar callback missing')
assert(string.find(avatar.Source, 'Clothes', 1, true), 'AvatarEditor Clothes callback missing')
assert(string.find(avatar.Source, 'wearPremium', 1, true), 'AvatarEditor premium callback missing')
assert(string.find(avatar.Source, 'CharacterSizeUp', 1, true), 'AvatarEditor size-up callback missing')
assert(string.find(avatar.Source, 'CharacterSizeDown', 1, true), 'AvatarEditor size-down callback missing')
assert(string.find(avatar.Source, 'STARBLOX_AVATAR_NETWORK_INDEPENDENT_PATCH', 1, true), 'AvatarEditor network-independent patch missing')
assert(string.find(avatar.Source, 'wearDirect', 1, true), 'AvatarEditor direct asset route missing')
assert(string.find(avatar.Source, 'StarBloxAvatarDirectField', 1, true), 'AvatarEditor direct field mapper missing')
assert(string.find(avatar.Source, 'STARBLOX_AVATAR_EDITOR_READY', 1, true), 'AvatarEditor readiness sentinel missing')
assert(not string.find(avatar.Source, 'GetCharacterAppearanceInfoAsync(l__LocalPlayer__1.UserId)', 1, true), 'blocking avatar appearance lookup still present')
assert(string.find(avatar.Source, 'v49.Activated:Connect', 1, true), 'outfit touch callback not using Activated')
assert(string.find(avatar.Source, 'Buttons.Smaller.Activated:Connect', 1, true), 'avatar smaller control not using Activated')
assert(string.find(avatar.Source, 'Buttons.Bigger.Activated:Connect', 1, true), 'avatar bigger control not using Activated')
compile('AvatarEditor', avatar.Source)

local buttonModule = child(avatar, 'Button', 'ModuleScript')
compile('AvatarEditor/Button', buttonModule.Source)
child(buttonModule, 'ImageButton', 'ImageButton')
child(avatar, 'CharacterSizeNumber', 'NumberValue')

local archivedRoot = root('StarterPlayer', 'Folder')
if archivedRoot then
	local archivedScripts = archivedRoot:FindFirstChild('StarterPlayerScripts')
	assert(not (archivedScripts and archivedScripts:FindFirstChild('AvatarEditor')), 'archived AvatarEditor still present')
end

local starterGui = root('StarterGui', 'StarterGui')
assert(starterGui, 'StarterGui service missing')
assert(starterGui:FindFirstChild('AvatarEditor') == nil, 'duplicate StarterGui AvatarEditor clone present')
local compat = child(starterGui, 'BrookhavenCompat', 'LocalScript')
compile('BrookhavenCompat', compat.Source)
assert(string.find(compat.Source, 'STARBLOX_BROOKHAVEN_NATIVE_SHOP_FALLBACK_READY', 1, true), 'Shop fallback source missing')
assert(string.find(compat.Source, 'bindPassTarget', 1, true), 'Shop child-button binder missing')
assert(string.find(compat.Source, 'descendant.Name == "Label"', 1, true), 'Shop active Label routing missing')
assert(string.find(compat.Source, 'STARBLOX_UI_ACTION shop_pass', 1, true), 'Shop pass tap telemetry missing')

local main = child(starterGui, 'MainGUIHandler', 'ScreenGui')
local shop = child(main, 'Shop')
local shopOpen = child(child(child(shop, 'OpenButton'), 'MainOpen'), 'Open', 'ImageButton')
assert(shopOpen.Visible ~= nil, 'Shop open button contract invalid')

local mainButtons = child(shop, 'MainButtons')
local mainOpen = child(mainButtons, 'MainOpen')
local categoryButtons = {
	ColorSpeedLower = 'CatagoryVehicleUpgrade',
	Speed200 = 'CatagoryVehicleSpeed',
	Premium = 'CatagoryPremium',
	Music = 'CatagoryMusic',
	Horse = 'CatagoryHorse',
	Fire = 'CatagoryFire',
}
for buttonName, categoryName in pairs(categoryButtons) do
	child(mainOpen, buttonName, 'ImageButton')
	child(shop, categoryName)
end

local purchasePaths = {
	{'CatagoryMusic', 'MainOpen', 'Music', 'BoughtMusic'},
	{'CatagoryPremium', 'MainOpen', 'Premium', 'BoughtPremium'},
	{'CatagoryVehicleUpgrade', 'MainOpen', 'VehicleUpgrade', 'BoughtColorSpeedLower'},
	{'CatagoryVehicleSpeed', 'MainOpen', 'Speed', 'BoughtSpeed200'},
	{'CatagoryHorse', 'MainOpen', 'Horse', 'BoughtHorse'},
	{'CatagoryFire', 'MainOpen', 'Fire', 'BoughtFire'},
}
for _, row in ipairs(purchasePaths) do
	local category = child(shop, row[1])
	local open = child(category, row[2])
	child(open, row[3], 'ImageButton')
	assert(string.find(compat.Source, row[4], 1, true), 'Shop action missing from fallback: ' .. row[4])
end

local serverScripts = root('ServerScriptService', 'ServerScriptService')
assert(serverScripts, 'ServerScriptService missing')
local server = child(serverScripts, 'BrookhavenHouseCompat', 'Script')
assert(string.find(server.Source, 'toggleAvatarAssetDirect', 1, true), 'direct avatar server mutation missing')
assert(string.find(server.Source, 'action == "wearDirect"', 1, true), 'direct avatar remote route missing')
assert(string.find(server.Source, 'currentAppearanceState', 1, true), 'nonblocking avatar state store missing')

local noReset = child(starterGui, 'NoResetGUIHandler', 'ScreenGui')
local editor = child(noReset, 'MainEditor')
local catalog = child(editor, 'Catalog')
local header = child(catalog, 'Header')
child(header, 'CategoryTabs')
child(header, 'SubCategoryTabs')
local container = child(catalog, 'Container')
child(container, 'ScrollingFrame', 'ScrollingFrame')
child(container, 'OutfitFrame', 'ScrollingFrame')
local scale = child(container, 'ScaleFrame')
local scaleButtons = child(scale, 'Buttons')
child(scaleButtons, 'Smaller', 'ImageButton')
child(scaleButtons, 'Bigger', 'ImageButton')

print('PATCHED_PLACE_INTERACTION_CONTRACT_OK avatar=true shop=true')
