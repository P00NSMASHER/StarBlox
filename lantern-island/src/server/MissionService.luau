--!strict
local MissionService={}
MissionService.__index=MissionService
local MID="lantern-lift";local AID="lift-1"
function MissionService.new(context:any) return setmetatable({context=context,state={}},MissionService) end
function MissionService:_state(player:Player)
 local s=self.state[player]
 if not s then s={missionId=MID,activityId=AID,contentVersion="sample-v1",activityType="math",title="Repair the Lantern Lift",
  objective="Help Pip restart the lift to relight the hilltop lantern.",status="AVAILABLE",hint="",assistance="independent",completedCount=0};self.state[player]=s end
 return s
end
function MissionService:publicState(player:Player)
 local s=self:_state(player);local a=self.context.services.LessonService:getActivity(AID)
 return {missionId=s.missionId,activityId=s.activityId,contentVersion=s.contentVersion,activityType=s.activityType,title=s.title,
  objective=s.objective,prompt=a.prompt,status=s.status,hint=s.hint,assistance=s.assistance,completedCount=s.completedCount,
  representation=a.representation,options={}}
end
function MissionService:handle(player:Player,request:any)
 local s=self:_state(player);if request.missionId~=MID then return {ok=false,code="MISSION_UNKNOWN"} end
 if request.action=="StartMission" then if s.status~="COMPLETED" then s.status="ACTIVE";s.hint="";s.assistance="independent" end;return {ok=true,code=s.status=="COMPLETED" and "MISSION_ALREADY_COMPLETE" or "MISSION_STARTED"} end
 if request.action=="CancelMission" then if s.status=="ACTIVE" then s.status="AVAILABLE";s.hint="" end;return {ok=true,code="MISSION_CANCELLED"} end
 if request.action=="RequestHint" then
  if s.status~="ACTIVE" then return {ok=false,code="MISSION_NOT_ACTIVE"} end
  s.hint=self.context.services.LessonService:getActivity(AID).hint;s.assistance="hint";return {ok=true,code="HINT_READY"}
 end
 if request.action=="SubmitAnswer" then
  if s.status~="ACTIVE" then return {ok=false,code="MISSION_NOT_ACTIVE"} end
  local p=request.payload;if p.activityId~=AID or p.contentVersion~=s.contentVersion then return {ok=false,code="CONTENT_MISMATCH"} end
  local answer=p.answer;local numeric=type(answer)=="number" and answer or (type(answer)=="table" and answer.tens*10+answer.ones or nil)
  if numeric~=42 then return {ok=false,code="TRY_AGAIN"} end
  s.status="COMPLETED";s.completedCount=1
  local profile=self.context.services.ProfileService:get(player)
  if profile and not profile.completions[MID] then profile.completions[MID]=true;self.context.services.RewardService:grant(player,"firefly-scarf") end
  self.context.services.WorldBuilder:setRestored(true);self.context.services.ProfileService:save(player)
  return {ok=true,code="MISSION_COMPLETE"}
 end
 return {ok=false,code="ACTION_UNSUPPORTED"}
end
return MissionService