// Bootstrap trigger for the first certified dynamic curriculum snapshot.
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
  if(previous?.generatedFrom?.sourceHash===rawSourceHash){
    console.log(JSON.stringify({status:'unchanged',sourceHash:rawSourceHash},null,2));
    process.exit(0);
  }
}
const snapshotId='abvm-'+String(rawSourceHash).replace(/^teacher-pages-/,'').replace(/^sha256:/,'').slice(0,12);
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
function makeQuestion(input){
  const base={...input};
  if(!base.id||!base.stationId||!base.prompt||!base.answer) throw new Error('Question is missing required fields.');
  if(!Array.isArray(base.choices)||base.choices.length!==3||new Set(base.choices).size!==3) throw new Error('Question '+base.id+' must have exactly three unique choices.');
  if(!base.choices.includes(base.answer)) throw new Error('Question '+base.id+' answer is not in choices.');
  if(FORBIDDEN.some(pattern=>pattern.test(base.prompt))) throw new Error('Forbidden meta prompt in '+base.id+': '+base.prompt);
  if(!Number.isInteger(base.difficulty)||base.difficulty<2||base.difficulty>3) throw new Error('Question '+base.id+' has invalid difficulty.');
  const keys=['id','stationId','subject','skill','prompt','choices','answer','explanation','provenance','sourceFact','tier','domain','difficulty'];
  const material={};
  for(const key of keys) if(base[key]!==undefined) material[key]=base[key];
  return {...base,contentHash:sha(material)};
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
  ['enormous','very large',['tiny','huge','quiet']],
  ['glanced','looked quickly',['stared for hours','looked quickly','closed a door']],
  ['drowsy','sleepy',['sleepy','excited','angry']],
  ['fragile','easy to break',['easy to break','very loud','full of water']],
  ['rapid','fast',['slow','fast','careful']],
  ['assist','help',['help','hide','measure']]
];
const themeRows=[
  ['A child practices tying shoes every morning. After many tries, the knot finally stays tied.','Practice can help you improve.'],
  ['Two friends want the same swing, so they agree to take turns.','Sharing fairly can solve a problem.'],
  ['A student notices a new classmate alone and invites them to join a game.','Kindness can help someone feel included.'],
  ['A gardener forgets to water a plant, notices it drooping, and begins checking it each day.','Taking responsibility can fix a mistake.'],
  ['A runner loses one race, changes how she practices, and improves the next week.','A setback can teach you what to change.']
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
  for(let i=0;i<30;i++){
    const family=i%10;
    const n=pick(names);
    let prompt,choices,answer,explanation,domain,skill;
    if(family===0){
      const row=contextRows[(i+snapshotSeed[1])%contextRows.length];
      prompt='In the sentence “The '+row[0]+' box barely fit through the doorway,” what does “'+row[0]+'” most likely mean?';
      choices=shuffled(row[2]); answer=row[1]; explanation='The context clue about barely fitting supports the meaning “'+answer+'”.'; domain=READ_DOMAINS[0]; skill='context-clues';
    }else if(family===1){
      const words=[['unhappy','not happy'],['rewrite','write again'],['careless','without enough care'],['preview','look at before'],['helpful','giving help']];
      const row=words[(i+snapshotSeed[2])%words.length];
      prompt='What does the word “'+row[0]+'” mean?'; choices=shuffled([row[1],'very noisy','a kind of place']); answer=row[1]; explanation='The prefix or suffix changes the base word to make this meaning.'; domain=READ_DOMAINS[0]; skill='word-parts';
    }else if(family===2){
      prompt=n+' read: “The trail was muddy, so we stepped carefully around the puddles.” Why did they step carefully?';
      choices=shuffled(['The trail was muddy.','They were racing.','The puddles were frozen solid.']); answer='The trail was muddy.'; explanation='The first part gives the cause for the careful steps.'; domain=READ_DOMAINS[1]; skill='cause-effect';
    }else if(family===3){
      prompt='Read: “First '+n+' mixed the batter. Next, the batter went into the pan. Last, the pan went into the oven.” What happened immediately before the pan went into the oven?';
      choices=shuffled(['The batter went into the pan.','The oven was turned off.','The cake was eaten.']); answer='The batter went into the pan.'; explanation='The sequence word “next” marks the step just before the last event.'; domain=READ_DOMAINS[1]; skill='sequence';
    }else if(family===4){
      const row=themeRows[(i+snapshotSeed[3])%themeRows.length];
      prompt='Read: “'+row[0]+'” Which lesson best fits the story?'; choices=shuffled([row[1],'Winning is the only thing that matters.','Problems always disappear without effort.']); answer=row[1]; explanation='The character’s actions and outcome support that lesson.'; domain=READ_DOMAINS[2]; skill='theme';
    }else if(family===5){
      prompt='Read: “'+n+' tucked the permission slip into the front pocket of the backpack, then checked the pocket twice before leaving.” What can you infer?';
      choices=shuffled([n+' thinks the slip is important.',n+' wants to lose the slip.',n+' forgot there was a backpack.']); answer=n+' thinks the slip is important.'; explanation='Checking the pocket twice shows the slip matters to the character.'; domain=READ_DOMAINS[1]; skill='inference';
    }else if(family===6){
      prompt='Read: “The kitten crouched low, wiggled its back legs, and sprang toward the toy mouse.” Which detail best shows the kitten was getting ready to pounce?';
      choices=shuffled(['It crouched low and wiggled its back legs.','The toy was a mouse.','The kitten had fur.']); answer='It crouched low and wiggled its back legs.'; explanation='Those actions are direct evidence of preparing to pounce.'; domain=READ_DOMAINS[1]; skill='text-evidence';
    }else if(family===7){
      prompt='At the start of a story, '+n+' refuses to ask for help. After making the same mistake twice, '+n+' asks a classmate to explain the directions and succeeds. How did the character change?';
      choices=shuffled(['The character became more willing to ask for help.','The character stopped caring about the task.','The character decided directions are never useful.']); answer='The character became more willing to ask for help.'; explanation='The ending shows a change in the character’s choice.'; domain=READ_DOMAINS[2]; skill='character-development';
    }else if(family===8){
      const row=purposeRows[(i+snapshotSeed[4])%purposeRows.length];
      prompt='What is the author’s main purpose in this text? “'+row[0]+'”'; choices=shuffled([row[1],'to hide the topic','to list random words']); answer=row[1]; explanation='The kind of information and wording reveal the author’s purpose.'; domain=READ_DOMAINS[3]; skill='author-purpose';
    }else{
      prompt='Read: “The wind whispered through the tall grass.” Why might the author use the word “whispered”?';
      choices=shuffled(['To help the reader imagine a soft sound.','To prove the wind can speak like a person.','To tell the exact temperature.']); answer='To help the reader imagine a soft sound.'; explanation='The word choice creates a quiet sound image for the reader.'; domain=READ_DOMAINS[3]; skill='word-choice';
    }
    out.push(makeQuestion({
      id:snapshotId+'-star-read-'+String(i+1).padStart(2,'0'),stationId:'',subject:'Reading / ELA',skill,prompt,choices,answer,explanation,
      provenance:'original-star-aligned-practice-regenerated-with-curriculum-snapshot',
      sourceFact:'STAR Reading public domain alignment; curriculum snapshot '+rawSourceHash,tier:'star-fallback',domain,difficulty:family<2?2:3
    }));
  }
  return out;
}

function starMath(){
  const out=[];
  for(let i=0;i<30;i++){
    const family=i%10;
    let prompt,choices,answer,explanation,domain,skill;
    if(family===0){
      const a=int(20,70),b=int(10,29),sum=a+b;
      prompt='What is '+a+' + '+b+'?'; choices=shuffled([String(sum),String(sum-10),String(sum+1)]); answer=String(sum); explanation='Add tens and ones carefully.'; domain=MATH_DOMAINS[0]; skill='addition-within-100';
    }else if(family===1){
      const a=int(45,99),b=int(10,Math.min(40,a-1)),diff=a-b;
      prompt='What is '+a+' − '+b+'?'; choices=shuffled([String(diff),String(diff+10),String(Math.max(0,diff-1))]); answer=String(diff); explanation='Subtract tens and ones.'; domain=MATH_DOMAINS[0]; skill='subtraction-within-100';
    }else if(family===2){
      const hundreds=int(1,8),tens=int(1,9),ones=int(0,9),value=hundreds*100+tens*10+ones;
      prompt='In '+value+', what is the value of the digit '+tens+'?'; choices=shuffled([String(tens*10),String(tens),String(tens*100)]); answer=String(tens*10); explanation='The digit is in the tens place.'; domain=MATH_DOMAINS[0]; skill='place-value';
    }else if(family===3){
      const a=int(100,899),b=a+int(2,50);
      prompt='Which comparison is true?'; choices=shuffled([a+' < '+b,a+' > '+b,a+' = '+b]); answer=a+' < '+b; explanation='The number on the left is smaller.'; domain=MATH_DOMAINS[0]; skill='compare-numbers';
    }else if(family===4){
      const a=int(4,15),x=int(3,12),sum=a+x;
      prompt='Which number makes the equation true? '+a+' + □ = '+sum; choices=shuffled([String(x),String(x+1),String(Math.max(0,x-2))]); answer=String(x); explanation='Find the missing addend.'; domain=MATH_DOMAINS[1]; skill='unknown-number';
    }else if(family===5){
      const start=int(2,8),step=pick([2,5,10]);
      prompt='What number comes next? '+[0,1,2,3].map(k=>start+k*step).join(', ')+', __'; const next=start+4*step;
      choices=shuffled([String(next),String(next+step),String(next-1)]); answer=String(next); explanation='The same amount is added each time.'; domain=MATH_DOMAINS[1]; skill='patterns';
    }else if(family===6){
      const shape=pick([['hexagon',6],['pentagon',5],['rectangle',4],['triangle',3]]);
      prompt='How many sides does a '+shape[0]+' have?'; choices=shuffled([String(shape[1]),String(shape[1]+1),String(Math.max(2,shape[1]-1))]); answer=String(shape[1]); explanation='Count the straight sides of the shape.'; domain=MATH_DOMAINS[2]; skill='geometry';
    }else if(family===7){
      const len=int(12,30),used=int(2,Math.min(9,len-1)),left=len-used;
      prompt='A ribbon is '+len+' centimeters long. '+used+' centimeters are cut off. How many centimeters remain?'; choices=shuffled([String(left),String(len+used),String(left+1)]); answer=String(left); explanation='Subtract the part cut off from the original length.'; domain=MATH_DOMAINS[2]; skill='measurement';
    }else if(family===8){
      const cats=int(2,8),dogs=int(2,8),fish=int(2,8);
      const max=Math.max(cats,dogs,fish);
      const label=max===cats?'cats':max===dogs?'dogs':'fish';
      prompt='A class graph shows cats: '+cats+', dogs: '+dogs+', fish: '+fish+'. Which pet got the most votes?'; choices=shuffled(['cats','dogs','fish']); answer=label; explanation='Compare the three totals and choose the greatest.'; domain=MATH_DOMAINS[3]; skill='data-interpretation';
    }else{
      prompt='A bag has 5 blue tiles and 1 yellow tile. Without looking, which color is more likely to be picked?'; choices=shuffled(['blue','yellow','They are equally likely.']); answer='blue'; explanation='There are more blue tiles, so blue is more likely.'; domain=MATH_DOMAINS[3]; skill='probability-language';
    }
    out.push(makeQuestion({
      id:snapshotId+'-star-math-'+String(i+1).padStart(2,'0'),stationId:'',subject:'Math',skill,prompt,choices,answer,explanation,
      provenance:'original-star-aligned-practice-regenerated-with-curriculum-snapshot',
      sourceFact:'STAR Math public domain alignment; curriculum snapshot '+rawSourceHash,tier:'star-fallback',domain,difficulty:family===6||family===9?2:3
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
  const readSlice=starRead.slice(index*10,index*10+10).map(item=>({...item,stationId:STATIONS[index]}));
  const mathSlice=starMathQuestions.slice(index*10,index*10+10).map(item=>({...item,stationId:STATIONS[index]}));
  fallbackByStation[STATIONS[index]]=shuffled([...readSlice,...mathSlice]).map(item=>makeQuestion({...item,id:item.id+'-'+STATIONS[index].split('-')[0]}));
}

const questions=[];
const materialCountByStation={};
for(const stationId of STATIONS){
  const material=materialByStation[stationId];
  materialCountByStation[stationId]=material.length;
  questions.push(...material,...fallbackByStation[stationId]);
}
if(starRead.length<25||starMathQuestions.length<25) throw new Error('STAR fallback coverage dropped below 25 Reading and 25 Math questions.');

const source={
  schemaVersion:4,
  certificationVersion:'dynamic-abvm-star-sync-v1',
  status:'certified-daily-abvm-material-plus-regenerated-star-fallback',
  generatedFrom:{
    repository:'P00NSMASHER/abvmschoolstarworld',
    path:'pages/data/study-pack.json',
    scanner:'scripts/refresh-teacher-pages.mjs',
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
    starFallbackQuestionsPerStation:20,
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
    lines.push('\t\t\tDifficulty = '+item.difficulty+',');
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
  'function CoreQuestionBank.Select(stationId: string, cursor: any)',
  '\tlocal pool = QUESTIONS_BY_STATION[stationId]',
  '\tif pool == nil or #pool == 0 then return nil end',
  '\tlocal clean = normalizedCursor(cursor)',
  '\tlocal materialCount = MATERIAL_COUNT_BY_STATION[stationId] or 0',
  '\tif clean < materialCount then return pool[clean + 1] end',
  '\tlocal fallbackCount = #pool - materialCount',
  '\tif fallbackCount <= 0 then return pool[(clean % #pool) + 1] end',
  '\tlocal fallbackOffset = (clean - materialCount) % fallbackCount',
  '\treturn pool[materialCount + fallbackOffset + 1]',
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
