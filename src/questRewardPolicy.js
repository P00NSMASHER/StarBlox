export function scoreQuestAttempt({question,correct,wasRetry=false,becomesMastered=false}) {
  const transfer = question?.role === 'transfer';

  if(!correct){
    return wasRetry
      ? {coins:0,xp:0,stars:0,transferEvidence:0,districtProgress:0,masteryAwarded:false}
      : {coins:2,xp:6,stars:0,transferEvidence:0,districtProgress:0,masteryAwarded:false};
  }

  if(wasRetry){
    return {
      coins:0,
      xp:4,
      stars:0,
      transferEvidence:0,
      districtProgress:1,
      masteryAwarded:false
    };
  }

  const masteryAwarded = Boolean(becomesMastered);
  return {
    coins:(question?.reward || 0) + (transfer ? 3 : 0) + (masteryAwarded ? 25 : 0),
    xp:16 + (transfer ? 5 : 0),
    stars:masteryAwarded ? 1 : 0,
    transferEvidence:transfer ? 1 : 0,
    districtProgress:1,
    masteryAwarded
  };
}
