import { createHash } from 'node:crypto';

const SHA256_RE=/^[a-f0-9]{64}$/;
const SHA1_RE=/^[a-f0-9]{40}$/;

function plain(value){
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function hashSameDaySummaryPayload(payload){
  return 'sha256:' + createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

export function verifySameDaySliceSummary(summary){
  const errors=[];
  if(!plain(summary)) return {ok:false,errors:['summary must be an object']};
  if(summary.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if(summary.version !== 'starblox-same-day-slice-summary-v2') errors.push('version mismatch');
  if(summary.ok !== true) errors.push('summary.ok must be true');
  if(summary.publicationAllowed !== false) errors.push('publicationAllowed must be false');
  if(summary.readyForInternalVerticalSliceReview !== true){
    errors.push('readyForInternalVerticalSliceReview must be true');
  }

  if(!plain(summary.plan)) errors.push('plan evidence is required');
  else{
    if(typeof summary.plan.planHash !== 'string' || !summary.plan.planHash){
      errors.push('plan.planHash is required');
    }
    if(!SHA256_RE.test(String(summary.plan.sha256 || ''))) errors.push('plan.sha256 is invalid');
  }

  if(!plain(summary.integratedRun)) errors.push('integratedRun evidence is required');
  else if(!SHA256_RE.test(String(summary.integratedRun.sha256 || ''))){
    errors.push('integratedRun.sha256 is invalid');
  }

  const placeSources=summary.provenance?.placeSources;
  if(!plain(placeSources) || Object.keys(placeSources).length === 0){
    errors.push('at least one place source is required');
  }else{
    for(const [id,row] of Object.entries(placeSources)){
      if(row?.verified !== true) errors.push(id + ' place source is not verified');
      if(!SHA256_RE.test(String(row?.sha256 || ''))) errors.push(id + ' place source sha256 is invalid');
      if(!Number.isInteger(Number(row?.bytes)) || Number(row.bytes) <= 0){
        errors.push(id + ' place source bytes are invalid');
      }
    }
  }

  const codeDonors=summary.provenance?.codeDonors;
  if(!plain(codeDonors)) errors.push('codeDonors evidence is required');
  else{
    for(const [id,row] of Object.entries(codeDonors)){
      if(typeof row?.repository !== 'string' || !row.repository.includes('/')){
        errors.push(id + ' donor repository is invalid');
      }
      if(!SHA1_RE.test(String(row?.commit || ''))) errors.push(id + ' donor commit is invalid');
    }
  }

  const migrationExports=summary.provenance?.migrationExports;
  if(!plain(migrationExports)) errors.push('migrationExports evidence is required');
  else{
    for(const [id,row] of Object.entries(migrationExports)){
      if(typeof row?.receipt !== 'string' || !row.receipt) errors.push(id + ' migration receipt is required');
      if(!SHA256_RE.test(String(row?.sha256 || ''))) errors.push(id + ' migration receipt sha256 is invalid');
    }
  }

  for(const gate of ['mobile','security','performance']){
    const row=summary.gates?.[gate];
    if(!plain(row)) errors.push(gate + ' gate evidence is required');
    else{
      if(!SHA256_RE.test(String(row.sha256 || ''))) errors.push(gate + ' gate sha256 is invalid');
      if(!/^sha256:[a-f0-9]{64}$/.test(String(row.receiptHash || ''))){
        errors.push(gate + ' gate receiptHash is invalid');
      }
      if(row.integratedRunSha256 !== summary.integratedRun?.sha256){
        errors.push(gate + ' gate is not bound to integrated run');
      }
    }
  }

  const expectedHash=hashSameDaySummaryPayload(
    Object.fromEntries(Object.entries(summary).filter(([key])=>key !== 'summaryHash'))
  );
  if(summary.summaryHash !== expectedHash) errors.push('summaryHash mismatch');

  return {ok:errors.length === 0,errors};
}
