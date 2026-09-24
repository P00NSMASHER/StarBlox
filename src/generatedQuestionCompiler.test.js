import { describe, expect, it } from 'vitest';
import {
  adaptEdGameClawCourseStructure
} from './edGameClawShadowAdapter.js';
import { currentLearningSourceSnapshots } from './currentLearningSourceSnapshots.js';
import {
  bindInteractionCandidateEvidence
} from './sourceEvidenceRuntime.js';
import {
  compileEvidenceBoundInteractionQuestion,
  validateGeneratedQuestionArtifact
} from './generatedQuestionCompiler.js';

function makeBoundCandidate({answer='culture'}={}){
  const candidate=adaptEdGameClawCourseStructure({
    course:{id:'generated-question-test'},
    chunks:[{
      id:'culture',
      title:'Culture',
      content:'Generated explanation.',
      mechanic:'multiple_choice',
      evidenceSpans:[{
        sourceId:'current-week-vocabulary',
        text:'traditions, foods, music, stories, and ways of life shared by a group'
      }],
      assessment:{
        subject:'Reading',
        district:'Wordwood Garden',
        skill:'vocabulary',
        role:'practice',
        prompt:'Which word means traditions, foods, music, stories, and shared ways of life?',
        choices:['culture','aside','plead'],
        answer,
        explanation:'Culture is the matching vocabulary word.',
        hint:'Think about shared traditions and ways of life.',
        difficulty:2,
        reward:8,
        masteryEligible:true
      }
    }]
  },{
    contentVersion:'generated-question-test-v1',
    sourceIds:['current-week-vocabulary']
  })[0];

  const bound=bindInteractionCandidateEvidence(
    candidate,
    currentLearningSourceSnapshots()
  );
  expect(bound.issues).toEqual([]);
  return bound.candidate;
}

describe('generated question compiler',()=>{
  it('compiles an evidence-bound structured assessment into a QA-ready QuestionV2',()=>{
    const artifact=compileEvidenceBoundInteractionQuestion(
      makeBoundCandidate()
    );
    expect(artifact.status).toBe('qa-shadow-ready');
    expect(artifact.issues).toEqual([]);
    expect(artifact.question.sourceIds)
      .toEqual(['current-week-vocabulary']);
    expect(artifact.question.evidenceBindings).toHaveLength(1);
    expect(artifact.question.qa.provenance).toBe('evidence-bound');
    expect(artifact.adversarialAudit.hardFindings).toEqual([]);
    expect(validateGeneratedQuestionArtifact(artifact)).toEqual([]);
  });

  it('forces generated questions out of mastery evidence even when requested',()=>{
    const artifact=compileEvidenceBoundInteractionQuestion(
      makeBoundCandidate()
    );
    expect(artifact.question.generatedAssessmentRequestedMasteryEligible)
      .toBe(true);
    expect(artifact.question.masteryEligible).toBe(false);
  });

  it('rejects a structurally invalid generated assessment',()=>{
    const artifact=compileEvidenceBoundInteractionQuestion(
      makeBoundCandidate({answer:'not-in-choices'})
    );
    expect(artifact.status).toBe('rejected');
    expect(artifact.issues.some(issue=>
      issue.type==='answer-choice-invariant'
    )).toBe(true);
  });

  it('cannot compile an unbound candidate',()=>{
    const candidate=adaptEdGameClawCourseStructure({
      course:{id:'unbound'},
      chunks:[{
        id:'x',
        title:'X',
        content:'Generated.',
        mechanic:'multiple_choice',
        assessment:{
          subject:'Reading',
          district:'Wordwood Garden',
          skill:'vocabulary',
          role:'practice',
          prompt:'Pick culture.',
          choices:['culture','aside','plead'],
          answer:'culture',
          explanation:'Culture.',
          hint:'Think.',
          difficulty:2,
          reward:8
        }
      }]
    },{
      contentVersion:'unbound-v1',
      sourceIds:['current-week-vocabulary']
    })[0];

    const artifact=compileEvidenceBoundInteractionQuestion(candidate);
    expect(artifact.status).toBe('rejected');
    expect(artifact.question).toBeNull();
  });
});
