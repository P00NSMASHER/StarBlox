import { gameModel } from './gameModel';

const VOWELS = Object.freeze({
  went:'e',tell:'e',pet:'e',job:'o',fog:'o',not:'o',tug:'u',hut:'u',tub:'u',bun:'u',fix:'i',has:'a'
});

const VOWEL_EXAMPLES = Object.freeze({
  a:['cat','map','jam'],e:['hen','red','web'],i:['pig','sit','fin'],o:['mop','log','top'],u:['cup','sun','mud']
});

const HFW_RECOGNIZE = Object.freeze({
  put:{prompt:'Which weekly word means to place something somewhere?',choices:['put','find','see']},
  why:{prompt:'Which weekly word asks for a reason?',choices:['why','how','there']},
  blue:{prompt:'Which weekly word names the color of a clear daytime sky?',choices:['blue','green','yellow']},
  help:{prompt:'Which weekly word means to assist someone?',choices:['help','find','see']},
  for:{prompt:'Which weekly word can tell who should receive something?',choices:['for','or','there']},
  yellow:{prompt:'Which weekly word names the color of a ripe banana peel?',choices:['yellow','green','blue']},
  both:{prompt:'Which weekly word means two people or things together?',choices:['both','one','even']},
  there:{prompt:'Which weekly word points to a place away from the speaker?',choices:['there','how','why']},
  even:{prompt:'Which weekly word can show that something was surprising or unexpected?',choices:['even','both','one']},
  ball:{prompt:'Which weekly word names a round toy that can be kicked or thrown?',choices:['ball','blue','little']},
  or:{prompt:'Which weekly word connects two choices?',choices:['or','for','both']},
  green:{prompt:'Which weekly word names the color of fresh grass?',choices:['green','blue','yellow']},
  how:{prompt:'Which weekly word asks about the way something happened?',choices:['how','why','there']},
  little:{prompt:'Which weekly word can describe something small?',choices:['little','funny','yellow']},
  one:{prompt:'Which weekly word names the number that comes before two?',choices:['one','both','even']},
  see:{prompt:'Which weekly word means to notice something with your eyes?',choices:['see','find','help']},
  sounds:{prompt:'Which weekly word names things you can hear?',choices:['sounds','ball','blue']},
  funny:{prompt:'Which weekly word can describe something that makes people laugh?',choices:['funny','little','green']},
  find:{prompt:'Which weekly word means to locate something?',choices:['find','put','see']},
  could:{prompt:'Which weekly word can show that something is possible?',choices:['could','why','both']}
});

const GRAMMAR_ROLE = Object.freeze({
  'grammar-2':'review',
  'grammar-3':'review',
  'grammar-5':'review'
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

function vowelListeningRewrite(question){
  const word = question.id.slice('vowel-listen-'.length);
  const vowel = VOWELS[word];
  if(!vowel) return null;
  const index = Math.max(0,gameModel.spelling.indexOf(word));
  const same = VOWEL_EXAMPLES[vowel][(index + 1) % VOWEL_EXAMPLES[vowel].length];
  const otherVowels = Object.keys(VOWEL_EXAMPLES).filter(candidate => candidate !== vowel);
  const differentOne = VOWEL_EXAMPLES[otherVowels[index % otherVowels.length]][index % 3];
  const differentTwo = VOWEL_EXAMPLES[otherVowels[(index + 2) % otherVowels.length]][(index + 1) % 3];
  const answer = word + ' — ' + same;
  return {
    role:'diagnose',
    skill:'phonics',
    difficulty:2,
    reward:8,
    masteryEligible:false,
    prompt:'Which pair has the same middle vowel sound?',
    choices:[answer,word + ' — ' + differentOne,word + ' — ' + differentTwo],
    answer,
    explanation:'“' + word + '” and “' + same + '” have the same short-' + vowel + ' middle sound.',
    hint:'Say each pair slowly and listen only to the middle sound.'
  };
}

export function hardenDiagnosticQuestion(question,{preserveAnswerPosition=false}={}){
  const originalAnswerIndex = question.choices.indexOf(question.answer);
  let rewrite = null;

  if(question.id.startsWith('vowel-listen-')){
    rewrite = vowelListeningRewrite(question);
  }else if(question.id.startsWith('hfw-recognize-')){
    const word = question.id.slice('hfw-recognize-'.length);
    const item = HFW_RECOGNIZE[word];
    if(item){
      rewrite = {
        role:'diagnose',
        skill:'high-frequency-words',
        difficulty:2,
        reward:8,
        masteryEligible:false,
        prompt:item.prompt,
        choices:item.choices,
        answer:word,
        explanation:'“' + word + '” is the weekly word that matches the meaning in the clue.',
        hint:'Use the meaning clue first, then check the letters in each choice.'
      };
    }
  }else if(GRAMMAR_ROLE[question.id]){
    rewrite = {role:GRAMMAR_ROLE[question.id]};
  }

  if(!rewrite) return question;
  const next = {...question,...rewrite};
  if(preserveAnswerPosition && originalAnswerIndex >= 0 && rewrite.choices){
    return {...next,choices:withAnswerPosition(next.choices,next.answer,originalAnswerIndex)};
  }
  return next;
}

export function hardenDiagnosticBank(questions,{preserveAnswerPosition=false}={}){
  return questions.map(question => hardenDiagnosticQuestion(question,{preserveAnswerPosition}));
}

export function validateDiagnosticBank(questions){
  const issues = previousValidateQuestionBank(questions);
  for(const question of questions){
    if(question.id.startsWith('vowel-listen-')){
      if(question.role !== 'diagnose' || question.skill !== 'phonics') issues.push({id:question.id,type:'vowel-listen-construct-mismatch'});
      if(question.masteryEligible !== false) issues.push({id:question.id,type:'vowel-listen-mastery-risk'});
      if(/which part of the words/i.test(question.prompt)) issues.push({id:question.id,type:'vowel-listen-procedure-giveaway'});
    }
    if(question.id.startsWith('hfw-recognize-')){
      const word = question.id.slice('hfw-recognize-'.length);
      if(!HFW_RECOGNIZE[word]) issues.push({id:question.id,type:'unreviewed-hfw-recognize'});
      if(question.role !== 'diagnose' || question.skill !== 'high-frequency-words') issues.push({id:question.id,type:'hfw-recognize-construct-mismatch'});
      if(question.masteryEligible !== false) issues.push({id:question.id,type:'hfw-recognize-mastery-risk'});
      if(question.prompt.includes('“' + word + '”')) issues.push({id:question.id,type:'hfw-recognize-answer-in-stem'});
    }
    if(GRAMMAR_ROLE[question.id] && question.role !== GRAMMAR_ROLE[question.id]){
      issues.push({id:question.id,type:'grammar-role-mismatch'});
    }
  }
  return issues;
}

gameModel.buildQuestions = () => hardenDiagnosticBank(previousBuildQuestions());
gameModel.dailyPool = (date=Date.now()) => hardenDiagnosticBank(previousDailyPool(date),{preserveAnswerPosition:true});
gameModel.pickQuest = (stats={},count=5,date=Date.now()) => hardenDiagnosticBank(previousPickQuest(stats,count,date),{preserveAnswerPosition:true});
gameModel.validateQuestionBank = (questions=gameModel.buildQuestions()) => validateDiagnosticBank(questions);

export { HFW_RECOGNIZE, VOWELS, VOWEL_EXAMPLES, GRAMMAR_ROLE };
