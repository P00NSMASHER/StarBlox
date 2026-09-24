import {
  toQuestionV2,
  validateQuestionV2
} from './learningContracts.js';
import { auditQuestionAdversarially } from './adversarialQuestionQa.js';
import {
  validateEvidenceBoundInteractionCandidate
} from './sourceEvidenceRuntime.js';

export const GENERATED_QUESTION_ARTIFACT_VERSION=
  'starblox-generated-question-artifact-v1';

export function compileEvidenceBoundInteractionQuestion(candidate){
  const issues=[];
  validateEvidenceBoundInteractionCandidate(candidate)
    .forEach(type=>issues.push({type,stage:'evidence'}));

  const assessment=candidate?.assessment;
  if(!assessment){
    issues.push({type:'missing-structured-assessment',stage:'assessment'});
  }

  if(issues.length){
    return {
      schemaVersion:GENERATED_QUESTION_ARTIFACT_VERSION,
      status:'rejected',
      issues,
      question:null,
      adversarialAudit:null
    };
  }

  const question=toQuestionV2({
    id:String(candidate.id)+':question',
    subject:assessment.subject,
    district:assessment.district,
    skill:assessment.skill,
    conceptIds:candidate.conceptIds,
    prerequisiteConceptIds:candidate.prerequisiteConceptIds||[],
    role:assessment.role,
    prompt:assessment.prompt,
    choices:assessment.choices,
    answer:assessment.answer,
    explanation:assessment.explanation,
    hint:assessment.hint,
    difficulty:assessment.difficulty,
    reward:assessment.reward,
    // Generated content is never mastery evidence merely because a generator
    // requests it. A separate reviewed promotion must explicitly change this.
    masteryEligible:false,
    sourceIds:candidate.sourceIds,
    evidenceSpans:(candidate.evidenceBindings||[])
      .map(binding=>binding.evidenceText),
    generator:{
      system:'edgameclaw',
      version:candidate.adapterVersion,
      seed:0
    },
    qa:{
      semantic:'shadow-pending',
      adversarial:'shadow-audited',
      provenance:'evidence-bound'
    }
  },{
    contentVersion:candidate.contentVersion,
    generatorSystem:'edgameclaw',
    generatorVersion:candidate.adapterVersion,
    generatorSeed:0
  });

  question.evidenceBindings=(candidate.evidenceBindings||[])
    .map(binding=>({...binding}));
  question.generatedAssessmentRequestedMasteryEligible=
    Boolean(assessment.requestedMasteryEligible);

  validateQuestionV2(question).forEach(type=>
    issues.push({type,stage:'question-contract'})
  );

  const adversarialAudit=auditQuestionAdversarially(question);
  adversarialAudit.hardFindings.forEach(finding=>
    issues.push({
      ...finding,
      stage:'adversarial-hard-finding'
    })
  );

  return {
    schemaVersion:GENERATED_QUESTION_ARTIFACT_VERSION,
    status:issues.length?'rejected':'qa-shadow-ready',
    issues,
    question,
    adversarialAudit
  };
}

export function validateGeneratedQuestionArtifact(artifact){
  const issues=[];
  if(artifact?.schemaVersion!==GENERATED_QUESTION_ARTIFACT_VERSION){
    issues.push('artifact-schema-version');
  }
  if(artifact?.status!=='qa-shadow-ready'){
    issues.push('artifact-not-qa-ready');
  }
  if(!artifact?.question)issues.push('artifact-missing-question');
  if(artifact?.question?.masteryEligible!==false){
    issues.push('generated-question-mastery-eligible');
  }
  if(artifact?.question?.qa?.provenance!=='evidence-bound'){
    issues.push('generated-question-not-evidence-bound');
  }
  if(!Array.isArray(artifact?.question?.evidenceBindings)||
     !artifact.question.evidenceBindings.length){
    issues.push('generated-question-missing-bindings');
  }
  if(artifact?.adversarialAudit?.hardFindings?.length){
    issues.push('generated-question-adversarial-hard-findings');
  }
  return [...new Set(issues)];
}
