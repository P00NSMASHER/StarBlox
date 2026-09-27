import {describe,expect,it} from 'vitest';
import {
  applySchoolworkReviewGate,
  validateSchoolworkReviewQueue
} from './schoolworkPhotoReviewGate.js';

function basePack(){
  return {
    review:{ambiguousObservationsOmitted:false},
    skillSignals:[{
      id:'known-skill',
      generatorKey:'plural-s-es',
      stationId:'spelling-forge-fog-v1',
      subject:'Reading / ELA',
      skill:'plural-nouns',
      domain:'Word knowledge and skills',
      coverageWeight:4
    }]
  };
}

function candidate(id='reviewed-skill'){
  return {
    id,
    generatorKey:'reading-setting',
    stationId:'word-portal-put-v1',
    subject:'Reading / ELA',
    skill:'story-elements',
    domain:'Analyzing literary text',
    coverageWeight:4
  };
}

describe('schoolwork photo parent review gate',()=>{
  it('keeps needs-review observations inert',()=>{
    const pack=basePack();
    pack.reviewQueue=[{
      reviewId:'review-001',
      pageRef:'page-03',
      reasonCode:'teacher-mark-unclear',
      status:'needs-review',
      candidateSignals:[candidate()]
    }];
    const result=applySchoolworkReviewGate(pack);
    expect(result.issues).toEqual([]);
    expect(result.effectivePack.skillSignals.map(row=>row.id)).toEqual(['known-skill']);
    expect(result.summary).toMatchObject({
      pendingReviewItems:1,
      promotedSkillSignals:0,
      gateStatus:'needs-parent-review'
    });
  });

  it('promotes only the explicitly accepted sanitized signal',()=>{
    const pack=basePack();
    pack.reviewQueue=[{
      reviewId:'review-002',
      pageRef:'page-04',
      reasonCode:'skill-classification-unclear',
      status:'accepted',
      selectedSignalId:'reviewed-skill',
      candidateSignals:[candidate(),candidate('alternate-skill')]
    }];
    const result=applySchoolworkReviewGate(pack);
    expect(result.issues).toEqual([]);
    expect(result.effectivePack.skillSignals.map(row=>row.id)).toEqual(['known-skill','reviewed-skill']);
    expect(result.summary).toMatchObject({
      acceptedReviewItems:1,
      promotedSkillSignals:1,
      gateStatus:'clear'
    });
  });

  it('never promotes rejected observations',()=>{
    const pack=basePack();
    pack.reviewQueue=[{
      reviewId:'review-003',
      pageRef:'page-05',
      reasonCode:'correctness-unclear',
      status:'rejected',
      candidateSignals:[candidate()]
    }];
    const result=applySchoolworkReviewGate(pack);
    expect(result.issues).toEqual([]);
    expect(result.effectivePack.skillSignals).toHaveLength(1);
    expect(result.summary.rejectedReviewItems).toBe(1);
  });

  it('fails closed when an accepted item does not select one of its candidates',()=>{
    const pack=basePack();
    pack.reviewQueue=[{
      reviewId:'review-004',
      pageRef:'page-06',
      reasonCode:'skill-classification-unclear',
      status:'accepted',
      selectedSignalId:'not-a-candidate',
      candidateSignals:[candidate()]
    }];
    expect(validateSchoolworkReviewQueue(pack)).toContainEqual({
      type:'review-selected-signal-invalid',
      reviewId:'review-004'
    });
  });

  it('preserves an honest legacy status when earlier ambiguity was omitted without queue records',()=>{
    const pack=basePack();
    pack.review.ambiguousObservationsOmitted=true;
    const result=applySchoolworkReviewGate(pack);
    expect(result.summary.gateStatus).toBe('legacy-ambiguous-observations-omitted');
    expect(result.summary.legacyAmbiguousObservationsOmitted).toBe(true);
  });
});
