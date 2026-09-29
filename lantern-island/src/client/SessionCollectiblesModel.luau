--!nonstrict
-- Pure session-collectible model. Fireflies are exploration-only:
-- no currency, no entitlement, no learning credit, no persistent save.
local Model={}

local POINTS={
 {id="gold-1",trail="gold",x=2,y=2.8,z=8,color="gold"},
 {id="gold-2",trail="gold",x=6,y=2.9,z=-1,color="gold"},
 {id="gold-3",trail="gold",x=-6,y=4.2,z=-15,color="gold"},
 {id="pink-1",trail="pink",x=9,y=2.8,z=17,color="pink"},
 {id="pink-2",trail="pink",x=18,y=3.0,z=11,color="pink"},
 {id="pink-3",trail="pink",x=27,y=3.0,z=2,color="pink"},
 {id="blue-1",trail="blue",x=-8,y=2.8,z=17,color="blue"},
 {id="blue-2",trail="blue",x=-17,y=2.9,z=8,color="blue"},
 {id="blue-3",trail="blue",x=-25,y=3.0,z=-10,color="blue"},
}

function Model.points()
 local out={}
 for i,p in ipairs(POINTS) do
  out[i]={id=p.id,trail=p.trail,x=p.x,y=p.y,z=p.z,color=p.color}
 end
 return out
end

function Model.total()
 return #POINTS
end

function Model.progress(value)
 local n=math.floor(tonumber(value) or 0)
 n=math.clamp(n,0,#POINTS)
 return {caught=n,total=#POINTS,complete=n==#POINTS}
end

function Model.message(value)
 local p=Model.progress(value)
 if p.caught==0 then return "Find glowing fireflies while you explore." end
 if p.caught>=p.total then return "All 9 fireflies found! Pip's island is sparkling." end
 if p.caught==6 then return "Six found! Three little lights are still hiding." end
 if p.caught==3 then return "Three found! Pip thinks more are glowing nearby." end
 return "Firefly found!"
end

return Model