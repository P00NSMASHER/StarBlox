--!nonstrict
-- Original sample practice. Server-only answer keys; NOT a live school content pack.
local LessonService = {}
LessonService.__index = LessonService
local QUESTS = {
 {id="lantern-lift", title="Light the hilltop", station="LiftConsole", reward="firefly-scarf", steps={"lift-1","lift-2","lift-3","lift-4"},
  objective="Find the golden lift sign. Help Pip light the hill and earn a Firefly Scarf."},
 {id="ribbon-studio", title="Pip's ribbon studio", station="RibbonConsole", reward="rainbow-bow", steps={"ribbon-1","ribbon-2","ribbon-3","ribbon-4"},
  objective="Find the pink ribbon stand. Solve word clues to make Pip a Rainbow Bow."},
 {id="moon-picnic", title="The missing picnic", station="PicnicConsole", reward="moon-crown", steps={"picnic-1","picnic-2","picnic-3","picnic-4"},
  objective="Find the blue pond sign. Read Pip's clues and bring back the moonlight picnic."},
}
local ACTIVITIES = {}
local function mathCard(id, a, b, options, transfer)
 local sum=a+b
 local tens=math.floor(a/10)+math.floor(b/10)
 local ones=a%10+b%10
 local explanation=tostring(a).." + "..tostring(b)..": "..tens.." tens and "..ones.." ones. "
 if ones>=10 then explanation..="Trade 10 ones for 1 ten. " end
 explanation..="That makes "..math.floor(sum/10).." tens and "..tostring(sum%10).." ones: "..sum.."."
 ACTIVITIES[id]={id=id,type="math",skill="addition-within-100",answer=tostring(sum),options=options,transfer=transfer==true,
  prompt="Pip has "..a.." glowstones and finds "..b.." more. How many can power the lift?",
  passage=transfer and "New delivery! Try this new problem before asking Pip for help." or "Each solved delivery lights another part of the hill.",
  representation={tensA=math.floor(a/10),onesA=a%10,tensB=math.floor(b/10),onesB=b%10,operation="+"},
  hints={"Add the tens, then add the ones. A group of 10 ones can become 1 ten.",
   "There are "..tens.." tens and "..ones.." ones before trading. Count their value together.",explanation},explanation=explanation}
end
mathCard("lift-1",12,5,{"16","17","7","22"},false)
mathCard("lift-2",23,14,{"27","38","37","47"},false)
mathCard("lift-3",27,15,{"41","32","52","42"},false)
mathCard("lift-4",36,17,{"53","43","54","63"},true)
local function wordCard(id,prompt,answer,options,hint,explanation,transfer)
 ACTIVITIES[id]={id=id,type="word",skill="long-vowel-patterns",answer=answer,options=options,transfer=transfer==true,
  prompt=prompt,passage="Choose a word label for Pip's new outfit. Say the word aloud, too!",
  hints={hint,"Read each choice slowly. Compare the letters with the clue.",explanation},explanation=explanation}
end
wordCard("ribbon-1","The ribbon can glow in the r__n. Which word means water falling from clouds?","rain",{"ran","rain","rein","run"},
 "The /ay/ sound in rain is spelled with the vowel team ai.","Rain is spelled r-ai-n. The letters ai work together to make the long a sound.",false)
wordCard("ribbon-2","Which word means a line of cars pulled along a railroad? It has the same ai pattern as rain.","train",{"tree","trane","train","trail"},
 "Start with tr, then add the ai sound and n.","Train is tr-ai-n. Rain and train both use ai for the long a sound.",false)
wordCard("ribbon-3","Pip wants a ribbon as green as a tr__. Which word is a tall plant with a trunk?","tree",{"try","tray","trea","tree"},
 "The long e sound in tree is spelled ee.","Tree is tr-ee. The two e letters work together to make the long e sound.",false)
wordCard("ribbon-4","New label! Which word means a little round thing on a necklace and uses ea for the long e sound?","bead",{"bead","bed","bad","bid"},
 "The word starts with b, ends with d, and has ea in the middle.","Bead is b-ea-d. The letters ea can make the long e sound, as in bead.",true)
local function readingCard(id,passage,prompt,answer,options,hint,explanation,transfer)
 ACTIVITIES[id]={id=id,type="reading",skill="reading-details-and-sequence",answer=answer,options=options,transfer=transfer==true,
  passage=passage,prompt=prompt,hints={hint,"Read the clue again. Point to the words that support your choice.",explanation},explanation=explanation}
end
readingCard("picnic-1","Pip left the picnic basket beside the blue pond. A tiny cat is guarding it.","Where should we look for the basket?","By the blue pond",{"On the hill","By the blue pond","In the studio","Under the lift"},
 "Look for the words that tell where Pip left the basket.","The clue says 'beside the blue pond.' Those words tell us where to look.",false)
readingCard("picnic-2","First, Pip spreads a blanket. Next, Pip puts cups on it. Last, Pip opens the basket.","What does Pip do just before opening the basket?","Puts cups down",{"Opens the basket","Finds the cat","Puts cups down","Leaves the island"},
 "Read the actions in order: first, next, last.","Putting the cups down is the next action. It happens just before the last action, opening the basket.",false)
readingCard("picnic-3","Dark clouds cover the moon. Rain begins to fall. Pip moves the picnic under a wide shelter.","Why does Pip move under the shelter?","To stay dry",{"To count stones","To find a ribbon","To make rain","To stay dry"},
 "Think about what changed just before Pip moved: rain began.","Rain began to fall, so moving under the shelter helps Pip and the picnic stay dry.",false)
readingCard("picnic-4","Pip ties a bow on the basket. Then Pip carries it to the shelter. The cat follows behind.","New clue! What happens after Pip ties the bow?","Pip carries it",{"Pip carries it","Pip goes swimming","The cat ties it","Pip loses it"},
 "Find the action after the word 'Then.'", "The next sentence says 'Then Pip carries it to the shelter.' That is what happens after tying the bow.",true)
function LessonService.new(_context) return setmetatable({},LessonService) end
function LessonService:quests() return QUESTS end
function LessonService:getQuest(id) for _,q in ipairs(QUESTS) do if q.id==id then return q end end;return nil end
function LessonService:getActivity(id) return ACTIVITIES[id] end
function LessonService:publicState(_player)
 return {id="lantern-original-grade2",version="sample-v2",title="Pip's Island Adventures",
  sourceLabel="Original sample practice - not current homework",reviewStatus="SAMPLE"}
end
function LessonService:options(id,userId)
 local a=ACTIVITIES[id];if not a then return {} end
 local seed=math.abs(tonumber(userId) or 0)
 for i=1,#id do seed+=string.byte(id,i) end
 local result={}
 for i=1,#a.options do
  local at=((i-1+seed)%#a.options)+1
  table.insert(result,{id="choice-"..i,label=a.options[at]})
 end
 return result
end
function LessonService:check(id,answer,userId)
 local a=ACTIVITIES[id];if not a then return false end
 if type(answer)=="string" then
  for _,option in ipairs(self:options(id,userId)) do if option.id==answer then return option.label==a.answer end end
  return false
 end
 -- Keep the original concrete tens/ones interface; validate even when called outside transport.
 if a.type~="math" then return false end
 if type(answer)=="table" then
  if type(answer.tens)~="number" or type(answer.ones)~="number" or answer.tens%1~=0 or answer.ones%1~=0 or answer.tens<0 or answer.ones<0 or answer.ones>9 then return false end
  answer=answer.tens*10+answer.ones
 end
 return type(answer)=="number" and answer==tonumber(a.answer)
end
return LessonService
