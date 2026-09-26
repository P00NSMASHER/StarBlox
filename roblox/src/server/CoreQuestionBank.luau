--!strict

-- Phase 7 certified material-first rotating question bank.
-- Answers remain server-only because this module lives under ServerScriptService.
local CoreQuestionBank = {}

local SOURCE = table.freeze({
	CertificationVersion = "phase7-material-first-question-source-v1",
	UpstreamRepository = "P00NSMASHER/abvmschoolstarworld",
	UpstreamPath = "pages/data/study-pack.json",
	UpstreamBlobSha = "9db898dbdba7208778ec3f61d25a427bb3dd8b60",
	PackSourceHash = "teacher-pages-0ca987de6de2d3791e25",
	SourceCapturedAt = "2026-09-24T20:13:58.158Z",
	WeekLabel = "Week of September 21, 2026",
	AnswersServerOnly = true,
	MaterialFirst = true,
	NoLiveLlm = true,
})

local QUESTIONS_BY_STATION = table.freeze({
	["word-portal-put-v1"] = table.freeze({
		table.freeze({
			Id = "phase7-sight-what-v1",
			StationId = "word-portal-put-v1",
			ContentHash = "sha256:d53a7424486117a2a91165edc272a22dd9415c9d69bf954db3f9a783f5772d40",
			Prompt = "___ is your favorite book?",
			Choices = table.freeze({"Here", "What", "Small"}),
			Answer = "What",
			Explanation = "“What” correctly begins a question asking for information.",
			Subject = "Reading / ELA",
			Skill = "sight-word-use",
			Provenance = "derived-from-published-topic",
			SourceFact = "Sight words: she, boy, he, small, were, what, girl, here, by, want",
		}),
		table.freeze({
			Id = "phase7-sight-want-v1",
			StationId = "word-portal-put-v1",
			ContentHash = "sha256:9b5dd4c9a2f14d4555487add0030fbdb4f1b378293a9a396aa08a77c7a0915bd",
			Prompt = "I ___ to read one more chapter.",
			Choices = table.freeze({"girl", "by", "want"}),
			Answer = "want",
			Explanation = "“Want” completes the sentence: “I want to read one more chapter.”",
			Subject = "Reading / ELA",
			Skill = "sight-word-use",
			Provenance = "derived-from-published-topic",
			SourceFact = "Sight words: she, boy, he, small, were, what, girl, here, by, want",
		}),
		table.freeze({
			Id = "phase7-sight-small-v1",
			StationId = "word-portal-put-v1",
			ContentHash = "sha256:469799073e50b18f8d0a2d1cc312c403e872409b3bee2678ae748e6d858b59bf",
			Prompt = "The ___ puppy curled up in the basket.",
			Choices = table.freeze({"what", "small", "were"}),
			Answer = "small",
			Explanation = "“Small” describes the puppy and completes the sentence correctly.",
			Subject = "Reading / ELA",
			Skill = "sight-word-use",
			Provenance = "derived-from-published-topic",
			SourceFact = "Sight words: she, boy, he, small, were, what, girl, here, by, want",
		}),
		table.freeze({
			Id = "phase7-grammar-command-v1",
			StationId = "word-portal-put-v1",
			ContentHash = "sha256:f6bebe844d6f1cf8978b6b927d5fc19969cd589154a673e312d6090dd481e75f",
			Prompt = "“Please put your homework in the folder.” What kind of sentence is this?",
			Choices = table.freeze({"question", "statement", "command"}),
			Answer = "command",
			Explanation = "It tells someone to do something, so it is a command.",
			Subject = "Reading / ELA",
			Skill = "sentence-types",
			Provenance = "derived-from-published-topic",
			SourceFact = "Grammar: types of sentences (test Wednesday, Sept. 30)",
		}),
		table.freeze({
			Id = "phase7-grammar-question-v1",
			StationId = "word-portal-put-v1",
			ContentHash = "sha256:06e3d8eef4f0ad5982bef436f0ee00d140d7da0ea1080e1a63ce0bfc51f88c10",
			Prompt = "“Where is my pencil?” What kind of sentence is this?",
			Choices = table.freeze({"statement", "question", "command"}),
			Answer = "question",
			Explanation = "It asks something and ends with a question mark, so it is a question.",
			Subject = "Reading / ELA",
			Skill = "sentence-types",
			Provenance = "derived-from-published-topic",
			SourceFact = "Grammar: types of sentences (test Wednesday, Sept. 30)",
		}),
		table.freeze({
			Id = "phase7-grammar-statement-v1",
			StationId = "word-portal-put-v1",
			ContentHash = "sha256:0016352d07de34589294d3383ca7b4c78124fa8c45723975d888311726bf2c5d",
			Prompt = "“The bird is sitting in the tree.” What kind of sentence is this?",
			Choices = table.freeze({"command", "question", "statement"}),
			Answer = "statement",
			Explanation = "It tells information, so it is a statement.",
			Subject = "Reading / ELA",
			Skill = "sentence-types",
			Provenance = "derived-from-published-topic",
			SourceFact = "Grammar: types of sentences (test Wednesday, Sept. 30)",
		}),
	}),
	["spelling-forge-fog-v1"] = table.freeze({
		table.freeze({
			Id = "phase7-blend-fly-v1",
			StationId = "spelling-forge-fog-v1",
			ContentHash = "sha256:f36861a08fbf29680ad1e2cb49f7ae9f314d155dc311ff654ab93548aee970db",
			Prompt = "Which word begins with the same two-letter consonant blend as “fly”?",
			Choices = table.freeze({"map", "flap", "sun"}),
			Answer = "flap",
			Explanation = "“Fly” and “flap” both begin with the blend “fl.”",
			Subject = "Spelling / Handwriting",
			Skill = "two-letter-consonant-blends",
			Provenance = "derived-from-published-topic",
			SourceFact = "Story: Little Flap Learns to Fly; Phonics: 2-letter consonant blends",
		}),
		table.freeze({
			Id = "phase7-blend-br-v1",
			StationId = "spelling-forge-fog-v1",
			ContentHash = "sha256:cac7d301973b33c3024b11aed84e12f8ccc2c2fa7a97c39a0d017f2eb8000af6",
			Prompt = "Which word begins with the blend “br”?",
			Choices = table.freeze({"cup", "brush", "map"}),
			Answer = "brush",
			Explanation = "“Brush” begins with the two consonants b and r blended together.",
			Subject = "Spelling / Handwriting",
			Skill = "two-letter-consonant-blends",
			Provenance = "derived-from-published-topic",
			SourceFact = "Phonics: 2-letter consonant blends",
		}),
		table.freeze({
			Id = "phase7-blend-cl-v1",
			StationId = "spelling-forge-fog-v1",
			ContentHash = "sha256:9cc260a3e0141ba208a626b686711dcfb74dff1c464fae5e9faf67330e4189bf",
			Prompt = "Which word begins with the blend “cl”?",
			Choices = table.freeze({"sun", "top", "clap"}),
			Answer = "clap",
			Explanation = "“Clap” begins with the consonant blend “cl.”",
			Subject = "Spelling / Handwriting",
			Skill = "two-letter-consonant-blends",
			Provenance = "derived-from-published-topic",
			SourceFact = "Phonics: 2-letter consonant blends",
		}),
		table.freeze({
			Id = "phase7-cvc-map-v1",
			StationId = "spelling-forge-fog-v1",
			ContentHash = "sha256:d74d34cdd409230425191117d686520c5e9c59d450529f6e7eefe0d8103a255d",
			Prompt = "Which word has a consonant-vowel-consonant (CVC) pattern?",
			Choices = table.freeze({"fly", "map", "here"}),
			Answer = "map",
			Explanation = "“Map” has consonant m, vowel a, consonant p: CVC.",
			Subject = "Reading / ELA",
			Skill = "cvc-word-structure",
			Provenance = "derived-from-published-topic",
			SourceFact = "Word structure: CVC words",
		}),
		table.freeze({
			Id = "phase7-cvc-dog-v1",
			StationId = "spelling-forge-fog-v1",
			ContentHash = "sha256:d80238c1ef72199dfd8c87ed9e9bb092e30b5720619dbeb1fe4180e33cdc4656",
			Prompt = "Which word has a consonant-vowel-consonant (CVC) pattern?",
			Choices = table.freeze({"small", "what", "dog"}),
			Answer = "dog",
			Explanation = "“Dog” has consonant d, vowel o, consonant g: CVC.",
			Subject = "Reading / ELA",
			Skill = "cvc-word-structure",
			Provenance = "derived-from-published-topic",
			SourceFact = "Word structure: CVC words",
		}),
		table.freeze({
			Id = "phase7-blend-st-v1",
			StationId = "spelling-forge-fog-v1",
			ContentHash = "sha256:3c85fa8a48058b0ca7ebf6ffaf467ace4f6551163425ceeb9385dbbe35556f8b",
			Prompt = "Which word begins with a two-letter consonant blend?",
			Choices = table.freeze({"cat", "stop", "pig"}),
			Answer = "stop",
			Explanation = "“Stop” begins with the consonant blend “st.”",
			Subject = "Spelling / Handwriting",
			Skill = "two-letter-consonant-blends",
			Provenance = "derived-from-published-topic",
			SourceFact = "Phonics: 2-letter consonant blends",
		}),
	}),
	["culture-lab-culture-v1"] = table.freeze({
		table.freeze({
			Id = "phase7-religion-disciples-v1",
			StationId = "culture-lab-culture-v1",
			ContentHash = "sha256:f2141a670457a2dcbb55468a1a33b282fc84d74bed64c8a69c4d471a454a23ac",
			Prompt = "What are friends of Jesus called?",
			Choices = table.freeze({"captions", "disciples", "blends"}),
			Answer = "disciples",
			Explanation = "The lesson says we are called to be disciples, friends of Jesus.",
			Subject = "Religion",
			Skill = "disciples",
			Provenance = "derived-from-published-topic",
			SourceFact = "We are called to be disciples, friends of Jesus.",
		}),
		table.freeze({
			Id = "phase7-religion-trinity-v1",
			StationId = "culture-lab-culture-v1",
			ContentHash = "sha256:cd35f8b4e22dabfab0770eeedde780db4588a7c102e35e2355197193106c0d90",
			Prompt = "Which group names the three Persons in the Trinity?",
			Choices = table.freeze({"Father, Son, and Holy Spirit", "Jesus, Mary, and Joseph", "Peter, Paul, and Mary"}),
			Answer = "Father, Son, and Holy Spirit",
			Explanation = "The Trinity is one God in three Persons: Father, Son, and Holy Spirit.",
			Subject = "Religion",
			Skill = "trinity",
			Provenance = "derived-from-published-topic",
			SourceFact = "Trinity: 3 persons in one God (Father, Son, Holy Spirit)",
		}),
		table.freeze({
			Id = "phase7-religion-grace-v1",
			StationId = "culture-lab-culture-v1",
			ContentHash = "sha256:51e079453856768c4134ed819149ecb1ed5101861055908c19606268231377fc",
			Prompt = "What is the new life Jesus gives us called?",
			Choices = table.freeze({"a trophy", "grace", "a game"}),
			Answer = "grace",
			Explanation = "The lesson teaches that Jesus gives us the new life of grace.",
			Subject = "Religion",
			Skill = "grace",
			Provenance = "derived-from-published-topic",
			SourceFact = "Jesus gave us the new life of grace.",
		}),
		table.freeze({
			Id = "phase7-religion-savior-v1",
			StationId = "culture-lab-culture-v1",
			ContentHash = "sha256:f49c9195f4a4ee0194bca1c1c97fb56738250739bc6d31e9ae4d336c056f40e3",
			Prompt = "Why did Jesus die for us?",
			Choices = table.freeze({"To win a prize", "For our sins", "To become famous"}),
			Answer = "For our sins",
			Explanation = "The lesson teaches that Jesus died for our sins and is our Savior.",
			Subject = "Religion",
			Skill = "jesus-savior",
			Provenance = "derived-from-published-topic",
			SourceFact = "Jesus died for our sins; He is our Savior.",
		}),
		table.freeze({
			Id = "phase7-religion-mary-v1",
			StationId = "culture-lab-culture-v1",
			ContentHash = "sha256:c72e6d6ed8f8a1c2af5c424cc80bb0e2ebc8b6102d41aad51d02cb8f957dd078",
			Prompt = "Who is Jesus’ mother and also the mother of the Church?",
			Choices = table.freeze({"Mary", "Martha", "Elizabeth"}),
			Answer = "Mary",
			Explanation = "The lesson says Mary is Jesus’ mother and the mother of the Church.",
			Subject = "Religion",
			Skill = "mary",
			Provenance = "derived-from-published-topic",
			SourceFact = "Mary is Jesus' mother and the mother of the Church so she is our mother too.",
		}),
		table.freeze({
			Id = "phase7-religion-creation-v1",
			StationId = "culture-lab-culture-v1",
			ContentHash = "sha256:b8978bcf3819055ff99ce030015ef963112badf8ff396d13430c9aa63400f66f",
			Prompt = "Which action shows care for God’s gift of creation?",
			Choices = table.freeze({"Leave trash on the grass", "Pick up litter and put it in the trash", "Break healthy branches for fun"}),
			Answer = "Pick up litter and put it in the trash",
			Explanation = "Taking care of the world around us is one way to care for God’s gift of creation.",
			Subject = "Religion",
			Skill = "care-for-creation",
			Provenance = "derived-from-published-topic",
			SourceFact = "It is our responsibility to take care of God's gifts of creation.",
		}),
	}),
})

local BY_ID = {}
for _, pool in QUESTIONS_BY_STATION do
	for _, question in pool do
		BY_ID[question.Id] = question
	end
end

local function normalizedCursor(value: any): number
	local parsed = tonumber(value) or 0
	if parsed ~= parsed then
		return 0
	end
	return math.max(0, math.floor(parsed))
end

function CoreQuestionBank.Select(stationId: string, cursor: any)
	local pool = QUESTIONS_BY_STATION[stationId]
	if pool == nil or #pool == 0 then
		return nil
	end
	local clean = normalizedCursor(cursor)
	local index = (clean % #pool) + 1
	return pool[index]
end

function CoreQuestionBank.GetById(questionId: string)
	return BY_ID[questionId]
end

function CoreQuestionBank.Grade(questionId: any, choice: any): boolean
	if type(questionId) ~= "string" or type(choice) ~= "string" then
		return false
	end
	local question = BY_ID[questionId]
	return question ~= nil and string.lower(choice) == string.lower(question.Answer)
end

function CoreQuestionBank.CountForStation(stationId: string): number
	local pool = QUESTIONS_BY_STATION[stationId]
	return if pool == nil then 0 else #pool
end

CoreQuestionBank.Source = SOURCE
CoreQuestionBank.QuestionsByStation = QUESTIONS_BY_STATION

return table.freeze(CoreQuestionBank)
