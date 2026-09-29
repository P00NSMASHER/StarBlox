--!nonstrict
-- Original, reviewed sample questions; answer keys stay on the server.
local LessonService = {}
LessonService.__index = LessonService
local QUESTS = {
 {id="lantern-lift",title="Light the hill",reward="firefly-scarf",station="LiftConsole",steps={"lift-1","lift-2","lift-3","lift-4"},objective="Follow the gold trail. Help Pip light the hill and earn a Firefly Scarf."},
 {id="ribbon-studio",title="Pip's ribbon studio",reward="rainbow-bow",station="RibbonConsole",steps={"ribbon-1","ribbon-2","ribbon-3","ribbon-4"},objective="Follow the pink trail. Solve word clues to make Pip a Rainbow Bow."},
 {id="moon-picnic",title="The missing picnic",reward="moon-crown",station="PicnicConsole",steps={"picnic-1","picnic-2","picnic-3","picnic-4"},objective="Follow the blue trail. Read the clues to find Pip's picnic and earn a Moon Crown."},
}
local ACTIVITIES = {}
local function mathCard(id,a,b,options,transfer)
 local answer=a+b;local tens=math.floor(a/10)+math.floor(b/10);local ones=a%10+b%10
 local explanation=a.." + "..b..": "..tens.." tens and "..ones.." ones. "
 if ones>=10 then explanation..="Trade 10 ones for 1 ten. " end
 explanation..="That is "..math.floor(answer/10).." tens and "..(answer%10).." ones: "..answer.."."
 ACTIVITIES[id]={id=id,type="math",skill="addition-within-100",answer=tostring(answer),options=options,transfer=transfer==true,
  prompt="Pip has "..a.." glowstones and finds "..b.." more. How many altogether?",
  passage=transfer and "A new delivery! Try it on your own, or ask Pip for help." or "Each delivery lights one more part of the hill.",
  representation={tensA=math.floor(a/10),onesA=a%10,tensB=math.floor(b/10),onesB=b%10,operation="+"},
  hints={"Add the tens, then the ones. A group of 10 ones becomes 1 ten.","There are "..tens.." tens and "..ones.." ones before trading. Count their value together.",explanation},explanation=explanation}
end
mathCard("lift-1",12,5,{"16","17","7","22"})
mathCard("lift-2",23,14,{"27","38","37","47"})
mathCard("lift-3",27,15,{"41","32","52","42"})
mathCard("lift-4",36,17,{"53","43","54","63"},true)
local function wordCard(id,prompt,answer,options,hint,explanation,transfer)
 ACTIVITIES[id]={id=id,type="word",skill="long-a-ai",answer=answer,options=options,transfer=transfer==true,prompt=prompt,
  passage="Choose a label for Pip's outfit. Say each word aloud as you try it!",
  hints={hint,"Read the choices slowly. Look for ai making the long a sound.",explanation},explanation=explanation}
end
wordCard("ribbon-1","Which word means water falling from clouds?","rain",{"ran","rain","rein","run"},"The long a sound in rain is spelled ai.","Rain is r-ai-n. The letters ai work together to make the long a sound.")
wordCard("ribbon-2","Which word means cars pulled along a railroad? It uses ai like rain.","train",{"tree","trane","train","trail"},"Start with tr, then add ai and n.","Train is tr-ai-n. Rain and train both use ai for long a.")
wordCard("ribbon-3","What can Pip use to color the ribbon stand? Pick the word with ai.","paint",{"point","pant","pent","paint"},"The word starts with p and ends with nt. Put ai in the middle.","Paint is p-ai-nt. The letters ai make the long a sound again.")
wordCard("ribbon-4","New clue! Which word is a slow animal with a shell and uses ai for long a?","snail",{"snail","snell","snil","snul"},"The word starts with sn and ends with l. Listen for long a in the middle.","Snail is sn-ai-l. It uses the same ai pattern as rain, train and paint.",true)
local function readingCard(id,passage,prompt,answer,options,hint,explanation,transfer)
 ACTIVITIES[id]={id=id,type="reading",skill="reading-details-and-sequence",answer=answer,options=options,transfer=transfer==true,
  passage=passage,prompt=prompt,hints={hint,"Read the clue again. Find the words that support your choice.",explanation},explanation=explanation}
end
readingCard("picnic-1","Pip left the basket beside the blue pond. A tiny cat is guarding it.","Where should we look?","By the blue pond",{"On the high hill","By the blue pond","In the pink shop","Under the lift"},"Find the words that tell where Pip left the basket.","The clue says 'beside the blue pond.' That tells us where to look.")
readingCard("picnic-2","First, Pip spreads a blanket. Next, Pip puts cups on it. Last, Pip opens the basket.","What happens just before Pip opens the basket?","Pip puts cups down",{"Pip opens the basket","Pip finds the cat","Pip puts cups down","Pip leaves the island"},"Read in order: first, next, last.","Putting the cups down is next. It happens just before the last action, opening the basket.")
readingCard("picnic-3","Dark clouds cover the moon. Rain begins to fall. Pip moves the picnic under a shelter.","Why does Pip move?","To keep the picnic dry",{"To count glowstones","To find a new ribbon","To make the rain fall","To keep the picnic dry"},"What changed just before Pip moved? Rain began.","Rain began to fall. The shelter helps Pip and the picnic stay dry.")
readingCard("picnic-4","Pip ties a bow on the basket. Then Pip carries it to the shelter. The cat follows behind.","New clue! What happens after Pip ties the bow?","Pip carries the basket",{"Pip carries the basket","Pip goes for a swim","The cat ties a bow","Pip loses the basket"},"Find the action after the word 'Then.'","The next sentence says 'Then Pip carries it to the shelter.' That happens after tying the bow.",true)

-- Fresh replay cards keep practice from becoming a memorized button pattern.
-- They never award another outfit or add new learning credit.
mathCard("liftp-1",14,6,{"19","20","21","24"})
mathCard("liftp-2",31,16,{"47","46","37","57"})
mathCard("liftp-3",28,16,{"34","44","54","42"})
mathCard("liftp-4",45,18,{"63","53","62","73"},true)
wordCard("ribbonp-1","Which word means letters and packages sent to you?","mail",{"mail","mall","mill","meal"},"Listen for the long a sound. Mail uses ai.","Mail is m-ai-l. The letters ai make the long a sound.")
wordCard("ribbonp-2","Which word means the long part behind some animals?","tail",{"tell","tail","tall","tile"},"The word begins with t and uses ai.","Tail is t-ai-l. It uses the same long a pattern as mail.")
wordCard("ribbonp-3","Which word means linked metal loops?","chain",{"chin","chain","chane","churn"},"Start with ch, then listen for the long a sound.","Chain is ch-ai-n. The ai team makes the long a sound.")
wordCard("ribbonp-4","Which word catches the wind to move a boat?","sail",{"sail","seal","sell","soil"},"The word begins with s and uses ai.","Sail is s-ai-l. It uses the same ai pattern as mail, tail, and chain.",true)
readingCard("picnicp-1","Pip packs three apples. Next, Pip adds two sandwiches. Last, Pip closes the basket.","What does Pip do just before closing the basket?","Adds sandwiches",{"Adds sandwiches","Lights a lantern","Feeds the cat","Folds the blanket"},"Look at the action after the word Next.","The sandwiches are added next, just before the basket is closed.")
readingCard("picnicp-2","A blue ribbon blows off the stand and lands beside the pond. Pip follows it to the water.","Where does Pip find the ribbon?","Beside the pond",{"On the hill","Beside the pond","Under the blanket","At the lift"},"Find the words that tell where the ribbon landed.","The passage says it lands beside the pond, so that is where Pip finds it.")
readingCard("picnicp-3","The grass is wet after the rain, so Pip moves the picnic onto a dry wooden platform.","Why does Pip move the picnic?","The grass is wet",{"The grass is wet","The basket is empty","The moon is bright","The cat is sleepy"},"Look for the reason after the word so.","The passage explains that the grass is wet, so Pip chooses a dry place.")
readingCard("picnicp-4","First, Pip lights the lantern. Next, the path glows. Then, Pip waves to the cat.","What happens right after Pip lights the lantern?","The path glows",{"The path glows","Pip closes the basket","The cat runs away","Rain starts"},"Read what comes after the word Next.","The next event is that the path glows.",true)
local PRACTICE={
 ["lift-1"]="liftp-1",["lift-2"]="liftp-2",["lift-3"]="liftp-3",["lift-4"]="liftp-4",
 ["ribbon-1"]="ribbonp-1",["ribbon-2"]="ribbonp-2",["ribbon-3"]="ribbonp-3",["ribbon-4"]="ribbonp-4",
 ["picnic-1"]="picnicp-1",["picnic-2"]="picnicp-2",["picnic-3"]="picnicp-3",["picnic-4"]="picnicp-4",
}
function LessonService.new(_context) return setmetatable({},LessonService) end
function LessonService:quests() return QUESTS end
function LessonService:getQuest(id) for _,q in ipairs(QUESTS) do if q.id==id then return q end end end
function LessonService:getActivity(id) return ACTIVITIES[id] end
function LessonService:practiceActivityId(id) return PRACTICE[id] end
function LessonService:publicState(_player)
 return {id="lantern-original-grade2",version="sample-v2",title="Pip's Island Adventures",sourceLabel="Original sample practice - not current homework",reviewStatus="SAMPLE"}
end
-- Stable per-learner decks put the correct answer in each slot once per quest.
-- The old activity-character sum canceled the authored answer positions, leaving
-- all four math answers in one slot. Do not infer learning from repeated taps.
local function shuffle(values,seed)
 local out=table.clone(values)
 for i=#out,2,-1 do seed=(seed*48271)%2147483647;local j=(seed%i)+1;out[i],out[j]=out[j],out[i] end
 return out
end
local function seedFor(text,userId)
 local seed=(math.abs(tonumber(userId) or 0)%2147483646)+1
 for i=1,#text do seed=(seed*131+string.byte(text,i))%2147483647 end
 return seed==0 and 1 or seed
end
function LessonService:options(id,userId)
 local a=ACTIVITIES[id];if not a then return {} end
 local questId,step=id:match("^(.-)%-(%d+)$");local index=tonumber(step)
 assert(questId and index and index>=1 and index<=4 and #a.options==4,"Unknown option layout")
 local slots=shuffle({1,2,3,4},seedFor(questId,userId))
 local distractors={};local matches=0
 for _,label in ipairs(a.options)do if label==a.answer then matches+=1 else table.insert(distractors,label) end end
 assert(matches==1,"Activity must contain one answer")
 local labels=shuffle(distractors,seedFor(id,userId));table.insert(labels,slots[index],a.answer)
 local result={};for i,label in ipairs(labels)do table.insert(result,{id="choice-"..i,label=label}) end
 return result
end
function LessonService:check(id,answer,userId)
 local a=ACTIVITIES[id];if not a then return false end
 if type(answer)=="string" then
  for _,option in ipairs(self:options(id,userId)) do if option.id==answer then return option.label==a.answer end end
  return false
 end
 if a.type~="math" then return false end
 if type(answer)=="table" then
  if type(answer.tens)~="number" or type(answer.ones)~="number" or answer.tens%1~=0 or answer.ones%1~=0 or answer.tens<0 or answer.ones<0 or answer.ones>9 then return false end
  answer=answer.tens*10+answer.ones
 end
 return type(answer)=="number" and answer==tonumber(a.answer)
end
return LessonService

[executed on device: PAAM-L044 (c83a6c06-c0d3-4127-84de-311c7c6f1364)]