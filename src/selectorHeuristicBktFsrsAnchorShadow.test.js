import { describe, expect, it } from 'vitest';
import {
  HEURISTIC_BKT_FSRS_ANCHOR_MARGIN,
  HEURISTIC_BKT_FSRS_ANCHOR_RISK_WEIGHT,
  pickQuestHeuristicBktFsrsAnchorShadow
} from './selectorHeuristicBktFsrsAnchorShadow.js';

const q=(id,skill,role='practice',district='Lantern Lane')=>({
  id,skill,role,district
});

describe('frozen heuristic+BKT+FSRS anchor candidate',()=>{
  it('locks the tuned parameters',()=>{
    expect(HEURISTIC_BKT_FSRS_ANCHOR_MARGIN).toBe(3);
    expect(HEURISTIC_BKT_FSRS_ANCHOR_RISK_WEIGHT).toBe(16);
  });

  it('uses the secondary signal only within the frozen heuristic margin',()=>{
    const now=10*86400000;
    const questions=[
      q('a','phonics','transfer'),
      q('b','spelling','transfer'),
      q('c','inference','practice','Story Street'),
      q('d','vocabulary','practice','Wordwood Garden'),
      q('e','religion-unit-1','review','Story Street'),
      q('f','language')
    ];
    const stats={
      phonics:{seen:1,correct:0,wrong:0,lastSeen:9*86400000},
      spelling:{seen:1,correct:0,wrong:0,lastSeen:9.5*86400000}
    };
    const profile={skills:{
      phonics:{bktMastery:0.9,fsrsRetrievability:0.9},
      spelling:{bktMastery:0.1,fsrsRetrievability:0.1}
    }};
    const picked=pickQuestHeuristicBktFsrsAnchorShadow(
      questions,stats,profile,5,now
    );
    expect(picked[0].id).toBe('b');
  });

  it('preserves five unique questions and transfer inclusion',()=>{
    const questions=[
      q('a','phonics','transfer'),
      q('b','spelling'),
      q('c','inference','practice','Story Street'),
      q('d','vocabulary','practice','Wordwood Garden'),
      q('e','religion-unit-1','review','Story Street'),
      q('f','language')
    ];
    const picked=pickQuestHeuristicBktFsrsAnchorShadow(questions,{}, {},5,0);
    expect(picked).toHaveLength(5);
    expect(new Set(picked.map(row=>row.id)).size).toBe(5);
    expect(picked.some(row=>row.role==='transfer')).toBe(true);
  });
});
