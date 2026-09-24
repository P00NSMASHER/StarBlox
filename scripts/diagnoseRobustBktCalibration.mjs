import fs from 'node:fs';

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
const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
function update(prior,correct,p){
  const k=clamp01(prior);
  const knownCorrect=1-p.pSlip;
  const unknownCorrect=p.pGuess;
  let numerator,denominator;
  if(correct){
    numerator=k*knownCorrect;
    denominator=numerator+(1-k)*unknownCorrect;
  }else{
    numerator=k*p.pSlip;
    denominator=numerator+(1-k)*(1-unknownCorrect);
  }
  const posterior=denominator>0?numerator/denominator:k;
  return clamp01(posterior+(1-posterior)*p.pLearn);
}
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
function pearson(a,b){
  if(a.length<2)return 0;
  const ma=mean(a),mb=mean(b);
  let num=0,da=0,db=0;
  for(let i=0;i<a.length;i++){
    const x=a[i]-ma,y=b[i]-mb;
    num+=x*y;da+=x*x;db+=y*y;
  }
  return da&&db?num/Math.sqrt(da*db):0;
}
function ranks(values){
  const order=values.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v||a.i-b.i);
  const out=Array(values.length).fill(0);
  for(let i=0;i<order.length;){
    let j=i+1;
    while(j<order.length&&order[j].v===order[i].v)j++;
    const rank=(i+j-1)/2;
    for(let k=i;k<j;k++)out[order[k].i]=rank;
    i=j;
  }
  return out;
}
const spearman=(a,b)=>pearson(ranks(a),ranks(b));
function parseTsv(path){
  const lines=fs.readFileSync(path,'utf8').trim().split(/\r?\n/);
  const header=lines[0].split('\t');
  return lines.slice(1).map(line=>{
    const cells=line.split('\t');
    return Object.fromEntries(header.map((key,i)=>[key,Number(cells[i])]));
  });
}
function evaluate(states,evaluation){
  const skills=evaluation.skills;
  const truth=Object.fromEntries(
    evaluation.learners.map(row=>[row.playerLocalId,row.selectionTruthMastery])
  );
  const abs=[],lp=[],ls=[],weak=[],top3=[],flatP=[],flatT=[];
  for(const [player,pred] of Object.entries(states)){
    const actual=truth[player];
    const p=skills.map(s=>Number(pred[s]));
    const t=skills.map(s=>Number(actual[s]));
    p.forEach((x,i)=>{abs.push(Math.abs(x-t[i]));flatP.push(x);flatT.push(t[i]);});
    lp.push(pearson(p,t));ls.push(spearman(p,t));
    const po=skills.map((s,i)=>({s,i,v:p[i]})).sort((a,b)=>a.v-b.v||a.s.localeCompare(b.s));
    const tw=skills.map((s,i)=>({s,i,v:t[i]})).sort((a,b)=>a.v-b.v||a.s.localeCompare(b.s))[0].i;
    weak.push(po[0].i===tw?1:0);
    top3.push(po.slice(0,3).some(row=>row.i===tw)?1:0);
  }
  return {
    mae:mean(abs),
    globalPearson:pearson(flatP,flatT),
    meanLearnerPearson:mean(lp),
    meanLearnerSpearman:mean(ls),
    weakestSkillHitRate:mean(weak),
    weakestSkillTop3Rate:mean(top3)
  };
}
function delta(a,b){
  return {
    mae:a.mae-b.mae,
    globalPearson:a.globalPearson-b.globalPearson,
    meanLearnerPearson:a.meanLearnerPearson-b.meanLearnerPearson,
    meanLearnerSpearman:a.meanLearnerSpearman-b.meanLearnerSpearman,
    weakestSkillHitRate:a.weakestSkillHitRate-b.weakestSkillHitRate,
    weakestSkillTop3Rate:a.weakestSkillTop3Rate-b.weakestSkillTop3Rate
  };
}

const manifestPath=arg('manifest');
const outPath=arg('out');
const cohortArgs=allArgs('cohort');
if(!manifestPath||!outPath||!cohortArgs.length){
  throw new Error('--manifest, repeated --cohort=evaluation|interactions, and --out required');
}
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
if(manifest.authorization!=='synthetic-only-no-real-player-data')throw new Error('synthetic-only manifest required');
if(manifest.tuneAgainstTheseCohorts!==true)throw new Error('robust cohorts must be development tuning cohorts');

const cohorts=cohortArgs.map(spec=>{
  const split=spec.indexOf('|');
  if(split<0)throw new Error('cohort must be evaluation|interactions');
  const evaluation=JSON.parse(fs.readFileSync(spec.slice(0,split),'utf8'));
  const interactions=parseTsv(spec.slice(split+1));
  if(evaluation.authorization!==manifest.authorization)throw new Error('cohort authorization mismatch');
  if((manifest.forbiddenSeeds||[]).includes(Number(evaluation.seed)))throw new Error('forbidden seed reused: '+evaluation.seed);
  if(!manifest.seeds.includes(Number(evaluation.seed)))throw new Error('unexpected development seed: '+evaluation.seed);
  if(Number(evaluation.selectionStep)!==Number(manifest.selectionStep))throw new Error('selection boundary mismatch');

  const reverseUser=Object.fromEntries(Object.entries(evaluation.userIdMap).map(([p,id])=>[String(id),p]));
  const reverseSkill=Object.fromEntries(Object.entries(evaluation.skillIdMap).map(([s,id])=>[String(id),s]));
  const grouped={};
  for(const row of interactions){
    const player=reverseUser[String(row.user_id)];
    const skill=reverseSkill[String(row.skill_id)];
    (grouped[player]??=[]).push({skill,correct:Boolean(row.correct),timestamp:Number(row.timestamp)});
  }
  for(const rows of Object.values(grouped))rows.sort((a,b)=>a.timestamp-b.timestamp);

  const replay=params=>{
    const states={};
    for(const player of Object.keys(grouped).sort()){
      const state=Object.fromEntries(evaluation.skills.map(skill=>[skill,Number(params.pKnow)]));
      for(const event of grouped[player].slice(0,Number(evaluation.selectionStep))){
        state[event.skill]=update(state[event.skill],event.correct,params);
      }
      states[player]=state;
    }
    return states;
  };

  const defaultStates=replay(manifest.defaultParams);
  let maxReplayDiff=0;
  for(const learner of evaluation.learners){
    for(const skill of evaluation.skills){
      maxReplayDiff=Math.max(
        maxReplayDiff,
        Math.abs(Number(defaultStates[learner.playerLocalId][skill])-Number(learner.selectionBktMastery[skill]))
      );
    }
  }
  if(maxReplayDiff>5.000001e-7)throw new Error('default replay drift on '+evaluation.seed+': '+maxReplayDiff);
  return {
    seed:Number(evaluation.seed),
    evaluation,
    replay,
    defaultMetrics:evaluate(defaultStates,evaluation),
    maxDefaultReplayDifference:maxReplayDiff
  };
});

if(cohorts.length!==manifest.seeds.length)throw new Error('expected exactly '+manifest.seeds.length+' development cohorts');
const observedSeeds=cohorts.map(c=>c.seed).sort((a,b)=>a-b);
const expectedSeeds=[...manifest.seeds].sort((a,b)=>a-b);
if(JSON.stringify(observedSeeds)!==JSON.stringify(expectedSeeds))throw new Error('development seed set mismatch');

const g=manifest.grid;
const rows=[];
for(const pKnow of g.pKnow){
  for(const pLearn of g.pLearn){
    for(const pGuess of g.pGuess){
      for(const pSlip of g.pSlip){
        const params={pKnow,pLearn,pGuess,pSlip};
        const perSeed=cohorts.map(c=>{
          const metrics=evaluate(c.replay(params),c.evaluation);
          return {seed:c.seed,metrics,vsDefault:delta(metrics,c.defaultMetrics)};
        });
        const spearman=perSeed.map(r=>r.vsDefault.meanLearnerSpearman);
        const corr=perSeed.map(r=>r.vsDefault.globalPearson);
        const weakest=perSeed.map(r=>r.vsDefault.weakestSkillHitRate);
        const mae=perSeed.map(r=>r.vsDefault.mae);
        const aggregate={
          averageSpearmanGain:mean(spearman),
          worstSpearmanGain:Math.min(...spearman),
          averageGlobalPearsonGain:mean(corr),
          worstGlobalPearsonGain:Math.min(...corr),
          averageWeakestSkillHitGain:mean(weakest),
          worstWeakestSkillHitGain:Math.min(...weakest),
          averageMaeDelta:mean(mae),
          worstMaeDelta:Math.max(...mae)
        };
        const r=manifest.candidateRule;
        const checks={
          averageSpearmanGain:aggregate.averageSpearmanGain>=Number(r.averageSpearmanGainMin),
          worstSpearmanGain:aggregate.worstSpearmanGain>=Number(r.worstSpearmanGainMin),
          averageGlobalPearsonGain:aggregate.averageGlobalPearsonGain>=Number(r.averageGlobalPearsonGainMin),
          worstGlobalPearsonGain:aggregate.worstGlobalPearsonGain>=Number(r.worstGlobalPearsonGainMin),
          averageWeakestSkillHitGain:aggregate.averageWeakestSkillHitGain>=Number(r.averageWeakestSkillHitGainMin),
          worstWeakestSkillHitGain:aggregate.worstWeakestSkillHitGain>=Number(r.worstWeakestSkillHitGainMin),
          averageMaeDelta:aggregate.averageMaeDelta<=Number(r.averageMaeDeltaMax),
          worstMaeDelta:aggregate.worstMaeDelta<=Number(r.worstMaeDeltaMax)
        };
        const supportive=Object.values(checks).every(Boolean);
        const objective=
          aggregate.averageSpearmanGain*5+
          aggregate.worstSpearmanGain*3+
          aggregate.averageWeakestSkillHitGain*3+
          aggregate.averageGlobalPearsonGain*2-
          Math.max(0,aggregate.averageMaeDelta)*2-
          Math.max(0,aggregate.worstMaeDelta)*2;
        rows.push({params,aggregate,checks,supportive,objective,perSeed});
      }
    }
  }
}
rows.sort((a,b)=>
  Number(b.supportive)-Number(a.supportive)||
  b.objective-a.objective||
  a.params.pKnow-b.params.pKnow||
  a.params.pLearn-b.params.pLearn||
  a.params.pGuess-b.params.pGuess||
  a.params.pSlip-b.params.pSlip
);
const selected=rows.find(row=>row.supportive)||null;
const result={
  schemaVersion:'starblox-bkt-robust-calibration-development-result-v1',
  developmentOnly:true,
  tuneAgainstTheseCohorts:true,
  authorization:manifest.authorization,
  benchmarkId:manifest.benchmarkId,
  seeds:observedSeeds,
  gridSize:rows.length,
  defaultBySeed:cohorts.map(c=>({seed:c.seed,metrics:c.defaultMetrics,maxDefaultReplayDifference:c.maxDefaultReplayDifference})),
  selected,
  supportive:Boolean(selected),
  topRows:rows.slice(0,15),
  promotionBoundary:{
    liveSelectorAllowed:false,
    note:selected
      ?'Robust multi-seed development evidence only. Freeze candidate and use a new independent no-tuning validation cohort.'
      :'No BKT parameter set cleared the multi-seed robust development gate.'
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
