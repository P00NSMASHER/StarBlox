#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {gameModel} from '../src/gameModel.js';
import {
  applyShadowObservation,
  createShadowSkillState,
  selectMicroChallenge
} from '../src/masteryShadowModel.js';

const NOW = Date.UTC(2026,8,22,12,0,0);
const questions = gameModel.buildQuestions();
const skills = [...new Set(questions.map(q => q.skill))].sort();

function stateFrom(sequence,offset=0){
  let state=createShadowSkillState();
  sequence.forEach((correct,index)=>{
    state=applyShadowObservation(state,{
      correct,
      firstAttempt:true,
      masteryEligible:true,
      now:NOW-(sequence.length-index+offset)*86400000
    });
  });
  return state;
}

const scenarios=[
  {
    id:'mixed-learner',
    stats:{
      [skills[0]]:{seen:5,correct:2,wrong:3,lastSeen:NOW-8*86400000},
      [skills[1]]:{seen:5,correct:4,wrong:1,lastSeen:NOW-2*86400000},
      [skills[2]]:{seen:1,correct:0,wrong:1,lastSeen:NOW-7*86400000}
    },
    shadow:[
      {skill:skills[0],state:stateFrom([false,true,false,true,false])},
      {skill:skills[1],state:stateFrom([true,true,true,true,false])},
      {skill:skills[2],state:stateFrom([false])}
    ]
  },
  {
    id:'mostly-strong',
    stats:Object.fromEntries(skills.slice(0,5).map((skill,index)=>[
      skill,{seen:6,correct:5,wrong:1,lastSeen:NOW-(index+1)*86400000}
    ])),
    shadow:skills.slice(0,5).map((skill,index)=>({
      skill,
      state:stateFrom([true,true,true,true,true,index%2===0],index)
    }))
  }
];

const report={
  schemaVersion:1,
  mode:'SHADOW_ONLY_NO_RUNTIME_SELECTION_CHANGE',
  now:NOW,
  questionCount:questions.length,
  skillCount:skills.length,
  scenarios:scenarios.map(s=>({
    id:s.id,
    currentHeuristic:gameModel.pickQuest(s.stats,5,NOW).map(q=>({
      id:q.id,skill:q.skill,role:q.role,difficulty:q.difficulty
    })),
    microChallenge:selectMicroChallenge(s.shadow,{now:NOW})
  }))
};

const out=path.resolve(process.argv[2]||'artifacts/mastery-shadow-simulation.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
