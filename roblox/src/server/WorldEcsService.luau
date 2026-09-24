--!strict

local WorldEcsService = {}
WorldEcsService.__index = WorldEcsService

function WorldEcsService.new(Matter)
	assert(Matter ~= nil, "Matter dependency is required")
	local self = setmetatable({}, WorldEcsService)
	self.World = Matter.World.new()
	self.Components = require(script.Parent.Parent.shared.Components)(Matter)
	return self
end

function WorldEcsService:Spawn(componentValues: {{any}})
	return self.World:spawn(table.unpack(componentValues))
end

function WorldEcsService:Despawn(entityId: number)
	if self.World:contains(entityId) then
		self.World:despawn(entityId)
	end
end

function WorldEcsService:Query(...)
	return self.World:query(...)
end

function WorldEcsService:QueryChanged(component)
	return self.World:queryChanged(component)
end

return WorldEcsService
