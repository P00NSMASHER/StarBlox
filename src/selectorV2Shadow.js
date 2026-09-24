export const SELECTOR_V2_SHADOW_VERSION = 'starblox-selector-v2-shadow-v1';

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const clamp01 = value => Math.max(0,Math.min(1,Number(value) || 0));

export function scoreQuestionV2Shadow(question,profile={},now=Date.now()){
  const skill = profile?.skills?.[question.skill] || {};
  const mastery = Number.isFinite(Number(skill.psiMastery))
    ? clamp01(skill.psiMastery)
    : 0.5;
  const uncertainty = Number.isFinite(Number(skill.psiUncertainty))
    ? clamp01(skill.psiUncertainty)
    : 0;
  const due = Boolean(skill.fsrsDue);
  const lastSeenAt = Math.max(0,Number(skill.lastSeenAt) || 0);
  const ageDays = lastSeenAt ? Math.max(0,(Number(now) - lastSeenAt) / DAY_MS) : 30;
  const recent = Boolean(lastSeenAt && Number(now) - lastSeenAt < 12 * HOUR_MS);

  return (
    (1 - mastery) * 50 +
    uncertainty * 12 +
    (due ? 20 : 0) +
    Math.min(15,ageDays * 2) +
    (question.role === 'transfer' ? 8 : 0) +
    (question.role === 'review' ? 4 : 0) -
    (recent ? 40 : 0)
  );
}

export function pickQuestV2Shadow(questions,profile={},count=5,now=Date.now()){
  const ranked = [...(questions || [])]
    .map(question => ({
      question,
      score:scoreQuestionV2Shadow(question,profile,now)
    }))
    .sort((a,b) =>
      b.score - a.score ||
      String(a.question.id).localeCompare(String(b.question.id))
    );

  const picked = [];
  const take = predicate => {
    const row = ranked.find(({question}) =>
      !picked.some(item => item.id === question.id) && predicate(question)
    );
    if(row) picked.push(row.question);
  };

  take(question => question.role === 'transfer');

  ['Lantern Lane','Story Street','Wordwood Garden'].forEach(district => {
    if(picked.length < count){
      take(question =>
        question.district === district &&
        !picked.some(item => item.skill === question.skill)
      );
    }
  });

  ranked.forEach(({question}) => {
    if(
      picked.length < count &&
      !picked.some(item => item.id === question.id) &&
      !picked.some(item => item.skill === question.skill)
    ){
      picked.push(question);
    }
  });

  ranked.forEach(({question}) => {
    if(picked.length < count && !picked.some(item => item.id === question.id)){
      picked.push(question);
    }
  });

  return picked.slice(0,count);
}
