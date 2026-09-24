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
function pearson(pairs){
  if(pairs.length<2) return 0;
  const xs=pairs.map(([x])=>x), ys=pairs.map(([,y])=>y);
  const mx=mean(xs), my=mean(ys);
  let n=0,dx=0,dy=0;
  for(let i=0;i<pairs.length;i++){
    const a=xs[i]-mx,b=ys[i]-my;
    n+=a*b; dx+=a*a; dy+=b*b;
  }
  return dx>0&&dy>0?n/Math.sqrt(dx*dy):0;
}
function mae(pairs){
  return pairs.length?mean(pairs.map(([a,b])=>Math.abs(a-b))):0;
}
function parseFsrs(receipt){
  const out={};
  for(const card of receipt.cards||[]){
    const first=String(card.cardId).indexOf(':');
    if(first<0) continue;
    const player=String(card.cardId).slice(0,first);
    const concept=String(card.cardId).slice(first+1);
    const skill=concept.startsWith('skill:')?concept.slice(6):concept;
    out[player]||={};
    out[player][skill]={due:Boolean(card.dueAtEvaluation)};
  }
  return out;
}
function profile(mastery,stats,due,useFsrs){
  return {skills:Object.fromEntries(Object.keys(mastery).map(skill=>[
    skill,{
      psiMastery:Number(mastery[skill]),
      psiUncertainty:0,
      fsrsDue:useFsrs&&Boolean(due[skill]?.due),
      lastSeenAt:Number(stats[skill]?.lastSeen||0)
    }
  ]))};
}
function questMetrics(quest,truth,due){
  const skills=quest.map(q=>q.skill);
  const weakest=Object.entries(truth)
    .sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]))[0]?.[0]||'';
  const dueSkills=Object.entries(due).filter(([,v])=>v.due).map(([s])=>s);
  return {
    meanHiddenNeed:mean(skills.map(skill=>1-Number(truth[skill]??0.5))),
    weakestSkillHit:skills.includes(weakest)?1:0,
    dueSkillCoverage:dueSkills.length
      ?dueSkills.filter(skill=>skills.includes(skill)).length/dueSkills.length
      :1,
    uniqueSkillCount:new Set(skills).size,
    transferIncluded:quest.some(q=>q.role==='transfer')?1:0
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

const evaluation=JSON.parse(fs.readFileSync(getArg('evaluation'),'utf8'));
const psi=JSON.parse(fs.readFileSync(getArg('psi'),'utf8'));
const fsrs=JSON.parse(fs.readFileSync(getArg('fsrs'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(getArg('manifest'),'utf8'));
const out=getArg('out');

if(manifest.status!=='development-validation-no-tuning'){
  throw new Error('candidate validation manifest must forbid tuning');
}
if(Number(evaluation.seed)!==Number(manifest.seed)){
  throw new Error('evaluation seed does not match frozen validation seed');
}
if(Number(evaluation.seed)===Number(manifest.forbiddenFinalHoldoutSeed)){
  throw new Error('locked final holdout seed is forbidden');
}
const alpha=Number(manifest.frozenPsiBlendAlpha);
if(!Number.isFinite(alpha)||alpha<0||alpha>1){
  throw new Error('invalid frozen blend alpha');
}

const reverseUser=Object.fromEntries(
  Object.entries(evaluation.userIdMap).map(([player,id])=>[String(id),player])
);
const psiByPlayer={};
for(const [id,rows] of Object.entries(psi.skillPredictions||{})){
  const player=reverseUser[String(id)];
  if(player) psiByPlayer[player]=rows;
}
const fsrsByPlayer=parseFsrs(fsrs);
const questions=gameModel.buildQuestions();
const now=Date.parse(fsrs.evaluationAt);
const rows={currentHeuristic:[],bktPlusFsrs:[],frozenHybrid:[]};
const psiPairs=[],bktPairs=[];

const cohort=evaluation.learners.filter(l=>Boolean(psiByPlayer[l.playerLocalId]));
for(const learner of cohort){
  const player=learner.playerLocalId;
  const truth=learner.selectionTruthMastery;
  const bkt=learner.selectionBktMastery;
  const stats=learner.selectionStats;
  const psiRows=psiByPlayer[player];
  const due=fsrsByPlayer[player]||{};
  if(!truth||!bkt||!stats||!psiRows) throw new Error('missing state for '+player);

  const hybrid={};
  for(const skill of evaluation.skills){
    const t=Number(truth[skill]),b=Number(bkt[skill]),p=Number(psiRows[skill]);
    if(![t,b,p].every(Number.isFinite)) throw new Error('non-finite state');
    psiPairs.push([p,t]); bktPairs.push([b,t]);
    hybrid[skill]=(1-alpha)*b+alpha*p;
  }

  const q0=gameModel.pickQuest(stats,5,now);
  const qb=pickQuestV2Shadow(questions,profile(bkt,stats,due,true),5,now);
  const qh=pickQuestV2Shadow(questions,profile(hybrid,stats,due,true),5,now);
  rows.currentHeuristic.push(questMetrics(q0,truth,due));
  rows.bktPlusFsrs.push(questMetrics(qb,truth,due));
  rows.frozenHybrid.push(questMetrics(qh,truth,due));
}

const policies=Object.fromEntries(
  Object.entries(rows).map(([name,value])=>[name,aggregate(value)])
);
const candidate=policies.frozenHybrid;
const bkt=policies.bktPlusFsrs;
const heuristic=policies.currentHeuristic;

const result={
  schemaVersion:'starblox-learning-development-candidate-validation-v1',
  validationOnly:true,
  tuneAgainstThisCohort:false,
  benchmarkId:manifest.benchmarkId,
  seed:evaluation.seed,
  frozenPsiBlendAlpha:alpha,
  evaluatedLearnerCount:cohort.length,
  masteryDiagnostics:{
    psi:{mae:mae(psiPairs),pearson:pearson(psiPairs)},
    bkt:{mae:mae(bktPairs),pearson:pearson(bktPairs)}
  },
  policies,
  deltas:{
    hybridVsBkt:{
      meanHiddenNeed:candidate.meanHiddenNeed-bkt.meanHiddenNeed,
      weakestSkillHitRate:candidate.weakestSkillHitRate-bkt.weakestSkillHitRate,
      dueSkillCoverage:candidate.dueSkillCoverage-bkt.dueSkillCoverage
    },
    hybridVsHeuristic:{
      meanHiddenNeed:candidate.meanHiddenNeed-heuristic.meanHiddenNeed,
      weakestSkillHitRate:candidate.weakestSkillHitRate-heuristic.weakestSkillHitRate,
      dueSkillCoverage:candidate.dueSkillCoverage-heuristic.dueSkillCoverage
    }
  },
  validationSupportive:(
    candidate.meanHiddenNeed>=bkt.meanHiddenNeed &&
    candidate.weakestSkillHitRate>=bkt.weakestSkillHitRate &&
    candidate.meanHiddenNeed>=heuristic.meanHiddenNeed &&
    candidate.weakestSkillHitRate>=heuristic.weakestSkillHitRate
  ),
  promotionBoundary:{
    liveSelectorV2Allowed:false,
    note:'Development validation only. A supportive result would still require a newly locked untouched final holdout.'
  }
};

fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n','utf8');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
