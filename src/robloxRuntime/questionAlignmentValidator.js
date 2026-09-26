const SUBJECT_STANDARD_PREFIXES=Object.freeze({
  'Reading / ELA':['CCSS.RL.2.','CCSS.RI.2.','CCSS.RF.2.','CCSS.L.2.','STAR.READING.'],
  Math:['CCSS.2.','STAR.MATH.'],
  Religion:['ABVM.RELIGION.']
});

const SKILL_RULES=Object.freeze({
  'sentence-types':{domains:['Language: sentence types'],standards:['CCSS.L.2.1'],anchors:['sentence','question','command','statement']},
  'consonant-blends':{domains:['Word knowledge and skills'],standards:['CCSS.RF.2.3'],anchors:['blend','sound','consonant']},
  'vowel-patterns':{domains:['Word knowledge and skills'],standards:['CCSS.RF.2.3'],anchors:['vowel','sound','long','short']},
  'cvc-structure':{domains:['Word knowledge and skills'],standards:['CCSS.RF.2.3'],anchors:['cvc','consonant','vowel']},
  'plural-nouns':{domains:['Word knowledge and skills'],standards:['CCSS.L.2.1.b'],anchors:['plural','noun','more than one']},
  'vocabulary-in-context':{domains:['Word knowledge and skills'],standards:['CCSS.L.2.4'],anchors:['meaning','sentence','context','word']},
  'context-clues':{domains:['Word knowledge and skills'],standards:['CCSS.L.2.4.a'],anchors:['meaning','context','clue','sentence']},
  'word-parts':{domains:['Word knowledge and skills'],standards:['CCSS.L.2.4.b'],anchors:['prefix','suffix','base','word']},
  'cause-effect':{domains:['Comprehension strategies and constructing meaning'],standards:['CCSS.RI.2.3'],anchors:['cause','effect','why','because']},
  sequence:{domains:['Comprehension strategies and constructing meaning'],standards:['CCSS.RL.2.5'],anchors:['first','next','before','after','last','sequence']},
  theme:{domains:['Analyzing literary text'],standards:['CCSS.RL.2.2'],anchors:['lesson','theme','story','learn']},
  inference:{domains:['Comprehension strategies and constructing meaning'],standards:['CCSS.RL.2.1'],anchors:['infer','clue','suggest','evidence']},
  'text-evidence':{domains:['Comprehension strategies and constructing meaning'],standards:['CCSS.RL.2.1'],anchors:['evidence','detail','prove','support']},
  visualize:{domains:['Comprehension strategies and constructing meaning'],standards:['CCSS.RL.2.1'],anchors:['picture','imagine','describe','visual']},
  'character-development':{domains:['Analyzing literary text'],standards:['CCSS.RL.2.3'],anchors:['character','beginning','ending','change']},
  'author-purpose':{domains:["Understanding author’s craft"],standards:['CCSS.RI.2.6'],anchors:['author','purpose','inform','persuade','entertain','teach']},
  'word-choice':{domains:["Understanding author’s craft"],standards:['CCSS.RL.2.4'],anchors:['word','phrase','meaning','image','feeling']},
  addition:{domains:['Numbers and operations'],standards:['CCSS.2.NBT.B.5'],anchors:['add','sum','total','altogether']},
  'addition-within-100':{domains:['Numbers and operations'],standards:['CCSS.2.NBT.B.5'],anchors:['add','sum','total','tens','ones']},
  subtraction:{domains:['Numbers and operations'],standards:['CCSS.2.NBT.B.5'],anchors:['subtract','difference','left','remain']},
  'subtraction-within-100':{domains:['Numbers and operations'],standards:['CCSS.2.NBT.B.5'],anchors:['subtract','difference','left','tens','ones']},
  'missing-number':{domains:['Algebra','Numbers and operations'],standards:['CCSS.2.OA.A.1'],anchors:['missing','equation','true','number']},
  'missing-addend':{domains:['Algebra','Numbers and operations'],standards:['CCSS.2.OA.A.1'],anchors:['missing','addend','total','equation']},
  'unknown-number':{domains:['Algebra'],standards:['CCSS.2.OA.A.1'],anchors:['unknown','equation','true','number']},
  'addition-word-problem':{domains:['Numbers and operations'],standards:['CCSS.2.OA.A.1'],anchors:['more','altogether','total','add']},
  'subtraction-word-problem':{domains:['Numbers and operations'],standards:['CCSS.2.OA.A.1'],anchors:['left','remain','fewer','difference','subtract']},
  'two-step-word-problem':{domains:['Numbers and operations'],standards:['CCSS.2.OA.A.1'],anchors:['then','first','second','left','more','used']},
  'subtraction-strategy':{domains:['Numbers and operations'],standards:['CCSS.2.OA.B.2'],anchors:['check','addition','subtraction','fact']},
  'place-value':{domains:['Numbers and operations'],standards:['CCSS.2.NBT.A.1'],anchors:['place','hundreds','tens','ones','value']},
  'compare-numbers':{domains:['Numbers and operations'],standards:['CCSS.2.NBT.A.4'],anchors:['compare','greater','less','larger','smaller']},
  patterns:{domains:['Algebra'],standards:['CCSS.2.NBT.A.2'],anchors:['pattern','next','change','sequence']},
  geometry:{domains:['Geometry and measurement'],standards:['CCSS.2.G.A.1'],anchors:['shape','side','vertex','corner']},
  measurement:{domains:['Geometry and measurement'],standards:['CCSS.2.MD.A.1'],anchors:['length','centimeter','inch','measure','unit']},
  time:{domains:['Geometry and measurement'],standards:['CCSS.2.MD.C.7'],anchors:['time','hour','minute','clock']},
  money:{domains:['Geometry and measurement'],standards:['CCSS.2.MD.C.8'],anchors:['coin','cent','dime','nickel','quarter','money']},
  'data-interpretation':{domains:['Data analysis, statistics, and probability'],standards:['CCSS.2.MD.D.10'],anchors:['graph','data','bar','most','least','difference']},
  'probability-language':{domains:['Data analysis, statistics, and probability'],standards:['STAR.MATH.DATA.PROBABILITY'],anchors:['likely','chance','more','less']},
  'fact-family':{domains:['Numbers and operations','Algebra'],standards:['CCSS.2.OA.B.2'],anchors:['fact','family','addition','subtraction']},
  'number-line':{domains:['Geometry and measurement','Numbers and operations'],standards:['CCSS.2.MD.B.6'],anchors:['number line','jump','distance','point']},
  'equal-groups':{domains:['Numbers and operations'],standards:['CCSS.2.OA.C.4'],anchors:['equal groups','rows','same number','total']},
  'fractions-shapes':{domains:['Geometry and measurement'],standards:['CCSS.2.G.A.3'],anchors:['half','third','fourth','equal parts']},
  'religion-application':{domains:['Religion: current lesson application'],standards:['ABVM.RELIGION.CURRENT'],anchors:['lesson','jesus','god','creation','trinity','grace','love']}
});

const RICH_KINDS=new Set(['bar-chart','clock-face','number-line','place-value','shape-fraction']);
const EXPERIMENT_TYPES=new Set(['rich-format','prompt-variant']);

function normalize(value){
  return String(value??'').toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9]+/g,' ').trim();
}
function hasPhrase(text,phrase){
  return normalize(text).includes(normalize(phrase));
}
function tokenSet(text){
  return new Set(normalize(text).split(/\s+/).filter(token=>token.length>=3));
}
function anyPrefix(value,prefixes){
  return prefixes.some(prefix=>String(value).startsWith(prefix));
}
function containsAny(text,anchors){
  const normalized=normalize(text);
  return anchors.some(anchor=>normalized.includes(normalize(anchor)));
}

function validateRubric(question,issues){
  const rubric=question.rubric;
  if(!rubric||rubric.maxPoints!==2){
    issues.push({id:question.id,type:'rubric-missing-or-invalid'});
    return;
  }
  if(!Array.isArray(rubric.criteria)||rubric.criteria.length<2){
    issues.push({id:question.id,type:'rubric-criteria-missing'});
  }
  const partial=rubric.partialCredit||{};
  for(const choice of question.choices||[]){
    if(choice===question.answer) continue;
    const score=partial[choice];
    if(!Number.isInteger(score)||score<0||score>=rubric.maxPoints){
      issues.push({id:question.id,type:'rubric-partial-score-invalid',choice});
    }
  }
}

function validateRichContent(question,issues){
  if(question.richContent==null) return;
  if(typeof question.richContent!=='object'||!RICH_KINDS.has(question.richContent.kind)){
    issues.push({id:question.id,type:'rich-content-kind-invalid'});
    return;
  }
  if(question.richContent.kind==='bar-chart'){
    const bars=question.richContent.bars;
    if(!Array.isArray(bars)||bars.length<3||bars.some(row=>!row?.label||!Number.isFinite(row?.value))){
      issues.push({id:question.id,type:'bar-chart-data-invalid'});
    }
  }
  if(question.richContent.kind==='clock-face'){
    if(!Number.isInteger(question.richContent.hour)||!Number.isInteger(question.richContent.minute)){
      issues.push({id:question.id,type:'clock-data-invalid'});
    }
  }
  if(question.richContent.kind==='number-line'){
    if(!Number.isFinite(question.richContent.start)||!Number.isFinite(question.richContent.end)||question.richContent.end<=question.richContent.start){
      issues.push({id:question.id,type:'number-line-data-invalid'});
    }
  }
}

function validateExperiment(question,issues){
  if(question.experiment==null) return;
  const e=question.experiment;
  if(typeof e!=='object'||!e.id||!EXPERIMENT_TYPES.has(e.type)){
    issues.push({id:question.id,type:'experiment-invalid'});
    return;
  }
  if(!Number.isInteger(e.treatmentPercent)||e.treatmentPercent<5||e.treatmentPercent>10){
    issues.push({id:question.id,type:'experiment-allocation-outside-5-10-percent'});
  }
  if(e.control!=='A'||e.treatment!=='B'){
    issues.push({id:question.id,type:'experiment-variant-label-invalid'});
  }
}

export function validateQuestionAlignment(source){
  const issues=[];
  const questions=Array.isArray(source?.questions)?source.questions:[];
  if(questions.length===0) issues.push({id:'bank',type:'question-bank-empty'});

  for(const question of questions){
    const id=String(question?.id||'unknown');
    const subject=String(question?.subject||'');
    const standards=Array.isArray(question?.standards)?question.standards:[];
    const prefixes=SUBJECT_STANDARD_PREFIXES[subject];
    if(!prefixes){
      issues.push({id,type:'unknown-subject',subject});
      continue;
    }
    if(standards.length===0||standards.some(value=>!anyPrefix(value,prefixes))){
      issues.push({id,type:'standard-subject-mismatch',subject,standards});
    }

    const rule=SKILL_RULES[question.skill];
    if(!rule){
      issues.push({id,type:'unknown-skill',skill:question.skill});
    }else{
      if(!rule.domains.includes(question.domain)){
        issues.push({id,type:'skill-domain-mismatch',skill:question.skill,domain:question.domain});
      }
      if(!rule.standards.some(expected=>standards.includes(expected))){
        issues.push({id,type:'skill-standard-mismatch',skill:question.skill,standards});
      }
      const semanticText=[
        question.prompt,question.explanation,question.hint,question.scaffold,
        question.sourceFact,question.skill,question.domain
      ].join(' ');
      if(!containsAny(semanticText,rule.anchors)){
        issues.push({id,type:'semantic-anchor-missing',skill:question.skill});
      }
    }

    if(question.tier==='material'){
      if(!String(question.sourceFact||'').trim()){
        issues.push({id,type:'material-source-fact-missing'});
      }
      if(question.provenance!=='curriculum-practice-derived-from-verified-abvm-pack'){
        issues.push({id,type:'material-provenance-invalid'});
      }
    }else if(question.tier==='star-fallback'){
      if(question.provenance!=='original-star-aligned-practice-regenerated-with-curriculum-snapshot'){
        issues.push({id,type:'star-provenance-invalid'});
      }
    }else{
      issues.push({id,type:'unknown-tier',tier:question.tier});
    }

    const promptTokens=tokenSet(question.prompt);
    const answerTokens=tokenSet(question.answer);
    if([...answerTokens].length>0 && [...answerTokens].every(token=>!promptTokens.has(token))){
      // Normal for inference/math; this is informational evidence only, not a failure.
    }

    validateRubric(question,issues);
    validateRichContent(question,issues);
    validateExperiment(question,issues);
  }

  const bySubject=questions.reduce((acc,q)=>{
    acc[q.subject]=(acc[q.subject]||0)+1;
    return acc;
  },{});
  if((bySubject['Reading / ELA']||0)<60) issues.push({id:'bank',type:'reading-pool-below-60'});
  if((bySubject.Math||0)<60) issues.push({id:'bank',type:'math-pool-below-60'});

  return issues;
}

export function summarizeAlignment(source){
  const questions=Array.isArray(source?.questions)?source.questions:[];
  const issues=validateQuestionAlignment(source);
  const standards=new Set();
  const domains=new Set();
  let rich=0;
  let experiments=0;
  for(const q of questions){
    for(const standard of q.standards||[]) standards.add(standard);
    if(q.domain) domains.add(q.domain);
    if(q.richContent) rich+=1;
    if(q.experiment) experiments+=1;
  }
  return {
    schemaVersion:1,
    status:issues.length===0?'pass':'fail',
    questionCount:questions.length,
    standardCount:standards.size,
    domainCount:domains.size,
    richContentCount:rich,
    experimentItemCount:experiments,
    issues
  };
}
