local ReplicatedStorage = game:GetService("ReplicatedStorage")

local sharedRoot = ReplicatedStorage:WaitForChild("StarBlox")
local Config = require(sharedRoot:WaitForChild("Config"))

assert(Config.ProjectName == "StarBlox", "StarBlox shared config mismatch")

script.Parent:SetAttribute("StarBloxServerReady", true)
