import { describe, expect, it } from 'vitest';
import './questionQualityRuntime';
import './semanticQuestionGuardRuntime';
import { gameModel } from './gameModel';
import { scoreQuestAttempt } from './questRewardPolicy';

const RHYMES = {
  went:'sent', tell:'bell', pet:'jet', job:'rob', fog:'dog', not:'hot',
  tug:'bug', hut:'cut', tub:'rub', bun:'sun', fix:'mix', has:'jazz'
};

const VOWELS = {
  went:'e', tell:'e', pet:'e', job:'o', fog:'o', not:'o',
  tug:'u', hut:'u', tub:'u', bun:'u', fix:'i', has:'a'
};

const VOWEL_EXAMPLES = {
  a:new Set(['cat','map','jam']),
  e:new Set(['hen','red','web']),
  i:new Set(['pig','sit','fin']),
  o:new Set(['mop','log','top']),
  u:new Set(['cup','sun','mud'])
};

const byId = () => new Map(gameModel.buildQuestions().map(question => [question.id,question]));

describe('Quest reward evidence policy', () => {
  const transferQuestion = {role:'transfer',reward:12};

  it('keeps the first wrong attempt safe but modest', () => {
    expect(scoreQuestAttempt({question:transferQuestion,correct:false,wasRetry:false})).toEqual({
      coins:2,xp:6,stars:0,transferEvidence:0,districtProgress:0,masteryAwarded:false
    });
  });

  it('never lets clue-assisted success out-earn independent success or count as transfer evidence', () => {
    const assisted = scoreQuestAttempt({question:transferQuestion,correct:true,wasRetry:true,becomesMastered:true});
    const independent = scoreQuestAttempt({question:transferQuestion,correct:true,wasRetry:false,becomesMastered:false});

    expect(assisted).toEqual({
      coins:0,xp:4,stars:0,transferEvidence:0,districtProgress:1,masteryAwarded:false
    });
    expect(independent.coins).toBe(15);
    expect(independent.xp).toBe(21);
    expect(independent.transferEvidence).toBe(1);
    expect(assisted.coins + 2).toBeLessThan(independent.coins);
    expect(assisted.xp + 6).toBeLessThan(independent.xp);
  });

  it('awards mastery only on an independent eligible outcome supplied by the Quest engine', () => {
    expect(scoreQuestAttempt({
      question:{role:'practice',reward:8},
      correct:true,
      wasRetry:false,
      becomesMastered:true
    })).toEqual({
      coins:33,xp:16,stars:1,transferEvidence:0,districtProgress:1,masteryAwarded:true
    });
  });

  it('gives repeated wrong retries no extra reward', () => {
    expect(scoreQuestAttempt({question:transferQuestion,correct:false,wasRetry:true})).toEqual({
      coins:0,xp:0,stars:0,transferEvidence:0,districtProgress:0,masteryAwarded:false
    });
  });
});

describe('spelling and phonics semantic audit', () => {
  it('keeps the validated bank size and structural invariants after the family fixes', () => {
    const bank = gameModel.buildQuestions();
    expect(bank).toHaveLength(200);
    expect(new Set(bank.map(question => question.id)).size).toBe(200);
    expect(gameModel.validateQuestionBank(bank)).toEqual([]);
  });

  it('hardens all 36 letter-building spelling items so the stem no longer gives away the target word', () => {
    const questions = byId();

    for(const word of gameModel.spelling){
      for(const prefix of ['spell-vowel-','spell-first-','spell-last-']){
        const question = questions.get(prefix + word);
        expect(question, prefix + word).toBeTruthy();
        expect(question.skill).toBe('spelling');
        expect(question.role).toBe('practice');
        expect(question.masteryEligible).toBe(false);
        expect(question.difficulty).toBeGreaterThanOrEqual(2);
        expect(question.prompt).toContain('Word pattern:');
        expect(question.prompt).toContain('_____');
        expect(question.prompt).not.toContain('“' + word + '”');
        expect(question.choices).toHaveLength(3);
        expect(new Set(question.choices).size).toBe(3);
        expect(question.choices.filter(choice => choice === question.answer)).toHaveLength(1);
      }
    }
  });

  it('audits all 12 rhyme items as direct phonics practice with the correct rhyme key', () => {
    const questions = byId();

    for(const [word,rhyme] of Object.entries(RHYMES)){
      const question = questions.get('rhyme-' + word);
      expect(question).toBeTruthy();
      expect(question.skill).toBe('phonics');
      expect(question.role).toBe('practice');
      expect(question.answer).toBe(rhyme);
      expect(question.choices).toHaveLength(3);
      expect(new Set(question.choices).size).toBe(3);
      expect(question.choices.filter(choice => choice === rhyme)).toHaveLength(1);
    }
  });

  it('audits all 12 same-short-vowel items against explicit sound groups', () => {
    const questions = byId();

    for(const [word,vowel] of Object.entries(VOWELS)){
      const question = questions.get('sound-' + word);
      const sameSound = VOWEL_EXAMPLES[vowel];
      expect(question).toBeTruthy();
      expect(question.skill).toBe('phonics');
      expect(question.role).toBe('practice');
      expect(sameSound.has(question.answer)).toBe(true);
      expect(question.choices.filter(choice => sameSound.has(choice))).toEqual([question.answer]);
      expect(question.choices).toHaveLength(3);
      expect(new Set(question.choices).size).toBe(3);
    }
  });
});
