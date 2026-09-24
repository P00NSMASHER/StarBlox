
export const ACTION_AUTHORITY_VERSION='starblox-action-authority-v1';

function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function finite(value,label){
  const n=Number(value);
  if(!Number.isFinite(n)) throw new TypeError(label + ' must be finite.');
  return n;
}

function integer(value,label){
  const n=Number(value);
  if(!Number.isInteger(n) || n < 0) throw new TypeError(label + ' must be a non-negative integer.');
  return n;
}

function vector3(raw,label){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new TypeError(label + ' must be an object.');
  }
  return {
    x:finite(raw.x,label + '.x'),
    y:finite(raw.y,label + '.y'),
    z:finite(raw.z,label + '.z')
  };
}

function length3(v){
  return Math.hypot(v.x,v.y,v.z);
}

function subtract(a,b){
  return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};
}

function add(a,b){
  return {x:a.x+b.x,y:a.y+b.y,z:a.z+b.z};
}

function scale(v,s){
  return {x:v.x*s,y:v.y*s,z:v.z*s};
}

function dot(a,b){
  return a.x*b.x + a.y*b.y + a.z*b.z;
}

function normalize(v,label='vector'){
  const mag=length3(v);
  if(mag <= 1e-9) throw new TypeError(label + ' must be non-zero.');
  return scale(v,1/mag);
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

export function createActionAuthorityConfig({
  maxMoveMagnitude=1.05,
  maxCommandsPerSecond=120,
  maxClientClockSkewMs=350,
  minDeltaMs=2,
  maxDeltaMs=100,
  historyMs=1000,
  maxSnapshotCount=180,
  maxShotRange=300,
  maxShotOriginError=8,
  defaultHitRadius=2.5
}={}){
  return deepFreeze({
    maxMoveMagnitude:Math.max(0.1,finite(maxMoveMagnitude,'maxMoveMagnitude')),
    maxCommandsPerSecond:Math.max(1,Math.floor(finite(maxCommandsPerSecond,'maxCommandsPerSecond'))),
    maxClientClockSkewMs:Math.max(0,finite(maxClientClockSkewMs,'maxClientClockSkewMs')),
    minDeltaMs:Math.max(0.1,finite(minDeltaMs,'minDeltaMs')),
    maxDeltaMs:Math.max(1,finite(maxDeltaMs,'maxDeltaMs')),
    historyMs:Math.max(50,finite(historyMs,'historyMs')),
    maxSnapshotCount:Math.max(2,Math.floor(finite(maxSnapshotCount,'maxSnapshotCount'))),
    maxShotRange:Math.max(1,finite(maxShotRange,'maxShotRange')),
    maxShotOriginError:Math.max(0,finite(maxShotOriginError,'maxShotOriginError')),
    defaultHitRadius:Math.max(0.1,finite(defaultHitRadius,'defaultHitRadius'))
  });
}

export function createPlayerActionState({playerId}){
  if(typeof playerId !== 'string' || !playerId.trim()) throw new TypeError('playerId is required.');
  return deepFreeze({
    version:ACTION_AUTHORITY_VERSION,
    playerId:playerId.trim(),
    lastClientSequence:-1,
    lastAcceptedServerTimeMs:null,
    acceptedCommandCount:0,
    recentCommandTimes:[],
    snapshots:[],
    acceptedCommands:[]
  });
}

function mutableState(state){
  if(!state || state.version !== ACTION_AUTHORITY_VERSION){
    throw new TypeError('invalid action-authority state.');
  }
  return clone(state);
}

export function acceptMovementCommand(state,config,command,{serverTimeMs}){
  const next=mutableState(state);
  const serverNow=finite(serverTimeMs,'serverTimeMs');

  if(!command || typeof command !== 'object' || Array.isArray(command)){
    return deepFreeze({ok:false,reason:'command must be an object',state:next});
  }

  let sequence,clientTimeMs,deltaMs,move,lookYaw;
  try{
    sequence=integer(command.sequence,'command.sequence');
    clientTimeMs=finite(command.clientTimeMs,'command.clientTimeMs');
    deltaMs=finite(command.deltaMs,'command.deltaMs');
    move={
      x:finite(command.moveX,'command.moveX'),
      z:finite(command.moveZ,'command.moveZ')
    };
    lookYaw=finite(command.lookYaw ?? 0,'command.lookYaw');
  }catch(error){
    return deepFreeze({ok:false,reason:error.message,state:next});
  }

  if(sequence <= next.lastClientSequence){
    return deepFreeze({
      ok:false,
      duplicate:sequence === next.lastClientSequence,
      reason:'stale client sequence',
      state:next
    });
  }

  if(Math.abs(clientTimeMs-serverNow) > config.maxClientClockSkewMs){
    return deepFreeze({ok:false,reason:'client clock outside allowed skew',state:next});
  }

  if(deltaMs < config.minDeltaMs || deltaMs > config.maxDeltaMs){
    return deepFreeze({ok:false,reason:'command delta outside allowed bounds',state:next});
  }

  const magnitude=Math.hypot(move.x,move.z);
  if(magnitude > config.maxMoveMagnitude){
    return deepFreeze({ok:false,reason:'movement magnitude exceeds allowed input',state:next});
  }

  const cutoff=serverNow-1000;
  next.recentCommandTimes=next.recentCommandTimes.filter(value=>value>=cutoff);
  if(next.recentCommandTimes.length >= config.maxCommandsPerSecond){
    return deepFreeze({ok:false,reason:'movement command rate exceeded',state:next});
  }

  const normalized={
    sequence,
    clientTimeMs,
    serverTimeMs:serverNow,
    deltaMs,
    moveX:move.x,
    moveZ:move.z,
    jump:Boolean(command.jump),
    lookYaw,
    actionBits:Number.isInteger(command.actionBits) && command.actionBits >= 0
      ? command.actionBits
      : 0
  };

  next.lastClientSequence=sequence;
  next.lastAcceptedServerTimeMs=serverNow;
  next.acceptedCommandCount+=1;
  next.recentCommandTimes.push(serverNow);
  next.acceptedCommands.push(normalized);
  next.acceptedCommands=next.acceptedCommands.slice(-256);

  return deepFreeze({
    ok:true,
    state:next,
    command:deepFreeze(clone(normalized))
  });
}

export function recordAuthoritativeSnapshot(state,config,{
  serverTimeMs,
  position,
  velocity={x:0,y:0,z:0}
}){
  const next=mutableState(state);
  const time=finite(serverTimeMs,'serverTimeMs');
  const pos=vector3(position,'position');
  const vel=vector3(velocity,'velocity');

  const last=next.snapshots[next.snapshots.length-1];
  if(last && time < last.serverTimeMs){
    throw new Error('authoritative snapshots must be monotonic.');
  }

  next.snapshots.push({
    serverTimeMs:time,
    position:pos,
    velocity:vel
  });

  const cutoff=time-config.historyMs;
  next.snapshots=next.snapshots
    .filter(row=>row.serverTimeMs>=cutoff)
    .slice(-config.maxSnapshotCount);

  return deepFreeze(next);
}

export function rewindAuthoritativePosition(state,targetTimeMs){
  if(!state || state.version !== ACTION_AUTHORITY_VERSION) return null;
  const rows=state.snapshots || [];
  if(rows.length === 0) return null;
  const target=finite(targetTimeMs,'targetTimeMs');

  if(target <= rows[0].serverTimeMs) return clone(rows[0]);
  if(target >= rows[rows.length-1].serverTimeMs) return clone(rows[rows.length-1]);

  for(let index=0;index<rows.length-1;index++){
    const a=rows[index];
    const b=rows[index+1];
    if(target < a.serverTimeMs || target > b.serverTimeMs) continue;
    const span=b.serverTimeMs-a.serverTimeMs;
    const t=span <= 0 ? 0 : (target-a.serverTimeMs)/span;
    return {
      serverTimeMs:target,
      position:{
        x:a.position.x+(b.position.x-a.position.x)*t,
        y:a.position.y+(b.position.y-a.position.y)*t,
        z:a.position.z+(b.position.z-a.position.z)*t
      },
      velocity:{
        x:a.velocity.x+(b.velocity.x-a.velocity.x)*t,
        y:a.velocity.y+(b.velocity.y-a.velocity.y)*t,
        z:a.velocity.z+(b.velocity.z-a.velocity.z)*t
      }
    };
  }
  return null;
}

function raySphereDistance(origin,direction,center,radius,maxRange){
  const toCenter=subtract(center,origin);
  const along=dot(toCenter,direction);
  if(along < 0 || along > maxRange) return null;
  const closest=add(origin,scale(direction,along));
  const dist=length3(subtract(center,closest));
  if(dist > radius) return null;
  const halfChord=Math.sqrt(Math.max(0,radius*radius-dist*dist));
  return Math.max(0,along-halfChord);
}

export function validateAuthoritativeHitscan({
  shooterState,
  targetStates,
  config,
  clientShotTimeMs,
  origin,
  direction,
  maxRange=config.maxShotRange
}){
  const shotTime=finite(clientShotTimeMs,'clientShotTimeMs');
  const shotOrigin=vector3(origin,'origin');
  let dir;
  try{ dir=normalize(vector3(direction,'direction'),'direction'); }
  catch(error){ return deepFreeze({ok:false,reason:error.message,hit:null}); }

  const range=clamp(finite(maxRange,'maxRange'),1,config.maxShotRange);
  const shooter=rewindAuthoritativePosition(shooterState,shotTime);
  if(!shooter) return deepFreeze({ok:false,reason:'missing shooter history',hit:null});

  if(length3(subtract(shotOrigin,shooter.position)) > config.maxShotOriginError){
    return deepFreeze({ok:false,reason:'shot origin too far from authoritative shooter position',hit:null});
  }

  let best=null;
  for(const row of targetStates || []){
    if(!row || !row.state || row.state.playerId === shooterState.playerId) continue;
    const target=rewindAuthoritativePosition(row.state,shotTime);
    if(!target) continue;
    const radius=Math.max(0.1,Number(row.hitRadius) || config.defaultHitRadius);
    const distance=raySphereDistance(shotOrigin,dir,target.position,radius,range);
    if(distance == null) continue;
    if(!best || distance < best.distance){
      best={
        playerId:row.state.playerId,
        distance,
        rewoundPosition:target.position
      };
    }
  }

  return deepFreeze({
    ok:true,
    hit:best,
    serverVerified:true,
    shotTimeMs:shotTime,
    range
  });
}
