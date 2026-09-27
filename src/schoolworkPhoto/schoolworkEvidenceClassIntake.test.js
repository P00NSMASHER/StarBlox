import {describe,expect,it} from 'vitest';

import {
  SCHOOLWORK_EVIDENCE_CLASSES,
  SCHOOLWORK_PHOTO_CONSENT,
  SCHOOLWORK_PHOTO_INTAKE_VERSION,
  adaptSchoolworkPhotoIntake,
  validateSchoolworkPhotoIntake
} from './schoolworkPhotoIntakeAdapter.js';
import {buildSchoolworkSkillObservations} from './schoolworkSkillObservations.js';

function intake(evidenceClass){
  return {
    schemaVersion:1,
    intakeVersion:SCHOOLWORK_PHOTO_INTAKE_VERSION,
    batchId:'evidence-class-test',
    capturedDate:'2026-09-27',
    consent:{...SCHOOLWORK_PHOTO_CONSENT},
    pages:[{
      pageRef:'page-01',
      sourceCategories:['phonics'],
      observations:[{
        generatorKey:'short-vowel-identification',
        confidence:0.95,
        attempted:true,
        likelyCorrect:false,
        evidenceClass
      }]
    }]
  };
}

describe('sanitized schoolwork evidence classes',()=>{
  it('accepts only the three bounded source-strength classes',()=>{
    expect(SCHOOLWORK_EVIDENCE_CLASSES).toEqual([
      'teacher-marked-schoolwork',
      'completed-schoolwork',
      'ungraded-schoolwork'
    ]);

    for(const evidenceClass of SCHOOLWORK_EVIDENCE_CLASSES){
      expect(validateSchoolworkPhotoIntake(intake(evidenceClass))).toEqual([]);
    }
    expect(validateSchoolworkPhotoIntake(intake('teacher-said-wrong'))).toContainEqual({
      type:'intake-evidence-class-invalid',
      pageRef:'page-01',
      observationIndex:0
    });
  });

  it('carries the abstract evidence class into skill observations without teacher-mark content',()=>{
    const raw=intake('teacher-marked-schoolwork');
    const adapted=adaptSchoolworkPhotoIntake(raw);
    const built=buildSchoolworkSkillObservations({
      intake:raw,
      reviewedPack:adapted.pack
    });

    expect(built.issues).toEqual([]);
    expect(built.artifact.observations[0]).toMatchObject({
      evidenceClass:'teacher-marked-schoolwork',
      likelyCorrect:false
    });
    expect(built.artifact.bySkill['vowel-patterns']).toMatchObject({
      teacherMarked:1,
      completedSchoolwork:0,
      ungradedSchoolwork:0
    });
    const persistedKeys=[];
    const collectKeys=value=>{
      if(Array.isArray(value)){
        for(const child of value) collectKeys(child);
      }else if(value&&typeof value==='object'){
        for(const [key,child] of Object.entries(value)){
          persistedKeys.push(key);
          collectKeys(child);
        }
      }
    };
    collectKeys(built.artifact);
    expect(persistedKeys).not.toContain('teacherMark');
    expect(persistedKeys).not.toContain('teacherComment');
  });
});
