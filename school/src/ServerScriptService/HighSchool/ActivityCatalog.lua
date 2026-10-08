local ActivityCatalog = {}

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
    }),
})

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
