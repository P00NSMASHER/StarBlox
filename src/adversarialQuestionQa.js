const DEFAULT_ANTONYM_PAIRS = Object.freeze([
  ['before','after'],
  ['more','less'],
  ['same','different'],
  ['always','never'],
  ['possible','impossible'],
  ['include','exclude'],
  ['kind','unkind'],
  ['clean','dirty'],
  ['first','last'],
  ['correct','incorrect'],
  ['care','ignore']
]);

const ENTITY_STOP_WORDS = new Set([
  'A','An','The','Which','What','Who','Why','How','When','Where','This','That',
  'Unit','We','I','Word','Sentence','Story','Choose'
]);

function escapeRegExp(value){
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
}

function replaceWord(text,from,to){
  return text.replace(new RegExp('\\b' + escapeRegExp(from) + '\\b','i'),to);
}

export function extractCapitalizedEntities(text){
  const matches = String(text || '').match(/\b[A-Z][a-z]{2,}\b/g) || [];
  return [...new Set(matches.filter(token => !ENTITY_STOP_WORDS.has(token)))];
}

export function generateAntonymVariants(question,{pairs=DEFAULT_ANTONYM_PAIRS}={}){
  const prompt = String(question?.prompt || '');
  const variants = [];
  for(const [left,right] of pairs){
    const hasLeft = new RegExp('\\b' + escapeRegExp(left) + '\\b','i').test(prompt);
    const hasRight = new RegExp('\\b' + escapeRegExp(right) + '\\b','i').test(prompt);
    if(hasLeft){
      variants.push({
        kind:'antonym-swap',
        from:left,
        to:right,
        prompt:replaceWord(prompt,left,right),
        expectation:'original-answer-must-be-revalidated'
      });
    }else if(hasRight){
      variants.push({
        kind:'antonym-swap',
        from:right,
        to:left,
        prompt:replaceWord(prompt,right,left),
        expectation:'original-answer-must-be-revalidated'
      });
    }
  }
  return variants;
}

export function generateEntitySwapVariants(question){
  const prompt = String(question?.prompt || '');
  const promptEntities = extractCapitalizedEntities(prompt);
  const choiceEntities = extractCapitalizedEntities((question?.choices || []).join(' '));
  const replacements = choiceEntities.filter(entity => !promptEntities.includes(entity));
  if(!promptEntities.length || !replacements.length) return [];

  return [{
    kind:'entity-swap',
    from:promptEntities[0],
    to:replacements[0],
    prompt:replaceWord(prompt,promptEntities[0],replacements[0]),
    expectation:'original-answer-must-be-revalidated'
  }];
}

function normalized(text){
  return String(text || '').trim().toLowerCase().replace(/\s+/g,' ');
}

export function auditQuestionAdversarially(question){
  const hardFindings = [];
  const softFindings = [];
  const choices = question?.choices || [];
  const normalizedChoices = choices.map(normalized);

  if(new Set(normalizedChoices).size !== normalizedChoices.length){
    hardFindings.push({type:'normalized-duplicate-choice'});
  }
  if(!normalized(question?.answer) || !normalizedChoices.includes(normalized(question?.answer))){
    hardFindings.push({type:'answer-not-in-choices'});
  }

  const answer = normalized(question?.answer);
  const prompt = normalized(question?.prompt);
  if(answer.length >= 4 && prompt.includes(answer)){
    softFindings.push({type:'answer-text-appears-in-prompt'});
  }

  const lengths = choices.map(choice => normalized(choice).length).filter(Boolean);
  if(lengths.length === 3){
    const longest = Math.max(...lengths);
    const shortest = Math.max(1,Math.min(...lengths));
    if(longest / shortest >= 3.5){
      softFindings.push({type:'choice-length-outlier'});
    }
  }

  const variants = [
    ...generateAntonymVariants(question),
    ...generateEntitySwapVariants(question)
  ];

  return {
    hardFindings,
    softFindings,
    variants
  };
}

export { DEFAULT_ANTONYM_PAIRS };
