import { gameModel } from './gameModel';

const SAVE_KEYS = ['starblox-save-v2','abvm-brightside-floot-v2','abvm-brightside-floot-v1'];
const GROUPS = Object.freeze([
  {id:'outfit',collections:['tops','bottoms','shoes']},
  {id:'style',collections:['headwear','facegear']},
  {id:'gear',collections:['backgear','handgear','auras']},
  {id:'buddy',collections:['companions']},
  {id:'room',collections:['beds','seating','desks','lighting','wall','rugs','decor']}
]);

function readSave(){
  for(const key of SAVE_KEYS){
    try{
      const raw = localStorage.getItem(key);
      if(raw) return JSON.parse(raw);
    }catch{}
  }
  return null;
}

function clamp(value,min=0,max=100){
  return Math.max(min,Math.min(max,Number(value) || 0));
}

function skillLabel(id){
  return String(id || '').replace(/-/g,' ').replace(/\b\w/g,char => char.toUpperCase());
}

function itemById(id){
  return id ? gameModel.store.find(item => item.id === id) : null;
}

function dailyModel(save){
  const daily = save?.daily || {};
  return [
    {
      id:'quest',
      label:'Finish a 5-Action Quest',
      value:Math.min(Number(daily.quests) || 0,1),
      goal:1,
      benefit:'Quest finish adds +30 Coins and +30 XP'
    },
    {
      id:'transfer',
      label:'Solve 2 Transfer Challenges',
      value:Math.min(Number(daily.transfers) || 0,2),
      goal:2,
      benefit:'Builds independent transfer evidence'
    },
    {
      id:'reward',
      label:'Choose a Reward',
      value:Math.min(Number(daily.purchase) || 0,1),
      goal:1,
      benefit:'Anything you buy stays owned forever'
    }
  ];
}

function nextMasteryModel(save){
  const mastered = new Set(Array.isArray(save?.mastered) ? save.mastered : []);
  const candidates = Object.entries(save?.stats || {})
    .filter(([skill,stat]) => !mastered.has(skill) && (stat?.seen || 0) > 0)
    .map(([skill,stat]) => ({
      skill,
      label:skillLabel(skill),
      masteryCorrect:Math.min(4,Number(stat?.masteryCorrect) || 0),
      independentCorrect:Number(stat?.independentCorrect) || 0,
      lastSeen:Number(stat?.lastSeen) || 0
    }))
    .sort((a,b) => b.masteryCorrect - a.masteryCorrect || b.independentCorrect - a.independentCorrect || b.lastSeen - a.lastSeen);

  return candidates[0] || null;
}

function recentLearningModel(save){
  const mastered = new Set(Array.isArray(save?.mastered) ? save.mastered : []);
  return Object.entries(save?.stats || {})
    .filter(([,stat]) => (stat?.seen || 0) > 0)
    .sort((a,b) => (Number(b[1]?.lastSeen) || 0) - (Number(a[1]?.lastSeen) || 0))
    .slice(0,3)
    .map(([skill,stat]) => ({
      skill,
      label:skillLabel(skill),
      mastered:mastered.has(skill),
      masteryCorrect:Math.min(4,Number(stat?.masteryCorrect) || 0),
      independentCorrect:Number(stat?.independentCorrect) || 0
    }));
}

export function deriveProgressionModel(save = {}){
  const starWorth = Math.max(0,Number(save.starWorth) || 0);
  const room = gameModel.roomTier(starWorth);
  const nextRoom = gameModel.roomTiers.find(tier => tier.worth > starWorth) || null;
  const mansion = gameModel.roomTiers[gameModel.roomTiers.length - 1];
  const roomBandStart = room.worth;
  const roomBandEnd = nextRoom?.worth ?? mansion.worth;
  const roomBandPct = nextRoom
    ? clamp((starWorth - roomBandStart) / Math.max(1,roomBandEnd - roomBandStart) * 100)
    : 100;
  const mansionPct = clamp(starWorth / Math.max(1,mansion.worth) * 100);

  const dreamItem = itemById(save.dreamGoalId) || gameModel.store[0];
  const owned = Array.isArray(save.owned) ? save.owned : [];
  const dreamOwned = owned.includes(dreamItem.id);
  const coins = Math.max(0,Number(save.coins) || 0);
  const dreamPct = dreamOwned ? 100 : clamp(coins / Math.max(1,dreamItem.price) * 100);

  const daily = dailyModel(save);
  const dailyDone = daily.filter(row => row.value >= row.goal).length;
  const groups = GROUPS.map(group => ({
    id:group.id,
    owned:gameModel.store.filter(item => group.collections.includes(item.collectionId) && owned.includes(item.id)).length,
    total:gameModel.store.filter(item => group.collections.includes(item.collectionId)).length
  }));

  return {
    room:{
      id:room.id,
      name:room.name,
      starWorth,
      nextName:nextRoom?.name || 'Star Mansion',
      toNext:nextRoom ? Math.max(0,nextRoom.worth - starWorth) : 0,
      roomBandPct,
      mansionPct,
      tiers:gameModel.roomTiers.map(tier => ({...tier,state:tier.id === room.id ? 'current' : starWorth >= tier.worth ? 'open' : 'locked'}))
    },
    dream:{
      id:dreamItem.id,
      name:dreamItem.name,
      price:dreamItem.price,
      coins,
      toGo:dreamOwned ? 0 : Math.max(0,dreamItem.price - coins),
      owned:dreamOwned,
      pct:dreamPct
    },
    daily,
    dailyDone,
    mastery:{
      stars:Math.max(0,Number(save.stars) || 0),
      masteredCount:Array.isArray(save.mastered) ? save.mastered.length : 0,
      next:nextMasteryModel(save)
    },
    recentLearning:recentLearningModel(save),
    collection:{
      ownedCount:owned.length,
      totalCount:gameModel.store.length,
      pct:clamp(owned.length / Math.max(1,gameModel.store.length) * 100),
      groups
    }
  };
}

function modelFingerprint(model){
  return JSON.stringify({
    starWorth:model.room.starWorth,
    room:model.room.id,
    dream:model.dream.id,
    coins:model.dream.coins,
    dreamOwned:model.dream.owned,
    daily:model.daily.map(row => row.value),
    stars:model.mastery.stars,
    mastered:model.mastery.masteredCount,
    nextMastery:model.mastery.next ? [model.mastery.next.skill,model.mastery.next.masteryCorrect] : null,
    owned:model.collection.ownedCount,
    recent:model.recentLearning.map(row => [row.skill,row.masteryCorrect,row.mastered])
  });
}

function ensureGoalHorizons(root,model){
  const panel = root.querySelector('.homeRoomProgress');
  if(!panel) return;
  let strip = panel.querySelector('.homeGoalHorizons');
  if(!strip){
    strip = document.createElement('div');
    strip.className = 'homeGoalHorizons';
    const heading = panel.querySelector('.homePanelHeading');
    heading?.insertAdjacentElement('afterend',strip);
  }

  const nowCopy = model.dailyDone === model.daily.length
    ? 'Daily goals complete'
    : `${model.dailyDone}/${model.daily.length} daily goals`;
  const nextCopy = model.dream.owned
    ? `${model.dream.name} owned`
    : `${model.dream.toGo} Coins to ${model.dream.name}`;
  const longCopy = model.room.id >= 5
    ? 'Star Mansion unlocked'
    : `${model.room.toNext} Star Worth to ${model.room.nextName}`;

  strip.innerHTML = `
    <div><span>NOW</span><b>${nowCopy}</b></div>
    <div><span>NEXT DREAM</span><b>${nextCopy}</b></div>
    <div><span>BIG DREAM</span><b>${longCopy}</b></div>`;
}

function decorateRoomProgress(root,model){
  const panel = root.querySelector('.homeRoomProgress');
  if(!panel) return;

  const previews = [...panel.querySelectorAll('.homeTierPreview')];
  model.room.tiers.forEach((tier,index) => {
    const preview = previews[index];
    if(!preview) return;
    preview.dataset.progressionState = tier.state;
    const name = preview.querySelector(':scope > b');
    if(name) name.textContent = tier.name;
    const status = preview.querySelector(':scope > small');
    if(status){
      status.textContent = tier.state === 'locked'
        ? `${tier.worth} Star Worth`
        : tier.state === 'current'
          ? 'CURRENT HOME'
          : 'UNLOCKED';
    }
    preview.setAttribute('aria-label',`${tier.name}. ${tier.state === 'locked' ? `Unlocks at ${tier.worth} Star Worth` : tier.state === 'current' ? 'Current home' : 'Unlocked'}.`);
  });

  const meter = panel.querySelector('.homeTierMeter');
  if(meter){
    meter.setAttribute('role','progressbar');
    meter.setAttribute('aria-valuemin','0');
    meter.setAttribute('aria-valuemax','100');
    meter.setAttribute('aria-valuenow',String(Math.round(model.room.roomBandPct)));
    meter.setAttribute('aria-label',model.room.id >= 5 ? 'All room tiers unlocked' : `Progress to ${model.room.nextName}`);
  }

  const next = panel.querySelector('.homeTierNext');
  if(next){
    next.textContent = model.room.id >= 5
      ? `Star Mansion unlocked · ${model.room.starWorth} Star Worth`
      : `${model.room.toNext} Star Worth to ${model.room.nextName} · ${Math.round(model.room.mansionPct)}% to Star Mansion`;
  }
}

function decorateDreamGoal(root,model){
  const panel = root.querySelector('.homeDreamGoal');
  if(!panel) return;
  panel.dataset.dreamOwned = String(model.dream.owned);

  const progress = panel.querySelector('.homeDreamProgress');
  if(progress){
    progress.setAttribute('role','progressbar');
    progress.setAttribute('aria-valuemin','0');
    progress.setAttribute('aria-valuemax','100');
    progress.setAttribute('aria-valuenow',String(Math.round(model.dream.pct)));
    progress.setAttribute('aria-label',model.dream.owned ? `${model.dream.name} owned` : `Coin progress toward ${model.dream.name}`);
  }

  let horizon = panel.querySelector('.homeDreamHorizon');
  if(!horizon){
    horizon = document.createElement('div');
    horizon.className = 'homeDreamHorizon';
    const art = panel.querySelector('.homeDreamArt');
    art?.insertAdjacentElement('afterend',horizon);
  }
  horizon.innerHTML = model.dream.owned
    ? '<span>GOAL COMPLETE</span><b>Owned forever</b>'
    : `<span>NEXT DREAM</span><b>${model.dream.toGo} Coins to go</b>`;
}

function decorateDaily(root,model){
  const panel = root.querySelector('.homeDailyQuests');
  if(!panel) return;
  const rows = [...panel.querySelectorAll('.homeDailyRow')];

  model.daily.forEach((row,index) => {
    const el = rows[index];
    if(!el) return;
    el.dataset.dailyGoal = row.id;
    el.dataset.complete = String(row.value >= row.goal);
    let meter = el.querySelector('.homeDailyMiniMeter');
    if(!meter){
      meter = document.createElement('span');
      meter.className = 'homeDailyMiniMeter';
      meter.innerHTML = '<i></i>';
      el.querySelector('div')?.appendChild(meter);
    }
    const pct = clamp(row.value / Math.max(1,row.goal) * 100);
    const fill = meter.querySelector('i');
    if(fill) fill.style.width = `${pct}%`;
    meter.setAttribute('role','progressbar');
    meter.setAttribute('aria-valuemin','0');
    meter.setAttribute('aria-valuemax',String(row.goal));
    meter.setAttribute('aria-valuenow',String(row.value));

    let benefit = el.querySelector('.homeDailyBenefit');
    if(!benefit){
      benefit = document.createElement('small');
      benefit.className = 'homeDailyBenefit';
      el.querySelector('div')?.appendChild(benefit);
    }
    benefit.textContent = row.benefit;
  });

  let summary = panel.querySelector('.homeDailySummary');
  if(!summary){
    summary = document.createElement('div');
    summary.className = 'homeDailySummary';
    const rowsHost = panel.querySelector('.homeDailyRows');
    rowsHost?.insertAdjacentElement('afterend',summary);
  }
  summary.innerHTML = `<b>${model.dailyDone}/${model.daily.length} complete today</b><span>Daily counters reset for a fresh day, but Coins, XP, Stars, items, mastery, and Home progress never do.</span>`;
}

function decorateLearning(root,model){
  const panel = root.querySelector('.homeLearning');
  if(!panel) return;
  const rows = [...panel.querySelectorAll('.homeLearningRows > div')];
  rows.forEach((row,index) => {
    const learning = model.recentLearning[index];
    let state = row.querySelector('.homeLearningState');
    if(!state){
      state = document.createElement('small');
      state.className = 'homeLearningState';
      row.querySelector('p')?.appendChild(state);
    }
    if(!learning){
      state.textContent = 'Ready to learn';
      row.dataset.learningState = 'ready';
      return;
    }
    state.textContent = learning.mastered
      ? 'Mastered'
      : learning.masteryCorrect > 0
        ? `${learning.masteryCorrect}/4 mastery checks`
        : `${learning.independentCorrect} independent correct`;
    row.dataset.learningState = learning.mastered ? 'mastered' : 'growing';
  });

  let card = panel.querySelector('.homeMasteryCard');
  if(!card){
    card = document.createElement('div');
    card.className = 'homeMasteryCard';
    const rowsHost = panel.querySelector('.homeLearningRows');
    rowsHost?.insertAdjacentElement('afterend',card);
  }

  const next = model.mastery.next;
  card.innerHTML = `
    <div class="homeMasteryIcon" aria-hidden="true">★</div>
    <div class="homeMasteryCopy">
      <span>MASTERY</span>
      <b>${model.mastery.stars} Stars · ${model.mastery.masteredCount} skills mastered</b>
      <small>${next ? `${next.label}: ${next.masteryCorrect}/4 independent mastery checks` : 'Independent first-try answers build mastery evidence.'}</small>
    </div>`;
}

function decorateRewardTiles(root,model){
  const panel = root.querySelector('.homeDailyQuests');
  if(!panel) return;
  let tiles = panel.querySelector('.homeProgressRewardTiles');
  if(!tiles){
    tiles = document.createElement('div');
    tiles.className = 'homeProgressRewardTiles';
    panel.appendChild(tiles);
  }
  tiles.innerHTML = `
    <div><span>COINS</span><b>${model.dream.coins}</b><small>Spend by choice</small></div>
    <div><span>MASTERY STARS</span><b>${model.mastery.stars}</b><small>Earned from mastery</small></div>
    <div><span>COLLECTION</span><b>${model.collection.ownedCount}/${model.collection.totalCount}</b><small>Owned forever</small></div>`;
}

function decorateCustomization(root,model){
  const panel = root.querySelector('.homeCustomize');
  if(!panel) return;
  const tabs = [...panel.querySelectorAll('.homeCustomizeTabs [data-category]')];
  tabs.forEach(tab => {
    const group = model.collection.groups.find(value => value.id === tab.dataset.category);
    if(!group) return;
    let count = tab.querySelector('.homeCategoryCount');
    if(!count){
      count = document.createElement('span');
      count.className = 'homeCategoryCount';
      tab.appendChild(count);
    }
    count.textContent = String(group.owned);
    const label = [...tab.childNodes].find(node => node.nodeType === 3)?.textContent?.trim() || tab.dataset.category;
    tab.setAttribute('aria-label',`${label}: ${group.owned} owned`);
  });

  let collection = panel.querySelector('.homeCollectionProgress');
  if(!collection){
    collection = document.createElement('div');
    collection.className = 'homeCollectionProgress';
    panel.appendChild(collection);
  }
  collection.innerHTML = `<span><b>${model.collection.ownedCount}/${model.collection.totalCount}</b> permanent rewards collected</span><div role="progressbar" aria-label="Permanent reward collection progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(model.collection.pct)}"><i style="width:${model.collection.pct}%"></i></div>`;
}

function decorateShellMastery(model){
  const card = document.querySelector('.hud .mastery');
  if(!card) return;
  card.setAttribute('aria-label',`${model.mastery.masteredCount} skills mastered and ${model.mastery.stars} Mastery Stars earned`);
  card.dataset.masteryStars = String(model.mastery.stars);
}

export function decorateProgressionWidgets(root,save){
  if(!root || !save) return false;
  const model = deriveProgressionModel(save);
  const fingerprint = modelFingerprint(model);
  if(root.dataset.progressionWidgets === 'v1' && root.dataset.progressionFingerprint === fingerprint){
    decorateShellMastery(model);
    return false;
  }

  ensureGoalHorizons(root,model);
  decorateRoomProgress(root,model);
  decorateDreamGoal(root,model);
  decorateDaily(root,model);
  decorateLearning(root,model);
  decorateRewardTiles(root,model);
  decorateCustomization(root,model);
  decorateShellMastery(model);
  root.dataset.progressionWidgets = 'v1';
  root.dataset.progressionFingerprint = fingerprint;
  return true;
}

let queued = false;
function scan(){
  queued = false;
  const save = readSave();
  if(!save) return;
  document.querySelectorAll('.homeHeroRuntime').forEach(root => decorateProgressionWidgets(root,save));
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
  new MutationObserver(scheduleScan).observe(host,{subtree:true,childList:true,characterData:true});
  window.addEventListener('storage',scheduleScan);
}
