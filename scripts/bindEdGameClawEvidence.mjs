import fs from 'node:fs';
import {
  validateInteractionCandidate
} from '../src/edGameClawShadowAdapter.js';
import { currentLearningSourceSnapshots } from '../src/currentLearningSourceSnapshots.js';
import {
  bindInteractionCandidateEvidence,
  validateEvidenceBoundInteractionCandidate
} from '../src/sourceEvidenceRuntime.js';

function arg(name,defaultValue=''){
  const prefix='--'+name+'=';
  const found=process.argv.find(value=>value.startsWith(prefix));
  return found?found.slice(prefix.length):defaultValue;
}

const input=arg('input');
const output=arg('out');
if(!input)throw new Error('--input is required');

const payload=JSON.parse(fs.readFileSync(input,'utf8'));
const candidates=Array.isArray(payload?.candidates)
  ?payload.candidates
  :Array.isArray(payload)
    ?payload
    :[];

const snapshots=currentLearningSourceSnapshots();
const bound=[];
const issues=[];

for(const candidate of candidates){
  const basic=validateInteractionCandidate(candidate);
  basic.forEach(type=>issues.push({id:candidate?.id,type,stage:'candidate'}));

  const result=bindInteractionCandidateEvidence(candidate,snapshots);
  result.issues.forEach(issue=>issues.push({
    id:candidate?.id,
    ...issue,
    stage:'evidence-binding'
  }));
  if(!result.issues.length){
    validateEvidenceBoundInteractionCandidate(result.candidate)
      .forEach(type=>issues.push({
        id:candidate?.id,
        type,
        stage:'evidence-bound-validation'
      }));
  }
  bound.push(result.candidate);
}

const receipt={
  schemaVersion:'starblox-edgameclaw-evidence-binding-receipt-v1',
  inputCandidateCount:candidates.length,
  evidenceBoundCount:bound.filter(
    candidate=>candidate.status==='evidence-bound-shadow-candidate'
  ).length,
  issueCount:issues.length,
  issues,
  candidates:bound
};

const text=JSON.stringify(receipt,null,2)+'\n';
if(output)fs.writeFileSync(output,text,'utf8');
process.stdout.write(text);
if(issues.length||receipt.evidenceBoundCount!==receipt.inputCandidateCount){
  process.exitCode=1;
}
