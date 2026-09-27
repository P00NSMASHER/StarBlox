function rowFor(rows,variant){
  const index=Math.max(0,(Math.floor(Number(variant)||1)-1)%rows.length);
  return rows[index];
}

function directTransferReasoning(direct,transfer,reasoning){
  return [
    {type:'direct',...direct},
    {type:'transfer',...transfer},
    {type:'reasoning',difficulty:3,...reasoning}
  ];
}

const FACTORIES=Object.freeze({
  'short-vowel-identification':variant=>{
    const row=rowFor([
      {word:'bed',sound:'short e',same:'hen',other:['boat','seed']},
      {word:'rug',sound:'short u',same:'mug',other:['bike','feet']}
    ],variant);
    return directTransferReasoning(
      {
        prompt:'What short vowel sound is in the middle of “'+row.word+'”?',
        choices:[row.sound,'short a','short i'],
        answer:row.sound,
        explanation:'Stretch the word and listen to its middle vowel sound.'
      },
      {
        prompt:'Which word has the same middle vowel sound as “'+row.word+'”?',
        choices:[row.same,...row.other],
        answer:row.same,
        explanation:'The two words share the same short middle-vowel sound.'
      },
      {
        prompt:'Which pair should be grouped because both words use '+row.sound+'?',
        choices:[row.word+' and '+row.same,row.word+' and '+row.other[0],row.same+' and '+row.other[1]],
        answer:row.word+' and '+row.same,
        explanation:'Compare the middle sound in each word.'
      }
    );
  },

  'cvc-missing-vowel':variant=>{
    const row=rowFor([
      {frame:'b_g',letter:'a',word:'bag',clue:'something that can carry books'},
      {frame:'p_n',letter:'e',word:'pen',clue:'a tool used for writing'}
    ],variant);
    const wrong1=row.letter==='a'?'e':'a';
    const wrong2=row.letter==='i'?'o':'i';
    return directTransferReasoning(
      {
        prompt:'Which vowel completes “'+row.frame+'” to make the word for '+row.clue+'?',
        choices:[row.letter,wrong1,wrong2],
        answer:row.letter,
        explanation:'The vowel must match the middle sound in “'+row.word+'.”'
      },
      {
        prompt:'Which spelling correctly shows the word “'+row.word+'”?',
        choices:[row.word,row.word.replace(row.letter,wrong1),row.word.replace(row.letter,wrong2)],
        answer:row.word,
        explanation:'Listen for the short vowel between the two consonants.'
      },
      {
        prompt:'What is the best way to decide which vowel belongs in “'+row.frame+'”?',
        choices:['Say the word and listen to the middle sound.','Always choose the letter a.','Look only at the final consonant.'],
        answer:'Say the word and listen to the middle sound.',
        explanation:'The spoken middle sound tells which vowel is needed.'
      }
    );
  },

  'plural-s-es':variant=>{
    const row=rowFor([
      {direct:'fox',directPlural:'foxes',transfer:'brush',transferPlural:'brushes',reason:'glass',reasonPlural:'glasses',ending:'s'},
      {direct:'dish',directPlural:'dishes',transfer:'bench',transferPlural:'benches',reason:'class',reasonPlural:'classes',ending:'s'}
    ],variant);
    return directTransferReasoning(
      {
        prompt:'Which spelling makes “'+row.direct+'” mean more than one?',
        choices:[row.directPlural,row.direct+'s',row.direct+'ing'],
        answer:row.directPlural,
        explanation:'Words ending in sounds like x, s, sh, or ch often add -es.'
      },
      {
        prompt:'Which plural spelling of “'+row.transfer+'” is correct?',
        choices:[row.transferPlural,row.transfer+'s',row.transfer+'ies'],
        answer:row.transferPlural,
        explanation:'This ending takes -es in the plural.'
      },
      {
        prompt:'Why does “'+row.reason+'” become “'+row.reasonPlural+'”?',
        choices:['Its ending calls for -es to show more than one.','Every plural doubles the last letter.','Plural words always end in -ing.'],
        answer:'Its ending calls for -es to show more than one.',
        explanation:'The word ending determines whether -s or -es is used.'
      }
    );
  },

  'spelling-short-vowel':variant=>{
    const row=rowFor([
      {direct:'map',directWrong:['mep','mip'],transfer:'sun',transferWrong:['sen','sin'],error:'lip',wrong:'lep'},
      {direct:'fin',directWrong:['fen','fon'],transfer:'log',transferWrong:['lag','lug'],error:'cup',wrong:'cop'}
    ],variant);
    return directTransferReasoning(
      {
        prompt:'Which spelling correctly shows the word “'+row.direct+'”?',
        choices:[row.direct,...row.directWrong],
        answer:row.direct,
        explanation:'Match the middle letter to the short vowel sound.'
      },
      {
        prompt:'Which spelling correctly shows “'+row.transfer+'”?',
        choices:[row.transfer,...row.transferWrong],
        answer:row.transfer,
        explanation:'Listen carefully to the middle vowel.'
      },
      {
        prompt:'A student writes “'+row.wrong+'” for “'+row.error+'.” What should be checked first?',
        choices:['The middle vowel sound.','Whether the word needs -es.','Whether the first consonant is silent.'],
        answer:'The middle vowel sound.',
        explanation:'The spellings differ at the vowel that represents the middle sound.'
      }
    );
  },

  'vocabulary-definition':variant=>{
    const row=rowFor([
      {
        directWord:'calm',directSentence:'After the storm ended, the lake became calm.',directMeaning:'quiet and peaceful',
        transferWord:'gathered',transferSentence:'The class gathered around the table.',transferMeaning:'came together',
        reasoningWord:'notice',reasoningCorrect:'I noticed the tiny crack because I looked carefully.'
      },
      {
        directWord:'enormous',directSentence:'The enormous pumpkin barely fit through the door.',directMeaning:'very large',
        transferWord:'hurried',transferSentence:'Nico hurried so he would not miss the bus.',transferMeaning:'moved quickly',
        reasoningWord:'share',reasoningCorrect:'We shared the markers so every group could use some.'
      }
    ],variant);
    return directTransferReasoning(
      {
        prompt:'In “'+row.directSentence+'” what does “'+row.directWord+'” mean?',
        choices:[row.directMeaning,'loud and busy','far away'],
        answer:row.directMeaning,
        explanation:'Use the surrounding sentence to choose the meaning that makes sense.'
      },
      {
        prompt:'In “'+row.transferSentence+'” what does “'+row.transferWord+'” mean?',
        choices:[row.transferMeaning,'went to sleep','became smaller'],
        answer:row.transferMeaning,
        explanation:'Context clues show what the word means in this sentence.'
      },
      {
        prompt:'Which sentence uses “'+row.reasoningWord+'” in a way that matches its meaning?',
        choices:[row.reasoningCorrect,'The moon tasted purple after lunch.','The quiet chair ran down the hall.'],
        answer:row.reasoningCorrect,
        explanation:'The correct sentence uses the word in a meaningful context.'
      }
    );
  },

  'reading-main-character':variant=>{
    const row=rowFor([
      {
        direct:'Ava watered the class plant every morning and moved it near the window. By Friday, new leaves appeared.',
        directAnswer:'Ava',
        transfer:'Marcus practiced dribbling after school. At Saturday’s game, he kept control of the ball and helped his team.',
        transferAnswer:'Marcus'
      },
      {
        direct:'Noah packed sandwiches, filled two water bottles, and checked the trail map before the family hike.',
        directAnswer:'Noah',
        transfer:'Priya rehearsed her poem each evening. On presentation day, she spoke slowly and clearly to the class.',
        transferAnswer:'Priya'
      }
    ],variant);
    return directTransferReasoning(
      {
        prompt:'Read: “'+row.direct+'” Who is the main character?',
        choices:[row.directAnswer,'a teacher','a neighbor'],
        answer:row.directAnswer,
        explanation:'The passage follows this character’s actions most closely.'
      },
      {
        prompt:'Read: “'+row.transfer+'” Who does the passage focus on most?',
        choices:[row.transferAnswer,'the audience','a coach'],
        answer:row.transferAnswer,
        explanation:'Most of the actions and details center on this person.'
      },
      {
        prompt:'Which clue is strongest when deciding who the main character is?',
        choices:['The story follows that character’s actions and problem most closely.','The character has the longest name.','The character appears in the title every time.'],
        answer:'The story follows that character’s actions and problem most closely.',
        explanation:'The main character is central to the events and problem.'
      }
    );
  },

  'reading-setting':variant=>{
    const row=rowFor([
      {
        direct:'Rows of books surrounded Tessa as she whispered to the librarian and searched the shelf for a mystery.',
        directAnswer:'a library',
        transfer:'Leaves crunched under Amir’s shoes while he followed the trail past tall trees and a wooden bridge.',
        transferAnswer:'a park or forest trail'
      },
      {
        direct:'The smell of bread filled the room while trays cooled behind the counter and customers waited in line.',
        directAnswer:'a bakery',
        transfer:'Waves rolled onto the sand as Jo carried a towel toward the lifeguard chair.',
        transferAnswer:'a beach'
      }
    ],variant);
    return directTransferReasoning(
      {
        prompt:'Read: “'+row.direct+'” What is the setting?',
        choices:[row.directAnswer,'a farm','a bus stop'],
        answer:row.directAnswer,
        explanation:'Place details in the passage identify where the events happen.'
      },
      {
        prompt:'Read: “'+row.transfer+'” Where is the character most likely?',
        choices:[row.transferAnswer,'a classroom','a grocery store'],
        answer:row.transferAnswer,
        explanation:'The surrounding details point to that location.'
      },
      {
        prompt:'What evidence should you use to identify a story’s setting?',
        choices:['Details that reveal where or when events happen.','The number of characters.','The length of the title.'],
        answer:'Details that reveal where or when events happen.',
        explanation:'Setting is the time and place of the story.'
      }
    );
  },

  'reading-character-motivation':variant=>{
    const row=rowFor([
      {
        direct:'Eli found a wallet near the playground and carried it to the school office.',
        directWhy:'He wanted to help return it to its owner.',
        transfer:'Nora packed an umbrella after seeing dark clouds before school.',
        transferWhy:'She wanted to be ready if it rained.'
      },
      {
        direct:'Zoe saw her partner struggling with a heavy box, so she grabbed the other side.',
        directWhy:'She wanted to help her partner carry it.',
        transfer:'Caleb set an alarm before bed because the class trip bus left early.',
        transferWhy:'He wanted to wake up in time for the trip.'
      }
    ],variant);
    return directTransferReasoning(
      {
        prompt:'Read: “'+row.direct+'” Why did the character act that way?',
        choices:[row.directWhy,'The character wanted to make the problem harder.','The character forgot what was happening.'],
        answer:row.directWhy,
        explanation:'Use the situation and action together to infer the reason.'
      },
      {
        prompt:'Read: “'+row.transfer+'” What most likely motivated that choice?',
        choices:[row.transferWhy,'The character wanted to lose the item.','The character was trying to miss school.'],
        answer:row.transferWhy,
        explanation:'The surrounding clues explain why the character acted.'
      },
      {
        prompt:'Which evidence is most useful for explaining a character’s motivation?',
        choices:['Actions, words, and the situation around the character.','Only the character’s name.','Only the number of paragraphs.'],
        answer:'Actions, words, and the situation around the character.',
        explanation:'Motivation is inferred from what the character does, says, and experiences.'
      }
    );
  },

  'reading-genre':variant=>{
    const row=rowFor([
      {
        direct:'A made-up story follows a child who forgets a lunchbox and finds it in the classroom later.',
        directAnswer:'realistic fiction',
        transfer:'A text explains how bees carry pollen from flower to flower.',
        transferAnswer:'informational',
        fantasy:'A backpack begins talking and gives its owner directions.'
      },
      {
        direct:'A made-up story follows two friends building a snow fort after school.',
        directAnswer:'realistic fiction',
        transfer:'A text gives facts about how volcanoes form.',
        transferAnswer:'informational',
        fantasy:'A dragon enrolls in second grade and writes homework with its tail.'
      }
    ],variant);
    return directTransferReasoning(
      {
        prompt:row.direct+' What genre best fits?',
        choices:[row.directAnswer,'fantasy','biography'],
        answer:row.directAnswer,
        explanation:'The story is invented but the events could happen in real life.'
      },
      {
        prompt:row.transfer+' What genre best fits?',
        choices:[row.transferAnswer,'fantasy','realistic fiction'],
        answer:row.transferAnswer,
        explanation:'The text is explaining facts about a real topic.'
      },
      {
        prompt:'Which example most strongly signals fantasy?',
        choices:[row.fantasy,'A family eats dinner together.','A child walks to school.'],
        answer:row.fantasy,
        explanation:'An impossible event is a strong clue that a story is fantasy.'
      }
    );
  },

  'religion-trinity':variant=>{
    const row=rowFor([
      {direct:'Which statement best describes the Trinity?',transfer:'Which names identify the three Persons of the Trinity?'},
      {direct:'Which sentence matches the Christian teaching about one God in three Persons?',transfer:'Which group belongs together in a lesson about the Trinity?'}
    ],variant);
    return directTransferReasoning(
      {
        prompt:row.direct,
        choices:['One God in three Persons: Father, Son, and Holy Spirit.','Three separate gods.','One Person with three unrelated jobs.'],
        answer:'One God in three Persons: Father, Son, and Holy Spirit.',
        explanation:'The Trinity teaches one God in three divine Persons.'
      },
      {
        prompt:row.transfer,
        choices:['Father, Son, and Holy Spirit','Teacher, student, and principal','Angel, prophet, and king'],
        answer:'Father, Son, and Holy Spirit',
        explanation:'Those are the three Persons named in the Trinity.'
      },
      {
        prompt:'Why is “three separate gods” different from the Trinity?',
        choices:['The Trinity teaches one God, not three gods.','The Trinity has only two Persons.','The Trinity means three separate religions.'],
        answer:'The Trinity teaches one God, not three gods.',
        explanation:'Christian teaching describes one God in three Persons.'
      }
    );
  },

  'religion-gifts':variant=>{
    const row=rowFor([
      {
        direct:'A student is good at music. Which action best uses that gift to help others?',
        directAnswer:'Playing a cheerful song for residents at a care home.',
        transfer:'A student is good at math. Which action best uses that gift to serve someone?',
        transferAnswer:'Helping a classmate understand a practice problem.'
      },
      {
        direct:'A student enjoys drawing. Which action best uses that gift kindly?',
        directAnswer:'Making a welcome card for a new student.',
        transfer:'A student is a patient reader. Which action best uses that gift to help?',
        transferAnswer:'Reading a story with a younger child.'
      }
    ],variant);
    return directTransferReasoning(
      {
        prompt:row.direct,
        choices:[row.directAnswer,'Using the skill only to brag.','Refusing to use the skill when help is needed.'],
        answer:row.directAnswer,
        explanation:'A gift can be used to help and encourage another person.'
      },
      {
        prompt:row.transfer,
        choices:[row.transferAnswer,'Hiding the skill from everyone.','Using the skill only when a prize is offered.'],
        answer:row.transferAnswer,
        explanation:'The ability is being used in service of someone else.'
      },
      {
        prompt:'Why can ordinary talents be treated as gifts in a religion lesson?',
        choices:['They can be received gratefully and used to love and serve others.','They make one person more important than everyone else.','They matter only when they win a prize.'],
        answer:'They can be received gratefully and used to love and serve others.',
        explanation:'The lesson connects gifts with gratitude, love, and service.'
      }
    );
  },

  'religion-choice-love':variant=>{
    const row=rowFor([
      {
        direct:'A classmate drops a stack of papers. Which choice best shows love?',
        directAnswer:'Stop and help pick them up.',
        transfer:'A new student is alone at recess. Which choice best shows kindness?',
        transferAnswer:'Invite the student to join the game.'
      },
      {
        direct:'Someone at lunch cannot open a container. Which choice best shows care?',
        directAnswer:'Offer to help politely.',
        transfer:'Two classmates want the same classroom tool. Which choice best shows fairness?',
        transferAnswer:'Take turns using it.'
      }
    ],variant);
    return directTransferReasoning(
      {
        prompt:row.direct,
        choices:[row.directAnswer,'Laugh and walk away.','Make the problem worse.'],
        answer:row.directAnswer,
        explanation:'A loving choice responds to another person’s need.'
      },
      {
        prompt:row.transfer,
        choices:[row.transferAnswer,'Ignore the other person completely.','Tell the other person to leave.'],
        answer:row.transferAnswer,
        explanation:'Kindness and fairness are shown through choices and actions.'
      },
      {
        prompt:'Why do choices matter in a lesson about loving others?',
        choices:['Choices are one way people put love into action.','Choices matter only when an adult is watching.','The best choice is always the easiest one.'],
        answer:'Choices are one way people put love into action.',
        explanation:'Love is demonstrated through what people choose to do.'
      }
    );
  }
});

export function buildEquivalentQuestionSpecs(generatorKey,variant=1){
  const factory=FACTORIES[generatorKey];
  if(!factory) return null;
  return factory(variant);
}

export function supportedEquivalentGenerators(){
  return Object.keys(FACTORIES).sort();
}
