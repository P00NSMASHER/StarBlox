import {describe,expect,it} from 'vitest';
import {summarizeAlignment,validateQuestionAlignment} from './questionAlignmentValidator.js';

function base(overrides={}){
  return {
    id:'q1',stationId:'s',subject:'Math',skill:'place-value',
    prompt:'In 347, what is the value of the 4 in the tens place?',
    choices:['40','4','400'],answer:'40',
    explanation:'The 4 is in the tens place, so its value is 40.',
    provenance:'original-star-aligned-practice-regenerated-with-curriculum-snapshot',
    sourceFact:'STAR Math numbers and operations alignment',
    tier:'star-fallback',domain:'Numbers and operations',difficulty:2,
    standards:['CCSS.2.NBT.A.1'],dok:2,cognitiveDemand:'skill-and-concept-application',
    hint:'Name the place first: hundreds, tens, or ones.',
    scaffold:'Rewrite the number as hundreds + tens + ones.',
    choiceDiagnostics:[
      {choice:'4',misconception:'digit-not-value',feedback:'The digit is 4, but its place makes its value 40.'},
      {choice:'400',misconception:'wrong-place',feedback:'400 would mean the 4 were in the hundreds place.'}
    ],
    rubric:{maxPoints:2,criteria:['Identifies the correct place','Uses the place to determine value'],partialCredit:{'4':1,'400':0}},
    ...overrides
  };
}

describe('independent Grade 2 question alignment validator',()=>{
  it('passes a coherent standards-aligned item',()=>{
    const source={questions:Array.from({length:60},(_,i)=>base({id:'m'+i})).concat(
      Array.from({length:60},(_,i)=>base({
        id:'r'+i,subject:'Reading / ELA',skill:'inference',
        prompt:'Nora grabbed an umbrella before leaving. What can you infer?',
        choices:['She expects rain.','She plans to swim.','She forgot the weather.'],
        answer:'She expects rain.',
        explanation:'Taking an umbrella is evidence she expects rain.',
        sourceFact:'STAR Reading comprehension alignment',
        domain:'Comprehension strategies and constructing meaning',
        standards:['CCSS.RL.2.1'],
        rubric:{maxPoints:2,criteria:['Uses a text clue','Makes a supported inference'],partialCredit:{'She plans to swim.':0,'She forgot the weather.':1}}
      }))
    )};
    expect(validateQuestionAlignment(source)).toEqual([]);
    expect(summarizeAlignment(source).status).toBe('pass');
  });

  it('flags standards/domain drift independently of generation',()=>{
    const source={questions:Array.from({length:120},(_,i)=>base({
      id:'q'+i,
      domain:i===0?'Algebra':'Numbers and operations',
      standards:i===1?['CCSS.RL.2.1']:['CCSS.2.NBT.A.1']
    }))};
    const types=new Set(validateQuestionAlignment(source).map(x=>x.type));
    expect(types.has('skill-domain-mismatch')).toBe(true);
    expect(types.has('standard-subject-mismatch')).toBe(true);
  });

  it('rejects experiment allocations outside the planned 5-10 percent range',()=>{
    const q=base({experiment:{id:'rich-v1',type:'rich-format',control:'A',treatment:'B',treatmentPercent:20}});
    const source={questions:Array.from({length:120},(_,i)=>({...q,id:'q'+i}))};
    expect(validateQuestionAlignment(source).some(x=>x.type==='experiment-allocation-outside-5-10-percent')).toBe(true);
  });
});
