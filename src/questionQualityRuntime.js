import { gameModel } from './gameModel';

const HFW_USE_ITEMS = {
  put:{prompt:'Which sentence tells someone where to place a book?',choices:['Please put the book on the shelf.','Please find the book on the shelf.','Please read the book on the shelf.'],answer:'Please put the book on the shelf.'},
  why:{prompt:'Which question asks for a reason?',choices:['Why are you wearing boots?','Where are your boots?','How did you tie your boots?'],answer:'Why are you wearing boots?'},
  blue:{prompt:'Which sentence describes a crayon’s color?',choices:['The crayon is blue.','The crayon is little.','The crayon is over there.'],answer:'The crayon is blue.'},
  help:{prompt:'Which sentence asks for assistance?',choices:['Can you help me lift this box?','Can you see the box?','Can you put the box down?'],answer:'Can you help me lift this box?'},
  for:{prompt:'Which sentence shows who should receive a gift?',choices:['This gift is for Mia.','This gift is blue.','This gift is over there.'],answer:'This gift is for Mia.'},
  yellow:{prompt:'Which sentence describes a raincoat’s color?',choices:['The raincoat is yellow.','The raincoat is little.','The raincoat is over there.'],answer:'The raincoat is yellow.'},
  both:{prompt:'Which sentence says that Mia and Leo each finished?',choices:['Mia and Leo both finished.','Mia and Leo could finish later.','Mia and Leo started together.'],answer:'Mia and Leo both finished.'},
  there:{prompt:'Which sentence points to a place?',choices:['Put the backpack over there.','The backpack is blue.','The backpack feels heavy.'],answer:'Put the backpack over there.'},
  even:{prompt:'Which sentence uses “even” to show that Ben joining in was surprising?',choices:['Even Ben tried the carrots.','Ben tried both carrots.','Ben tried the carrots there.'],answer:'Even Ben tried the carrots.'},
  ball:{prompt:'Which sentence says what the children kicked?',choices:['The children kicked the ball.','The children saw the ball.','The children found the ball.'],answer:'The children kicked the ball.'},
  or:{prompt:'Which sentence gives a choice between two drinks?',choices:['Would you like milk or water?','Milk and water are both cold.','The water is for Mia.'],answer:'Would you like milk or water?'},
  green:{prompt:'Which sentence describes a leaf’s color?',choices:['The leaf is green.','The leaf is little.','The leaf is over there.'],answer:'The leaf is green.'},
  how:{prompt:'Which question asks about the way something was done?',choices:['How did you build the tower?','Why did you build the tower?','Where did you build the tower?'],answer:'How did you build the tower?'},
  little:{prompt:'Which sentence describes the puppy’s size?',choices:['The puppy is little.','The puppy is funny.','The puppy is over there.'],answer:'The puppy is little.'},
  one:{prompt:'Which sentence tells that exactly one cookie is left?',choices:['One cookie is left.','Some cookies are left.','Both cookies are left.'],answer:'One cookie is left.'},
  see:{prompt:'Which sentence tells what you can notice with your eyes?',choices:['I can see the bird.','I can hear the bird.','I can help the bird.'],answer:'I can see the bird.'},
  sounds:{prompt:'Which sentence names things you can hear?',choices:['I heard strange sounds outside.','I saw bright colors outside.','I smelled warm bread outside.'],answer:'I heard strange sounds outside.'},
  funny:{prompt:'Which sentence tells why everyone laughed at a joke?',choices:['The joke was funny.','The joke was long.','The joke was on the table.'],answer:'The joke was funny.'},
  find:{prompt:'Which sentence says you want to locate a missing pencil?',choices:['I need to find my pencil.','I need to put my pencil away.','I can see my pencil on the desk.'],answer:'I need to find my pencil.'},
  could:{prompt:'Which sentence says going outside is possible?',choices:['We could go outside later.','We went outside yesterday.','We are outside now.'],answer:'We could go outside later.'}
};

const STORY_DISTRACTORS = {
  'new-student':{
    main:['Maya thinks lunch is the best time to read books.','Feeling nervous means you should stay away from new people.'],
    infer:['Maya wants the new student to stay alone.','Maya cares more about books than about people.'],
    evidence:['Maya notices a new student sitting alone.','Maya feels nervous before walking over.']
  },
  'family-recipe':{
    main:['Family traditions should be kept secret at school.','People should only try foods they already know.'],
    infer:['Ana decides she does not want classmates to ask questions.','Ana thinks her grandmother taught the recipe incorrectly.'],
    evidence:['Ana brings a family recipe to school.','Her grandmother taught her the recipe.']
  },
  'park-care':{
    main:['People should care for a park only when someone tells them to.','Trees are the only part of a park worth caring for.'],
    infer:['Zoe thinks litter should stay near the tree.','Zoe picks up the paper only because someone orders her to.'],
    evidence:['The picnic is already over.','The paper is near a tree.']
  },
  crayons:{
    main:['Having more supplies makes one person the best artist.','Priya should finish her picture without any crayons.'],
    infer:['Mateo wants Priya to stop drawing.','Mateo is worried he will run out of paper.'],
    evidence:['Mateo has many crayons.','Priya has only two crayons.']
  }
};

const RELIGION_APPLICATIONS = gameModel.religion.map(([,application]) => application);
const originalBuildQuestions = gameModel.buildQuestions.bind(gameModel);
const originalDailyPool = gameModel.dailyPool.bind(gameModel);
const originalPickQuest = gameModel.pickQuest.bind(gameModel);
const originalValidateQuestionBank = gameModel.validateQuestionBank.bind(gameModel);

function withAnswerPosition(choices,answer,index){
  const distractors = choices.filter(choice => choice !== answer);
  const result = [...distractors];
  result.splice(Math.max(0,Math.min(index,result.length)),0,answer);
  return result;
}

export function hardenQuestion(question,{preserveAnswerPosition=false}={}){
  const originalAnswerIndex = question.choices.indexOf(question.answer);
  let next = question;

  if(question.id.startsWith('hfw-use-')){
    const word = question.id.slice('hfw-use-'.length);
    const item = HFW_USE_ITEMS[word];
    if(item){
      next = {
        ...question,
        role:'practice',
        prompt:item.prompt,
        choices:item.choices,
        answer:item.answer,
        explanation:'“' + word + '” is used in a complete sentence with the meaning the question asks about.',
        hint:'Read each whole sentence and ask what “' + word + '” is doing there.',
        difficulty:2,
        reward:8
      };
    }
  }

  const storyMatch = question.id.match(/^story-(main|infer|evidence)-(.+)$/);
  if(storyMatch){
    const [,family,storyId] = storyMatch;
    const distractors = STORY_DISTRACTORS[storyId]?.[family];
    if(distractors){
      next = {...question,choices:[question.answer,...distractors]};
    }
  }

  const religionMatch = question.id.match(/^religion-(\d)$/);
  if(religionMatch){
    const index = Number(religionMatch[1]);
    const application = RELIGION_APPLICATIONS[index];
    const distractors = RELIGION_APPLICATIONS.filter((_,candidateIndex) => candidateIndex !== index);
    next = {
      ...question,
      prompt:'Which Unit 1 idea goes with this lesson: “' + gameModel.religion[index][0] + '”?',
      choices:[application,distractors[index % distractors.length],distractors[(index + 2) % distractors.length]],
      answer:application,
      explanation:'This idea is the one paired with the approved Unit 1 lesson.',
      hint:'Match the lesson with the Unit 1 idea that explains it.',
      difficulty:2,
      reward:9
    };
  }

  if(preserveAnswerPosition && originalAnswerIndex >= 0 && next !== question){
    return {...next,choices:withAnswerPosition(next.choices,next.answer,originalAnswerIndex)};
  }

  return next;
}

export function hardenQuestionBank(questions,{preserveAnswerPosition=false}={}){
  return questions.map(question => hardenQuestion(question,{preserveAnswerPosition}));
}

export function validateHardenedQuestionBank(questions){
  const issues = originalValidateQuestionBank(questions);

  for(const question of questions){
    if(question.id.startsWith('hfw-use-') && question.choices.some(choice => /purple yesterday|quickly chair/i.test(choice))){
      issues.push({id:question.id,type:'nonsense-hfw-distractor'});
    }
    if(/^story-(main|infer|evidence)-/.test(question.id) && question.choices.some(choice => /mostly about the weather|do not care about anyone|nothing important happens|has several sentences|uses punctuation/i.test(choice))){
      issues.push({id:question.id,type:'generic-story-distractor'});
    }
    if(/^religion-\d$/.test(question.id) && question.choices.some(choice => /winning games|only care about themselves/i.test(choice))){
      issues.push({id:question.id,type:'giveaway-religion-distractor'});
    }
  }

  return issues;
}

gameModel.buildQuestions = () => hardenQuestionBank(originalBuildQuestions());
gameModel.dailyPool = (date=Date.now()) => hardenQuestionBank(originalDailyPool(date),{preserveAnswerPosition:true});
gameModel.pickQuest = (stats={},count=5,date=Date.now()) => hardenQuestionBank(originalPickQuest(stats,count,date),{preserveAnswerPosition:true});
gameModel.validateQuestionBank = (questions=gameModel.buildQuestions()) => validateHardenedQuestionBank(questions);
