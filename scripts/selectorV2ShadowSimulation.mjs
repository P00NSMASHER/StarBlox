import crypto from 'node:crypto';

await import('../src/questionQualityRuntime.js');
await import('../src/semanticQuestionGuardRuntime.js');
await import('../src/diagnosticQuestionGuardRuntime.js');

const { gameModel } = await import('../src/gameModel.js');
const {
  pickQuestV2Shadow,
  scoreQuestionV2Shadow,
  SELECTOR_V2_SHADOW_VERSION
} = await import('../src/selectorV2Shadow.js');

const NOW = Date.UTC(2026,8,24,12,0,0);
const DAY = 86400000;
const questions = gameModel.buildQuestions();
const ids = new Set(questions.map(question => question.id));
const skills = [...new Set(questions.map(question => question.skill))].sort();

function seededRandom(seed){
  let x = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    x = (Math.imul(x,1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function syntheticProfile(index){
  const rng = seededRandom(index + 1);
  const profile = {skills:{}};
  for(const skill of skills){
    profile.skills[skill] = {
      psiMastery:Number((0.1 + rng() * 0.85).toFixed(4)),
      psiUncertainty:Number((rng() * 0.6).toFixed(4)),
      fsrsDue:rng() < 0.35,
      lastSeenAt:NOW - Math.floor(rng() * 8) * DAY
    };
  }
  return profile;
}

function validateQuest(quest){
  const issues = [];
  if(quest.length !== 5) issues.push('quest-count');
  if(new Set(quest.map(q => q.id)).size !== quest.length) issues.push('duplicate-question');
  if(quest.some(q => !ids.has(q.id))) issues.push('unknown-question');
  if(!quest.some(q => q.role === 'transfer')) issues.push('missing-transfer');
  return issues;
}

const populationSize = 250;
const failures = [];
const selectedBySkill = Object.fromEntries(skills.map(skill => [skill,0]));
let topNeedSkillHit = 0;

for(let learner=0;learner<populationSize;learner++){
  const profile = syntheticProfile(learner);
  const first = pickQuestV2Shadow(questions,profile,5,NOW);
  const second = pickQuestV2Shadow(questions,profile,5,NOW);
  const issues = validateQuest(first);

  if(first.map(q => q.id).join('|') !== second.map(q => q.id).join('|')){
    issues.push('non-deterministic-selection');
  }

  const topQuestion = [...questions]
    .map(question => ({
      question,
      score:scoreQuestionV2Shadow(question,profile,NOW)
    }))
    .sort((a,b) => b.score - a.score || a.question.id.localeCompare(b.question.id))[0]?.question;

  if(topQuestion && first.some(question => question.skill === topQuestion.skill)){
    topNeedSkillHit += 1;
  }

  for(const question of first){
    selectedBySkill[question.skill] = (selectedBySkill[question.skill] || 0) + 1;
  }

  if(issues.length){
    failures.push({learner,issues,quest:first.map(q => q.id)});
  }
}

const receipt = {
  schemaVersion:'starblox-selector-v2-shadow-simulation-v1',
  selectorVersion:SELECTOR_V2_SHADOW_VERSION,
  populationSize,
  questionCount:questions.length,
  skillCount:skills.length,
  topNeedSkillHitRate:Number((topNeedSkillHit / populationSize).toFixed(4)),
  selectedBySkill,
  failureCount:failures.length,
  failures:failures.slice(0,20)
};

receipt.sha256 = crypto
  .createHash('sha256')
  .update(JSON.stringify(receipt))
  .digest('hex');

process.stdout.write(JSON.stringify(receipt,null,2) + '\n');
if(failures.length) process.exitCode = 1;
