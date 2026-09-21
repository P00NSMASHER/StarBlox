import { describe, expect, it } from 'vitest';
import './questionQualityRuntime';
import './semanticQuestionGuardRuntime';
import './diagnosticQuestionGuardRuntime';
import { gameModel } from './gameModel';
import { scoreQuestAttempt } from './questRewardPolicy';

const FIXED_DATE = Date.UTC(2026,8,21);
const byId = () => new Map(gameModel.buildQuestions().map(question => [question.id,question]));

function expectSingleAnswer(question){
  expect(question.choices, question.id).toHaveLength(3);
  expect(new Set(question.choices).size, question.id).toBe(3);
  expect(question.choices.filter(choice => choice === question.answer), question.id).toHaveLength(1);
  expect(question.source, question.id).toBeTruthy();
}

describe('screenshot rebuild learning-integrity gate', () => {
  it('keeps the hardened production bank structurally and semantically valid', () => {
    const bank = gameModel.buildQuestions();
    expect(bank).toHaveLength(200);
    expect(new Set(bank.map(question => question.id)).size).toBe(200);
    bank.forEach(expectSingleAnswer);
    expect(gameModel.validateQuestionBank(bank)).toEqual([]);
  });

  it('keeps phonics, rhyme, vowel and spelling families on their audited constructs', () => {
    const questions = byId();
    for(const word of gameModel.spelling){
      const rhyme = questions.get('rhyme-' + word);
      const sound = questions.get('sound-' + word);
      const vowelListen = questions.get('vowel-listen-' + word);
      const context = questions.get('context-' + word);
      expect(rhyme.skill).toBe('phonics');
      expect(rhyme.role).toBe('practice');
      expect(sound.skill).toBe('phonics');
      expect(sound.role).toBe('practice');
      expect(vowelListen.skill).toBe('phonics');
      expect(vowelListen.role).toBe('diagnose');
      expect(vowelListen.masteryEligible).toBe(false);
      expect(vowelListen.prompt).toBe('Which pair has the same middle vowel sound?');
      expect(context.skill).toBe('spelling');
      expect(context.role).toBe('practice');
      expectSingleAnswer(rhyme);
      expectSingleAnswer(sound);
      expectSingleAnswer(vowelListen);
      expectSingleAnswer(context);

      for(const prefix of ['spell-vowel-','spell-first-','spell-last-']){
        const item = questions.get(prefix + word);
        expect(item.skill).toBe('spelling');
        expect(item.role).toBe('practice');
        expect(item.masteryEligible).toBe(false);
        expect(item.prompt).toContain('Word pattern:');
        expectSingleAnswer(item);
      }
    }
  });

  it('keeps vocabulary, reading inference/evidence and Religion Unit 1 source-bounded', () => {
    const bank = gameModel.buildQuestions();
    const questions = byId();

    const vocabTransfer = bank.filter(question => question.id.startsWith('vocab-transfer-'));
    expect(vocabTransfer).toHaveLength(8);
    vocabTransfer.forEach(question => {
      expect(question.skill).toBe('vocabulary');
      expect(question.role).toBe('transfer');
      expectSingleAnswer(question);
    });

    const inference = bank.filter(question => question.id.startsWith('story-infer-'));
    const evidence = bank.filter(question => question.id.startsWith('story-evidence-'));
    expect(inference).toHaveLength(4);
    expect(evidence).toHaveLength(4);
    inference.forEach(question => {
      expect(question.skill).toBe('inference');
      expect(question.role).toBe('transfer');
      expectSingleAnswer(question);
    });
    evidence.forEach(question => {
      expect(question.skill).toBe('text-evidence');
      expect(question.role).toBe('review');
      expectSingleAnswer(question);
    });

    const expectedReligionRoles = ['transfer','review','transfer','review','practice'];
    gameModel.religion.forEach(([,application],index) => {
      const base = questions.get('religion-' + index);
      const applied = questions.get('religion-transfer-' + index);
      expect(base.answer).toBe(application);
      expect(base.skill).toBe('religion-unit-1');
      expectSingleAnswer(base);
      expect(applied.skill).toBe('religion-application');
      expect(applied.role).toBe(expectedReligionRoles[index]);
      expectSingleAnswer(applied);
    });
  });

  it('keeps the fixed-day invited vocabulary transfer semantically defensible in the actual five-action Quest', () => {
    const quest = gameModel.pickQuest({},5,FIXED_DATE);
    const item = quest.find(question => question.id === 'vocab-transfer-invited');
    expect(item).toBeTruthy();
    expect(item.skill).toBe('vocabulary');
    expect(item.role).toBe('transfer');
    expect(item.prompt).toBe('Which new example best fits “invited”?');
    expect(item.answer).toBe('Jada gets a message asking her to join the game.');
    expect(new Set(item.choices)).toEqual(new Set([
      'Jada gets a message asking her to join the game.',
      'A child begs earnestly for one more chance.',
      'A family celebrates with traditional music and foods.'
    ]));
    expectSingleAnswer(item);
  });

  it('keeps the default Quest exactly five distinct deterministic actions', () => {
    const first = gameModel.pickQuest({},5,FIXED_DATE);
    const second = gameModel.pickQuest({},5,FIXED_DATE);
    expect(first).toHaveLength(5);
    expect(new Set(first.map(question => question.id)).size).toBe(5);
    expect(first.map(question => question.id)).toEqual(second.map(question => question.id));
    expect(first.map(question => question.choices)).toEqual(second.map(question => question.choices));
    first.forEach(expectSingleAnswer);
  });

  it('never promotes clue-assisted retries to independent mastery or transfer evidence', () => {
    const transfer = {role:'transfer',reward:12};
    expect(scoreQuestAttempt({question:transfer,correct:true,wasRetry:true,becomesMastered:true})).toEqual({
      coins:0,
      xp:4,
      stars:0,
      transferEvidence:0,
      districtProgress:1,
      masteryAwarded:false
    });
    expect(scoreQuestAttempt({question:transfer,correct:false,wasRetry:true,becomesMastered:true})).toEqual({
      coins:0,
      xp:0,
      stars:0,
      transferEvidence:0,
      districtProgress:0,
      masteryAwarded:false
    });
  });
});
