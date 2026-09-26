const REVIEW_QUEUE_VERSION='schoolwork-photo-review-queue-v1';

const REVIEW_STATUSES=new Set(['needs-review','accepted','rejected']);
const REASON_CODES=new Set([
  'teacher-mark-unclear',
  'student-response-unclear',
  'correctness-unclear',
  'skill-classification-unclear',
  'source-item-unclear',
  'other'
]);

function safeToken(value,max=80){
  return typeof value==='string'&&value.length>0&&value.length<=max&&/^[a-zA-Z0-9._-]+$/.test(value);
}

function signalLooksStructured(signal){
  return !!signal&&typeof signal==='object'&&
    safeToken(signal.id,80)&&
    safeToken(signal.generatorKey,80)&&
    safeToken(signal.stationId,80)&&
    typeof signal.subject==='string'&&signal.subject.length>0&&signal.subject.length<=80&&
    typeof signal.skill==='string'&&signal.skill.length>0&&signal.skill.length<=120&&
    typeof signal.domain==='string'&&signal.domain.length>0&&signal.domain.length<=160&&
    Number.isInteger(signal.coverageWeight)&&signal.coverageWeight>=1&&signal.coverageWeight<=5;
}

export function validateSchoolworkReviewQueue(pack){
  const issues=[];
  const queue=pack?.reviewQueue;
  if(queue===undefined) return issues;
  if(!Array.isArray(queue)){
    return [{type:'review-queue-invalid'}];
  }

  const reviewIds=new Set();
  const baseSignalIds=new Set((pack.skillSignals||[]).map(signal=>signal?.id).filter(Boolean));
  const acceptedSignalIds=new Set();

  for(const [index,item] of queue.entries()){
    if(!item||typeof item!=='object'){
      issues.push({type:'review-item-invalid',index});
      continue;
    }
    if(!safeToken(item.reviewId,80)){
      issues.push({type:'review-id-invalid',index});
    }else if(reviewIds.has(item.reviewId)){
      issues.push({type:'review-id-duplicate',reviewId:item.reviewId});
    }else{
      reviewIds.add(item.reviewId);
    }

    if(!REVIEW_STATUSES.has(item.status)){
      issues.push({type:'review-status-invalid',reviewId:item.reviewId});
    }
    if(!safeToken(item.pageRef,40)){
      issues.push({type:'review-page-ref-invalid',reviewId:item.reviewId});
    }
    if(!REASON_CODES.has(item.reasonCode)){
      issues.push({type:'review-reason-invalid',reviewId:item.reviewId});
    }
    if(!Array.isArray(item.candidateSignals)||item.candidateSignals.length<1||item.candidateSignals.length>3){
      issues.push({type:'review-candidates-invalid',reviewId:item.reviewId});
      continue;
    }

    const candidateIds=new Set();
    for(const candidate of item.candidateSignals){
      if(!signalLooksStructured(candidate)){
        issues.push({type:'review-candidate-invalid',reviewId:item.reviewId,candidateId:candidate?.id});
        continue;
      }
      if(candidateIds.has(candidate.id)){
        issues.push({type:'review-candidate-id-duplicate',reviewId:item.reviewId,candidateId:candidate.id});
      }
      candidateIds.add(candidate.id);
    }

    if(item.status==='accepted'){
      if(!safeToken(item.selectedSignalId,80)||!candidateIds.has(item.selectedSignalId)){
        issues.push({type:'review-selected-signal-invalid',reviewId:item.reviewId});
      }else{
        if(baseSignalIds.has(item.selectedSignalId)||acceptedSignalIds.has(item.selectedSignalId)){
          issues.push({type:'review-promoted-signal-duplicate',reviewId:item.reviewId,signalId:item.selectedSignalId});
        }
        acceptedSignalIds.add(item.selectedSignalId);
      }
    }else if(item.selectedSignalId!==undefined&&item.selectedSignalId!==null){
      issues.push({type:'review-selection-not-allowed',reviewId:item.reviewId,status:item.status});
    }
  }
  return issues;
}

export function applySchoolworkReviewGate(pack){
  const issues=validateSchoolworkReviewQueue(pack);
  if(issues.length){
    return {
      issues,
      effectivePack:pack,
      summary:makeSummary(pack,[])
    };
  }

  const promoted=[];
  for(const item of pack?.reviewQueue||[]){
    if(item.status!=='accepted') continue;
    const selected=item.candidateSignals.find(candidate=>candidate.id===item.selectedSignalId);
    if(selected) promoted.push({...selected});
  }

  const effectivePack={
    ...pack,
    skillSignals:[...(pack?.skillSignals||[]),...promoted]
  };

  return {
    issues:[],
    effectivePack,
    summary:makeSummary(pack,promoted)
  };
}

function makeSummary(pack,promoted){
  const queue=Array.isArray(pack?.reviewQueue)?pack.reviewQueue:[];
  const pending=queue.filter(item=>item?.status==='needs-review').length;
  const accepted=queue.filter(item=>item?.status==='accepted').length;
  const rejected=queue.filter(item=>item?.status==='rejected').length;
  const legacyOmitted=pack?.review?.ambiguousObservationsOmitted===true&&queue.length===0;
  return {
    reviewQueueVersion:REVIEW_QUEUE_VERSION,
    queuePresent:Array.isArray(pack?.reviewQueue),
    totalReviewItems:queue.length,
    pendingReviewItems:pending,
    acceptedReviewItems:accepted,
    rejectedReviewItems:rejected,
    promotedSkillSignals:promoted.length,
    gateStatus:pending>0?'needs-parent-review':legacyOmitted?'legacy-ambiguous-observations-omitted':'clear',
    legacyAmbiguousObservationsOmitted:legacyOmitted
  };
}

export {REVIEW_QUEUE_VERSION};
