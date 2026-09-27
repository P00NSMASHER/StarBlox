import {describe,expect,it} from 'vitest';

import {
  DEFAULT_SCHOOLWORK_EVIDENCE_POLICY,
  ordinarySingleMissBenchmark,
  schoolworkSourceStrength,
  scoreSchoolworkSkillEvidence
} from './schoolworkEvidenceHierarchy.js';

function row(overrides={}){
  return {
    observationCount:1,
    attempted:1,
    likelyCorrect:0,
    likelyIncorrect:1,
    unknownCorrectness:0,
    meanConfidence:1,
    maxConfidence:1,
    teacherMarked:1,
    completedSchoolwork:0,
    ungradedSchoolwork:0,
    ...overrides
  };
}

describe('Block 4 schoolwork evidence hierarchy',()=>{
  it('ranks source strength teacher-marked > completed > ungraded',()=>{
    const teacher=schoolworkSourceStrength(row());
    const completed=schoolworkSourceStrength(row({
      teacherMarked:0,
      completedSchoolwork:1
    }));
    const ungraded=schoolworkSourceStrength(row({
      teacherMarked:0,
      ungradedSchoolwork:1
    }));

    expect(teacher).toBe(1);
    expect(completed).toBe(DEFAULT_SCHOOLWORK_EVIDENCE_POLICY.completedSchoolworkMultiplier);
    expect(ungraded).toBe(DEFAULT_SCHOOLWORK_EVIDENCE_POLICY.ungradedSchoolworkMultiplier);
    expect(teacher).toBeGreaterThan(completed);
    expect(completed).toBeGreaterThan(ungraded);
  });

  it('lets a high-confidence teacher-marked miss outrank one ordinary in-game miss',()=>{
    const teacherMiss=scoreSchoolworkSkillEvidence(row());
    const inGame=ordinarySingleMissBenchmark();

    expect(teacherMiss.withCurrentMaterial).toBeGreaterThan(inGame);
    expect(teacherMiss.weightedContribution).toBeLessThanOrEqual(
      DEFAULT_SCHOOLWORK_EVIDENCE_POLICY.schoolworkEvidenceWeight
    );
  });

  it('keeps correct teacher-marked work as a small current-material signal rather than weakness',()=>{
    const result=scoreSchoolworkSkillEvidence(row({
      likelyCorrect:1,
      likelyIncorrect:0
    }));

    expect(result.errorRate).toBe(0);
    expect(result.weightedContribution).toBeLessThan(0.05);
    expect(result.withCurrentMaterial).toBeLessThan(0.15);
  });

  it('treats unknown correctness as presence evidence only',()=>{
    const result=scoreSchoolworkSkillEvidence(row({
      likelyCorrect:0,
      likelyIncorrect:0,
      unknownCorrectness:1,
      meanConfidence:0.5
    }));

    expect(result.errorRate).toBe(0);
    expect(result.rawPressure).toBeGreaterThan(0);
    expect(result.weightedContribution).toBeLessThan(0.03);
  });

  it('bounds a single mistake instead of turning it into a diagnosis',()=>{
    const single=scoreSchoolworkSkillEvidence(row());
    const repeated=scoreSchoolworkSkillEvidence(row({
      observationCount:3,
      attempted:3,
      likelyIncorrect:3,
      teacherMarked:3
    }));

    expect(single.rawPressure).toBeLessThan(1);
    expect(repeated.rawPressure).toBe(1);
    expect(single.weightedContribution).toBeLessThan(
      DEFAULT_SCHOOLWORK_EVIDENCE_POLICY.schoolworkEvidenceWeight
    );
    expect(repeated.weightedContribution).toBe(
      DEFAULT_SCHOOLWORK_EVIDENCE_POLICY.schoolworkEvidenceWeight
    );
  });

  it('does not manufacture error pressure when no correctness evidence exists',()=>{
    const legacy=scoreSchoolworkSkillEvidence(row({
      observationCount:3,
      attempted:3,
      likelyCorrect:0,
      likelyIncorrect:0,
      unknownCorrectness:3,
      teacherMarked:3,
      meanConfidence:0.5
    }));

    expect(legacy.errorRate).toBe(0);
    expect(legacy.weightedContribution).toBeCloseTo(0.0525,10);
  });
});
