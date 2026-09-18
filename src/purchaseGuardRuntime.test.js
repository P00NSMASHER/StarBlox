import { describe, expect, it } from 'vitest';
import { RAPID_PURCHASE_GUARD_MS, installPurchaseGuard, shouldBlockRapidPurchase } from './purchaseGuardRuntime';

describe('rapid market purchase guard', () => {
  it('blocks a repeated purchase click inside the guard window', () => {
    expect(shouldBlockRapidPurchase(1000,1000 + RAPID_PURCHASE_GUARD_MS - 1)).toBe(true);
  });

  it('allows the first click and clicks after the guard window', () => {
    expect(shouldBlockRapidPurchase(undefined,1000)).toBe(false);
    expect(shouldBlockRapidPurchase(1000,1000 + RAPID_PURCHASE_GUARD_MS)).toBe(false);
  });

  it('prevents a second rapid Buy Forever event from reaching the purchase handler', () => {
    const doc = document.implementation.createHTMLDocument('purchase guard');
    doc.body.innerHTML = '<div class="storeActions"><button class="primaryButton">Buy Forever</button></div>';
    const button = doc.querySelector('button');
    let purchases = 0;
    let tick = 1000;
    const uninstall = installPurchaseGuard(doc,() => tick++);
    button.addEventListener('click',() => { purchases += 1; });

    button.click();
    button.click();

    expect(purchases).toBe(1);
    uninstall();
  });
});
