let queued = false;

function setAttrIfChanged(node,name,value){
  if(!node) return false;
  const next=String(value);
  if(node.getAttribute(name) === next) return false;
  node.setAttribute(name,next);
  return true;
}

function removeAttrIfPresent(node,name){
  if(!node?.hasAttribute?.(name)) return false;
  node.removeAttribute(name);
  return true;
}

function addClassIfMissing(node,className){
  if(!node?.classList || node.classList.contains(className)) return false;
  node.classList.add(className);
  return true;
}

export function parseXpProgress(value){
  const match = String(value || '').match(/(\d+)\s*\/\s*(\d+)\s*XP/i);
  if(!match) return null;
  return {value:Number(match[1]),max:Number(match[2])};
}

export function storeCardAccessibleLabel(card){
  if(!card) return '';
  const name = card.querySelector('.itemCopy h3, h3, b')?.textContent?.trim() || 'Store item';
  const state = card.querySelector('.sbStoreStateBadge')?.textContent?.trim();
  const price = card.querySelector('.price, .sbStorePrice')?.textContent?.replace(/\s+/g,' ')?.trim();
  return [name,state,price].filter(Boolean).join('. ');
}

export function revealStoreFocusTarget(target){
  if(!target?.closest) return false;
  const row = target.closest('.sbStoreCategoryRow,.sbStoreTierRow');
  if(!row || !row.contains(target)) return false;
  const targetRect = target.getBoundingClientRect?.();
  const rowRect = row.getBoundingClientRect?.();
  if(!targetRect || !rowRect) return false;

  // Keyboard users must not land on a filter that is visually clipped inside
  // the intentionally horizontal category/tier trays. Use the intersection of
  // the tray and the viewport because a wide scroll container can itself extend
  // past a 320px viewport. Adjust only horizontal tray position; never move the
  // page vertically or change selection/state.
  const edgePadding = 8;
  const viewportWidth = Number(globalThis?.innerWidth) || rowRect.right;
  const visibleLeft = Math.max(rowRect.left,0) + edgePadding;
  const visibleRight = Math.min(rowRect.right,viewportWidth) - edgePadding;
  const clippedLeft = targetRect.left < visibleLeft;
  const clippedRight = targetRect.right > visibleRight;
  if(!clippedLeft && !clippedRight) return true;

  let nextLeft = Number(row.scrollLeft || 0);
  const targetOffsetLeft = Number(target.offsetLeft || 0);
  const snappedNarrowCategory = viewportWidth <= 360 && row.classList?.contains('sbStoreCategoryRow') && targetOffsetLeft > 0;

  if(snappedNarrowCategory){
    // At 320px, the category tray's scroll-snap can undo a tiny accessibility
    // correction and leave the next category partly clipped. Align that focused
    // category to its own snap point. Wider layouts keep the minimal-delta path
    // so keyboard focus is not moved beneath the desktop/tablet side rail.
    nextLeft = targetOffsetLeft - edgePadding;
  }else if(clippedLeft){
    nextLeft += targetRect.left - visibleLeft;
  }else if(clippedRight){
    nextLeft += targetRect.right - visibleRight;
  }

  nextLeft = Math.max(0,nextLeft);
  if(typeof row.scrollTo === 'function') row.scrollTo({left:nextLeft,behavior:'auto'});
  else row.scrollLeft = nextLeft;
  return true;
}

function decorateHud(root){
  const stats = root.querySelector('.hudStats');
  stats?.setAttribute('aria-label','Player progress');

  root.querySelectorAll('.hud .currency').forEach(node => {
    const label = node.textContent.replace(/\s+/g,' ').trim();
    if(label) node.setAttribute('aria-label',label);
  });

  const levelBox = root.querySelector('.hud .levelBox');
  const progress = levelBox?.querySelector('.progress');
  const parsed = parseXpProgress(levelBox?.querySelector('small')?.textContent);
  if(levelBox) levelBox.setAttribute('aria-label',parsed ? `Level progress, ${parsed.value} of ${parsed.max} XP` : 'Level progress');
  if(progress && parsed){
    progress.setAttribute('role','progressbar');
    progress.setAttribute('aria-label','Experience progress');
    progress.setAttribute('aria-valuemin','0');
    progress.setAttribute('aria-valuemax',String(parsed.max));
    progress.setAttribute('aria-valuenow',String(parsed.value));
  }

  const mastery = root.querySelector('.hud .mastery');
  if(mastery){
    const count = mastery.querySelector('b')?.textContent?.trim();
    mastery.setAttribute('aria-label',count ? `${count} skills mastered` : 'Mastery progress');
  }

  root.querySelector('.sidebar')?.setAttribute('aria-label','Primary navigation');
}

function decorateStore(root){
  const page = root.querySelector('.marketPage.sbStoreMatch');
  if(!page) return;

  const grid = page.querySelector('.storeGrid');
  if(grid){
    setAttrIfChanged(grid,'role','group');
    setAttrIfChanged(grid,'aria-label','Store items');
  }

  page.querySelectorAll('.storeCard').forEach(card => {
    setAttrIfChanged(card,'role','button');
    if(!card.hasAttribute('tabindex')) card.tabIndex = 0;
    const selected = card.classList.contains('sbStoreSelected') || card.getAttribute('aria-selected') === 'true';
    setAttrIfChanged(card,'aria-pressed',String(selected));
    removeAttrIfPresent(card,'aria-selected');
    const label = storeCardAccessibleLabel(card);
    if(label) setAttrIfChanged(card,'aria-label',label);
  });

  // App.jsx already replaces a failed Store thumbnail with readable initials.
  // Mark that existing fallback with the Store visual contract class so the
  // canonical card and right-rail fallback paths are treated consistently.
  // This changes no ownership/economy state and keeps the card's accessible
  // name on the surrounding focusable card rather than duplicating speech.
  page.querySelectorAll('.storeCard .itemArtFallback').forEach(fallback => {
    addClassIfMissing(fallback,'sbStoreFallbackArt');
    setAttrIfChanged(fallback,'aria-hidden','true');
    const art=fallback.closest('.itemArt');
    if(art) setAttrIfChanged(art,'data-image-fallback','true');
  });

  // Catalog thumbnails are square. Explicit intrinsic dimensions reserve space
  // before lazy-loaded SVGs decode, reducing layout movement without changing art.
  page.querySelectorAll('.storeCard .itemArt img,.sbStorePreviewArt img').forEach(image => {
    if(!image.hasAttribute('width')) image.setAttribute('width','512');
    if(!image.hasAttribute('height')) image.setAttribute('height','512');
    if(!image.hasAttribute('decoding')) image.setAttribute('decoding','async');
  });

  const categoryRow = page.querySelector('.sbStoreCategoryRow');
  if(categoryRow){
    setAttrIfChanged(categoryRow,'role','group');
    setAttrIfChanged(categoryRow,'aria-label','Store categories');
    categoryRow.querySelectorAll('button').forEach(button => {
      setAttrIfChanged(button,'aria-pressed',String(button.classList.contains('selectedFilter')));
    });
  }

  const tierRow = page.querySelector('.sbStoreTierRow');
  if(tierRow){
    setAttrIfChanged(tierRow,'role','group');
    setAttrIfChanged(tierRow,'aria-label','Store tiers');
    tierRow.querySelectorAll('button').forEach(button => {
      setAttrIfChanged(button,'aria-pressed',String(button.classList.contains('selectedFilter')));
    });
  }

  const rightRail=page.querySelector('.sbStoreRightRail');
  if(rightRail) setAttrIfChanged(rightRail,'aria-label','Selected item preview and actions');
  page.querySelectorAll('.sbStoreDetailActions button').forEach(button => {
    if(button.type !== 'button') button.type = 'button';
  });
}

function decorateQuest(root){
  const page = root.querySelector('.questPage');
  if(!page) return;

  page.querySelectorAll('.readAloud,.questReadAloud').forEach(button => {
    button.type = 'button';
    button.setAttribute('aria-label','Read this question aloud');
  });

  const phaseStrip = page.querySelector('.questPhaseStrip');
  if(phaseStrip){
    phaseStrip.setAttribute('role','list');
    phaseStrip.querySelectorAll('.questPhase').forEach(phase => phase.setAttribute('role','listitem'));
  }

  page.querySelectorAll('.questAnswerStack .answerButton,.answers .answerButton').forEach((button,index) => {
    button.type = 'button';
    const letter = button.dataset.choice || String.fromCharCode(65 + index);
    const text = button.textContent.replace(/\s+/g,' ').trim();
    if(text) button.setAttribute('aria-label',`Answer ${letter}: ${text}`);
  });

  page.querySelector('.questEvidenceRail')?.setAttribute('aria-label','Quest mastery and learning summary');
  const feedback = page.querySelector('.feedback');
  if(feedback){
    feedback.setAttribute('role','status');
    feedback.setAttribute('aria-live','polite');
    feedback.setAttribute('aria-atomic','true');
  }
}

function decorateHome(root){
  const page = root.querySelector('.homeHeroRuntime');
  if(!page) return;

  const roomStrip = page.querySelector('.homeTierStrip');
  roomStrip?.setAttribute('aria-label','Room progress tiers');

  const dailyRows = page.querySelector('.homeDailyRows');
  dailyRows?.setAttribute('aria-label','Daily quests');

  const tabs = page.querySelector('.homeCustomizeTabs');
  if(tabs){
    tabs.setAttribute('role','group');
    tabs.setAttribute('aria-label','Customize categories');
    tabs.querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed',String(button.classList.contains('active')));
    });
  }

  page.querySelector('.homeCustomizeTrack')?.setAttribute('aria-label','Owned customization items');
}

function decorateRoomAndStudy(root){
  root.querySelector('.inventoryStrip')?.setAttribute('aria-label','Owned room items');
  root.querySelector('.decorShelf')?.setAttribute('aria-label','Placed room items');
  root.querySelector('.backupActions')?.setAttribute('aria-label','Progress backup actions');
}

export function applyMobileAccessibility(root = document){
  decorateHud(root);
  decorateStore(root);
  decorateQuest(root);
  decorateHome(root);
  decorateRoomAndStudy(root);
  return true;
}

function scan(){
  queued = false;
  if(typeof document === 'undefined') return;
  applyMobileAccessibility(document);
}

function scheduleScan(){
  if(queued) return;
  queued = true;
  queueMicrotask(scan);
}

function isKeyboardVisibleFocus(target){
  if(!target || typeof target.matches !== 'function') return true;
  try{return target.matches(':focus-visible');}
  catch{return true;}
}

function handleFocusIn(event){
  const target = event?.target;
  // Pointer/touch clicks also move focus. Scrolling the snap tray during the
  // pointer sequence can move a button between press and release and select the
  // neighboring category. Only reconcile horizontal focus for keyboard-visible
  // focus; pointer users retain normal click/touch scrolling behavior.
  if(!isKeyboardVisibleFocus(target)) return;
  revealStoreFocusTarget(target);
  // Chromium can apply its native horizontal keyboard-focus scroll after
  // focusin, microtasks, and even the first animation frame on a 320px tray.
  // Recheck through the first frame and once more just after it.
  queueMicrotask(() => revealStoreFocusTarget(target));
  if(typeof requestAnimationFrame === 'function'){
    requestAnimationFrame(() => revealStoreFocusTarget(target));
  }
  if(typeof setTimeout === 'function'){
    setTimeout(() => revealStoreFocusTarget(target),12);
  }
}

if(typeof document !== 'undefined'){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',scheduleScan,{once:true});
  else scheduleScan();

  document.addEventListener('focusin',handleFocusIn);
  const host = document.getElementById('root') || document.documentElement;
  new MutationObserver(scheduleScan).observe(host,{
    subtree:true,
    childList:true,
    characterData:true,
    attributes:true,
    attributeFilter:['class']
  });
}
