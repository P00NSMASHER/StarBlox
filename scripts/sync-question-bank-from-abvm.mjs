import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';

const argv=process.argv.slice(2);
function option(name,fallback){
  const i=argv.indexOf(name);
  return i>=0&&argv[i+1]!==undefined?argv[i+1]:fallback;
}
const packPath=option('--pack','docs/phase6/ABVM_CURRENT_STUDY_PACK.json');
const sourceOut=option('--source-out','docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json');
const packOut=option('--pack-out','docs/phase6/ABVM_CURRENT_STUDY_PACK.json');
const luaOut=option('--lua-out','roblox/src/server/CoreQuestionBank.luau');
const scannerCommit=option('--scanner-commit','unknown');
const GENERATOR_VERSION='dynamic-abvm-star-sync-generator-v4-research-7-12';

const data=JSON.parse(readFileSync(packPath,'utf8'));
const pack=data.pack||data;
if(!pack||!Array.isArray(pack.subjects)) throw new Error('ABVM pack is missing subjects.');
if(data.delivery&&data.delivery!=='verified') throw new Error('ABVM pack is not verified.');
if(pack.sourceSufficient===false) throw new Error('ABVM pack reports insufficient source material.');

const stable=value=>{
  if(Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';
  }
  return JSON.stringify(value);
};
const sha=value=>'sha256:'+createHash('sha256').update(typeof value==='string'?value:stable(value)).digest('hex');
const rawSourceHash=pack.sourceHash||sha(pack);
if(existsSync(sourceOut)){
  const previous=JSON.parse(readFileSync(sourceOut,'utf8'));
  if(
    previous?.generatedFrom?.sourceHash===rawSourceHash
    && previous?.generatedFrom?.generatorVersion===GENERATOR_VERSION
    && (scannerCommit==='unknown'||previous?.generatedFrom?.scannerCommit===scannerCommit)
  ){
    console.log(JSON.stringify({status:'unchanged',sourceHash:rawSourceHash,generatorVersion:GENERATOR_VERSION},null,2));
    process.exit(0);
  }
}
const generatorTag=createHash('sha256').update(GENERATOR_VERSION).digest('hex').slice(0,6);
const snapshotId='abvm-'+String(rawSourceHash).replace(/^teacher-pages-/,'').replace(/^sha256:/,'').slice(0,12)+'-'+generatorTag;
const snapshotSeed=createHash('sha256').update(String(rawSourceHash)).digest();
let seed=snapshotSeed.readUInt32LE(0)>>>0;
function rand(){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  return seed/0x100000000;
}
function int(min,max){ return min+Math.floor(rand()*(max-min+1)); }
function pick(list){ return list[Math.floor(rand()*list.length)]; }
function shuffled(list){
  const out=[...list];
  for(let i=out.length-1;i>0;i--){
    const j=Math.floor(rand()*(i+1));
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}

const STATIONS=['word-portal-put-v1','spelling-forge-fog-v1','culture-lab-culture-v1'];
const FORBIDDEN=[/sight word/i,/which .* is on the current .* list/i,/teacher page/i,/study list/i,/being practiced this week/i];
const STANDARD_BY_SKILL=Object.freeze({
  'sentence-types':['CCSS.L.2.1'],
  'consonant-blends':['CCSS.RF.2.3'],
  'vowel-patterns':['CCSS.RF.2.3'],
  'cvc-structure':['CCSS.RF.2.3'],
  'plural-nouns':['CCSS.L.2.1.b'],
  'vocabulary-in-context':['CCSS.L.2.4'],
  'context-clues':['CCSS.L.2.4.a'],
  'word-parts':['CCSS.L.2.4.b'],
  'cause-effect':['CCSS.RI.2.3'],
  'sequence':['CCSS.RL.2.5'],
  'theme':['CCSS.RL.2.2'],
  'inference':['CCSS.RL.2.1'],
  'text-evidence':['CCSS.RL.2.1'],
  'visualize':['CCSS.RL.2.1'],
  'character-development':['CCSS.RL.2.3'],
  'author-purpose':['CCSS.RI.2.6'],
  'word-choice':['CCSS.RL.2.4'],
  'addition':['CCSS.2.NBT.B.5'],
  'addition-within-100':['CCSS.2.NBT.B.5'],
  'subtraction':['CCSS.2.NBT.B.5'],
  'subtraction-within-100':['CCSS.2.NBT.B.5'],
  'missing-number':['CCSS.2.OA.A.1'],
  'missing-addend':['CCSS.2.OA.A.1'],
  'unknown-number':['CCSS.2.OA.A.1'],
  'addition-word-problem':['CCSS.2.OA.A.1'],
  'subtraction-word-problem':['CCSS.2.OA.A.1'],
  'two-step-word-problem':['CCSS.2.OA.A.1'],
  'subtraction-strategy':['CCSS.2.OA.B.2'],
  'place-value':['CCSS.2.NBT.A.1'],
  'compare-numbers':['CCSS.2.NBT.A.4'],
  'patterns':['CCSS.2.NBT.A.2'],
  'geometry':['CCSS.2.G.A.1'],
  'measurement':['CCSS.2.MD.A.1'],
  'time':['CCSS.2.MD.C.7'],
  'data-interpretation':['CCSS.2.MD.D.10'],
  'probability-language':['STAR.MATH.DATA.PROBABILITY'],
  'main-idea':['CCSS.RI.2.2'],
  'compare-contrast':['CCSS.RL.2.9'],
  'text-structure':['CCSS.RI.2.5'],
  'synonym-nuance':['CCSS.L.2.5'],
  'multi-sentence-inference':['CCSS.RL.2.1'],
  'money':['CCSS.2.MD.C.8'],
  'number-line':['CCSS.2.MD.B.6'],
  'fractions-shapes':['CCSS.2.G.A.3'],
  'fact-family':['CCSS.2.OA.B.2'],
  'equal-groups':['CCSS.2.OA.C.4'],
  'religion-application':['ABVM.RELIGION.CURRENT']
});

const DOK_BY_SKILL=Object.freeze({
  'sentence-types':2,
  'consonant-blends':2,
  'vowel-patterns':2,
  'cvc-structure':2,
  'plural-nouns':2,
  'vocabulary-in-context':2,
  'context-clues':2,
  'word-parts':2,
  'cause-effect':2,
  'sequence':2,
  'theme':3,
  'inference':3,
  'text-evidence':3,
  'visualize':2,
  'character-development':3,
  'author-purpose':3,
  'word-choice':2,
  'addition':1,
  'addition-within-100':1,
  'subtraction':1,
  'subtraction-within-100':1,
  'missing-number':2,
  'missing-addend':2,
  'unknown-number':2,
  'addition-word-problem':2,
  'subtraction-word-problem':2,
  'two-step-word-problem':3,
  'subtraction-strategy':2,
  'place-value':2,
  'compare-numbers':2,
  'patterns':2,
  'geometry':1,
  'measurement':2,
  'time':2,
  'data-interpretation':2,
  'probability-language':2,
  'main-idea':3,
  'compare-contrast':3,
  'text-structure':2,
  'synonym-nuance':2,
  'multi-sentence-inference':3,
  'money':2,
  'number-line':2,
  'fractions-shapes':2,
  'fact-family':2,
  'equal-groups':2,
  'religion-application':2
});

function standardsFor(subject,skill,domain){
  const mapped=STANDARD_BY_SKILL[skill];
  if(mapped) return [...mapped];
  if(subject==='Religion') return ['ABVM.RELIGION.CURRENT'];
  if(subject==='Math'){
    if(domain==='Algebra') return ['CCSS.2.OA.A.1'];
    if(domain==='Geometry and measurement') return ['CCSS.2.MD.A.1'];
    if(domain==='Data analysis, statistics, and probability') return ['CCSS.2.MD.D.10'];
    return ['CCSS.2.NBT.B.5'];
  }
  if(domain==='Word knowledge and skills') return ['CCSS.L.2.4'];
  if(domain==='Understanding author’s craft') return ['CCSS.RL.2.4'];
  if(domain==='Analyzing literary text') return ['CCSS.RL.2.2'];
  return ['CCSS.RL.2.1'];
}

function hintFor(skill){
  const hints={
    'sentence-types':'Ask what the sentence is doing: telling, asking, or directing.',
    'consonant-blends':'Say the beginning slowly and listen for both consonant sounds.',
    'vowel-patterns':'Say each word aloud and listen to the vowel sound.',
    'cvc-structure':'Look for one consonant, one vowel, then one consonant.',
    'plural-nouns':'Ask whether the noun needs -s or -es to mean more than one.',
    'vocabulary-in-context':'Use the rest of the sentence to test the word’s meaning.',
    'context-clues':'Look for a nearby clue that shows what the unknown word means.',
    'word-parts':'Separate the prefix or suffix from the base word.',
    'cause-effect':'Find what happened first that made the later event happen.',
    'sequence':'Use order words such as first, next, before, and last.',
    'theme':'Think about what the character learned from the whole story.',
    'inference':'Combine a text clue with what you already know.',
    'text-evidence':'Choose the detail that most directly proves the idea.',
    'visualize':'Match the important describing words to a mental picture.',
    'character-development':'Compare the character’s choice at the beginning and the end.',
    'author-purpose':'Ask whether the author is informing, persuading, teaching, or entertaining.',
    'word-choice':'Think about the picture or feeling created by that exact word.',
    'addition':'Combine the parts and check the ones place.',
    'addition-within-100':'Add tens and ones, then check whether regrouping is needed.',
    'subtraction':'Take away the second amount from the first.',
    'subtraction-within-100':'Subtract tens and ones carefully and check with addition.',
    'missing-number':'Use the inverse operation to find the missing part.',
    'missing-addend':'Subtract the known addend from the total.',
    'unknown-number':'Use the inverse operation to uncover the unknown.',
    'addition-word-problem':'Decide what quantities are being joined before calculating.',
    'subtraction-word-problem':'Decide what amount is being taken away or compared.',
    'two-step-word-problem':'Solve the first change, write the new amount, then do the second change.',
    'subtraction-strategy':'Use the related addition fact to check the subtraction.',
    'place-value':'Name the place first: hundreds, tens, or ones.',
    'compare-numbers':'Compare the greatest place value first.',
    'patterns':'Find the amount that changes from one term to the next.',
    'geometry':'Count the defining sides or corners, not the size or color.',
    'measurement':'Identify the starting amount, the change, and the unit.',
    'time':'Track how the minute hand moves before changing the hour.',
    'data-interpretation':'Read the labels and compare the values, not the picture size.',
    'probability-language':'More matching objects means a more likely result.',
    'main-idea':'Ask what most of the details are teaching you about.',
    'compare-contrast':'Name one way the two texts are alike and one way they differ.',
    'text-structure':'Look for clue words that show sequence, cause/effect, description, or comparison.',
    'synonym-nuance':'Try each word in the sentence and choose the one with the closest meaning and feeling.',
    'multi-sentence-inference':'Use clues from more than one sentence before deciding.',
    'money':'Name each coin value first, then combine the cents.',
    'number-line':'Count equal jumps and notice the direction of each jump.',
    'fractions-shapes':'Check that the whole is split into equal parts before naming the fraction.',
    'fact-family':'Use the same three numbers to build related addition and subtraction facts.',
    'equal-groups':'Count the number of groups and how many are in each equal group.',
    'religion-application':'Match the lesson idea to the choice that actually puts it into action.'
  };
  return hints[skill]||'Use the important information in the question and eliminate choices that do not fit.';
}

function scaffoldFor(skill){
  const scaffolds={
    'theme':'First identify the character’s problem and what changed by the end.',
    'inference':'Find one clue that is definitely true. What does that clue suggest?',
    'text-evidence':'Restate the claim, then point to the one detail that proves it most directly.',
    'character-development':'Name the beginning choice. Now name the ending choice.',
    'author-purpose':'What is the text mostly trying to make the reader know, do, or feel?',
    'two-step-word-problem':'Write the answer after step 1 before you touch step 2.',
    'addition-within-100':'Solve the ones first, then the tens.',
    'subtraction-within-100':'Break the second number into tens and ones.',
    'unknown-number':'Cover the unknown and ask which inverse operation undoes the equation.',
    'place-value':'Rewrite the number as hundreds + tens + ones.',
    'measurement':'Draw or imagine the length before and after the change.',
    'main-idea':'Group the details. Which idea do most of them support?',
    'compare-contrast':'Make two columns: same and different.',
    'text-structure':'Circle clue words such as because, first, unlike, or for example.',
    'multi-sentence-inference':'Underline one clue in each sentence and combine them.',
    'money':'Write each coin value in cents before adding.',
    'number-line':'Mark the starting point, then count each equal jump.',
    'fractions-shapes':'Count the equal pieces in the whole, then count the shaded pieces.',
    'fact-family':'Write the two addition facts first, then reverse them into subtraction.'
  };
  return scaffolds[skill]||hintFor(skill);
}

function misconceptionFor(skill,choice,answer){
  const numericChoice=Number(choice);
  const numericAnswer=Number(answer);
  if(Number.isFinite(numericChoice)&&Number.isFinite(numericAnswer)){
    if(Math.abs(numericChoice-numericAnswer)===1){
      return {tag:'off-by-one',feedback:'You are very close. Recheck the final counting or regrouping step.'};
    }
    if(skill.includes('subtraction')&&numericChoice>numericAnswer){
      return {tag:'addition-or-under-subtraction',feedback:'This answer is too large for this subtraction. Check whether you added instead of taking away.'};
    }
    if(skill.includes('addition')&&numericChoice<numericAnswer){
      return {tag:'missed-addend-or-place',feedback:'This answer is smaller than the total should be. Check whether every addend and place value was included.'};
    }
  }

  const bySkill={
    'context-clues':['opposite-or-unrelated-meaning','Use the sentence clue, not just a familiar-looking word.'],
    'word-parts':['affix-meaning-confusion','Check what the prefix or suffix changes about the base word.'],
    'cause-effect':['detail-cause-confusion','Choose the event that actually caused the result, not another detail.'],
    'sequence':['sequence-order-confusion','Use the order words to locate what happened immediately before or after.'],
    'theme':['surface-detail-not-theme','A theme is a lesson from the whole story, not one small detail.'],
    'inference':['unsupported-inference','The best inference must be supported by a specific clue in the text.'],
    'text-evidence':['weak-or-irrelevant-evidence','Pick the detail that proves the claim most directly.'],
    'character-development':['beginning-ending-confusion','Compare how the character acts at the beginning with the ending.'],
    'author-purpose':['purpose-confusion','Focus on what the author wants the reader to know, do, or feel.'],
    'word-choice':['literal-language-confusion','Think about the image or feeling the author creates, not only the literal meaning.'],
    'sentence-types':['sentence-purpose-confusion','Decide whether the sentence tells, asks, or gives a direction.'],
    'consonant-blends':['blend-sound-confusion','Say the beginning slowly and listen for both consonant sounds.'],
    'vowel-patterns':['vowel-sound-confusion','Listen to the vowel sound instead of choosing by spelling alone.'],
    'cvc-structure':['word-structure-confusion','Check the letter pattern one position at a time.'],
    'plural-nouns':['plural-ending-confusion','Check whether this word needs -s or -es.'],
    'vocabulary-in-context':['context-meaning-confusion','Test each meaning in the sentence and keep the one that makes sense.'],
    'missing-number':['inverse-operation-confusion','Use the inverse operation to find the missing number.'],
    'missing-addend':['inverse-operation-confusion','Subtract the known part from the total to find the missing part.'],
    'unknown-number':['inverse-operation-confusion','Undo the operation to isolate the unknown.'],
    'two-step-word-problem':['one-step-only','This problem changes twice. Solve both steps in order.'],
    'subtraction-strategy':['fact-family-confusion','Use the related addition fact to check the subtraction.'],
    'place-value':['place-value-position-confusion','The digit’s value depends on whether it is in the hundreds, tens, or ones place.'],
    'compare-numbers':['comparison-place-confusion','Compare the largest place value first.'],
    'patterns':['wrong-pattern-step','Find the repeated change between neighboring numbers.'],
    'geometry':['attribute-confusion','Count defining sides or vertices instead of using size or appearance.'],
    'measurement':['operation-or-unit-confusion','Track both the operation and the measurement unit.'],
    'time':['clock-hand-confusion','Use the minute hand first, then check the hour hand.'],
    'data-interpretation':['graph-reading-confusion','Read the category label and value before comparing.'],
    'probability-language':['relative-frequency-confusion','Compare how many of each outcome are possible.'],
    'main-idea':['detail-not-main-idea','A main idea must cover most of the details, not just one sentence.'],
    'compare-contrast':['one-text-only','Use evidence from both texts before deciding how they are alike or different.'],
    'text-structure':['structure-signal-confusion','Look for signal words that show how the ideas are organized.'],
    'synonym-nuance':['near-synonym-tone-confusion','Choose the word that matches both the meaning and the feeling of the sentence.'],
    'multi-sentence-inference':['single-clue-inference','Use clues from both sentences instead of relying on only one detail.'],
    'money':['coin-value-confusion','Name each coin value before combining the cents.'],
    'number-line':['jump-direction-confusion','Check the starting point, jump size, and direction on the number line.'],
    'fractions-shapes':['unequal-parts-confusion','Fractions name equal parts of one whole. Check that the pieces are equal.'],
    'fact-family':['fact-family-number-mismatch','A fact family uses the same three numbers in related equations.'],
    'equal-groups':['unequal-group-confusion','Every group must contain the same number of objects.'],
    'religion-application':['lesson-application-confusion','Choose the action that best demonstrates the lesson in real life.']
  };
  const [tag,feedback]=bySkill[skill]||['unsupported-choice','Recheck the evidence or calculation that supports your choice.'];
  return {tag,feedback};
}

function buildChoiceDiagnostics(base){
  return base.choices.filter(choice=>choice!==base.answer).map(choice=>{
    const diagnostic=misconceptionFor(base.skill,choice,base.answer);
    return {choice,misconception:diagnostic.tag,feedback:diagnostic.feedback};
  });
}
const PARTIAL_CREDIT_MISCONCEPTIONS=new Set([
  'off-by-one','one-step-only','weak-or-irrelevant-evidence','sequence-order-confusion',
  'place-value-position-confusion','comparison-place-confusion','wrong-pattern-step',
  'context-meaning-confusion','single-clue-inference','one-text-only','near-synonym-tone-confusion',
  'jump-direction-confusion','fact-family-number-mismatch'
]);

function rubricCriteriaFor(base){
  if(base.subject==='Reading / ELA'){
    return [
      'Uses important words or text evidence from the prompt.',
      'Applies the stated reading skill accurately.'
    ];
  }
  if(base.subject==='Math'){
    return [
      'Chooses the correct mathematical relationship or representation.',
      'Completes the calculation or reasoning accurately.'
    ];
  }
  return [
    'Identifies the lesson idea accurately.',
    'Applies the lesson to the situation in the prompt.'
  ];
}

function rubricFor(base,choiceDiagnostics){
  const partialCredit={};
  for(const row of choiceDiagnostics){
    partialCredit[row.choice]=PARTIAL_CREDIT_MISCONCEPTIONS.has(row.misconception)?1:0;
  }
  return {maxPoints:2,criteria:rubricCriteriaFor(base),partialCredit};
}

function makeQuestion(input){
  const base={...input};
  if(!base.id||!base.prompt||!base.answer) throw new Error('Question is missing required fields.');
  if(!Array.isArray(base.choices)||base.choices.length!==3||new Set(base.choices).size!==3) throw new Error('Question '+base.id+' must have exactly three unique choices.');
  if(!base.choices.includes(base.answer)) throw new Error('Question '+base.id+' answer is not in choices.');
  if(FORBIDDEN.some(pattern=>pattern.test(base.prompt))) throw new Error('Forbidden meta prompt in '+base.id+': '+base.prompt);
  if(!Number.isInteger(base.difficulty)||base.difficulty<2||base.difficulty>3) throw new Error('Question '+base.id+' has invalid difficulty.');

  const standards=Array.isArray(base.standards)&&base.standards.length
    ? [...new Set(base.standards.map(String))]
    : standardsFor(base.subject,base.skill,base.domain);
  const dok=Number.isInteger(base.dok) ? base.dok : (DOK_BY_SKILL[base.skill]||2);
  if(dok<1||dok>3) throw new Error('Question '+base.id+' has invalid DOK.');
  const hint=String(base.hint||hintFor(base.skill));
  const scaffold=String(base.scaffold||scaffoldFor(base.skill));
  const choiceDiagnostics=Array.isArray(base.choiceDiagnostics)&&base.choiceDiagnostics.length
    ? base.choiceDiagnostics
    : buildChoiceDiagnostics(base);
  const wrongChoices=base.choices.filter(choice=>choice!==base.answer);
  if(choiceDiagnostics.length!==wrongChoices.length) throw new Error('Question '+base.id+' must diagnose every distractor.');
  for(const choice of wrongChoices){
    const row=choiceDiagnostics.find(item=>item?.choice===choice);
    if(!row||!row.misconception||!row.feedback) throw new Error('Question '+base.id+' is missing misconception feedback for '+choice);
  }

  const rubric=base.rubric||rubricFor(base,choiceDiagnostics);
  const alignmentEvidence={
    ruleVersion:'grade2-alignment-v1',
    expectedDomain:base.domain,
    expectedStandards:standards,
    sourceGrounded:base.tier==='material'
  };
  const enriched={
    ...base,
    standards,
    dok,
    cognitiveDemand:dok===1?'recall-and-fluency':dok===2?'skill-and-concept-application':'strategic-reasoning',
    hint,
    scaffold,
    choiceDiagnostics,
    rubric,
    alignmentEvidence,
    responseType:base.responseType||'multiple-choice'
  };
  const keys=[
    'id','stationId','subject','skill','prompt','choices','answer','explanation',
    'provenance','sourceFact','tier','domain','difficulty','standards','dok',
    'cognitiveDemand','hint','scaffold','choiceDiagnostics','rubric','alignmentEvidence',
    'responseType','richContent','experiment'
  ];
  const material={};
  for(const key of keys) if(enriched[key]!==undefined) material[key]=enriched[key];
  return {...enriched,contentHash:sha(material)};
}
function subject(regex){
  return pack.subjects.find(item=>regex.test(String(item.subject||'')))||{subject:'',topics:[],studyNotes:[]};
}
function strings(value){ return Array.isArray(value)?value.map(String):[]; }
const reading=subject(/Reading \/ ELA/i);
const spelling=subject(/Spelling/i);
const math=subject(/^Math$/i);
const religion=subject(/^Religion$/i);
const readingTopics=strings(reading.topics);
const readingNotes=strings(reading.studyNotes);
const spellingTopics=strings(spelling.topics);
const mathTopics=strings(math.topics);
const mathNotes=strings(math.studyNotes);
const religionTopics=strings(religion.topics);
const religionNotes=strings(religion.studyNotes);
const readingAll=[...readingTopics,...readingNotes,...spellingTopics].join(' | ');
const mathAll=[...mathTopics,...mathNotes].join(' | ');
const religionAll=[...religionTopics,...religionNotes].join(' | ');
const findLine=(values,re)=>values.find(value=>re.test(value))||'';
const grammarFact=findLine(readingTopics,/grammar|sentence/i);
const phonicsFact=findLine(readingTopics,/phonics/i)||findLine(spellingTopics,/blend|vowel|phonics/i);
const structureFact=findLine(readingTopics,/word structure|cvc|plural|prefix|suffix/i);
const comprehensionFact=findLine(readingNotes,/reading comprehension/i)||findLine(readingTopics,/comprehension/i)||'Reading comprehension';
const mathFact=mathTopics[0]||mathNotes[0]||'Grade 2 mathematics';
const religionFacts=[...religionNotes,...religionTopics].filter(Boolean);

const glossary={
  action:'something that is done',
  afraid:'feeling scared or worried',
  depend:'to rely on someone or something',
  nervously:'in a worried or uneasy way',
  peered:'looked closely or carefully',
  perfectly:'in exactly the right way',
  rescue:'to save someone from danger',
  secret:'something kept hidden or private',
  language:'words and signs people use to communicate',
  culture:'traditions, foods, music, stories, and ways of life shared by a group',
  aside:'to one side or away from the main position',
  invited:'asked to come or join',
  share:'to let someone else use or enjoy part of something',
  fair:'reasonable and just',
  plead:'to ask very strongly',
  scurries:'moves quickly with short steps'
};
const currentVocabulary=(pack.vocabulary||[]).map(item=>String(item.term||'').toLowerCase()).filter(term=>glossary[term]);

function readingMaterial(){
  const out=[];
  const station=STATIONS[0];
  const add=(id,skill,prompt,choices,answer,explanation,sourceFact,domain,difficulty=3)=>out.push(makeQuestion({
    id:snapshotId+'-mat-read-'+id,stationId:station,subject:'Reading / ELA',skill,prompt,choices,answer,explanation,
    provenance:'curriculum-practice-derived-from-verified-abvm-pack',sourceFact,tier:'material',domain,difficulty
  }));

  if(/sentence|grammar/i.test(grammarFact)){
    add('sentence-command','sentence-types','Which sentence gives a direction without asking a question?',
      ['Put the library book on the shelf.','Where is the library book?','The library book is on the shelf.'],
      'Put the library book on the shelf.','A command tells someone what to do.',grammarFact,'Language: sentence types');
    add('sentence-question','sentence-types','A student needs to find out when recess starts. Which sentence does that job?',
      ['When does recess start?','Recess starts after lunch.','Line up for recess.'],
      'When does recess start?','A question asks for information.',grammarFact,'Language: sentence types');
    add('sentence-purpose','sentence-types','Which pair has a statement first and a command second?',
      ['The paint is wet. — Do not touch it.','Is the paint wet? — The paint is wet.','Do not touch it. — Is the paint wet?'],
      'The paint is wet. — Do not touch it.','The first tells information; the second gives a direction.',grammarFact,'Language: sentence types');
  }
  if(/blend/i.test(phonicsFact)){
    add('blend-transfer','consonant-blends','Which word starts with the same beginning blend as “flag”?',
      ['flip','frog','lamp'],'flip','Flag and flip both begin with fl.',phonicsFact,'Word knowledge and skills');
    add('blend-middle','consonant-blends','Which word begins with two consonants whose sounds can both be heard?',
      ['step','ship','cake'],'step','In st, both consonant sounds are heard.',phonicsFact,'Word knowledge and skills');
    add('blend-change','consonant-blends','Change the first sound in “clap” from /c/ to /f/. Which word do you make?',
      ['flap','cap','clip'],'flap','Changing cl to fl makes flap.',phonicsFact,'Word knowledge and skills');
  }
  if(/short a.*long a|long a.*short a/i.test(readingAll)){
    add('vowel-a-1','vowel-patterns','Which word has the long-a sound?',
      ['cake','cap','cat'],'cake','The silent e helps make the a say its name in cake.',phonicsFact||spellingTopics.join(' | '),'Word knowledge and skills');
    add('vowel-a-2','vowel-patterns','Which pair changes from short a to long a when e is added?',
      ['cap — cape','cat — cats','map — maps'],'cap — cape','Cap has short a; cape has long a.',phonicsFact||spellingTopics.join(' | '),'Word knowledge and skills');
  }
  if(/cvc/i.test(structureFact)){
    add('cvc-reason','cvc-structure','Which word is CVC and has the short-o sound?',
      ['hop','hope','shop'],'hop','Hop is consonant-vowel-consonant and uses short o.',structureFact,'Word knowledge and skills');
    add('cvc-build','cvc-structure','Choose the letters that make a CVC word meaning “a small animal kept at home.”',
      ['p-e-t','p-ee-t','pl-e-t'],'p-e-t','Pet follows consonant-vowel-consonant.',structureFact,'Word knowledge and skills');
  }
  if(/plural|-s|-es/i.test(structureFact)){
    add('plural-es','plural-nouns','Which word needs -es to name more than one?',
      ['box','cat','tree'],'box','Box becomes boxes.',structureFact,'Word knowledge and skills');
    add('plural-s','plural-nouns','Which sentence uses a plural noun correctly?',
      ['Three dogs ran outside.','Three dog ran outside.','Three doges ran outside.'],'Three dogs ran outside.','Dogs is the correct plural form.',structureFact,'Word knowledge and skills');
  }

  const compSource=comprehensionFact;
  add('comprehension-infer','inference',
    'Nora zipped her coat, pulled on mittens, and saw her breath make a little cloud. What can you infer about the weather?',
    ['It is cold outside.','It is very hot outside.','It is raining hard.'],'It is cold outside.',
    'The coat, mittens, and visible breath are evidence that it is cold.',compSource,'Comprehension strategies and constructing meaning');
  add('comprehension-theme','theme',
    'Jay dropped his model bridge twice. Each time he fixed one weak part and tried again. On the third try it held. Which lesson fits the story best?',
    ['Keep trying and learn from mistakes.','The first try is always best.','It is better not to build things.'],'Keep trying and learn from mistakes.',
    'Jay improves the bridge by learning from each failed attempt.',compSource,'Analyzing literary text');
  add('comprehension-evidence','text-evidence',
    'Lena thinks the puppy is excited. Which detail is the strongest evidence? “The puppy raced in circles, wagged its tail, and bounced toward Lena.”',
    ['It wagged its tail and bounced toward Lena.','The puppy is an animal.','Lena was standing nearby.'],'It wagged its tail and bounced toward Lena.',
    'Those actions directly show excitement.',compSource,'Comprehension strategies and constructing meaning');
  add('comprehension-visualize','visualize',
    'Read: “Golden leaves spun through the cool air and covered the sidewalk.” Which picture best matches the sentence?',
    ['Leaves swirling down onto a sidewalk.','Snow piled beside a frozen pond.','Flowers opening on a sunny lawn.'],'Leaves swirling down onto a sidewalk.',
    'The words golden leaves, spun, and sidewalk support that mental picture.',compSource,'Comprehension strategies and constructing meaning');

  for(const term of currentVocabulary){
    if(out.length>=12) break;
    const meaning=glossary[term];
    add('vocab-'+term,'vocabulary-in-context',
      'Which sentence uses “'+term+'” in a way that best matches “'+meaning+'”?',
      [
        term==='rescue'?'The firefighter worked to rescue the kitten.':'The sentence uses '+term+' to match the clue: '+meaning+'.',
        'The word means the opposite of the clue.',
        'The word is being used only as a person’s name.'
      ],
      term==='rescue'?'The firefighter worked to rescue the kitten.':'The sentence uses '+term+' to match the clue: '+meaning+'.',
      'The correct choice uses the word with the meaning taught in the current vocabulary set.',
      'Vocabulary: '+term, 'Word knowledge and skills',2);
  }
  return out.slice(0,12);
}

function mathMaterial(){
  const out=[];
  const station=STATIONS[1];
  const add=(id,skill,prompt,choices,answer,explanation,domain='Numbers and operations',difficulty=3)=>out.push(makeQuestion({
    id:snapshotId+'-mat-math-'+id,stationId:station,subject:'Math',skill,prompt,choices,answer,explanation,
    provenance:'curriculum-practice-derived-from-verified-abvm-pack',sourceFact:mathFact,tier:'material',domain,difficulty
  }));
  const limitMatch=mathAll.match(/(?:to|within)\s*(\d+)/i);
  const limit=Math.max(10,Math.min(100,Number(limitMatch?.[1]||20)));
  if(/subtraction/i.test(mathAll)){
    for(let i=0;i<12;i++){
      const a=Math.max(5,int(Math.ceil(limit/2),limit));
      const b=int(1,a-1);
      const answer=a-b;
      const mode=i%4;
      if(mode===0) add('sub-'+i,'subtraction','What is '+a+' − '+b+'?', [String(answer),String(answer+1),String(Math.max(0,answer-1))],String(answer),'Subtract '+b+' from '+a+'.');
      if(mode===1) add('missing-'+i,'missing-number','Which number makes the equation true? '+a+' − □ = '+answer,[String(b),String(Math.max(0,b-1)),String(b+1)],String(b),'The missing part is '+b+'.');
      if(mode===2){
        const start=a;
        const left=answer;
        add('story-'+i,'subtraction-word-problem',
          'A jar had '+start+' counters. '+b+' were used. How many counters are left?',
          [String(left),String(left+1),String(Math.max(0,left-2))],String(left),'Subtract the counters used from the starting amount.');
      }
      if(mode===3) add('compare-'+i,'subtraction-strategy',
        'Which equation can be used to check '+a+' − '+b+' = '+answer+'?',
        [answer+' + '+b+' = '+a,b+' + '+a+' = '+answer,a+' + '+answer+' = '+b],
        answer+' + '+b+' = '+a,'Addition can check a subtraction fact.');
    }
  }else if(/addition/i.test(mathAll)){
    for(let i=0;i<12;i++){
      const a=int(2,Math.max(3,Math.floor(limit/2)));
      const b=int(2,Math.max(3,limit-a));
      const sum=a+b;
      const mode=i%3;
      if(mode===0) add('add-'+i,'addition','What is '+a+' + '+b+'?',[String(sum),String(sum-1),String(sum+1)],String(sum),'Combine the two parts.');
      if(mode===1) add('missing-'+i,'missing-addend','Which number makes '+a+' + □ = '+sum+' true?',[String(b),String(Math.max(0,b-1)),String(b+1)],String(b),'Find the missing addend.');
      if(mode===2) add('story-'+i,'addition-word-problem','There are '+a+' red blocks and '+b+' blue blocks. How many blocks are there altogether?',[String(sum),String(sum-2),String(sum+2)],String(sum),'Altogether means add.');
    }
  }else if(/place value/i.test(mathAll)){
    for(let i=0;i<12;i++){
      const tens=int(1,9),ones=int(0,9),value=tens*10+ones;
      add('pv-'+i,'place-value','In '+value+', what value does the digit '+tens+' have?',[String(tens*10),String(tens),String(ones)],String(tens*10),'The digit is in the tens place.');
    }
  }else if(/time|clock/i.test(mathAll)){
    for(let i=0;i<12;i++){
      const hour=int(1,11),minutes=pick([0,15,30,45]);
      const later=minutes===45?((hour%12)+1)+':00':hour+':'+String(minutes+15).padStart(2,'0');
      const shown=hour+':'+String(minutes).padStart(2,'0');
      add('time-'+i,'time','What time is 15 minutes after '+shown+'?',[later,hour+':'+String(minutes).padStart(2,'0'),((hour%12)+1)+':30'],later,'Move the clock forward 15 minutes.','Geometry and measurement');
    }
  }else{
    return out;
  }
  return out.slice(0,12);
}

function religionMaterial(){
  const out=[];
  const station=STATIONS[2];
  const notes=religionFacts.slice(0,12);
  const distractorPool=religionFacts.length>=3?religionFacts:[
    'We should care for creation.','The Trinity is Father, Son, and Holy Spirit.','Jesus teaches us how to live.'
  ];
  for(let i=0;i<notes.length;i++){
    const note=notes[i];
    let prompt='Which statement best matches this lesson idea?';
    let answer=note;
    let explanation='The correct choice matches the verified Religion lesson material.';
    if(/creation/i.test(note)&&/care|responsib/i.test(note)){
      prompt='Which choice best applies the lesson about caring for creation?';
      answer='Pick up litter and protect living things.';
      explanation='Caring for the world is an application of the lesson about creation.';
    }else if(/trinity/i.test(note)){
      prompt='Which description correctly explains the Trinity?';
      answer='One God in three Persons: Father, Son, and Holy Spirit.';
      explanation='That is the lesson’s description of the Trinity.';
    }else if(/disciples|friends of Jesus/i.test(note)){
      prompt='Which action best shows what it means to live as a disciple and friend of Jesus?';
      answer='Choose a loving action even when it is not the easiest choice.';
      explanation='A disciple tries to follow Jesus in how they live.';
    }else if(/grace/i.test(note)){
      prompt='The lesson calls grace “new life.” Which answer names who gives this new life?';
      answer='Jesus';
      explanation='The current lesson teaches that Jesus gives us the new life of grace.';
    }else if(/image and likeness|image.*likeness/i.test(note)){
      prompt='Which ability best connects with being made in God’s image and likeness in this lesson?';
      answer='Being able to think, choose, and love.';
      explanation='Those abilities are named in the current lesson.';
    }
    let choices;
    if(answer===note){
      const alternatives=distractorPool.filter(item=>item!==note);
      choices=shuffled([answer,alternatives[0]||'A different lesson idea.',alternatives[1]||'An unrelated classroom rule.']);
    }else if(/Trinity/.test(prompt)){
      choices=shuffled([answer,'Three separate gods with no connection.','One Person with three different names only.']);
    }else if(answer==='Jesus'){
      choices=shuffled(['Jesus','A school rule','A prize someone earns']);
    }else if(/think, choose, and love/.test(answer)){
      choices=shuffled([answer,'Being able to run faster than everyone.','Never needing help from anyone.']);
    }else{
      choices=shuffled([answer,'Ignore people who need help.','Choose what is easiest even if it hurts someone.']);
    }
    out.push(makeQuestion({
      id:snapshotId+'-mat-religion-'+i,stationId:station,subject:'Religion',skill:'religion-application',
      prompt,choices,answer,explanation,provenance:'curriculum-practice-derived-from-verified-abvm-pack',
      sourceFact:note,tier:'material',domain:'Religion: current lesson application',difficulty:3
    }));
  }
  return out.slice(0,12);
}

const READ_DOMAINS=[
  'Word knowledge and skills',
  'Comprehension strategies and constructing meaning',
  'Analyzing literary text',
  'Understanding author’s craft'
];
const MATH_DOMAINS=['Numbers and operations','Algebra','Geometry and measurement','Data analysis, statistics, and probability'];
const names=['Mia','Leo','Ava','Noah','Zoe','Eli','Nora','Sam','Lena','Jay'];
const contextRows=[
  ['enormous','very large',['very small','very large','very quiet']],
  ['glanced','looked quickly',['stared for hours','looked quickly','closed a door']],
  ['drowsy','sleepy',['sleepy','excited','angry']],
  ['fragile','easy to break',['easy to break','very loud','full of water']],
  ['rapid','fast',['slow','fast','careful']],
  ['assist','help',['help','hide','measure']]
];
const themeRows=[
  ['A child practices tying shoes every morning. After many tries, the knot finally stays tied.','Practice can help you improve.','Shoes are easiest to tie in the morning.','It is better to ask someone else to do hard things.'],
  ['Two friends want the same swing, so they agree to take turns.','Sharing fairly can solve a problem.','The swing is the best thing on the playground.','Friends should always want exactly the same thing.'],
  ['A student notices a new classmate alone and invites them to join a game.','Kindness can help someone feel included.','Games are only fun with new students.','A person should wait until someone asks for help.'],
  ['A gardener forgets to water a plant, notices it drooping, and begins checking it each day.','Taking responsibility can fix a mistake.','Plants should be checked only after they droop.','One mistake means the plant cannot recover.'],
  ['A runner loses one race, changes how she practices, and improves the next week.','A setback can teach you what to change.','Winning every race is the only sign of improvement.','Changing a plan means the first plan was useless.']
];
const purposeRows=[
  ['A page explains how bees carry pollen from flower to flower.','to inform'],
  ['A poster says, “Bring a reusable bottle and help reduce trash!”','to persuade'],
  ['A story tells about a dragon who cannot stop sneezing sparks.','to entertain'],
  ['Directions explain how to build a paper airplane.','to teach how to do something'],
  ['A sign says, “Please keep the trail clean for everyone.”','to persuade']
];

function starReading(){
  const out=[];
  for(let i=0;i<60;i++){
    const family=i%15;
    const n=pick(names);
    let prompt,choices,answer,explanation,domain,skill,difficulty;
    if(family===0){
      const row=contextRows[(i+snapshotSeed[1])%contextRows.length];
      prompt='In the sentence “The '+row[0]+' box barely fit through the doorway,” what does “'+row[0]+'” most likely mean?';
      choices=shuffled(row[2]); answer=row[1]; explanation='The context clue about barely fitting supports the meaning “'+answer+'”.'; domain=READ_DOMAINS[0]; skill='context-clues'; difficulty=2;
    }else if(family===1){
      const words=[
        ['unhappy','not happy','very happy','happy again'],
        ['rewrite','write again','write before','stop writing'],
        ['careless','without enough care','full of care','able to care'],
        ['preview','look at before','look at again','look away from'],
        ['helpful','giving help','needing help','without help']
      ];
      const row=words[(i+snapshotSeed[2])%words.length];
      prompt='What does the word “'+row[0]+'” mean?'; choices=shuffled([row[1],row[2],row[3]]); answer=row[1]; explanation='The prefix or suffix changes the base word to make this meaning.'; domain=READ_DOMAINS[0]; skill='word-parts'; difficulty=2;
    }else if(family===2){
      prompt=n+' read: “The trail was muddy, so we stepped carefully around the puddles.” Why did they step carefully?';
      choices=shuffled(['The trail was muddy.','They were racing.','The puddles were frozen solid.']); answer='The trail was muddy.'; explanation='The first part gives the cause for the careful steps.'; domain=READ_DOMAINS[1]; skill='cause-effect'; difficulty=2;
    }else if(family===3){
      prompt='Read: “First '+n+' mixed the batter. Next, the batter went into the pan. Last, the pan went into the oven.” What happened immediately before the pan went into the oven?';
      choices=shuffled(['The batter went into the pan.','The oven was turned off.','The cake was eaten.']); answer='The batter went into the pan.'; explanation='The sequence word “next” marks the step just before the last event.'; domain=READ_DOMAINS[1]; skill='sequence'; difficulty=2;
    }else if(family===4){
      const row=themeRows[(i+snapshotSeed[3])%themeRows.length];
      prompt='Read: “'+row[0]+'” Which lesson best fits the story?'; choices=shuffled([row[1],row[2],row[3]]); answer=row[1]; explanation='The character’s actions and outcome support that lesson.'; domain=READ_DOMAINS[2]; skill='theme'; difficulty=3;
    }else if(family===5){
      prompt='Read: “'+n+' tucked the permission slip into the front pocket of the backpack, then checked the pocket twice before leaving.” What can you infer?';
      choices=shuffled([n+' thinks the slip is important.',n+' is mainly worried the backpack looks messy.',n+' plans to give the slip to a friend.']); answer=n+' thinks the slip is important.'; explanation='Checking the pocket twice shows the slip matters to the character.'; domain=READ_DOMAINS[1]; skill='inference'; difficulty=3;
    }else if(family===6){
      prompt='Read: “The kitten crouched low, wiggled its back legs, stared at the toy mouse, and sprang forward.” Which detail is the strongest evidence that the kitten was getting ready to pounce?';
      choices=shuffled(['It crouched low and wiggled its back legs.','It stared at the toy mouse.','The toy mouse was in front of it.']); answer='It crouched low and wiggled its back legs.'; explanation='Several details relate to the toy, but crouching and wiggling the back legs most directly show preparation to pounce.'; domain=READ_DOMAINS[1]; skill='text-evidence'; difficulty=3;
    }else if(family===7){
      prompt='At the start of a story, '+n+' refuses to ask for help. After making the same mistake twice, '+n+' asks a classmate to explain the directions and succeeds. How did the character change?';
      choices=shuffled(['The character became more willing to ask for help.','The character stopped caring about the task.','The character decided directions are never useful.']); answer='The character became more willing to ask for help.'; explanation='The ending shows a change in the character’s choice.'; domain=READ_DOMAINS[2]; skill='character-development'; difficulty=3;
    }else if(family===8){
      const row=purposeRows[(i+snapshotSeed[4])%purposeRows.length];
      const purposeChoices=['to inform','to persuade','to entertain','to teach how to do something'];
      const distractors=purposeChoices.filter(value=>value!==row[1]);
      prompt='What is the author’s main purpose in this text? “'+row[0]+'”'; choices=shuffled([row[1],distractors[0],distractors[1]]); answer=row[1]; explanation='The kind of information and wording reveal the author’s purpose.'; domain=READ_DOMAINS[3]; skill='author-purpose'; difficulty=3;
    }else if(family===9){
      prompt='Read: “The wind whispered through the tall grass.” Why might the author use the word “whispered”?';
      choices=shuffled(['To help the reader imagine a soft sound.','To prove the wind can speak like a person.','To tell the exact temperature.']); answer='To help the reader imagine a soft sound.'; explanation='The word choice creates a quiet sound image for the reader.'; domain=READ_DOMAINS[3]; skill='word-choice'; difficulty=2;
    }else if(family===10){
      prompt='Read: “Beavers build dams in streams. The dams slow the water and create ponds. The ponds give beavers safer places to build homes.” What is the main idea?';
      choices=shuffled(['Beaver dams change streams in ways that help beavers live safely.','Beavers are the only animals that live near ponds.','Streams always become ponds during the winter.']);
      answer='Beaver dams change streams in ways that help beavers live safely.';
      explanation='All three details explain how dams change the water and help beavers.';
      domain=READ_DOMAINS[1]; skill='main-idea'; difficulty=3;
    }else if(family===11){
      prompt='Text 1 says a turtle hides in its shell when danger is near. Text 2 says a rabbit runs quickly to its burrow. What is one difference?';
      choices=shuffled(['The turtle protects itself by hiding in a shell, while the rabbit escapes by running.','Both animals use the same body part to stay safe.','Neither animal changes what it does when danger appears.']);
      answer='The turtle protects itself by hiding in a shell, while the rabbit escapes by running.';
      explanation='The two texts describe different ways the animals respond to danger.';
      domain=READ_DOMAINS[2]; skill='compare-contrast'; difficulty=3;
    }else if(family===12){
      prompt='Read: “First the seed coat splits. Next a root grows downward. Then a stem pushes upward toward the light.” How is this information organized?';
      choices=shuffled(['In the order the events happen.','By explaining two things that are different.','By listing a problem and several opinions.']);
      answer='In the order the events happen.';
      explanation='First, next, and then signal a sequence structure.';
      domain=READ_DOMAINS[3]; skill='text-structure'; difficulty=2;
    }else if(family===13){
      prompt='Which word best replaces “tiny” in the sentence “A tiny ant carried the crumb” without changing the meaning?';
      choices=shuffled(['small','weak','quiet']); answer='small';
      explanation='Small is the closest synonym for tiny in this sentence.';
      domain=READ_DOMAINS[0]; skill='synonym-nuance'; difficulty=2;
    }else{
      prompt='Read both sentences: “The sidewalk was shiny with puddles. '+n+' stepped around the water and closed the umbrella before entering the store.” What can you infer?';
      choices=shuffled(['The rain has probably stopped.','The store has no roof.','The sidewalk is covered with snow.']);
      answer='The rain has probably stopped.';
      explanation='The puddles show recent rain, and closing the umbrella suggests it is no longer raining.';
      domain=READ_DOMAINS[1]; skill='multi-sentence-inference'; difficulty=3;
    }
    out.push(makeQuestion({
      id:snapshotId+'-star-read-'+String(i+1).padStart(2,'0'),stationId:'',subject:'Reading / ELA',skill,prompt,choices,answer,explanation,
      provenance:'original-star-aligned-practice-regenerated-with-curriculum-snapshot',
      sourceFact:'STAR Reading public domain alignment; curriculum snapshot '+rawSourceHash,tier:'star-fallback',domain,difficulty
    }));
  }
  return out;
}

function starMath(){
  const out=[];
  for(let i=0;i<60;i++){
    const family=i%15;
    let prompt,choices,answer,explanation,domain,skill,difficulty,richContent,experiment;
    if(family===0){
      const start=int(18,45),added=int(8,25),removed=int(3,Math.min(15,start+added-1));
      const afterFirst=start+added;
      const final=afterFirst-removed;
      prompt='A class had '+start+' markers. The teacher added '+added+' more, then '+removed+' markers were used. How many markers are left?';
      choices=shuffled([String(final),String(afterFirst),String(Math.max(0,start-removed))]);
      answer=String(final);
      explanation='First add '+start+' + '+added+' = '+afterFirst+'. Then subtract '+removed+' to get '+final+'.';
      domain=MATH_DOMAINS[0]; skill='two-step-word-problem'; difficulty=3;
    }else if(family===1){
      const a=int(45,99),b=int(10,Math.min(40,a-1)),diff=a-b;
      prompt='What is '+a+' − '+b+'?'; choices=shuffled([String(diff),String(diff+10),String(Math.max(0,diff-1))]); answer=String(diff); explanation='Subtract tens and ones.'; domain=MATH_DOMAINS[0]; skill='subtraction-within-100'; difficulty=3;
    }else if(family===2){
      const hundreds=int(1,8),tens=int(1,9),ones=int(0,9),value=hundreds*100+tens*10+ones;
      prompt='In '+value+', what is the value of the digit '+tens+'?'; choices=shuffled([String(tens*10),String(tens),String(tens*100)]); answer=String(tens*10); explanation='The digit is in the tens place.'; domain=MATH_DOMAINS[0]; skill='place-value'; difficulty=2;
      richContent={kind:'place-value',hundreds,tens,ones};
    }else if(family===3){
      const a=int(100,899),b=a+int(2,50);
      prompt='Which comparison is true?'; choices=shuffled([a+' < '+b,a+' > '+b,a+' = '+b]); answer=a+' < '+b; explanation='The number on the left is smaller.'; domain=MATH_DOMAINS[0]; skill='compare-numbers'; difficulty=2;
    }else if(family===4){
      const a=int(4,15),x=int(3,12),sum=a+x;
      prompt='Which number makes the equation true? '+a+' + □ = '+sum; choices=shuffled([String(x),String(x+1),String(Math.max(0,x-2))]); answer=String(x); explanation='Find the missing addend.'; domain=MATH_DOMAINS[1]; skill='unknown-number'; difficulty=3;
    }else if(family===5){
      const start=int(2,8),step=pick([2,5,10]);
      prompt='What number comes next? '+[0,1,2,3].map(k=>start+k*step).join(', ')+', __'; const next=start+4*step;
      choices=shuffled([String(next),String(next+step),String(next-1)]); answer=String(next); explanation='The same amount is added each time.'; domain=MATH_DOMAINS[1]; skill='patterns'; difficulty=2;
      richContent={kind:'number-line',start,end:next,step,highlight:next};
    }else if(family===6){
      const shape=pick([['hexagon',6],['pentagon',5],['rectangle',4],['triangle',3]]);
      prompt='How many sides does a '+shape[0]+' have?'; choices=shuffled([String(shape[1]),String(shape[1]+1),String(Math.max(2,shape[1]-1))]); answer=String(shape[1]); explanation='Count the straight sides of the shape.'; domain=MATH_DOMAINS[2]; skill='geometry'; difficulty=2;
    }else if(family===7){
      const len=int(12,30),used=int(2,Math.min(9,len-1)),left=len-used;
      prompt='A ribbon is '+len+' centimeters long. '+used+' centimeters are cut off. How many centimeters remain?'; choices=shuffled([String(left),String(len+used),String(left+1)]); answer=String(left); explanation='Subtract the part cut off from the original length.'; domain=MATH_DOMAINS[2]; skill='measurement'; difficulty=3;
    }else if(family===8){
      const cats=int(2,8),dogs=int(2,8),fish=int(2,8);
      const max=Math.max(cats,dogs,fish);
      const label=max===cats?'cats':max===dogs?'dogs':'fish';
      prompt='A class graph has cats: '+cats+', dogs: '+dogs+', fish: '+fish+'. Which pet got the most votes?'; choices=shuffled(['cats','dogs','fish']); answer=label; explanation='Compare the three totals and choose the greatest.'; domain=MATH_DOMAINS[3]; skill='data-interpretation'; difficulty=2;
      richContent={kind:'bar-chart',bars:[{label:'Cats',value:cats},{label:'Dogs',value:dogs},{label:'Fish',value:fish}]};
      experiment={id:'rich-data-v1',type:'rich-format',control:'A',treatment:'B',treatmentPercent:10};
    }else if(family===9){
      prompt='A bag has 5 blue tiles and 1 yellow tile. Without looking, which color is more likely to be picked?'; choices=shuffled(['blue','yellow','They are equally likely.']); answer='blue'; explanation='There are more blue tiles, so blue is more likely.'; domain=MATH_DOMAINS[3]; skill='probability-language'; difficulty=2;
    }else if(family===10){
      const hour=int(1,11),minute=pick([0,30]);
      const shown=hour+':'+String(minute).padStart(2,'0');
      prompt='What time is shown on the clock?'; choices=shuffled([shown,((hour%12)+1)+':'+String(minute).padStart(2,'0'),hour+':'+String(minute===0?30:0).padStart(2,'0')]); answer=shown;
      explanation='The minute hand shows '+(minute===0?'the hour exactly':'30 minutes past')+' and the hour hand shows '+hour+'.';
      domain=MATH_DOMAINS[2]; skill='time'; difficulty=2; richContent={kind:'clock-face',hour,minute};
    }else if(family===11){
      const quarters=int(0,3),dimes=int(1,4),nickels=int(0,2);
      const cents=quarters*25+dimes*10+nickels*5;
      prompt='A jar has '+quarters+' quarter'+(quarters===1?'':'s')+', '+dimes+' dime'+(dimes===1?'':'s')+', and '+nickels+' nickel'+(nickels===1?'':'s')+'. How many cents is that?';
      choices=shuffled([String(cents),String(Math.max(0,cents-10)),String(cents+5)]); answer=String(cents);
      explanation='Add the coin values: quarters are 25¢, dimes are 10¢, and nickels are 5¢.';
      domain=MATH_DOMAINS[2]; skill='money'; difficulty=2;
    }else if(family===12){
      const start=int(0,10),step=pick([2,5,10]),jumps=int(2,4),end=start+step*jumps;
      prompt='Start at '+start+' on a number line and make '+jumps+' jumps of '+step+' to the right. Where do you land?';
      choices=shuffled([String(end),String(end-step),String(start+jumps)]); answer=String(end);
      explanation='Move right '+step+' each time for '+jumps+' equal jumps.';
      domain=MATH_DOMAINS[2]; skill='number-line'; difficulty=2; richContent={kind:'number-line',start,end,step,highlight:end};
    }else if(family===13){
      const denominator=pick([2,3,4]),shaded=int(1,denominator-1);
      prompt='A shape is split into '+denominator+' equal parts and '+shaded+' part'+(shaded===1?' is':'s are')+' shaded. Which fraction is shaded?';
      answer=shaded+'/'+denominator;
      let distractors=[Math.min(denominator,shaded+1)+'/'+denominator,shaded+'/'+Math.max(2,denominator-1)].filter(value=>value!==answer);
      while(distractors.length<2) distractors.push((shaded+1)+'/'+(denominator+1));
      choices=shuffled([answer,distractors[0],distractors[1]]);
      explanation='The numerator counts shaded parts and the denominator counts all equal parts.';
      domain=MATH_DOMAINS[2]; skill='fractions-shapes'; difficulty=2; richContent={kind:'shape-fraction',parts:denominator,shaded};
    }else{
      const a=int(3,12),b=int(2,9),sum=a+b;
      prompt='Which equation belongs to the same fact family as '+a+' + '+b+' = '+sum+'?';
      choices=shuffled([sum+' − '+a+' = '+b,sum+' + '+a+' = '+b,a+' − '+b+' = '+sum]);
      answer=sum+' − '+a+' = '+b;
      explanation='A fact family uses the same three numbers in related addition and subtraction equations.';
      domain=MATH_DOMAINS[0]; skill='fact-family'; difficulty=2;
    }
    out.push(makeQuestion({
      id:snapshotId+'-star-math-'+String(i+1).padStart(2,'0'),stationId:'',subject:'Math',skill,prompt,choices,answer,explanation,
      provenance:'original-star-aligned-practice-regenerated-with-curriculum-snapshot',
      sourceFact:'STAR Math public domain alignment; curriculum snapshot '+rawSourceHash,tier:'star-fallback',domain,difficulty,
      richContent,experiment
    }));
  }
  return out;
}

const materialByStation={
  [STATIONS[0]]:readingMaterial(),
  [STATIONS[1]]:mathMaterial(),
  [STATIONS[2]]:religionMaterial()
};
const starRead=shuffled(starReading());
const starMathQuestions=shuffled(starMath());
const fallbackByStation={};
for(let index=0;index<STATIONS.length;index++){
  const readSlice=starRead.slice(index*20,index*20+20).map(item=>({...item,stationId:STATIONS[index]}));
  const mathSlice=starMathQuestions.slice(index*20,index*20+20).map(item=>({...item,stationId:STATIONS[index]}));
  fallbackByStation[STATIONS[index]]=shuffled([...readSlice,...mathSlice]).map(item=>makeQuestion({...item,id:item.id+'-'+STATIONS[index].split('-')[0]}));
}

const questions=[];
const materialCountByStation={};
for(const stationId of STATIONS){
  const material=materialByStation[stationId];
  materialCountByStation[stationId]=material.length;
  questions.push(...material,...fallbackByStation[stationId]);
}
if(starRead.length<60||starMathQuestions.length<60) throw new Error('STAR fallback coverage dropped below 60 Reading and 60 Math questions.');
if(questions.some(question=>!question.stationId)) throw new Error('Final question bank contains an unbound station question.');

const source={
  schemaVersion:4,
  certificationVersion:'dynamic-abvm-star-sync-v1',
  status:'certified-daily-abvm-material-plus-regenerated-star-fallback',
  generatedFrom:{
    repository:'P00NSMASHER/abvmschoolstarworld',
    path:'pages/data/study-pack.json',
    scanner:'scripts/refresh-teacher-pages.mjs',
    scannerCommit,
    generatorVersion:GENERATOR_VERSION,
    healthCheck:'scripts/check-refresh-health.mjs',
    sourceHash:rawSourceHash,
    sourceCapturedAt:data.sourceCapturedAt||pack.sourceCapturedAt||null,
    sourceCheckedAt:data.sourceLastCheckedAt||pack.sourceCheckedAt||null,
    weekLabel:pack.weekLabel||null,
    bankSnapshotId:snapshotId
  },
  starAlignment:{
    assessment:'Renaissance Star Reading and Star Math',
    itemPolicy:'original-practice-only-not-copied-test-items',
    regenerationPolicy:'regenerate-on-every-verified-ABVM-source-change',
    readingDomains:READ_DOMAINS,
    mathDomains:MATH_DOMAINS,
    readingQuestionCount:starRead.length,
    mathQuestionCount:starMathQuestions.length
  },
  qualityPolicy:{
    materialFirst:true,
    materialCountByStation,
    starFallbackQuestionsPerStation:40,
    starReadingPoolTarget:60,
    starMathPoolTarget:60,
    richContentEnabled:true,
    rubricScoringEnabled:true,
    experimentAllocation:'90-control-10-treatment',
    minimumDifficulty:2,
    forbiddenMetaPromptPatterns:['sight word','teacher page','study list','being practiced this week'],
    answersServerOnly:true,
    rotation:'fresh-material-once-then-current-snapshot-star-fallback-loop',
    resetPlayerQuestionCursorWhenSnapshotChanges:true,
    noLiveLlm:true
  },
  questions
};
writeFileSync(sourceOut,JSON.stringify(source,null,2)+'\n');
writeFileSync(packOut,JSON.stringify(data,null,2)+'\n');

const q=JSON.stringify;
function luaValue(value){
  if(value===null||value===undefined) return 'nil';
  if(Array.isArray(value)) return 'table.freeze({'+value.map(luaValue).join(', ')+'})';
  if(typeof value==='object'){
    return 'table.freeze({'+Object.entries(value).map(([key,child])=>'['+q(key)+'] = '+luaValue(child)).join(', ')+'})';
  }
  if(typeof value==='string') return q(value);
  if(typeof value==='number') return Number.isFinite(value)?String(value):'0';
  if(typeof value==='boolean') return value?'true':'false';
  return 'nil';
}
const lines=[
  '--!strict','',
  '-- Generated from the verified ABVM teacher-page scanner. Do not hand-edit.',
  '-- Current school material is served first; STAR-aligned practice rotates after material is exhausted.',
  'local CoreQuestionBank = {}','',
  'local SOURCE = table.freeze({',
  '\tCertificationVersion = '+q(source.certificationVersion)+',',
  '\tBankSnapshotId = '+q(snapshotId)+',',
  '\tPackSourceHash = '+q(String(rawSourceHash))+',',
  '\tSourceCapturedAt = '+q(String(source.generatedFrom.sourceCapturedAt||''))+',',
  '\tSourceCheckedAt = '+q(String(source.generatedFrom.sourceCheckedAt||''))+',',
  '\tWeekLabel = '+q(String(pack.weekLabel||''))+',',
  '\tAnswersServerOnly = true,',
  '\tMaterialFirst = true,',
  '\tStarFallback = true,',
  '\tStarReadingCount = '+starRead.length+',',
  '\tStarMathCount = '+starMathQuestions.length+',',
  '\tNoLiveLlm = true,',
  '})','',
  'local MATERIAL_COUNT_BY_STATION = table.freeze({'
];
for(const stationId of STATIONS) lines.push('\t['+q(stationId)+'] = '+materialCountByStation[stationId]+',');
lines.push('})','','local QUESTIONS_BY_STATION = table.freeze({');
for(const stationId of STATIONS){
  lines.push('\t['+q(stationId)+'] = table.freeze({');
  for(const item of questions.filter(question=>question.stationId===stationId)){
    lines.push('\t\ttable.freeze({');
    lines.push('\t\t\tId = '+q(item.id)+',');
    lines.push('\t\t\tStationId = '+q(item.stationId)+',');
    lines.push('\t\t\tContentHash = '+q(item.contentHash)+',');
    lines.push('\t\t\tPrompt = '+q(item.prompt)+',');
    lines.push('\t\t\tChoices = table.freeze({'+item.choices.map(q).join(', ')+'}),');
    lines.push('\t\t\tAnswer = '+q(item.answer)+',');
    lines.push('\t\t\tExplanation = '+q(item.explanation)+',');
    lines.push('\t\t\tSubject = '+q(item.subject)+',');
    lines.push('\t\t\tSkill = '+q(item.skill)+',');
    lines.push('\t\t\tProvenance = '+q(item.provenance)+',');
    lines.push('\t\t\tSourceFact = '+q(item.sourceFact)+',');
    lines.push('\t\t\tTier = '+q(item.tier)+',');
    lines.push('\t\t\tDomain = '+q(item.domain)+',');
    lines.push('\t\t\tStandards = table.freeze({'+item.standards.map(q).join(', ')+'}),');
    lines.push('\t\t\tDOK = '+item.dok+',');
    lines.push('\t\t\tCognitiveDemand = '+q(item.cognitiveDemand)+',');
    lines.push('\t\t\tDifficulty = '+item.difficulty+',');
    lines.push('\t\t\tHint = '+q(item.hint)+',');
    lines.push('\t\t\tScaffold = '+q(item.scaffold)+',');
    lines.push('\t\t\tWrongFeedback = table.freeze({'+item.choiceDiagnostics.map(row=>'['+q(row.choice)+'] = '+q(row.feedback)).join(', ')+'}),');
    lines.push('\t\t\tMisconceptions = table.freeze({'+item.choiceDiagnostics.map(row=>'['+q(row.choice)+'] = '+q(row.misconception)).join(', ')+'}),');
    lines.push('\t\t\tRubric = '+luaValue(item.rubric)+',');
    lines.push('\t\t\tAlignmentEvidence = '+luaValue(item.alignmentEvidence)+',');
    lines.push('\t\t\tResponseType = '+q(item.responseType)+',');
    if(item.richContent) lines.push('\t\t\tRichContent = '+luaValue(item.richContent)+',');
    if(item.experiment) lines.push('\t\t\tExperiment = '+luaValue(item.experiment)+',');
    lines.push('\t\t}),');
  }
  lines.push('\t}),');
}
lines.push(
  '})','',
  'local BY_ID = {}',
  'for _, pool in QUESTIONS_BY_STATION do',
  '\tfor _, question in pool do',
  '\t\tBY_ID[question.Id] = question',
  '\tend',
  'end','',
  'local function normalizedCursor(value: any): number',
  '\tlocal parsed = tonumber(value) or 0',
  '\tif parsed ~= parsed then return 0 end',
  '\treturn math.max(0, math.floor(parsed))',
  'end','',
  'function CoreQuestionBank.Select(stationId: string, cursor: any, targetDifficulty: number?)',
  '\tlocal pool = QUESTIONS_BY_STATION[stationId]',
  '\tif pool == nil or #pool == 0 then return nil end',
  '\tlocal clean = normalizedCursor(cursor)',
  '\tlocal materialCount = MATERIAL_COUNT_BY_STATION[stationId] or 0',
  '\tif clean < materialCount then return pool[clean + 1] end',
  '\tlocal fallbackCount = #pool - materialCount',
  '\tif fallbackCount <= 0 then return pool[(clean % #pool) + 1] end',
  '\tif type(targetDifficulty) == "number" then',
  '\t\tlocal preferred = {}',
  '\t\tfor index = materialCount + 1, #pool do',
  '\t\t\tlocal candidate = pool[index]',
  '\t\t\tif candidate.Difficulty == targetDifficulty then table.insert(preferred, candidate) end',
  '\t\tend',
  '\t\tif #preferred > 0 then',
  '\t\t\tlocal preferredOffset = (clean - materialCount) % #preferred',
  '\t\t\treturn preferred[preferredOffset + 1]',
  '\t\tend',
  '\tend',
  '\tlocal fallbackOffset = (clean - materialCount) % fallbackCount',
  '\treturn pool[materialCount + fallbackOffset + 1]',
  'end','',
  'function CoreQuestionBank.FindSupportQuestion(stationId: string, currentQuestionId: string, maxDifficulty: number?)',
  '\tlocal pool = QUESTIONS_BY_STATION[stationId]',
  '\tlocal current = BY_ID[currentQuestionId]',
  '\tif pool == nil or current == nil then return nil end',
  '\tlocal ceiling = tonumber(maxDifficulty) or 2',
  '\tfor _, candidate in pool do',
  '\t\tif candidate.Id ~= currentQuestionId',
  '\t\t\tand candidate.Skill == current.Skill',
  '\t\t\tand (tonumber(candidate.Difficulty) or 3) <= ceiling',
  '\t\tthen',
  '\t\t\treturn candidate',
  '\t\tend',
  '\tend',
  '\tfor _, candidate in pool do',
  '\t\tif candidate.Id ~= currentQuestionId',
  '\t\t\tand candidate.Domain == current.Domain',
  '\t\t\tand candidate.Subject == current.Subject',
  '\t\t\tand (tonumber(candidate.Difficulty) or 3) <= ceiling',
  '\t\tthen',
  '\t\t\treturn candidate',
  '\t\tend',
  '\tend',
  '\treturn nil',
  'end','',
  'function CoreQuestionBank.GetById(questionId: string)',
  '\treturn BY_ID[questionId]',
  'end','',
  'function CoreQuestionBank.Grade(questionId: any, choice: any): boolean',
  '\tif type(questionId) ~= "string" or type(choice) ~= "string" then return false end',
  '\tlocal question = BY_ID[questionId]',
  '\treturn question ~= nil and string.lower(choice) == string.lower(question.Answer)',
  'end','',
  'function CoreQuestionBank.CountForStation(stationId: string): number',
  '\tlocal pool = QUESTIONS_BY_STATION[stationId]',
  '\treturn if pool == nil then 0 else #pool',
  'end','',
  'CoreQuestionBank.Source = SOURCE',
  'CoreQuestionBank.MaterialCountByStation = MATERIAL_COUNT_BY_STATION',
  'CoreQuestionBank.QuestionsByStation = QUESTIONS_BY_STATION','',
  'return table.freeze(CoreQuestionBank)',''
);
writeFileSync(luaOut,lines.join('\n'));
console.log(JSON.stringify({
  snapshotId,
  sourceHash:rawSourceHash,
  questions:questions.length,
  materialCountByStation,
  starReading:starRead.length,
  starMath:starMathQuestions.length
},null,2));
