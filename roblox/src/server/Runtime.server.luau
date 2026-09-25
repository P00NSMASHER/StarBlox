--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local Bootstrap = require(script.Parent.Bootstrap)

local serverPackages = ServerScriptService:FindFirstChild("ServerPackages")
assert(serverPackages ~= nil, "StarBlox ServerPackages missing; run 'wally install' from roblox/")

local sharedPackages = ReplicatedStorage:FindFirstChild("Packages")
assert(sharedPackages ~= nil, "StarBlox Packages missing; run 'wally install' from roblox/")

local profileStoreModule = serverPackages:FindFirstChild("ProfileStore")
local matterModule = sharedPackages:FindFirstChild("Matter")
local replicaServerModule = ServerScriptService:FindFirstChild("ReplicaServer")

assert(profileStoreModule ~= nil, "ProfileStore package missing from ServerPackages")
assert(matterModule ~= nil, "Matter package missing from Packages")
assert(replicaServerModule ~= nil, "Pinned ReplicaServer module missing")

local services = Bootstrap.start({
	ProfileStore = require(profileStoreModule),
	Replica = require(replicaServerModule),
	Matter = require(matterModule),
})

return services
