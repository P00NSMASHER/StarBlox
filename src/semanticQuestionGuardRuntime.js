import { gameModel } from './gameModel';

const HFW_CLOZE = Object.freeze({
  put:{prompt:'Which word completes the sentence? “After reading, please _____ your book back on the shelf.”',choices:['put','find','see']},
  why:{prompt:'Which word asks for a reason? “_____ did the lights turn off?”',choices:['why','when','where']},
  blue:{prompt:'Which word completes the clue? “The crayon is the color of a clear sky: _____.”',choices:['blue','green','yellow']},
  help:{prompt:'Which word completes the sentence? “I could not lift the box alone, so Dad came to _____ me.”',choices:['help','see','find']},
  for:{prompt:'Which word completes the sentence? “This birthday card is _____ Mom; her name is on it.”',choices:['for','from','with']},
  yellow:{prompt:'Which word completes the clue? “The ripe banana is bright _____.”',choices:['yellow','green','blue']},
  both:{prompt:'Which word means the two children each finished? “Lena and Mia _____ finished their books.”',choices:['both','even','there']},
  there:{prompt:'Which word completes the sentence? “The backpack is across the room. Put it over _____.”',choices:['there','here','why']},
  even:{prompt:'Which word shows that Ben joining in was surprising? “_____ Ben tried the carrots.”',choices:['even','both','there']},
  ball:{prompt:'Which word completes the clue? “The children kicked the round toy across the field: the _____.”',choices:['ball','book','box']},
  or:{prompt:'Which word shows you should choose one? “Would you like milk _____ water?”',choices:['or','and','both']},
  green:{prompt:'Which word completes the clue? “The leaf is the color of grass: _____.”',choices:['green','yellow','blue']},
  how:{prompt:'Which word asks about the steps used? “_____ did you solve it?”',choices:['how','why','when']},
  little:{prompt:'Which word means small? “The _____ puppy fit in my lap.”',choices:['little','funny','blue']},
  one:{prompt:'Which word completes the sentence? “There were five cookies. Four were eaten, so only _____ is left.”',choices:['one','both','even']},
  see:{prompt:'Which word means notice with your eyes? “I can _____ the bird.”',choices:['see','find','help']},
  sounds:{prompt:'Which word completes the sentence? “With my ears, I heard strange _____ outside.”',choices:['sounds','colors','ball']},
  funny:{prompt:'Which word means it made people laugh? “The joke was _____.”',choices:['funny','little','blue']},
  find:{prompt:'Which word means locate something that is missing? “I need to _____ my pencil.”',choices:['find','see','put']},
  could:{prompt:'Which word shows something is possible, not certain? “We _____ go outside later.”',choices:['could','went','see']}
});

const SPELLING_CONTEXT = Object.freeze({
  went:{prompt:'Which spelling word completes the sentence? “Yesterday, we _____ to the park after lunch.”',choices:['went','tell','pet']},
  tell:{prompt:'Which spelling word completes the sentence? “Please _____ me your favorite book.”',choices:['tell','went','pet']},
  pet:{prompt:'Which spelling word completes the sentence? “My dog is my _____.”',choices:['pet','tell','went']},
  job:{prompt:'Which spelling word completes the sentence? “My _____ is to put the books away.”',choices:['job','fog','not']},
  fog:{prompt:'Which spelling word completes the sentence? “Thick _____ covered the road, so drivers could not see far.”',choices:['fog','job','not']},
  not:{prompt:'Which spelling word completes the sentence? “I am _____ finished yet.”',choices:['not','job','fog']},
  tug:{prompt:'Which spelling word completes the sentence? “Give the rope a gentle _____.”',choices:['tug','hut','tub']},
  hut:{prompt:'Which spelling word completes the sentence? “The small one-room _____ had a roof and a wooden door.”',choices:['hut','tug','tub']},
  tub:{prompt:'Which spelling word completes the sentence? “The baby splashed in the bathroom _____.”',choices:['tub','tug','hut']},
  bun:{prompt:'Which spelling word completes the sentence? “She put the warm bread _____ on a plate.”',choices:['bun','tug','hut']},
  fix:{prompt:'Which spelling word completes the sentence? “I will _____ the broken toy so it works again.”',choices:['fix','went','tell']},
  has:{prompt:'Which spelling word completes the sentence? “Mia _____ a blue backpack that belongs to her.”',choices:['has','went','tell']}
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

  if(question.id.startsWith('hfw-cloze-')){
    rewrite = HFW_CLOZE[question.id.slice('hfw-cloze-'.length)];
  }else if(question.id.startsWith('context-')){
    rewrite = SPELLING_CONTEXT[question.id.slice('context-'.length)];
  }

  if(!rewrite) return question;

  const next = {
    ...question,
    prompt:rewrite.prompt,
    choices:rewrite.choices,
    answer:rewrite.choices[0],
    explanation:'The keyed word is the only choice that matches the sentence clue and meaning.',
    hint:'Use every clue in the sentence, not just the blank.'
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
    if(question.id.startsWith('hfw-cloze-') && !HFW_CLOZE[question.id.slice('hfw-cloze-'.length)]){
      issues.push({id:question.id,type:'unreviewed-hfw-cloze'});
    }
    if(question.id.startsWith('context-') && !SPELLING_CONTEXT[question.id.slice('context-'.length)]){
      issues.push({id:question.id,type:'unreviewed-spelling-context'});
    }
  }
  return issues;
}

gameModel.buildQuestions = () => hardenRemainingSemanticBank(previousBuildQuestions());
gameModel.dailyPool = (date=Date.now()) => hardenRemainingSemanticBank(previousDailyPool(date),{preserveAnswerPosition:true});
gameModel.pickQuest = (stats={},count=5,date=Date.now()) => hardenRemainingSemanticBank(previousPickQuest(stats,count,date),{preserveAnswerPosition:true});
gameModel.validateQuestionBank = (questions=gameModel.buildQuestions()) => validateSemanticGuardBank(questions);

export { HFW_CLOZE, SPELLING_CONTEXT };
