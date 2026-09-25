--!strict

local ClientBootstrap = {}

function ClientBootstrap.start(replicaClient)
	assert(replicaClient ~= nil, "ReplicaClient dependency is required")

	local state = {
		PlayerState = nil,
	}

	replicaClient.OnNew("StarBloxPlayerState", function(replica)
		state.PlayerState = replica
	end)

	-- Maintained Replica requires listeners to be connected before the one
	-- global initial-data request.
	replicaClient.RequestData()

	return state
end

return ClientBootstrap
