
import { stableHash } from '../domainSchemas.js';

export const ACTION_AUTHORITY_SCHEMA_VERSION=1;
export const ACTION_AUTHORITY_VERSION='starblox-action-authority-v1';

const ALLOWED_ACTIONS=new Set(['move','interact','primary','secondary','dash']);
const FORBIDDEN_FIELDS=new Set([
  'position','pos','x','y','z','velocity','health','damage','score','reward',
  'coins','xp','stars','mastery','correct','hit','hitPlayer','serverState'
]);
const MAX_HISTORY=180;

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
  if(typeof value !== 'number' || !Number.isFinite(value)){
    throw new TypeError(label + ' must be a finite number.');
  }
  return value;
}

function integer(value,label,min=0){
  if(!Number.isInteger(value) || value < min){
    throw new TypeError(label + ' must be an integer >= ' + min + '.');
  }
  return value;
}

function normalizeVector2(x,z){
  const mx=finite(x,'moveX');
  const mz=finite(z,'moveZ');
  const magnitude=Math.hypot(mx,mz);
  if(magnitude <= 1 || magnitude === 0) return {x:mx,z:mz};
  return {x:mx / magnitude,z:mz / magnitude};
}

function normalizeAim(x,y,z){
  const ax=finite(x,'aimX');
  const ay=finite(y,'aimY');
  const az=finite(z,'aimZ');
  const magnitude=Math.hypot(ax,ay,az);
  if(magnitude < 1e-9) return {x:0,y:0,z:0};
  return {x:ax / magnitude,y:ay / magnitude,z:az / magnitude};
}

function ensureNoOutcomeFields(intent){
  for(const key of Object.keys(intent || {})){
    if(FORBIDDEN_FIELDS.has(key)){
      throw new Error('client intent contains authoritative outcome/state field: ' + key);
    }
  }
}

function normalizeIntent(intent,serverTick,{
  maxRewindTicks,
  maxFutureTicks
}){
  if(!intent || typeof intent !== 'object' || Array.isArray(intent)){
    throw new TypeError('intent must be an object.');
  }
  ensureNoOutcomeFields(intent);

  const allowed=new Set([
    'sequence','clientTick','moveX','moveZ','jump','action',
    'aimX','aimY','aimZ','targetId'
  ]);
  const extras=Object.keys(intent).filter(key => !allowed.has(key));
  if(extras.length){
    throw new Error('unsupported client intent fields: ' + extras.sort().join(', '));
  }

  const sequence=integer(intent.sequence,'sequence',1);
  const clientTick=integer(intent.clientTick,'clientTick',0);
  const lower=Math.max(0,serverTick - maxRewindTicks);
  const upper=serverTick + maxFutureTicks;
  if(clientTick < lower) throw new Error('clientTick is outside rewind window');
  if(clientTick > upper) throw new Error('clientTick is too far ahead of server');

  const move=normalizeVector2(intent.moveX ?? 0,intent.moveZ ?? 0);
  const action=typeof intent.action === 'string' ? intent.action : 'move';
  if(!ALLOWED_ACTIONS.has(action)) throw new Error('unsupported action intent: ' + action);

  const aim=normalizeAim(intent.aimX ?? 0,intent.aimY ?? 0,intent.aimZ ?? 0);
  const targetId=intent.targetId == null ? null : String(intent.targetId);

  return {
    sequence,
    clientTick,
    moveX:move.x,
    moveZ:move.z,
    jump:Boolean(intent.jump),
    action,
    aimX:aim.x,
    aimY:aim.y,
    aimZ:aim.z,
    targetId
  };
}

function cleanPosition(value,label){
  if(!value || typeof value !== 'object') throw new TypeError(label + ' is required.');
  return {
    x:finite(value.x,label + '.x'),
    y:finite(value.y,label + '.y'),
    z:finite(value.z,label + '.z')
  };
}

function cleanPlayerSnapshot(raw,id){
  if(!raw || typeof raw !== 'object') throw new TypeError('snapshot player ' + id + ' must be an object.');
  return {
    position:cleanPosition(raw.position,'snapshot position'),
    velocity:raw.velocity
      ? cleanPosition(raw.velocity,'snapshot velocity')
      : {x:0,y:0,z:0},
    radius:Number.isFinite(raw.radius) ? Math.max(0.1,raw.radius) : 2
  };
}

function trimHistory(values,max=MAX_HISTORY){
  return values.length > max ? values.slice(values.length - max) : values;
}

function statePayload(state){
  return {
    schemaVersion:state.schemaVersion,
    authorityVersion:state.authorityVersion,
    serverTick:state.serverTick,
    config:state.config,
    players:state.players,
    commandHistory:state.commandHistory,
    snapshots:state.snapshots
  };
}

function finalize(state){
  const base={
    schemaVersion:ACTION_AUTHORITY_SCHEMA_VERSION,
    authorityVersion:ACTION_AUTHORITY_VERSION,
    serverTick:state.serverTick,
    config:clone(state.config),
    players:clone(state.players),
    commandHistory:clone(state.commandHistory),
    snapshots:clone(state.snapshots)
  };
  return deepFreeze({
    ...base,
    authorityHash:stableHash(statePayload(base))
  });
}

export function createActionAuthorityState({
  serverTick=0,
  maxRewindTicks=60,
  maxFutureTicks=2,
  maxSequenceGap=120,
  maxCommandsPerPlayer=180,
  maxSnapshots=120
}={}){
  return finalize({
    serverTick:integer(serverTick,'serverTick',0),
    config:{
      maxRewindTicks:integer(maxRewindTicks,'maxRewindTicks',1),
      maxFutureTicks:integer(maxFutureTicks,'maxFutureTicks',0),
      maxSequenceGap:integer(maxSequenceGap,'maxSequenceGap',1),
      maxCommandsPerPlayer:integer(maxCommandsPerPlayer,'maxCommandsPerPlayer',8),
      maxSnapshots:integer(maxSnapshots,'maxSnapshots',2)
    },
    players:{},
    commandHistory:[],
    snapshots:[]
  });
}

export function verifyActionAuthorityState(state){
  const errors=[];
  if(!state || typeof state !== 'object' || Array.isArray(state)){
    return {ok:false,errors:['authority state must be an object']};
  }
  if(state.schemaVersion !== ACTION_AUTHORITY_SCHEMA_VERSION) errors.push('unsupported authority schema');
  if(state.authorityVersion !== ACTION_AUTHORITY_VERSION) errors.push('unsupported authority version');
  try{
    if(stableHash(statePayload(state)) !== state.authorityHash){
      errors.push('authority state hash mismatch');
    }
  }catch{
    errors.push('authority state is not hashable');
  }
  return {ok:errors.length === 0,errors};
}

export function submitActionIntent(state,{playerId,intent}){
  const validation=verifyActionAuthorityState(state);
  if(!validation.ok) throw new Error('invalid authority state: ' + validation.errors[0]);
  const id=String(playerId);
  if(!id) throw new TypeError('playerId is required.');

  const command=normalizeIntent(intent,state.serverTick,state.config);
  const previous=state.players[id] || {
    lastSequence:0,
    accepted:0,
    rejected:0,
    lastAckTick:state.serverTick
  };

  if(command.sequence <= previous.lastSequence){
    return {
      accepted:false,
      reason:'duplicate_or_out_of_order_sequence',
      state
    };
  }
  if(command.sequence - previous.lastSequence > state.config.maxSequenceGap){
    return {
      accepted:false,
      reason:'sequence_gap_too_large',
      state
    };
  }

  const budgetWindowStart=Math.max(0,state.serverTick - 60);
  const playerCommands=state.commandHistory.filter(row =>
    row.playerId === id && row.serverReceivedTick >= budgetWindowStart
  );
  if(playerCommands.length >= state.config.maxCommandsPerPlayer){
    return {
      accepted:false,
      reason:'command_budget_exceeded',
      state
    };
  }

  const next=finalize({
    ...state,
    players:{
      ...state.players,
      [id]:{
        ...previous,
        lastSequence:command.sequence,
        accepted:previous.accepted + 1,
        lastAckTick:state.serverTick
      }
    },
    commandHistory:trimHistory([
      ...state.commandHistory,
      {playerId:id,serverReceivedTick:state.serverTick,...command}
    ],Math.max(MAX_HISTORY,state.config.maxCommandsPerPlayer * 4))
  });

  return {
    accepted:true,
    command:deepFreeze(clone(command)),
    state:next
  };
}

export function advanceAuthorityTick(state,{ticks=1}={}){
  const validation=verifyActionAuthorityState(state);
  if(!validation.ok) throw new Error('invalid authority state: ' + validation.errors[0]);
  const delta=integer(ticks,'ticks',1);
  return finalize({...state,serverTick:state.serverTick + delta});
}

export function recordAuthoritativeSnapshot(state,{tick=state.serverTick,players}){
  const validation=verifyActionAuthorityState(state);
  if(!validation.ok) throw new Error('invalid authority state: ' + validation.errors[0]);
  const snapshotTick=integer(tick,'snapshot tick',0);
  if(snapshotTick > state.serverTick) throw new Error('snapshot tick cannot be in the future');
  if(!players || typeof players !== 'object' || Array.isArray(players)){
    throw new TypeError('players snapshot must be an object.');
  }

  const clean={};
  for(const [id,value] of Object.entries(players)){
    clean[String(id)]=cleanPlayerSnapshot(value,id);
  }

  const snapshots=[
    ...state.snapshots.filter(row => row.tick !== snapshotTick),
    {tick:snapshotTick,players:clean}
  ]
    .sort((a,b) => a.tick - b.tick)
    .slice(-state.config.maxSnapshots);

  return finalize({...state,snapshots});
}

export function snapshotAtOrBefore(state,tick){
  const validation=verifyActionAuthorityState(state);
  if(!validation.ok) throw new Error('invalid authority state: ' + validation.errors[0]);
  const target=integer(tick,'tick',0);
  let chosen=null;
  for(const snapshot of state.snapshots){
    if(snapshot.tick <= target) chosen=snapshot;
    else break;
  }
  return chosen ? deepFreeze(clone(chosen)) : null;
}

export function rewindTickForIntent(state,clientTick){
  const requested=integer(clientTick,'clientTick',0);
  return Math.max(state.serverTick - state.config.maxRewindTicks,Math.min(state.serverTick,requested));
}

function commandForPlayerAt(state,playerId,tick,action){
  const id=String(playerId);
  let chosen=null;
  for(const command of state.commandHistory){
    if(command.playerId !== id) continue;
    if(command.clientTick > tick) continue;
    if(action && command.action !== action) continue;
    if(!chosen || command.clientTick > chosen.clientTick || (
      command.clientTick === chosen.clientTick && command.sequence > chosen.sequence
    )){
      chosen=command;
    }
  }
  return chosen;
}

function dot(a,b){
  return a.x*b.x + a.y*b.y + a.z*b.z;
}

function unitBetween(a,b){
  const dx=b.x-a.x;
  const dy=b.y-a.y;
  const dz=b.z-a.z;
  const distance=Math.hypot(dx,dy,dz);
  return {
    distance,
    direction:distance > 1e-9
      ? {x:dx/distance,y:dy/distance,z:dz/distance}
      : {x:0,y:0,z:0}
  };
}

export function validateLagCompensatedHit(state,{
  shooterId,
  targetId,
  clientTick,
  weapon
}){
  const validation=verifyActionAuthorityState(state);
  if(!validation.ok) throw new Error('invalid authority state: ' + validation.errors[0]);
  if(!weapon || typeof weapon !== 'object') throw new TypeError('server weapon spec is required.');

  const range=Math.max(0.1,finite(weapon.range,'weapon.range'));
  const minDot=Math.min(1,Math.max(-1,finite(weapon.minAimDot ?? 0.92,'weapon.minAimDot')));
  const rewindTick=rewindTickForIntent(state,clientTick);
  const snapshot=snapshotAtOrBefore(state,rewindTick);
  if(!snapshot) return {verified:false,reason:'no_rewind_snapshot',rewindTick};

  const shooter=snapshot.players[String(shooterId)];
  const target=snapshot.players[String(targetId)];
  if(!shooter || !target) return {verified:false,reason:'player_missing_from_snapshot',rewindTick};

  const command=commandForPlayerAt(state,shooterId,rewindTick,'primary');
  if(!command) return {verified:false,reason:'no_primary_action_intent',rewindTick};
  if(command.targetId != null && String(command.targetId) !== String(targetId)){
    return {verified:false,reason:'target_intent_mismatch',rewindTick};
  }

  const aim={x:command.aimX,y:command.aimY,z:command.aimZ};
  const targetVector=unitBetween(shooter.position,target.position);
  if(targetVector.distance > range + target.radius){
    return {verified:false,reason:'target_out_of_range',rewindTick,distance:targetVector.distance};
  }

  const aimDot=dot(aim,targetVector.direction);
  if(aimDot < minDot){
    return {verified:false,reason:'target_outside_aim_cone',rewindTick,distance:targetVector.distance,aimDot};
  }

  return {
    verified:true,
    reason:'geometry_verified_requires_server_line_of_sight',
    rewindTick,
    distance:targetVector.distance,
    aimDot,
    shooterPosition:clone(shooter.position),
    targetPosition:clone(target.position),
    sequence:command.sequence
  };
}

export function authorityStateDigest(state){
  const validation=verifyActionAuthorityState(state);
  if(!validation.ok) throw new Error('invalid authority state: ' + validation.errors[0]);
  return state.authorityHash;
}
