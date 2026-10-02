--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local sharedRoot = ReplicatedStorage:WaitForChild("PipsQuestShared")
local SchoolDayStateMachine = require(sharedRoot:WaitForChild("SchoolDayStateMachine"))
local SchoolDayCoordinator = require(script.Parent:WaitForChild("SchoolDayCoordinator"))
local SchoolDayTransitionJournal = require(script.Parent:WaitForChild("SchoolDayTransitionJournal"))

-- Game-scaled schedule: one complete school loop every thirteen minutes.
-- Classroom destinations and lesson content are intentionally owned elsewhere.
local SCHEDULE = {
	{id = "ARRIVAL", durationSeconds = 45},
	{id = "HOMEROOM", durationSeconds = 60},
	{id = "CLASS_1", durationSeconds = 150},
	{id = "PASSING_1", durationSeconds = 30},
	{id = "CLASS_2", durationSeconds = 150},
	{id = "LUNCH", durationSeconds = 90},
	{id = "PASSING_2", durationSeconds = 30},
	{id = "CLASS_3", durationSeconds = 150},
	{id = "DISMISSAL", durationSeconds = 45},
}

local INTERMISSION_SECONDS = 30
local SAMPLE_SECONDS = 0.5
local REPLAY_CAPACITY = 32

local function ensureChild(parent: Instance, className: string, name: string): Instance
	local existing = parent:FindFirstChild(name)
	if existing ~= nil then
		assert(existing.ClassName == className, name .. " has incompatible class " .. existing.ClassName)
		return existing
	end
	local child = Instance.new(className)
	child.Name = name
	child.Parent = parent
	return child
end

local runtime = ensureChild(ReplicatedStorage, "Folder", "StarBloxSchoolDay") :: Folder
assert(runtime:GetAttribute("AuthoritativeServerReady") ~= true, "duplicate school-day server owner")
runtime:SetAttribute("AuthoritativeServerReady", true)
runtime:SetAttribute("ProtocolVersion", 1)

local snapshotChanged = ensureChild(runtime, "RemoteEvent", "SnapshotChanged") :: RemoteEvent
local getSnapshot = ensureChild(runtime, "RemoteFunction", "GetSnapshot") :: RemoteFunction
local getUpdates = ensureChild(runtime, "RemoteFunction", "GetUpdates") :: RemoteFunction

local machine = SchoolDayStateMachine.new(SCHEDULE)
local coordinator = SchoolDayCoordinator.new(machine, workspace:GetServerTimeNow(), INTERMISSION_SECONDS)
local journal = SchoolDayTransitionJournal.new(REPLAY_CAPACITY)

local function sample()
	local result = coordinator:step(workspace:GetServerTimeNow())
	if result.changed then
		assert(journal:append(result.envelope), "school-day transition sequence must increase")
		snapshotChanged:FireAllClients(result.envelope)
	end
	return result.envelope
end

getSnapshot.OnServerInvoke = function(_player: Player)
	return sample()
end

getUpdates.OnServerInvoke = function(_player: Player, afterSequence: any)
	if type(afterSequence) ~= "number"
		or afterSequence ~= afterSequence
		or afterSequence == math.huge
		or afterSequence == -math.huge
		or afterSequence < 0
		or afterSequence ~= math.floor(afterSequence)
	then
		return table.freeze({
			ok = false,
			errorCode = "INVALID_SEQUENCE_CURSOR",
		})
	end

	return table.freeze({
		ok = true,
		replay = journal:readAfter(afterSequence),
	})
end

local initialEnvelope = sample()
assert(journal:append(initialEnvelope), "initial school-day snapshot must be journaled")
snapshotChanged:FireAllClients(initialEnvelope)

task.spawn(function()
	while true do
		task.wait(SAMPLE_SECONDS)
		sample()
	end
end)

print("STARBLOX_SCHOOL_DAY_RUNTIME_READY duration=" .. tostring(machine:getDayDurationSeconds()))
