local ActivityCatalog = {}

local ACTIVITIES = table.freeze({
    math = table.freeze({
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
})

function ActivityCatalog.getForClass(classId)
    return ACTIVITIES[classId]
end

return table.freeze(ActivityCatalog)
