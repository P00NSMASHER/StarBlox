--!strict
local LessonService={}
LessonService.__index=LessonService
local SAMPLE={
 id="lantern-sample-grade2",version="sample-v1",title="Lantern Island Practice",
 sourceLabel="Original sample practice — not current homework",reviewStatus="SAMPLE",
 activities={
  ["lift-1"]={type="math",prompt="The lift needs 27 glowstones and 15 moonstones. How many stones altogether?",answer=42,
   representation={tensA=2,onesA=7,tensB=1,onesB=5,operation="+"},
   hint="Combine the tens first, then the ones. Trade 10 ones for 1 ten if you need to."}
 }
}
function LessonService.new(_context:any) return setmetatable({},LessonService) end
function LessonService:publicState(_player:Player)
 return {id=SAMPLE.id,version=SAMPLE.version,title=SAMPLE.title,sourceLabel=SAMPLE.sourceLabel,reviewStatus=SAMPLE.reviewStatus}
end
function LessonService:getActivity(activityId:string) return SAMPLE.activities[activityId] end
return LessonService