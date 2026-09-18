const RAPID_PURCHASE_GUARD_MS = 1200;

export function shouldBlockRapidPurchase(lastAt, now, guardMs = RAPID_PURCHASE_GUARD_MS){
  return Number.isFinite(lastAt) && Number.isFinite(now) && now >= lastAt && (now - lastAt) < guardMs;
}

export function installPurchaseGuard(doc = globalThis.document, now = () => globalThis.performance?.now?.() ?? Date.now()){
  if(!doc?.addEventListener) return () => {};

  const lastPurchaseClick = new WeakMap();

  const onClickCapture = (event) => {
    const button = event.target?.closest?.('.storeActions .primaryButton');
    if(!button || button.textContent?.trim() !== 'Buy Forever') return;

    const current = Number(now());
    const last = lastPurchaseClick.get(button);
    if(shouldBlockRapidPurchase(last,current)){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return;
    }

    lastPurchaseClick.set(button,current);
  };

  doc.addEventListener('click',onClickCapture,true);
  return () => doc.removeEventListener('click',onClickCapture,true);
}

if(typeof document !== 'undefined') installPurchaseGuard();

export { RAPID_PURCHASE_GUARD_MS };
