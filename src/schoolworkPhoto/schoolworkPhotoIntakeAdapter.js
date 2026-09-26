import {
  SCHOOLWORK_PHOTO_PACK_VERSION,
  schoolworkPackHash,
  validateSanitizedSchoolworkPack
} from './schoolworkPhotoPipeline.js';
import {validateSchoolworkReviewQueue} from './schoolworkPhotoReviewGate.js';

export const SCHOOLWORK_PHOTO_INTAKE_VERSION='schoolwork-photo-intake-v1';
export const SCHOOLWORK_PHOTO_INTAKE_RECEIPT_VERSION='schoolwork-photo-intake-receipt-v1';
export const AUTO_ACCEPT_CONFIDENCE=0.85;
export const REVIEW_CONFIDENCE_FLOOR=0.55;

const SOURCE_CATEGORIES=new Set([
  'phonics',
  'word-study',
  'spelling',
  'vocabulary',
  'reading-comprehension',
  'religion'
]);

const SIGNAL_DEFINITIONS=Object.freeze({
  'short-vowel-identification':Object.freeze({
    stationId:'spelling-forge-fog-v1',
    subject:'Reading / ELA',
    skill:'vowel-patterns',
    domain:'Word knowledge and skills'
  }),
  'cvc-missing-vowel':Object.freeze({
    stationId:'spelling-forge-fog-v1',
    subject:'Reading / ELA',
    skill:'cvc-structure',
    domain:'Word knowledge and skills'
  }),
  'plural-s-es':Object.freeze({
    stationId:'spelling-forge-fog-v1',
    subject:'Reading / ELA',
    skill:'plural-nouns',
    domain:'Word knowledge and skills'
  }),
  'spelling-short-vowel':Object.freeze({
    stationId:'spelling-forge-fog-v1',
    subject:'Reading / ELA',
    skill:'vowel-patterns',
    domain:'Word knowledge and skills'
  }),
  'vocabulary-definition':Object.freeze({
    stationId:'word-portal-put-v1',
    subject:'Reading / ELA',
    skill:'vocabulary-in-context',
    domain:'Word knowledge and skills'
  }),
  'reading-main-character':Object.freeze({
    stationId:'word-portal-put-v1',
    subject:'Reading / ELA',
    skill:'story-elements',
    domain:'Analyzing literary text'
  }),
  'reading-setting':Object.freeze({
    stationId:'word-portal-put-v1',
    subject:'Reading / ELA',
    skill:'story-elements',
    domain:'Analyzing literary text'
  }),
  'reading-character-motivation':Object.freeze({
    stationId:'word-portal-put-v1',
    subject:'Reading / ELA',
    skill:'inference',
    domain:'Comprehension strategies and constructing meaning'
  }),
  'reading-genre':Object.freeze({
    stationId:'culture-lab-culture-v1',
    subject:'Reading / ELA',
    skill:'genre',
    domain:'Analyzing literary text'
  }),
  'religion-trinity':Object.freeze({
    stationId:'culture-lab-culture-v1',
    subject:'Religion',
    skill:'religion-application',
    domain:'Religion: current lesson application'
  }),
  'religion-gifts':Object.freeze({
    stationId:'culture-lab-culture-v1',
    subject:'Religion',
    skill:'religion-application',
    domain:'Religion: current lesson application'
  }),
  'religion-choice-love':Object.freeze({
    stationId:'culture-lab-culture-v1',
    subject:'Religion',
    skill:'religion-application',
    domain:'Religion: current lesson application'
  })
});

const REASON_CODES=new Set([
  'teacher-mark-unclear',
  'student-response-unclear',
  'correctness-unclear',
  'skill-classification-unclear',
  'source-item-unclear',
  'other'
]);

const ALLOWED_TOP_FIELDS=new Set(['schemaVersion','intakeVersion','batchId','capturedDate','pages']);
const ALLOWED_PAGE_FIELDS=new Set(['pageRef','sourceCategories','observations']);
const ALLOWED_OBSERVATION_FIELDS=new Set([
  'generatorKey','confidence','coverageWeight','candidates','reasonCode'
]);
const ALLOWED_CANDIDATE_FIELDS=new Set(['generatorKey','confidence','coverageWeight']);

function safeToken(value,max=80){
  return typeof value==='string'&&value.length>0&&value.length<=max&&/^[a-zA-Z0-9._-]+$/.test(value);
}

function unexpectedFields(value,allowed,path,issues){
  if(!value||typeof value!=='object'||Array.isArray(value)) return;
  for(const key of Object.keys(value)){
    if(!allowed.has(key)) issues.push({type:'unexpected-intake-field',path:path?path+'.'+key:key});
  }
}

function validConfidence(value){
  return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1;
}

function coverageWeight(candidate){
  if(Number.isInteger(candidate.coverageWeight)&&candidate.coverageWeight>=1&&candidate.coverageWeight<=5){
    return candidate.coverageWeight;
  }
  return Math.max(1,Math.min(5,Math.round(candidate.confidence*5)));
}

function canonicalSignal(generatorKey,{id=generatorKey,weight=4}={}){
  const definition=SIGNAL_DEFINITIONS[generatorKey];
  if(!definition) return null;
  return {
    id,
    generatorKey,
    stationId:definition.stationId,
    subject:definition.subject,
    skill:definition.skill,
    domain:definition.domain,
    coverageWeight:weight
  };
}

function normalizeObservationCandidates(observation){
  if(Array.isArray(observation.candidates)) return observation.candidates;
  if(observation.generatorKey!==undefined){
    return [{
      generatorKey:observation.generatorKey,
      confidence:observation.confidence,
      coverageWeight:observation.coverageWeight
    }];
  }
  return [];
}

export function validateSchoolworkPhotoIntake(intake){
  const issues=[];
  if(!intake||typeof intake!=='object'||Array.isArray(intake)){
    return [{type:'intake-missing'}];
  }
  unexpectedFields(intake,ALLOWED_TOP_FIELDS,'',issues);
  if(intake.schemaVersion!==1) issues.push({type:'intake-schema-version-invalid'});
  if(intake.intakeVersion!==SCHOOLWORK_PHOTO_INTAKE_VERSION){
    issues.push({type:'intake-version-invalid'});
  }
  if(!safeToken(intake.batchId,80)) issues.push({type:'intake-batch-id-invalid'});
  if(typeof intake.capturedDate!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(intake.capturedDate)){
    issues.push({type:'intake-captured-date-invalid'});
  }
  if(!Array.isArray(intake.pages)||intake.pages.length===0){
    issues.push({type:'intake-pages-missing'});
    return issues;
  }

  const pageRefs=new Set();
  for(const [pageIndex,page] of intake.pages.entries()){
    const pagePath='pages['+pageIndex+']';
    if(!page||typeof page!=='object'||Array.isArray(page)){
      issues.push({type:'intake-page-invalid',pageIndex});
      continue;
    }
    unexpectedFields(page,ALLOWED_PAGE_FIELDS,pagePath,issues);
    if(!safeToken(page.pageRef,40)){
      issues.push({type:'intake-page-ref-invalid',pageIndex});
    }else if(pageRefs.has(page.pageRef)){
      issues.push({type:'intake-page-ref-duplicate',pageRef:page.pageRef});
    }else{
      pageRefs.add(page.pageRef);
    }

    if(!Array.isArray(page.sourceCategories)||page.sourceCategories.length===0){
      issues.push({type:'intake-source-categories-invalid',pageRef:page.pageRef});
    }else{
      for(const category of page.sourceCategories){
        if(!SOURCE_CATEGORIES.has(category)){
          issues.push({type:'intake-source-category-unsupported',pageRef:page.pageRef,category});
        }
      }
    }

    if(!Array.isArray(page.observations)||page.observations.length===0){
      issues.push({type:'intake-observations-missing',pageRef:page.pageRef});
      continue;
    }

    for(const [observationIndex,observation] of page.observations.entries()){
      const observationPath=pagePath+'.observations['+observationIndex+']';
      if(!observation||typeof observation!=='object'||Array.isArray(observation)){
        issues.push({type:'intake-observation-invalid',pageRef:page.pageRef,observationIndex});
        continue;
      }
      unexpectedFields(observation,ALLOWED_OBSERVATION_FIELDS,observationPath,issues);
      if(observation.reasonCode!==undefined&&!REASON_CODES.has(observation.reasonCode)){
        issues.push({type:'intake-reason-code-invalid',pageRef:page.pageRef,observationIndex});
      }
      const candidates=normalizeObservationCandidates(observation);
      if(candidates.length<1||candidates.length>3){
        issues.push({type:'intake-candidates-invalid',pageRef:page.pageRef,observationIndex});
        continue;
      }
      for(const [candidateIndex,candidate] of candidates.entries()){
        const candidatePath=observationPath+'.candidates['+candidateIndex+']';
        if(!candidate||typeof candidate!=='object'||Array.isArray(candidate)){
          issues.push({type:'intake-candidate-invalid',pageRef:page.pageRef,observationIndex,candidateIndex});
          continue;
        }
        unexpectedFields(candidate,ALLOWED_CANDIDATE_FIELDS,candidatePath,issues);
        if(!SIGNAL_DEFINITIONS[candidate.generatorKey]){
          issues.push({
            type:'intake-generator-key-unsupported',
            pageRef:page.pageRef,
            observationIndex,
            generatorKey:candidate.generatorKey
          });
        }
        if(!validConfidence(candidate.confidence)){
          issues.push({type:'intake-confidence-invalid',pageRef:page.pageRef,observationIndex,candidateIndex});
        }
        if(candidate.coverageWeight!==undefined&&(
          !Number.isInteger(candidate.coverageWeight)||
          candidate.coverageWeight<1||
          candidate.coverageWeight>5
        )){
          issues.push({type:'intake-coverage-weight-invalid',pageRef:page.pageRef,observationIndex,candidateIndex});
        }
      }
    }
  }
  return issues;
}

export function adaptSchoolworkPhotoIntake(intake){
  const issues=validateSchoolworkPhotoIntake(intake);
  if(issues.length) return {issues,pack:null,receipt:null};

  const acceptedByGenerator=new Map();
  const reviewQueue=[];
  let acceptedObservations=0;
  let lowConfidenceOmitted=0;
  let observationCount=0;
  const sourceCategories=new Set();

  for(const page of intake.pages){
    for(const category of page.sourceCategories) sourceCategories.add(category);
    for(const observation of page.observations){
      observationCount+=1;
      const candidates=normalizeObservationCandidates(observation)
        .map(candidate=>({...candidate}))
        .sort((a,b)=>b.confidence-a.confidence||String(a.generatorKey).localeCompare(String(b.generatorKey)));
      const plausible=candidates.filter(candidate=>candidate.confidence>=REVIEW_CONFIDENCE_FLOOR);

      if(plausible.length===0){
        lowConfidenceOmitted+=1;
        continue;
      }

      const autoAccept=plausible.length===1&&
        plausible[0].confidence>=AUTO_ACCEPT_CONFIDENCE&&
        observation.reasonCode===undefined;

      if(autoAccept){
        const candidate=plausible[0];
        const weight=coverageWeight(candidate);
        const existing=acceptedByGenerator.get(candidate.generatorKey);
        if(!existing||weight>existing.coverageWeight){
          acceptedByGenerator.set(candidate.generatorKey,canonicalSignal(candidate.generatorKey,{weight}));
        }
        acceptedObservations+=1;
        continue;
      }

      const reviewId='review-'+page.pageRef+'-'+String(reviewQueue.length+1).padStart(3,'0');
      reviewQueue.push({
        reviewId,
        pageRef:page.pageRef,
        reasonCode:observation.reasonCode||'skill-classification-unclear',
        status:'needs-review',
        candidateSignals:plausible.map((candidate,index)=>canonicalSignal(candidate.generatorKey,{
          id:reviewId+'-candidate-'+String(index+1),
          weight:coverageWeight(candidate)
        }))
      });
    }
  }

  const pack={
    schemaVersion:1,
    packVersion:SCHOOLWORK_PHOTO_PACK_VERSION,
    batchId:intake.batchId,
    capturedDate:intake.capturedDate,
    pageCount:intake.pages.length,
    intakeMode:'automated-sanitized-observation-adapter-v1',
    sourceCategories:[...sourceCategories].sort(),
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
    skillSignals:[...acceptedByGenerator.values()].sort((a,b)=>a.id.localeCompare(b.id)),
    reviewQueue
  };

  const outputIssues=[
    ...validateSanitizedSchoolworkPack(pack),
    ...validateSchoolworkReviewQueue(pack)
  ];
  if(outputIssues.length){
    return {
      issues:outputIssues.map(issue=>({type:'generated-pack-invalid',issue})),
      pack:null,
      receipt:null
    };
  }

  const receipt={
    schemaVersion:1,
    receiptVersion:SCHOOLWORK_PHOTO_INTAKE_RECEIPT_VERSION,
    intakeVersion:SCHOOLWORK_PHOTO_INTAKE_VERSION,
    batchId:intake.batchId,
    capturedDate:intake.capturedDate,
    pageCount:intake.pages.length,
    observationCount,
    acceptedObservations,
    acceptedSkillSignals:pack.skillSignals.length,
    reviewItems:reviewQueue.length,
    lowConfidenceOmitted,
    sourceCategories:pack.sourceCategories,
    sourcePackHash:schoolworkPackHash(pack),
    privacy:{
      rawImagesPersisted:false,
      rawTextPersisted:false,
      studentIdentityPersisted:false,
      studentResponsesPersisted:false,
      teacherMarksPersisted:false,
      gradesOrScoresPersisted:false,
      sourceImageHashesPersisted:false
    }
  };

  return {issues:[],pack,receipt};
}

export function supportedSchoolworkPhotoGenerators(){
  return Object.keys(SIGNAL_DEFINITIONS).sort();
}
