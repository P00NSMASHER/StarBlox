--!strict
-- Execute the actual production module with the official Luau CLI, not a JS reimplementation.
local P = require("../src/shared/Protocol")
local passed = 0
local function check(name: string, body: () -> ())
    local ok, err = pcall(body)
    if not ok then error("FAIL " .. name .. ": " .. tostring(err)) end
    passed += 1
    print("PASS " .. name)
end
local function submit(): any
    return { requestId = "r-1", action = "SubmitAnswer", missionId = "lantern-lift",
        payload = { activityId = "lift-1", contentVersion = "sample-v1", answer = 42 } }
end
local function rejects(raw: any, expected: string)
    local ok, code = P.validate(raw)
    assert(not ok and code == expected, tostring(code))
end
check("state request accepted", function() assert(P.validate({ requestId = "r-1", action = "GetState" })) end)
check("mission request accepted", function() assert(P.validate({ requestId = "r-1", action = "StartMission", missionId = "lift" })) end)
check("numeric answer accepted", function() assert(P.validate(submit())) end)
check("word answer accepted", function() local r = submit(); r.payload.answer = "light"; assert(P.validate(r)) end)
check("quantity answer copied", function()
    local r = submit(); r.payload.answer = { tens = 4, ones = 2 }
    local ok, _, copy = P.validate(r); assert(ok)
    r.payload.answer.ones = 9; assert(copy.payload.answer.ones == 2)
end)
check("reject non-table envelope", function() rejects(false, "INVALID_ENVELOPE") end)
check("reject extra authority fields", function() local r = submit(); r.coins = 999; rejects(r, "INVALID_ENVELOPE") end)
check("reject table key", function() local r = submit(); r[{}] = 1; rejects(r, "INVALID_ENVELOPE") end)
check("reject metatable", function() rejects(setmetatable(submit(), {}), "INVALID_ENVELOPE") end)
check("reject huge request id", function() local r = submit(); r.requestId = string.rep("x",65); rejects(r,"INVALID_REQUEST_ID") end)
check("reject arbitrary remote action", function() local r = submit(); r.action = "DeleteInstance"; rejects(r,"UNKNOWN_ACTION") end)
check("reject missing mission", function() local r = submit(); r.missionId=nil; rejects(r,"INVALID_MISSION_ID") end)
check("reject unexpected mission", function() rejects({ requestId="r",action="GetState",missionId="lift" },"UNEXPECTED_MISSION_ID") end)
check("reject unexpected item", function() local r=submit(); r.itemId="hat"; rejects(r,"UNEXPECTED_ITEM_ID") end)
check("equip accepted", function() assert(P.validate({requestId="r",action="EquipItem",itemId="scarf"})) end)
check("equip requires item", function() rejects({requestId="r",action="EquipItem"},"INVALID_ITEM_ID") end)
check("reject extra payload key", function() local r=submit(); r.payload.correct=true; rejects(r,"INVALID_PAYLOAD") end)
check("reject missing content version", function() local r=submit(); r.payload.contentVersion=nil; rejects(r,"INVALID_PAYLOAD") end)
check("reject NaN", function() local r=submit(); r.payload.answer=0/0; rejects(r,"INVALID_ANSWER") end)
check("reject infinity", function() local r=submit(); r.payload.answer=math.huge; rejects(r,"INVALID_ANSWER") end)
check("reject oversized text", function() local r=submit(); r.payload.answer=string.rep("x",129); rejects(r,"INVALID_ANSWER") end)
check("reject control characters", function() local r=submit(); r.payload.answer="a\nb"; rejects(r,"INVALID_ANSWER") end)
check("reject cyclic answer", function() local r=submit(); r.payload.answer={}; r.payload.answer.ones=r.payload.answer; rejects(r,"INVALID_ANSWER") end)
check("reject invalid ones quantity", function() local r=submit(); r.payload.answer={tens=3,ones=12}; rejects(r,"INVALID_ANSWER") end)
check("reject extra quantity key", function() local r=submit(); r.payload.answer={tens=4,ones=2,coins=9}; rejects(r,"INVALID_ANSWER") end)
check("reject unexpected payload", function() rejects({requestId="r",action="GetState",payload={}},"UNEXPECTED_PAYLOAD") end)
check("rate limiter stops burst", function() local gate=P.newLimiter(function() return 0 end,2,1); assert(gate.take());assert(gate.take());assert(not gate.take()) end)
check("rate limiter refills", function() local time=0;local gate=P.newLimiter(function() return time end,1,2);assert(gate.take());time=0.5;assert(gate.take());assert(not gate.take()) end)
check("clock reversal grants no tokens", function() local time=1;local gate=P.newLimiter(function() return time end,1,1);assert(gate.take());time=0;assert(not gate.take());time=1;assert(not gate.take()) end)
check("pending duplicate does not dispatch", function() local cache=P.newReplayCache();assert(cache.begin(submit()));local ok,code=cache.begin(submit());assert(not ok and code=="IN_PROGRESS") end)
check("completed duplicate returns safe result", function()
    local cache=P.newReplayCache();assert(cache.begin(submit()));assert(cache.finish("r-1",{ok=true,code="COMPLETED",answerKey=42}))
    local ok,code,result=cache.begin(submit());assert(not ok and code=="REPLAY" and result.ok and result.answerKey==nil)
end)
check("request ID cannot change answer", function() local cache=P.newReplayCache();assert(cache.begin(submit()));local r=submit();r.payload.answer=43;local ok,code=cache.begin(r);assert(not ok and code=="REQUEST_ID_REUSED") end)
check("request ID cannot change activity", function() local cache=P.newReplayCache();assert(cache.begin(submit()));local r=submit();r.payload.activityId="other";local ok,code=cache.begin(r);assert(not ok and code=="REQUEST_ID_REUSED") end)
check("replay cache owns request copy", function() local cache=P.newReplayCache();local r=submit();assert(cache.begin(r));r.payload.answer=43;local _,code=cache.begin(submit());assert(code=="IN_PROGRESS") end)
check("pending entries cannot be evicted", function() local cache=P.newReplayCache(1);assert(cache.begin(submit()));local r=submit();r.requestId="r-2";local ok,code=cache.begin(r);assert(not ok and code=="BUSY") end)
check("completed entries evict within bound", function() local cache=P.newReplayCache(1);assert(cache.begin(submit()));assert(cache.finish("r-1",{ok=true,code="OK"}));local r=submit();r.requestId="r-2";assert(cache.begin(r));assert(cache.size()==1) end)
check("invalid outcomes not cached", function() local cache=P.newReplayCache();assert(cache.begin(submit()));assert(not cache.finish("r-1",{ok="yes",code="OK"}));assert(not cache.finish("missing",{ok=true,code="OK"})) end)
check("finished outcome cannot be replaced", function() local cache=P.newReplayCache();assert(cache.begin(submit()));assert(cache.finish("r-1",{ok=true,code="OK"}));assert(not cache.finish("r-1",{ok=false,code="NO"})) end)
print("RESULT " .. passed .. " protocol behavior tests passed; Roblox client/server NOT exercised")
