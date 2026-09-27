import {
  schoolworkPackHash,
  validateSanitizedSchoolworkPack
} from './schoolworkPhotoPipeline.js';
import {
  applySchoolworkReviewGate,
  validateSchoolworkReviewQueue
} from './schoolworkPhotoReviewGate.js';

export const SCHOOLWORK_PHOTO_PUBLICATION_GATE_VERSION='schoolwork-photo-publication-gate-v1';

export function prepareSchoolworkPhotoPublication(rawPack){
  const sourceIssues=validateSanitizedSchoolworkPack(rawPack);
  const reviewIssues=validateSchoolworkReviewQueue(rawPack);
  const issues=[...sourceIssues,...reviewIssues];
  if(issues.length){
    return {
      issues,
      effectivePack:null,
      sourceHash:null,
      reviewGate:null,
      publicationAllowed:false
    };
  }

  const gated=applySchoolworkReviewGate(rawPack);
  if(gated.issues.length){
    return {
      issues:gated.issues,
      effectivePack:null,
      sourceHash:null,
      reviewGate:gated.summary,
      publicationAllowed:false
    };
  }

  const effectiveIssues=validateSanitizedSchoolworkPack(gated.effectivePack);
  if(effectiveIssues.length){
    return {
      issues:effectiveIssues,
      effectivePack:null,
      sourceHash:null,
      reviewGate:gated.summary,
      publicationAllowed:false
    };
  }

  return {
    issues:[],
    effectivePack:gated.effectivePack,
    sourceHash:schoolworkPackHash(gated.effectivePack),
    reviewGate:gated.summary,
    publicationAllowed:true
  };
}
