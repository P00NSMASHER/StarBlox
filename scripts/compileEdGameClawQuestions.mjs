import fs from 'node:fs';
import {
  compileEvidenceBoundInteractionQuestion,
  validateGeneratedQuestionArtifact
} from '../src/generatedQuestionCompiler.js';

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

const artifacts=[];
const issues=[];
for(const candidate of candidates){
  const artifact=compileEvidenceBoundInteractionQuestion(candidate);
  artifact.issues.forEach(issue=>issues.push({
    candidateId:candidate?.id,
    ...issue
  }));
  if(artifact.status==='qa-shadow-ready'){
    validateGeneratedQuestionArtifact(artifact)
      .forEach(type=>issues.push({
        candidateId:candidate?.id,
        type,
        stage:'artifact-validation'
      }));
  }
  artifacts.push(artifact);
}

const receipt={
  schemaVersion:'starblox-edgameclaw-generated-question-receipt-v1',
  inputCandidateCount:candidates.length,
  qaReadyCount:artifacts.filter(a=>a.status==='qa-shadow-ready').length,
  forcedNonMasteryCount:artifacts.filter(
    a=>a.question&&a.question.masteryEligible===false
  ).length,
  adversarialVariantCount:artifacts.reduce(
    (sum,a)=>sum+(a.adversarialAudit?.variants?.length||0),
    0
  ),
  issueCount:issues.length,
  issues,
  artifacts
};

const text=JSON.stringify(receipt,null,2)+'\n';
if(output)fs.writeFileSync(output,text,'utf8');
process.stdout.write(text);
if(issues.length||receipt.qaReadyCount!==receipt.inputCandidateCount){
  process.exitCode=1;
}
