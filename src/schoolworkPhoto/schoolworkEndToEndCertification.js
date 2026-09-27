import {
  SCHOOLWORK_PROVENANCE,
  SCHOOLWORK_SOURCE_TRANSFORM,
  schoolworkPackHash,
  validateOriginalEquivalentCatalog,
  validateSanitizedSchoolworkPack
} from './schoolworkPhotoPipeline.js';
import {
  applySchoolworkReviewGate,
  validateSchoolworkReviewQueue
} from './schoolworkPhotoReviewGate.js';
import {
  SCHOOLWORK_SKILL_OBSERVATION_VERSION,
  schoolworkSkillObservationHash
} from './schoolworkSkillObservations.js';

export const SCHOOLWORK_PIPELINE_CERTIFICATION_VERSION='schoolwork-photo-pipeline-certification-v1';
export const SCHOOLWORK_PRODUCTION_GENERATOR_VERSION='dynamic-abvm-star-sync-generator-v7-reviewed-schoolwork';

const STATIONS=[
  'word-portal-put-v1',
  'spelling-forge-fog-v1',
  'culture-lab-culture-v1'
];

function allFalse(value){
  return !!value&&typeof value==='object'&&
    Object.values(value).every(item=>item===false);
}

function addIssue(issues,type,details={}){
  issues.push({type,...details});
}

export function certifySchoolworkPhotoPipeline({
  sourcePack,
  skillArtifact,
  skillReceipt,
  questionCatalog,
  reviewReceipt,
  rotatingSource,
  evidenceLua='',
  coreQuestionBankLua=''
}){
  const issues=[
    ...validateSanitizedSchoolworkPack(sourcePack),
    ...validateSchoolworkReviewQueue(sourcePack)
  ];
  if(issues.length){
    return {
      issues,
      receipt:null
    };
  }

  const gated=applySchoolworkReviewGate(sourcePack);
  if(gated.issues.length){
    return {issues:gated.issues,receipt:null};
  }

  const sourceHash=schoolworkPackHash(sourcePack);
  const batchId=sourcePack.batchId;
  const effectiveSignalCount=gated.effectivePack.skillSignals.length;

  if(!skillArtifact||typeof skillArtifact!=='object'){
    addIssue(issues,'skill-artifact-missing');
  }else{
    if(skillArtifact.observationVersion!==SCHOOLWORK_SKILL_OBSERVATION_VERSION){
      addIssue(issues,'skill-observation-version-mismatch');
    }
    if(skillArtifact.batchId!==batchId) addIssue(issues,'skill-artifact-batch-mismatch');
    if(skillArtifact.observationCount!==(skillArtifact.observations||[]).length){
      addIssue(issues,'skill-artifact-count-mismatch');
    }
    if(!allFalse(skillArtifact.privacy)) addIssue(issues,'skill-artifact-privacy-contract-failed');
    for(const field of ['pendingReviewItems','acceptedReviewItems','rejectedReviewItems']){
      const expected=gated.summary[field]??0;
      const actual=skillArtifact.reviewSummary?.[field]??0;
      if(actual!==expected){
        addIssue(issues,'skill-artifact-review-summary-mismatch',{field,expected,actual});
      }
    }
  }

  if(!skillReceipt||typeof skillReceipt!=='object'){
    addIssue(issues,'skill-receipt-missing');
  }else if(skillArtifact&&typeof skillArtifact==='object'){
    if(skillReceipt.batchId!==batchId) addIssue(issues,'skill-receipt-batch-mismatch');
    if(skillReceipt.observationCount!==skillArtifact.observationCount){
      addIssue(issues,'skill-receipt-observation-count-mismatch');
    }
    if(skillReceipt.skillCount!==Object.keys(skillArtifact.bySkill||{}).length){
      addIssue(issues,'skill-receipt-skill-count-mismatch');
    }
    const expectedObservationHash=schoolworkSkillObservationHash(skillArtifact);
    if(skillReceipt.observationHash!==expectedObservationHash){
      addIssue(issues,'skill-receipt-hash-mismatch');
    }
    if(!allFalse(skillReceipt.privacy)) addIssue(issues,'skill-receipt-privacy-contract-failed');
  }

  if(!questionCatalog||typeof questionCatalog!=='object'){
    addIssue(issues,'question-catalog-missing');
  }else{
    if(questionCatalog.batchId!==batchId) addIssue(issues,'question-catalog-batch-mismatch');
    if(questionCatalog.sourceHash!==sourceHash) addIssue(issues,'question-catalog-source-hash-mismatch');
    if(questionCatalog.questionCount!==(questionCatalog.questions||[]).length){
      addIssue(issues,'question-catalog-count-mismatch');
    }
    for(const issue of validateOriginalEquivalentCatalog(questionCatalog)){
      addIssue(issues,'question-catalog-equivalent-validation-failed',{issue});
    }
    const questionIds=new Set((questionCatalog.questions||[]).map(question=>question.id));
    const activeIds=questionCatalog.activeQuestionIds||[];
    if(new Set(activeIds).size!==activeIds.length) addIssue(issues,'active-question-id-duplicate');
    for(const id of activeIds){
      if(!questionIds.has(id)) addIssue(issues,'active-question-missing-from-catalog',{id});
    }
    for(const stationId of STATIONS){
      const activeCount=(questionCatalog.questions||[]).filter(
        question=>activeIds.includes(question.id)&&question.stationId===stationId
      ).length;
      if(activeCount>4) addIssue(issues,'active-station-cap-exceeded',{stationId,activeCount});
    }
  }

  if(!reviewReceipt||typeof reviewReceipt!=='object'){
    addIssue(issues,'review-receipt-missing');
  }else{
    if(reviewReceipt.batchId!==batchId) addIssue(issues,'review-receipt-batch-mismatch');
    if(reviewReceipt.sourceHash!==sourceHash) addIssue(issues,'review-receipt-source-hash-mismatch');
    if(reviewReceipt.acceptedSkillSignals!==effectiveSignalCount){
      addIssue(issues,'review-receipt-signal-count-mismatch',{
        expected:effectiveSignalCount,
        actual:reviewReceipt.acceptedSkillSignals
      });
    }
    if(reviewReceipt.generatedQuestionCandidates!==questionCatalog?.questionCount){
      addIssue(issues,'review-receipt-candidate-count-mismatch');
    }
    if(reviewReceipt.activeQuestionCount!==(questionCatalog?.activeQuestionIds||[]).length){
      addIssue(issues,'review-receipt-active-count-mismatch');
    }
    if(!allFalse(reviewReceipt.privacy)) addIssue(issues,'review-receipt-privacy-contract-failed');
    for(const field of ['pendingReviewItems','acceptedReviewItems','rejectedReviewItems','promotedSkillSignals']){
      const expected=gated.summary[field]??0;
      const actual=reviewReceipt.reviewGate?.[field]??0;
      if(actual!==expected){
        addIssue(issues,'review-receipt-gate-summary-mismatch',{field,expected,actual});
      }
    }
  }

  const generatedFrom=rotatingSource?.generatedFrom||{};
  const quality=rotatingSource?.qualityPolicy||{};
  if(!rotatingSource||typeof rotatingSource!=='object'){
    addIssue(issues,'rotating-source-missing');
  }else{
    if(generatedFrom.generatorVersion!==SCHOOLWORK_PRODUCTION_GENERATOR_VERSION){
      addIssue(issues,'production-generator-version-mismatch',{
        expected:SCHOOLWORK_PRODUCTION_GENERATOR_VERSION,
        actual:generatedFrom.generatorVersion
      });
    }
    if(generatedFrom.schoolworkSourceHash!==sourceHash){
      addIssue(issues,'production-schoolwork-source-hash-mismatch');
    }
    if(generatedFrom.schoolworkBatchId!==batchId){
      addIssue(issues,'production-schoolwork-batch-mismatch');
    }
    if(generatedFrom.schoolworkGenerationVariant!==questionCatalog?.generationVariant){
      addIssue(issues,'production-generation-variant-mismatch');
    }
    if(quality.schoolworkPhotoGenerationMode!==questionCatalog?.generationMode){
      addIssue(issues,'production-generation-mode-mismatch');
    }
    if(quality.schoolworkPhotoGenerationVariant!==questionCatalog?.generationVariant){
      addIssue(issues,'production-quality-variant-mismatch');
    }
    if(quality.schoolworkPhotoSourceTransform!==SCHOOLWORK_SOURCE_TRANSFORM){
      addIssue(issues,'production-source-transform-mismatch');
    }
    if(quality.schoolworkPhotoCandidateQuestionCount!==questionCatalog?.questionCount){
      addIssue(issues,'production-candidate-count-mismatch');
    }
    if(quality.schoolworkPhotoActiveQuestionCount!==(questionCatalog?.activeQuestionIds||[]).length){
      addIssue(issues,'production-active-count-mismatch');
    }

    const productionById=new Map((rotatingSource.questions||[]).map(question=>[question.id,question]));
    for(const id of questionCatalog?.activeQuestionIds||[]){
      const question=productionById.get(id);
      if(!question){
        addIssue(issues,'active-question-missing-from-production',{id});
        continue;
      }
      if(question.photoDerived!==true||
        question.provenance!==SCHOOLWORK_PROVENANCE||
        question.sourceTransform!==SCHOOLWORK_SOURCE_TRANSFORM||
        question.originalEquivalent!==true
      ){
        addIssue(issues,'active-production-question-contract-failed',{id});
      }
    }
  }

  if(evidenceLua){
    if(!evidenceLua.includes('BatchId = '+JSON.stringify(batchId))){
      addIssue(issues,'runtime-evidence-batch-mismatch');
    }
    if(!evidenceLua.includes('Version = '+JSON.stringify(SCHOOLWORK_SKILL_OBSERVATION_VERSION))){
      addIssue(issues,'runtime-evidence-version-mismatch');
    }
  }

  if(coreQuestionBankLua){
    if(!coreQuestionBankLua.includes('SchoolworkPhotoSourceHash = '+JSON.stringify(sourceHash))){
      addIssue(issues,'runtime-question-bank-source-hash-mismatch');
    }
    for(const id of questionCatalog?.activeQuestionIds||[]){
      if(!coreQuestionBankLua.includes('Id = '+JSON.stringify(id))){
        addIssue(issues,'runtime-question-bank-active-id-missing',{id});
      }
    }
  }

  const receipt={
    schemaVersion:1,
    certificationVersion:SCHOOLWORK_PIPELINE_CERTIFICATION_VERSION,
    status:issues.length===0?'certified':'failed',
    batchId,
    sourceHash,
    observationHash:skillReceipt?.observationHash||null,
    generatorVersion:generatedFrom.generatorVersion||null,
    generationVariant:questionCatalog?.generationVariant??null,
    acceptedSkillSignals:effectiveSignalCount,
    pendingReviewItems:gated.summary.pendingReviewItems,
    acceptedReviewItems:gated.summary.acceptedReviewItems,
    rejectedReviewItems:gated.summary.rejectedReviewItems,
    activeQuestionCount:(questionCatalog?.activeQuestionIds||[]).length,
    privacySafe:issues.every(issue=>!String(issue.type).includes('privacy-contract-failed')),
    failClosed:true
  };

  return {issues,receipt};
}
