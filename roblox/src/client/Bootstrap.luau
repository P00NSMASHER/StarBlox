--!strict

local ClientBootstrap = {}

function ClientBootstrap.start(replicaController)
	assert(replicaController ~= nil, "ReplicaController dependency is required")

	local state = {
		PlayerState = nil,
	}

	replicaController.ReplicaOfClassCreated("StarBloxPlayerState", function(replica)
		state.PlayerState = replica
	end)

	-- ReplicaService requires all class listeners to be connected before the
	-- one global initial-data request.
	replicaController.RequestData()

	return state
end

return ClientBootstrap
