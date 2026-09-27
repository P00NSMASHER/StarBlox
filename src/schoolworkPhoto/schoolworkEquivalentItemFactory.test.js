import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

import {
  SCHOOLWORK_PROVENANCE,
  SCHOOLWORK_SOURCE_TRANSFORM,
  buildSchoolworkQuestionCatalog,
  validateOriginalEquivalentCatalog
} from './schoolworkPhotoPipeline.js';
import {
  buildEquivalentQuestionSpecs,
  supportedEquivalentGenerators
} from './schoolworkEquivalentItemFactory.js';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}
function readJson(path){
  return JSON.parse(read(path));
}

describe('Block 5: original equivalent question generation',()=>{
  it('covers every accepted schoolwork generator with deterministic equivalent items',()=>{
    const pack=readJson('docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json');
    const supported=new Set(supportedEquivalentGenerators());

    for(const signal of pack.skillSignals){
      expect(supported.has(signal.generatorKey)).toBe(true);
      for(const variant of [1,2]){
        const specs=buildEquivalentQuestionSpecs(signal.generatorKey,variant);
        expect(specs).toHaveLength(3);
        expect(new Set(specs.map(row=>row.type))).toEqual(
          new Set(['direct','transfer','reasoning'])
        );
      }
    }
  });

  it('produces a new invented surface set for every accepted skill between variants 1 and 2',()=>{
    const pack=readJson('docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json');
    for(const signal of pack.skillSignals){
      const one=buildEquivalentQuestionSpecs(signal.generatorKey,1);
      const two=buildEquivalentQuestionSpecs(signal.generatorKey,2);

      expect(one.map(row=>row.prompt)).not.toEqual(two.map(row=>row.prompt));
      expect(one[0].prompt).not.toBe(two[0].prompt);
      expect(one.every(row=>row.choices.includes(row.answer))).toBe(true);
      expect(two.every(row=>row.choices.includes(row.answer))).toBe(true);
    }
  });

  it('builds complete equivalent catalogs without changing the baseline default bank',()=>{
    const pack=readJson('docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json');
    const baseline=buildSchoolworkQuestionCatalog(pack,{snapshotId:'block5'});
    const variant1=buildSchoolworkQuestionCatalog(pack,{
      snapshotId:'block5',
      generationVariant:1
    });
    const variant2=buildSchoolworkQuestionCatalog(pack,{
      snapshotId:'block5',
      generationVariant:2
    });

    expect(baseline.questionCount).toBe(36);
    expect(baseline.questions.some(q=>q.id.includes('-ev'))).toBe(false);
    expect(variant1.questionCount).toBe(36);
    expect(variant2.questionCount).toBe(36);
    expect(variant1.questions.every(q=>q.id.endsWith('-ev1'))).toBe(true);
    expect(variant2.questions.every(q=>q.id.endsWith('-ev2'))).toBe(true);
    expect(new Set(variant1.questions.map(q=>q.id)).size).toBe(36);
    expect(new Set(variant2.questions.map(q=>q.id)).size).toBe(36);
    expect(validateOriginalEquivalentCatalog(variant1)).toEqual([]);
    expect(validateOriginalEquivalentCatalog(variant2)).toEqual([]);
  });

  it('tags equivalent items as skill-only transforms with original-practice provenance',()=>{
    const pack=readJson('docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json');
    const catalog=buildSchoolworkQuestionCatalog(pack,{
      snapshotId:'block5',
      generationVariant:1
    });

    for(const question of catalog.questions){
      expect(question.provenance).toBe(SCHOOLWORK_PROVENANCE);
      expect(question.sourceTransform).toBe(SCHOOLWORK_SOURCE_TRANSFORM);
      expect(question.originalEquivalent).toBe(true);
      expect(question.generationVariant).toBe(1);
      expect(question.sourceFact).toMatch(
        /^Sanitized schoolwork-photo skill evidence: /
      );
    }
  });

  it('keeps source/page/worksheet content structurally unavailable to the equivalent factory',()=>{
    const pipeline=read('src/schoolworkPhoto/schoolworkPhotoPipeline.js');
    const factory=read('src/schoolworkPhoto/schoolworkEquivalentItemFactory.js');

    expect(pipeline).toContain(
      'buildEquivalentQuestionSpecs(signal.generatorKey,variant)'
    );
    expect(pipeline).not.toContain(
      'buildEquivalentQuestionSpecs(signal,variant)'
    );

    for(const forbidden of [
      'pageRef',
      'rawText',
      'worksheetText',
      'studentResponse',
      'teacherMark',
      'imagePath',
      'imageHash'
    ]){
      expect(factory).not.toContain(forbidden);
    }
  });

  it('never emits forbidden private source fields into equivalent question objects',()=>{
    const pack=readJson('docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json');
    const catalog=buildSchoolworkQuestionCatalog(pack,{
      snapshotId:'block5',
      generationVariant:2
    });
    const keys=[];
    const walk=value=>{
      if(Array.isArray(value)){
        for(const child of value) walk(child);
      }else if(value&&typeof value==='object'){
        for(const [key,child] of Object.entries(value)){
          keys.push(key);
          walk(child);
        }
      }
    };
    walk(catalog.questions);
    for(const forbidden of [
      'studentName','studentResponse','rawAnswer','teacherMark','grade','score',
      'rawText','worksheetText','imageHash','imagePath','fileName','filename'
    ]){
      expect(keys).not.toContain(forbidden);
    }
  });
});
