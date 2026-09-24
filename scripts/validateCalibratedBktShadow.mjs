import fs from 'node:fs';
import {
  CALIBRATED_BKT_SHADOW_PARAMS,
  CALIBRATED_BKT_SHADOW_VERSION
} from '../src/calibratedBktShadow.js';

function arg(name,fallback=''){
  const prefix='--'+name+'=';
  const found=process.argv.find(value=>value.startsWith(prefix));
  return found?found.slice(prefix.length):fallback;
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
function mean(values){
  return values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
}
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
  const order=values.map((v,i)=>({v,i}))
    .sort((a,b)=>a.v-b.v||a.i-b.i);
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
  const abs=[],sq=[],lp=[],ls=[],weak=[],top3=[],flatP=[],flatT=[];
  for(const [player,pred] of Object.entries(states)){
    const actual=truth[player];
    const p=skills.map(s=>Number(pred[s]));
    const t=skills.map(s=>Number(actual[s]));
    p.forEach((x,i)=>{
      abs.push(Math.abs(x-t[i]));
      sq.push((x-t[i])**2);
      flatP.push(x);flatT.push(t[i]);
    });
    lp.push(pearson(p,t));
    ls.push(spearman(p,t));
    const po=skills.map((s,i)=>({s,i,v:p[i]}))
      .sort((a,b)=>a.v-b.v||a.s.localeCompare(b.s));
    const tw=skills.map((s,i)=>({s,i,v:t[i]}))
      .sort((a,b)=>a.v-b.v||a.s.localeCompare(b.s))[0].i;
    weak.push(po[0].i===tw?1:0);
    top3.push(po.slice(0,3).some(row=>row.i===tw)?1:0);
  }
  return {
    learnerCount:Object.keys(states).length,
    skillCount:skills.length,
    mae:mean(abs),
    rmse:Math.sqrt(mean(sq)),
    globalPearson:pearson(flatP,flatT),
    meanLearnerPearson:mean(lp),
    meanLearnerSpearman:mean(ls),
    weakestSkillHitRate:mean(weak),
    weakestSkillTop3Rate:mean(top3)
  };
}
function delta(a,b){
  const out={};
  for(const k of ['mae','rmse','globalPearson','meanLearnerPearson','meanLearnerSpearman','weakestSkillHitRate','weakestSkillTop3Rate']){
    out[k]=a[k]-b[k];
  }
  return out;
}
function equalParams(a,b){
  return ['pKnow','pLearn','pGuess','pSlip'].every(
    k=>Number(a[k])===Number(b[k])
  );
}

const manifestPath=arg('manifest');
const evaluationPath=arg('evaluation');
const interactionsPath=arg('interactions');
const outPath=arg('out');
if(!manifestPath||!evaluationPath||!interactionsPath||!outPath){
  throw new Error('--manifest, --evaluation, --interactions, --out required');
}
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const evaluation=JSON.parse(fs.readFileSync(evaluationPath,'utf8'));
if(manifest.tuneAgainstThisCohort!==false)throw new Error('validation must be no-tuning');
if(manifest.authorization!=='synthetic-only-no-real-player-data'||evaluation.authorization!==manifest.authorization){
  throw new Error('synthetic-only authorization required');
}
if(Number(manifest.seed)!==Number(evaluation.seed))throw new Error('seed mismatch');
if((manifest.forbiddenSeeds||[]).includes(Number(evaluation.seed)))throw new Error('forbidden seed reused');
if(Number(manifest.selectionStep)!==Number(evaluation.selectionStep))throw new Error('selection boundary mismatch');
if(manifest.candidate.version!==CALIBRATED_BKT_SHADOW_VERSION)throw new Error('candidate version drift');
if(!equalParams(manifest.candidate.params,CALIBRATED_BKT_SHADOW_PARAMS))throw new Error('candidate parameter drift');

const reverseUser=Object.fromEntries(Object.entries(evaluation.userIdMap).map(([p,id])=>[String(id),p]));
const reverseSkill=Object.fromEntries(Object.entries(evaluation.skillIdMap).map(([s,id])=>[String(id),s]));
const grouped={};
for(const row of parseTsv(interactionsPath)){
  const player=reverseUser[String(row.user_id)];
  const skill=reverseSkill[String(row.skill_id)];
  (grouped[player]??=[]).push({
    skill,
    correct:Boolean(row.correct),
    timestamp:Number(row.timestamp)
  });
}
for(const rows of Object.values(grouped))rows.sort((a,b)=>a.timestamp-b.timestamp);

function replay(params){
  const states={};
  for(const player of Object.keys(grouped).sort()){
    const state=Object.fromEntries(evaluation.skills.map(skill=>[skill,Number(params.pKnow)]));
    for(const event of grouped[player].slice(0,Number(evaluation.selectionStep))){
      state[event.skill]=update(state[event.skill],event.correct,params);
    }
    states[player]=state;
  }
  return states;
}

const baselineMetrics=evaluate(replay(manifest.baseline.params),evaluation);
const candidateMetrics=evaluate(replay(manifest.candidate.params),evaluation);
const vsBaseline=delta(candidateMetrics,baselineMetrics);
const t=manifest.thresholds;
const checks={
  meanSpearmanGain:vsBaseline.meanLearnerSpearman>=Number(t.meanSpearmanGainMin),
  globalPearsonGain:vsBaseline.globalPearson>=Number(t.globalPearsonGainMin),
  weakestSkillHitGain:vsBaseline.weakestSkillHitRate>=Number(t.weakestSkillHitGainMin),
  maeNonRegression:vsBaseline.mae<=Number(t.maeDeltaMax)
};
const validationSupportive=Object.values(checks).every(Boolean);

const result={
  schemaVersion:'starblox-calibrated-bkt-development-validation-result-v1',
  validationOnly:true,
  tuneAgainstThisCohort:false,
  authorization:evaluation.authorization,
  benchmarkId:manifest.benchmarkId,
  seed:evaluation.seed,
  candidate:manifest.candidate,
  baseline:manifest.baseline,
  metrics:{baseline:baselineMetrics,candidate:candidateMetrics},
  vsBaseline,
  thresholds:t,
  checks,
  validationSupportive,
  promotionBoundary:{
    liveSelectorAllowed:false,
    note:validationSupportive
      ?'Independent BKT model validation is supportive. Candidate may proceed to selector-development research on a fresh cohort, but remains shadow-only.'
      :'Calibrated BKT failed independent validation and must be retired or retuned only on a new development cohort.'
  }
};
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n','utf8');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
