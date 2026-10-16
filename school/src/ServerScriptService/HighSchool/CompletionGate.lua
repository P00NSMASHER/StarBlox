local CompletionGate = {}

local VALID_CLASS_IDS = table.freeze({
    math = true,
    ela = true,
    science = true,
})

function CompletionGate.getOccurrenceId(scheduleNamespace, dayIndex, periodIndex, classId)
    if type(scheduleNamespace) ~= "string"
        or scheduleNamespace == ""
        or #scheduleNamespace > 64
        or not scheduleNamespace:match("^[%w_%-]+$")
        or type(dayIndex) ~= "number"
        or dayIndex < 1
        or dayIndex % 1 ~= 0
        or type(periodIndex) ~= "number"
        or periodIndex < 1
        or periodIndex % 1 ~= 0
        or not VALID_CLASS_IDS[classId]
    then
        return nil
    end

    return string.format(
        "schedule:%s:day:%d:period:%d:class:%s",
        scheduleNamespace,
        dayIndex,
        periodIndex,
        classId
    )
end

function CompletionGate.getCompletionId(playerId, occurrenceId)
    if type(playerId) ~= "number"
        or playerId < 1
        or playerId % 1 ~= 0
        or type(occurrenceId) ~= "string"
        or occurrenceId == ""
    then
        return nil
    end

    return string.format("player:%d:%s", playerId, occurrenceId)
end

function CompletionGate.isCompletionIdFor(completionId, playerId, classId)
    if type(completionId) ~= "string"
        or #completionId > 192
        or type(playerId) ~= "number"
        or playerId < 1
        or playerId % 1 ~= 0
        or not VALID_CLASS_IDS[classId]
    then
        return false
    end

    local encodedPlayerId, scheduleNamespace, dayText, periodText, encodedClassId =
        completionId:match(
            "^player:(%d+):schedule:([%w_%-]+):day:(%d+):period:(%d+):class:([%w_%-]+)$"
        )
    if not encodedPlayerId
        or #dayText > 9
        or #periodText > 9
    then
        return false
    end

    local dayIndex = tonumber(dayText)
    local periodIndex = tonumber(periodText)
    local occurrenceId = CompletionGate.getOccurrenceId(
        scheduleNamespace,
        dayIndex,
        periodIndex,
        encodedClassId
    )
    if not occurrenceId then
        return false
    end

    return encodedClassId == classId
        and CompletionGate.getCompletionId(playerId, occurrenceId) == completionId
end

function CompletionGate.hasCompleted(completedOccurrences, occurrenceId)
    return type(completedOccurrences) == "table"
        and type(occurrenceId) == "string"
        and completedOccurrences[occurrenceId] == true
end

function CompletionGate.markCompleted(completedOccurrences, occurrenceId)
    if type(completedOccurrences) ~= "table"
        or type(occurrenceId) ~= "string"
        or occurrenceId == ""
        or completedOccurrences[occurrenceId] == true
    then
        return false
    end

    completedOccurrences[occurrenceId] = true
    return true
end

return table.freeze(CompletionGate)
