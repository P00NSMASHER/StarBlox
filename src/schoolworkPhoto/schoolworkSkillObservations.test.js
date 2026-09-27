import {describe,expect,it} from 'vitest';

import {
  SCHOOLWORK_PHOTO_INTAKE_VERSION,
  adaptSchoolworkPhotoIntake
} from './schoolworkPhotoIntakeAdapter.js';
import {
  buildLegacySchoolworkSkillObservations,
  buildSchoolworkSkillObservations,
  renderSchoolworkSkillEvidenceLua
} from './schoolworkSkillObservations.js';

function intakeFixture(){
  return {
    schemaVersion:1,
    intakeVersion:SCHOOLWORK_PHOTO_INTAKE_VERSION,
    batchId:'schoolwork-2026-09-27-002',
    capturedDate:'2026-09-27',
    pages:[
      {
        pageRef:'page-01',
        sourceCategories:['phonics','word-study'],
        observations:[
          {
            generatorKey:'short-vowel-identification',
            confidence:0.97,
            coverageWeight:5,
            attempted:true,
            likelyCorrect:true
          },
          {
            generatorKey:'spelling-short-vowel',
            confidence:0.91,
            coverageWeight:4,
            attempted:true,
            likelyCorrect:false
          },
          {
            reasonCode:'skill-classification-unclear',
            attempted:true,
            likelyCorrect:null,
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

describe('schoolwork skill observations',()=>{
  it('preserves multiple attempts for the same skill instead of collapsing them into one signal',()=>{
    const intake=intakeFixture();
    const adapted=adaptSchoolworkPhotoIntake(intake);
    expect(adapted.issues).toEqual([]);

    const result=buildSchoolworkSkillObservations({
      intake,
      reviewedPack:adapted.pack
    });
    expect(result.issues).toEqual([]);
    expect(result.artifact.observations).toHaveLength(2);

    const vowel=result.artifact.bySkill['vowel-patterns'];
    expect(vowel).toMatchObject({
      observationCount:2,
      attempted:2,
      likelyCorrect:1,
      likelyIncorrect:1,
      unknownCorrectness:0
    });
    expect(vowel.meanConfidence).toBe(0.94);
    expect(vowel.generatorKeys).toEqual([
      'short-vowel-identification',
      'spelling-short-vowel'
    ]);
  });

  it('keeps ambiguous skill evidence inert until the parent review gate accepts one candidate',()=>{
    const intake=intakeFixture();
    const adapted=adaptSchoolworkPhotoIntake(intake);

    const pending=buildSchoolworkSkillObservations({
      intake,
      reviewedPack:adapted.pack
    });
    expect(pending.issues).toEqual([]);
    expect(pending.artifact.reviewSummary.pendingReviewItems).toBe(1);
    expect(pending.artifact.observations.some(row=>row.skill==='story-elements')).toBe(false);

    const reviewed=structuredClone(adapted.pack);
    reviewed.reviewQueue[0].status='accepted';
    reviewed.reviewQueue[0].selectedSignalId=reviewed.reviewQueue[0].candidateSignals[0].id;

    const accepted=buildSchoolworkSkillObservations({
      intake,
      reviewedPack:reviewed
    });
    expect(accepted.issues).toEqual([]);
    const story=accepted.artifact.observations.find(row=>row.skill==='story-elements');
    expect(story).toMatchObject({
      generatorKey:'reading-setting',
      attempted:true,
      likelyCorrect:null,
      confidence:0.74,
      reviewStatus:'parent-accepted'
    });
    expect(accepted.artifact.reviewSummary.acceptedReviewItems).toBe(1);
  });

  it('does not persist worksheet wording, raw responses, teacher marks, grades, or image identifiers',()=>{
    const intake=intakeFixture();
    const adapted=adaptSchoolworkPhotoIntake(intake);
    const result=buildSchoolworkSkillObservations({intake,reviewedPack:adapted.pack});
    const serialized=JSON.stringify(result.artifact);
    for(const forbidden of [
      'rawText',
      'studentResponse',
      'teacherMark',
      'grade',
      'score',
      'imageHash',
      'imagePath'
    ]){
      expect(serialized).not.toContain('\"'+forbidden+'\"');
    }
    expect(result.artifact.privacy).toEqual({
      rawImagesIncluded:false,
      rawTextIncluded:false,
      studentIdentityIncluded:false,
      studentResponsesIncluded:false,
      teacherMarksIncluded:false,
      gradesOrScoresIncluded:false,
      sourceImageHashesIncluded:false
    });
  });

  it('fails closed if correctness is asserted for work that was not attempted',()=>{
    const intake=intakeFixture();
    intake.pages[0].observations[0].attempted=false;
    intake.pages[0].observations[0].likelyCorrect=true;
    const adapted=adaptSchoolworkPhotoIntake(intake);
    expect(adapted.pack).toBeNull();
    expect(adapted.issues).toContainEqual({
      type:'intake-correctness-without-attempt',
      pageRef:'page-01',
      observationIndex:0
    });
  });

  it('creates conservative legacy observations when an older sanitized pack has no correctness evidence',()=>{
    const pack={
      schemaVersion:1,
      packVersion:'schoolwork-photo-source-v1',
      batchId:'legacy-batch',
      capturedDate:'2026-09-26',
      pageCount:1,
      sourceCategories:['phonics'],
      privacy:{
        rawImagesCommitted:false,
        studentNameStored:false,
        studentResponsesStored:false,
        teacherMarksStored:false,
        gradesOrScoresStored:false,
        rawWorksheetTextStored:false,
        sourceImageHashesStored:false
      },
      review:{
        ambiguousObservationsOmitted:true,
        parentReviewRequiredOnAmbiguousExtraction:true
      },
      skillSignals:[
        {
          id:'short-vowel-identification',
          generatorKey:'short-vowel-identification',
          stationId:'spelling-forge-fog-v1',
          subject:'Reading / ELA',
          skill:'vowel-patterns',
          domain:'Word knowledge and skills',
          coverageWeight:5
        }
      ],
      reviewQueue:[]
    };
    const result=buildLegacySchoolworkSkillObservations(pack);
    expect(result.issues).toEqual([]);
    expect(result.artifact.observations[0]).toMatchObject({
      attempted:true,
      likelyCorrect:null,
      confidence:0.5,
      reviewStatus:'legacy-skill-only'
    });
    expect(result.artifact.bySkill['vowel-patterns'].unknownCorrectness).toBe(1);
  });

  it('renders a deterministic Roblox evidence module with aggregate skill facts only',()=>{
    const intake=intakeFixture();
    const adapted=adaptSchoolworkPhotoIntake(intake);
    const result=buildSchoolworkSkillObservations({intake,reviewedPack:adapted.pack});
    const lua=renderSchoolworkSkillEvidenceLua(result.artifact);

    expect(lua).toContain('Version = "schoolwork-skill-observations-v1"');
    expect(lua).toContain('["vowel-patterns"] = table.freeze({');
    expect(lua).toContain('ObservationCount = 2');
    expect(lua).toContain('LikelyCorrect = 1');
    expect(lua).toContain('LikelyIncorrect = 1');
    expect(lua).toContain('function SchoolworkSkillEvidence.HasSkill(skill: string): boolean');
    expect(lua).not.toContain('page-01');
    expect(lua).not.toContain('short-vowel-identification');
  });
});
