import fs from 'node:fs';

await import('../src/questionQualityRuntime.js');
await import('../src/semanticQuestionGuardRuntime.js');
await import('../src/diagnosticQuestionGuardRuntime.js');

const { gameModel } = await import('../src/gameModel.js');
const { pickQuestV2Shadow } = await import('../src/selectorV2Shadow.js');

function getArg(name){
  const prefix='--'+name+'=';
  const found=process.argv.find(arg=>arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : '';
}

function mean(values){
  return values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
}

function rmse(pairs){
  return pairs.length
    ? Math.sqrt(mean(pairs.map(([a,b]) => (a-b)**2)))
    : 0;
}

function mae(pairs){
  return pairs.length
    ? mean(pairs.map(([a,b]) => Math.abs(a-b)))
    : 0;
}

function pearson(pairs){
  if(pairs.length < 2) return 0;
  const xs=pairs.map(([x])=>x);
  const ys=pairs.map(([,y])=>y);
  const mx=mean(xs), my=mean(ys);
  let num=0, dx=0, dy=0;
  for(let i=0;i<pairs.length;i++){
    const a=xs[i]-mx, b=ys[i]-my;
    num += a*b; dx += a*a; dy += b*b;
  }
  return dx>0 && dy>0 ? num/Math.sqrt(dx*dy) : 0;
}

function parseFsrs(receipt){
  const out={};
  for(const card of receipt.cards || []){
    const first=String(card.cardId).indexOf(':');
    if(first < 0) continue;
    const player=String(card.cardId).slice(0,first);
    const concept=String(card.cardId).slice(first+1);
    const skill=concept.startsWith('skill:') ? concept.slice(6) : concept;
    out[player] ||= {};
    out[player][skill]={
      due:Boolean(card.dueAtEvaluation),
      retrievability:Number(card.retrievability)
    };
  }
  return out;
}

function questMetrics(quest,truth,dueRows={}){
  const skills=quest.map(q=>q.skill);
  const weakest=Object.entries(truth)
    .sort((a,b)=>a[1]-b[1] || a[0].localeCompare(b[0]))[0]?.[0] || '';
  const dueSkills=Object.entries(dueRows)
    .filter(([,v])=>v.due)
    .map(([skill])=>skill);
  return {
    meanHiddenNeed:mean(skills.map(skill=>1-Number(truth[skill] ?? 0.5))),
    weakestSkillHit:skills.includes(weakest) ? 1 : 0,
    dueSkillCoverage:dueSkills.length
      ? dueSkills.filter(skill=>skills.includes(skill)).length/dueSkills.length
      : 1,
    uniqueSkillCount:new Set(skills).size,
    transferIncluded:quest.some(q=>q.role==='transfer') ? 1 : 0
  };
}

function aggregate(rows){
  return {
    learnerCount:rows.length,
    meanHiddenNeed:mean(rows.map(r=>r.meanHiddenNeed)),
    weakestSkillHitRate:mean(rows.map(r=>r.weakestSkillHit)),
    dueSkillCoverage:mean(rows.map(r=>r.dueSkillCoverage)),
    meanUniqueSkillCount:mean(rows.map(r=>r.uniqueSkillCount)),
    transferInclusionRate:mean(rows.map(r=>r.transferIncluded))
  };
}

function profileFromMastery(mastery,stats,dueRows={},useFsrs=false){
  return {
    skills:Object.fromEntries(
      Object.keys(mastery).map(skill => [skill,{
        psiMastery:Number(mastery[skill]),
        psiUncertainty:0,
        fsrsDue:useFsrs && Boolean(dueRows[skill]?.due),
        lastSeenAt:Number(stats[skill]?.lastSeen || 0)
      }])
    )
  };
}

const evaluationPath=getArg('evaluation');
const psiPath=getArg('psi');
const fsrsPath=getArg('fsrs');
const outPath=getArg('out');
if(!evaluationPath || !psiPath || !fsrsPath || !outPath){
  throw new Error('--evaluation, --psi, --fsrs, and --out are required');
}

const evaluation=JSON.parse(fs.readFileSync(evaluationPath,'utf8'));
const psi=JSON.parse(fs.readFileSync(psiPath,'utf8'));
const fsrs=JSON.parse(fs.readFileSync(fsrsPath,'utf8'));

if(evaluation.authorization !== 'synthetic-only-no-real-player-data'){
  throw new Error('development diagnostics require synthetic-only data');
}
if(Number(evaluation.seed) === 20261103){
  throw new Error('locked final holdout seed is forbidden in development diagnostics');
}

const reverseUser=Object.fromEntries(
  Object.entries(evaluation.userIdMap).map(([player,id])=>[String(id),player])
);
const psiByPlayer={};
for(const [numeric,rows] of Object.entries(psi.skillPredictions || {})){
  const player=reverseUser[String(numeric)];
  if(player) psiByPlayer[player]=rows;
}
const fsrsByPlayer=parseFsrs(fsrs);

const questions=gameModel.buildQuestions();
const now=Date.parse(fsrs.evaluationAt);
const rowsByPolicy={
  currentHeuristic:[],
  bktOnly:[],
  bktPlusFsrs:[],
  psiOnly:[],
  psiPlusFsrs:[],
  oracleTruth:[],
  oracleTruthPlusFsrs:[]
};
const blendAlphas=[0,0.1,0.25,0.5,0.75,1];
const blendRows=Object.fromEntries(
  blendAlphas.map(alpha=>[String(alpha),[]])
);
const psiTruthPairs=[];
const bktTruthPairs=[];
const perSkill=Object.fromEntries(
  evaluation.skills.map(skill=>[skill,{psi:[],bkt:[]}])
);

const cohort=evaluation.learners.filter(
  learner=>Boolean(psiByPlayer[learner.playerLocalId])
);
if(!cohort.length) throw new Error('no PSI-held-out learners');

for(const learner of cohort){
  const player=learner.playerLocalId;
  const truth=learner.selectionTruthMastery;
  const bkt=learner.selectionBktMastery;
  const stats=learner.selectionStats;
  const psiRows=psiByPlayer[player];
  const due=fsrsByPlayer[player] || {};

  if(!truth || !bkt || !stats || !psiRows){
    throw new Error('missing decision-boundary state for '+player);
  }

  for(const skill of evaluation.skills){
    const t=Number(truth[skill]);
    const p=Number(psiRows[skill]);
    const b=Number(bkt[skill]);
    if(![t,p,b].every(Number.isFinite)){
      throw new Error('non-finite mastery state for '+player+':'+skill);
    }
    psiTruthPairs.push([p,t]);
    bktTruthPairs.push([b,t]);
    perSkill[skill].psi.push([p,t]);
    perSkill[skill].bkt.push([b,t]);
  }

  const policies={
    currentHeuristic:gameModel.pickQuest(stats,5,now),
    bktOnly:pickQuestV2Shadow(
      questions,profileFromMastery(bkt,stats,due,false),5,now
    ),
    bktPlusFsrs:pickQuestV2Shadow(
      questions,profileFromMastery(bkt,stats,due,true),5,now
    ),
    psiOnly:pickQuestV2Shadow(
      questions,profileFromMastery(psiRows,stats,due,false),5,now
    ),
    psiPlusFsrs:pickQuestV2Shadow(
      questions,profileFromMastery(psiRows,stats,due,true),5,now
    ),
    oracleTruth:pickQuestV2Shadow(
      questions,profileFromMastery(truth,stats,due,false),5,now
    ),
    oracleTruthPlusFsrs:pickQuestV2Shadow(
      questions,profileFromMastery(truth,stats,due,true),5,now
    )
  };

  for(const [name,quest] of Object.entries(policies)){
    rowsByPolicy[name].push(questMetrics(quest,truth,due));
  }

  for(const alpha of blendAlphas){
    const blended=Object.fromEntries(
      evaluation.skills.map(skill=>[
        skill,
        (1-alpha)*Number(bkt[skill]) + alpha*Number(psiRows[skill])
      ])
    );
    const quest=pickQuestV2Shadow(
      questions,
      profileFromMastery(blended,stats,due,true),
      5,
      now
    );
    blendRows[String(alpha)].push(questMetrics(quest,truth,due));
  }
}

const masteryDiagnostics={
  psi:{
    mae:mae(psiTruthPairs),
    rmse:rmse(psiTruthPairs),
    pearson:pearson(psiTruthPairs),
    meanPrediction:mean(psiTruthPairs.map(([p])=>p)),
    meanTruth:mean(psiTruthPairs.map(([,t])=>t)),
    bias:mean(psiTruthPairs.map(([p,t])=>p-t))
  },
  bkt:{
    mae:mae(bktTruthPairs),
    rmse:rmse(bktTruthPairs),
    pearson:pearson(bktTruthPairs),
    meanPrediction:mean(bktTruthPairs.map(([p])=>p)),
    meanTruth:mean(bktTruthPairs.map(([,t])=>t)),
    bias:mean(bktTruthPairs.map(([p,t])=>p-t))
  },
  perSkill:Object.fromEntries(
    evaluation.skills.map(skill=>[skill,{
      psi:{
        mae:mae(perSkill[skill].psi),
        pearson:pearson(perSkill[skill].psi)
      },
      bkt:{
        mae:mae(perSkill[skill].bkt),
        pearson:pearson(perSkill[skill].bkt)
      }
    }])
  )
};

const policies=Object.fromEntries(
  Object.entries(rowsByPolicy).map(([name,rows])=>[name,aggregate(rows)])
);

const delta=(a,b,key)=>Number(a[key])-Number(b[key]);
const blendSweep=Object.fromEntries(
  blendAlphas.map(alpha=>[
    String(alpha),
    aggregate(blendRows[String(alpha)])
  ])
);

const rankedBlendCandidates=blendAlphas
  .map(alpha=>({
    alpha,
    ...blendSweep[String(alpha)]
  }))
  .sort((a,b)=>
    b.weakestSkillHitRate-a.weakestSkillHitRate ||
    b.meanHiddenNeed-a.meanHiddenNeed ||
    a.alpha-b.alpha
  );

const attribution={
  fsrsOnBkt:{
    meanHiddenNeed:delta(policies.bktPlusFsrs,policies.bktOnly,'meanHiddenNeed'),
    weakestSkillHitRate:delta(policies.bktPlusFsrs,policies.bktOnly,'weakestSkillHitRate'),
    dueSkillCoverage:delta(policies.bktPlusFsrs,policies.bktOnly,'dueSkillCoverage')
  },
  fsrsOnPsi:{
    meanHiddenNeed:delta(policies.psiPlusFsrs,policies.psiOnly,'meanHiddenNeed'),
    weakestSkillHitRate:delta(policies.psiPlusFsrs,policies.psiOnly,'weakestSkillHitRate'),
    dueSkillCoverage:delta(policies.psiPlusFsrs,policies.psiOnly,'dueSkillCoverage')
  },
  psiVsBktWithoutFsrs:{
    meanHiddenNeed:delta(policies.psiOnly,policies.bktOnly,'meanHiddenNeed'),
    weakestSkillHitRate:delta(policies.psiOnly,policies.bktOnly,'weakestSkillHitRate')
  },
  selectorHeadroom:{
    oracleVsBkt:{
      meanHiddenNeed:delta(policies.oracleTruth,policies.bktOnly,'meanHiddenNeed'),
      weakestSkillHitRate:delta(policies.oracleTruth,policies.bktOnly,'weakestSkillHitRate')
    },
    oracleVsHeuristic:{
      meanHiddenNeed:delta(policies.oracleTruth,policies.currentHeuristic,'meanHiddenNeed'),
      weakestSkillHitRate:delta(policies.oracleTruth,policies.currentHeuristic,'weakestSkillHitRate')
    }
  }
};

const result={
  schemaVersion:'starblox-learning-development-diagnostic-v1',
  developmentOnly:true,
  finalHoldoutSeedForbidden:20261103,
  datasetAuthorization:evaluation.authorization,
  seed:evaluation.seed,
  sourceLearnerCount:evaluation.learnerCount,
  evaluatedLearnerCount:cohort.length,
  selectionStep:evaluation.selectionStep,
  heldOutStepCount:evaluation.heldOutStepCount,
  psiKt:{
    model:psi.model,
    upstreamCommit:psi.upstreamCommit,
    bestEpoch:psi.bestEpoch,
    bestValidationBce:psi.bestValidationBce,
    heldoutMetrics:psi.metrics
  },
  fsrs:{
    engine:fsrs.engine,
    engineVersion:fsrs.engineVersion,
    cardCount:fsrs.cardCount,
    commandCount:fsrs.commandCount
  },
  masteryDiagnostics,
  policies,
  hybridBlendSweep:{
    interpretation:'alpha=0 is BKT-only mastery; alpha=1 is PSI-only mastery. All blend candidates use the existing Selector V2 formula and actual FSRS due state.',
    candidates:blendSweep,
    bestDevelopmentCandidate:rankedBlendCandidates[0]
  },
  attribution,
  promotionBoundary:{
    liveSelectorV2Allowed:false,
    note:'Development diagnostic only. Any changed candidate requires a new untouched final holdout.'
  }
};

fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n','utf8');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
