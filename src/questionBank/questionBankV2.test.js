import { describe,expect,it } from 'vitest';
import { createQuestionAttempt } from '../domainSchemas.js';
import { gameModel } from '../gameModel.js';
import {
  addQuestionToBank,
  appendAttemptHistory,
  assignQuestionsFromBank,
  createAttemptLedger,
  createQuestionBankSnapshot,
  getQuestionRef,
  getQuestionVersion,
  importLegacyQuestionBank,
  refreshAssignmentVersions,
  resetAssignment,
  reviseQuestion,
  setQuestionLifecycle,
  summarizeQuestionAttempts,
  updateQuestionMetadata,
  validateQuestionBankV2
} from './questionBankV2.js';

function bank(){
  return importLegacyQuestionBank(gameModel.buildQuestions());
}

describe('StarBlox Question Bank V2', () => {
  it('imports all 200 existing production questions as published immutable v1 records', () => {
    const value=bank();
    const snapshot=createQuestionBankSnapshot(value);

    expect(validateQuestionBankV2(value)).toEqual({ok:true,errors:[]});
    expect(Object.keys(value.questions)).toHaveLength(200);
    expect(snapshot.questionCount).toBe(200);
    expect(new Set(snapshot.refs.map(ref => ref.questionId)).size).toBe(200);
    expect(snapshot.refs.every(ref => ref.version === 1)).toBe(true);
    expect(snapshot.refs.every(ref => /^fnv1a32:[a-f0-9]{8}$/.test(ref.contentHash))).toBe(true);
  });

  it('adds new questions as non-production drafts until explicitly published', () => {
    const original=bank();
    const source=gameModel.buildQuestions()[0];
    const draftQuestion={...source,id:'future-ai-draft'};
    const withDraft=addQuestionToBank(original,draftQuestion,{
      lifecycle:'draft',
      tags:['generated'],
      conceptIds:['future-concept']
    });

    expect(withDraft.questions['future-ai-draft'].lifecycle).toBe('draft');
    expect(withDraft.questions['future-ai-draft'].currentVersion).toBe(1);
    expect(createQuestionBankSnapshot(withDraft).questionCount).toBe(200);

    const published=setQuestionLifecycle(withDraft,'future-ai-draft','published');
    expect(createQuestionBankSnapshot(published).questionCount).toBe(201);
  });

  it('detects tampering with any stored historical version', () => {
    const original=bank();
    const tampered=JSON.parse(JSON.stringify(original));
    tampered.questions['vocab-transfer-invited'].versions['1'].prompt += ' tampered';

    const validation=validateQuestionBankV2(tampered);
    expect(validation.ok).toBe(false);
    expect(validation.errors.some(error => /content hash mismatch/.test(error))).toBe(true);
  });

  it('creates immutable content revisions while retaining the exact prior version', () => {
    const original=bank();
    const id='vocab-transfer-invited';
    const before=getQuestionVersion(original,id,1);
    const revised=reviseQuestion(original,id,{
      hint:before.hint + ' Look for the invitation clue.'
    });
    const afterV1=getQuestionVersion(revised,id,1);
    const afterV2=getQuestionVersion(revised,id,2);

    expect(afterV1).toEqual(before);
    expect(afterV2.contentVersion).toBe(2);
    expect(afterV2.contentHash).not.toBe(before.contentHash);
    expect(revised.questions[id].currentVersion).toBe(2);
    expect(revised.revision).toBe(original.revision + 1);
    expect(original.questions[id].currentVersion).toBe(1);
  });

  it('does not create a content version for lifecycle/tag/policy changes', () => {
    const original=bank();
    const id='vocab-transfer-invited';
    const metadata=updateQuestionMetadata(original,id,{
      tags:['weekly','vocabulary'],
      conceptIds:['vocabulary','invited'],
      policy:{gradingMethod:'highest',maxAttempts:2}
    });
    const archived=setQuestionLifecycle(metadata,id,'archived');

    expect(metadata.questions[id].currentVersion).toBe(1);
    expect(archived.questions[id].currentVersion).toBe(1);
    expect(archived.questions[id].lifecycle).toBe('archived');
    expect(archived.questions[id].policy.gradingMethod).toBe('highest');

    const snapshot=createQuestionBankSnapshot(archived);
    expect(snapshot.refs.some(ref => ref.questionId === id)).toBe(false);
  });

  it('rejects fake revisions that do not actually change question content', () => {
    const value=bank();
    const current=getQuestionVersion(value,'vocab-transfer-invited');

    expect(() => reviseQuestion(value,'vocab-transfer-invited',{
      prompt:current.prompt
    })).toThrow(/did not change content/);
  });

  it('preserves existing per-player assignments while the eligible questions remain valid', () => {
    const value=bank();
    const first=assignQuestionsFromBank(value,{
      playerId:'player-a',
      count:5,
      seed:1234
    });
    const second=assignQuestionsFromBank(value,{
      playerId:'player-a',
      count:5,
      seed:9999,
      previous:first.assignment
    });

    expect(second.assignment.refs).toEqual(first.assignment.refs);
    expect(second.events).toEqual({invalid:[],overlimit:[],added:[]});
  });

  it('drops archived assignments and deterministically fills the missing slot', () => {
    const original=bank();
    const first=assignQuestionsFromBank(original,{
      playerId:'player-a',
      count:5,
      seed:22
    });
    const archivedId=first.assignment.refs[2].questionId;
    const changed=setQuestionLifecycle(original,archivedId,'archived');

    const next=assignQuestionsFromBank(changed,{
      playerId:'player-a',
      count:5,
      seed:22,
      previous:first.assignment
    });

    expect(next.assignment.refs).toHaveLength(5);
    expect(next.assignment.refs.some(ref => ref.questionId === archivedId)).toBe(false);
    expect(next.events.invalid).toContainEqual(first.assignment.refs[2]);
    expect(next.events.added).toHaveLength(1);
  });

  it('pins an assignment to the original version until an explicit version refresh', () => {
    const original=bank();
    const first=assignQuestionsFromBank(original,{
      playerId:'player-pin',
      count:200,
      seed:7
    });
    const id='vocab-transfer-invited';
    const oldRef=first.assignment.refs.find(ref => ref.questionId === id);
    const changed=reviseQuestion(original,id,{
      explanation:getQuestionVersion(original,id).explanation + ' This is revision two.'
    });

    const preserved=assignQuestionsFromBank(changed,{
      playerId:'player-pin',
      count:200,
      seed:7,
      previous:first.assignment
    });
    expect(preserved.assignment.refs.find(ref => ref.questionId === id)).toEqual(oldRef);

    const refreshed=refreshAssignmentVersions(changed,preserved.assignment);
    const newRef=refreshed.assignment.refs.find(ref => ref.questionId === id);
    expect(newRef.version).toBe(2);
    expect(newRef.contentHash).toBe(getQuestionRef(changed,id).contentHash);
    expect(refreshed.refreshed).toHaveLength(1);
  });

  it('supports explicit reset semantics without silently reshuffling assignments', () => {
    const value=bank();
    const first=assignQuestionsFromBank(value,{
      playerId:'player-reset',
      count:5
    });

    expect(() => resetAssignment(first.assignment)).toThrow(/not allowed/);

    const reset=resetAssignment(first.assignment,{allowReset:true});
    const reassigned=assignQuestionsFromBank(value,{
      playerId:'player-reset',
      count:5,
      previous:reset
    });

    expect(reset.generation).toBe(1);
    expect(reassigned.assignment.refs).toHaveLength(5);
    expect(reassigned.assignment.assignmentHash).not.toBe(first.assignment.assignmentHash);
  });

  it('records exact-version attempt history and supports Open-edX-style grading summaries', () => {
    const value=bank();
    const ref=getQuestionRef(value,'vocab-transfer-invited');

    const makeAttempt=(attemptId,selectedAnswer,answeredAt) => createQuestionAttempt({
      attemptId,
      playerId:'player-ledger',
      questionId:ref.questionId,
      questionVersion:ref.version,
      questionHash:ref.contentHash,
      selectedAnswer,
      startedAt:answeredAt - 1000,
      answeredAt
    });

    let ledger=createAttemptLedger({playerId:'player-ledger'});
    ledger=appendAttemptHistory(ledger,{
      attempt:makeAttempt('a1','wrong',2000),
      correct:false,
      score:0
    });
    ledger=appendAttemptHistory(ledger,{
      attempt:makeAttempt('a2','correct',4000),
      correct:true,
      score:1
    });

    expect(summarizeQuestionAttempts(ledger,ref.questionId,{gradingMethod:'first'}).score).toBe(0);
    expect(summarizeQuestionAttempts(ledger,ref.questionId,{gradingMethod:'latest'}).score).toBe(1);
    expect(summarizeQuestionAttempts(ledger,ref.questionId,{gradingMethod:'highest'}).score).toBe(1);
    expect(summarizeQuestionAttempts(ledger,ref.questionId,{gradingMethod:'average'}).score).toBe(0.5);
  });

  it('produces stable published snapshots whose hash changes only when published refs change', () => {
    const original=bank();
    const first=createQuestionBankSnapshot(original);

    const metadata=updateQuestionMetadata(original,'vocab-transfer-invited',{
      tags:['metadata-only']
    });
    const second=createQuestionBankSnapshot(metadata);
    expect(second.hash).toBe(first.hash);

    const revised=reviseQuestion(metadata,'vocab-transfer-invited',{
      hint:getQuestionVersion(metadata,'vocab-transfer-invited').hint + ' Revised.'
    });
    const third=createQuestionBankSnapshot(revised);
    expect(third.hash).not.toBe(first.hash);
  });
});
