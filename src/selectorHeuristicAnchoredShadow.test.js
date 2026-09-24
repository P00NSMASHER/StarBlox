import { describe, expect, it } from 'vitest';
import {
  currentHeuristicScore,
  pickQuestHeuristicAnchoredShadow
} from './selectorHeuristicAnchoredShadow.js';

const q=(id,skill,role='practice',district='Lantern Lane')=>({
  id,skill,role,district
});

describe('heuristic anchored BKT+FSRS selector',()=>{
  it('matches the current heuristic formula',()=>{
    const question=q('a','phonics','transfer');
    const now=10*86400000;
    const stats={phonics:{seen:1,correct:2,wrong:1,lastSeen:8*86400000}};
    expect(currentHeuristicScore(question,stats,now))
      .toBe(18-6+8+10);
  });

  it('never lets a secondary signal cross a zero heuristic margin',()=>{
    const questions=[
      q('high','phonics','transfer','Lantern Lane'),
      q('low','spelling','transfer','Lantern Lane'),
      q('story','inference','practice','Story Street'),
      q('word','vocabulary','practice','Wordwood Garden'),
      q('religion','religion-unit-1','practice','Story Street'),
      q('other','language','practice','Lantern Lane')
    ];
    const now=20*86400000;
    const stats={
      phonics:{seen:0,correct:0,wrong:0,lastSeen:0},
      spelling:{seen:1,correct:8,wrong:0,lastSeen:now}
    };
    const profile={skills:{
      phonics:{bktMastery:0.99,fsrsRetrievability:1},
      spelling:{bktMastery:0.01,fsrsRetrievability:0}
    }};
    const picked=pickQuestHeuristicAnchoredShadow(
      questions,stats,profile,5,now,{heuristicMargin:0,riskWeight:100}
    );
    expect(picked[0].id).toBe('high');
  });

  it('uses BKT+FSRS only inside the permitted heuristic margin',()=>{
    const now=10*86400000;
    const questions=[
      q('a','phonics','transfer','Lantern Lane'),
      q('b','spelling','transfer','Lantern Lane'),
      q('c','inference','practice','Story Street'),
      q('d','vocabulary','practice','Wordwood Garden'),
      q('e','religion-unit-1','practice','Story Street'),
      q('f','language','practice','Lantern Lane')
    ];
    const stats={
      phonics:{seen:1,correct:0,wrong:0,lastSeen:9*86400000},
      spelling:{seen:1,correct:0,wrong:0,lastSeen:9.5*86400000}
    };
    const profile={skills:{
      phonics:{bktMastery:0.9,fsrsRetrievability:0.9},
      spelling:{bktMastery:0.1,fsrsRetrievability:0.1}
    }};
    const picked=pickQuestHeuristicAnchoredShadow(
      questions,stats,profile,5,now,{heuristicMargin:2,riskWeight:4}
    );
    expect(picked[0].id).toBe('b');
  });

  it('preserves five unique questions and transfer coverage',()=>{
    const questions=[
      q('a','phonics','transfer','Lantern Lane'),
      q('b','spelling','practice','Lantern Lane'),
      q('c','inference','practice','Story Street'),
      q('d','vocabulary','practice','Wordwood Garden'),
      q('e','religion-unit-1','review','Story Street'),
      q('f','language','practice','Lantern Lane')
    ];
    const picked=pickQuestHeuristicAnchoredShadow(questions,{}, {},5,0);
    expect(picked).toHaveLength(5);
    expect(new Set(picked.map(row=>row.id)).size).toBe(5);
    expect(picked.some(row=>row.role==='transfer')).toBe(true);
  });
});
