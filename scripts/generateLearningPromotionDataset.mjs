import fs from 'node:fs';
import path from 'node:path';

await import('../src/questionQualityRuntime.js');
await import('../src/semanticQuestionGuardRuntime.js');
await import('../src/diagnosticQuestionGuardRuntime.js');

const { gameModel } = await import('../src/gameModel.js');
const {
  createLearningEvent,
  toQuestionV2
} = await import('../src/learningContracts.js');
const {
  buildPsiKtInteractionTable,
  psiKtInteractionTableToTsv
} = await import('../src/psiKtShadowAdapter.js');
const { buildRiffReviewCommands } = await import('../src/riffShadowAdapter.js');
const {
  DEFAULT_BKT_PARAMS,
  updateBktMastery
} = await import('../src/masteryShadowModel.js');

function getArg(name, fallback){
  const prefix = '--' + name + '=';
  const value = process.argv.find(arg => arg.startsWith(prefix));
  return value ? value.slice(prefix.length) : fallback;
}

function seededRandom(seed){
  let x = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    x = (Math.imul(x,1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

function clamp01(value){
  return Math.max(0,Math.min(1,Number(value) || 0));
}

const outDir = getArg('out-dir','.learning-promotion');
const learnerCount = Number(getArg('learners','48'));
const maxStep = Number(getArg('max-step','30'));
const seed = Number(getArg('seed','20260924'));
const datasetName = 'starblox_shadow';
const baseTime = Date.UTC(2026,8,1,12,0,0);

fs.mkdirSync(outDir,{recursive:true});
const datasetDir = path.join(outDir,datasetName);
fs.mkdirSync(datasetDir,{recursive:true});

const questions = gameModel.buildQuestions();
const skills = [...new Set(questions.map(question => question.skill))].sort();
const eligibleBySkill = Object.fromEntries(skills.map(skill => [
  skill,
  questions.filter(question =>
    question.skill === skill &&
    question.masteryEligible !== false
  )
]));

for(const skill of skills){
  if(!eligibleBySkill[skill].length){
    throw new Error('no mastery-eligible question for skill: ' + skill);
  }
}

const events = [];
const learnerRows = [];

for(let learnerIndex=0;learnerIndex<learnerCount;learnerIndex++){
  const playerLocalId = 'synthetic-' + String(learnerIndex).padStart(3,'0');
  const rng = seededRandom(seed + learnerIndex * 7919);
  const truth = {};
  const bkt = {};
  const stats = {};

  skills.forEach((skill,skillIndex) => {
    truth[skill] = clamp01(0.12 + rng() * 0.62 + (skillIndex % 3) * 0.025);
    bkt[skill] = DEFAULT_BKT_PARAMS.pKnow;
    stats[skill] = {
      seen:0,
      correct:0,
      wrong:0,
      lastSeen:0,
      independentCorrect:0,
      masteryCorrect:0
    };
  });

  for(let step=0;step<maxStep;step++){
    const skillIndex = (step * 5 + learnerIndex * 3) % skills.length;
    const skill = skills[skillIndex];
    const candidates = eligibleBySkill[skill];
    const question = candidates[(step + learnerIndex) % candidates.length];
    const q = toQuestionV2(question,{
      contentVersion:'synthetic-promotion-v1'
    });

    const difficultyPenalty = Math.max(0,Math.min(0.18,(q.difficulty - 1) * 0.035));
    const pCorrect = clamp01(0.08 + 0.88 * truth[skill] - difficultyPenalty);
    const correct = rng() < pCorrect;
    const choice = correct
      ? q.answer
      : q.choices.find(candidate => candidate !== q.answer);

    const timestamp =
      baseTime +
      learnerIndex * 60_000 +
      step * 6 * 60 * 60 * 1000;

    const event = createLearningEvent({
      question:q,
      choice,
      timestamp,
      playerLocalId,
      questSeed:Math.floor(timestamp / 86400000),
      wasRetry:false,
      hintUsed:false,
      responseMs:900 + Math.floor(rng() * 2400)
    });
    events.push(event);

    const stat = stats[skill];
    stat.seen += 1;
    stat.correct += correct ? 1 : 0;
    stat.wrong += correct ? 0 : 1;
    stat.lastSeen = timestamp;
    stat.independentCorrect += correct ? 1 : 0;
    stat.masteryCorrect += correct ? 1 : 0;

    bkt[skill] = updateBktMastery(bkt[skill],correct);

    const learningGain = (correct ? 0.055 : 0.025) * (1 - truth[skill]);
    truth[skill] = clamp01(truth[skill] + learningGain);
  }

  learnerRows.push({
    playerLocalId,
    truthMastery:Object.fromEntries(
      skills.map(skill => [skill,Number(truth[skill].toFixed(6))])
    ),
    bktMastery:Object.fromEntries(
      skills.map(skill => [skill,Number(bkt[skill].toFixed(6))])
    ),
    stats
  });
}

const psiTable = buildPsiKtInteractionTable(events);
const interactionsPath = path.join(datasetDir,'interactions_' + maxStep + '.csv');
fs.writeFileSync(interactionsPath,psiKtInteractionTableToTsv(psiTable),'utf8');

const riffCommands = buildRiffReviewCommands(events);
const riffPath = path.join(outDir,'riff-reviews.json');
fs.writeFileSync(riffPath,JSON.stringify({
  schemaVersion:'starblox-riff-review-export-v1',
  commandCount:riffCommands.length,
  commands:riffCommands
},null,2) + '\n','utf8');

const graph = {
  skillCount:skills.length,
  edges:skills.slice(0,-1).map((skill,index) => ({
    from:skill,
    to:skills[index + 1],
    weight:0.2
  }))
};
fs.writeFileSync(
  path.join(outDir,'skill-graph.json'),
  JSON.stringify(graph,null,2) + '\n',
  'utf8'
);

const metadata = {
  schemaVersion:'starblox-promotion-dataset-v1',
  authorization:'synthetic-only-no-real-player-data',
  seed,
  learnerCount,
  maxStep,
  eventCount:events.length,
  datasetName,
  skills,
  userIdMap:psiTable.user_id_map,
  skillIdMap:psiTable.skill_id_map,
  problemIdMap:psiTable.problem_id_map,
  learners:learnerRows,
  generatedAt:'deterministic-no-wall-clock'
};
fs.writeFileSync(
  path.join(outDir,'evaluation.json'),
  JSON.stringify(metadata,null,2) + '\n',
  'utf8'
);

process.stdout.write(JSON.stringify({
  datasetName,
  learnerCount,
  maxStep,
  skillCount:skills.length,
  eventCount:events.length,
  psiRows:psiTable.rows.length,
  riffCommands:riffCommands.length,
  outDir
},null,2) + '\n');
