// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  RAPID_PURCHASE_GUARD_MS,
  RAPID_QUEST_ANSWER_GUARD_MS,
  RAPID_ROOM_TOGGLE_GUARD_MS,
  installPurchaseGuard,
  shouldBlockRapidPurchase
} from './purchaseGuardRuntime';

describe('rapid persistence/economy action guard', () => {
  it('blocks a repeated purchase click inside the guard window', () => {
    expect(shouldBlockRapidPurchase(1000,1000 + RAPID_PURCHASE_GUARD_MS - 1)).toBe(true);
  });

  it('allows the first click and clicks after the guard window', () => {
    expect(shouldBlockRapidPurchase(undefined,1000)).toBe(false);
    expect(shouldBlockRapidPurchase(1000,1000 + RAPID_PURCHASE_GUARD_MS)).toBe(false);
  });

  it('prevents a second rapid Buy Forever event from reaching the purchase handler', () => {
    const doc = document.implementation.createHTMLDocument('purchase guard');
    doc.body.innerHTML = '<article class="storeCard" data-store-item-id="beds-2"><div class="itemCopy"><h3>Cloud Bed</h3><div class="storeActions"><button class="primaryButton">Buy Forever</button></div></div></article>';
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

  it('keeps the purchase guard closed across a React-style button replacement', () => {
    const doc = document.implementation.createHTMLDocument('replacement guard');
    doc.body.innerHTML = '<article class="storeCard" data-store-item-id="beds-2"><div class="itemCopy"><h3>Cloud Bed</h3><div class="storeActions"><button class="primaryButton">Buy Forever</button></div></div></article>';
    let purchases = 0;
    let tick = 2000;
    const uninstall = installPurchaseGuard(doc,() => tick++);
    const first = doc.querySelector('button');
    first.addEventListener('click',() => { purchases += 1; });
    first.click();

    const actions = doc.querySelector('.storeActions');
    actions.innerHTML = '<button class="primaryButton">Buy Forever</button>';
    const replacement = actions.querySelector('button');
    replacement.addEventListener('click',() => { purchases += 1; });
    replacement.click();

    expect(purchases).toBe(1);
    uninstall();
  });

  it('blocks rapid room place/put-away toggles so a double tap cannot undo itself', () => {
    const doc = document.implementation.createHTMLDocument('room toggle guard');
    doc.body.innerHTML = '<div class="roomInventory"><div class="inventoryStrip"><button><b>Cloud Bed</b><small>Tap to place</small></button></div></div>';
    let toggles = 0;
    let tick = 3000;
    const uninstall = installPurchaseGuard(doc,() => tick++);
    const first = doc.querySelector('button');
    first.addEventListener('click',() => { toggles += 1; });
    first.click();

    const strip = doc.querySelector('.inventoryStrip');
    strip.innerHTML = '<button><b>Cloud Bed</b><small>Placed</small></button>';
    const replacement = strip.querySelector('button');
    replacement.addEventListener('click',() => { toggles += 1; });
    replacement.click();

    expect(toggles).toBe(1);
    expect(shouldBlockRapidPurchase(3000,3000 + RAPID_ROOM_TOGGLE_GUARD_MS - 1,RAPID_ROOM_TOGGLE_GUARD_MS)).toBe(true);
    uninstall();
  });

  it('blocks a double-tap across different Quest answer buttons before React can disable them', () => {
    const doc = document.implementation.createHTMLDocument('quest answer guard');
    doc.body.innerHTML = '<div class="answerGrid"><button class="answerButton">A</button><button class="answerButton">B</button></div>';
    let answers = 0;
    let tick = 4000;
    const uninstall = installPurchaseGuard(doc,() => tick++);
    const [first,second] = doc.querySelectorAll('.answerButton');
    first.addEventListener('click',() => { answers += 1; });
    second.addEventListener('click',() => { answers += 1; });

    first.click();
    second.click();

    expect(answers).toBe(1);
    expect(shouldBlockRapidPurchase(4000,4000 + RAPID_QUEST_ANSWER_GUARD_MS - 1,RAPID_QUEST_ANSWER_GUARD_MS)).toBe(true);
    uninstall();
  });
});
