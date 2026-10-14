local ActivityCatalog = {}

ActivityCatalog.MAX_IDENTIFIER_LENGTH = 64
ActivityCatalog.MAX_PROMPT_LENGTH = 240
ActivityCatalog.MAX_HINT_LENGTH = 160
ActivityCatalog.MAX_EXPLANATION_LENGTH = 240
ActivityCatalog.MAX_CHOICES = 4
ActivityCatalog.MAX_CHOICE_TEXT_LENGTH = 80

local function isBoundedNonBlankString(value, maxLength)
    return type(value) == "string"
        and #value <= maxLength
        and value:find("%S") ~= nil
end

local function canonicalChoiceText(value)
    if type(value) ~= "string" then
        return nil
    end
    return string.lower((value:gsub("^%s+", ""):gsub("%s+$", "")))
end

function ActivityCatalog.validateActivity(classId, activity)
    if not isBoundedNonBlankString(classId, ActivityCatalog.MAX_IDENTIFIER_LENGTH)
        or type(activity) ~= "table"
    then
        return false, "INVALID_ACTIVITY"
    end

    if not isBoundedNonBlankString(activity.id, ActivityCatalog.MAX_IDENTIFIER_LENGTH)
        or activity.subject ~= classId
        or not isBoundedNonBlankString(activity.skill, ActivityCatalog.MAX_IDENTIFIER_LENGTH)
        or type(activity.difficulty) ~= "number"
        or activity.difficulty < 1
        or activity.difficulty % 1 ~= 0
        or not isBoundedNonBlankString(activity.prompt, ActivityCatalog.MAX_PROMPT_LENGTH)
        or not isBoundedNonBlankString(activity.hint, ActivityCatalog.MAX_HINT_LENGTH)
        or not isBoundedNonBlankString(activity.explanation, ActivityCatalog.MAX_EXPLANATION_LENGTH)
        or type(activity.choices) ~= "table"
        or #activity.choices < 2
    then
        return false, "INVALID_ACTIVITY"
    end

    if #activity.choices > ActivityCatalog.MAX_CHOICES then
        return false, "TOO_MANY_CHOICES"
    end

    local seenChoiceIds = {}
    local seenChoiceTexts = {}
    local correctChoiceFound = false
    for _, choice in ipairs(activity.choices) do
        local canonicalText = type(choice) == "table"
            and canonicalChoiceText(choice.text)
            or nil
        if type(choice) ~= "table"
            or not isBoundedNonBlankString(choice.id, ActivityCatalog.MAX_IDENTIFIER_LENGTH)
            or not canonicalText
            or canonicalText == ""
            or #choice.text > ActivityCatalog.MAX_CHOICE_TEXT_LENGTH
        then
            return false, "INVALID_CHOICE"
        end

        if seenChoiceIds[choice.id] then
            return false, "DUPLICATE_CHOICE_ID"
        end
        seenChoiceIds[choice.id] = true

        if seenChoiceTexts[canonicalText] then
            return false, "DUPLICATE_CHOICE_TEXT"
        end
        seenChoiceTexts[canonicalText] = true

        if choice.id == activity.correctChoiceId then
            correctChoiceFound = true
        end
    end

    if not correctChoiceFound then
        return false, "CORRECT_CHOICE_MISSING"
    end

    return true, nil
end

local ACTIVITIES = table.freeze({
    math = table.freeze({
        table.freeze({
            id = "math_addition_7_5",
            subject = "math",
            skill = "addition_within_20",
            difficulty = 1,
            prompt = "What is 7 + 5?",
            choices = table.freeze({
                table.freeze({ id = "a", text = "10" }),
                table.freeze({ id = "b", text = "11" }),
                table.freeze({ id = "c", text = "12" }),
                table.freeze({ id = "d", text = "13" }),
            }),
            correctChoiceId = "c",
            hint = "Count on five more from seven.",
            explanation = "Seven plus five equals twelve.",
        }),
        table.freeze({
            id = "math_subtraction_18_9",
            subject = "math",
            skill = "subtraction_within_20",
            difficulty = 1,
            prompt = "What is 18 - 9?",
            choices = table.freeze({
                table.freeze({ id = "a", text = "7" }),
                table.freeze({ id = "b", text = "9" }),
                table.freeze({ id = "c", text = "10" }),
                table.freeze({ id = "d", text = "11" }),
            }),
            correctChoiceId = "b",
            hint = "Count backward nine steps from eighteen.",
            explanation = "Eighteen minus nine equals nine.",
        }),
        table.freeze({
            id = "math_equal_groups_03",
            subject = "math",
            skill = "equal_groups",
            difficulty = 1,
            prompt = "Three trays hold 4 muffins each. How many muffins are there?",
            choices = table.freeze({
                table.freeze({ id = "a", text = "7" }),
                table.freeze({ id = "b", text = "10" }),
                table.freeze({ id = "c", text = "12" }),
                table.freeze({ id = "d", text = "14" }),
            }),
            correctChoiceId = "c",
            hint = "Add four muffins for each of the three trays.",
            explanation = "Three groups of four make twelve muffins.",
        }),
    }),
    ela = table.freeze({
        table.freeze({
            id = "ela_main_idea_01",
            subject = "ela",
            skill = "reading_comprehension",
            difficulty = 1,
            prompt = "Pip planted seeds and watered them each day. Soon, flowers grew. What is the main idea?",
            choices = table.freeze({
                table.freeze({ id = "a", text = "Pip grew flowers" }),
                table.freeze({ id = "b", text = "Pip lost a book" }),
                table.freeze({ id = "c", text = "It snowed outside" }),
            }),
            correctChoiceId = "a",
            hint = "Think about what happened to the seeds.",
            explanation = "Pip cared for seeds until they grew into flowers.",
        }),
        table.freeze({
            id = "ela_sequence_01",
            subject = "ela",
            skill = "event_sequence",
            difficulty = 1,
            prompt = "Maya packed lunch, rode the bus, and entered class. What happened after she packed lunch?",
            choices = table.freeze({
                table.freeze({ id = "a", text = "She rode the bus" }),
                table.freeze({ id = "b", text = "She went to sleep" }),
                table.freeze({ id = "c", text = "She planted a tree" }),
            }),
            correctChoiceId = "a",
            hint = "Look for the next event in the sentence.",
            explanation = "After packing lunch, Maya rode the bus.",
        }),
        table.freeze({
            id = "ela_context_clues_03",
            subject = "ela",
            skill = "context_clues",
            difficulty = 1,
            prompt = "The timid puppy hid behind the chair when visitors arrived. What does timid mean?",
            choices = table.freeze({
                table.freeze({ id = "a", text = "Shy or afraid" }),
                table.freeze({ id = "b", text = "Loud and bold" }),
                table.freeze({ id = "c", text = "Hungry" }),
            }),
            correctChoiceId = "a",
            hint = "Use the puppy's hiding behavior as a clue.",
            explanation = "Timid means shy or easily frightened.",
        }),
    }),
    science = table.freeze({
        table.freeze({
            id = "science_plants_01",
            subject = "science",
            skill = "plant_needs",
            difficulty = 1,
            prompt = "Which two things help a plant grow?",
            choices = table.freeze({
                table.freeze({ id = "a", text = "Water and light" }),
                table.freeze({ id = "b", text = "Paint and glue" }),
                table.freeze({ id = "c", text = "Sand and plastic" }),
            }),
            correctChoiceId = "a",
            hint = "Plants need a source of energy and moisture.",
            explanation = "Plants need water and light to grow.",
        }),
        table.freeze({
            id = "science_melting_01",
            subject = "science",
            skill = "states_of_matter",
            difficulty = 1,
            prompt = "What does an ice cube become when it melts?",
            choices = table.freeze({
                table.freeze({ id = "a", text = "Liquid water" }),
                table.freeze({ id = "b", text = "Stone" }),
                table.freeze({ id = "c", text = "Sand" }),
            }),
            correctChoiceId = "a",
            hint = "Melting changes a solid into a liquid.",
            explanation = "An ice cube melts into liquid water.",
        }),
        table.freeze({
            id = "science_forces_03",
            subject = "science",
            skill = "force_and_motion",
            difficulty = 1,
            prompt = "Which action is a push?",
            choices = table.freeze({
                table.freeze({ id = "a", text = "Opening a drawer toward you" }),
                table.freeze({ id = "b", text = "Moving a cart away from you" }),
                table.freeze({ id = "c", text = "Lifting a book straight up" }),
            }),
            correctChoiceId = "b",
            hint = "A push moves an object away from you.",
            explanation = "Moving a cart away from you applies a push.",
        }),
    }),
})

local seenActivityIds = {}
for classId, activitySet in pairs(ACTIVITIES) do
    assert(#activitySet >= 2, classId .. " needs at least two activities")
    for _, activity in ipairs(activitySet) do
        local valid, reason = ActivityCatalog.validateActivity(classId, activity)
        assert(valid, string.format("%s activity %s is invalid: %s", classId, tostring(activity.id), tostring(reason)))
        assert(not seenActivityIds[activity.id], "duplicate activity id: " .. activity.id)
        seenActivityIds[activity.id] = true
    end
end

function ActivityCatalog.getForClass(classId, dayIndex)
    local activitySet = ACTIVITIES[classId]
    if not activitySet
        or type(dayIndex) ~= "number"
        or dayIndex < 1
        or dayIndex % 1 ~= 0
    then
        return nil
    end

    local activityIndex = ((dayIndex - 1) % #activitySet) + 1
    return activitySet[activityIndex]
end

return table.freeze(ActivityCatalog)
