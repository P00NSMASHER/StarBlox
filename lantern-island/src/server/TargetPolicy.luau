--!nonstrict
-- Pure target policy. Publishing is allowed only to the known private staging place.
local Policy={}
Policy.PRIVATE_STAGING_UNIVERSE_ID=6027194615
Policy.PRIVATE_STAGING_PLACE_ID=17602626136

function Policy.allowed(gameId,placeId,isStudio)
 if isStudio==true then return true end
 return tonumber(gameId)==Policy.PRIVATE_STAGING_UNIVERSE_ID
  and tonumber(placeId)==Policy.PRIVATE_STAGING_PLACE_ID
end

return table.freeze(Policy)