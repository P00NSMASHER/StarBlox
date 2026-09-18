import { gameModel } from './gameModel';

const HFW_CLOZE = Object.freeze({
  put:{prompt:'Which word completes the sentence so it tells someone to place a book? “Please _____ your book on the desk.”',choices:['put','find','see']},
  why:{prompt:'Which word completes the question so it asks for a reason? “_____ did the lights turn off?”',choices:['why','how','where']},
  blue:{prompt:'Which weekly word names the color in this clue? “The clear daytime sky looked _____.”',choices:['blue','little','funny']},
  help:{prompt:'Which word completes the sentence so it means assist? “I could not lift the box alone, so Dad came to _____ me.”',choices:['help','see','find']},
  for:{prompt:'Which word completes the sentence so it tells who should receive the card? “I made this birthday card _____ Mom.”',choices:['for','from','with']},
  yellow:{prompt:'Which weekly word names the color in this clue? “The ripe banana peel was _____.”',choices:['yellow','little','funny']},
  both:{prompt:'Which word means that Mia and Leo each finished? “Mia and Leo _____ finished their books.”',choices:['both','already','nearly']},
  there:{prompt:'Which word points to a place away from the speaker? “The backpack is across the room. Put it over _____.”',choices:['there','here','now']},
  even:{prompt:'Which word shows that Ben joining in was surprising? “_____ Ben tried the carrots.”',choices:['even','then','only']},
  ball:{prompt:'Which word names the round toy in this clue? “The children kicked the _____ across the field.”',choices:['ball','box','door']},
  or:{prompt:'Which word shows a choice between two drinks? “Would you like milk _____ water?”',choices:['or','and','but']},
  green:{prompt:'Which weekly word names the color in this clue? “The fresh leaf was _____.”',choices:['green','little','funny']},
  how:{prompt:'Which word asks about the way something was done? “_____ did you solve it?”',choices:['how','why','where']},
  little:{prompt:'Which word describes small size? “The _____ puppy fit in my lap.”',choices:['little','funny','blue']},
  one:{prompt:'Which word makes the number clue true? “There were five cookies. Four were eaten, so only _____ is left.”',choices:['one','two','many']},
  see:{prompt:'Which word means notice with your eyes? “I can _____ the bird.”',choices:['see','hear','smell']},
  sounds:{prompt:'Which word names things you can hear? “I heard strange _____ outside.”',choices:['sounds','sights','smells']},
  funny:{prompt:'Which word best explains why everyone laughed? “The joke was _____.”',choices:['funny','quiet','long']},
  find:{prompt:'Which word means locate the missing pencil? “I need to _____ my pencil.”',choices:['find','carry','sharpen']},
  could:{prompt:'Which word shows that going outside is possible, not certain? “We _____ go outside later.”',choices:['could','will','must']}
});

const SPELLING_CONTEXT = Object.freeze({
  went:{prompt:'Which correctly spelled weekly word completes the sentence? “Yesterday, we _____ to the park after lunch.”',choices:['went','wint','wentt']},
  tell:{prompt:'Which correctly spelled weekly word completes the sentence? “Please _____ me your favorite book.”',choices:['tell','tel','tall']},
  pet:{prompt:'Which correctly spelled weekly word completes the sentence? “My dog is my _____.”',choices:['pet','pett','pit']},
  job:{prompt:'Which correctly spelled weekly word completes the sentence? “My _____ is to put the books away.”',choices:['job','jobb','jub']},
  fog:{prompt:'Which correctly spelled weekly word completes the sentence? “The _____ made the road hard to see.”',choices:['fog','fogg','feg']},
  not:{prompt:'Which correctly spelled weekly word completes the sentence? “I am _____ finished yet.”',choices:['not','nott','nut']},
  tug:{prompt:'Which correctly spelled weekly word completes the sentence? “Give the rope a gentle _____.”',choices:['tug','tugg','teg']},
  hut:{prompt:'Which correctly spelled weekly word completes the sentence? “The little _____ had a wooden door.”',choices:['hut','hutt','het']},
  tub:{prompt:'Which correctly spelled weekly word completes the sentence? “The baby splashed in the _____.”',choices:['tub','tubb','tab']},
  bun:{prompt:'Which correctly spelled weekly word completes the sentence? “She put the warm _____ on a plate.”',choices:['bun','bunn','ben']},
  fix:{prompt:'Which correctly spelled weekly word completes the sentence? “I will _____ the broken toy.”',choices:['fix','fixx','fex']},
  has:{prompt:'Which correctly spelled weekly word completes the sentence? “Mia _____ a blue backpack.”',choices:['has','haz','hass']}
});

const previousBuildQuestions = gameModel.buildQuestions.bind(gameModel);
const previousDailyPool = gameModel.dailyPool.bind(gameModel);
const previousPickQuest = gameModel.pickQuest.bind(gameModel);
const previousValidateQuestionBank = gameModel.validateQuestionBank.bind(gameModel);

function withAnswerPosition(choices,answer,index){
  const distractors = choices.filter(choice => choice !== answer);
  const result = [...distractors];
  result.splice(Math.max(0,Math.min(index,result.length)),0,answer);
  return result;
}

export function hardenRemainingSemanticFamilies(question,{preserveAnswerPosition=false}={}){
  const originalAnswerIndex = question.choices.indexOf(question.answer);
  let rewrite = null;
  let metadata = null;

  if(question.id.startsWith('hfw-cloze-')){
    rewrite = HFW_CLOZE[question.id.slice('hfw-cloze-'.length)];
    metadata = {
      skill:'high-frequency-words',
      role:'practice',
      difficulty:2,
      reward:8,
      explanation:'The keyed weekly word is the only choice that matches the meaning named in the question.',
      hint:'Use the meaning clue before you try each word in the sentence.'
    };
  }else if(question.id.startsWith('context-')){
    rewrite = SPELLING_CONTEXT[question.id.slice('context-'.length)];
    metadata = {
      skill:'spelling',
      role:'practice',
      difficulty:2,
      reward:8,
      explanation:'The keyed choice is the correctly spelled weekly word that completes the sentence.',
      hint:'Say the word, then check every letter against the weekly spelling pattern.'
    };
  }

  if(!rewrite) return question;

  const next = {
    ...question,
    ...metadata,
    prompt:rewrite.prompt,
    choices:rewrite.choices,
    answer:rewrite.choices[0]
  };

  if(preserveAnswerPosition && originalAnswerIndex >= 0){
    return {...next,choices:withAnswerPosition(next.choices,next.answer,originalAnswerIndex)};
  }

  return next;
}

export function hardenRemainingSemanticBank(questions,{preserveAnswerPosition=false}={}){
  return questions.map(question => hardenRemainingSemanticFamilies(question,{preserveAnswerPosition}));
}

export function validateSemanticGuardBank(questions){
  const issues = previousValidateQuestionBank(questions);
  for(const question of questions){
    if(question.id.startsWith('hfw-cloze-')){
      const word = question.id.slice('hfw-cloze-'.length);
      if(!HFW_CLOZE[word]) issues.push({id:question.id,type:'unreviewed-hfw-cloze'});
      if(question.skill !== 'high-frequency-words' || question.role !== 'practice') issues.push({id:question.id,type:'hfw-cloze-construct-mismatch'});
    }
    if(question.id.startsWith('context-')){
      const word = question.id.slice('context-'.length);
      if(!SPELLING_CONTEXT[word]) issues.push({id:question.id,type:'unreviewed-spelling-context'});
      if(question.skill !== 'spelling' || question.role !== 'practice') issues.push({id:question.id,type:'spelling-context-construct-mismatch'});
      if(question.choices.filter(choice => choice === word).length !== 1) issues.push({id:question.id,type:'spelling-context-key-mismatch'});
    }
  }
  return issues;
}

gameModel.buildQuestions = () => hardenRemainingSemanticBank(previousBuildQuestions());
gameModel.dailyPool = (date=Date.now()) => hardenRemainingSemanticBank(previousDailyPool(date),{preserveAnswerPosition:true});
gameModel.pickQuest = (stats={},count=5,date=Date.now()) => hardenRemainingSemanticBank(previousPickQuest(stats,count,date),{preserveAnswerPosition:true});
gameModel.validateQuestionBank = (questions=gameModel.buildQuestions()) => validateSemanticGuardBank(questions);

export { HFW_CLOZE, SPELLING_CONTEXT };
