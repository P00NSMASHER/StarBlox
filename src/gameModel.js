const SOURCE = 'ABVM Grade 2 current source pack';

export const spelling = ['went','tell','pet','job','fog','not','tug','hut','tub','bun','fix','has'];
export const sight = ['put','why','blue','help','for','yellow','both','there','even','ball','or','green','how','little','one','see','sounds','funny','find','could'];

export const vocab = [
  ['language','words and signs people use to communicate'],
  ['culture','traditions, foods, music, stories, and ways of life shared by a group'],
  ['aside','to one side or away from the main position'],
  ['invited','asked to come to an event or join an activity'],
  ['share','let someone else use, have, or enjoy part of something'],
  ['fair','reasonable, just, and treating people appropriately'],
  ['plead','ask very strongly or earnestly'],
  ['scurries','moves quickly with short, fast steps']
];

export const religion = [
  ['God made people in his image and likeness.','People can think, choose, and love.'],
  ['The Trinity is one God in Three Persons.','Father, Son, and Holy Spirit'],
  ['Creation is a gift from God.','We show gratitude by caring for creation.'],
  ['Jesus is God’s greatest gift to us.','Jesus shows us God’s love and gives us new life.'],
  ['Grace is the new life Jesus gives us.','Grace helps us live as children of God.']
];

export const stories = [
  {
    id:'new-student',
    text:'Maya noticed a new student sitting alone at lunch. She felt nervous, but remembered her teacher saying that small kindness can make a big difference. Maya walked over, smiled, and invited the student to sit with her. By the end of lunch, they were laughing about their favorite books.',
    main:'A small act of kindness can help someone feel included.',
    evidence:'Maya invites the new student to sit with her and they end up laughing together.',
    infer:'Maya is thoughtful and brave enough to act even when she feels nervous.',
    character:'Maya walks over and invites the new student even though she feels nervous.'
  },
  {
    id:'family-recipe',
    text:'Ana brought a family recipe to school. At first she worried classmates might think the food looked strange. When classmates asked kind questions, Ana explained how her grandmother taught her the recipe. Soon several children wanted to try it.',
    main:'Respectful curiosity can help people share their culture.',
    evidence:'Ana explains the family recipe after classmates ask kind questions.',
    infer:'Ana becomes more confident when her classmates show respect.',
    character:'Ana explains the recipe after her classmates ask kind questions.'
  },
  {
    id:'park-care',
    text:'After a picnic, Zoe notices paper near a tree. Nobody tells her to pick it up, but she puts it in the trash because she wants the park to stay clean.',
    main:'Caring for creation can be a choice you make on your own.',
    evidence:'Zoe picks up the paper even though nobody tells her to.',
    infer:'Zoe feels responsible for caring for creation.',
    character:'Zoe picks up the paper without being told.'
  },
  {
    id:'crayons',
    text:'During art, Mateo has many crayons and Priya has only two. Mateo offers half of his crayons so they can both finish their pictures.',
    main:'Sharing can help everyone take part.',
    evidence:'Mateo gives Priya some crayons so both children can finish.',
    infer:'Mateo is fair and generous.',
    character:'Mateo offers half of his crayons to Priya.'
  }
];

export const roomTiers = [
  {id:1,name:'Tiny Starter Studio',worth:0,blurb:'Small room. Huge dreams.'},
  {id:2,name:'Cozy Loft',worth:500,blurb:'Warm, comfy, and yours.'},
  {id:3,name:'Creator Bedroom',worth:1500,blurb:'A room built for big ideas.'},
  {id:4,name:'Skyline Penthouse',worth:4000,blurb:'You can see your whole world from here.'},
  {id:5,name:'Star Mansion',worth:8500,blurb:'The ultimate Brightside home.'}
];

export const collections = [
  ['tops','Tops','avatar'],['bottoms','Bottoms','avatar'],['shoes','Shoes','avatar'],
  ['headwear','Hair & Hats','avatar'],['facegear','Face & Glasses','avatar'],['backgear','Back Gear','avatar'],
  ['handgear','Hand Gear','avatar'],['auras','Auras','avatar'],['companions','Buddies','companion'],
  ['beds','Beds','room'],['seating','Seating','room'],['desks','Desks & Tech','room'],
  ['lighting','Lighting','room'],['wall','Wall Decor','room'],['rugs','Rugs','room'],['decor','Room Decor','room']
];

const themes = ['Cloud Pop','Pixel Party','Berry Blast','Garden Glow','Galaxy Glow','Sunny Pop','Aqua Wave','Art Attack','Star Luxe','Midnight Neon','Candy Core','Adventure Club'];

const itemKinds = {
  tops:['Hoodie','Zip Hoodie','Varsity Tee','Bow Cardigan','Crewneck','Gamer Jacket','Colorblock Hoodie','Puffer Vest','Art Smock','Star Bomber','Cloud Jacket','Star Coat'],
  bottoms:['Jeans','Joggers','Cargo Pants','Pleat Skirt','Overalls','Star Leggings','Sport Shorts','Wide-Leg Pants','Patch Jeans','Utility Skirt','Glitter Cargo','Star Trousers'],
  shoes:['Sneakers','Slip-Ons','High-Tops','Bow Shoes','Boots','Runners','Chunky Sneakers','Trainers','Paint Kicks','Light Shoes','Platform Sneakers','Star Boots'],
  headwear:['Headband','Cloud Clips','Pixel Cap','Berry Bow','Flower Crown','Gamer Headset','Bucket Hat','Star Clips','Pencil Crown','Cat Ears','Halo Headband','Crystal Crown'],
  facegear:['Reader Glasses','Heart Shades','Gamer Visor','Sparkle Freckles','Petal Paint','Star Shades','Smile Specs','Bubble Frames','Splatter Cheeks','Lightning Glasses','Gem Frames','Star Mask'],
  backgear:['Backpack','Mini Pack','Controller Pack','Bunny Bag','Leaf Pack','Rocket Pack','Skate Pack','Bubble Tank','Art Supply Pack','Wing Pack','Cloud Wings','Star Wings'],
  handgear:['Star Pencil Wand','Cloud Pop Fidget','Pixel Cube','Berry Mochi Pal','Sprout Wand','Comet Staff','Sunny Spinner','Bubble Wand','Paint Roller','Neon Glow Stick','Dream Sparkle Scepter','Luxe Star Staff'],
  auras:['Soft Sparkles','Cloud Puffs','Pixel Bits','Berry Hearts','Garden Fireflies','Galaxy Orbit','Sunny Rays','Aqua Bubbles','Art Confetti','Neon Trail','Dream Aurora','Luxe Starstorm'],
  companions:['Sprout Pup','Moon Cat','Berry Bunny','Sunny Bird','Pebble Turtle','Comet Fox','Story Owl','Bubble Axolotl','Garden Snail','Pixel Bot','Dream Dragon','Star Unicorn'],
  beds:['Starter Bed','Cloud Bed','Pixel Bunk','Berry Daybed','Garden Canopy','Galaxy Gamer Bed','Sunny Loft Bed','Aqua Bubble Bed','Art Studio Bed','Neon Pod Bed','Dream Princess Loft','Luxe Star Canopy'],
  seating:['Floor Cushion','Cloud Pouf','Pixel Beanbag','Heart Chair','Reading Chair','Gamer Chair','Lounge Chair','Bubble Seat','Art Stool','Pod Chair','Moon Chair','Throne Chair'],
  desks:['Tiny Homework Desk','Cloud Study Desk','Pixel Mini Setup','Berry Vanity Desk','Garden Book Desk','Galaxy Gamer Setup','Sunny Creator Desk','Aqua Study Station','Art Maker Table','Neon Streaming Desk','Dream Creator Station','Luxe Command Desk'],
  lighting:['Starter Lamp','Cloud Lamp','Pixel Cube Light','Heart Lamp','Vine Light','Planet Lamp','Sun Lamp','Bubble Lamp','Color Lamp','Neon Strip Tower','Aurora Light','Crystal Chandelier'],
  wall:['School Star Poster','Cloud Wall Flag','Pixel Scoreboard','Heart Gallery','Garden Garland','Planet Map','Skate Poster','Ocean Window','Art Gallery Wall','Neon City Sign','Star Mirror','Golden Crest'],
  rugs:['Starter Mat','Cloud Rug','Pixel Grid Rug','Heart Rug','Leaf Rug','Orbit Rug','Checker Rug','Wave Rug','Splash Rug','Neon Grid Rug','Dream Cloud Rug','Luxe Star Rug'],
  decor:['Book Crate','Cloud Shelf','Arcade Mini','Plush Stack','Plant Wall','Telescope','Skate Rack','Mini Aquarium','Easel Set','Mini Fridge','Dream Vanity Set','Trophy Wall']
};

const prices = [30,45,65,85,125,175,240,330,460,640,880,1200];

export const store = collections.flatMap(([collectionId,collectionName,type],ci) =>
  itemKinds[collectionId].map((name,i) => ({
    id: collectionId + '-' + (i+1),
    collectionId,
    collectionName,
    type,
    name,
    price: prices[i] + (type === 'room' ? Math.round(prices[i] * 0.45) : 0),
    tier: i < 3 ? 1 : i < 6 ? 2 : i < 9 ? 3 : i < 11 ? 4 : 5,
    theme: themes[(i + ci * 3) % themes.length],
    starReq: [0,0,2,5,9][i < 3 ? 0 : i < 6 ? 1 : i < 9 ? 2 : i < 11 ? 3 : 4],
    image: ''
  }))
);

const vowels = {went:'e',tell:'e',pet:'e',job:'o',fog:'o',not:'o',tug:'u',hut:'u',tub:'u',bun:'u',fix:'i',has:'a'};
const rhymes = {went:'sent',tell:'bell',pet:'jet',job:'rob',fog:'dog',not:'hot',tug:'bug',hut:'cut',tub:'rub',bun:'sun',fix:'mix',has:'jazz'};
const vowelExamples = {
  a:['cat','map','jam'],
  e:['hen','red','web'],
  i:['pig','sit','fin'],
  o:['mop','log','top'],
  u:['cup','sun','mud']
};

const spellingSentences = {
  went:'We went to the park after lunch.',
  tell:'Please tell me your favorite book.',
  pet:'My dog is my pet.',
  job:'My job is to put the books away.',
  fog:'The fog made the road hard to see.',
  not:'I am not finished yet.',
  tug:'Give the rope a gentle tug.',
  hut:'The little hut had a wooden door.',
  tub:'The baby splashed in the tub.',
  bun:'She put the warm bun on a plate.',
  fix:'I will fix the broken toy.',
  has:'Mia has a blue backpack.'
};

const sightSentences = {
  put:'Please put your book on the desk.',
  why:'Why did the lights turn off?',
  blue:'The clear sky looked blue.',
  help:'Dad came to help me reach the shelf.',
  for:'This card is for Mom.',
  yellow:'The banana was bright yellow.',
  both:'Lena and Mia both finished their books.',
  there:'Set the backpack over there.',
  even:'Even Ben tried the carrots.',
  ball:'The children kicked the ball.',
  or:'Would you like red or blue?',
  green:'The leaf was bright green.',
  how:'How did you solve it?',
  little:'The little puppy fit in my lap.',
  one:'Only one cookie is left.',
  see:'I can see a bird.',
  sounds:'I heard strange sounds outside.',
  funny:'The joke was funny.',
  find:'I need to find my pencil.',
  could:'We could go outside later.'
};

const vocabSituations = {
  language:'Two friends use words and signs to understand one another.',
  culture:'A family teaches children its songs, foods, stories, and traditions.',
  aside:'Eli moves his chair to one side so the doorway is clear.',
  invited:'Nora receives a note asking her to come to a party.',
  share:'Two children divide crayons so both can color.',
  fair:'Both players follow the same rule and each gets a turn.',
  plead:'A child says, “Please, please give me one more chance!”',
  scurries:'A mouse races under the couch in quick little steps.'
};

const vocabTransfers = {
  language:'A child learns signs to communicate with a classmate.',
  culture:'A family celebrates with traditional music and foods.',
  aside:'Maya steps to the side so a cart can pass.',
  invited:'Jada gets a message asking her to join the game.',
  share:'Ben lets a friend use half of his markers.',
  fair:'Two players get the same number of turns under the agreed rule.',
  plead:'A child begs earnestly for one more chance.',
  scurries:'A squirrel darts across the yard in quick little steps.'
};

function seedRandom(seed){
  let x = seed * 9301 + 49297;
  return () => {
    x = (x * 233280 + 49297) % 233280;
    return x / 233280;
  };
}

export function shuffle(items, rng=Math.random){
  const a = [...items];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(rng() * (i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function makeQuestion(id,subject,district,skill,role,prompt,choices,answer,explanation,hint,difficulty,reward){
  return {id,subject,district,skill,role,prompt,choices,answer,explanation,hint,difficulty,reward,source:SOURCE};
}

function choiceLetters(correct, pool, count=2){
  return [correct, ...pool.filter(x => x !== correct).slice(0,count)];
}

export function buildQuestions(){
  const q = [];

  spelling.forEach((word,i) => {
    const vowel = vowels[word];
    const otherVowels = ['a','e','i','o','u'].filter(v => v !== vowel);
    q.push(makeQuestion(
      'spell-vowel-' + word,'Reading','Lantern Lane','spelling','practice',
      'Which vowel letter is in the middle of “' + word + '”?',
      choiceLetters(vowel, otherVowels),vowel,
      'The middle vowel in “' + word + '” is “' + vowel + '.”',
      'Say the word slowly and look at the middle letter.',1,7
    ));

    const first = word[0];
    const firstPool = ['b','f','h','j','m','n','p','t','w'].filter(x => x !== first);
    q.push(makeQuestion(
      'spell-first-' + word,'Reading','Lantern Lane','spelling','review',
      'Which letter begins the word “' + word + '”?',
      choiceLetters(first, firstPool.slice(i % 4)),first,
      '“' + word + '” begins with “' + first + '.”',
      'Look at the first letter.',1,7
    ));

    const last = word[word.length-1];
    const lastPool = ['b','g','l','n','s','t','x'].filter(x => x !== last);
    q.push(makeQuestion(
      'spell-last-' + word,'Reading','Lantern Lane','spelling','review',
      'Which letter ends the word “' + word + '”?',
      choiceLetters(last, lastPool.slice(i % 3)),last,
      '“' + word + '” ends with “' + last + '.”',
      'Look at the final letter.',1,7
    ));

    const rhyme = rhymes[word];
    const rhymeDistractors = ['cap','bed','fish','moon','cake'].filter(x => x !== rhyme);
    q.push(makeQuestion(
      'rhyme-' + word,'Reading','Lantern Lane','phonics','transfer',
      'Which word rhymes with “' + word + '”?',
      [rhyme, rhymeDistractors[i % rhymeDistractors.length], rhymeDistractors[(i+2) % rhymeDistractors.length]],
      rhyme,
      '“' + rhyme + '” and “' + word + '” share the same ending sound.',
      'Say the words aloud and listen to their endings.',2,9
    ));

    const soundAnswer = vowelExamples[vowel][i % 3];
    const otherKeys = ['a','e','i','o','u'].filter(v => v !== vowel);
    const d1 = vowelExamples[otherKeys[0]][i % 3];
    const d2 = vowelExamples[otherKeys[1]][(i+1) % 3];
    q.push(makeQuestion(
      'sound-' + word,'Reading','Lantern Lane','phonics','practice',
      'Which word has the same short-vowel sound as “' + word + '”?',
      [soundAnswer,d1,d2],soundAnswer,
      '“' + soundAnswer + '” has the same short-' + vowel + ' sound as “' + word + '.”',
      'Stretch the middle sound in each word.',2,8
    ));

    const altWord = spelling.find(x => vowels[x] !== vowel);
    q.push(makeQuestion(
      'vowel-listen-' + word,'Reading','Lantern Lane','phonics','diagnose',
      'A reader mixed up “' + altWord + '” and “' + word + '.” Which sound should the reader listen to most carefully?',
      ['the middle vowel sound','the first sound','the final sound'],
      'the middle vowel sound',
      'The middle vowel sound is the clearest difference between these two short-vowel words.',
      'Listen to the sound in the center of each word.',3,10
    ));

    const sameVowelWords = spelling.filter(x => x !== word && vowels[x] === vowel);
    const contextDistractors = sameVowelWords.length >= 2 ? sameVowelWords.slice(0,2) : spelling.filter(x => x !== word).slice(0,2);
    q.push(makeQuestion(
      'context-' + word,'Reading','Lantern Lane','word-meaning','practice',
      'Which word completes the sentence? “' + spellingSentences[word].replace(new RegExp('\\b' + word + '\\b','i'),'_____') + '”',
      [word,...contextDistractors],word,
      '“' + word + '” makes the sentence meaningful and grammatically complete.',
      'Read the whole sentence with each choice.',2,8
    ));
  });

  sight.forEach((word,i) => {
    const distractors = sight.filter(x => x !== word);
    q.push(makeQuestion(
      'hfw-recognize-' + word,'Reading','Lantern Lane','high-frequency-words','diagnose',
      'Find this week’s word: “' + word + '”',
      [word,distractors[(i+3)%distractors.length],distractors[(i+8)%distractors.length]],word,
      'You matched every letter in “' + word + '.”',
      'Check the letters from left to right.',1,7
    ));

    const cloze = sightSentences[word].replace(new RegExp('\\b' + word + '\\b','i'),'_____');
    q.push(makeQuestion(
      'hfw-cloze-' + word,'Reading','Lantern Lane','high-frequency-words','practice',
      'Which word completes the sentence? “' + cloze + '”',
      [word,distractors[(i+5)%distractors.length],distractors[(i+11)%distractors.length]],word,
      '“' + word + '” makes the sentence sound right and mean the right thing.',
      'Read the entire sentence aloud with each choice.',2,8
    ));

    q.push(makeQuestion(
      'hfw-use-' + word,'Reading','Lantern Lane','high-frequency-words',i%3===0?'review':'practice',
      'Which sentence uses “' + word + '” correctly?',
      [sightSentences[word],word + ' is a purple yesterday.','I ' + word + ' the quickly chair.'],
      sightSentences[word],
      'The correct sentence uses the word in a complete, meaningful sentence.',
      'Read the whole sentence, not just the target word.',2,8
    ));
  });

  vocab.forEach(([word,meaning],i) => {
    const otherMeanings = vocab.filter(v => v[0] !== word).map(v => v[1]);
    const otherSituations = Object.entries(vocabSituations).filter(([w]) => w !== word).map(([,v]) => v);
    const otherTransfers = Object.entries(vocabTransfers).filter(([w]) => w !== word).map(([,v]) => v);

    q.push(makeQuestion(
      'vocab-definition-' + word,'Reading','Story Street','vocabulary','review',
      'What does “' + word + '” mean?',
      [meaning,otherMeanings[i % otherMeanings.length],otherMeanings[(i+3)%otherMeanings.length]],meaning,
      '“' + word + '” means ' + meaning + '.',
      'Think about the examples you have seen for this word.',2,9
    ));

    q.push(makeQuestion(
      'vocab-situation-' + word,'Reading','Story Street','vocabulary','practice',
      'Which situation best shows the meaning of “' + word + '”?',
      [vocabSituations[word],otherSituations[(i+1)%otherSituations.length],otherSituations[(i+4)%otherSituations.length]],
      vocabSituations[word],
      'That situation matches the current-week meaning of “' + word + '.”',
      'Picture each scene and compare it with the word’s meaning.',3,10
    ));

    q.push(makeQuestion(
      'vocab-transfer-' + word,'Reading','Story Street','vocabulary','transfer',
      'Which new example best fits “' + word + '”?',
      [vocabTransfers[word],otherTransfers[(i+2)%otherTransfers.length],otherTransfers[(i+5)%otherTransfers.length]],
      vocabTransfers[word],
      'This new example uses the same meaning in a different situation.',
      'Look for the new situation that keeps the same meaning.',4,12
    ));
  });

  stories.forEach((story) => {
    q.push(makeQuestion(
      'story-main-' + story.id,'Reading','Story Street','main-idea','practice',
      story.text + '\n\nWhat is the main lesson or idea?',
      [story.main,'The story is mostly about the weather.','The characters should avoid one another.'],
      story.main,
      'The main idea explains what matters across the whole passage.',
      'Ask what changed or mattered most.',4,12
    ));

    q.push(makeQuestion(
      'story-infer-' + story.id,'Reading','Story Street','inference','transfer',
      story.text + '\n\nWhat can you infer?',
      [story.infer,'The characters do not care about anyone else.','Nothing important happens in the passage.'],
      story.infer,
      'The inference combines a text clue with reasonable thinking.',
      'Use what the character does as evidence.',4,12
    ));

    q.push(makeQuestion(
      'story-evidence-' + story.id,'Reading','Story Street','text-evidence','review',
      story.text + '\n\nWhich detail is the strongest evidence for the lesson?',
      [story.evidence,'The passage has several sentences.','The story uses punctuation.'],
      story.evidence,
      'Strong evidence directly supports the lesson.',
      'Choose the detail that proves the idea.',4,12
    ));

    q.push(makeQuestion(
      'story-character-' + story.id,'Reading','Story Street','character-reasoning','transfer',
      story.text + '\n\nWhich action gives the best clue about the character’s thinking?',
      [story.character,'The passage has a beginning and an ending.','The story has words on the page.'],
      story.character,
      'A character’s action can reveal what the character thinks or values.',
      'Choose an action the character actually takes.',4,12
    ));
  });

  religion.forEach(([fact,application],i) => {
    q.push(makeQuestion(
      'religion-' + i,'Religion','Wordwood Garden','religion-unit-1','practice',
      'Which idea best matches this lesson: “' + fact + '”?',
      [application,'People should only care about themselves.','The lesson is mainly about winning games.'],
      application,
      'The correct answer matches the approved Unit 1 lesson.',
      'Think about what the lesson teaches us to understand or do.',3,10
    ));

    const apply = [
      'Stop, think, and choose a kind action.',
      'Remember Father, Son, and Holy Spirit when making the Sign of the Cross.',
      'Pick up litter in the park even when nobody tells you to.',
      'Show love to someone who feels left out.',
      'Choose a loving action even when it is harder.'
    ][i];

    q.push(makeQuestion(
      'religion-transfer-' + i,'Religion','Wordwood Garden','religion-application','transfer',
      'Which real-life choice best applies the lesson “' + fact + '”?',
      [apply,'Grab the biggest share before anyone else can.','Ignore everyone around you.'],
      apply,
      'The correct choice puts the lesson into action.',
      'Look for the choice that matches the lesson, not just a generally pleasant action.',4,12
    ));
  });

  const grammar = [
    ['grammar-0','Which plural is correct for “box”?',['boxes','boxs','boxies'],'boxes','Words ending in x usually add -es.'],
    ['grammar-1','Which plural is correct for “dog”?',['dogs','doges','dogies'],'dogs','Most nouns like dog add -s.'],
    ['grammar-2','Which sentence is a command?',['Please put your book away.','Where is your book?','What a great book!'],'Please put your book away.','A command tells someone to do something.'],
    ['grammar-3','Which sentence is an exclamation?',['That parade was amazing!','Where is the parade?','The parade is today.'],'That parade was amazing!','An exclamation shows strong feeling.'],
    ['grammar-4','Which sentence best SHOWS that a character is nervous?',['Maya’s hands shook as she waited for her turn.','Maya was nervous.','Maya is a person.'],'Maya’s hands shook as she waited for her turn.','Strong writing can show a feeling through an action.'],
    ['grammar-5','Which is a complete sentence?',['The puppy ran home.','Running very fast.','Under the table.'],'The puppy ran home.','A complete sentence tells a complete thought.']
  ];

  grammar.forEach(([id,prompt,choices,answer,explanation],i) => {
    q.push(makeQuestion(
      id,'Reading','Story Street','language',i<2?'practice':'transfer',
      prompt,choices,answer,explanation,'Read each choice and ask what job it is doing.',3,10
    ));
  });

  return q;
}

export function validateQuestionBank(questions=buildQuestions()){
  const issues = [];
  const ids = new Set();

  questions.forEach((question) => {
    if(ids.has(question.id)) issues.push({id:question.id,type:'duplicate-id'});
    ids.add(question.id);

    if(!question.prompt || !question.answer || !question.source) issues.push({id:question.id,type:'missing-required-field'});
    if(new Set(question.choices).size !== question.choices.length) issues.push({id:question.id,type:'duplicate-choice'});
    if(question.choices.filter(choice => choice === question.answer).length !== 1) issues.push({id:question.id,type:'answer-choice-invariant'});
    if(question.choices.length !== 3) issues.push({id:question.id,type:'choice-count'});
  });

  return issues;
}

export function dailyPool(date=Date.now()){
  const all = buildQuestions();
  const day = Math.floor(date / 86400000);
  return shuffle(all, seedRandom(day));
}

export function pickQuest(stats={},count=5,date=Date.now()){
  const pool = dailyPool(date);
  const now = date;

  const scoreFor = (question) => {
    const stat = stats[question.skill] || {seen:0,correct:0,wrong:0,lastSeen:0};
    const dueDays = (now - (stat.lastSeen || 0)) / 86400000;
    return (stat.seen ? 0 : 80) + stat.wrong * 18 - stat.correct * 3 + Math.min(24,Math.max(0,dueDays) * 4) + (question.role === 'transfer' ? 10 : 0) + (question.role === 'review' ? 4 : 0);
  };

  const ranked = [...pool].sort((a,b) => scoreFor(b) - scoreFor(a));
  const picked = [];

  const take = (predicate) => {
    const question = ranked.find(q => !picked.some(p => p.id === q.id) && predicate(q));
    if(question) picked.push(question);
  };

  take(q => q.role === 'transfer');

  ['Lantern Lane','Story Street','Wordwood Garden'].forEach((district) => {
    if(picked.length < count){
      take(q => q.district === district && !picked.some(p => p.skill === q.skill));
    }
  });

  ranked.forEach((question) => {
    if(picked.length < count && !picked.some(p => p.id === question.id) && !picked.some(p => p.skill === question.skill)){
      picked.push(question);
    }
  });

  ranked.forEach((question) => {
    if(picked.length < count && !picked.some(p => p.id === question.id)){
      picked.push(question);
    }
  });

  return picked.slice(0,count);
}

export function roomTier(starWorth){
  return [...roomTiers].reverse().find(tier => starWorth >= tier.worth) || roomTiers[0];
}

export const gameModel = {
  spelling,
  sight,
  vocab,
  religion,
  stories,
  roomTiers,
  collections,
  store,
  buildQuestions,
  validateQuestionBank,
  dailyPool,
  pickQuest,
  roomTier
};
