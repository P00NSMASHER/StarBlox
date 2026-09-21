const RAPID_PURCHASE_GUARD_MS = 1200;
const RAPID_ROOM_TOGGLE_GUARD_MS = 650;
const RAPID_QUEST_ANSWER_GUARD_MS = 300;

export function shouldBlockRapidPurchase(lastAt, now, guardMs = RAPID_PURCHASE_GUARD_MS){
  return Number.isFinite(lastAt) && Number.isFinite(now) && now >= lastAt && (now - lastAt) < guardMs;
}

function actionDescriptor(target){
  const primary = target?.closest?.('.storeActions .primaryButton');
  if(primary){
    const label = primary.textContent?.trim();
    const card = primary.closest('.storeCard');
    const itemKey = card?.dataset?.storeItemId || card?.querySelector?.('.itemCopy h3')?.textContent?.trim() || 'unknown-item';
    if(label === 'Buy Forever') return {key:`purchase:${itemKey}`,guardMs:RAPID_PURCHASE_GUARD_MS};
    if(label === 'Place' || label === 'Put Away') return {key:`room:${itemKey}`,guardMs:RAPID_ROOM_TOGGLE_GUARD_MS};
  }

  const roomButton = target?.closest?.('.roomInventory .inventoryStrip button, .decorShelf button');
  if(roomButton){
    const itemKey = roomButton.querySelector?.('b')?.textContent?.trim() || roomButton.textContent?.trim() || 'room-item';
    return {key:`room:${itemKey}`,guardMs:RAPID_ROOM_TOGGLE_GUARD_MS};
  }

  const answerButton = target?.closest?.('.answerButton');
  if(answerButton) return {key:'quest-answer',guardMs:RAPID_QUEST_ANSWER_GUARD_MS};

  return null;
}

export function installPurchaseGuard(doc = globalThis.document, now = () => globalThis.performance?.now?.() ?? Date.now()){
  if(!doc?.addEventListener) return () => {};

  // Use stable action keys instead of DOM-node identity so a React rerender
  // cannot reopen the duplicate-action window with a newly created button.
  const lastActionAt = new Map();

  const onClickCapture = (event) => {
    const descriptor = actionDescriptor(event.target);
    if(!descriptor) return;

    const current = Number(now());
    const last = lastActionAt.get(descriptor.key);
    if(shouldBlockRapidPurchase(last,current,descriptor.guardMs)){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return;
    }

    lastActionAt.set(descriptor.key,current);
  };

  doc.addEventListener('click',onClickCapture,true);
  return () => doc.removeEventListener('click',onClickCapture,true);
}

if(typeof document !== 'undefined') installPurchaseGuard();

export {
  RAPID_PURCHASE_GUARD_MS,
  RAPID_ROOM_TOGGLE_GUARD_MS,
  RAPID_QUEST_ANSWER_GUARD_MS
};
