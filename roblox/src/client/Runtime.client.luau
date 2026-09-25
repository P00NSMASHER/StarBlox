--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Bootstrap = require(script.Parent.Bootstrap)
local replicaClientModule = ReplicatedStorage:FindFirstChild("ReplicaClient")

assert(replicaClientModule ~= nil, "Pinned ReplicaClient module missing")

local state = Bootstrap.start(require(replicaClientModule))

return state
