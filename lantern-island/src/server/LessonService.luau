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
function LessonService.new(_context) return setmetatable({},LessonService) end
function LessonService:quests() return QUESTS end
function LessonService:getQuest(id) for _,q in ipairs(QUESTS) do if q.id==id then return q end end end
function LessonService:getActivity(id) return ACTIVITIES[id] end
function LessonService:publicState(_player)
 return {id="lantern-original-grade2",version="sample-v2",title="Pip's Island Adventures",sourceLabel="Original sample practice - not current homework",reviewStatus="SAMPLE"}
end
function LessonService:options(id,userId)
 local a=ACTIVITIES[id];if not a then return {} end
 local seed=math.abs(tonumber(userId) or 0);for i=1,#id do seed+=string.byte(id,i) end
 local result={};for i=1,#a.options do table.insert(result,{id="choice-"..i,label=a.options[((i-1+seed)%#a.options)+1]}) end
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
