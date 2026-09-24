
export const MUSIC_DIRECTOR_VERSION='starblox-music-director-v1';

export const MUSIC_ZONES=Object.freeze([
  'calm','explore','challenge','boss'
]);

const DEFAULT_LENGTHS=Object.freeze({
  calm:48,
  explore:40,
  challenge:56,
  boss:16
});

const DEFAULT_MASTER=Object.freeze({
  calm:1,
  explore:0.9,
  challenge:1.05,
  boss:0.75
});

const URGENT=new Set(['challenge','boss']);

function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function normalizeZone(value){
  return MUSIC_ZONES.includes(value) ? value : 'calm';
}

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function snapCycle(value,grid){
  return Math.ceil((value + 0.05) / grid) * grid;
}

export function desiredMusicZone(snapshot={}){
  if(snapshot.defeated || snapshot.completed) return 'calm';
  if(snapshot.boss === true || snapshot.phase === 'boss') return 'boss';
  if(
    snapshot.phase === 'challenge' ||
    snapshot.combat === true ||
    snapshot.timerUrgent === true ||
    (Number(snapshot.pressure) || 0) >= 0.72
  ){
    return 'challenge';
  }
  if(
    snapshot.phase === 'explore' ||
    snapshot.phase === 'quest' ||
    snapshot.moving === true ||
    (Number(snapshot.pressure) || 0) >= 0.25
  ){
    return 'explore';
  }
  return 'calm';
}

export function createAdaptiveMusicState({
  zone:initialZone='calm',
  nowCycles=0,
  userVolume=0.6,
  lengths=DEFAULT_LENGTHS,
  master=DEFAULT_MASTER
}={}){
  const current=normalizeZone(initialZone);
  const off={calm:null,explore:null,challenge:null,boss:null};
  off[current]=nowCycles;

  return deepFreeze({
    version:MUSIC_DIRECTOR_VERSION,
    zone:current,
    pending:null,
    commitAt:null,
    lastWanted:current,
    wantedSince:nowCycles,
    nextTransitionAllowedAt:nowCycles,
    paused:false,
    userVolume:clamp(Number(userVolume) || 0,0,1),
    weights:{
      calm:current === 'calm' ? 1 : 0,
      explore:current === 'explore' ? 1 : 0,
      challenge:current === 'challenge' ? 1 : 0,
      boss:current === 'boss' ? 1 : 0
    },
    offsets:off,
    positions:{calm:0,explore:0,challenge:0,boss:0},
    lengths:{...DEFAULT_LENGTHS,...clone(lengths)},
    master:{...DEFAULT_MASTER,...clone(master)}
  });
}

function commitTransition(state,want,cycle){
  const leaving=state.zone;
  const positions={...state.positions};
  const offsets={...state.offsets};
  const leaveOffset=offsets[leaving] ?? 0;
  const leaveLength=Math.max(1,state.lengths[leaving] || DEFAULT_LENGTHS[leaving]);
  positions[leaving]=((cycle - leaveOffset) % leaveLength + leaveLength) % leaveLength;

  const targetLength=Math.max(1,state.lengths[want] || DEFAULT_LENGTHS[want]);
  const resume=URGENT.has(want)
    ? 0
    : (Math.floor((positions[want] || 0) / 4) * 4) % targetLength;
  offsets[want]=cycle - resume;

  return {
    ...state,
    zone:want,
    pending:null,
    commitAt:null,
    offsets,
    positions,
    nextTransitionAllowedAt:cycle + (URGENT.has(want) ? 0.25 : 0.5)
  };
}

export function updateAdaptiveMusic(state,{
  dtSeconds,
  nowCycles,
  snapshot={}
}){
  if(!state || state.version !== MUSIC_DIRECTOR_VERSION){
    throw new TypeError('invalid adaptive music state.');
  }
  const dt=Math.max(0,Number(dtSeconds) || 0);
  const now=Math.max(0,Number(nowCycles) || 0);
  if(state.paused){
    return deepFreeze({...state});
  }

  let next={...state};
  const wanted=desiredMusicZone(snapshot);
  if(wanted !== next.lastWanted){
    next.lastWanted=wanted;
    next.wantedSince=now;
  }

  if(wanted !== next.zone && now >= next.nextTransitionAllowedAt){
    const dwell=URGENT.has(wanted) ? 0.35 : 1.2;
    if(now - next.wantedSince >= dwell){
      if(next.pending !== wanted){
        const grid=(URGENT.has(wanted) || URGENT.has(next.zone)) ? 1 : 4;
        const base=next.offsets[next.zone] ?? 0;
        next.pending=wanted;
        next.commitAt=base + snapCycle(now - base,grid);
      }
      if(now >= next.commitAt - 0.02){
        next=commitTransition(next,wanted,next.commitAt ?? now);
      }
    }
  }else if(wanted === next.zone){
    next.pending=null;
    next.commitAt=null;
  }

  const weights={...next.weights};
  const inRate={calm:0.40,explore:0.40,challenge:0.55,boss:0.55};
  const outRate={calm:0.30,explore:0.30,challenge:0.50,boss:0.50};

  for(const key of MUSIC_ZONES){
    const target=key === next.zone ? 1 : 0;
    const rate=target ? inRate[key] : outRate[key];
    const delta=target - weights[key];
    const step=rate * dt;
    weights[key]=Math.abs(delta) <= step
      ? target
      : weights[key] + Math.sign(delta) * step;
  }

  return deepFreeze({...next,weights});
}

export function setMusicPaused(state,paused){
  if(!state || state.version !== MUSIC_DIRECTOR_VERSION){
    throw new TypeError('invalid adaptive music state.');
  }
  return deepFreeze({...state,paused:Boolean(paused)});
}

export function setMusicVolume(state,volume){
  if(!state || state.version !== MUSIC_DIRECTOR_VERSION){
    throw new TypeError('invalid adaptive music state.');
  }
  return deepFreeze({...state,userVolume:clamp(Number(volume) || 0,0,1)});
}

export function musicMix(state){
  if(!state || state.version !== MUSIC_DIRECTOR_VERSION){
    throw new TypeError('invalid adaptive music state.');
  }

  const gains={};
  for(const key of MUSIC_ZONES){
    gains[key]=state.weights[key] * (state.master[key] ?? 1) * state.userVolume;
  }
  return deepFreeze({
    zone:state.zone,
    pending:state.pending,
    commitAt:state.commitAt,
    gains,
    offsets:clone(state.offsets)
  });
}
