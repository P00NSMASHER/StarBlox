
import { stableHash } from '../domainSchemas.js';

export const ACTION_NETCODE_SCHEMA_VERSION=1;
export const ACTION_NETCODE_VERSION='starblox-action-netcode-v1';

const DEFAULT_CONFIG=Object.freeze({
  historyWindowMs:1000,
  maxClientLeadMs:150,
  maxClientLagMs:1200,
  minDtMs:2,
  maxDtMs:100,
  maxMoveMagnitude:1.001,
  maxSpeed:24,
  maxHealth:100,
  processedFireLimit:256
});

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

function nonNegativeInt(value,label){
  const n=Number(value);
  if(!Number.isInteger(n) || n < 0) throw new TypeError(label + ' must be a non-negative integer.');
  return n;
}

function id(value,label){
  if(typeof value !== 'string' || !value.trim()) throw new TypeError(label + ' is required.');
  return value.trim();
}

function vec3(value,label){
  if(!value || typeof value !== 'object' || Array.isArray(value)){
    throw new TypeError(label + ' must be a vector object.');
  }
  return {
    x:finite(value.x,label + '.x'),
    y:finite(value.y,label + '.y'),
    z:finite(value.z,label + '.z')
  };
}

function add(a,b){ return {x:a.x+b.x,y:a.y+b.y,z:a.z+b.z}; }
function sub(a,b){ return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}; }
function mul(a,s){ return {x:a.x*s,y:a.y*s,z:a.z*s}; }
function dot(a,b){ return a.x*b.x + a.y*b.y + a.z*b.z; }
function magnitude(a){ return Math.sqrt(dot(a,a)); }
function distance(a,b){ return magnitude(sub(a,b)); }
function lerp(a,b,t){
  return {
    x:a.x+(b.x-a.x)*t,
    y:a.y+(b.y-a.y)*t,
    z:a.z+(b.z-a.z)*t
  };
}
function normalized(a){
  const m=magnitude(a);
  if(m < 1e-9) throw new RangeError('direction magnitude is too small.');
  return mul(a,1/m);
}

function config(input={}){
  const merged={...DEFAULT_CONFIG,...input};
  const out={
    historyWindowMs:Math.max(100,finite(merged.historyWindowMs,'historyWindowMs')),
    maxClientLeadMs:Math.max(0,finite(merged.maxClientLeadMs,'maxClientLeadMs')),
    maxClientLagMs:Math.max(100,finite(merged.maxClientLagMs,'maxClientLagMs')),
    minDtMs:Math.max(1,finite(merged.minDtMs,'minDtMs')),
    maxDtMs:Math.max(2,finite(merged.maxDtMs,'maxDtMs')),
    maxMoveMagnitude:Math.max(0.1,finite(merged.maxMoveMagnitude,'maxMoveMagnitude')),
    maxSpeed:Math.max(0,finite(merged.maxSpeed,'maxSpeed')),
    maxHealth:Math.max(1,finite(merged.maxHealth,'maxHealth')),
    processedFireLimit:Math.max(16,Math.floor(finite(merged.processedFireLimit,'processedFireLimit')))
  };
  if(out.minDtMs > out.maxDtMs) throw new RangeError('minDtMs cannot exceed maxDtMs.');
  return out;
}

function normalizeWeapon(raw,weaponId){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new TypeError('weapon ' + weaponId + ' must be an object.');
  }
  return {
    weaponId,
    damage:Math.max(0,finite(raw.damage,'weapon.damage')),
    cooldownMs:Math.max(0,finite(raw.cooldownMs ?? 250,'weapon.cooldownMs')),
    maxRange:Math.max(1,finite(raw.maxRange ?? 100,'weapon.maxRange')),
    hitRadius:Math.max(0.1,finite(raw.hitRadius ?? 2,'weapon.hitRadius')),
    originTolerance:Math.max(0.1,finite(raw.originTolerance ?? 5,'weapon.originTolerance'))
  };
}

export function createActionNetcodeConfig(input={}){
  const base=config(input);
  const weapons={};
  for(const [weaponId,raw] of Object.entries(input.weapons || {})){
    weapons[id(weaponId,'weaponId')]=normalizeWeapon(raw,weaponId);
  }
  return deepFreeze({...base,weapons});
}

function playerState({playerId,position={x:0,y:0,z:0},health,serverTimeMs=0},cfg){
  const pos=vec3(position,'position');
  const hp=health == null ? cfg.maxHealth : Math.min(cfg.maxHealth,Math.max(0,finite(health,'health')));
  const t=finite(serverTimeMs,'serverTimeMs');
  return {
    playerId:id(playerId,'playerId'),
    position:pos,
    velocity:{x:0,y:0,z:0},
    health:hp,
    lastSeq:-1,
    lastClientTimeMs:null,
    lastFireSeq:-1,
    lastFireAt:{},
    history:[{t,position:clone(pos),velocity:{x:0,y:0,z:0},health:hp}]
  };
}

export function createActionWorld({
  players=[],
  processedFireIds=[]
}={},inputConfig={}){
  const cfg=createActionNetcodeConfig(inputConfig);
  const map={};
  for(const raw of players){
    const state=playerState(raw,cfg);
    if(map[state.playerId]) throw new Error('duplicate action player: ' + state.playerId);
    map[state.playerId]=state;
  }
  const base={
    schemaVersion:ACTION_NETCODE_SCHEMA_VERSION,
    version:ACTION_NETCODE_VERSION,
    players:map,
    processedFireIds:[...new Set(processedFireIds.map(String))].slice(-cfg.processedFireLimit)
  };
  return deepFreeze({...base,stateHash:stableHash(base)});
}

function mutableWorld(world){
  return clone(world);
}

function finishWorld(next){
  delete next.stateHash;
  return deepFreeze({...next,stateHash:stableHash(next)});
}

function pruneHistory(history,now,cfg){
  const cutoff=now-cfg.historyWindowMs;
  const rows=history.filter((row,index)=>row.t >= cutoff || index === history.length-1);
  return rows.slice(-Math.max(8,Math.ceil(cfg.historyWindowMs/Math.max(cfg.minDtMs,16))+8));
}

function validateInputShape(input){
  const allowed=new Set(['seq','clientTimeMs','dtMs','moveX','moveZ','jump']);
  const extras=Object.keys(input || {}).filter(key=>!allowed.has(key));
  if(extras.length) throw new Error('action input contains non-intent fields: ' + extras.sort().join(', '));
}

export function applyActionInput(world,playerId,input,{
  serverTimeMs,
  config:rawConfig={}
}={}){
  const cfg=createActionNetcodeConfig(rawConfig);
  if(!input || typeof input !== 'object' || Array.isArray(input)){
    return {ok:false,reason:'input must be an object',world};
  }
  try{ validateInputShape(input); }catch(error){ return {ok:false,reason:error.message,world}; }

  const next=mutableWorld(world);
  const state=next.players[playerId];
  if(!state) return {ok:false,reason:'unknown action player',world};

  let seq,clientTime,dt,moveX,moveZ;
  try{
    seq=nonNegativeInt(input.seq,'seq');
    clientTime=finite(input.clientTimeMs,'clientTimeMs');
    dt=finite(input.dtMs,'dtMs');
    moveX=finite(input.moveX,'moveX');
    moveZ=finite(input.moveZ,'moveZ');
  }catch(error){
    return {ok:false,reason:error.message,world};
  }

  const serverTime=Number(serverTimeMs);
  if(!Number.isFinite(serverTime)) return {ok:false,reason:'serverTimeMs must be finite',world};
  if(seq <= state.lastSeq) return {ok:false,reason:'stale or duplicate input sequence',world};
  if(clientTime > serverTime + cfg.maxClientLeadMs) return {ok:false,reason:'client input is too far ahead',world};
  if(clientTime < serverTime - cfg.maxClientLagMs) return {ok:false,reason:'client input is too old',world};
  if(dt < cfg.minDtMs || dt > cfg.maxDtMs) return {ok:false,reason:'input dt outside server bounds',world};

  const planar=Math.hypot(moveX,moveZ);
  if(planar > cfg.maxMoveMagnitude) return {ok:false,reason:'movement input magnitude exceeds one',world};

  const nx=planar > 1 ? moveX/planar : moveX;
  const nz=planar > 1 ? moveZ/planar : moveZ;
  const seconds=dt/1000;
  const velocity={x:nx*cfg.maxSpeed,y:state.velocity.y,z:nz*cfg.maxSpeed};
  const position=add(state.position,mul(velocity,seconds));

  state.lastSeq=seq;
  state.lastClientTimeMs=clientTime;
  state.velocity=velocity;
  state.position=position;
  state.history.push({
    t:serverTime,
    position:clone(position),
    velocity:clone(velocity),
    health:state.health
  });
  state.history=pruneHistory(state.history,serverTime,cfg);

  const updated=finishWorld(next);
  return deepFreeze({
    ok:true,
    world:updated,
    ackSeq:seq,
    snapshot:{
      serverTimeMs:serverTime,
      ackSeq:seq,
      position:clone(position),
      velocity:clone(velocity),
      health:state.health
    }
  });
}

export function sampleActionHistory(player,atMs){
  if(!player || !Array.isArray(player.history) || !player.history.length) return null;
  const t=Number(atMs);
  if(!Number.isFinite(t)) return null;
  const rows=player.history;

  if(t <= rows[0].t) return clone(rows[0]);
  if(t >= rows[rows.length-1].t) return clone(rows[rows.length-1]);

  for(let i=1;i<rows.length;i++){
    const after=rows[i];
    if(after.t >= t){
      const before=rows[i-1];
      const span=after.t-before.t;
      const alpha=span > 0 ? Math.min(1,Math.max(0,(t-before.t)/span)) : 0;
      return {
        t,
        position:lerp(before.position,after.position,alpha),
        velocity:lerp(before.velocity,after.velocity,alpha),
        health:alpha < 0.5 ? before.health : after.health
      };
    }
  }
  return clone(rows[rows.length-1]);
}

function pointRayHit(origin,direction,maxRange,point,radius){
  const relative=sub(point,origin);
  const along=dot(relative,direction);
  if(along < 0 || along > maxRange) return null;
  const closest=add(origin,mul(direction,along));
  const miss=distance(closest,point);
  return miss <= radius ? {distance:along,miss} : null;
}

function validateFireShape(intent){
  const allowed=new Set(['fireSeq','requestId','weaponId','shotTimeMs','origin','direction']);
  const extras=Object.keys(intent || {}).filter(key=>!allowed.has(key));
  if(extras.length) throw new Error('fire intent contains client-authored outcome fields: ' + extras.sort().join(', '));
}

export function applyFireIntent(world,shooterId,intent,{
  serverTimeMs,
  config:rawConfig={},
  maxWorldHitDistance=null
}={}){
  const cfg=createActionNetcodeConfig(rawConfig);
  if(!intent || typeof intent !== 'object' || Array.isArray(intent)){
    return {ok:false,reason:'fire intent must be an object',world};
  }
  try{ validateFireShape(intent); }catch(error){ return {ok:false,reason:error.message,world}; }

  const next=mutableWorld(world);
  const shooter=next.players[shooterId];
  if(!shooter) return {ok:false,reason:'unknown shooter',world};
  if(shooter.health <= 0) return {ok:false,reason:'shooter is not active',world};

  let fireSeq,requestId,weaponId,shotTime,origin,direction;
  try{
    fireSeq=nonNegativeInt(intent.fireSeq,'fireSeq');
    requestId=id(intent.requestId,'requestId');
    weaponId=id(intent.weaponId,'weaponId');
    shotTime=finite(intent.shotTimeMs,'shotTimeMs');
    origin=vec3(intent.origin,'origin');
    direction=normalized(vec3(intent.direction,'direction'));
  }catch(error){
    return {ok:false,reason:error.message,world};
  }

  if(fireSeq <= (Number.isInteger(shooter.lastFireSeq) ? shooter.lastFireSeq : -1)){
    return {ok:false,reason:'stale or duplicate fire sequence',world};
  }

  const fireKey=shooterId + ':' + requestId;
  if(next.processedFireIds.includes(fireKey)){
    return {ok:false,reason:'duplicate fire request',world};
  }

  const weapon=cfg.weapons[weaponId];
  if(!weapon) return {ok:false,reason:'unknown server weapon',world};

  const now=Number(serverTimeMs);
  if(!Number.isFinite(now)) return {ok:false,reason:'serverTimeMs must be finite',world};
  if(shotTime > now + cfg.maxClientLeadMs) return {ok:false,reason:'shot timestamp is in the future',world};
  if(shotTime < now - cfg.historyWindowMs) return {ok:false,reason:'shot timestamp is outside rewind history',world};

  const previous=Number(shooter.lastFireAt?.[weaponId] ?? -Infinity);
  if(now - previous < weapon.cooldownMs) return {ok:false,reason:'weapon cooldown',world};

  const shooterPose=sampleActionHistory(shooter,shotTime);
  if(!shooterPose) return {ok:false,reason:'missing shooter history',world};
  if(distance(origin,shooterPose.position) > weapon.originTolerance){
    return {ok:false,reason:'shot origin does not match server rewind position',world};
  }

  let best=null;
  const worldLimit=Number.isFinite(maxWorldHitDistance)
    ? Math.min(weapon.maxRange,Math.max(0,maxWorldHitDistance))
    : weapon.maxRange;

  for(const [targetId,target] of Object.entries(next.players)){
    if(targetId === shooterId || target.health <= 0) continue;
    const pose=sampleActionHistory(target,shotTime);
    if(!pose) continue;
    const hit=pointRayHit(origin,direction,worldLimit,pose.position,weapon.hitRadius);
    if(hit && (!best || hit.distance < best.distance)){
      best={targetId,pose,...hit};
    }
  }

  let targetHealth=null;
  if(best){
    const target=next.players[best.targetId];
    target.health=Math.max(0,target.health-weapon.damage);
    targetHealth=target.health;
    target.history.push({
      t:now,
      position:clone(target.position),
      velocity:clone(target.velocity),
      health:target.health
    });
    target.history=pruneHistory(target.history,now,cfg);
  }

  shooter.lastFireSeq=fireSeq;
  shooter.lastFireAt ||= {};
  shooter.lastFireAt[weaponId]=now;
  next.processedFireIds.push(fireKey);
  next.processedFireIds=next.processedFireIds.slice(-cfg.processedFireLimit);

  const updated=finishWorld(next);
  const event={
    fireSeq,
    requestId,
    weaponId,
    serverTimeMs:now,
    shotTimeMs:shotTime,
    hit:Boolean(best),
    targetId:best?.targetId ?? null,
    damage:best ? weapon.damage : 0,
    targetHealth,
    eventHash:stableHash({
      fireSeq,requestId,weaponId,serverTimeMs:now,shotTimeMs:shotTime,
      targetId:best?.targetId ?? null,
      damage:best ? weapon.damage : 0,
      targetHealth
    })
  };

  return deepFreeze({ok:true,world:updated,event});
}

export function buildActionReconciliationPlan({
  authoritativeSnapshot,
  pendingInputs=[]
}){
  if(!authoritativeSnapshot || typeof authoritativeSnapshot !== 'object'){
    throw new TypeError('authoritativeSnapshot is required.');
  }
  const ack=nonNegativeInt(authoritativeSnapshot.ackSeq,'authoritativeSnapshot.ackSeq');
  const pending=pendingInputs
    .filter(row=>row && Number.isInteger(row.seq) && row.seq > ack)
    .map(clone)
    .sort((a,b)=>a.seq-b.seq);

  return deepFreeze({
    authoritative:clone(authoritativeSnapshot),
    ackSeq:ack,
    replayInputs:pending
  });
}
