export const SOURCE_REGISTRY_VERSION = 'starblox-sources-v1';

export const SOURCE_REGISTRY = Object.freeze({
  'abvm-grade2-current-source-pack': Object.freeze({
    id:'abvm-grade2-current-source-pack',
    label:'ABVM Grade 2 current source pack',
    kind:'curriculum-pack',
    provenanceStatus:'declared-source'
  }),
  'current-week-spelling-list': Object.freeze({
    id:'current-week-spelling-list',
    label:'Current-week spelling list',
    kind:'curriculum-list',
    provenanceStatus:'declared-source'
  }),
  'current-week-hfw-list': Object.freeze({
    id:'current-week-hfw-list',
    label:'Current-week high-frequency-word list',
    kind:'curriculum-list',
    provenanceStatus:'declared-source'
  }),
  'current-week-vocabulary': Object.freeze({
    id:'current-week-vocabulary',
    label:'Current-week vocabulary meanings',
    kind:'curriculum-list',
    provenanceStatus:'declared-source'
  }),
  'approved-religion-unit-1': Object.freeze({
    id:'approved-religion-unit-1',
    label:'Approved Religion Unit 1 source',
    kind:'curriculum-source',
    provenanceStatus:'declared-source'
  }),
  'starblox-practice-passages': Object.freeze({
    id:'starblox-practice-passages',
    label:'Original StarBlox practice passages',
    kind:'first-party-content',
    provenanceStatus:'repo-owned'
  }),
  'deterministic-phonics-rules': Object.freeze({
    id:'deterministic-phonics-rules',
    label:'Deterministic StarBlox phonics rules',
    kind:'derived-rule-set',
    provenanceStatus:'repo-owned'
  }),
  'deterministic-orthography-rules': Object.freeze({
    id:'deterministic-orthography-rules',
    label:'Deterministic StarBlox orthography rules',
    kind:'derived-rule-set',
    provenanceStatus:'repo-owned'
  })
});

function starts(question,prefix){
  return String(question?.id || '').startsWith(prefix);
}

export function resolveSourceIds(question){
  if(Array.isArray(question?.sourceIds) && question.sourceIds.length){
    return [...new Set(question.sourceIds.map(String))];
  }

  if(starts(question,'religion-')) return ['approved-religion-unit-1'];
  if(starts(question,'story-')) return ['starblox-practice-passages'];
  if(starts(question,'vocab-')) return ['current-week-vocabulary'];
  if(starts(question,'hfw-')) return ['current-week-hfw-list'];

  if(starts(question,'spell-') || starts(question,'context-')){
    return ['current-week-spelling-list','deterministic-orthography-rules'];
  }

  if(starts(question,'rhyme-') || starts(question,'sound-') || starts(question,'vowel-listen-')){
    return ['current-week-spelling-list','deterministic-phonics-rules'];
  }

  return ['abvm-grade2-current-source-pack'];
}

export function sourceRecord(sourceId){
  return SOURCE_REGISTRY[String(sourceId)] || null;
}

export function sourceRecordsForQuestion(question){
  return resolveSourceIds(question)
    .map(sourceRecord)
    .filter(Boolean);
}
