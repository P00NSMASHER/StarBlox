export const BKT_FSRS_RISK_SELECTOR_VERSION = 'starblox-bkt-fsrs-risk-v1';
export const BKT_FSRS_RISK_WEIGHT = 40;

const DAY_MS=86400000;
const HOUR_MS=3600000;
const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));

export function scoreBktFsrsRiskQuestion(question,profile={},now=Date.now(),{
  riskWeight=BKT_FSRS_RISK_WEIGHT
}={}){
  const skill=profile?.skills?.[question.skill]||{};
  const mastery=Number.isFinite(Number(skill.bktMastery))
    ?clamp01(skill.bktMastery)
    :0.5;
  const retrievability=Number(skill.fsrsRetrievability);
  const forgettingRisk=Number.isFinite(retrievability)
    ?1-clamp01(retrievability)
    :0;
  const lastSeenAt=Math.max(0,Number(skill.lastSeenAt)||0);
  const ageDays=lastSeenAt?Math.max(0,(Number(now)-lastSeenAt)/DAY_MS):30;
  const recent=Boolean(lastSeenAt&&Number(now)-lastSeenAt<12*HOUR_MS);

  return (
    (1-mastery)*50 +
    forgettingRisk*Number(riskWeight) +
    Math.min(15,ageDays*2) +
    (question.role==='transfer'?8:0) +
    (question.role==='review'?4:0) -
    (recent?40:0)
  );
}

export function pickQuestBktFsrsRiskShadow(
  questions,
  profile={},
  count=5,
  now=Date.now(),
  options={}
){
  const ranked=[...(questions||[])]
    .map(question=>({
      question,
      score:scoreBktFsrsRiskQuestion(question,profile,now,options)
    }))
    .sort((a,b)=>
      b.score-a.score ||
      String(a.question.id).localeCompare(String(b.question.id))
    );

  const picked=[];
  const take=predicate=>{
    const row=ranked.find(({question})=>
      !picked.some(item=>item.id===question.id)&&predicate(question)
    );
    if(row)picked.push(row.question);
  };

  take(question=>question.role==='transfer');

  ['Lantern Lane','Story Street','Wordwood Garden'].forEach(district=>{
    if(picked.length<count){
      take(question=>
        question.district===district &&
        !picked.some(item=>item.skill===question.skill)
      );
    }
  });

  ranked.forEach(({question})=>{
    if(
      picked.length<count &&
      !picked.some(item=>item.id===question.id) &&
      !picked.some(item=>item.skill===question.skill)
    ){
      picked.push(question);
    }
  });

  ranked.forEach(({question})=>{
    if(picked.length<count&&!picked.some(item=>item.id===question.id)){
      picked.push(question);
    }
  });

  return picked.slice(0,count);
}
