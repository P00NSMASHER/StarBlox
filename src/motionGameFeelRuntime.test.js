// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  celebrateFeedback,
  isPositiveFeedback,
  isSemanticCorrectFeedback,
  motionDurationFor,
  shouldScheduleMotionScan
} from './motionGameFeelRuntime';

describe('motion game-feel helpers', () => {
  it('keeps learning celebration bounded under two seconds', () => {
    expect(motionDurationFor('correct')).toBeGreaterThanOrEqual(500);
    expect(motionDurationFor('correct')).toBeLessThanOrEqual(2000);
    expect(motionDurationFor('equip')).toBeLessThanOrEqual(2000);
    expect(motionDurationFor('roomReveal')).toBeLessThanOrEqual(2000);
  });

  it('returns zero-duration custom motion when reduced motion is requested', () => {
    expect(motionDurationFor('correct', true)).toBe(0);
    expect(motionDurationFor('selection', true)).toBe(0);
  });

  it('does not leave pressed motion state on controls when reduced motion is requested', () => {
    const previousMatchMedia = window.matchMedia;
    try {
      window.matchMedia = () => ({ matches: true });
      const button = document.createElement('button');
      button.className = 'primaryButton';
      document.body.appendChild(button);
      button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      expect(button.classList.contains('sbMotionPressed')).toBe(false);
      button.remove();
    } finally {
      window.matchMedia = previousMatchMedia;
    }
  });

  it('recognizes positive answer feedback without celebrating negative feedback', () => {
    expect(isPositiveFeedback('Correct! Nice work.')).toBe(true);
    expect(isPositiveFeedback('You got it — great job!')).toBe(true);
    expect(isPositiveFeedback('Try again. That answer is not correct.')).toBe(false);
    expect(isPositiveFeedback('Wrong answer, but keep learning.')).toBe(false);
  });

  it('requires Quest semantic success state before celebration', () => {
    const correct = document.createElement('div');
    correct.className = 'feedback good';
    correct.textContent = 'A neutral explanation with no success keywords.';
    expect(isSemanticCorrectFeedback(correct)).toBe(true);

    const wrong = document.createElement('div');
    wrong.className = 'feedback learn';
    wrong.textContent = 'Great job noticing the clue.';
    expect(isSemanticCorrectFeedback(wrong)).toBe(false);

    const textOnly = document.createElement('div');
    textOnly.className = 'feedback';
    textOnly.textContent = 'Correct! Nice work.';
    expect(isSemanticCorrectFeedback(textOnly)).toBe(false);
  });

  it('clears stale Quest success treatment when semantic feedback becomes wrong or clue', () => {
    const previousMatchMedia = window.matchMedia;
    try {
      window.matchMedia = () => ({ matches: true });
      const question = document.createElement('section');
      question.className = 'questionCard';
      const answer = document.createElement('button');
      answer.className = 'answerButton correctChoice';
      const feedback = document.createElement('div');
      feedback.className = 'feedback good';
      feedback.textContent = 'Correct.';
      question.append(answer,feedback);
      document.body.appendChild(question);

      celebrateFeedback(feedback);
      expect(question.classList.contains('sbMotionCorrect')).toBe(true);
      expect(feedback.classList.contains('sbMotionStaticCue')).toBe(true);

      feedback.className = 'feedback learn';
      feedback.textContent = 'Try again with the clue.';
      celebrateFeedback(feedback);
      expect(question.classList.contains('sbMotionCorrect')).toBe(false);
      expect(feedback.classList.contains('sbMotionStaticCue')).toBe(false);
      question.remove();
    } finally {
      window.matchMedia = previousMatchMedia;
    }
  });

  it('ignores observer wakeups caused only by its own motion classes', () => {
    const target = document.createElement('article');
    target.className = 'storeCard sbMotionSelection';
    expect(shouldScheduleMotionScan([{
      type: 'attributes',
      attributeName: 'class',
      oldValue: 'storeCard',
      target
    }])).toBe(false);

    target.className = 'storeCard';
    expect(shouldScheduleMotionScan([{
      type: 'attributes',
      attributeName: 'class',
      oldValue: 'storeCard sbMotionPressed',
      target
    }])).toBe(false);
  });

  it('still wakes for Store semantic state, aria state, and structural mutations', () => {
    const target = document.createElement('article');
    target.className = 'storeCard sbStoreEquipped';
    expect(shouldScheduleMotionScan([{
      type: 'attributes',
      attributeName: 'class',
      oldValue: 'storeCard',
      target
    }])).toBe(true);

    expect(shouldScheduleMotionScan([{
      type: 'attributes',
      attributeName: 'aria-pressed',
      oldValue: 'false',
      target
    }])).toBe(true);

    expect(shouldScheduleMotionScan([{
      type: 'childList',
      target
    }])).toBe(true);
  });
});
