import fs from 'node:fs';

function arg(name,fallback=''){
  const prefix='--'+name+'=';
  const found=process.argv.find(value=>value.startsWith(prefix));
  return found?found.slice(prefix.length):fallback;
}
function clamp01(value){return Math.max(0,Math.min(1,Number(value)||0));}
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
function spearman(a,b){return pearson(ranks(a),ranks(b));}
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
      abs.push(Math.abs(x-t[i]));sq.push((x-t[i])**2);
      flatP.push(x);flatT.push(t[i]);
    });
    lp.push(pearson(p,t));ls.push(spearman(p,t));
    const po=skills.map((s,i)=>({s,i,v:p[i]})).sort((a,b)=>a.v-b.v||a.s.localeCompare(b.s));
    const tw=skills.map((s,i)=>({s,i,v:t[i]})).sort((a,b)=>a.v-b.v||a.s.localeCompare(b.s))[0].i;
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
function deltas(a,b){
  const out={};
  for(const key of ['mae','rmse','globalPearson','meanLearnerPearson','meanLearnerSpearman','weakestSkillHitRate','weakestSkillTop3Rate']){
    out[key]=a[key]-b[key];
  }
  return out;
}
function sameParams(a,b){
  return ['pKnow','pLearn','pGuess','pSlip'].every(k=>Number(a[k])===Number(b[k]));
}

const manifestPath=arg('manifest');
const evaluationPath=arg('evaluation');
const interactionsPath=arg('interactions');
const outPath=arg('out');
if(!manifestPath||!evaluationPath||!interactionsPath||!outPath){
  throw new Error('--manifest, --evaluation, --interactions, and --out are required');
}
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const evaluation=JSON.parse(fs.readFileSync(evaluationPath,'utf8'));
if(manifest.authorization!=='synthetic-only-no-real-player-data'||evaluation.authorization!==manifest.authorization){
  throw new Error('synthetic-only authorization required');
}
if(Number(manifest.seed)!==Number(evaluation.seed))throw new Error('seed mismatch');
if((manifest.forbiddenSeeds||[]).includes(Number(evaluation.seed)))throw new Error('forbidden seed reused');
if(Number(manifest.selectionStep)!==Number(evaluation.selectionStep))throw new Error('selection boundary mismatch');

const reverseUser=Object.fromEntries(Object.entries(evaluation.userIdMap).map(([player,id])=>[String(id),player]));
const reverseSkill=Object.fromEntries(Object.entries(evaluation.skillIdMap).map(([skill,id])=>[String(id),skill]));
const grouped={};
for(const row of parseTsv(interactionsPath)){
  const player=reverseUser[String(row.user_id)];
  const skill=reverseSkill[String(row.skill_id)];
  if(!player||!skill)throw new Error('unknown interaction mapping');
  (grouped[player]??=[]).push({
    skill,
    correct:Boolean(row.correct),
    timestamp:Number(row.timestamp)
  });
}
for(const rows of Object.values(grouped)){
  rows.sort((a,b)=>a.timestamp-b.timestamp);
}

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

const defaultParams=manifest.defaultParams;
const defaultStates=replay(defaultParams);
const defaultMetrics=evaluate(defaultStates,evaluation);

// Prove this implementation is exactly the StarBlox default BKT used by the generator.
let maxDefaultDifference=0;
for(const learner of evaluation.learners){
  const replayed=defaultStates[learner.playerLocalId];
  for(const skill of evaluation.skills){
    maxDefaultDifference=Math.max(
      maxDefaultDifference,
      Math.abs(Number(replayed[skill])-Number(learner.selectionBktMastery[skill]))
    );
  }
}
const storedStateRoundingTolerance=5.000001e-7; // selection BKT values are persisted to 6 decimals
if(maxDefaultDifference>storedStateRoundingTolerance){
  throw new Error('BKT replay exceeds stored-state rounding tolerance: '+maxDefaultDifference);
}

const g=manifest.grid;
const rows=[];
for(const pKnow of g.pKnow){
  for(const pLearn of g.pLearn){
    for(const pGuess of g.pGuess){
      for(const pSlip of g.pSlip){
        const params={pKnow,pLearn,pGuess,pSlip};
        const metrics=evaluate(replay(params),evaluation);
        const vsDefault=deltas(metrics,defaultMetrics);
        const r=manifest.candidateRule;
        const checks={
          meanSpearmanGain:vsDefault.meanLearnerSpearman>=Number(r.meanSpearmanGainMin),
          globalPearsonGain:vsDefault.globalPearson>=Number(r.globalPearsonGainMin),
          weakestSkillHitGain:vsDefault.weakestSkillHitRate>=Number(r.weakestSkillHitGainMin),
          maeRegression:vsDefault.mae<=Number(r.maeRegressionMax)
        };
        const supportive=Object.values(checks).every(Boolean);
        const objective=
          vsDefault.meanLearnerSpearman*5+
          vsDefault.weakestSkillHitRate*3+
          vsDefault.globalPearson*2-
          Math.max(0,vsDefault.mae)*2;
        rows.push({params,metrics,vsDefault,checks,supportive,objective,isDefault:sameParams(params,defaultParams)});
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
const selected=rows.find(row=>row.supportive&&!row.isDefault)||null;
const result={
  schemaVersion:'starblox-bkt-calibration-development-result-v1',
  developmentOnly:true,
  tuneAgainstThisCohort:true,
  authorization:evaluation.authorization,
  benchmarkId:manifest.benchmarkId,
  seed:evaluation.seed,
  gridSize:rows.length,
  maxDefaultReplayDifference:maxDefaultDifference,
  storedStateRoundingTolerance,
  default:{params:defaultParams,metrics:defaultMetrics},
  selected,
  supportive:Boolean(selected),
  topRows:rows.slice(0,15),
  promotionBoundary:{
    liveSelectorAllowed:false,
    note:selected
      ?'Development calibration only. Freeze selected BKT parameters and validate them on a new independent cohort before any selector research.'
      :'No non-default BKT parameter set cleared the predeclared calibration gate.'
  }
};
fs.writeFileSync(outPath,JSON.stringify(result,null,2)+'\n','utf8');
process.stdout.write(JSON.stringify({
  benchmarkId:result.benchmarkId,
  gridSize:result.gridSize,
  maxDefaultReplayDifference,
  default:result.default,
  selected,
  supportive:result.supportive,
  liveSelectorAllowed:false
},null,2)+'\n');
