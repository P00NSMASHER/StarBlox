export const HEURISTIC_ANCHORED_SELECTOR_VERSION='starblox-heuristic-bkt-fsrs-anchor-v1';

const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));

export function currentHeuristicScore(question,stats={},now=Date.now()){
  const stat=stats?.[question.skill]||{seen:0,correct:0,wrong:0,lastSeen:0};
  const dueDays=(Number(now)-(Number(stat.lastSeen)||0))/86400000;
  return (
    (stat.seen?0:80) +
    (Number(stat.wrong)||0)*18 -
    (Number(stat.correct)||0)*3 +
    Math.min(24,Math.max(0,dueDays)*4) +
    (question.role==='transfer'?10:0) +
    (question.role==='review'?4:0)
  );
}

export function bktFsrsSecondaryScore(question,profile={},{
  riskWeight=4
}={}){
  const skill=profile?.skills?.[question.skill]||{};
  const mastery=Number.isFinite(Number(skill.bktMastery))
    ?clamp01(skill.bktMastery)
    :0.5;
  const retrievability=Number(skill.fsrsRetrievability);
  const risk=Number.isFinite(retrievability)
    ?1-clamp01(retrievability)
    :0;
  return (1-mastery)*50 + risk*Number(riskWeight);
}

function chooseWithinHeuristicMargin(rows,stats,profile,now,{
  heuristicMargin=2,
  riskWeight=4
}={}){
  if(!rows.length)return null;
  const scored=rows.map(question=>({
    question,
    heuristic:currentHeuristicScore(question,stats,now),
    secondary:bktFsrsSecondaryScore(question,profile,{riskWeight})
  }));
  const maxHeuristic=Math.max(...scored.map(row=>row.heuristic));
  const finalists=scored.filter(
    row=>row.heuristic>=maxHeuristic-Number(heuristicMargin)
  );
  finalists.sort((a,b)=>
    b.secondary-a.secondary ||
    b.heuristic-a.heuristic ||
    String(a.question.id).localeCompare(String(b.question.id))
  );
  return finalists[0]?.question||null;
}

export function pickQuestHeuristicAnchoredShadow(
  questions,
  stats={},
  profile={},
  count=5,
  now=Date.now(),
  options={}
){
  const pool=[...(questions||[])];
  const picked=[];

  const take=predicate=>{
    const eligible=pool.filter(question=>
      !picked.some(item=>item.id===question.id) &&
      predicate(question)
    );
    const question=chooseWithinHeuristicMargin(
      eligible,stats,profile,now,options
    );
    if(question)picked.push(question);
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

  while(picked.length<count){
    const eligible=pool.filter(question=>
      !picked.some(item=>item.id===question.id) &&
      !picked.some(item=>item.skill===question.skill)
    );
    const question=chooseWithinHeuristicMargin(
      eligible,stats,profile,now,options
    );
    if(!question)break;
    picked.push(question);
  }

  while(picked.length<count){
    const eligible=pool.filter(question=>
      !picked.some(item=>item.id===question.id)
    );
    const question=chooseWithinHeuristicMargin(
      eligible,stats,profile,now,options
    );
    if(!question)break;
    picked.push(question);
  }

  return picked.slice(0,count);
}
