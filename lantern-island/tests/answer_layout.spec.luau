--!nonstrict
local Lesson=require("../src/server/LessonService")
local lesson=Lesson.new({});local passed=0
local function check(name,fn)fn();passed+=1;print("PASS "..name)end
check("every quest uses all four correct-answer positions for each tested player",function()
 local ids={0,-1,7,22281248,2147483647,9999999999}
 for i=1,500 do table.insert(ids,i) end
 for _,uid in ipairs(ids)do for _,q in ipairs(lesson:quests())do
  local positions={}
  for _,id in ipairs(q.steps)do
   local a=lesson:getActivity(id);local options=lesson:options(id,uid);local count=0
   for i,o in ipairs(options)do if o.label==a.answer then count+=1;positions[i]=true end end
   assert(count==1,"Exactly one valid answer required")
  end
  local n=0;for _ in pairs(positions)do n+=1 end
  assert(n==4,q.id.." lets player "..uid.." reuse the same answer slot")
 end end
end)
check("options remain stable across hint retry and reconnect reads",function()
 for _,q in ipairs(lesson:quests())do for _,id in ipairs(q.steps)do
  local a=lesson:options(id,7);local b=lesson:options(id,7)
  for i,o in ipairs(a)do assert(o.id==b[i].id and o.label==b[i].label) end
 end end
end)
check("shuffling preserves all choices and matching server validation",function()
 for uid=1,30 do for _,q in ipairs(lesson:quests())do for _,id in ipairs(q.steps)do
  local a=lesson:getActivity(id);local expected={};for _,label in ipairs(a.options)do expected[label]=true end
  local seen={};for _,o in ipairs(lesson:options(id,uid))do
   assert(expected[o.label] and not seen[o.label]);seen[o.label]=true
   assert(lesson:check(id,o.id,uid)==(o.label==a.answer))
  end
 end end end
end)
print("RESULT "..passed.." answer layout behavior tests passed; Roblox client NOT exercised")
