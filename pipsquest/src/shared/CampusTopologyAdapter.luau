--!strict

local CampusTopologyAdapter = {}

export type NodeDefinition = { id: string }
export type DestinationCatalog = { nodes: {NodeDefinition} }
export type DoorBinding = { Id: string, PartName: string }
export type InteractionBindings = { Doors: {DoorBinding} }
export type TopologyLink = {
	id: string,
	from: string,
	to: string,
	cost: number,
	bidirectional: boolean?,
	doorPartName: string?,
}
export type TopologyDefinition = {
	revision: string,
	verified: boolean,
	corridorNodeIds: {string},
	links: {TopologyLink},
}
export type EdgeDefinition = {
	id: string,
	from: string,
	to: string,
	cost: number,
	bidirectional: boolean?,
}
export type AdaptedTopology = {
	revision: string,
	nodes: {NodeDefinition},
	edges: {EdgeDefinition},
	interactionIdByEdgeId: {[string]: string},
	edgeIdsByInteractionId: {[string]: {string}},
}

local function assertNonEmpty(value: string, label: string)
	assert(type(value) == "string" and value:match("%S") ~= nil, label .. " must be non-empty")
end

local function assertFinitePositive(value: number, label: string)
	assert(value == value and value ~= math.huge and value ~= -math.huge, label .. " must be finite")
	assert(value > 0, label .. " must be positive")
end

local function encodeSegment(value: string): string
	return tostring(#value) .. ":" .. value
end

local function routeEdgeId(revision: string, linkId: string): string
	return "campus-link|" .. encodeSegment(revision) .. "|" .. encodeSegment(linkId)
end

local function freezeNodeArray(nodeIds: {string}): {NodeDefinition}
	local nodes = table.create(#nodeIds)
	for index, nodeId in ipairs(nodeIds) do
		nodes[index] = table.freeze({ id = nodeId })
	end
	return table.freeze(nodes)
end

local function freezeEdgeArray(edges: {EdgeDefinition}): {EdgeDefinition}
	local copy = table.create(#edges)
	for index, edge in ipairs(edges) do
		copy[index] = table.freeze({
			id = edge.id,
			from = edge.from,
			to = edge.to,
			cost = edge.cost,
			bidirectional = edge.bidirectional,
		})
	end
	return table.freeze(copy)
end

local function freezeStringMap(values: {[string]: string}): {[string]: string}
	local copy = {}
	for key, value in pairs(values) do
		copy[key] = value
	end
	return table.freeze(copy)
end

local function freezeStringArrayMap(values: {[string]: {string}}): {[string]: {string}}
	local copy = {}
	for key, source in pairs(values) do
		local entries = table.create(#source)
		for index, value in ipairs(source) do
			entries[index] = value
		end
		table.sort(entries)
		copy[key] = table.freeze(entries)
	end
	return table.freeze(copy)
end

function CampusTopologyAdapter.fromVerifiedTopology(
	destinations: DestinationCatalog,
	interactions: InteractionBindings,
	definition: TopologyDefinition
): AdaptedTopology
	assert(type(destinations) == "table" and type(destinations.nodes) == "table", "destination catalog is required")
	assert(type(interactions) == "table" and type(interactions.Doors) == "table", "interaction bindings are required")
	assert(type(definition) == "table", "topology definition is required")
	assert(definition.verified == true, "campus topology must be explicitly verified")
	assertNonEmpty(definition.revision, "topology revision")
	assert(type(definition.corridorNodeIds) == "table", "corridor node ids are required")
	assert(type(definition.links) == "table", "topology links are required")

	local nodeSet: {[string]: boolean} = {}
	local nodeIds = {}
	for _, node in ipairs(destinations.nodes) do
		assert(type(node) == "table", "destination node is required")
		assertNonEmpty(node.id, "destination node id")
		assert(nodeSet[node.id] ~= true, "duplicate destination node id: " .. node.id)
		nodeSet[node.id] = true
		table.insert(nodeIds, node.id)
	end
	assert(#nodeIds > 0, "destination catalog requires at least one node")

	for _, corridorNodeId in ipairs(definition.corridorNodeIds) do
		assertNonEmpty(corridorNodeId, "corridor node id")
		assert(nodeSet[corridorNodeId] ~= true, "corridor node collides with existing node: " .. corridorNodeId)
		nodeSet[corridorNodeId] = true
		table.insert(nodeIds, corridorNodeId)
	end
	table.sort(nodeIds)

	local interactionIdByPartName: {[string]: string} = {}
	local interactionIds: {[string]: boolean} = {}
	for _, binding in ipairs(interactions.Doors) do
		assert(type(binding) == "table", "door binding is required")
		assertNonEmpty(binding.Id, "door interaction id")
		assertNonEmpty(binding.PartName, "door part name")
		assert(interactionIds[binding.Id] ~= true, "duplicate door interaction id: " .. binding.Id)
		assert(interactionIdByPartName[binding.PartName] == nil, "duplicate reviewed door part: " .. binding.PartName)
		interactionIds[binding.Id] = true
		interactionIdByPartName[binding.PartName] = binding.Id
	end

	local seenLinkIds: {[string]: boolean} = {}
	local edges = table.create(#definition.links)
	local interactionIdByEdgeId = {}
	local edgeIdsByInteractionId = {}
	for _, link in ipairs(definition.links) do
		assert(type(link) == "table", "topology link is required")
		assertNonEmpty(link.id, "topology link id")
		assert(seenLinkIds[link.id] ~= true, "duplicate topology link id: " .. link.id)
		seenLinkIds[link.id] = true
		assertNonEmpty(link.from, "topology link from")
		assertNonEmpty(link.to, "topology link to")
		assert(nodeSet[link.from] == true, "topology link endpoint missing: " .. link.from)
		assert(nodeSet[link.to] == true, "topology link endpoint missing: " .. link.to)
		assert(link.from ~= link.to, "topology link endpoints must differ: " .. link.id)
		assertFinitePositive(link.cost, "topology link cost")

		local edgeId = routeEdgeId(definition.revision, link.id)
		table.insert(edges, {
			id = edgeId,
			from = link.from,
			to = link.to,
			cost = link.cost,
			bidirectional = link.bidirectional,
		})

		if link.doorPartName ~= nil then
			assertNonEmpty(link.doorPartName, "topology door part name")
			local interactionId = interactionIdByPartName[link.doorPartName]
			assert(interactionId ~= nil, "topology door part is not a reviewed interaction: " .. link.doorPartName)
			interactionIdByEdgeId[edgeId] = interactionId
			local mappedEdges = edgeIdsByInteractionId[interactionId]
			if mappedEdges == nil then
				mappedEdges = {}
				edgeIdsByInteractionId[interactionId] = mappedEdges
			end
			table.insert(mappedEdges, edgeId)
		end
	end

	table.sort(edges, function(left: EdgeDefinition, right: EdgeDefinition)
		return left.id < right.id
	end)

	return table.freeze({
		revision = definition.revision,
		nodes = freezeNodeArray(nodeIds),
		edges = freezeEdgeArray(edges),
		interactionIdByEdgeId = freezeStringMap(interactionIdByEdgeId),
		edgeIdsByInteractionId = freezeStringArrayMap(edgeIdsByInteractionId),
	}) :: AdaptedTopology
end

function CampusTopologyAdapter.blockedEdgeIdsForInteractions(
	topology: AdaptedTopology,
	blockedInteractionIds: {[string]: boolean}
): {[string]: boolean}
	assert(type(topology) == "table", "adapted topology is required")
	assert(type(blockedInteractionIds) == "table", "blocked interaction ids are required")
	local blockedEdges = {}
	for interactionId, isBlocked in pairs(blockedInteractionIds) do
		if isBlocked then
			local edgeIds = topology.edgeIdsByInteractionId[interactionId]
			assert(edgeIds ~= nil, "unknown blocked campus interaction id: " .. interactionId)
			for _, edgeId in ipairs(edgeIds) do
				blockedEdges[edgeId] = true
			end
		end
	end
	return table.freeze(blockedEdges)
end

return table.freeze(CampusTopologyAdapter)
