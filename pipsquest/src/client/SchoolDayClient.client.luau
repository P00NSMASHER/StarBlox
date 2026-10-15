--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local SchoolDayReplica = require(script.Parent:WaitForChild("SchoolDayReplica"))
local SchoolDaySyncController = require(script.Parent:WaitForChild("SchoolDaySyncController"))

local runtime = ReplicatedStorage:WaitForChild("StarBloxSchoolDay")
local snapshotChanged = runtime:WaitForChild("SnapshotChanged") :: RemoteEvent
local getSnapshot = runtime:WaitForChild("GetSnapshot") :: RemoteFunction
local getUpdates = runtime:WaitForChild("GetUpdates") :: RemoteFunction

local replica = SchoolDayReplica.new()
local controller = SchoolDaySyncController.new(replica, {
	getSnapshot = function()
		return getSnapshot:InvokeServer()
	end,
	getUpdates = function(afterSequence: number)
		return getUpdates:InvokeServer(afterSequence)
	end,
})

-- Subscribe before bootstrap so a transition racing the initial snapshot is
-- queued and reconciled instead of being silently lost.
snapshotChanged.OnClientEvent:Connect(function(envelope)
	task.spawn(function()
		local result = controller:handleLive(envelope)
		if result.status == "RECOVERY_FAILED" then
			warn("STARBLOX_SCHOOL_DAY_CLIENT_RECOVERY_FAILED")
		end
	end)
end)

local bootstrap = controller:bootstrap()
if bootstrap.status == "RECOVERY_FAILED" then
	warn("STARBLOX_SCHOOL_DAY_CLIENT_BOOTSTRAP_FAILED")
else
	print("STARBLOX_SCHOOL_DAY_CLIENT_READY")
end
