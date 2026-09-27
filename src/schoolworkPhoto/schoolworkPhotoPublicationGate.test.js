import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {schoolworkPackHash} from './schoolworkPhotoPipeline.js';
import {prepareSchoolworkPhotoPublication} from './schoolworkPhotoPublicationGate.js';

function basePack(){
  return {
    schemaVersion:1,
    packVersion:'schoolwork-photo-source-v1',
    batchId:'schoolwork-2026-09-27-002',
    capturedDate:'2026-09-27',
    pageCount:2,
    intakeMode:'automated-sanitized-observation-adapter-v1',
    sourceCategories:['reading-comprehension'],
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
      ambiguousObservationsOmitted:false,
      parentReviewRequiredOnAmbiguousExtraction:true
    },
    skillSignals:[{
      id:'reading-setting',
      generatorKey:'reading-setting',
      stationId:'word-portal-put-v1',
      subject:'Reading / ELA',
      skill:'story-elements',
      domain:'Analyzing literary text',
      coverageWeight:4
    }],
    reviewQueue:[]
  };
}

function candidate(id='review-candidate-setting',generatorKey='reading-main-character'){
  return {
    id,
    generatorKey,
    stationId:'word-portal-put-v1',
    subject:'Reading / ELA',
    skill:'story-elements',
    domain:'Analyzing literary text',
    coverageWeight:4
  };
}

describe('schoolwork photo publication gate',()=>{
  it('keeps needs-review observations inert and source-hash neutral',()=>{
    const pack=basePack();
    const baselineHash=schoolworkPackHash(pack);
    pack.reviewQueue=[{
      reviewId:'review-page-02-001',
      pageRef:'page-02',
      reasonCode:'skill-classification-unclear',
      status:'needs-review',
      candidateSignals:[candidate()]
    }];

    const result=prepareSchoolworkPhotoPublication(pack);
    expect(result.issues).toEqual([]);
    expect(result.publicationAllowed).toBe(true);
    expect(result.reviewGate).toMatchObject({
      gateStatus:'needs-parent-review',
      pendingReviewItems:1,
      promotedSkillSignals:0
    });
    expect(result.effectivePack.skillSignals.map(row=>row.id)).toEqual(['reading-setting']);
    expect(result.sourceHash).toBe(baselineHash);
  });

  it('keeps rejected observations inert and source-hash neutral',()=>{
    const pack=basePack();
    const baselineHash=schoolworkPackHash(pack);
    pack.reviewQueue=[{
      reviewId:'review-page-02-002',
      pageRef:'page-02',
      reasonCode:'correctness-unclear',
      status:'rejected',
      candidateSignals:[candidate()]
    }];

    const result=prepareSchoolworkPhotoPublication(pack);
    expect(result.issues).toEqual([]);
    expect(result.reviewGate.rejectedReviewItems).toBe(1);
    expect(result.reviewGate.promotedSkillSignals).toBe(0);
    expect(result.sourceHash).toBe(baselineHash);
  });

  it('promotes only the explicitly accepted sanitized candidate and changes the effective source hash',()=>{
    const pack=basePack();
    const baselineHash=schoolworkPackHash(pack);
    const selected=candidate('review-page-02-003-candidate-1','reading-main-character');
    pack.reviewQueue=[{
      reviewId:'review-page-02-003',
      pageRef:'page-02',
      reasonCode:'skill-classification-unclear',
      status:'accepted',
      selectedSignalId:selected.id,
      candidateSignals:[
        selected,
        candidate('review-page-02-003-candidate-2','reading-genre')
      ]
    }];

    const result=prepareSchoolworkPhotoPublication(pack);
    expect(result.issues).toEqual([]);
    expect(result.reviewGate).toMatchObject({
      acceptedReviewItems:1,
      promotedSkillSignals:1,
      gateStatus:'clear'
    });
    expect(result.effectivePack.skillSignals.map(row=>row.generatorKey)).toEqual([
      'reading-setting',
      'reading-main-character'
    ]);
    expect(result.sourceHash).not.toBe(baselineHash);
  });

  it('fails closed on an invalid accepted selection',()=>{
    const pack=basePack();
    pack.reviewQueue=[{
      reviewId:'review-page-02-004',
      pageRef:'page-02',
      reasonCode:'skill-classification-unclear',
      status:'accepted',
      selectedSignalId:'missing-candidate',
      candidateSignals:[candidate()]
    }];

    const result=prepareSchoolworkPhotoPublication(pack);
    expect(result.publicationAllowed).toBe(false);
    expect(result.effectivePack).toBeNull();
    expect(result.issues).toContainEqual({
      type:'review-selected-signal-invalid',
      reviewId:'review-page-02-004'
    });
  });

  it('is the shared gate used by both validation and question-bank synchronization',()=>{
    const validator=readFileSync(
      new URL('../../scripts/validate-schoolwork-photo-pack.mjs',import.meta.url),
      'utf8'
    );
    const sync=readFileSync(
      new URL('../../scripts/sync-question-bank-from-abvm.mjs',import.meta.url),
      'utf8'
    );
    expect(validator).toContain('prepareSchoolworkPhotoPublication');
    expect(sync).toContain('prepareSchoolworkPhotoPublication');
    expect(sync).toContain('schoolworkPublication.effectivePack');
    expect(sync).toContain('reviewGate:schoolworkPublication.reviewGate');
  });
});
