local CampusCourierActivity = {}

CampusCourierActivity.ACTIVITY_ID = "campus_courier"
CampusCourierActivity.COMPLETION_CLASS_ID = "activity:campus_courier"
CampusCourierActivity.REWARD_SCORE = 1
CampusCourierActivity.REWARD_POINTS = 10
CampusCourierActivity.MAX_CHECK_IN_ID_LENGTH = 64
CampusCourierActivity.MAX_UNIQUE_CHECK_INS = 8

local ROUTE = table.freeze({
    table.freeze({
        locationId = "lobby",
        locationName = "Main Lobby",
        objective = "Pick up the campus delivery list in the Main Lobby.",
    }),
    table.freeze({
        locationId = "cafeteria",
        locationName = "Cafeteria",
        objective = "Deliver the lunch-count note to the Cafeteria.",
    }),
    table.freeze({
        locationId = "science",
        locationName = "Science Classroom",
        objective = "Drop off the supply note in the Science Classroom.",
    }),
})

CampusCourierActivity.ROUTE = ROUTE

local function makeResponse(activity, accepted, reason, feedback)
    local nextStop = ROUTE[activity.stepIndex]
    return table.freeze({
        accepted = accepted,
        reason = reason,
        resolved = activity.resolved,
        completedStops = math.min(activity.stepIndex - 1, #ROUTE),
        totalStops = #ROUTE,
        nextLocationId = nextStop and nextStop.locationId or nil,
        objective = nextStop and nextStop.objective or "Campus delivery route complete.",
        feedback = feedback,
        score = activity.resolved and CampusCourierActivity.REWARD_SCORE or 0,
        rewardPoints = activity.resolved and CampusCourierActivity.REWARD_POINTS or 0,
    })
end

function CampusCourierActivity.new(activityInstanceId, playerId)
    assert(type(activityInstanceId) == "string" and activityInstanceId ~= "", "activityInstanceId required")
    assert(type(playerId) == "number", "playerId required")

    return {
        activityInstanceId = activityInstanceId,
        playerId = playerId,
        stepIndex = 1,
        resolved = false,
        closed = false,
        receipts = {},
        uniqueCheckInCount = 0,
    }
end

function CampusCourierActivity.isOwnedBy(activity, playerId)
    return not activity.closed and not activity.resolved and activity.playerId == playerId
end

function CampusCourierActivity.getPublicState(activity)
    local nextStop = ROUTE[activity.stepIndex]
    return table.freeze({
        id = CampusCourierActivity.ACTIVITY_ID,
        title = "Campus Courier",
        description = "Follow a short three-stop delivery route around Pip High.",
        completedStops = math.min(activity.stepIndex - 1, #ROUTE),
        totalStops = #ROUTE,
        nextLocationId = nextStop and nextStop.locationId or nil,
        nextLocationName = nextStop and nextStop.locationName or nil,
        objective = nextStop and nextStop.objective or "Campus delivery route complete.",
        resolved = activity.resolved,
        rewardPoints = CampusCourierActivity.REWARD_POINTS,
    })
end

function CampusCourierActivity.checkIn(activity, checkInId, locationId)
    if activity.closed or activity.resolved then
        return table.freeze({
            accepted = false,
            reason = "ACTIVITY_CLOSED",
            resolved = activity.resolved,
        })
    end

    if type(checkInId) ~= "string"
        or checkInId == ""
        or #checkInId > CampusCourierActivity.MAX_CHECK_IN_ID_LENGTH
    then
        return table.freeze({ accepted = false, reason = "INVALID_CHECK_IN_ID", resolved = false })
    end

    if type(locationId) ~= "string" or locationId == "" then
        return table.freeze({ accepted = false, reason = "INVALID_LOCATION_ID", resolved = false })
    end

    local cached = activity.receipts[checkInId]
    if cached then
        return cached
    end

    if activity.uniqueCheckInCount >= CampusCourierActivity.MAX_UNIQUE_CHECK_INS then
        return table.freeze({ accepted = false, reason = "TOO_MANY_CHECK_INS", resolved = false })
    end

    activity.uniqueCheckInCount += 1

    local expected = ROUTE[activity.stepIndex]
    local response
    if locationId ~= expected.locationId then
        response = makeResponse(
            activity,
            false,
            "WRONG_STOP",
            "That is not the next stop. " .. expected.objective
        )
    else
        activity.stepIndex += 1
        activity.resolved = activity.stepIndex > #ROUTE

        if activity.resolved then
            response = makeResponse(
                activity,
                true,
                nil,
                "Route complete! You earned 10 school points."
            )
        else
            response = makeResponse(
                activity,
                true,
                nil,
                "Delivery confirmed. " .. ROUTE[activity.stepIndex].objective
            )
        end
    end

    activity.receipts[checkInId] = response
    return response
end

function CampusCourierActivity.buildCompletion(activity, completedAt)
    assert(activity.resolved, "activity must be resolved before completion")
    return table.freeze({
        completionId = "activity:" .. activity.activityInstanceId,
        playerId = activity.playerId,
        classId = CampusCourierActivity.COMPLETION_CLASS_ID,
        score = CampusCourierActivity.REWARD_SCORE,
        completedAt = tonumber(completedAt) or 0,
    })
end

function CampusCourierActivity.close(activity)
    if activity.closed then
        return false
    end
    activity.closed = true
    activity.receipts = {}
    return true
end

return table.freeze(CampusCourierActivity)
