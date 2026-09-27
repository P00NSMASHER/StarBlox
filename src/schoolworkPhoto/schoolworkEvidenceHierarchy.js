export const SCHOOLWORK_EVIDENCE_POLICY_VERSION='schoolwork-evidence-hierarchy-v1';

export const DEFAULT_SCHOOLWORK_EVIDENCE_POLICY=Object.freeze({
  teacherMarkedMultiplier:1,
  completedSchoolworkMultiplier:0.65,
  ungradedSchoolworkMultiplier:0.35,
  errorShare:0.75,
  presenceShare:0.25,
  attemptTarget:3,
  schoolworkEvidenceWeight:0.42,
  currentMaterialWeight:0.08,
  ordinaryInGameWeaknessWeight:0.34,
  ordinaryInGameWrongPressureWeight:0.16
});

function clamp01(value){
  return Math.max(0,Math.min(1,Number(value)||0));
}

export function ordinarySingleMissBenchmark(policy=DEFAULT_SCHOOLWORK_EVIDENCE_POLICY){
  return policy.ordinaryInGameWeaknessWeight+
    (1/3)*policy.ordinaryInGameWrongPressureWeight;
}

export function schoolworkSourceStrength(row,policy=DEFAULT_SCHOOLWORK_EVIDENCE_POLICY){
  const count=Math.max(1,Number(row?.observationCount)||0);
  const teacher=Math.max(0,Number(row?.teacherMarked)||0);
  const completed=Math.max(0,Number(row?.completedSchoolwork)||0);
  const ungraded=Math.max(0,Number(row?.ungradedSchoolwork)||0);
  return clamp01(
    (
      teacher*policy.teacherMarkedMultiplier+
      completed*policy.completedSchoolworkMultiplier+
      ungraded*policy.ungradedSchoolworkMultiplier
    )/count
  );
}

export function scoreSchoolworkSkillEvidence(row,policy=DEFAULT_SCHOOLWORK_EVIDENCE_POLICY){
  if(!row||typeof row!=='object'){
    return {
      sourceStrength:0,
      errorRate:0,
      repetition:0,
      confidence:0,
      rawPressure:0,
      weightedContribution:0,
      withCurrentMaterial:0
    };
  }

  const knownCorrect=Math.max(0,Number(row.likelyCorrect)||0);
  const knownIncorrect=Math.max(0,Number(row.likelyIncorrect)||0);
  const known=knownCorrect+knownIncorrect;
  const errorRate=known>0?clamp01(knownIncorrect/known):0;
  const repetition=clamp01(
    Math.max(0,Number(row.attempted)||0)/
    Math.max(1,Number(policy.attemptTarget)||3)
  );
  const confidence=clamp01(row.meanConfidence);
  const sourceStrength=schoolworkSourceStrength(row,policy);
  const evidencePressure=
    errorRate*policy.errorShare+
    repetition*policy.presenceShare;
  const rawPressure=clamp01(evidencePressure*sourceStrength*confidence);
  const weightedContribution=rawPressure*policy.schoolworkEvidenceWeight;

  return {
    sourceStrength,
    errorRate,
    repetition,
    confidence,
    rawPressure,
    weightedContribution,
    withCurrentMaterial:weightedContribution+policy.currentMaterialWeight
  };
}
