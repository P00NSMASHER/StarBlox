import fs from 'node:fs';

await import('../src/questionQualityRuntime.js');
await import('../src/semanticQuestionGuardRuntime.js');
await import('../src/diagnosticQuestionGuardRuntime.js');

const { gameModel }=await import('../src/gameModel.js');

function arg(name,fallback=''){
  const prefix='--'+name+'=';
  const found=process.argv.find(value=>value.startsWith(prefix));
  return found?found.slice(prefix.length):fallback;
}
function allArgs(name){
  const prefix='--'+name+'=';
  return process.argv.filter(value=>value.startsWith(prefix))
    .map(value=>value.slice(prefix.length));
}
const mean=v=>v.length?v.reduce((a,b)=>a+b,0)/v.length:0;

function score(question,stats,now,w){
  const stat=stats[question.skill]||{seen:0,correct:0,wrong:0,lastSeen:0};
  const dueDays=(now-(stat.lastSeen||0))/86400000;
  return (
    (stat.seen?0:w.unseenBonus)+
    (Number(stat.wrong)||0)*w.wrongWeight-
    (Number(stat.correct)||0)*w.correctPenalty+
    Math.min(w.dueCap,Math.max(0,dueDays)*w.duePerDay)+
    (question.role==='transfer'?w.transferBonus:0)+
    (question.role==='review'?w.reviewBonus:0)
  );
}

function pick(stats,count,now,w){
  const pool=gameModel.dailyPool(now);
  const ranked=[...pool].sort((a,b)=>score(b,stats,now,w)-score(a,stats,now,w));
  const picked=[];
  const take=predicate=>{
    const q=ranked.find(q=>!picked.some(p=>p.id===q.id)&&predicate(q));
    if(q)picked.push(q);
  };
  take(q=>q.role==='transfer');
  ['Lantern Lane','Story Street','Wordwood Garden'].forEach(district=>{
    if(picked.length<count){
      take(q=>q.district===district&&!picked.some(p=>p.skill===q.skill));
    }
  });
  ranked.forEach(q=>{
    if(
      picked.length<count &&
      !picked.some(p=>p.id===q.id) &&
      !picked.some(p=>p.skill===q.skill)
    )picked.push(q);
  });
  ranked.forEach(q=>{
    if(picked.length<count&&!picked.some(p=>p.id===q.id))picked.push(q);
  });
  return picked.slice(0,count);
}

function metrics(quest,learner){
  const truth=learner.selectionTruthMastery;
  const stats=learner.selectionStats;
  const skills=quest.map(q=>q.skill);
  const weakest=Object.entries(truth)
    .sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]))[0]?.[0]||'';
  const oldest=Object.entries(stats)
    .sort((a,b)=>
      Number(a[1]?.lastSeen||0)-Number(b[1]?.lastSeen||0)||
      a[0].localeCompare(b[0])
    )[0]?.[0]||'';
  return {
    meanHiddenNeed:mean(skills.map(skill=>1-Number(truth[skill]??0.5))),
    weakestSkillHitRate:skills.includes(weakest)?1:0,
    oldestSkillHitRate:skills.includes(oldest)?1:0,
    uniqueSkillCount:new Set(skills).size,
    transferInclusionRate:quest.some(q=>q.role==='transfer')?1:0
  };
}
function aggregate(rows){
  return {
    learnerCount:rows.length,
    meanHiddenNeed:mean(rows.map(r=>r.meanHiddenNeed)),
    weakestSkillHitRate:mean(rows.map(r=>r.weakestSkillHitRate)),
    oldestSkillHitRate:mean(rows.map(r=>r.oldestSkillHitRate)),
    uniqueSkillCount:mean(rows.map(r=>r.uniqueSkillCount)),
    transferInclusionRate:mean(rows.map(r=>r.transferInclusionRate))
  };
}
function delta(a,b){
  return {
    meanHiddenNeed:a.meanHiddenNeed-b.meanHiddenNeed,
    weakestSkillHitRate:a.weakestSkillHitRate-b.weakestSkillHitRate,
    oldestSkillHitRate:a.oldestSkillHitRate-b.oldestSkillHitRate,
    uniqueSkillCount:a.uniqueSkillCount-b.uniqueSkillCount,
    transferInclusionRate:a.transferInclusionRate-b.transferInclusionRate
  };
}

const manifestPath=arg('manifest');
const outPath=arg('out');
const cohortPaths=allArgs('evaluation');
if(!manifestPath||!outPath||!cohortPaths.length)throw new Error('--manifest, repeated --evaluation, and --out required');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(manifest.authorization!=='synthetic-only-no-real-player-data'||manifest.tuneAgainstTheseCohorts!==true){
  throw new Error('development-only synthetic manifest required');
}

const cohorts=cohortPaths.map(path=>{
  const evaluation=JSON.parse(fs.readFileSync(path,'utf8'));
  if(evaluation.authorization!==manifest.authorization)throw new Error('authorization mismatch');
  if((manifest.forbiddenSeeds||[]).includes(Number(evaluation.seed)))throw new Error('forbidden seed reused: '+evaluation.seed);
  if(!manifest.seeds.includes(Number(evaluation.seed)))throw new Error('unexpected seed: '+evaluation.seed);
  const maxLastSeen=Math.max(...evaluation.learners.flatMap(l=>
    Object.values(l.selectionStats).map(s=>Number(s.lastSeen||0))
  ));
  const now=maxLastSeen+24*60*60*1000;

  // Prove parameterized default is behaviorally identical to the live selector.
  for(const learner of evaluation.learners){
    const live=gameModel.pickQuest(learner.selectionStats,5,now).map(q=>q.id);
    const replay=pick(learner.selectionStats,5,now,manifest.defaultWeights).map(q=>q.id);
    if(JSON.stringify(live)!==JSON.stringify(replay)){
      throw new Error('default heuristic replay drift for '+learner.playerLocalId+' seed '+evaluation.seed);
    }
  }
  const baseline=aggregate(evaluation.learners.map(l=>
    metrics(gameModel.pickQuest(l.selectionStats,5,now),l)
  ));
  return {seed:Number(evaluation.seed),evaluation,now,baseline};
});
const observed=cohorts.map(c=>c.seed).sort((a,b)=>a-b);
const expected=[...manifest.seeds].sort((a,b)=>a-b);
if(JSON.stringify(observed)!==JSON.stringify(expected))throw new Error('development seed set mismatch');

const g=manifest.grid;
const rows=[];
for(const wrongWeight of g.wrongWeight){
  for(const correctPenalty of g.correctPenalty){
    for(const duePerDay of g.duePerDay){
      for(const dueCap of g.dueCap){
        const weights={
          ...manifest.defaultWeights,
          wrongWeight,
          correctPenalty,
          duePerDay,
          dueCap
        };
        const perSeed=cohorts.map(c=>{
          const candidate=aggregate(c.evaluation.learners.map(l=>
            metrics(pick(l.selectionStats,5,c.now,weights),l)
          ));
          return {seed:c.seed,candidate,baseline:c.baseline,vsDefault:delta(candidate,c.baseline)};
        });
        const hidden=perSeed.map(r=>r.vsDefault.meanHiddenNeed);
        const weakest=perSeed.map(r=>r.vsDefault.weakestSkillHitRate);
        const oldest=perSeed.map(r=>r.vsDefault.oldestSkillHitRate);
        const avgCandidateUnique=mean(perSeed.map(r=>r.candidate.uniqueSkillCount));
        const avgTransfer=mean(perSeed.map(r=>r.candidate.transferInclusionRate));
        const summary={
          averageHiddenNeedGain:mean(hidden),
          worstHiddenNeedGain:Math.min(...hidden),
          averageWeakestSkillHitGain:mean(weakest),
          worstWeakestSkillHitGain:Math.min(...weakest),
          averageOldestSkillHitGain:mean(oldest),
          worstOldestSkillHitGain:Math.min(...oldest),
          averageUniqueSkillCount:avgCandidateUnique,
          averageTransferInclusionRate:avgTransfer
        };
        const r=manifest.candidateRule;
        const checks={
          averageHiddenNeedGain:summary.averageHiddenNeedGain>=Number(r.averageHiddenNeedGainMin),
          worstHiddenNeedGain:summary.worstHiddenNeedGain>=Number(r.worstHiddenNeedGainMin),
          averageWeakestSkillHitGain:summary.averageWeakestSkillHitGain>=Number(r.averageWeakestSkillHitGainMin),
          worstWeakestSkillHitGain:summary.worstWeakestSkillHitGain>=Number(r.worstWeakestSkillHitGainMin),
          averageOldestSkillHitGain:summary.averageOldestSkillHitGain>=Number(r.averageOldestSkillHitGainMin),
          worstOldestSkillHitGain:summary.worstOldestSkillHitGain>=Number(r.worstOldestSkillHitGainMin),
          fiveUniqueSkills:avgCandidateUnique===5,
          transferIncluded:avgTransfer===1
        };
        const supportive=Object.values(checks).every(Boolean);
        const objective=
          summary.averageHiddenNeedGain*100+
          summary.worstHiddenNeedGain*60+
          summary.averageWeakestSkillHitGain*4+
          summary.worstWeakestSkillHitGain*2+
          summary.averageOldestSkillHitGain;
        rows.push({weights,summary,checks,supportive,objective,perSeed});
      }
    }
  }
}
rows.sort((a,b)=>
  Number(b.supportive)-Number(a.supportive)||
  b.objective-a.objective||
  a.weights.wrongWeight-b.weights.wrongWeight||
  a.weights.correctPenalty-b.weights.correctPenalty||
  a.weights.duePerDay-b.weights.duePerDay||
  a.weights.dueCap-b.weights.dueCap
);
const selected=rows.find(r=>r.supportive)||null;
const result={
  schemaVersion:'starblox-heuristic-robust-calibration-development-result-v1',
  developmentOnly:true,
  tuneAgainstTheseCohorts:true,
  authorization:manifest.authorization,
  benchmarkId:manifest.benchmarkId,
  seeds:observed,
  gridSize:rows.length,
  defaultBySeed:cohorts.map(c=>({seed:c.seed,metrics:c.baseline})),
  selected,
  supportive:Boolean(selected),
  topRows:rows.slice(0,15),
  promotionBoundary:{
    liveSelectorAllowed:false,
    note:selected
      ?'Robust heuristic development candidate only. Freeze weights and validate on a new independent no-tuning cohort before any final holdout.'
      :'No heuristic weight set cleared the robust multi-seed development gate.'
  }
};
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n','utf8');
process.stdout.write(JSON.stringify({
  benchmarkId:result.benchmarkId,
  seeds:result.seeds,
  gridSize:result.gridSize,
  selected,
  supportive:result.supportive,
  liveSelectorAllowed:false
},null,2)+'\n');
