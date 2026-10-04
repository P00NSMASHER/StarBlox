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
    ela = table.freeze({
        id = "ela_main_idea_01", subject = "ela", skill = "reading_comprehension", difficulty = 1,
        prompt = "Pip planted seeds and watered them each day. Soon, flowers grew. What is the main idea?",
        choices = table.freeze({
            table.freeze({ id = "a", text = "Pip grew flowers" }),
            table.freeze({ id = "b", text = "Pip lost a book" }),
            table.freeze({ id = "c", text = "It snowed outside" }),
        }),
        correctChoiceId = "a", hint = "Think about what happened to the seeds.",
        explanation = "Pip cared for seeds until they grew into flowers.",
    }),
    science = table.freeze({
        id = "science_plants_01", subject = "science", skill = "plant_needs", difficulty = 1,
        prompt = "Which two things help a plant grow?",
        choices = table.freeze({
            table.freeze({ id = "a", text = "Water and light" }),
            table.freeze({ id = "b", text = "Paint and glue" }),
            table.freeze({ id = "c", text = "Sand and plastic" }),
        }),
        correctChoiceId = "a", hint = "Plants need a source of energy and moisture.",
        explanation = "Plants need water and light to grow.",
    }),
})

function ActivityCatalog.getForClass(classId)
    return ACTIVITIES[classId]
end

return table.freeze(ActivityCatalog)
