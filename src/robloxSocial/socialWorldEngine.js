
import { stableHash } from '../domainSchemas.js';

export const SOCIAL_WORLD_SCHEMA_VERSION=1;
export const SOCIAL_WORLD_VERSION='starblox-social-world-v1';

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function finite(value,label){
  const n=Number(value);
  if(!Number.isFinite(n)) throw new TypeError(label + ' must be finite.');
  return n;
}

function id(value,label){
  if(typeof value !== 'string' || !value.trim()) throw new TypeError(label + ' is required.');
  return value.trim();
}

function normalizeVector3(raw,label){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError(label + ' must be an object.');
  return {
    x:finite(raw.x,label + '.x'),
    y:finite(raw.y,label + '.y'),
    z:finite(raw.z,label + '.z')
  };
}

function normalizePlaceable(raw,index){
  if(!raw || typeof raw !== 'object') throw new TypeError('placeable ' + index + ' must be an object.');
  return {
    itemId:id(raw.itemId,'placeable.itemId'),
    category:String(raw.category ?? 'decor').slice(0,80),
    maxPerHome:Math.max(1,Math.floor(finite(raw.maxPerHome ?? 1,'placeable.maxPerHome'))),
    placementRadius:Math.max(1,finite(raw.placementRadius ?? 64,'placeable.placementRadius'))
  };
}

function normalizeNpc(raw,index){
  if(!raw || typeof raw !== 'object') throw new TypeError('npc ' + index + ' must be an object.');
  const levels=(raw.levels || []).map((row,i) => ({
    level:Math.max(1,Math.floor(finite(row.level ?? (i + 1),'npc.level'))),
    affinity:Math.max(0,Math.floor(finite(row.affinity ?? 0,'npc.affinity'))),
    unlocks:Array.isArray(row.unlocks) ? [...new Set(row.unlocks.map(String))].sort() : []
  })).sort((a,b)=>a.level-b.level);
  return {
    npcId:id(raw.npcId,'npc.npcId'),
    levels
  };
}

function normalizeMinigame(raw,index){
  if(!raw || typeof raw !== 'object') throw new TypeError('minigame ' + index + ' must be an object.');
  return {
    gameId:id(raw.gameId,'minigame.gameId'),
    npcId:raw.npcId == null ? null : id(raw.npcId,'minigame.npcId'),
    maxDurationSeconds:Math.max(5,Math.floor(finite(raw.maxDurationSeconds ?? 300,'minigame.maxDurationSeconds'))),
    winRewards:Array.isArray(raw.winRewards) ? clone(raw.winRewards) : []
  };
}

export function createSocialWorldCatalog({
  placeables=[],
  npcs=[],
  minigames=[],
  maxPlacements=100
}={}){
  const normalized={
    maxPlacements:Math.max(1,Math.floor(finite(maxPlacements,'maxPlacements'))),
    placeables:placeables.map(normalizePlaceable),
    npcs:npcs.map(normalizeNpc),
    minigames:minigames.map(normalizeMinigame)
  };
  for(const [rows,key,label] of [
    [normalized.placeables,'itemId','placeable'],
    [normalized.npcs,'npcId','npc'],
    [normalized.minigames,'gameId','minigame']
  ]){
    if(new Set(rows.map(row=>row[key])).size !== rows.length){
      throw new Error(label + ' IDs must be unique.');
    }
  }
  return deepFreeze({
    schemaVersion:SOCIAL_WORLD_SCHEMA_VERSION,
    socialWorldVersion:SOCIAL_WORLD_VERSION,
    ...normalized,
    catalogHash:stableHash(normalized)
  });
}

export function createSocialWorldState(){
  return deepFreeze({
    schemaVersion:SOCIAL_WORLD_SCHEMA_VERSION,
    home:{
      plotId:null,
      placements:{}
    },
    npcAffinity:{},
    unlockedSocialItems:{},
    stats:{
      photosTaken:0,
      coopPhotos:0,
      minigameWins:0
    },
    activeMinigame:null,
    completedSessionIds:[],
    completedSessionReceipts:{},
    affinityReceipts:{},
    photoReceipts:{}
  });
}

function mutableState(state){
  return clone(state ?? createSocialWorldState());
}

export function placeHomeItem(state,catalog,{
  placementId,
  plotId,
  itemId,
  position,
  rotationY=0
}){
  const next=mutableState(state);
  const placeable=catalog.placeables.find(row=>row.itemId===itemId);
  if(!placeable) return deepFreeze({ok:false,reason:'unknown placeable',state:next});
  const pid=id(placementId,'placementId');
  const plot=id(plotId,'plotId');
  if(next.home.placements[pid]) return deepFreeze({ok:false,reason:'duplicate placementId',state:next});
  const placements=Object.values(next.home.placements);
  if(placements.length >= catalog.maxPlacements){
    return deepFreeze({ok:false,reason:'home placement limit reached',state:next});
  }
  const sameItem=placements.filter(row=>row.itemId===itemId).length;
  if(sameItem >= placeable.maxPerHome){
    return deepFreeze({ok:false,reason:'item placement limit reached',state:next});
  }

  const pos=normalizeVector3(position,'position');
  const radius=Math.hypot(pos.x,pos.z);
  if(radius > placeable.placementRadius){
    return deepFreeze({ok:false,reason:'placement outside allowed radius',state:next});
  }

  if(next.home.plotId && next.home.plotId !== plot){
    return deepFreeze({ok:false,reason:'placement plot mismatch',state:next});
  }
  next.home.plotId=plot;
  next.home.placements[pid]={
    placementId:pid,
    itemId,
    position:pos,
    rotationY:finite(rotationY,'rotationY')
  };
  return deepFreeze({ok:true,state:next,placement:clone(next.home.placements[pid])});
}

export function removeHomeItem(state,placementId){
  const next=mutableState(state);
  const pid=id(placementId,'placementId');
  if(!next.home.placements[pid]) return deepFreeze({ok:false,reason:'unknown placement',state:next});
  delete next.home.placements[pid];
  return deepFreeze({ok:true,state:next});
}

function npcLevel(def,affinity){
  let level=0;
  const unlocks=[];
  for(const row of def.levels){
    if(affinity >= row.affinity){
      level=Math.max(level,row.level);
      unlocks.push(...row.unlocks);
    }
  }
  return {level,unlocks:[...new Set(unlocks)].sort()};
}

export function awardNpcAffinity(state,catalog,{
  npcId,
  amount,
  eventId
}){
  const next=mutableState(state);
  const def=catalog.npcs.find(row=>row.npcId===npcId);
  if(!def) return deepFreeze({ok:false,reason:'unknown npc',state:next});
  const delta=Math.max(0,Math.floor(finite(amount,'amount')));
  const key=id(eventId,'eventId');
  next.affinityReceipts ||= {};
  if(next.affinityReceipts[key]){
    const affinity=next.npcAffinity[npcId] || 0;
    return deepFreeze({
      ok:true,
      duplicate:true,
      state:next,
      affinity,
      level:npcLevel(def,affinity).level
    });
  }
  next.affinityReceipts[key]=true;

  next.npcAffinity[npcId]=(next.npcAffinity[npcId] || 0) + delta;
  const progress=npcLevel(def,next.npcAffinity[npcId]);
  for(const item of progress.unlocks) next.unlockedSocialItems[item]=true;
  return deepFreeze({
    ok:true,
    duplicate:false,
    state:next,
    affinity:next.npcAffinity[npcId],
    level:progress.level,
    unlocks:progress.unlocks
  });
}

export function startSocialMinigame(state,catalog,{
  sessionId,
  gameId,
  npcId=null,
  startedAt
}){
  const next=mutableState(state);
  if(next.activeMinigame) return deepFreeze({ok:false,reason:'minigame already active',state:next});
  const game=catalog.minigames.find(row=>row.gameId===gameId);
  if(!game) return deepFreeze({ok:false,reason:'unknown minigame',state:next});
  if(game.npcId && game.npcId !== npcId) return deepFreeze({ok:false,reason:'minigame npc mismatch',state:next});
  const sid=id(sessionId,'sessionId');
  next.completedSessionReceipts ||= {};
  if(next.completedSessionReceipts[sid] || next.completedSessionIds.includes(sid)){
    return deepFreeze({ok:false,reason:'session already completed',state:next});
  }
  const start=new Date(startedAt).toISOString();
  next.activeMinigame={sessionId:sid,gameId,npcId,startedAt:start};
  return deepFreeze({ok:true,state:next,session:clone(next.activeMinigame)});
}

export function finishSocialMinigame(state,catalog,{
  sessionId,
  endedAt,
  won
}){
  const next=mutableState(state);
  const active=next.activeMinigame;
  if(!active || active.sessionId !== sessionId){
    return deepFreeze({ok:false,reason:'minigame session mismatch',state:next,rewards:[]});
  }
  const game=catalog.minigames.find(row=>row.gameId===active.gameId);
  const end=new Date(endedAt).toISOString();
  const duration=(Date.parse(end)-Date.parse(active.startedAt))/1000;
  if(duration < 0 || duration > game.maxDurationSeconds){
    return deepFreeze({ok:false,reason:'invalid minigame duration',state:next,rewards:[]});
  }
  next.activeMinigame=null;
  next.completedSessionReceipts ||= {};
  next.completedSessionReceipts[sessionId]=true;
  next.completedSessionIds.push(sessionId);
  next.completedSessionIds=next.completedSessionIds.slice(-200);
  const rewards=won ? clone(game.winRewards) : [];
  if(won) next.stats.minigameWins += 1;
  return deepFreeze({ok:true,state:next,rewards});
}

function dot(a,b){
  return a.x*b.x + a.y*b.y + a.z*b.z;
}

function normalizeUnit(raw,label){
  const v=normalizeVector3(raw,label);
  const mag=Math.hypot(v.x,v.y,v.z);
  if(mag <= 1e-9) throw new TypeError(label + ' must be non-zero.');
  return {x:v.x/mag,y:v.y/mag,z:v.z/mag};
}

export function recordSocialPhoto(state,{
  eventId,
  capturer,
  participants=[],
  maxDistance=18,
  facingDot=0.55
}){
  const next=mutableState(state);
  const photoId=id(eventId,'eventId');
  next.photoReceipts ||= {};
  if(next.photoReceipts[photoId]){
    return deepFreeze({
      ok:true,
      duplicate:true,
      state:next,
      coopParticipants:[]
    });
  }
  const cpos=normalizeVector3(capturer.position,'capturer.position');
  const clook=normalizeUnit(capturer.look,'capturer.look');
  const coop=[];

  for(const participant of participants){
    const ppos=normalizeVector3(participant.position,'participant.position');
    const plook=normalizeUnit(participant.look,'participant.look');
    const distance=Math.hypot(ppos.x-cpos.x,ppos.y-cpos.y,ppos.z-cpos.z);
    if(distance <= maxDistance && dot(clook,plook) >= facingDot){
      coop.push(id(participant.playerId,'participant.playerId'));
    }
  }

  next.photoReceipts[photoId]=true;
  next.stats.photosTaken += 1;
  if(coop.length) next.stats.coopPhotos += 1;

  return deepFreeze({
    ok:true,
    duplicate:false,
    state:next,
    coopParticipants:[...new Set(coop)].sort()
  });
}
