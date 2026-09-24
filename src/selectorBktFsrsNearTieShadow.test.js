import { describe, expect, it } from 'vitest';
import {
  BKT_FSRS_NEAR_TIE_MARGIN,
  pickQuestBktFsrsNearTieShadow,
  scoreBktFsrsNearTieQuestion
} from './selectorBktFsrsNearTieShadow.js';

function q(id,skill,role='practice',district='Lantern Lane'){
  return {id,skill,role,district};
}

describe('BKT-primary FSRS near-tie selector',()=>{
  it('locks the development-selected risk margin',()=>{
    expect(BKT_FSRS_NEAR_TIE_MARGIN).toBe(3);
  });

  it('allows FSRS to break a close BKT tie',()=>{
    const a=q('a','phonics');
    const b=q('b','spelling');
    const profile={skills:{
      phonics:{bktMastery:0.50,fsrsRetrievability:0.95,lastSeenAt:0},
      spelling:{bktMastery:0.51,fsrsRetrievability:0.10,lastSeenAt:0}
    }};
    expect(scoreBktFsrsNearTieQuestion(b,profile,0))
      .toBeGreaterThan(scoreBktFsrsNearTieQuestion(a,profile,0));
  });

  it('cannot overcome a materially larger BKT need gap',()=>{
    const needy=q('n','phonics');
    const risky=q('r','spelling');
    const profile={skills:{
      phonics:{bktMastery:0.20,fsrsRetrievability:0.99,lastSeenAt:0},
      spelling:{bktMastery:0.50,fsrsRetrievability:0.00,lastSeenAt:0}
    }};
    expect(scoreBktFsrsNearTieQuestion(needy,profile,0))
      .toBeGreaterThan(scoreBktFsrsNearTieQuestion(risky,profile,0));
  });

  it('is deterministic and preserves five-item transfer-aware selection',()=>{
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
    const first=pickQuestBktFsrsNearTieShadow(questions,profile,5,1000);
    const second=pickQuestBktFsrsNearTieShadow(questions,profile,5,1000);
    expect(first.map(x=>x.id)).toEqual(second.map(x=>x.id));
    expect(first).toHaveLength(5);
    expect(new Set(first.map(x=>x.id)).size).toBe(5);
    expect(first.some(x=>x.role==='transfer')).toBe(true);
  });
});
