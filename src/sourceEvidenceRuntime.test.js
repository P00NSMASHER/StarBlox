import { describe, expect, it } from 'vitest';
import {
  adaptEdGameClawCourseStructure,
  validateInteractionCandidate
} from './edGameClawShadowAdapter.js';
import { currentLearningSourceSnapshots } from './currentLearningSourceSnapshots.js';
import {
  bindInteractionCandidateEvidence,
  collectSnapshotTextFragments,
  validateEvidenceBoundInteractionCandidate
} from './sourceEvidenceRuntime.js';

function candidateFor(text){
  return adaptEdGameClawCourseStructure({
    course:{id:'vocab-proof',title:'Vocabulary proof'},
    chunks:[{
      id:'culture',
      title:'Culture',
      content:'A short generated explanation of culture.',
      mechanic:'multiple_choice',
      evidenceSpans:[{
        sourceId:'current-week-vocabulary',
        text
      }]
    }]
  },{
    contentVersion:'evidence-test-v1',
    sourceIds:['current-week-vocabulary']
  })[0];
}

describe('source evidence binding',()=>{
  it('flattens canonical source snapshots into deterministic text fragments',()=>{
    const snapshots=currentLearningSourceSnapshots();
    const fragments=collectSnapshotTextFragments(
      snapshots['current-week-vocabulary'].payload
    );
    expect(fragments.some(row=>
      row.text.includes('traditions, foods, music, stories')
    )).toBe(true);
  });

  it('binds a verbatim EdGameClaw evidence span to a canonical snapshot path',()=>{
    const candidate=candidateFor(
      'traditions, foods, music, stories, and ways of life shared by a group'
    );
    expect(validateInteractionCandidate(candidate)).toEqual([]);

    const result=bindInteractionCandidateEvidence(
      candidate,
      currentLearningSourceSnapshots()
    );
    expect(result.issues).toEqual([]);
    expect(result.candidate.status).toBe('evidence-bound-shadow-candidate');
    expect(result.candidate.evidenceBindings).toHaveLength(1);
    expect(result.candidate.evidenceBindings[0].sourceId)
      .toBe('current-week-vocabulary');
    expect(result.candidate.evidenceBindings[0].snapshotPath).toBeTruthy();
    expect(result.candidate.evidenceBindings[0].evidenceFingerprint)
      .toMatch(/^fnv1a32:/);
    expect(validateEvidenceBoundInteractionCandidate(result.candidate))
      .toEqual([]);
  });

  it('rejects an unsupported/hallucinated evidence span',()=>{
    const candidate=candidateFor(
      'Culture is measured by the number of stars in a galaxy.'
    );
    const result=bindInteractionCandidateEvidence(
      candidate,
      currentLearningSourceSnapshots()
    );
    expect(result.candidate.status).toBe('shadow-candidate');
    expect(result.issues.map(issue=>issue.type))
      .toContain('unsupported-evidence-span');
    expect(validateEvidenceBoundInteractionCandidate(result.candidate))
      .toContain('not-evidence-bound');
  });

  it('rejects evidence from a source the candidate did not declare',()=>{
    const candidate=candidateFor(
      'traditions, foods, music, stories, and ways of life shared by a group'
    );
    candidate.evidenceSpans=[{
      sourceId:'starblox-practice-passages',
      text:'Maya noticed a new student sitting alone at lunch.'
    }];
    const result=bindInteractionCandidateEvidence(
      candidate,
      currentLearningSourceSnapshots()
    );
    expect(result.issues.map(issue=>issue.type))
      .toContain('evidence-source-not-declared-on-candidate');
  });
});
