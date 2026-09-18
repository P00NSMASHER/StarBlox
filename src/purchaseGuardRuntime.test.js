import { describe, expect, it } from 'vitest';
import { RAPID_PURCHASE_GUARD_MS, shouldBlockRapidPurchase } from './purchaseGuardRuntime';

describe('rapid market purchase guard', () => {
  it('blocks a repeated purchase click inside the guard window', () => {
    expect(shouldBlockRapidPurchase(1000,1000 + RAPID_PURCHASE_GUARD_MS - 1)).toBe(true);
  });

  it('allows the first click and clicks after the guard window', () => {
    expect(shouldBlockRapidPurchase(undefined,1000)).toBe(false);
    expect(shouldBlockRapidPurchase(1000,1000 + RAPID_PURCHASE_GUARD_MS)).toBe(false);
  });
});
