import { describe, expect, it } from 'vitest';
import {
  BKT_FSRS_RISK_WEIGHT,
  pickQuestBktFsrsRiskShadow,
  scoreBktFsrsRiskQuestion
} from './selectorBktFsrsRiskShadow.js';

function q(id,skill,role='practice',district='Lantern Lane'){
  return {id,skill,role,district};
}

describe('BKT + continuous FSRS risk shadow selector',()=>{
  it('locks the development-selected forgetting-risk weight',()=>{
    expect(BKT_FSRS_RISK_WEIGHT).toBe(40);
  });

  it('raises otherwise equal questions when FSRS retrievability is lower',()=>{
    const a=q('a','phonics');
    const b=q('b','spelling');
    const profile={skills:{
      phonics:{bktMastery:0.5,fsrsRetrievability:0.2,lastSeenAt:0},
      spelling:{bktMastery:0.5,fsrsRetrievability:0.9,lastSeenAt:0}
    }};
    expect(scoreBktFsrsRiskQuestion(a,profile,0))
      .toBeGreaterThan(scoreBktFsrsRiskQuestion(b,profile,0));
  });

  it('is deterministic and preserves transfer plus five distinct quest items',()=>{
    const questions=[
      q('t','vocabulary','transfer','Wordwood Garden'),
      q('p','phonics','practice','Lantern Lane'),
      q('s','spelling','practice','Lantern Lane'),
      q('i','inference','practice','Story Street'),
      q('h','high-frequency-words','practice','Wordwood Garden'),
      q('r','religion-unit-1','review','Story Street')
    ];
    const profile={skills:Object.fromEntries(
      questions.map((question,index)=>[
        question.skill,{
          bktMastery:0.2+index*0.1,
          fsrsRetrievability:0.3+index*0.05,
          lastSeenAt:0
        }
      ])
    )};
    const first=pickQuestBktFsrsRiskShadow(questions,profile,5,1000);
    const second=pickQuestBktFsrsRiskShadow(questions,profile,5,1000);
    expect(first.map(x=>x.id)).toEqual(second.map(x=>x.id));
    expect(first).toHaveLength(5);
    expect(new Set(first.map(x=>x.id)).size).toBe(5);
    expect(first.some(x=>x.role==='transfer')).toBe(true);
  });
});
