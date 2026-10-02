--!strict

-- Pure campus navigation graph. World adapters provide stable node/edge IDs from
-- whatever school layout is active; this module only chooses a deterministic route.
-- It owns no Roblox services, teleports, UI, prompts, persistence, or player state.

export type NodeDefinition = {
	id: string,
}

export type EdgeDefinition = {
	id: string,
	from: string,
	to: string,
	cost: number,
	bidirectional: boolean?,
}

export type Route = {
	reachable: boolean,
	originId: string,
	destinationId: string,
	nodeIds: {string},
	edgeIds: {string},
	totalCost: number?,
}

type Hop = {
	to: string,
	edgeId: string,
	cost: number,
}

export type Planner = {
	_nodeIds: {string},
	_nodes: {[string]: NodeDefinition},
	_edgeIds: {[string]: boolean},
	_adjacency: {[string]: {Hop}},
	plan: (self: Planner, originId: string, destinationId: string, blockedEdgeIds: {[string]: boolean}?) -> Route,
}

local CampusRoutePlanner = {}
local Planner = {}
Planner.__index = Planner

local function assertNonEmptyId(value: string, label: string)
	assert(type(value) == "string" and value:match("%S") ~= nil, label .. " must be non-empty")
end

local function assertFinitePositive(value: number, label: string)
	assert(value == value and value ~= math.huge and value ~= -math.huge, label .. " must be finite")
	assert(value > 0, label .. " must be positive")
end

local function encodeId(value: string): string
	return tostring(#value) .. ":" .. value
end

local function freezeStringArray(values: {string}): {string}
	local copy = table.create(#values)
	for index, value in ipairs(values) do
		copy[index] = value
	end
	return table.freeze(copy)
end

local function makeRoute(
	reachable: boolean,
	originId: string,
	destinationId: string,
	nodeIds: {string},
	edgeIds: {string},
	totalCost: number?
): Route
	return table.freeze({
		reachable = reachable,
		originId = originId,
		destinationId = destinationId,
		nodeIds = freezeStringArray(nodeIds),
		edgeIds = freezeStringArray(edgeIds),
		totalCost = totalCost,
	}) :: Route
end

function CampusRoutePlanner.new(nodes: {NodeDefinition}, edges: {EdgeDefinition}): Planner
	assert(#nodes > 0, "campus route graph requires at least one node")

	local nodeIds = table.create(#nodes)
	local nodesById = {}
	local adjacency = {}
	for index, node in ipairs(nodes) do
		assertNonEmptyId(node.id, "node id")
		assert(nodesById[node.id] == nil, "duplicate node id: " .. node.id)
		nodeIds[index] = node.id
		nodesById[node.id] = table.freeze({id = node.id})
		adjacency[node.id] = {}
	end
	table.sort(nodeIds)

	local edgeIds = {}
	for _, edge in ipairs(edges) do
		assertNonEmptyId(edge.id, "edge id")
		assert(edgeIds[edge.id] == nil, "duplicate edge id: " .. edge.id)
		assert(nodesById[edge.from] ~= nil, "edge endpoint missing: " .. edge.from)
		assert(nodesById[edge.to] ~= nil, "edge endpoint missing: " .. edge.to)
		assert(edge.from ~= edge.to, "edge endpoints must differ: " .. edge.id)
		assertFinitePositive(edge.cost, "edge cost")
		edgeIds[edge.id] = true

		table.insert(adjacency[edge.from], table.freeze({
			to = edge.to,
			edgeId = edge.id,
			cost = edge.cost,
		}))
		if edge.bidirectional ~= false then
			table.insert(adjacency[edge.to], table.freeze({
				to = edge.from,
				edgeId = edge.id,
				cost = edge.cost,
			}))
		end
	end

	for _, nodeId in ipairs(nodeIds) do
		local hops = adjacency[nodeId]
		table.sort(hops, function(left: Hop, right: Hop)
			if left.to == right.to then
				return left.edgeId < right.edgeId
			end
			return left.to < right.to
		end)
		adjacency[nodeId] = table.freeze(hops)
	end

	return setmetatable({
		_nodeIds = table.freeze(nodeIds),
		_nodes = table.freeze(nodesById),
		_edgeIds = table.freeze(edgeIds),
		_adjacency = table.freeze(adjacency),
	}, Planner) :: any
end

function Planner.plan(
	self: Planner,
	originId: string,
	destinationId: string,
	blockedEdgeIds: {[string]: boolean}?
): Route
	assert(self._nodes[originId] ~= nil, "unknown origin node: " .. originId)
	assert(self._nodes[destinationId] ~= nil, "unknown destination node: " .. destinationId)

	local blocked = blockedEdgeIds or {}
	for edgeId, isBlocked in pairs(blocked) do
		if isBlocked then
			assert(self._edgeIds[edgeId] == true, "unknown blocked edge id: " .. edgeId)
		end
	end

	if originId == destinationId then
		return makeRoute(true, originId, destinationId, {originId}, {}, 0)
	end

	local distances = {}
	local routeKeys = {}
	local previousNode = {}
	local previousEdge = {}
	local unvisited = {}

	for _, nodeId in ipairs(self._nodeIds) do
		distances[nodeId] = math.huge
		unvisited[nodeId] = true
	end
	distances[originId] = 0
	routeKeys[originId] = encodeId(originId)

	while true do
		local current: string? = nil
		local bestDistance = math.huge
		local bestKey: string? = nil

		for _, nodeId in ipairs(self._nodeIds) do
			if unvisited[nodeId] then
				local distance = distances[nodeId]
				local routeKey = routeKeys[nodeId]
				if distance < bestDistance
					or (distance == bestDistance and routeKey ~= nil and (bestKey == nil or routeKey < bestKey)) then
					current = nodeId
					bestDistance = distance
					bestKey = routeKey
				end
			end
		end

		if current == nil or bestDistance == math.huge then
			break
		end
		if current == destinationId then
			break
		end

		unvisited[current] = nil
		local currentKey = routeKeys[current] :: string
		for _, hop in ipairs(self._adjacency[current]) do
			if unvisited[hop.to] and blocked[hop.edgeId] ~= true then
				local candidateDistance = bestDistance + hop.cost
				local candidateKey = currentKey .. "|" .. encodeId(hop.to) .. "|" .. encodeId(hop.edgeId)
				local existingDistance = distances[hop.to]
				local existingKey = routeKeys[hop.to]
				if candidateDistance < existingDistance
					or (candidateDistance == existingDistance and (existingKey == nil or candidateKey < existingKey)) then
					distances[hop.to] = candidateDistance
					routeKeys[hop.to] = candidateKey
					previousNode[hop.to] = current
					previousEdge[hop.to] = hop.edgeId
				end
			end
		end
	end

	if distances[destinationId] == math.huge then
		return makeRoute(false, originId, destinationId, {}, {}, nil)
	end

	local reversedNodes = {destinationId}
	local reversedEdges = {}
	local cursor = destinationId
	while cursor ~= originId do
		local parent = previousNode[cursor]
		local edgeId = previousEdge[cursor]
		assert(parent ~= nil and edgeId ~= nil, "route reconstruction failed")
		table.insert(reversedNodes, parent)
		table.insert(reversedEdges, edgeId)
		cursor = parent
	end

	local nodePath = table.create(#reversedNodes)
	for index = #reversedNodes, 1, -1 do
		table.insert(nodePath, reversedNodes[index])
	end
	local edgePath = table.create(#reversedEdges)
	for index = #reversedEdges, 1, -1 do
		table.insert(edgePath, reversedEdges[index])
	end

	return makeRoute(true, originId, destinationId, nodePath, edgePath, distances[destinationId])
end

return table.freeze(CampusRoutePlanner)
