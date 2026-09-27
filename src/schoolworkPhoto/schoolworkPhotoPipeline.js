import {createHash} from 'node:crypto';

import {buildEquivalentQuestionSpecs} from './schoolworkEquivalentItemFactory.js';

export const SCHOOLWORK_PHOTO_PACK_VERSION='schoolwork-photo-source-v1';
export const SCHOOLWORK_QUESTION_CATALOG_VERSION='schoolwork-photo-question-catalog-v1';
export const SCHOOLWORK_PROVENANCE='original-practice-derived-from-sanitized-schoolwork-photos';
export const SCHOOLWORK_SOURCE_TRANSFORM='skill-only-equivalent-item-v1';

const STATIONS=new Set([
  'word-portal-put-v1',
  'spelling-forge-fog-v1',
  'culture-lab-culture-v1'
]);

const REQUIRED_PRIVACY=Object.freeze({
  rawImagesCommitted:false,
  studentNameStored:false,
  studentResponsesStored:false,
  teacherMarksStored:false,
  gradesOrScoresStored:false,
  rawWorksheetTextStored:false,
  sourceImageHashesStored:false
});

const FORBIDDEN_KEYS=new Set([
  'studentName','name','studentResponse','rawAnswer','teacherMark','grade','score',
  'rawText','worksheetText','imageHash','imagePath','fileName','filename'
]);

function stable(value){
  if(Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';
  }
  return JSON.stringify(value);
}
function sha(value){
  return 'sha256:'+createHash('sha256').update(stable(value)).digest('hex');
}
function slug(value){
  return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||'skill';
}
function deepForbiddenKeys(value,path='',out=[]){
  if(Array.isArray(value)){
    value.forEach((child,index)=>deepForbiddenKeys(child,path+'['+index+']',out));
    return out;
  }
  if(value&&typeof value==='object'){
    for(const [key,child] of Object.entries(value)){
      if(FORBIDDEN_KEYS.has(key)) out.push(path?path+'.'+key:key);
      deepForbiddenKeys(child,path?path+'.'+key:key,out);
    }
  }
  return out;
}
function rotateChoices(values,offset){
  const clean=[...values];
  if(clean.length===0) return clean;
  const n=((offset%clean.length)+clean.length)%clean.length;
  return [...clean.slice(n),...clean.slice(0,n)];
}
function hashInt(value){
  return Number.parseInt(createHash('sha256').update(String(value)).digest('hex').slice(0,8),16)>>>0;
}
function choose(list,key,index=0){
  return list[(hashInt(key)+index)%list.length];
}
function q(signal,type,{prompt,choices,answer,explanation,difficulty=2,sourceNote}){
  return {
    signalId:signal.id,
    questionType:type,
    stationId:signal.stationId,
    subject:signal.subject,
    skill:signal.skill,
    prompt,
    choices,
    answer,
    explanation,
    provenance:SCHOOLWORK_PROVENANCE,
    sourceFact:sourceNote||('Sanitized schoolwork-photo skill evidence: '+signal.skill+'; batch '+signal.batchId),
    tier:'material',
    domain:signal.domain,
    difficulty,
    photoDerived:true
  };
}

const FAMILIES=Object.freeze({
  'short-vowel-identification':signal=>{
    const rows=[
      {word:'map',sound:'short a',same:'cap',other:['seed','boat']},
      {word:'fin',sound:'short i',same:'sit',other:['moon','cake']},
      {word:'sun',sound:'short u',same:'cup',other:['feet','road']},
      {word:'hop',sound:'short o',same:'log',other:['bike','team']}
    ];
    const row=choose(rows,signal.id);
    return [
      q(signal,'direct',{
        prompt:'What vowel sound do you hear in the middle of the word “'+row.word+'”?',
        choices:rotateChoices([
          row.sound,
          ...['short a','short e','short i','short o','short u'].filter(value=>value!==row.sound).slice(0,2)
        ],hashInt(signal.id)),
        answer:row.sound,
        explanation:'Say the word slowly and listen to the middle vowel sound.'
      }),
      q(signal,'transfer',{
        prompt:'Which word has the same middle vowel sound as “'+row.word+'”?',
        choices:rotateChoices([row.same,...row.other],hashInt(signal.id+'transfer')),
        answer:row.same,
        explanation:'Both words use the same short middle-vowel sound.'
      }),
      q(signal,'reasoning',{
        prompt:'Which pair of words has the same short vowel sound?',
        choices:rotateChoices([
          row.word+' and '+row.same,
          row.word+' and '+row.other[0],
          row.same+' and '+row.other[1]
        ],hashInt(signal.id+'reasoning')),
        answer:row.word+' and '+row.same,
        explanation:'Listen to the middle sound in both words and compare them.',
        difficulty:3
      })
    ];
  },

  'cvc-missing-vowel':signal=>{
    const rows=[
      {frame:'c_t',letter:'a',word:'cat',clue:'a pet that can meow'},
      {frame:'p_g',letter:'i',word:'pig',clue:'a farm animal that can oink'},
      {frame:'h_p',letter:'o',word:'hop',clue:'to jump on one foot'},
      {frame:'s_n',letter:'u',word:'sun',clue:'the bright star we see in the daytime'}
    ];
    const row=choose(rows,signal.id);
    return [
      q(signal,'direct',{
        prompt:'Which vowel completes “'+row.frame+'” to make the word for '+row.clue+'?',
        choices:rotateChoices([row.letter,'e',row.letter==='o'?'i':'o'],hashInt(signal.id)),
        answer:row.letter,
        explanation:'The completed word is “'+row.word+'.”'
      }),
      q(signal,'transfer',{
        prompt:'Which completed CVC word is spelled correctly?',
        choices:rotateChoices([row.word,row.word.replace(row.letter,'e'),row.word.replace(row.letter,row.letter==='a'?'u':'a')],hashInt(signal.id+'transfer')),
        answer:row.word,
        explanation:'A consonant-vowel-consonant word needs the vowel that matches the sound you hear.'
      }),
      q(signal,'reasoning',{
        prompt:'Why does “'+row.word+'” use the letter “'+row.letter+'” in the middle?',
        choices:rotateChoices([
          'It matches the short vowel sound in the word.',
          'Every three-letter word uses that vowel.',
          'The last consonant tells us to choose that vowel.'
        ],hashInt(signal.id+'reasoning')),
        answer:'It matches the short vowel sound in the word.',
        explanation:'The middle letter represents the short vowel sound you hear.',
        difficulty:3
      })
    ];
  },

  'plural-s-es':signal=>[
    q(signal,'direct',{
      prompt:'Which ending makes “box” mean more than one?',
      choices:['-es','-s','-ing'],
      answer:'-es',
      explanation:'Words ending in x usually add -es to make the plural.'
    }),
    q(signal,'transfer',{
      prompt:'Which plural spelling is correct?',
      choices:['wishes','wishs','wishies'],
      answer:'wishes',
      explanation:'Words ending in sh usually add -es.'
    }),
    q(signal,'reasoning',{
      prompt:'Why does “bus” become “buses” instead of “buss”?',
      choices:[
        'The word ends in s, so the plural adds -es.',
        'All short words double the last letter.',
        'Plural words always end in -ing.'
      ],
      answer:'The word ends in s, so the plural adds -es.',
      explanation:'Nouns ending in s commonly add -es to show more than one.',
      difficulty:3
    })
  ],

  'spelling-short-vowel':signal=>[
    q(signal,'direct',{
      prompt:'Which word is spelled correctly for the word you hear as “jam”?',
      choices:['jam','jem','jom'],
      answer:'jam',
      explanation:'The word “jam” uses the short a sound.'
    }),
    q(signal,'transfer',{
      prompt:'Which spelling correctly makes the word “leg”?',
      choices:['leg','lag','lig'],
      answer:'leg',
      explanation:'The middle vowel sound in “leg” is short e.'
    }),
    q(signal,'reasoning',{
      prompt:'A student writes “hup” for the word “hop.” What should the student check?',
      choices:[
        'The middle vowel sound.',
        'Whether the word needs -es.',
        'Whether the first letter should be silent.'
      ],
      answer:'The middle vowel sound.',
      explanation:'The difference between “hup” and “hop” is the middle vowel sound.',
      difficulty:3
    })
  ],

  'vocabulary-definition':signal=>[
    q(signal,'direct',{
      prompt:'Which meaning best matches the word “fair” in “The teams took fair turns”?',
      choices:['equal and just','very fast','off to one side'],
      answer:'equal and just',
      explanation:'Fair means people are treated equally and justly.'
    }),
    q(signal,'transfer',{
      prompt:'In the sentence “Maya invited Leo to join the game,” what does “invited” mean?',
      choices:['asked to come','moved quickly','divided and gave away'],
      answer:'asked to come',
      explanation:'The sentence shows Maya asked Leo to join.'
    }),
    q(signal,'reasoning',{
      prompt:'Which sentence uses “share” to mean divide something and give part to others?',
      choices:[
        'We shared the crayons so everyone could draw.',
        'We hurried down the hallway.',
        'We stood quietly by the window.'
      ],
      answer:'We shared the crayons so everyone could draw.',
      explanation:'Sharing means giving part of something so others can use it too.',
      difficulty:3
    })
  ],

  'reading-main-character':signal=>[
    q(signal,'direct',{
      prompt:'Read: “Lena packed her library book, walked to school, and returned it before class.” Who is the main character?',
      choices:['Lena','the librarian','the teacher'],
      answer:'Lena',
      explanation:'Lena is the person whose actions the short passage follows.'
    }),
    q(signal,'transfer',{
      prompt:'Read: “Owen practiced his lines after dinner. The next day, he spoke clearly in the class play.” Who does the passage focus on most?',
      choices:['Owen','his family','the audience'],
      answer:'Owen',
      explanation:'Most of the actions and details are about Owen.'
    }),
    q(signal,'reasoning',{
      prompt:'How can you usually identify the main character in a story?',
      choices:[
        'Look for the character the story follows most closely.',
        'Choose the character with the longest name.',
        'Choose the first person mentioned even if the story is about someone else.'
      ],
      answer:'Look for the character the story follows most closely.',
      explanation:'The main character is usually central to the story’s actions and problem.',
      difficulty:3
    })
  ],

  'reading-setting':signal=>[
    q(signal,'direct',{
      prompt:'Read: “Children hung streamers in the gym while families found seats for the school celebration.” What is the setting?',
      choices:['a school gym','a beach','a farm'],
      answer:'a school gym',
      explanation:'The passage directly says the children are in the gym.'
    }),
    q(signal,'transfer',{
      prompt:'Read: “Rain tapped the windows while Nora curled up on the couch with a book.” Where is Nora most likely?',
      choices:['at home','on a playground','inside a bus'],
      answer:'at home',
      explanation:'A couch and home-like details support that setting.'
    }),
    q(signal,'reasoning',{
      prompt:'Which clue is most useful when figuring out a story’s setting?',
      choices:[
        'Details that tell where or when events happen.',
        'The number of letters in a character’s name.',
        'How many sentences are in the story.'
      ],
      answer:'Details that tell where or when events happen.',
      explanation:'Setting means the time and place of a story.',
      difficulty:3
    })
  ],

  'reading-character-motivation':signal=>[
    q(signal,'direct',{
      prompt:'Read: “Mia saw her little brother standing alone, so she moved over and made room for him in the game.” Why did Mia move over?',
      choices:[
        'She wanted to include her brother.',
        'She wanted the game to end.',
        'She forgot where she was sitting.'
      ],
      answer:'She wanted to include her brother.',
      explanation:'Her brother was alone, and Mia made room so he could join.'
    }),
    q(signal,'transfer',{
      prompt:'Read: “Kai checked his backpack twice before leaving because the permission slip was inside.” Why did Kai check twice?',
      choices:[
        'He wanted to make sure the important paper was there.',
        'He wanted to find a snack.',
        'He was trying to make the backpack heavier.'
      ],
      answer:'He wanted to make sure the important paper was there.',
      explanation:'Checking twice shows the permission slip mattered to him.'
    }),
    q(signal,'reasoning',{
      prompt:'When a question asks why a character did something, what evidence should you use?',
      choices:[
        'The character’s actions, words, and the situation.',
        'Only the title of the story.',
        'Only whether the character is older or younger.'
      ],
      answer:'The character’s actions, words, and the situation.',
      explanation:'Motivation is supported by clues about what the character does, says, and experiences.',
      difficulty:3
    })
  ],

  'reading-genre':signal=>[
    q(signal,'direct',{
      prompt:'A story tells about a child who loses a mitten at school and finds it under a desk. The events could happen in real life. What genre best fits?',
      choices:['realistic fiction','fantasy','biography'],
      answer:'realistic fiction',
      explanation:'The events are made up but could realistically happen.'
    }),
    q(signal,'transfer',{
      prompt:'A text explains how sea turtles hatch and travel toward the ocean. What genre best fits?',
      choices:['informational','fantasy','realistic fiction'],
      answer:'informational',
      explanation:'The text gives facts and explanations about a real topic.'
    }),
    q(signal,'reasoning',{
      prompt:'Which clue most strongly suggests a story is fantasy?',
      choices:[
        'An animal speaks in complete sentences.',
        'A child walks to school.',
        'A family eats dinner together.'
      ],
      answer:'An animal speaks in complete sentences.',
      explanation:'An impossible event is a strong clue that a story is fantasy.',
      difficulty:3
    })
  ],

  'religion-trinity':signal=>[
    q(signal,'direct',{
      prompt:'Which statement matches the Christian teaching about the Trinity?',
      choices:[
        'There is one God in three Persons: Father, Son, and Holy Spirit.',
        'There are three separate gods.',
        'God is only one Person with three unrelated jobs.'
      ],
      answer:'There is one God in three Persons: Father, Son, and Holy Spirit.',
      explanation:'The Trinity means one God in three divine Persons.'
    }),
    q(signal,'transfer',{
      prompt:'Which three names belong together when learning about the Trinity?',
      choices:[
        'Father, Son, and Holy Spirit',
        'Creator, teacher, and student',
        'Angel, prophet, and king'
      ],
      answer:'Father, Son, and Holy Spirit',
      explanation:'Those are the three Persons named in the Trinity.'
    }),
    q(signal,'reasoning',{
      prompt:'Why is “three separate gods” not the same as the Trinity?',
      choices:[
        'The Trinity teaches one God, not three gods.',
        'The Trinity has only two Persons.',
        'The Trinity means three names for three different religions.'
      ],
      answer:'The Trinity teaches one God, not three gods.',
      explanation:'Christian teaching describes one God in three Persons.',
      difficulty:3
    })
  ],

  'religion-gifts':signal=>[
    q(signal,'direct',{
      prompt:'Which choice is an example of using a gift or ability to help someone else?',
      choices:[
        'Using your drawing skill to make a card for someone who is sad.',
        'Hiding your supplies so nobody else can use them.',
        'Refusing to help because the task is not yours.'
      ],
      answer:'Using your drawing skill to make a card for someone who is sad.',
      explanation:'A gift can be used lovingly to help another person.'
    }),
    q(signal,'transfer',{
      prompt:'A child is good at reading. Which action best uses that gift to serve someone?',
      choices:[
        'Reading a story to a younger child.',
        'Keeping every book hidden.',
        'Telling others they should never read.'
      ],
      answer:'Reading a story to a younger child.',
      explanation:'The ability is used to help another person.'
    }),
    q(signal,'reasoning',{
      prompt:'Why can ordinary talents be called gifts in a religion lesson?',
      choices:[
        'They can be received gratefully and used to love and serve others.',
        'They make one person more important than everyone else.',
        'They only matter when they win a prize.'
      ],
      answer:'They can be received gratefully and used to love and serve others.',
      explanation:'The lesson connects gifts with gratitude, love, and service.',
      difficulty:3
    })
  ],

  'religion-choice-love':signal=>[
    q(signal,'direct',{
      prompt:'Which choice best shows love for another person?',
      choices:[
        'Helping a classmate who dropped a box of crayons.',
        'Laughing while someone struggles.',
        'Taking the crayons and walking away.'
      ],
      answer:'Helping a classmate who dropped a box of crayons.',
      explanation:'Helping someone in need is a loving choice.'
    }),
    q(signal,'transfer',{
      prompt:'A student can choose what to do when a new child is alone. Which choice best shows kindness?',
      choices:[
        'Invite the child to join the game.',
        'Pretend not to see the child.',
        'Tell the child to leave.'
      ],
      answer:'Invite the child to join the game.',
      explanation:'Inviting someone to join is a kind and loving action.'
    }),
    q(signal,'reasoning',{
      prompt:'Why does making a good choice matter in a lesson about loving others?',
      choices:[
        'Choices are one way people put love into action.',
        'Choices matter only when an adult is watching.',
        'A loving choice always has to be the easiest choice.'
      ],
      answer:'Choices are one way people put love into action.',
      explanation:'Love is shown through the actions people choose.',
      difficulty:3
    })
  ]
});

export function schoolworkPackHash(pack){
  return sha({
    packVersion:pack?.packVersion,
    batchId:pack?.batchId,
    pageCount:pack?.pageCount,
    sourceCategories:pack?.sourceCategories,
    skillSignals:pack?.skillSignals
  });
}

export function validateSanitizedSchoolworkPack(pack){
  const issues=[];
  if(!pack||typeof pack!=='object') return [{type:'pack-missing'}];
  if(pack.schemaVersion!==1) issues.push({type:'schema-version-invalid'});
  if(pack.packVersion!==SCHOOLWORK_PHOTO_PACK_VERSION) issues.push({type:'pack-version-invalid'});
  if(typeof pack.batchId!=='string'||!pack.batchId.trim()) issues.push({type:'batch-id-missing'});
  if(!Number.isInteger(pack.pageCount)||pack.pageCount<1) issues.push({type:'page-count-invalid'});
  const privacy=pack.privacy||{};
  for(const [key,expected] of Object.entries(REQUIRED_PRIVACY)){
    if(privacy[key]!==expected) issues.push({type:'privacy-contract-violation',field:key});
  }
  for(const path of deepForbiddenKeys(pack)) issues.push({type:'forbidden-private-field',path});
  if(!Array.isArray(pack.skillSignals)||pack.skillSignals.length===0){
    issues.push({type:'skill-signals-missing'});
    return issues;
  }
  const ids=new Set();
  for(const signal of pack.skillSignals){
    if(!signal||typeof signal!=='object'){issues.push({type:'signal-invalid'});continue;}
    if(typeof signal.id!=='string'||!signal.id.trim()) issues.push({type:'signal-id-missing'});
    else if(ids.has(signal.id)) issues.push({type:'signal-id-duplicate',id:signal.id});
    else ids.add(signal.id);
    if(!FAMILIES[signal.generatorKey]) issues.push({type:'unsupported-generator-key',id:signal.id,key:signal.generatorKey});
    if(!STATIONS.has(signal.stationId)) issues.push({type:'station-invalid',id:signal.id,stationId:signal.stationId});
    if(!['Reading / ELA','Religion'].includes(signal.subject)) issues.push({type:'subject-invalid',id:signal.id});
    if(typeof signal.skill!=='string'||!signal.skill) issues.push({type:'skill-missing',id:signal.id});
    if(typeof signal.domain!=='string'||!signal.domain) issues.push({type:'domain-missing',id:signal.id});
    if(!Number.isInteger(signal.coverageWeight)||signal.coverageWeight<1||signal.coverageWeight>5){
      issues.push({type:'coverage-weight-invalid',id:signal.id});
    }
  }
  return issues;
}

export function buildSchoolworkQuestionCatalog(pack,{snapshotId,generationVariant=0}={}){
  const issues=validateSanitizedSchoolworkPack(pack);
  if(issues.length) throw new Error('schoolwork photo pack validation failed: '+JSON.stringify(issues));
  const cleanSnapshot=String(snapshotId||'schoolwork').replace(/[^a-zA-Z0-9_-]+/g,'-');
  const variant=Math.max(0,Math.floor(Number(generationVariant)||0));
  const questions=[];
  for(const signal of pack.skillSignals){
    const enriched={...signal,batchId:pack.batchId};
    let variants;
    if(variant>0){
      const specs=buildEquivalentQuestionSpecs(signal.generatorKey,variant);
      if(!Array.isArray(specs)||specs.length===0){
        throw new Error('equivalent item factory missing generator: '+signal.generatorKey);
      }
      variants=specs.map(spec=>q(enriched,spec.type,spec));
    }else{
      variants=FAMILIES[signal.generatorKey](enriched);
    }
    variants.forEach((question,index)=>{
      const type=question.questionType||['direct','transfer','reasoning'][index]||'practice';
      questions.push({
        ...question,
        id:cleanSnapshot+'-photo-'+slug(signal.id)+'-'+slug(type)+(variant>0?'-ev'+variant:''),
        coverageWeight:signal.coverageWeight,
        ...(variant>0?{
          generationVariant:variant,
          sourceTransform:SCHOOLWORK_SOURCE_TRANSFORM,
          originalEquivalent:true
        }:{})
      });
    });
  }
  return {
    schemaVersion:1,
    catalogVersion:SCHOOLWORK_QUESTION_CATALOG_VERSION,
    batchId:pack.batchId,
    sourceHash:schoolworkPackHash(pack),
    generationMode:variant>0?'skill-only-equivalent-item':'baseline-original-practice',
    generationVariant:variant,
    questionCount:questions.length,
    questions
  };
}

export function validateOriginalEquivalentCatalog(catalog){
  const issues=[];
  if(!catalog||typeof catalog!=='object'){
    return [{type:'equivalent-catalog-missing'}];
  }
  if(!Number.isInteger(catalog.generationVariant)||catalog.generationVariant<1){
    issues.push({type:'equivalent-generation-variant-invalid'});
  }
  if(catalog.generationMode!=='skill-only-equivalent-item'){
    issues.push({type:'equivalent-generation-mode-invalid'});
  }
  const ids=new Set();
  for(const question of catalog.questions||[]){
    if(ids.has(question.id)) issues.push({type:'equivalent-question-id-duplicate',id:question.id});
    ids.add(question.id);
    if(question.provenance!==SCHOOLWORK_PROVENANCE){
      issues.push({type:'equivalent-provenance-invalid',id:question.id});
    }
    if(question.sourceTransform!==SCHOOLWORK_SOURCE_TRANSFORM||question.originalEquivalent!==true){
      issues.push({type:'equivalent-source-transform-invalid',id:question.id});
    }
    if(!['direct','transfer','reasoning'].includes(question.questionType)){
      issues.push({type:'equivalent-question-type-invalid',id:question.id});
    }
    if(typeof question.prompt!=='string'||question.prompt.length<20){
      issues.push({type:'equivalent-prompt-invalid',id:question.id});
    }
    if(!Array.isArray(question.choices)||question.choices.length!==3||
      new Set(question.choices).size!==3||!question.choices.includes(question.answer)
    ){
      issues.push({type:'equivalent-choices-invalid',id:question.id});
    }
    if(!String(question.sourceFact||'').startsWith('Sanitized schoolwork-photo skill evidence:')){
      issues.push({type:'equivalent-source-fact-invalid',id:question.id});
    }
    const forbidden=deepForbiddenKeys(question);
    if(forbidden.length){
      issues.push({type:'equivalent-private-field-present',id:question.id,paths:forbidden});
    }
  }
  return issues;
}

export function selectActiveSchoolworkQuestions(catalog,{maxPerStation=4}={}){
  const active=[];
  const byStation=new Map();
  for(const question of catalog.questions||[]){
    const list=byStation.get(question.stationId)||[];
    list.push(question);
    byStation.set(question.stationId,list);
  }

  for(const stationId of STATIONS){
    const pool=byStation.get(stationId)||[];
    const bySignal=new Map();
    for(const question of pool){
      const list=bySignal.get(question.signalId)||[];
      list.push(question);
      bySignal.set(question.signalId,list);
    }
    const signalRows=[...bySignal.entries()].map(([signalId,questions])=>({
      signalId,
      questions,
      coverageWeight:Math.max(...questions.map(q=>Number(q.coverageWeight)||1))
    })).sort((a,b)=>b.coverageWeight-a.coverageWeight||a.signalId.localeCompare(b.signalId));

    const typeCycle=['direct','transfer','reasoning'];
    for(let i=0;i<signalRows.length&&active.filter(q=>q.stationId===stationId).length<maxPerStation;i++){
      const row=signalRows[i];
      const wanted=typeCycle[i%typeCycle.length];
      const selected=row.questions.find(q=>q.questionType===wanted)||row.questions[0];
      active.push(selected);
    }
    if(active.filter(q=>q.stationId===stationId).length<maxPerStation){
      const used=new Set(active.filter(q=>q.stationId===stationId).map(q=>q.id));
      const leftovers=pool
        .filter(q=>!used.has(q.id))
        .sort((a,b)=>(Number(b.coverageWeight)||0)-(Number(a.coverageWeight)||0)||a.id.localeCompare(b.id));
      for(const q of leftovers){
        if(active.filter(x=>x.stationId===stationId).length>=maxPerStation) break;
        active.push(q);
      }
    }
  }
  return active;
}

export function makeSchoolworkReviewReceipt(pack,catalog,active){
  const byStation={};
  for(const question of active) byStation[question.stationId]=(byStation[question.stationId]||0)+1;
  return {
    schemaVersion:1,
    receiptVersion:'schoolwork-photo-review-receipt-v1',
    batchId:pack.batchId,
    sourceHash:catalog.sourceHash,
    pageCount:pack.pageCount,
    acceptedSkillSignals:pack.skillSignals.length,
    generatedQuestionCandidates:catalog.questions.length,
    activeQuestionCount:active.length,
    generationMode:catalog.generationMode||'baseline-original-practice',
    generationVariant:Number(catalog.generationVariant)||0,
    sourceTransform:Number(catalog.generationVariant)>0?SCHOOLWORK_SOURCE_TRANSFORM:null,
    originalEquivalentQuestionCount:(catalog.questions||[]).filter(question=>question.originalEquivalent===true).length,
    activeByStation:byStation,
    ambiguousObservationsOmitted:pack.review?.ambiguousObservationsOmitted===true,
    parentReviewRequiredOnAmbiguousExtraction:pack.review?.parentReviewRequiredOnAmbiguousExtraction===true,
    privacy:{
      rawImagesIncluded:false,
      studentIdentityIncluded:false,
      studentResponsesIncluded:false,
      teacherMarksIncluded:false,
      gradesOrScoresIncluded:false,
      rawWorksheetTextIncluded:false
    }
  };
}
