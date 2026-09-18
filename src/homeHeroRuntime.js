import { gameModel } from './gameModel';

const SAVE_KEYS = ['starblox-save-v2','abvm-brightside-floot-v2','abvm-brightside-floot-v1'];
const ROOM_ASSETS = {
  1:'/assets/home/room-tier-1.svg',
  2:'/assets/home/room-tier-2.svg',
  3:'/assets/home/room-tier-3.svg',
  4:'/assets/home/room-tier-4.svg',
  5:'/assets/home/room-tier-5.svg'
};

const CATEGORY_GROUPS = [
  {id:'outfit',label:'Outfit',collections:['tops','bottoms','shoes']},
  {id:'style',label:'Hair + Face',collections:['headwear','facegear']},
  {id:'gear',label:'Gear',collections:['backgear','handgear','auras']},
  {id:'buddy',label:'Buddy',collections:['companions']},
  {id:'room',label:'Room',collections:['beds','seating','desks','lighting','wall','rugs','decor']}
];

const TOP_PALETTES = [
  ['#7186ff','#5369df'],['#71c9ff','#5c7fec'],['#6b6bd8','#403c9a'],['#ff8fc0','#c75ad2'],
  ['#70cf93','#3ca86c'],['#6954d9','#3f2f9d'],['#ffb95f','#ee784e'],['#58cedc','#2b96b1'],
  ['#ff8a7d','#c94e7b'],['#4a52be','#e65db7'],['#b29cff','#6c63d9'],['#f2c45d','#9a70df']
];
const BOTTOM_COLORS = ['#4a5b8c','#546f9f','#3f4b74','#ba6f9b','#6d7a58','#5a4f88','#4f78a8','#7d68a0','#8b6b65','#5b577e','#9a6bad','#b18a61'];
const SHOE_COLORS = ['#ffffff','#9fd5ff','#6b6fd6','#ff9cc8','#7a604f','#65c9bd','#f2c65f','#6b83c8','#ff8f78','#6be1ff','#b49ae7','#e4bb62'];

function readSave(){
  for(const key of SAVE_KEYS){
    try{
      const raw = localStorage.getItem(key);
      if(raw) return JSON.parse(raw);
    }catch{}
  }
  return null;
}

function itemById(id){
  return id ? gameModel.store.find(item => item.id === id) : null;
}

function slotItem(save,slot){
  return itemById(save?.equipped?.[slot]);
}

function itemNumber(id){
  const value = Number(String(id || '').split('-').pop());
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function initials(name){
  return String(name || 'Star').split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase();
}

function itemThumb(item,extraClass=''){
  if(item?.image){
    return `<img class="${extraClass}" src="${item.image}" alt="" loading="lazy" />`;
  }
  return `<span class="homeThumbFallback ${extraClass}" aria-hidden="true">${initials(item?.name)}</span>`;
}

function navButton(label){
  return [...document.querySelectorAll('.navBtn')].find(button => button.textContent.trim().toLowerCase().includes(label.toLowerCase()));
}

function goTo(label){
  navButton(label)?.click();
}

function isEquipped(save,item){
  if(!item) return false;
  if(item.type === 'room') return Array.isArray(save.roomDecor) && save.roomDecor.includes(item.id);
  return Object.values(save.equipped || {}).includes(item.id);
}

function skillLabel(value){
  return String(value || '').replace(/-/g,' ').replace(/\b\w/g,char => char.toUpperCase());
}

function tierState(save,tier,currentRoom){
  if(tier.id === currentRoom.id) return 'current';
  if((save.starWorth || 0) >= tier.worth) return 'complete';
  return 'locked';
}

function learningRows(save){
  const stats = Object.entries(save.stats || {}).filter(([,stat]) => (stat?.seen || 0) > 0);
  const recent = [...stats].sort((a,b) => (b[1].lastSeen || 0) - (a[1].lastSeen || 0)).slice(0,3);
  if(recent.length){
    return recent.map(([skill,stat]) => ({
      title:skillLabel(skill),
      detail:(stat.independentCorrect || stat.correct || 0) > 0 ? 'Growing stronger in practice' : 'Getting another helpful look'
    }));
  }
  return [
    {title:'Short Vowels + Spelling',detail:'Listen closely to the middle sound'},
    {title:'Vocabulary in Context',detail:'Use weekly words in real situations'},
    {title:'Religion Unit 1',detail:'God’s gifts, Trinity, creation + grace'}
  ];
}

function dailyRows(save){
  const daily = save.daily || {};
  return [
    {label:'Finish a 5-Action Quest',value:Math.min(daily.quests || 0,1),goal:1,target:'Quest'},
    {label:'Solve 2 Transfer Challenges',value:Math.min(daily.transfers || 0,2),goal:2,target:'Quest'},
    {label:'Choose a Reward',value:Math.min(daily.purchase || 0,1),goal:1,target:'Market'}
  ];
}

export function homeFingerprint(save){
  return JSON.stringify({
    coins:save?.coins || 0,
    stars:save?.stars || 0,
    xp:save?.xp || 0,
    starWorth:save?.starWorth || 0,
    dreamGoalId:save?.dreamGoalId || '',
    owned:[...(save?.owned || [])],
    daily:save?.daily || {},
    equipped:save?.equipped || {},
    roomDecor:[...(save?.roomDecor || [])],
    companionBond:save?.companionBond || 0,
    stats:Object.entries(save?.stats || {})
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([key,value]) => [key,value?.seen,value?.lastSeen,value?.correct,value?.independentCorrect])
  });
}

function decorateAvatarNode(node,save){
  if(!node || !save) return;
  const topIndex = itemNumber(save.equipped?.top) - 1;
  const bottomIndex = itemNumber(save.equipped?.bottom) - 1;
  const shoesIndex = itemNumber(save.equipped?.shoes) - 1;
  const top = TOP_PALETTES[topIndex % TOP_PALETTES.length];
  node.style.setProperty('--equip-top-a',top[0]);
  node.style.setProperty('--equip-top-b',top[1]);
  node.style.setProperty('--equip-bottom',BOTTOM_COLORS[bottomIndex % BOTTOM_COLORS.length]);
  node.style.setProperty('--equip-shoe',SHOE_COLORS[shoesIndex % SHOE_COLORS.length]);
  node.dataset.runtimeStyled = 'true';
  node.dataset.top = save.equipped?.top || '';
  node.dataset.bottom = save.equipped?.bottom || '';
  node.dataset.shoes = save.equipped?.shoes || '';
  node.dataset.head = save.equipped?.head || '';
  node.dataset.face = save.equipped?.face || '';
  node.dataset.back = save.equipped?.back || '';
  node.dataset.hand = save.equipped?.hand || '';
  node.dataset.aura = save.equipped?.aura || '';

  const slots = [
    ['head','runtimeHead'],['face','runtimeFace'],['back','runtimeBack'],['hand','runtimeHand'],['aura','runtimeAura']
  ];
  const accessorySignature = slots.map(([slot]) => save.equipped?.[slot] || '').join('|');
  if(node.dataset.runtimeAccessories !== accessorySignature){
    node.querySelectorAll('.runtimeAccessory').forEach(el => el.remove());
    for(const [slot,className] of slots){
      if(!save.equipped?.[slot]) continue;
      const el = document.createElement('span');
      el.className = `runtimeAccessory ${className}`;
      el.setAttribute('aria-hidden','true');
      node.appendChild(el);
    }
    node.dataset.runtimeAccessories = accessorySignature;
  }
}

function decorateAllAvatars(save){
  document.querySelectorAll('.avatarWrap').forEach(node => decorateAvatarNode(node,save));
}

function findExistingItemButton(item){
  if(item.type === 'room'){
    return [...document.querySelectorAll('.roomInventory button')].find(button => button.textContent.includes(item.name));
  }
  return [...document.querySelectorAll('.closetRow button')].find(button => button.textContent.includes(item.name));
}

function equipViaExistingUi(item,statusNode){
  if(!item) return;
  if(item.type === 'room'){
    const button = findExistingItemButton(item);
    if(button){
      button.click();
      if(statusNode) statusNode.textContent = `${item.name} updated in your room.`;
    }
    return;
  }

  goTo('Avatar');
  window.setTimeout(() => {
    const button = findExistingItemButton(item);
    if(button){
      button.click();
      window.setTimeout(() => goTo('Home'),90);
    }else{
      goTo('Home');
    }
  },110);
}

function buildCustomizeTrack(root,save,groupId){
  const group = CATEGORY_GROUPS.find(value => value.id === groupId) || CATEGORY_GROUPS[0];
  const track = root.querySelector('.homeCustomizeTrack');
  const status = root.querySelector('.homeCustomizeStatus');
  if(!track) return;
  const owned = gameModel.store.filter(item => (save.owned || []).includes(item.id) && group.collections.includes(item.collectionId));
  track.innerHTML = owned.length ? owned.map(item => `
    <button class="homeCustomizeItem ${isEquipped(save,item) ? 'isEquipped' : ''}" data-item-id="${item.id}" aria-label="${item.name}${isEquipped(save,item) ? ', equipped' : ''}">
      <span class="homeCustomizeArt">${itemThumb(item)}</span>
      <span>${item.name}</span>
      <small>${isEquipped(save,item) ? (item.type === 'room' ? 'Placed' : 'Equipped') : 'Tap to use'}</small>
    </button>
  `).join('') : `<div class="homeCustomizeEmpty">Earn something from this category in Star Market and it will appear here forever.</div>`;

  track.querySelectorAll('[data-item-id]').forEach(button => {
    button.addEventListener('click',() => {
      const item = itemById(button.dataset.itemId);
      equipViaExistingUi(item,status);
    });
  });
}

function buildHome(roomPage,save){
  const room = gameModel.roomTier(save.starWorth || 0);
  const nextRoom = gameModel.roomTiers.find(tier => tier.worth > (save.starWorth || 0));
  const dreamItem = itemById(save.dreamGoalId) || gameModel.store[0];
  const dreamOwned = (save.owned || []).includes(dreamItem.id);
  const dreamPct = dreamOwned ? 100 : Math.min(100,((save.coins || 0) / Math.max(1,dreamItem.price)) * 100);
  const companion = slotItem(save,'companion') || itemById('companions-1');
  const bond = save.companionBond || 0;
  const bondStage = bond < 3 ? 'New Friend' : bond < 8 ? 'Trail Buddy' : bond < 15 ? 'Brightside Bestie' : 'Star Sidekick';
  const rows = dailyRows(save);
  const learn = learningRows(save);
  const placed = (save.roomDecor || []).map(itemById).filter(Boolean).slice(-5);

  roomPage.querySelector('.homeHeroRuntime')?.remove();
  roomPage.classList.add('homeHeroReady');
  roomPage.dataset.homeHeroFingerprint = homeFingerprint(save);

  const root = document.createElement('section');
  root.className = `homeHeroRuntime homeTier${room.id}`;
  root.style.setProperty('--home-scene',`url("${ROOM_ASSETS[room.id]}")`);
  root.innerHTML = `
    <div class="homeIllustratedScene" aria-hidden="true"></div>
    <div class="homeSceneVignette" aria-hidden="true"></div>

    <div class="homeRoomProgress glassPanel" aria-label="Room Progress">
      <div class="homePanelHeading"><span>ROOM PROGRESS</span><b>${room.name}</b></div>
      <div class="homeTierStrip">
        ${gameModel.roomTiers.map(tier => {
          const state = tierState(save,tier,room);
          return `<div class="homeTierPreview ${state}" aria-label="${tier.name}, ${state}">
            <span class="tierPreviewArt" style="background-image:url('${ROOM_ASSETS[tier.id]}')"></span>
            <span class="tierNumber">${tier.id}</span>
            <b>${tier.name.replace('Tiny ','').replace(' Bedroom','').replace('Skyline ','')}</b>
            <small>${state === 'locked' ? `🔒 ${tier.worth}` : state === 'current' ? 'CURRENT' : '✓ OPEN'}</small>
          </div>`;
        }).join('')}
      </div>
      ${nextRoom ? `<div class="homeTierMeter"><span style="width:${Math.max(0,Math.min(100,((save.starWorth-room.worth)/(nextRoom.worth-room.worth))*100))}%"></span></div><small class="homeTierNext">${Math.max(0,nextRoom.worth-(save.starWorth || 0))} Star Worth to ${nextRoom.name}</small>` : '<small class="homeTierNext">Every room tier unlocked — Star Mansion achieved!</small>'}
    </div>

    <div class="homeHeroZone">
      <div class="homeHeroGlow" aria-hidden="true"></div>
      <div class="homeAvatarMount"></div>
      <div class="homeBuddyScene">
        <img src="${companion?.image || '/assets/catalog/companions-1.svg'}" alt="${companion?.name || 'Sprout Pup'}" />
        <div class="homeBuddyBubble"><b>${companion?.name || 'Sprout Pup'}</b><small>${bondStage} · Buddy Bond ${bond}</small></div>
      </div>
      <div class="homeMotivation"><strong>Every smart move makes your world brighter.</strong><span>${bond < 8 ? 'Keep learning together — your Buddy Bond grows when you finish Quests.' : `${companion?.name || 'Your buddy'} loves how far you’ve come!`}</span></div>
    </div>

    <aside class="homeDreamGoal glassPanel">
      <div class="homePanelHeading"><span>YOUR DREAM GOAL</span><b>${dreamItem.name}</b></div>
      <div class="homeDreamArt">${dreamItem.image ? itemThumb(dreamItem,'dreamItemImage') : '<img class="dreamItemImage" src="/assets/home/dream-goal.svg" alt="" />'}</div>
      <p>${dreamOwned ? 'You earned this forever. Pick another favorite in Star Market whenever you want.' : 'Finish focused learning actions, save Coins, then choose your reward on purpose.'}</p>
      <div class="homeDreamProgress"><span style="width:${dreamPct}%"></span></div>
      <div class="homeDreamNumbers"><b>${dreamOwned ? 'OWNED!' : `${save.coins || 0} / ${dreamItem.price} Coins`}</b><small>${dreamOwned ? 'Dream complete' : `${Math.max(0,dreamItem.price-(save.coins || 0))} to go`}</small></div>
      <button class="homeCta homeKeepLearning">${dreamOwned ? 'Choose Next Dream' : 'Keep Learning'}</button>
    </aside>

    <section class="homeDailyQuests glassPanel">
      <div class="homePanelHeading"><span>DAILY QUESTS</span><b>Little wins, real progress</b></div>
      <div class="homeDailyRows">
        ${rows.map((row,index) => `<div class="homeDailyRow ${row.value >= row.goal ? 'done' : ''}">
          <span class="dailyCheck">${row.value >= row.goal ? '✓' : index + 1}</span>
          <div><b>${row.label}</b><small>${row.value}/${row.goal}</small></div>
          <button data-go="${row.target}">${row.value >= row.goal ? 'Done' : 'Go'}</button>
        </div>`).join('')}
      </div>
    </section>

    <section class="homeCustomize glassPanel">
      <div class="homePanelHeading"><span>CUSTOMIZE ME</span><b>Everything you earn is yours forever</b></div>
      <div class="homeCustomizeTabs">
        ${CATEGORY_GROUPS.map((group,index) => `<button class="${index === 0 ? 'active' : ''}" data-category="${group.id}">${group.label}</button>`).join('')}
      </div>
      <div class="homeCustomizeTrack"></div>
      <small class="homeCustomizeStatus" aria-live="polite">Tap an owned item to use it.</small>
    </section>

    <section class="homeLearning glassPanel">
      <div class="homePanelHeading"><span>TODAY I’M LEARNING</span><b>School power for Brightside</b></div>
      <div class="homeLearningRows">
        ${learn.map((row,index) => `<div><span>${index+1}</span><p><b>${row.title}</b><small>${row.detail}</small></p></div>`).join('')}
      </div>
      <button class="homeSecondary homeStudyButton">Open Study Lab</button>
    </section>

    <div class="homeEarnedObjects" aria-label="Placed room favorites">
      ${placed.map(item => `<div class="homeEarnedObject" title="${item.name}">${itemThumb(item)}<small>${item.name}</small></div>`).join('')}
    </div>
  `;

  roomPage.appendChild(root);

  const sourceAvatar = roomPage.querySelector('.roomAvatar .avatarWrap');
  if(sourceAvatar){
    const clone = sourceAvatar.cloneNode(true);
    clone.classList.add('homeHeroAvatar');
    decorateAvatarNode(clone,save);
    root.querySelector('.homeAvatarMount')?.appendChild(clone);
  }

  root.querySelector('.homeKeepLearning')?.addEventListener('click',() => goTo(dreamOwned ? 'Market' : 'Quest'));
  root.querySelector('.homeStudyButton')?.addEventListener('click',() => goTo('Study'));
  root.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click',() => goTo(button.dataset.go)));
  root.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click',() => {
      root.querySelectorAll('[data-category]').forEach(tab => tab.classList.toggle('active',tab === button));
      buildCustomizeTrack(root,readSave() || save,button.dataset.category);
    });
  });
  buildCustomizeTrack(root,save,'outfit');
}

function enhanceAvatarPage(page,save){
  page.classList.add('avatarHeroEnhanced');
  const showcase = page.querySelector('.avatarShowcase');
  if(!showcase) return;
  const fingerprint = JSON.stringify({equipped:save.equipped,companionBond:save.companionBond});
  if(showcase.dataset.heroFingerprint === fingerprint) return;
  showcase.dataset.heroFingerprint = fingerprint;
  showcase.querySelector('.avatarEquipmentReadout')?.remove();
  const companion = slotItem(save,'companion') || itemById('companions-1');
  const names = [
    slotItem(save,'top'),slotItem(save,'bottom'),slotItem(save,'shoes'),slotItem(save,'head'),slotItem(save,'face'),slotItem(save,'back'),slotItem(save,'hand'),slotItem(save,'aura')
  ].filter(Boolean).slice(0,5);
  const readout = document.createElement('div');
  readout.className = 'avatarEquipmentReadout';
  readout.innerHTML = `<span>CURRENT LOOK</span><div>${names.map(item => `<b>${item.name}</b>`).join('') || '<b>Starter Style</b>'}</div><small>${companion?.name || 'Sprout Pup'} · Buddy Bond ${save.companionBond || 0}</small>`;
  showcase.appendChild(readout);
}

let queued = false;
function enhance(){
  queued = false;
  const save = readSave();
  if(!save) return;
  decorateAllAvatars(save);

  const roomPage = document.querySelector('.roomPage');
  if(roomPage){
    const fp = homeFingerprint(save);
    if(roomPage.dataset.homeHeroFingerprint !== fp) buildHome(roomPage,save);
  }

  const avatarPage = document.querySelector('.avatarPage');
  if(avatarPage) enhanceAvatarPage(avatarPage,save);
}

function scheduleEnhance(){
  if(queued) return;
  queued = true;
  window.requestAnimationFrame(enhance);
}

if(typeof document !== 'undefined'){
  const start = () => {
    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('click',() => window.setTimeout(scheduleEnhance,20),true);
    window.addEventListener('storage',scheduleEnhance);
    scheduleEnhance();
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}
