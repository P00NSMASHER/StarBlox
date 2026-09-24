import fs from 'node:fs';

await import('../src/questionQualityRuntime.js');
await import('../src/semanticQuestionGuardRuntime.js');
await import('../src/diagnosticQuestionGuardRuntime.js');

const { gameModel } = await import('../src/gameModel.js');
const {
  pickQuestV2Shadow
} = await import('../src/selectorV2Shadow.js');

function getArg(name, fallback=''){
  const prefix = '--' + name + '=';
  const found = process.argv.find(arg => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function mean(values){
  return values.length
    ? values.reduce((sum,value) => sum + value,0) / values.length
    : 0;
}

function parseFsrsCards(receipt){
  const byPlayer = {};
  for(const card of receipt.cards || []){
    const separator = card.cardId.indexOf(':');
    if(separator < 0) continue;
    const player = card.cardId.slice(0,separator);
    const concept = card.cardId.slice(separator + 1);
    const skill = concept.startsWith('skill:') ? concept.slice('skill:'.length) : concept;
    byPlayer[player] ||= {};
    byPlayer[player][skill] = {
      due:Boolean(card.dueAtEvaluation),
      retrievability:Number(card.retrievability),
      stability:Number(card.stability),
      difficulty:Number(card.difficulty)
    };
  }
  return byPlayer;
}

function questMetrics(quest, truth, dueRows={}){
  const skills = quest.map(question => question.skill);
  const needs = skills.map(skill => 1 - Number(truth[skill] ?? 0.5));
  const weakestSkill = Object.entries(truth)
    .sort((a,b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]?.[0] || '';
  const dueSkills = Object.entries(dueRows)
    .filter(([,row]) => row.due)
    .map(([skill]) => skill);

  return {
    meanHiddenNeed:mean(needs),
    uniqueSkillCount:new Set(skills).size,
    weakestSkillHit:skills.includes(weakestSkill) ? 1 : 0,
    dueSkillCoverage:dueSkills.length
      ? dueSkills.filter(skill => skills.includes(skill)).length / dueSkills.length
      : 1,
    transferIncluded:quest.some(question => question.role === 'transfer') ? 1 : 0
  };
}

const evaluationPath = getArg('evaluation');
const psiPath = getArg('psi');
const fsrsPath = getArg('fsrs');
const outPath = getArg('out');

if(!evaluationPath || !psiPath || !fsrsPath || !outPath){
  throw new Error('--evaluation, --psi, --fsrs, and --out are required');
}

const evaluation = JSON.parse(fs.readFileSync(evaluationPath,'utf8'));
const psi = JSON.parse(fs.readFileSync(psiPath,'utf8'));
const fsrs = JSON.parse(fs.readFileSync(fsrsPath,'utf8'));

const reverseUserMap = Object.fromEntries(
  Object.entries(evaluation.userIdMap).map(([player,userId]) => [String(userId),player])
);
const fsrsByPlayer = parseFsrsCards(fsrs);
const psiByPlayer = {};
for(const [numericUser,skillPredictions] of Object.entries(psi.skillPredictions || {})){
  const player = reverseUserMap[String(numericUser)];
  if(player) psiByPlayer[player] = skillPredictions;
}

const questions = gameModel.buildQuestions();
const now = Date.UTC(2026,8,24,12,0,0);
const policies = {
  heuristic:[],
  bktShadow:[],
  psiFsrsV2:[]
};

for(const learner of evaluation.learners){
  const player = learner.playerLocalId;
  const dueRows = fsrsByPlayer[player] || {};

  const heuristicQuest = gameModel.pickQuest(learner.stats,5,now);

  const bktProfile = {
    skills:Object.fromEntries(
      Object.keys(learner.bktMastery).map(skill => [
        skill,
        {
          psiMastery:Number(learner.bktMastery[skill]),
          psiUncertainty:0,
          fsrsDue:false,
          lastSeenAt:Number(learner.stats[skill]?.lastSeen || 0)
        }
      ])
    )
  };
  const bktQuest = pickQuestV2Shadow(questions,bktProfile,5,now);

  const psiRows = psiByPlayer[player] || {};
  const psiProfile = {
    skills:Object.fromEntries(
      evaluation.skills.map(skill => {
        const predicted = Number(psiRows[skill]);
        const fsrsState = dueRows[skill] || {};
        const retrievability = Number(fsrsState.retrievability);
        return [
          skill,
          {
            psiMastery:Number.isFinite(predicted) ? predicted : 0.5,
            psiUncertainty:Number.isFinite(retrievability)
              ? Math.abs(0.5 - retrievability) * 0.5
              : 0.25,
            fsrsDue:Boolean(fsrsState.due),
            lastSeenAt:Number(learner.stats[skill]?.lastSeen || 0)
          }
        ];
      })
    )
  };
  const psiQuest = pickQuestV2Shadow(questions,psiProfile,5,now);

  policies.heuristic.push(
    questMetrics(heuristicQuest,learner.truthMastery,dueRows)
  );
  policies.bktShadow.push(
    questMetrics(bktQuest,learner.truthMastery,dueRows)
  );
  policies.psiFsrsV2.push(
    questMetrics(psiQuest,learner.truthMastery,dueRows)
  );
}

function aggregate(rows){
  return {
    learnerCount:rows.length,
    meanHiddenNeed:mean(rows.map(row => row.meanHiddenNeed)),
    meanUniqueSkillCount:mean(rows.map(row => row.uniqueSkillCount)),
    weakestSkillHitRate:mean(rows.map(row => row.weakestSkillHit)),
    dueSkillCoverage:mean(rows.map(row => row.dueSkillCoverage)),
    transferInclusionRate:mean(rows.map(row => row.transferIncluded))
  };
}

const result = {
  schemaVersion:'starblox-selector-promotion-comparison-v1',
  datasetAuthorization:evaluation.authorization,
  learnerCount:evaluation.learnerCount,
  psiKt:{
    model:psi.model,
    upstreamCommit:psi.upstreamCommit,
    epochs:psi.epochs,
    metrics:psi.metrics,
    modelStateSha256:psi.modelStateSha256
  },
  fsrs:{
    engine:fsrs.engine,
    engineVersion:fsrs.engineVersion,
    cardCount:fsrs.cardCount,
    commandCount:fsrs.commandCount,
    payloadSha256:fsrs.payloadSha256
  },
  policies:{
    currentHeuristic:aggregate(policies.heuristic),
    bktBackedShadow:aggregate(policies.bktShadow),
    psiKtFsrsSelectorV2:aggregate(policies.psiFsrsV2)
  },
  promotionGate:{
    liveSelectorV2Allowed:false,
    reason:'Evaluation uses a deterministic synthetic StarBlox-shaped population only. Real-learner efficacy and privacy review remain required before live selection.'
  }
};

fs.writeFileSync(outPath,JSON.stringify(result,null,2) + '\n','utf8');
process.stdout.write(JSON.stringify(result,null,2) + '\n');
