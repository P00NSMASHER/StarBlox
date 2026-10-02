--!strict

-- Adapts externally verified school-world bindings into stable navigation nodes.
-- World-mapping lanes remain authoritative for source-part identity and verification;
-- this module only normalizes those bindings for campus routing consumers.
-- It owns no Roblox services, geometry discovery, teleporting, prompts, or player state.

export type Binding = {
	SourcePartName: string,
	Label: string,
	PhysicalRoomId: string,
	PhysicalClassroomVerified: boolean,
	Room: string?,
}

export type SchoolBindings = {
	SchoolBuildingId: string,
	AllowFallbackSource: boolean?,
	FallbackCampusEnabled: boolean?,
	RequireVerifiedPhysicalClassrooms: boolean?,
	Entrance: Binding,
	Cafeteria: Binding,
	Library: Binding,
	Classes: {[string]: Binding},
}

export type NodeDefinition = {
	id: string,
}

export type Catalog = {
	nodes: {NodeDefinition},
	buildingId: string,
	entranceDestinationId: string,
	cafeteriaDestinationId: string,
	studyDestinationId: string,
	classDestinationIds: {[string]: string},
	sourcePartByDestinationId: {[string]: string},
	physicalRoomByClassId: {[string]: string},
}

local CampusDestinationAdapter = {}

local function assertNonEmpty(value: string, label: string)
	assert(type(value) == "string" and value:match("%S") ~= nil, label .. " must be non-empty")
end

local function encodeSegment(value: string): string
	return tostring(#value) .. ":" .. value
end

local function destinationId(buildingId: string, sourcePartName: string): string
	return "campus-anchor|" .. encodeSegment(buildingId) .. "|" .. encodeSegment(sourcePartName)
end

local function verifyBinding(binding: Binding, label: string)
	assert(type(binding) == "table", label .. " binding is required")
	assertNonEmpty(binding.SourcePartName, label .. " source part")
	assertNonEmpty(binding.Label, label .. " label")
	assertNonEmpty(binding.PhysicalRoomId, label .. " physical room id")
	assert(binding.PhysicalClassroomVerified == true, label .. " must be physically verified")
end

local function freezeNodeArray(nodeIds: {string}): {NodeDefinition}
	local nodes = table.create(#nodeIds)
	for index, nodeId in ipairs(nodeIds) do
		nodes[index] = table.freeze({id = nodeId})
	end
	return table.freeze(nodes)
end

local function freezeStringMap(values: {[string]: string}): {[string]: string}
	local copy = {}
	for key, value in pairs(values) do
		copy[key] = value
	end
	return table.freeze(copy)
end

function CampusDestinationAdapter.fromSchoolBindings(bindings: SchoolBindings): Catalog
	assert(type(bindings) == "table", "school bindings are required")
	assertNonEmpty(bindings.SchoolBuildingId, "school building id")
	assert(bindings.AllowFallbackSource ~= true, "fallback school source must be disabled")
	assert(bindings.FallbackCampusEnabled ~= true, "fallback campus must be disabled")
	if bindings.RequireVerifiedPhysicalClassrooms ~= nil then
		assert(bindings.RequireVerifiedPhysicalClassrooms == true, "verified physical classrooms must be required")
	end

	verifyBinding(bindings.Entrance, "entrance")
	verifyBinding(bindings.Cafeteria, "cafeteria")
	verifyBinding(bindings.Library, "study room")
	assert(type(bindings.Classes) == "table", "class bindings are required")

	local buildingId = bindings.SchoolBuildingId
	local entranceId = destinationId(buildingId, bindings.Entrance.SourcePartName)
	local cafeteriaId = destinationId(buildingId, bindings.Cafeteria.SourcePartName)
	local studyId = destinationId(buildingId, bindings.Library.SourcePartName)
	assert(entranceId ~= cafeteriaId, "entrance and cafeteria must use distinct physical anchors")

	local nodeSet: {[string]: boolean} = {
		[entranceId] = true,
		[cafeteriaId] = true,
		[studyId] = true,
	}
	local sourcePartByDestinationId: {[string]: string} = {
		[entranceId] = bindings.Entrance.SourcePartName,
		[cafeteriaId] = bindings.Cafeteria.SourcePartName,
		[studyId] = bindings.Library.SourcePartName,
	}

	local classIds = {}
	for classId, _ in pairs(bindings.Classes) do
		assertNonEmpty(classId, "class id")
		table.insert(classIds, classId)
	end
	assert(#classIds > 0, "at least one class binding is required")
	table.sort(classIds)

	local classDestinationIds = {}
	local physicalRoomByClassId = {}
	for _, classId in ipairs(classIds) do
		local binding = bindings.Classes[classId]
		verifyBinding(binding, "class " .. classId)
		local classDestinationId = destinationId(buildingId, binding.SourcePartName)
		assert(classDestinationId ~= entranceId, "class must not reuse the school entrance anchor: " .. classId)
		assert(classDestinationId ~= cafeteriaId, "class must not reuse the cafeteria anchor: " .. classId)
		nodeSet[classDestinationId] = true
		sourcePartByDestinationId[classDestinationId] = binding.SourcePartName
		classDestinationIds[classId] = classDestinationId
		physicalRoomByClassId[classId] = binding.PhysicalRoomId
	end

	local nodeIds = {}
	for nodeId, _ in pairs(nodeSet) do
		table.insert(nodeIds, nodeId)
	end
	table.sort(nodeIds)

	return table.freeze({
		nodes = freezeNodeArray(nodeIds),
		buildingId = buildingId,
		entranceDestinationId = entranceId,
		cafeteriaDestinationId = cafeteriaId,
		studyDestinationId = studyId,
		classDestinationIds = freezeStringMap(classDestinationIds),
		sourcePartByDestinationId = freezeStringMap(sourcePartByDestinationId),
		physicalRoomByClassId = freezeStringMap(physicalRoomByClassId),
	}) :: Catalog
end

return table.freeze(CampusDestinationAdapter)
