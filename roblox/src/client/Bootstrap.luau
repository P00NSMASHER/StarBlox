--!strict

local ActionPredictionClient = require(script.Parent.ActionPredictionClient)

local ClientBootstrap = {}

function ClientBootstrap.start(replicaController, dependencies)
	assert(replicaController ~= nil, "ReplicaController dependency is required")

	local prediction = nil
	if dependencies ~= nil and dependencies.ActionPredictionAdapter ~= nil and dependencies.MultiplayerNetwork ~= nil then
		prediction = ActionPredictionClient.new(
			dependencies.ActionPredictionAdapter,
			dependencies.MultiplayerNetwork
		)
	end

	local state = {
		PlayerState = nil,
		ActionPrediction = prediction,
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
