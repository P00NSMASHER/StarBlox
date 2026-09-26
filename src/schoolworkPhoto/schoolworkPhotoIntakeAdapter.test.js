import {describe,expect,it} from 'vitest';
import {
  AUTO_ACCEPT_CONFIDENCE,
  REVIEW_CONFIDENCE_FLOOR,
  SCHOOLWORK_PHOTO_INTAKE_VERSION,
  adaptSchoolworkPhotoIntake,
  supportedSchoolworkPhotoGenerators,
  validateSchoolworkPhotoIntake
} from './schoolworkPhotoIntakeAdapter.js';
import {applySchoolworkReviewGate} from './schoolworkPhotoReviewGate.js';
import {validateSanitizedSchoolworkPack} from './schoolworkPhotoPipeline.js';

function baseIntake(){
  return {
    schemaVersion:1,
    intakeVersion:SCHOOLWORK_PHOTO_INTAKE_VERSION,
    batchId:'schoolwork-2026-09-27-001',
    capturedDate:'2026-09-27',
    pages:[
      {
        pageRef:'page-01',
        sourceCategories:['phonics','word-study'],
        observations:[
          {
            generatorKey:'short-vowel-identification',
            confidence:0.97,
            coverageWeight:5
          },
          {
            generatorKey:'plural-s-es',
            confidence:0.93,
            coverageWeight:4
          }
        ]
      }
    ]
  };
}

describe('automatic schoolwork photo intake adapter',()=>{
  it('turns high-confidence sanitized observations into a valid privacy-safe source pack',()=>{
    const result=adaptSchoolworkPhotoIntake(baseIntake());
    expect(result.issues).toEqual([]);
    expect(result.pack).toMatchObject({
      schemaVersion:1,
      batchId:'schoolwork-2026-09-27-001',
      pageCount:1,
      intakeMode:'automated-sanitized-observation-adapter-v1',
      sourceCategories:['phonics','word-study'],
      privacy:{
        rawImagesCommitted:false,
        studentNameStored:false,
        studentResponsesStored:false,
        teacherMarksStored:false,
        gradesOrScoresStored:false,
        rawWorksheetTextStored:false,
        sourceImageHashesStored:false
      }
    });
    expect(result.pack.skillSignals.map(signal=>signal.id)).toEqual([
      'plural-s-es',
      'short-vowel-identification'
    ]);
    expect(result.pack.reviewQueue).toEqual([]);
    expect(validateSanitizedSchoolworkPack(result.pack)).toEqual([]);
    expect(result.receipt).toMatchObject({
      observationCount:2,
      acceptedObservations:2,
      acceptedSkillSignals:2,
      reviewItems:0,
      lowConfidenceOmitted:0
    });
  });

  it('routes ambiguous observations into an inert parent-review queue',()=>{
    const intake=baseIntake();
    intake.pages[0].observations.push({
      reasonCode:'skill-classification-unclear',
      candidates:[
        {generatorKey:'reading-main-character',confidence:0.74,coverageWeight:4},
        {generatorKey:'reading-setting',confidence:0.69,coverageWeight:4}
      ]
    });
    const result=adaptSchoolworkPhotoIntake(intake);
    expect(result.issues).toEqual([]);
    expect(result.pack.reviewQueue).toHaveLength(1);
    expect(result.pack.reviewQueue[0]).toMatchObject({
      pageRef:'page-01',
      reasonCode:'skill-classification-unclear',
      status:'needs-review'
    });
    expect(result.pack.reviewQueue[0].candidateSignals.map(signal=>signal.generatorKey)).toEqual([
      'reading-main-character',
      'reading-setting'
    ]);
    const gated=applySchoolworkReviewGate(result.pack);
    expect(gated.summary.gateStatus).toBe('needs-parent-review');
    expect(gated.summary.promotedSkillSignals).toBe(0);
    expect(gated.effectivePack.skillSignals).toHaveLength(2);
  });

  it('omits very weak observations while preserving stronger evidence from the batch',()=>{
    const intake=baseIntake();
    intake.pages[0].observations.push({
      generatorKey:'reading-genre',
      confidence:REVIEW_CONFIDENCE_FLOOR-0.01
    });
    const result=adaptSchoolworkPhotoIntake(intake);
    expect(result.issues).toEqual([]);
    expect(result.receipt.lowConfidenceOmitted).toBe(1);
    expect(result.pack.skillSignals.some(signal=>signal.generatorKey==='reading-genre')).toBe(false);
    expect(result.pack.reviewQueue).toHaveLength(0);
  });

  it('deduplicates repeated accepted skills and keeps the strongest coverage weight',()=>{
    const intake=baseIntake();
    intake.pages.push({
      pageRef:'page-02',
      sourceCategories:['spelling'],
      observations:[
        {
          generatorKey:'short-vowel-identification',
          confidence:AUTO_ACCEPT_CONFIDENCE,
          coverageWeight:3
        },
        {
          generatorKey:'short-vowel-identification',
          confidence:0.99,
          coverageWeight:5
        }
      ]
    });
    const result=adaptSchoolworkPhotoIntake(intake);
    expect(result.issues).toEqual([]);
    const signals=result.pack.skillSignals.filter(signal=>signal.generatorKey==='short-vowel-identification');
    expect(signals).toHaveLength(1);
    expect(signals[0].coverageWeight).toBe(5);
    expect(result.receipt.acceptedObservations).toBe(4);
    expect(result.receipt.acceptedSkillSignals).toBe(2);
  });

  it('rejects unexpected fields so raw OCR, names, answers, marks, or image metadata cannot leak into output',()=>{
    for(const [field,value] of [
      ['rawText','copied worksheet text'],
      ['studentName','Student'],
      ['studentResponse','answer'],
      ['teacherMark','checkmark'],
      ['score','10/10'],
      ['imagePath','/tmp/page.jpg'],
      ['imageHash','secret-hash']
    ]){
      const intake=baseIntake();
      intake.pages[0].observations[0][field]=value;
      expect(validateSchoolworkPhotoIntake(intake)).toContainEqual({
        type:'unexpected-intake-field',
        path:'pages[0].observations[0].'+field
      });
      const result=adaptSchoolworkPhotoIntake(intake);
      expect(result.pack).toBeNull();
      expect(result.receipt).toBeNull();
    }
  });

  it('can promote exactly one parent-approved sanitized candidate without exposing the original photo',()=>{
    const intake=baseIntake();
    intake.pages[0].observations.push({
      candidates:[
        {generatorKey:'reading-setting',confidence:0.77,coverageWeight:4},
        {generatorKey:'reading-main-character',confidence:0.71,coverageWeight:4}
      ]
    });
    const adapted=adaptSchoolworkPhotoIntake(intake);
    const reviewed=structuredClone(adapted.pack);
    reviewed.reviewQueue[0].status='accepted';
    reviewed.reviewQueue[0].selectedSignalId=reviewed.reviewQueue[0].candidateSignals[0].id;

    const gated=applySchoolworkReviewGate(reviewed);
    expect(gated.issues).toEqual([]);
    expect(gated.summary.promotedSkillSignals).toBe(1);
    expect(gated.effectivePack.skillSignals.some(signal=>signal.generatorKey==='reading-setting')).toBe(true);
    expect(JSON.stringify(gated.effectivePack)).not.toContain('rawText');
    expect(JSON.stringify(gated.effectivePack)).not.toContain('studentResponse');
  });

  it('is deterministic and exposes only the supported canonical skill generator list',()=>{
    const first=adaptSchoolworkPhotoIntake(baseIntake());
    const second=adaptSchoolworkPhotoIntake(baseIntake());
    expect(first).toEqual(second);
    expect(first.receipt.sourcePackHash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(supportedSchoolworkPhotoGenerators()).toContain('reading-setting');
    expect(supportedSchoolworkPhotoGenerators()).toContain('religion-trinity');
  });
});
