import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  buildSchoolworkQuestionCatalog,
  SCHOOLWORK_PROVENANCE,
  selectActiveSchoolworkQuestions,
  validateSanitizedSchoolworkPack
} from './schoolworkPhotoPipeline.js';

function readJson(path){
  return JSON.parse(readFileSync(new URL('../../'+path,import.meta.url),'utf8'));
}

describe('privacy-safe schoolwork photo pipeline',()=>{
  it('accepts the sanitized source pack and stores no student-specific worksheet data',()=>{
    const pack=readJson('docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json');
    expect(validateSanitizedSchoolworkPack(pack)).toEqual([]);
    expect(pack.privacy).toEqual({
      rawImagesCommitted:false,
      studentNameStored:false,
      studentResponsesStored:false,
      teacherMarksStored:false,
      gradesOrScoresStored:false,
      rawWorksheetTextStored:false,
      sourceImageHashesStored:false
    });
    const text=JSON.stringify(pack);
    for(const forbidden of [
      'studentName','studentResponse','rawAnswer','teacherMark','worksheetText',
      'imageHash','imagePath','fileName'
    ]){
      expect(text).not.toContain('"'+forbidden+'"');
    }
  });

  it('rejects a pack that tries to persist private student evidence',()=>{
    const pack=readJson('docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json');
    const unsafe=structuredClone(pack);
    unsafe.skillSignals[0].studentResponse='example';
    expect(validateSanitizedSchoolworkPack(unsafe).some(issue=>issue.type==='forbidden-private-field')).toBe(true);
  });

  it('generates direct, transfer, and reasoning variants from every accepted skill signal',()=>{
    const pack=readJson('docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json');
    const catalog=buildSchoolworkQuestionCatalog(pack,{snapshotId:'test-snapshot'});
    expect(catalog.questionCount).toBe(pack.skillSignals.length*3);
    for(const signal of pack.skillSignals){
      const rows=catalog.questions.filter(question=>question.signalId===signal.id);
      expect(new Set(rows.map(question=>question.questionType))).toEqual(new Set(['direct','transfer','reasoning']));
      expect(rows.every(question=>question.provenance===SCHOOLWORK_PROVENANCE)).toBe(true);
      expect(rows.every(question=>question.tier==='material')).toBe(true);
    }
  });

  it('activates at most four photo-derived material items per station',()=>{
    const pack=readJson('docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json');
    const catalog=buildSchoolworkQuestionCatalog(pack,{snapshotId:'test-snapshot'});
    const active=selectActiveSchoolworkQuestions(catalog,{maxPerStation:4});
    expect(active).toHaveLength(12);
    for(const station of ['word-portal-put-v1','spelling-forge-fog-v1','culture-lab-culture-v1']){
      expect(active.filter(question=>question.stationId===station)).toHaveLength(4);
    }
  });

  it('creates only original practice prompts rather than storing worksheet text',()=>{
    const pack=readJson('docs/phase6/SCHOOLWORK_PHOTO_SOURCE.json');
    const catalog=buildSchoolworkQuestionCatalog(pack,{snapshotId:'test-snapshot'});
    expect(catalog.questions.every(question=>question.prompt.length>=20)).toBe(true);
    expect(catalog.questions.every(question=>question.choices.length===3)).toBe(true);
    expect(catalog.questions.every(question=>new Set(question.choices).size===3)).toBe(true);
    expect(catalog.questions.every(question=>question.choices.includes(question.answer))).toBe(true);
    expect(catalog.questions.every(question=>question.sourceFact.startsWith('Sanitized schoolwork-photo skill evidence:'))).toBe(true);
  });
});
