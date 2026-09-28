--!strict
-- Original Lantern Island wire contract. No answers or learner data live here.
local Protocol = {}
Protocol.VERSION = 1
Protocol.REMOTE_FOLDER = "LanternIslandRemotes"
Protocol.ACTION_REMOTE = "Action"
Protocol.STATE_REMOTE = "State"
Protocol.REQUEST_TIMEOUT = 12

local allowedActions: { [string]: boolean } = {
    GetState = true, StartMission = true, SubmitAnswer = true,
    RequestHint = true, CancelMission = true, EquipItem = true,
}
local envelopeKeys: { [string]: boolean } = { requestId = true, action = true, missionId = true, itemId = true, payload = true }
local payloadKeys: { [string]: boolean } = { answer = true, activityId = true, contentVersion = true }

local function identifier(value: any): boolean
    return type(value) == "string" and #value > 0 and #value <= 64
        and string.match(value, "^[%w_.:%-]+$") ~= nil
end

local function integer(value: any, lo: number, hi: number): boolean
    return type(value) == "number" and value == value and value > -math.huge
        and value < math.huge and value % 1 == 0 and value >= lo and value <= hi
end

local function knownKeys(value: any, allowed: { [string]: boolean }, maximum: number): boolean
    if type(value) ~= "table" or getmetatable(value) ~= nil then return false end
    local count = 0
    for key in pairs(value) do
        count += 1
        if count > maximum or type(key) ~= "string" or allowed[key] ~= true then return false end
    end
    return true
end

-- A fresh bounded copy is returned; callers never store the supplied table.
function Protocol.validate(raw: any): (boolean, string, any)
    if not knownKeys(raw, envelopeKeys, 5) then return false, "INVALID_ENVELOPE", nil end
    if not identifier(raw.requestId) then return false, "INVALID_REQUEST_ID", nil end
    if not identifier(raw.action) or allowedActions[raw.action] ~= true then
        return false, "UNKNOWN_ACTION", nil
    end
    local request: any = { requestId = raw.requestId, action = raw.action }
    local missionAction = raw.action == "StartMission" or raw.action == "SubmitAnswer"
        or raw.action == "RequestHint" or raw.action == "CancelMission"
    if missionAction then
        if not identifier(raw.missionId) then return false, "INVALID_MISSION_ID", nil end
        request.missionId = raw.missionId
    elseif raw.missionId ~= nil then
        return false, "UNEXPECTED_MISSION_ID", nil
    end
    if raw.action == "EquipItem" then
        if not identifier(raw.itemId) then return false, "INVALID_ITEM_ID", nil end
        request.itemId = raw.itemId
    elseif raw.itemId ~= nil then
        return false, "UNEXPECTED_ITEM_ID", nil
    end
    if raw.action == "SubmitAnswer" then
        local payload = raw.payload
        if not knownKeys(payload, payloadKeys, 3) or not identifier(payload.activityId)
            or not identifier(payload.contentVersion) then
            return false, "INVALID_PAYLOAD", nil
        end
        local answer = payload.answer
        if type(answer) == "string" then
            if #answer < 1 or #answer > 128 or string.find(answer, "%c") ~= nil then
                return false, "INVALID_ANSWER", nil
            end
        elseif type(answer) == "number" then
            if not integer(answer, -1000000, 1000000) then return false, "INVALID_ANSWER", nil end
        elseif type(answer) == "table" then
            if not knownKeys(answer, { tens = true, ones = true }, 2)
                or not integer(answer.tens, 0, 100) or not integer(answer.ones, 0, 9) then
                return false, "INVALID_ANSWER", nil
            end
            answer = { tens = answer.tens, ones = answer.ones }
        else
            return false, "INVALID_ANSWER", nil
        end
        request.payload = { activityId = payload.activityId, contentVersion = payload.contentVersion, answer = answer }
    elseif raw.payload ~= nil then
        return false, "UNEXPECTED_PAYLOAD", nil
    end
    return true, "VALID", request
end

function Protocol.sameRequest(a: any, b: any): boolean
    if a.requestId ~= b.requestId or a.action ~= b.action or a.missionId ~= b.missionId
        or a.itemId ~= b.itemId then return false end
    local x, y = a.payload, b.payload
    if x == nil or y == nil then return x == y end
    if x.activityId ~= y.activityId or x.contentVersion ~= y.contentVersion then return false end
    if type(x.answer) ~= type(y.answer) then return false end
    if type(x.answer) == "table" then
        return x.answer.tens == y.answer.tens and x.answer.ones == y.answer.ones
    end
    return x.answer == y.answer
end

-- Per-session token bucket: consume BEFORE validation to bound malformed spam too.
function Protocol.newLimiter(clock: () -> number, capacity: number?, rate: number?): any
    local cap, refill = capacity or 8, rate or 4
    assert(cap > 0 and refill > 0, "positive limiter bounds required")
    local tokens, last = cap, clock()
    return {
        take = function(): boolean
            local now = clock()
            tokens = math.min(cap, tokens + math.max(0, now - last) * refill)
            last = math.max(last, now)
            if tokens < 1 then return false end
            tokens -= 1
            return true
        end,
    }
end

-- Bounded same-session replay guard. Durable entitlements remain Profile/RewardService's job.
function Protocol.newReplayCache(maximum: number?): any
    local limit = maximum or 64
    assert(limit >= 1 and limit % 1 == 0, "positive integer replay limit required")
    local entries: { [string]: any } = {}
    local order: { string } = {}
    local api: any = {}
    function api.begin(request: any): (boolean, string, any)
        local old = entries[request.requestId]
        if old then
            if not Protocol.sameRequest(old.request, request) then return false, "REQUEST_ID_REUSED", nil end
            if old.result == nil then return false, "IN_PROGRESS", nil end
            return false, "REPLAY", old.result
        end
        if #order >= limit then
            local removed = false
            for i, key in ipairs(order) do
                if entries[key].result ~= nil then
                    entries[key] = nil
                    table.remove(order, i)
                    removed = true
                    break
                end
            end
            if not removed then return false, "BUSY", nil end
        end
        local valid, _, copy = Protocol.validate(request)
        if not valid then return false, "INVALID_ENVELOPE", nil end
        entries[copy.requestId] = { request = copy, result = nil }
        table.insert(order, copy.requestId)
        return true, "NEW", nil
    end
    function api.finish(requestId: string, result: any): boolean
        local entry = entries[requestId]
        if not entry or entry.result ~= nil then return false end
        if type(result) ~= "table" or type(result.ok) ~= "boolean" or not identifier(result.code) then return false end
        -- Cache only safe outcome fields. Never cache raw profile or server answer objects.
        entry.result = table.freeze({ ok = result.ok, code = result.code })
        return true
    end
    function api.size(): number return #order end
    return api
end

return table.freeze(Protocol)
