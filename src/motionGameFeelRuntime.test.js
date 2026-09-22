import { describe, expect, it } from 'vitest';
import { isPositiveFeedback, motionDurationFor, shouldScheduleMotionScan } from './motionGameFeelRuntime';

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

  it('recognizes positive answer feedback without celebrating negative feedback', () => {
    expect(isPositiveFeedback('Correct! Nice work.')).toBe(true);
    expect(isPositiveFeedback('You got it — great job!')).toBe(true);
    expect(isPositiveFeedback('Try again. That answer is not correct.')).toBe(false);
    expect(isPositiveFeedback('Wrong answer, but keep learning.')).toBe(false);
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
