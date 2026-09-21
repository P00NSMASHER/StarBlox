import { gameModel } from './gameModel';

const CATEGORY_ICONS = Object.freeze({
  all:'grid',tops:'shirt',bottoms:'pants',shoes:'shoe',headwear:'hat',facegear:'glasses',
  backgear:'bag',handgear:'wand',auras:'spark',companions:'paw',beds:'bed',seating:'chair',
  desks:'desk',lighting:'lamp',wall:'frame',rugs:'rug',decor:'decor'
});

const COLLECTION_GROUPS = Object.freeze([
  {title:'Everyday Style',subtitle:'Build a look you can keep forever.',ids:['tops','bottoms','shoes']},
  {title:'Sparkle Gear',subtitle:'Add personality without random rewards.',ids:['headwear','facegear','auras']},
  {title:'Buddy Besties',subtitle:'Choose a permanent companion for your adventures.',ids:['companions']},
  {title:'Dream Room',subtitle:'Grow your room one earned piece at a time.',ids:['beds','desks','lighting','decor']}
]);

let selectedItemId = '';
let queued = false;

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function categorySvg(kind){
  const shapes = {
    grid:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    shirt:'<path d="M8 4 12 7 16 4l4 3-3 4v9H7v-9L4 7l4-3Z"/>',
    pants:'<path d="M8 4h8l1 16h-5l-1-8-1 8H5L8 4Z"/>',
    shoe:'<path d="M5 13c4 0 5-4 6-7 2 3 3 6 8 7 1 0 2 2 1 4H5c-2 0-2-4 0-4Z"/>',
    hat:'<path d="M6 12c0-5 3-8 6-8s6 3 6 8H6Z"/><path d="M3 13h18v4H3z"/>',
    glasses:'<circle cx="7" cy="12" r="4"/><circle cx="17" cy="12" r="4"/><path d="M11 12h2M3 10l2 1M21 10l-2 1"/>',
    bag:'<rect x="5" y="7" width="14" height="13" rx="4"/><path d="M9 7V5c0-2 6-2 6 0v2M9 12h6"/>',
    wand:'<path d="m6 19 10-10M16 4l1.4 3.2L21 8.5l-3.6 1.2L16 13l-1.4-3.3L11 8.5l3.6-1.3L16 4Z"/>',
    spark:'<path d="m12 3 2 6 6 2-6 2-2 7-2-7-6-2 6-2 2-6Z"/>',
    paw:'<circle cx="12" cy="15" r="4"/><circle cx="6" cy="10" r="2"/><circle cx="10" cy="7" r="2"/><circle cx="14" cy="7" r="2"/><circle cx="18" cy="10" r="2"/>',
    bed:'<path d="M4 12h16v7H4zM6 8h7c2 0 3 1 3 4H6V8ZM4 7v13M20 12v8"/>',
    chair:'<path d="M7 5h10v8H7zM5 13h14v4H5zM7 17v4M17 17v4"/>',
    desk:'<path d="M4 11h16v4H4zM6 15v6M18 15v6M9 5h6v6H9z"/>',
    lamp:'<path d="M8 10h8l-2-6h-4l-2 6ZM12 10v7M8 20h8M10 17h4"/>',
    frame:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="m7 16 4-4 3 3 3-4 2 5"/>',
    rug:'<rect x="4" y="7" width="16" height="10" rx="4"/><path d="M7 7v10M17 7v10"/>',
    decor:'<path d="M12 20v-8M12 13c-4 0-6-3-6-6 4 0 6 2 6 6ZM12 13c4 0 6-3 6-6-4 0-6 2-6 6ZM8 20h8"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${shapes[kind] || shapes.grid}</svg>`;
}

function currentCurrency(){
  const counters = [...document.querySelectorAll('.currency')];
  const coin = counters.find(node => /coins/i.test(node.textContent || ''));
  const star = counters.find(node => /stars/i.test(node.textContent || ''));
  return {
    coins:Number((coin?.querySelector('strong')?.textContent || '0').replace(/[^0-9]/g,'')) || 0,
    stars:Number((star?.querySelector('strong')?.textContent || '0').replace(/[^0-9]/g,'')) || 0
  };
}

function resolveCardItem(card){
  const name = card.querySelector('.itemCopy h3')?.textContent?.trim();
  return gameModel.store.find(item => item.name === name) || null;
}

function primaryAction(card){
  return card.querySelector('.storeActions .primaryButton');
}

function dreamAction(card){
  return card.querySelector('.storeActions .secondaryButton');
}

function markCardState(card,item,currency){
  if(!item) return;
  const primary = primaryAction(card);
  const label = (primary?.textContent || '').trim();
  const owned = !/buy forever/i.test(label);
  const equipped = /equipped|put away/i.test(label);
  const locked = !owned && item.starReq > currency.stars;
  const isDream = card.classList.contains('dreamCard');

  card.dataset.storeItemId = item.id;
  card.classList.toggle('sbStoreOwned',owned);
  card.classList.toggle('sbStoreEquipped',equipped);
  card.classList.toggle('sbStoreLocked',locked);
  card.classList.toggle('sbStoreSelected',selectedItemId === item.id);
  card.setAttribute('aria-selected',selectedItemId === item.id ? 'true' : 'false');
  card.tabIndex = 0;

  let badge = card.querySelector('.sbStoreStateBadge');
  if(!badge){
    badge = document.createElement('span');
    badge.className = 'sbStoreStateBadge';
    card.appendChild(badge);
  }
  const status = equipped ? 'Equipped' : owned ? 'Owned' : locked ? `Needs ${item.starReq} Stars` : isDream ? 'Dream Goal' : 'Available';
  if(badge.textContent !== status) badge.textContent = status;
  badge.dataset.state = equipped ? 'equipped' : owned ? 'owned' : locked ? 'locked' : isDream ? 'dream' : 'available';

  if(!card.dataset.sbStoreSelectBound){
    card.dataset.sbStoreSelectBound = 'true';
    card.addEventListener('click',event => {
      if(event.target.closest('button')) return;
      selectItem(item.id);
    });
    card.addEventListener('keydown',event => {
      if((event.key === 'Enter' || event.key === ' ') && !event.target.closest('button')){
        event.preventDefault();
        selectItem(item.id);
      }
    });
  }
}

function decorateCategoryTabs(page){
  const rows = page.querySelectorAll(':scope > .filterRow');
  const categoryRow = rows[0];
  if(!categoryRow) return;
  categoryRow.classList.add('sbStoreCategoryRow');
  categoryRow.setAttribute('aria-label','Store categories');
  [...categoryRow.querySelectorAll('button')].forEach((button,index) => {
    if(button.querySelector('.sbStoreTabIcon')) return;
    const raw = button.textContent.trim();
    const collection = index === 0 ? null : gameModel.collections.find(([,name]) => name === raw);
    const id = collection?.[0] || 'all';
    button.dataset.collectionId = id;
    const icon = document.createElement('span');
    icon.className = 'sbStoreTabIcon';
    icon.innerHTML = categorySvg(CATEGORY_ICONS[id] || 'grid');
    button.prepend(icon);
  });
}

function decorateTierRow(page){
  const rows = page.querySelectorAll(':scope > .filterRow');
  const tierRow = rows[1];
  if(!tierRow) return;
  tierRow.classList.add('sbStoreTierRow');
  tierRow.setAttribute('aria-label','Store tier filters');
  [...tierRow.querySelectorAll('button')].forEach((button,index) => {
    button.dataset.tier = String(index);
    if(button.querySelector('.sbStoreTierDot')) return;
    const dot = document.createElement('span');
    dot.className = `sbStoreTierDot tier-${index}`;
    dot.setAttribute('aria-hidden','true');
    button.prepend(dot);
  });
}

function decorateHero(page,currency){
  const hero = page.querySelector('.marketHero');
  if(!hero) return;
  const kicker = hero.querySelector('.kicker');
  const title = hero.querySelector('h1');
  const copy = hero.querySelector('p');
  if(kicker) kicker.textContent = 'STAR MARKET · STORE';
  if(title) title.textContent = 'Pick Your Next Favorite';
  if(copy) copy.textContent = 'Earn Coins by learning. Everything you choose stays yours forever.';
  let banner = hero.querySelector('.sbStoreEncouragement');
  if(!banner){
    banner = document.createElement('div');
    banner.className = 'sbStoreEncouragement';
    hero.querySelector('div')?.appendChild(banner);
  }
  const message = `You have ${currency.coins} Coins · browse, preview, and choose when you’re ready.`;
  if(banner.textContent !== message) banner.textContent = message;
}

function ensureRightRail(page){
  let rail = page.querySelector('.sbStoreRightRail');
  if(rail) return rail;
  rail = document.createElement('aside');
  rail.className = 'sbStoreRightRail';
  rail.setAttribute('aria-label','Selected store item preview');
  rail.innerHTML = `
    <section class="sbStoreAvatarStage">
      <div class="sbStoreStageTitle"><span>TRY IT ON</span><small>Preview before you choose</small></div>
      <div class="avatarWrap sbStoreAvatar" aria-hidden="true">
        <div class="avatarHairBack"></div>
        <div class="avatarHead"><div class="avatarHairTop"></div><span class="eye leftEye"></span><span class="eye rightEye"></span><span class="smile"></span></div>
        <div class="avatarBody"><span>★</span></div><div class="avatarArm leftArm"></div><div class="avatarArm rightArm"></div>
        <div class="avatarLeg leftLeg"></div><div class="avatarLeg rightLeg"></div><div class="avatarShoe leftShoe"></div><div class="avatarShoe rightShoe"></div>
      </div>
      <div class="sbStorePreviewArt"></div>
      <div class="sbStorePreviewLabel"></div>
    </section>
    <section class="sbStoreSelectedDetail" aria-live="polite"></section>`;
  page.appendChild(rail);
  return rail;
}

function artMarkup(item){
  if(item.image){
    return `<img src="${escapeHtml(item.image)}" alt="" loading="lazy">`;
  }
  const initials = item.name.split(' ').slice(0,2).map(part => part[0]).join('');
  return `<span class="sbStoreFallbackArt" aria-hidden="true"><b>${escapeHtml(initials)}</b><small>${escapeHtml(item.collectionName)}</small></span>`;
}

function updateRightRail(page,currency){
  const rail = ensureRightRail(page);
  const card = page.querySelector(`.storeCard[data-store-item-id="${CSS.escape(selectedItemId)}"]`) || page.querySelector('.storeCard');
  const item = card ? resolveCardItem(card) : null;
  if(!item) return;
  selectedItemId = item.id;

  const primary = primaryAction(card);
  const primaryLabel = (primary?.textContent || '').trim();
  const owned = !/buy forever/i.test(primaryLabel);
  const equipped = /equipped|put away/i.test(primaryLabel);
  const locked = !owned && item.starReq > currency.stars;
  const detail = rail.querySelector('.sbStoreSelectedDetail');
  const preview = rail.querySelector('.sbStorePreviewArt');
  const previewLabel = rail.querySelector('.sbStorePreviewLabel');
  const actionLabel = item.type === 'room' ? (owned ? 'Place / Put Away' : 'Preview in Room') : item.type === 'companion' ? (owned ? 'Choose Buddy' : 'Preview Buddy') : (owned ? (equipped ? 'Already Equipped' : 'Try On') : 'Try On');
  const signature = [item.id,primaryLabel,currency.coins,currency.stars,card.className].join('|');
  if(detail.dataset.signature === signature) return;
  detail.dataset.signature = signature;

  preview.innerHTML = artMarkup(item);
  preview.dataset.tier = String(item.tier);
  previewLabel.textContent = `Previewing ${item.name}`;

  detail.innerHTML = `
    <div class="sbStoreDetailHead"><span>SELECTED ITEM</span><b>${escapeHtml(item.name)}</b></div>
    <div class="sbStoreMeta"><span>${escapeHtml(item.collectionName)}</span><span>Tier ${item.tier} · ${escapeHtml(item.theme)}</span></div>
    <div class="sbStorePrice"><strong>${item.price}</strong><span>Coins</span>${item.starReq ? `<small>${item.starReq} Mastery Stars required</small>` : '<small>Starter tier · no Star requirement</small>'}</div>
    <p class="sbStorePermanent">Permanent reward · once purchased, it stays in your collection.</p>
    <div class="sbStoreDetailActions">
      <button type="button" class="sbStoreBuy">${owned ? 'Owned Forever' : locked ? `Unlock at ${item.starReq} Stars` : `Buy Forever · ${item.price}`}</button>
      <button type="button" class="sbStoreTry">${escapeHtml(actionLabel)}</button>
      <button type="button" class="sbStoreDream">${card.classList.contains('dreamCard') ? '★ Dream Goal Set' : 'Set as Dream Goal'}</button>
    </div>`;

  const buy = detail.querySelector('.sbStoreBuy');
  const tryButton = detail.querySelector('.sbStoreTry');
  const dream = detail.querySelector('.sbStoreDream');
  if(owned){
    buy.disabled = true;
    buy.setAttribute('aria-disabled','true');
  }
  buy.addEventListener('click',() => primary?.click());
  tryButton.addEventListener('click',() => {
    rail.querySelector('.sbStoreAvatarStage')?.classList.add('isPreviewing');
    window.setTimeout(() => rail.querySelector('.sbStoreAvatarStage')?.classList.remove('isPreviewing'),700);
    if(owned && !equipped) primary?.click();
  });
  dream.addEventListener('click',() => dreamAction(card)?.click());
}

function representativeItem(ids,index){
  const candidates = gameModel.store.filter(item => ids.includes(item.collectionId));
  return candidates.find(item => item.image && item.tier === Math.min(5,index + 1)) || candidates.find(item => item.image) || candidates[index % Math.max(1,candidates.length)];
}

function ensureCollections(page){
  let strip = page.querySelector('.sbStoreCollections');
  if(strip) return strip;
  strip = document.createElement('section');
  strip.className = 'sbStoreCollections';
  strip.setAttribute('aria-label','Permanent store collections');
  strip.innerHTML = `<div class="sbStoreCollectionsHeading"><div><span>COLLECTIONS</span><b>Build a style that grows with you</b></div><small>No timers · no random boxes · no disappearing rewards</small></div>`;
  const cards = document.createElement('div');
  cards.className = 'sbStoreCollectionCards';
  COLLECTION_GROUPS.forEach((group,groupIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sbStoreCollectionCard';
    button.dataset.targetCollection = group.ids[0];
    const previews = [0,1,2].map((_,index) => representativeItem(group.ids,(groupIndex + index) % 5)).filter(Boolean);
    button.innerHTML = `
      <span class="sbStoreCollectionArt">${previews.map(item => `<i>${artMarkup(item)}</i>`).join('')}</span>
      <span class="sbStoreCollectionCopy"><b>${escapeHtml(group.title)}</b><small>${escapeHtml(group.subtitle)}</small><em>Explore collection →</em></span>`;
    button.addEventListener('click',() => {
      const filter = page.querySelector(`.sbStoreCategoryRow button[data-collection-id="${group.ids[0]}"]`);
      filter?.click();
      page.querySelector('.storeGrid')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'});
    });
    cards.appendChild(button);
  });
  strip.appendChild(cards);

  const value = document.createElement('aside');
  value.className = 'sbStoreValueCard';
  value.innerHTML = `<span>LEARN → EARN → CHOOSE</span><b>Your rewards are yours.</b><p>Practice earns Coins. You decide what matters to you. Nothing expires, and mistakes never take rewards away.</p>`;
  strip.appendChild(value);
  page.appendChild(strip);
  return strip;
}

function selectItem(id){
  selectedItemId = id;
  const page = document.querySelector('.marketPage');
  if(!page) return;
  const currency = currentCurrency();
  [...page.querySelectorAll('.storeCard')].forEach(card => markCardState(card,resolveCardItem(card),currency));
  updateRightRail(page,currency);
}

export function decorateStoreScreenshotMatch(page){
  if(!page) return false;
  const currency = currentCurrency();
  page.classList.add('sbStoreMatch');
  page.dataset.screenshotMatchStore = 'v1';
  decorateHero(page,currency);
  decorateCategoryTabs(page);
  decorateTierRow(page);
  const cards = [...page.querySelectorAll('.storeCard')];
  if(!cards.length) return false;
  if(!selectedItemId || !cards.some(card => resolveCardItem(card)?.id === selectedItemId)){
    selectedItemId = resolveCardItem(cards[0])?.id || '';
  }
  cards.forEach(card => markCardState(card,resolveCardItem(card),currency));
  ensureRightRail(page);
  updateRightRail(page,currency);
  ensureCollections(page);
  return true;
}

function scan(){
  queued = false;
  document.querySelectorAll('.marketPage').forEach(page => decorateStoreScreenshotMatch(page));
}

function scheduleScan(){
  if(queued) return;
  queued = true;
  queueMicrotask(scan);
}

if(typeof document !== 'undefined'){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',scheduleScan,{once:true});
  else scheduleScan();
  const host = document.getElementById('root') || document.documentElement;
  new MutationObserver(scheduleScan).observe(host,{subtree:true,childList:true});
}
