#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {gameModel} from '../src/gameModel.js';
import {selectMicroChallenge} from '../src/masteryShadowModel.js';

const NOW = Date.UTC(2026,8,22,12,0,0);
const DAY = 86400000;
const HOUR = 3600000;
const questions = gameModel.buildQuestions();
const skills = [...new Set(questions.map(q => q.skill))].sort();

function state({
  mastery,
  bktDaysAgo=0,
  nextReviewOffsetDays=0,
  lastChallengeHoursAgo=null,
  repetitions=1,
  easeFactor=2.5,
  interval=1
}){
  return {
    mastery,
    bktUpdatedAt:NOW-bktDaysAgo*DAY,
    nextReviewAt:NOW+nextReviewOffsetDays*DAY,
    lastChallengeAt:lastChallengeHoursAgo == null ? 0 : NOW-lastChallengeHoursAgo*HOUR,
    repetitions,
    easeFactor,
    interval
  };
}

const scenarios=[
  {
    id:'struggle-zone-routing',
    stats:{
      [skills[0]]:{seen:5,correct:2,wrong:3,lastSeen:NOW-8*DAY},
      [skills[1]]:{seen:5,correct:4,wrong:1,lastSeen:NOW-2*DAY},
      [skills[2]]:{seen:1,correct:0,wrong:1,lastSeen:NOW-7*DAY},
      [skills[3]]:{seen:8,correct:8,wrong:0,lastSeen:NOW-DAY}
    },
    shadow:[
      // Eligible + stale + due: should win.
      {skill:skills[0],ordering:0,state:state({mastery:0.45,bktDaysAgo:9,nextReviewOffsetDays:-2})},
      // Eligible but fresher and not due.
      {skill:skills[1],ordering:1,state:state({mastery:0.55,bktDaysAgo:1,nextReviewOffsetDays:2})},
      // Below the SkillCoco struggle zone: diagnostic material, not microchallenge.
      {skill:skills[2],ordering:2,state:state({mastery:0.20,bktDaysAgo:12,nextReviewOffsetDays:-4})},
      // At/above mastery threshold: excluded.
      {skill:skills[3],ordering:3,state:state({mastery:0.82,bktDaysAgo:10,nextReviewOffsetDays:-3})},
      // Eligible and stale, but seen recently: recency penalty should suppress.
      {skill:skills[4],ordering:4,state:state({mastery:0.50,bktDaysAgo:12,nextReviewOffsetDays:-3,lastChallengeHoursAgo:2})}
    ],
    expectedMicroSkill:skills[0]
  },
  {
    id:'no-struggle-zone-candidate',
    stats:Object.fromEntries(skills.slice(0,5).map((skill,index)=>[
      skill,{seen:6,correct:index<2?1:6,wrong:index<2?5:0,lastSeen:NOW-(index+1)*DAY}
    ])),
    shadow:[
      {skill:skills[0],ordering:0,state:state({mastery:0.12,bktDaysAgo:8,nextReviewOffsetDays:-1})},
      {skill:skills[1],ordering:1,state:state({mastery:0.22,bktDaysAgo:8,nextReviewOffsetDays:-1})},
      {skill:skills[2],ordering:2,state:state({mastery:0.72,bktDaysAgo:8,nextReviewOffsetDays:-1})},
      {skill:skills[3],ordering:3,state:state({mastery:0.90,bktDaysAgo:8,nextReviewOffsetDays:-1})}
    ],
    expectedMicroSkill:null
  },
  {
    id:'all-eligible-seen-too-recently',
    stats:{
      [skills[0]]:{seen:3,correct:2,wrong:1,lastSeen:NOW-HOUR},
      [skills[1]]:{seen:4,correct:2,wrong:2,lastSeen:NOW-2*HOUR}
    },
    shadow:[
      {skill:skills[0],ordering:0,state:state({mastery:0.48,bktDaysAgo:6,nextReviewOffsetDays:-1,lastChallengeHoursAgo:1})},
      {skill:skills[1],ordering:1,state:state({mastery:0.58,bktDaysAgo:10,nextReviewOffsetDays:-1,lastChallengeHoursAgo:3})}
    ],
    expectedMicroSkill:null
  }
];

const evaluated=scenarios.map(s=>{
  const microChallenge=selectMicroChallenge(s.shadow,{now:NOW});
  return {
    id:s.id,
    currentHeuristic:gameModel.pickQuest(s.stats,5,NOW).map(q=>({
      id:q.id,skill:q.skill,role:q.role,difficulty:q.difficulty
    })),
    microChallenge,
    expectedMicroSkill:s.expectedMicroSkill,
    expectationPass:(microChallenge?.skill??null)===s.expectedMicroSkill
  };
});

const report={
  schemaVersion:2,
  mode:'SHADOW_ONLY_NO_RUNTIME_SELECTION_CHANGE',
  now:NOW,
  questionCount:questions.length,
  skillCount:skills.length,
  scenarios:evaluated,
  summary:{
    scenarioCount:evaluated.length,
    expectationPassCount:evaluated.filter(x=>x.expectationPass).length,
    nonNullMicroChallengeCount:evaluated.filter(x=>x.microChallenge).length,
    nullMicroChallengeCount:evaluated.filter(x=>!x.microChallenge).length
  }
};

const out=path.resolve(process.argv[2]||'artifacts/mastery-shadow-simulation.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));

if(report.summary.expectationPassCount!==report.summary.scenarioCount){
  process.exitCode=1;
}
