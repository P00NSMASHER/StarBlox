import {createHash} from 'node:crypto';

import {
  SCHOOLWORK_EVIDENCE_CLASSES,
  SCHOOLWORK_SIGNAL_DEFINITIONS,
  classifySchoolworkPhotoObservation,
  validateSchoolworkPhotoIntake
} from './schoolworkPhotoIntakeAdapter.js';
import {validateSanitizedSchoolworkPack} from './schoolworkPhotoPipeline.js';
import {validateSchoolworkReviewQueue} from './schoolworkPhotoReviewGate.js';

export const SCHOOLWORK_SKILL_OBSERVATION_VERSION='schoolwork-skill-observations-v1';
export const SCHOOLWORK_SKILL_OBSERVATION_RECEIPT_VERSION='schoolwork-skill-observation-receipt-v1';

function stable(value){
  if(Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';
  }
  return JSON.stringify(value);
}

function sha(value){
  return 'sha256:'+createHash('sha256').update(stable(value)).digest('hex');
}

function safeId(value){
  return String(value||'')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,96);
}

function evidenceFor(observation,candidate){
  const attempted=observation?.attempted!==false;
  return {
    attempted,
    likelyCorrect:attempted&&typeof observation?.likelyCorrect==='boolean'
      ? observation.likelyCorrect
      : null,
    confidence:Number(candidate?.confidence),
    evidenceClass:observation?.evidenceClass||'completed-schoolwork'
  };
}

function observationRecord({
  batchId,
  capturedDate,
  pageRef,
  observationIndex,
  generatorKey,
  evidence,
  reviewStatus
}){
  const definition=SCHOOLWORK_SIGNAL_DEFINITIONS[generatorKey];
  if(!definition) return null;
  return {
    id:safeId(
      batchId+'-'+pageRef+'-'+String(observationIndex+1).padStart(3,'0')+'-'+generatorKey
    ),
    batchId,
    capturedDate,
    pageRef,
    generatorKey,
    stationId:definition.stationId,
    subject:definition.subject,
    skill:definition.skill,
    domain:definition.domain,
    attempted:evidence.attempted===true,
    likelyCorrect:evidence.likelyCorrect,
    confidence:Number(evidence.confidence),
    evidenceClass:evidence.evidenceClass,
    sourceType:'sanitized-schoolwork-photo',
    reviewStatus
  };
}

function aggregateBySkill(observations){
  const groups=new Map();
  for(const observation of observations){
    const row=groups.get(observation.skill)||{
      skill:observation.skill,
      subject:observation.subject,
      domain:observation.domain,
      observationCount:0,
      attempted:0,
      likelyCorrect:0,
      likelyIncorrect:0,
      unknownCorrectness:0,
      confidenceMass:0,
      maxConfidence:0,
      teacherMarked:0,
      completedSchoolwork:0,
      ungradedSchoolwork:0,
      generatorKeys:new Set()
    };
    row.observationCount+=1;
    if(observation.attempted) row.attempted+=1;
    if(observation.likelyCorrect===true) row.likelyCorrect+=1;
    else if(observation.likelyCorrect===false) row.likelyIncorrect+=1;
    else row.unknownCorrectness+=1;
    row.confidenceMass+=observation.confidence;
    row.maxConfidence=Math.max(row.maxConfidence,observation.confidence);
    if(observation.evidenceClass==='teacher-marked-schoolwork') row.teacherMarked+=1;
    else if(observation.evidenceClass==='completed-schoolwork') row.completedSchoolwork+=1;
    else if(observation.evidenceClass==='ungraded-schoolwork') row.ungradedSchoolwork+=1;
    row.generatorKeys.add(observation.generatorKey);
    groups.set(observation.skill,row);
  }

  return Object.fromEntries(
    [...groups.entries()]
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([skill,row])=>[
        skill,
        {
          skill:row.skill,
          subject:row.subject,
          domain:row.domain,
          observationCount:row.observationCount,
          attempted:row.attempted,
          likelyCorrect:row.likelyCorrect,
          likelyIncorrect:row.likelyIncorrect,
          unknownCorrectness:row.unknownCorrectness,
          meanConfidence:Number((row.confidenceMass/row.observationCount).toFixed(4)),
          maxConfidence:Number(row.maxConfidence.toFixed(4)),
          teacherMarked:row.teacherMarked,
          completedSchoolwork:row.completedSchoolwork,
          ungradedSchoolwork:row.ungradedSchoolwork,
          generatorKeys:[...row.generatorKeys].sort()
        }
      ])
  );
}

function artifactFrom({batchId,capturedDate,observations,mode,reviewSummary}){
  const bySkill=aggregateBySkill(observations);
  return {
    schemaVersion:1,
    observationVersion:SCHOOLWORK_SKILL_OBSERVATION_VERSION,
    batchId,
    capturedDate,
    mode,
    observationCount:observations.length,
    observations,
    bySkill,
    reviewSummary,
    privacy:{
      rawImagesIncluded:false,
      rawTextIncluded:false,
      studentIdentityIncluded:false,
      studentResponsesIncluded:false,
      teacherMarksIncluded:false,
      gradesOrScoresIncluded:false,
      sourceImageHashesIncluded:false
    }
  };
}

function receiptFor(artifact){
  return {
    schemaVersion:1,
    receiptVersion:SCHOOLWORK_SKILL_OBSERVATION_RECEIPT_VERSION,
    observationVersion:SCHOOLWORK_SKILL_OBSERVATION_VERSION,
    batchId:artifact.batchId,
    capturedDate:artifact.capturedDate,
    mode:artifact.mode,
    observationCount:artifact.observationCount,
    skillCount:Object.keys(artifact.bySkill).length,
    observationHash:sha({
      observationVersion:artifact.observationVersion,
      batchId:artifact.batchId,
      capturedDate:artifact.capturedDate,
      observations:artifact.observations,
      bySkill:artifact.bySkill
    }),
    privacy:artifact.privacy
  };
}

export function buildSchoolworkSkillObservations({intake,reviewedPack}){
  const issues=[
    ...validateSchoolworkPhotoIntake(intake),
    ...validateSanitizedSchoolworkPack(reviewedPack),
    ...validateSchoolworkReviewQueue(reviewedPack)
  ];
  if(intake?.batchId!==reviewedPack?.batchId){
    issues.push({type:'skill-observation-batch-mismatch'});
  }
  if(issues.length) return {issues,artifact:null,receipt:null};

  const reviewItems=new Map(
    (reviewedPack.reviewQueue||[]).map(item=>[item.reviewId,item])
  );
  const observations=[];
  let reviewOrdinal=0;
  let pendingReviewItems=0;
  let rejectedReviewItems=0;
  let acceptedReviewItems=0;
  let omittedLowConfidence=0;

  for(const page of intake.pages){
    for(const [observationIndex,observation] of page.observations.entries()){
      const classification=classifySchoolworkPhotoObservation(observation);
      if(classification.kind==='omit'){
        omittedLowConfidence+=1;
        continue;
      }

      let generatorKey=null;
      let candidate=null;
      let reviewStatus='auto-accepted';

      if(classification.kind==='accepted'){
        candidate=classification.candidates[0];
        generatorKey=candidate.generatorKey;
      }else{
        reviewOrdinal+=1;
        const reviewId='review-'+page.pageRef+'-'+String(reviewOrdinal).padStart(3,'0');
        const reviewItem=reviewItems.get(reviewId);
        if(!reviewItem){
          return {
            issues:[{type:'skill-observation-review-item-missing',reviewId}],
            artifact:null,
            receipt:null
          };
        }
        if(reviewItem.status==='needs-review'){
          pendingReviewItems+=1;
          continue;
        }
        if(reviewItem.status==='rejected'){
          rejectedReviewItems+=1;
          continue;
        }
        const selectedIndex=reviewItem.candidateSignals.findIndex(
          row=>row.id===reviewItem.selectedSignalId
        );
        if(selectedIndex<0||classification.candidates[selectedIndex]===undefined){
          return {
            issues:[{type:'skill-observation-review-selection-mismatch',reviewId}],
            artifact:null,
            receipt:null
          };
        }
        const selected=reviewItem.candidateSignals[selectedIndex];
        candidate=classification.candidates[selectedIndex];
        generatorKey=selected.generatorKey;
        reviewStatus='parent-accepted';
        acceptedReviewItems+=1;
      }

      const record=observationRecord({
        batchId:intake.batchId,
        capturedDate:intake.capturedDate,
        pageRef:page.pageRef,
        observationIndex,
        generatorKey,
        evidence:evidenceFor(observation,candidate),
        reviewStatus
      });
      if(record) observations.push(record);
    }
  }

  const artifact=artifactFrom({
    batchId:intake.batchId,
    capturedDate:intake.capturedDate,
    observations,
    mode:'structured-intake',
    reviewSummary:{
      pendingReviewItems,
      acceptedReviewItems,
      rejectedReviewItems,
      omittedLowConfidence
    }
  });
  return {issues:[],artifact,receipt:receiptFor(artifact)};
}

export function buildLegacySchoolworkSkillObservations(
  pack,
  {evidenceClass='teacher-marked-schoolwork'}={}
){
  const issues=[
    ...validateSanitizedSchoolworkPack(pack),
    ...validateSchoolworkReviewQueue(pack)
  ];
  if(!SCHOOLWORK_EVIDENCE_CLASSES.includes(evidenceClass)){
    issues.push({type:'legacy-evidence-class-invalid',evidenceClass});
  }
  if(issues.length) return {issues,artifact:null,receipt:null};

  const observations=(pack.skillSignals||[])
    .map((signal,index)=>({
      id:safeId(pack.batchId+'-legacy-'+String(index+1).padStart(3,'0')+'-'+signal.id),
      batchId:pack.batchId,
      capturedDate:pack.capturedDate||'',
      generatorKey:signal.generatorKey,
      stationId:signal.stationId,
      subject:signal.subject,
      skill:signal.skill,
      domain:signal.domain,
      attempted:true,
      likelyCorrect:null,
      confidence:0.5,
      evidenceClass,
      sourceType:'legacy-sanitized-schoolwork-photo-signal',
      reviewStatus:'legacy-skill-only'
    }))
    .sort((a,b)=>a.id.localeCompare(b.id));

  const artifact=artifactFrom({
    batchId:pack.batchId,
    capturedDate:pack.capturedDate||'',
    observations,
    mode:'legacy-sanitized-skill-signals',
    reviewSummary:{
      pendingReviewItems:(pack.reviewQueue||[]).filter(item=>item.status==='needs-review').length,
      acceptedReviewItems:(pack.reviewQueue||[]).filter(item=>item.status==='accepted').length,
      rejectedReviewItems:(pack.reviewQueue||[]).filter(item=>item.status==='rejected').length,
      omittedLowConfidence:0
    }
  });
  return {issues:[],artifact,receipt:receiptFor(artifact)};
}

function luaString(value){
  return JSON.stringify(String(value));
}

export function renderSchoolworkSkillEvidenceLua(artifact){
  const lines=[
    '--!strict',
    '',
    '-- Generated from privacy-safe schoolwork skill observations.',
    '-- No raw images, worksheet text, student answers, grades, or teacher marks are stored here.',
    'local SchoolworkSkillEvidence = {',
    '\tSchemaVersion = 1,',
    '\tVersion = '+luaString(artifact.observationVersion)+',',
    '\tBatchId = '+luaString(artifact.batchId)+',',
    '\tCapturedDate = '+luaString(artifact.capturedDate)+',',
    '\tSkills = table.freeze({'
  ];
  for(const [skill,row] of Object.entries(artifact.bySkill).sort(([a],[b])=>a.localeCompare(b))){
    lines.push(
      '\t\t['+luaString(skill)+'] = table.freeze({',
      '\t\t\tObservationCount = '+row.observationCount+',',
      '\t\t\tAttempted = '+row.attempted+',',
      '\t\t\tLikelyCorrect = '+row.likelyCorrect+',',
      '\t\t\tLikelyIncorrect = '+row.likelyIncorrect+',',
      '\t\t\tUnknownCorrectness = '+row.unknownCorrectness+',',
      '\t\t\tMeanConfidence = '+row.meanConfidence+',',
      '\t\t\tMaxConfidence = '+row.maxConfidence+',',
      '\t\t\tTeacherMarked = '+row.teacherMarked+',',
      '\t\t\tCompletedSchoolwork = '+row.completedSchoolwork+',',
      '\t\t\tUngradedSchoolwork = '+row.ungradedSchoolwork+',',
      '\t\t\tCurrent = true,',
      '\t\t}),'
    );
  }
  lines.push(
    '\t}),',
    '}',
    '',
    'function SchoolworkSkillEvidence.HasSkill(skill: string): boolean',
    '\treturn SchoolworkSkillEvidence.Skills[skill] ~= nil',
    'end',
    '',
    'return table.freeze(SchoolworkSkillEvidence)',
    ''
  );
  return lines.join('\n');
}
