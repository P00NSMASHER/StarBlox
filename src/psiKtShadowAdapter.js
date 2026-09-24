export const PSI_KT_SHADOW_ADAPTER_VERSION = 'starblox-psikt-shadow-v1';

function stableIdMap(values){
  const sorted = [...new Set(values.map(String))].sort();
  return Object.fromEntries(sorted.map((value,index) => [value,index]));
}

export function isPsiKtMasteryEvidence(event){
  return Boolean(
    event &&
    event.firstAttempt &&
    !event.assisted &&
    event.masteryEligible
  );
}

export function buildPsiKtSequence(events,{includeNonMastery=false}={}){
  const ordered = [...(events || [])]
    .filter(event => includeNonMastery || isPsiKtMasteryEvidence(event))
    .sort((a,b) => a.timestamp - b.timestamp || a.eventId.localeCompare(b.eventId));

  const skillMap = stableIdMap(ordered.map(event => event.skill));
  const problemMap = stableIdMap(ordered.map(event => event.questionId));

  return {
    adapterVersion:PSI_KT_SHADOW_ADAPTER_VERSION,
    event_ids:ordered.map(event => event.eventId),
    skill_seq:ordered.map(event => skillMap[event.skill]),
    correct_seq:ordered.map(event => event.correct ? 1 : 0),
    time_seq:ordered.map(event => Number(event.timestamp) || 0),
    problem_seq:ordered.map(event => problemMap[event.questionId]),
    skill_id_map:skillMap,
    problem_id_map:problemMap
  };
}

export function buildPsiKtInteractionTable(events,{includeNonMastery=false,timestampDivisor=1000}={}){
  const ordered = [...(events || [])]
    .filter(event => includeNonMastery || isPsiKtMasteryEvidence(event))
    .sort((a,b) => a.timestamp - b.timestamp || a.eventId.localeCompare(b.eventId));

  const userMap = stableIdMap(ordered.map(event => event.playerLocalId || 'local'));
  const skillMap = stableIdMap(ordered.map(event => event.skill));
  const problemMap = stableIdMap(ordered.map(event => event.questionId));
  const divisor = Math.max(1,Number(timestampDivisor) || 1000);

  return {
    adapterVersion:PSI_KT_SHADOW_ADAPTER_VERSION,
    columns:['user_id','skill_id','correct','timestamp','problem_id'],
    rows:ordered.map(event => ({
      user_id:userMap[event.playerLocalId || 'local'],
      skill_id:skillMap[event.skill],
      correct:event.correct ? 1 : 0,
      timestamp:Math.floor((Number(event.timestamp) || 0) / divisor),
      problem_id:problemMap[event.questionId]
    })),
    user_id_map:userMap,
    skill_id_map:skillMap,
    problem_id_map:problemMap
  };
}

export function psiKtInteractionTableToTsv(table){
  const columns = table?.columns || ['user_id','skill_id','correct','timestamp','problem_id'];
  const rows = table?.rows || [];
  return [
    columns.join('\t'),
    ...rows.map(row => columns.map(column => row[column]).join('\t'))
  ].join('\n') + '\n';
}
