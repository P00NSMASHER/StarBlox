
import { stableHash } from '../domainSchemas.js';

export const LIVEOPS_SCHEMA_VERSION=1;
export const LIVEOPS_VERSION='starblox-liveops-v1';

const MAX_PROCESSED_EVENTS=500;
const VALID_REWARD_TYPES=new Set(['coins','xp','stars','cosmetic','seasonXp']);
const VALID_TASK_TYPES=new Set(['count']);

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function requireId(value,label){
  if(typeof value !== 'string' || !value.trim()) throw new TypeError(label + ' is required.');
  return value.trim();
}

function finite(value,label){
  const number=Number(value);
  if(!Number.isFinite(number)) throw new TypeError(label + ' must be finite.');
  return number;
}

function dateKey(value){
  const date=value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) throw new TypeError('date must be valid.');
  return date.toISOString().slice(0,10);
}

function dayNumber(key){
  const ms=Date.parse(key + 'T00:00:00Z');
  return Math.floor(ms / 86_400_000);
}

function normalizeMatch(match){
  if(match == null) return {};
  if(!match || typeof match !== 'object' || Array.isArray(match)){
    throw new TypeError('task.match must be an object.');
  }
  return Object.fromEntries(
    Object.entries(match)
      .filter(([,value]) => ['string','number','boolean'].includes(typeof value))
      .sort(([a],[b]) => a.localeCompare(b))
  );
}

function normalizeTask(raw,index){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new TypeError('task ' + index + ' must be an object.');
  }
  const type=raw.type ?? 'count';
  if(!VALID_TASK_TYPES.has(type)) throw new TypeError('unsupported task type: ' + type);
  const target=Math.max(1,Math.floor(finite(raw.target,'task.target')));
  return {
    taskId:requireId(raw.taskId,'task.taskId'),
    type,
    eventType:requireId(raw.eventType,'task.eventType'),
    target,
    match:normalizeMatch(raw.match)
  };
}

function normalizeRewards(rewards=[]){
  if(!Array.isArray(rewards)) throw new TypeError('rewards must be an array.');
  return rewards.map((raw,index) => {
    if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
      throw new TypeError('reward ' + index + ' must be an object.');
    }
    const type=requireId(raw.type,'reward.type');
    if(!VALID_REWARD_TYPES.has(type)) throw new TypeError('unsupported reward type: ' + type);
    const amount=type === 'cosmetic'
      ? 1
      : Math.max(0,Math.floor(finite(raw.amount ?? 0,'reward.amount')));
    return {
      type,
      amount,
      itemId:type === 'cosmetic' ? requireId(raw.itemId,'reward.itemId') : null,
      seasonId:type === 'seasonXp' ? requireId(raw.seasonId,'reward.seasonId') : null
    };
  });
}

function normalizeMission(raw,index){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new TypeError('mission ' + index + ' must be an object.');
  }
  const tasks=(raw.tasks || []).map(normalizeTask);
  if(new Set(tasks.map(task => task.taskId)).size !== tasks.length){
    throw new Error('mission task IDs must be unique.');
  }
  return {
    missionId:requireId(raw.missionId,'mission.missionId'),
    categoryId:requireId(raw.categoryId ?? 'general','mission.categoryId'),
    displayName:String(raw.displayName ?? raw.missionId).slice(0,120),
    tasks,
    rewards:normalizeRewards(raw.rewards || []),
    availableAfter:raw.availableAfter ? new Date(raw.availableAfter).toISOString() : null,
    availableBefore:raw.availableBefore ? new Date(raw.availableBefore).toISOString() : null,
    repeatable:Boolean(raw.repeatable)
  };
}

function normalizeSeason(raw,index){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new TypeError('season ' + index + ' must be an object.');
  }
  const tiers=(raw.tiers || []).map((tier,tierIndex) => ({
    tierId:requireId(tier.tierId ?? ('tier-' + tierIndex),'tier.tierId'),
    xp:Math.max(1,Math.floor(finite(tier.xp,'tier.xp'))),
    rewards:normalizeRewards(tier.rewards || [])
  })).sort((a,b) => a.xp - b.xp || a.tierId.localeCompare(b.tierId));
  return {
    seasonId:requireId(raw.seasonId,'season.seasonId'),
    startsAt:new Date(raw.startsAt).toISOString(),
    endsAt:new Date(raw.endsAt).toISOString(),
    tiers
  };
}

function normalizeEngagement(raw,index){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new TypeError('engagement reward ' + index + ' must be an object.');
  }
  const kind=requireId(raw.kind,'engagement.kind');
  if(!['daily','time'].includes(kind)) throw new TypeError('unsupported engagement kind: ' + kind);
  return {
    rewardId:requireId(raw.rewardId,'engagement.rewardId'),
    kind,
    threshold:Math.max(1,Math.floor(finite(raw.threshold,'engagement.threshold'))),
    rewards:normalizeRewards(raw.rewards || [])
  };
}

function normalizeBundle(raw,index){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new TypeError('bundle ' + index + ' must be an object.');
  }
  const priceType=requireId(raw.priceType,'bundle.priceType');
  if(!['coins','marketplace'].includes(priceType)){
    throw new TypeError('unsupported bundle priceType: ' + priceType);
  }
  return {
    bundleId:requireId(raw.bundleId,'bundle.bundleId'),
    displayName:String(raw.displayName ?? raw.bundleId).slice(0,120),
    priceType,
    price:priceType === 'coins' ? Math.max(0,Math.floor(finite(raw.price,'bundle.price'))) : null,
    productId:priceType === 'marketplace' ? Math.max(1,Math.floor(finite(raw.productId,'bundle.productId'))) : null,
    rewards:normalizeRewards(raw.rewards || []),
    singleUse:raw.singleUse !== false
  };
}

export function createLiveOpsCatalog({
  missions=[],
  seasons=[],
  engagementRewards=[],
  bundles=[]
}={}){
  const normalized={
    missions:missions.map(normalizeMission),
    seasons:seasons.map(normalizeSeason),
    engagementRewards:engagementRewards.map(normalizeEngagement),
    bundles:bundles.map(normalizeBundle)
  };
  for(const [label,rows,idKey] of [
    ['mission',normalized.missions,'missionId'],
    ['season',normalized.seasons,'seasonId'],
    ['engagement reward',normalized.engagementRewards,'rewardId'],
    ['bundle',normalized.bundles,'bundleId']
  ]){
    if(new Set(rows.map(row => row[idKey])).size !== rows.length){
      throw new Error(label + ' IDs must be unique.');
    }
  }
  return deepFreeze({
    schemaVersion:LIVEOPS_SCHEMA_VERSION,
    liveOpsVersion:LIVEOPS_VERSION,
    ...normalized,
    catalogHash:stableHash(normalized)
  });
}

export function createLiveOpsState(){
  return deepFreeze({
    schemaVersion:LIVEOPS_SCHEMA_VERSION,
    counters:{},
    missions:{},
    seasons:{},
    engagement:{
      lastVisitDate:null,
      streak:0,
      playSeconds:0,
      claimed:{}
    },
    bundles:{
      purchased:{}
    },
    processedEventIds:[]
  });
}

function mutableState(state){
  return clone(state ?? createLiveOpsState());
}

function eventMatches(task,event){
  if(task.eventType !== event.type) return false;
  for(const [key,value] of Object.entries(task.match)){
    if(event[key] !== value) return false;
  }
  return true;
}

function missionAvailable(mission,at){
  const timestamp=Date.parse(at);
  if(mission.availableAfter && timestamp < Date.parse(mission.availableAfter)) return false;
  if(mission.availableBefore && timestamp > Date.parse(mission.availableBefore)) return false;
  return true;
}

function missionState(state,missionId){
  if(!state.missions[missionId]){
    state.missions[missionId]={
      progress:{},
      completed:false,
      claimed:false,
      completions:0
    };
  }
  return state.missions[missionId];
}

function addRewardReceipt(receipts,reward,source){
  receipts.push({
    source,
    type:reward.type,
    amount:reward.amount,
    itemId:reward.itemId,
    seasonId:reward.seasonId
  });
}

function applySeasonXp(state,catalog,reward){
  if(reward.type !== 'seasonXp') return;
  const season=catalog.seasons.find(row => row.seasonId === reward.seasonId);
  if(!season) return;
  state.seasons[season.seasonId] ||= {xp:0,claimedTiers:{}};
  state.seasons[season.seasonId].xp += reward.amount;
}

export function recordAuthoritativeLiveOpsEvent(state,catalog,event){
  if(!catalog || catalog.liveOpsVersion !== LIVEOPS_VERSION) throw new TypeError('invalid liveOps catalog.');
  if(!event || typeof event !== 'object' || Array.isArray(event)) throw new TypeError('event must be an object.');
  const eventId=requireId(event.eventId,'event.eventId');
  const type=requireId(event.type,'event.type');
  const amount=Math.max(0,finite(event.amount ?? 1,'event.amount'));
  const at=new Date(event.at).toISOString();

  const next=mutableState(state);
  if(next.processedEventIds.includes(eventId)){
    return deepFreeze({state:next,duplicate:true,completedMissions:[]});
  }

  next.processedEventIds.push(eventId);
  next.processedEventIds=next.processedEventIds.slice(-MAX_PROCESSED_EVENTS);
  next.counters[type]=(next.counters[type] || 0) + amount;

  if(type === 'play_seconds'){
    next.engagement.playSeconds += amount;
  }

  const completedMissions=[];
  for(const mission of catalog.missions){
    if(!missionAvailable(mission,at)) continue;
    const row=missionState(next,mission.missionId);
    if(row.completed && !mission.repeatable) continue;

    for(const task of mission.tasks){
      if(!eventMatches(task,{...event,type})) continue;
      row.progress[task.taskId]=Math.min(
        task.target,
        (row.progress[task.taskId] || 0) + amount
      );
    }

    const complete=mission.tasks.length === 0 ||
      mission.tasks.every(task => (row.progress[task.taskId] || 0) >= task.target);
    if(complete && !row.completed){
      row.completed=true;
      row.completions += 1;
      completedMissions.push(mission.missionId);
    }
  }

  return deepFreeze({state:next,duplicate:false,completedMissions});
}

export function recordLiveOpsVisit(state,{at}){
  const next=mutableState(state);
  const today=dateKey(at);
  const last=next.engagement.lastVisitDate;

  if(last === today) return deepFreeze(next);
  if(last && dayNumber(today) === dayNumber(last) + 1){
    next.engagement.streak += 1;
  }else{
    next.engagement.streak=1;
  }
  next.engagement.lastVisitDate=today;
  return deepFreeze(next);
}

export function claimMissionReward(state,catalog,missionId){
  const id=requireId(missionId,'missionId');
  const mission=catalog.missions.find(row => row.missionId === id);
  if(!mission) return deepFreeze({ok:false,reason:'unknown mission',state:mutableState(state),receipts:[]});

  const next=mutableState(state);
  const row=missionState(next,id);
  if(!row.completed) return deepFreeze({ok:false,reason:'mission incomplete',state:next,receipts:[]});
  if(row.claimed) return deepFreeze({ok:false,reason:'mission already claimed',state:next,receipts:[]});

  row.claimed=true;
  const receipts=[];
  for(const reward of mission.rewards){
    addRewardReceipt(receipts,reward,'mission:' + id);
    applySeasonXp(next,catalog,reward);
  }

  if(mission.repeatable){
    row.completed=false;
    row.claimed=false;
    row.progress={};
  }

  return deepFreeze({ok:true,state:next,receipts});
}

export function claimSeasonTier(state,catalog,seasonId,tierId,{at}){
  const season=catalog.seasons.find(row => row.seasonId === seasonId);
  if(!season) return deepFreeze({ok:false,reason:'unknown season',state:mutableState(state),receipts:[]});
  const now=Date.parse(new Date(at).toISOString());
  if(now < Date.parse(season.startsAt) || now > Date.parse(season.endsAt)){
    return deepFreeze({ok:false,reason:'season inactive',state:mutableState(state),receipts:[]});
  }
  const tier=season.tiers.find(row => row.tierId === tierId);
  if(!tier) return deepFreeze({ok:false,reason:'unknown tier',state:mutableState(state),receipts:[]});

  const next=mutableState(state);
  next.seasons[seasonId] ||= {xp:0,claimedTiers:{}};
  const row=next.seasons[seasonId];
  if(row.xp < tier.xp) return deepFreeze({ok:false,reason:'insufficient season xp',state:next,receipts:[]});
  if(row.claimedTiers[tierId]) return deepFreeze({ok:false,reason:'tier already claimed',state:next,receipts:[]});

  row.claimedTiers[tierId]=true;
  const receipts=[];
  for(const reward of tier.rewards) addRewardReceipt(receipts,reward,'season:' + seasonId + ':' + tierId);
  return deepFreeze({ok:true,state:next,receipts});
}

export function claimEngagementReward(state,catalog,rewardId){
  const reward=catalog.engagementRewards.find(row => row.rewardId === rewardId);
  if(!reward) return deepFreeze({ok:false,reason:'unknown reward',state:mutableState(state),receipts:[]});

  const next=mutableState(state);
  if(next.engagement.claimed[rewardId]){
    return deepFreeze({ok:false,reason:'reward already claimed',state:next,receipts:[]});
  }

  const value=reward.kind === 'daily'
    ? next.engagement.streak
    : next.engagement.playSeconds;
  if(value < reward.threshold){
    return deepFreeze({ok:false,reason:'reward threshold not met',state:next,receipts:[]});
  }

  next.engagement.claimed[rewardId]=true;
  const receipts=[];
  for(const item of reward.rewards) addRewardReceipt(receipts,item,'engagement:' + rewardId);
  return deepFreeze({ok:true,state:next,receipts});
}

export function authorizeCoinBundlePurchase(state,catalog,bundleId,{coins}){
  const bundle=catalog.bundles.find(row => row.bundleId === bundleId);
  if(!bundle) return deepFreeze({ok:false,reason:'unknown bundle',state:mutableState(state),receipts:[],coinsDelta:0});
  if(bundle.priceType !== 'coins'){
    return deepFreeze({ok:false,reason:'marketplace purchase requires platform receipt verification',state:mutableState(state),receipts:[],coinsDelta:0});
  }

  const next=mutableState(state);
  if(bundle.singleUse && next.bundles.purchased[bundleId]){
    return deepFreeze({ok:false,reason:'bundle already purchased',state:next,receipts:[],coinsDelta:0});
  }
  if(!Number.isFinite(coins) || coins < bundle.price){
    return deepFreeze({ok:false,reason:'insufficient coins',state:next,receipts:[],coinsDelta:0});
  }

  next.bundles.purchased[bundleId]=(next.bundles.purchased[bundleId] || 0) + 1;
  const receipts=[];
  for(const reward of bundle.rewards) addRewardReceipt(receipts,reward,'bundle:' + bundleId);
  return deepFreeze({ok:true,state:next,receipts,coinsDelta:-bundle.price});
}
