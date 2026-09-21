let queued = false;

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
  let nextLeft = Number(row.scrollLeft || 0);
  if(targetRect.left < visibleLeft){
    nextLeft += targetRect.left - visibleLeft;
  }else if(targetRect.right > visibleRight){
    nextLeft += targetRect.right - visibleRight;
  }else{
    return true;
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
    grid.setAttribute('role','group');
    grid.setAttribute('aria-label','Store items');
  }

  page.querySelectorAll('.storeCard').forEach(card => {
    card.setAttribute('role','button');
    if(!card.hasAttribute('tabindex')) card.tabIndex = 0;
    const selected = card.classList.contains('sbStoreSelected') || card.getAttribute('aria-selected') === 'true';
    card.setAttribute('aria-pressed',String(selected));
    card.removeAttribute('aria-selected');
    const label = storeCardAccessibleLabel(card);
    if(label) card.setAttribute('aria-label',label);
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
    categoryRow.setAttribute('role','group');
    categoryRow.setAttribute('aria-label','Store categories');
    categoryRow.querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed',String(button.classList.contains('selectedFilter')));
    });
  }

  const tierRow = page.querySelector('.sbStoreTierRow');
  if(tierRow){
    tierRow.setAttribute('role','group');
    tierRow.setAttribute('aria-label','Store tiers');
    tierRow.querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed',String(button.classList.contains('selectedFilter')));
    });
  }

  page.querySelector('.sbStoreRightRail')?.setAttribute('aria-label','Selected item preview and actions');
  page.querySelectorAll('.sbStoreDetailActions button').forEach(button => {
    button.type = 'button';
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

function handleFocusIn(event){
  const target = event?.target;
  revealStoreFocusTarget(target);
  // Chromium can finish its own focus scrolling after focusin dispatch. Recheck
  // once in a microtask so the final visible position, not an intermediate one,
  // satisfies the keyboard contract.
  queueMicrotask(() => revealStoreFocusTarget(target));
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
