import fs from 'node:fs';

await import('../src/questionQualityRuntime.js');
await import('../src/semanticQuestionGuardRuntime.js');
await import('../src/diagnosticQuestionGuardRuntime.js');

const { gameModel }=await import('../src/gameModel.js');
const { pickQuestV2Shadow }=await import('../src/selectorV2Shadow.js');
const {
  pickQuestHeuristicAnchoredShadow,
  HEURISTIC_ANCHORED_SELECTOR_VERSION
}=await import('../src/selectorHeuristicAnchoredShadow.js');

function arg(name,fallback=''){
  const prefix='--'+name+'=';
  const found=process.argv.find(value=>value.startsWith(prefix));
  return found?found.slice(prefix.length):fallback;
}

function mean(values){
  return values.length
    ?values.reduce((sum,value)=>sum+value,0)/values.length
    :0;
}

function parseFsrs(receipt){
  const byPlayer={};
  for(const card of receipt.cards||[]){
    const separator=String(card.cardId).indexOf(':');
    if(separator<0)continue;
    const player=card.cardId.slice(0,separator);
    const concept=card.cardId.slice(separator+1);
    const skill=concept.startsWith('skill:')
      ?concept.slice('skill:'.length)
      :concept;
    byPlayer[player]||={};
    byPlayer[player][skill]={
      retrievability:Number(card.retrievability),
      due:Boolean(card.dueAtEvaluation)
    };
  }
  return byPlayer;
}

function questMetrics(quest,truth,dueRows={}){
  const skills=quest.map(question=>question.skill);
  const weakestSkill=Object.entries(truth)
    .sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]))[0]?.[0]||'';
  const dueSkills=Object.entries(dueRows)
    .filter(([,row])=>row.due)
    .map(([skill])=>skill);
  return {
    meanHiddenNeed:mean(skills.map(skill=>1-Number(truth[skill]??0.5))),
    weakestSkillHitRate:skills.includes(weakestSkill)?1:0,
    dueSkillCoverage:dueSkills.length
      ?dueSkills.filter(skill=>skills.includes(skill)).length/dueSkills.length
      :1,
    uniqueSkillCount:new Set(skills).size,
    transferInclusionRate:quest.some(question=>question.role==='transfer')?1:0
  };
}

function aggregate(rows){
  return {
    learnerCount:rows.length,
    meanHiddenNeed:mean(rows.map(row=>row.meanHiddenNeed)),
    weakestSkillHitRate:mean(rows.map(row=>row.weakestSkillHitRate)),
    dueSkillCoverage:mean(rows.map(row=>row.dueSkillCoverage)),
    uniqueSkillCount:mean(rows.map(row=>row.uniqueSkillCount)),
    transferInclusionRate:mean(rows.map(row=>row.transferInclusionRate))
  };
}

function delta(candidate,baseline){
  return {
    meanHiddenNeed:candidate.meanHiddenNeed-baseline.meanHiddenNeed,
    weakestSkillHitRate:candidate.weakestSkillHitRate-baseline.weakestSkillHitRate,
    dueSkillCoverage:candidate.dueSkillCoverage-baseline.dueSkillCoverage,
    uniqueSkillCount:candidate.uniqueSkillCount-baseline.uniqueSkillCount,
    transferInclusionRate:candidate.transferInclusionRate-baseline.transferInclusionRate
  };
}

const manifestPath=arg('manifest');
const evaluationPath=arg('evaluation');
const fsrsPath=arg('fsrs');
const outPath=arg('out');
if(!manifestPath||!evaluationPath||!fsrsPath||!outPath){
  throw new Error('--manifest, --evaluation, --fsrs, and --out are required');
}

const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const evaluation=JSON.parse(fs.readFileSync(evaluationPath,'utf8'));
const fsrs=JSON.parse(fs.readFileSync(fsrsPath,'utf8'));

if(manifest.authorization!=='synthetic-only-no-real-player-data'){
  throw new Error('diagnostic manifest must be synthetic-only');
}
if(evaluation.authorization!=='synthetic-only-no-real-player-data'){
  throw new Error('evaluation dataset must be synthetic-only');
}
if(Number(evaluation.seed)!==Number(manifest.seed)){
  throw new Error('evaluation seed does not match development manifest');
}
if((manifest.forbiddenSeeds||[]).includes(Number(evaluation.seed))){
  throw new Error('development diagnostic attempted to reuse a forbidden cohort');
}
if(fsrs.engineVersion!=='v3.3.1'){
  throw new Error('diagnostic requires pinned FSRS v3.3.1');
}

const now=Date.parse(fsrs.evaluationAt);
if(!Number.isFinite(now))throw new Error('invalid FSRS evaluationAt');
const fsrsByPlayer=parseFsrs(fsrs);
const questions=gameModel.dailyPool(now);

const baselineRows={heuristic:[],bkt:[]};
const learnerProfiles=[];

for(const learner of evaluation.learners){
  const player=learner.playerLocalId;
  const truth=learner.selectionTruthMastery;
  const stats=learner.selectionStats;
  const bkt=learner.selectionBktMastery;
  if(!truth||!stats||!bkt){
    throw new Error('development dataset missing selection-boundary state for '+player);
  }

  const dueRows=fsrsByPlayer[player]||{};
  const profile={skills:Object.fromEntries(
    evaluation.skills.map(skill=>[
      skill,{
        bktMastery:Number(bkt[skill]),
        psiMastery:Number(bkt[skill]),
        psiUncertainty:0,
        fsrsRetrievability:Number(dueRows[skill]?.retrievability),
        fsrsDue:Boolean(dueRows[skill]?.due),
        lastSeenAt:Number(stats[skill]?.lastSeen||0)
      }
    ])
  )};

  const heuristic=gameModel.pickQuest(stats,5,now);
  const bktQuest=pickQuestV2Shadow(questions,profile,5,now);
  baselineRows.heuristic.push(questMetrics(heuristic,truth,dueRows));
  baselineRows.bkt.push(questMetrics(bktQuest,truth,dueRows));
  learnerProfiles.push({truth,stats,profile,dueRows});
}

const baselines={
  currentHeuristic:aggregate(baselineRows.heuristic),
  bktBackedShadow:aggregate(baselineRows.bkt)
};

const margins=manifest.grid?.heuristicMargins||[0,1,2,3,4,6,8];
const riskWeights=manifest.grid?.riskWeights||[0,1,2,4,8,16];

const rows=[];
for(const heuristicMargin of margins){
  for(const riskWeight of riskWeights){
    const metrics=aggregate(learnerProfiles.map(({truth,stats,profile,dueRows})=>{
      const quest=pickQuestHeuristicAnchoredShadow(
        questions,stats,profile,5,now,{heuristicMargin,riskWeight}
      );
      return questMetrics(quest,truth,dueRows);
    }));
    const vsHeuristic=delta(metrics,baselines.currentHeuristic);
    const vsBkt=delta(metrics,baselines.bktBackedShadow);
    const passesCore=(
      vsHeuristic.meanHiddenNeed>=0 &&
      vsHeuristic.weakestSkillHitRate>=0 &&
      vsBkt.meanHiddenNeed>=0 &&
      vsBkt.weakestSkillHitRate>=0 &&
      vsHeuristic.dueSkillCoverage>=-0.01 &&
      metrics.uniqueSkillCount>=5 &&
      metrics.transferInclusionRate===1
    );
    const objective=(
      Math.min(vsHeuristic.meanHiddenNeed,vsBkt.meanHiddenNeed)*100 +
      Math.min(vsHeuristic.weakestSkillHitRate,vsBkt.weakestSkillHitRate)*4 +
      Math.min(0,vsHeuristic.dueSkillCoverage)
    );
    rows.push({
      heuristicMargin:Number(heuristicMargin),
      riskWeight:Number(riskWeight),
      metrics,
      vsHeuristic,
      vsBkt,
      passesCore,
      objective
    });
  }
}

rows.sort((a,b)=>
  Number(b.passesCore)-Number(a.passesCore) ||
  b.objective-a.objective ||
  a.heuristicMargin-b.heuristicMargin ||
  a.riskWeight-b.riskWeight
);

const selected=rows.find(row=>row.passesCore)||null;
const result={
  schemaVersion:'starblox-heuristic-anchor-development-diagnostic-v1',
  selectorVersion:HEURISTIC_ANCHORED_SELECTOR_VERSION,
  developmentOnly:true,
  tuneAgainstThisCohort:true,
  authorization:evaluation.authorization,
  benchmarkId:manifest.benchmarkId,
  seed:evaluation.seed,
  learnerCount:evaluation.learnerCount,
  fsrs:{
    engine:fsrs.engine,
    engineVersion:fsrs.engineVersion,
    commandCount:fsrs.commandCount,
    cardCount:fsrs.cardCount,
    payloadSha256:fsrs.payloadSha256
  },
  baselines,
  grid:{heuristicMargins:margins,riskWeights},
  selected,
  supportive:Boolean(selected),
  topRows:rows.slice(0,12),
  promotionBoundary:{
    liveSelectorAllowed:false,
    note:selected
      ?'Development tuning evidence only. Freeze the selected parameters and use a new independent validation cohort before any final holdout.'
      :'No parameter pair cleared the development non-regression gate against both heuristic and BKT baselines.'
  }
};

fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n','utf8');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
