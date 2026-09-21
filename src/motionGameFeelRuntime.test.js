import { describe, expect, it } from 'vitest';
import { isPositiveFeedback, motionDurationFor } from './motionGameFeelRuntime';

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
});
