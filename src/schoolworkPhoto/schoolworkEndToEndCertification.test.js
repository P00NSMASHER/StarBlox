import {describe,expect,it} from 'vitest';

import {
  adaptSchoolworkPhotoIntake,
  SCHOOLWORK_PHOTO_INTAKE_VERSION
} from './schoolworkPhotoIntakeAdapter.js';
import {
  buildSchoolworkQuestionCatalog,
  makeSchoolworkReviewReceipt,
  schoolworkPackHash,
  selectActiveSchoolworkQuestions
} from './schoolworkPhotoPipeline.js';
import {applySchoolworkReviewGate} from './schoolworkPhotoReviewGate.js';
import {
  buildLegacySchoolworkSkillObservations,
  buildSchoolworkSkillObservations,
  renderSchoolworkSkillEvidenceLua
} from './schoolworkSkillObservations.js';
import {
  certifySchoolworkPhotoPipeline,
  SCHOOLWORK_PRODUCTION_GENERATOR_VERSION
} from './schoolworkEndToEndCertification.js';

function intakeFixture(){
  return {
    schemaVersion:1,
    intakeVersion:SCHOOLWORK_PHOTO_INTAKE_VERSION,
    batchId:'schoolwork-2026-09-27-006',
    capturedDate:'2026-09-27',
    pages:[
      {
        pageRef:'page-01',
        sourceCategories:['phonics','reading-comprehension'],
        observations:[
          {generatorKey:'short-vowel-identification',confidence:0.96,coverageWeight:5,attempted:true,likelyCorrect:false,evidenceClass:'teacher-marked-schoolwork'},
          {generatorKey:'plural-s-es',confidence:0.93,coverageWeight:4,attempted:true,likelyCorrect:true,evidenceClass:'teacher-marked-schoolwork'},
          {generatorKey:'reading-character-motivation',confidence:0.91,coverageWeight:5,attempted:true,likelyCorrect:false,evidenceClass:'teacher-marked-schoolwork'},
          {generatorKey:'reading-genre',confidence:0.90,coverageWeight:3,attempted:true,likelyCorrect:true,evidenceClass:'completed-schoolwork'},
          {
            reasonCode:'skill-classification-unclear',
            attempted:true,
            likelyCorrect:null,
            evidenceClass:'teacher-marked-schoolwork',
            candidates:[
              {generatorKey:'reading-setting',confidence:0.74,coverageWeight:4},
              {generatorKey:'reading-main-character',confidence:0.70,coverageWeight:4}
            ]
          }
        ]
      }
    ]
  };
}

function buildFixture(){
  const intake=intakeFixture();
  const adapted=adaptSchoolworkPhotoIntake(intake);
  const reviewed=structuredClone(adapted.pack);
  reviewed.reviewQueue[0].status='accepted';
  reviewed.reviewQueue[0].selectedSignalId=reviewed.reviewQueue[0].candidateSignals[0].id;

  const gated=applySchoolworkReviewGate(reviewed);
  const sourceHash=schoolworkPackHash(reviewed);
  const generationVariant=1;
  const catalog=buildSchoolworkQuestionCatalog(gated.effectivePack,{
    snapshotId:'cert-test',
    generationVariant,
    sourceHashOverride:sourceHash
  });
  const active=selectActiveSchoolworkQuestions(catalog,{maxPerStation:4});
  catalog.activeQuestionIds=active.map(question=>question.id);
  const reviewReceipt={
    ...makeSchoolworkReviewReceipt(gated.effectivePack,catalog,active),
    reviewGate:gated.summary
  };
  const skills=buildSchoolworkSkillObservations({intake,reviewedPack:reviewed});
  const rotatingSource={
    generatedFrom:{
      generatorVersion:SCHOOLWORK_PRODUCTION_GENERATOR_VERSION,
      schoolworkSourceHash:sourceHash,
      schoolworkBatchId:reviewed.batchId,
      schoolworkGenerationVariant:generationVariant
    },
    qualityPolicy:{
      schoolworkPhotoGenerationMode:catalog.generationMode,
      schoolworkPhotoGenerationVariant:generationVariant,
      schoolworkPhotoSourceTransform:'skill-only-equivalent-item-v1',
      schoolworkPhotoCandidateQuestionCount:catalog.questionCount,
      schoolworkPhotoActiveQuestionCount:catalog.activeQuestionIds.length
    },
    questions:active.map(question=>({...question,photoDerived:true}))
  };
  const evidenceLua=renderSchoolworkSkillEvidenceLua(skills.artifact);
  const coreQuestionBankLua=[
    'SchoolworkPhotoSourceHash = '+JSON.stringify(sourceHash),
    ...catalog.activeQuestionIds.map(id=>'Id = '+JSON.stringify(id))
  ].join('\n');

  return {
    intake,
    reviewed,
    gated,
    sourceHash,
    catalog,
    reviewReceipt,
    skills,
    rotatingSource,
    evidenceLua,
    coreQuestionBankLua
  };
}

describe('Block 6: end-to-end schoolwork photo certification',()=>{
  it('certifies one coherent reviewed source -> evidence -> original questions -> runtime transaction',()=>{
    const fixture=buildFixture();
    const result=certifySchoolworkPhotoPipeline({
      sourcePack:fixture.reviewed,
      skillArtifact:fixture.skills.artifact,
      skillReceipt:fixture.skills.receipt,
      questionCatalog:fixture.catalog,
      reviewReceipt:fixture.reviewReceipt,
      rotatingSource:fixture.rotatingSource,
      evidenceLua:fixture.evidenceLua,
      coreQuestionBankLua:fixture.coreQuestionBankLua
    });
    expect(result.issues).toEqual([]);
    expect(result.receipt).toMatchObject({
      status:'certified',
      batchId:'schoolwork-2026-09-27-006',
      sourceHash:fixture.sourceHash,
      acceptedReviewItems:1,
      pendingReviewItems:0,
      privacySafe:true,
      failClosed:true
    });
  });

  it('changes source identity when a parent review decision changes and promotes the accepted skill everywhere',()=>{
    const intake=intakeFixture();
    const adapted=adaptSchoolworkPhotoIntake(intake);
    const pendingHash=schoolworkPackHash(adapted.pack);

    const reviewed=structuredClone(adapted.pack);
    reviewed.reviewQueue[0].status='accepted';
    reviewed.reviewQueue[0].selectedSignalId=reviewed.reviewQueue[0].candidateSignals[0].id;
    const acceptedHash=schoolworkPackHash(reviewed);

    expect(acceptedHash).not.toBe(pendingHash);

    const gated=applySchoolworkReviewGate(reviewed);
    expect(gated.effectivePack.skillSignals.some(signal=>signal.generatorKey==='reading-setting')).toBe(true);

    const legacy=buildLegacySchoolworkSkillObservations(reviewed);
    expect(legacy.issues).toEqual([]);
    expect(legacy.artifact.observations.some(row=>
      row.generatorKey==='reading-setting'&&row.reviewStatus==='parent-accepted-skill-only'
    )).toBe(true);
  });

  it('fails closed when a production artifact is bound to a different reviewed source',()=>{
    const fixture=buildFixture();
    fixture.rotatingSource.generatedFrom.schoolworkSourceHash='sha256:wrong';
    const result=certifySchoolworkPhotoPipeline({
      sourcePack:fixture.reviewed,
      skillArtifact:fixture.skills.artifact,
      skillReceipt:fixture.skills.receipt,
      questionCatalog:fixture.catalog,
      reviewReceipt:fixture.reviewReceipt,
      rotatingSource:fixture.rotatingSource,
      evidenceLua:fixture.evidenceLua,
      coreQuestionBankLua:fixture.coreQuestionBankLua
    });
    expect(result.issues.some(issue=>issue.type==='production-schoolwork-source-hash-mismatch')).toBe(true);
    expect(result.receipt.status).toBe('failed');
  });
});
