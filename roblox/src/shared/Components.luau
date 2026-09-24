--!strict

local COMPONENT_NAMES = {
	"Model",
	"Transform",
	"Velocity",
	"Health",
	"Npc",
	"Interactable",
	"QuestMarker",
	"District",
	"Vehicle",
	"Owner",
	"Replicated",
	"Dirty",
}

return function(Matter)
	local components = {}
	for _, name in COMPONENT_NAMES do
		components[name] = Matter.component(name)
	end
	return components
end
