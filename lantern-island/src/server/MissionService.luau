--!nonstrict
-- Server-owned checkpoints. Coins, assisted work and independently solved checks are distinct.
local MissionService={}
MissionService.__index=MissionService
function MissionService.new(context) return setmetatable({context=context,state={}},MissionService) end
function MissionService:_profile(player) return self.context.services.ProfileService:get(player) end
function MissionService:_state(player)
 local s=self.state[player];if s then return s end
 local p=self:_profile(player);assert(p,"PROFILE_NOT_LOADED")
 p.questProgress=p.questProgress or {};p.learning=p.learning or {}
 local lesson=self.context.services.LessonService
 local selected=lesson:quests()[1].id
 for _,quest in ipairs(lesson:quests()) do if not p.completions[quest.id] then selected=quest.id;break end end
 s={selected=selected,status=p.completions[selected] and "COMPLETED" or "AVAILABLE",feedback="",practice=false}
 self.state[player]=s
 local world=self.context.services.WorldBuilder
 for mid,done in pairs(p.completions) do if done and lesson:getQuest(mid) and world.restoreMission then world:restoreMission(mid) end end
 for _,quest in ipairs(lesson:quests()) do
  local progress=p.questProgress[quest.id]
  if progress and world.onCheckpoint then for i=1,math.min(4,progress.index-1) do world:onCheckpoint(player,quest.id,i) end end
 end
 if world.setEquipped then world:setEquipped(player,p.equippedItemId) end
 return s
end
function MissionService:_progress(player,s)
 if s.practice then return s.practiceProgress end
 local p=self:_profile(player)
 p.questProgress[s.selected]=p.questProgress[s.selected] or {index=1,attempts=0,hintLevel=0}
 return p.questProgress[s.selected]
end
function MissionService:_save(player)
 local ok=self.context.services.ProfileService:save(player)
 return ok==true
end
local function summary(p)
 local total,independent,supported=0,0,0
 for _,e in pairs(p.learning) do total+=1;if e.assisted then supported+=1 else independent+=1 end end
 return total,independent,supported
end
function MissionService:publicState(player)
 local s=self:_state(player);local p=self:_profile(player)
 local lesson=self.context.services.LessonService;local quest=lesson:getQuest(s.selected)
 local q=self:_progress(player,s);local a=lesson:getActivity(quest.steps[math.min(q.index,#quest.steps)])
 local total,independent,supported=summary(p)
 local objective=quest.objective
 if s.status=="BETWEEN" then objective=s.feedback
 elseif s.status=="COMPLETED" then objective=(s.feedback~="" and s.feedback.."\n" or "").."Outfit unlocked! Choose Pip's outfit or explore another adventure.\nLearning journal: "..independent.." first-try checks; "..supported.." checks with help. These are practice results, not a mastery score." end
 return {missionId=quest.id,activityId=a.id,contentVersion="sample-v2",activityType=a.type,
  title=quest.title..(s.status=="ACTIVE" and "  "..math.min(q.index,4).."/4" or ""),objective=objective,
  prompt=a.prompt,passage=(s.practice and "Practice replay: no extra stars or new learning credit.\n" or "")..a.passage,
  status=s.status,hint=q.hintLevel>0 and a.hints[q.hintLevel] or "",
  assistance=s.practice and "practice" or ((q.attempts>0 or q.hintLevel>0) and "supported" or "independent"),
  completedCount=total,representation=a.representation or {},options=s.status=="ACTIVE" and lesson:options(a.id,player.UserId) or {}}
end
function MissionService:handle(player,request)
 local p=self:_profile(player);if not p then return {ok=false,code="PROFILE_NOT_READY"} end
 local lesson=self.context.services.LessonService
 local quest=lesson:getQuest(request.missionId);if not quest then return {ok=false,code="MISSION_UNKNOWN"} end
 local s=self:_state(player)
 if request.action=="StartMission" then
  if s.selected~=quest.id then
   s.selected=quest.id;s.practice=false;s.feedback="";s.status=p.completions[quest.id] and "COMPLETED" or "AVAILABLE"
   -- A completed quest selected from the map shows its reward before an explicit replay.
   if s.status=="COMPLETED" then return {ok=true,code="MISSION_ALREADY_COMPLETE"} end
  elseif s.status=="COMPLETED" then
   s.practice=true;s.practiceProgress={index=1,attempts=0,hintLevel=0};s.status="AVAILABLE";s.feedback=""
  end
  if s.status=="ACTIVE" then return {ok=true,code="MISSION_RESUMED"} end
  local world=self.context.services.WorldBuilder
  if s.status~="BETWEEN" and world.isNearMission and not world:isNearMission(player,quest.id) then
   s.status="AVAILABLE";return {ok=true,code="FOLLOW_BEACON"}
  end
  s.status="ACTIVE";s.feedback="";return {ok=true,code="MISSION_STARTED"}
 end
 if request.missionId~=s.selected then return {ok=false,code="MISSION_NOT_SELECTED"} end
 if request.action=="CancelMission" then
  if s.status=="ACTIVE" or s.status=="BETWEEN" then s.status="AVAILABLE" end
  self:_save(player);return {ok=true,code="MISSION_PAUSED"}
 end
 if s.status~="ACTIVE" then return {ok=false,code="MISSION_NOT_ACTIVE"} end
 local q=self:_progress(player,s);local a=lesson:getActivity(quest.steps[q.index])
 if not a then return {ok=false,code="CONTENT_UNAVAILABLE"} end
 if request.action=="RequestHint" then
  q.hintLevel=math.min(3,q.hintLevel+1);self:_save(player);return {ok=true,code="HINT_READY"}
 end
 if request.action~="SubmitAnswer" then return {ok=false,code="ACTION_UNSUPPORTED"} end
 local payload=request.payload
 if type(payload)~="table" or payload.activityId~=a.id or payload.contentVersion~="sample-v2" then return {ok=false,code="CONTENT_MISMATCH"} end
 if not lesson:check(a.id,payload.answer,player.UserId) then
  q.attempts=math.min(100,q.attempts+1);q.hintLevel=math.min(3,math.max(q.hintLevel,q.attempts))
  self:_save(player);return {ok=false,code="TRY_AGAIN"}
 end
 if not s.practice and not p.learning[a.id] then
  p.learning[a.id]={assisted=q.attempts>0 or q.hintLevel>0,transfer=a.transfer}
 end
 s.feedback=a.explanation
 local finishedIndex=q.index;q.index+=1;q.attempts=0;q.hintLevel=0
 local world=self.context.services.WorldBuilder
 if world.onCheckpoint then world:onCheckpoint(player,quest.id,finishedIndex) end
 if q.index>#quest.steps then
  s.status="COMPLETED"
  if not s.practice then
   local granted=self.context.services.RewardService:grant(player,quest.reward)
   if not granted then q.index=finishedIndex;s.status="ACTIVE";return {ok=false,code="REWARD_UNAVAILABLE"} end
   p.completions[quest.id]=true
  end
  if world.restoreMission then world:restoreMission(quest.id) end
  local saved=self:_save(player)
  return {ok=true,code=saved and (s.practice and "PRACTICE_COMPLETE" or "MISSION_COMPLETE") or "PROGRESS_SAVE_PENDING"}
 end
 s.status="BETWEEN"
 local saved=self:_save(player)
 return {ok=true,code=saved and "CHECKPOINT_COMPLETE" or "PROGRESS_SAVE_PENDING"}
end
function MissionService:removePlayer(player) self.state[player]=nil end
return MissionService
