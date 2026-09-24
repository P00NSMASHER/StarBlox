export const RESIDENTIAL_STATE_SCHEMA = 'starblox-residential-state-v1';

export const RESIDENTIAL_FEATURES = Object.freeze({
  'front-door':Object.freeze({kind:'door',capabilities:['open-close']}),
  'garage-door':Object.freeze({kind:'door',capabilities:['open-close']}),
  'sliding-door':Object.freeze({kind:'door',capabilities:['open-close']}),
  'mailbox':Object.freeze({kind:'container',capabilities:['open-close']}),
  'safe':Object.freeze({kind:'container',capabilities:['open-close']}),
  'oven':Object.freeze({kind:'appliance',capabilities:['open-close']}),
  'fridge':Object.freeze({kind:'appliance',capabilities:['open-close']}),
  'dishwasher':Object.freeze({kind:'appliance',capabilities:['open-close']}),
  'hot-tub':Object.freeze({kind:'amenity',capabilities:['power']}),
  'doorbell':Object.freeze({kind:'interaction',capabilities:['ring']}),
  'room-change':Object.freeze({kind:'layout',capabilities:['select-room']}),
  'house-controls':Object.freeze({kind:'control',capabilities:['set-mode']}),
  'fire-disaster-control':Object.freeze({kind:'control',capabilities:['set-mode']}),
  'dresser-storage':Object.freeze({kind:'storage',capabilities:['open-close']})
});

const hasOwn=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);

function availableMap(featureIds){
  const ids=[...new Set((featureIds || Object.keys(RESIDENTIAL_FEATURES)).map(String))];
  const map={};
  for(const id of ids){
    if(RESIDENTIAL_FEATURES[id]) map[id]=true;
  }
  return map;
}

export function createResidentialState({
  availableFeatureIds=Object.keys(RESIDENTIAL_FEATURES),
  activeRoom='default',
  mode='default'
}={}){
  return {
    schemaVersion:RESIDENTIAL_STATE_SCHEMA,
    available:availableMap(availableFeatureIds),
    open:{},
    powered:{},
    doorbellRings:0,
    activeRoom:String(activeRoom || 'default'),
    mode:String(mode || 'default'),
    sequence:0,
    history:[]
  };
}

function requireFeature(state,featureId,capability){
  if(!state?.available?.[featureId]) throw new Error('feature unavailable: ' + featureId);
  const feature=RESIDENTIAL_FEATURES[featureId];
  if(!feature?.capabilities?.includes(capability)){
    throw new Error('feature ' + featureId + ' does not support ' + capability);
  }
  return feature;
}

function appendHistory(next,entry){
  const sequence=(Number(next.sequence)||0)+1;
  return {
    ...next,
    sequence,
    history:[...(next.history||[]),{sequence,...entry}].slice(-64)
  };
}

export function applyResidentialAction(state,action={}){
  if(state?.schemaVersion !== RESIDENTIAL_STATE_SCHEMA){
    throw new Error('invalid residential state');
  }
  const featureId=String(action.featureId || '');
  const type=String(action.type || '');
  const next={
    ...state,
    available:{...state.available},
    open:{...state.open},
    powered:{...state.powered},
    history:[...(state.history||[])]
  };

  if(type === 'set-open'){
    requireFeature(state,featureId,'open-close');
    next.open[featureId]=Boolean(action.value);
    return appendHistory(next,{featureId,type,value:next.open[featureId]});
  }

  if(type === 'toggle-open'){
    requireFeature(state,featureId,'open-close');
    next.open[featureId]=!Boolean(state.open?.[featureId]);
    return appendHistory(next,{featureId,type,value:next.open[featureId]});
  }

  if(type === 'toggle-power'){
    requireFeature(state,featureId,'power');
    next.powered[featureId]=!Boolean(state.powered?.[featureId]);
    return appendHistory(next,{featureId,type,value:next.powered[featureId]});
  }

  if(type === 'ring'){
    requireFeature(state,featureId,'ring');
    next.doorbellRings=Math.max(0,Number(state.doorbellRings)||0)+1;
    return appendHistory(next,{featureId,type,value:next.doorbellRings});
  }

  if(type === 'select-room'){
    requireFeature(state,featureId,'select-room');
    const room=String(action.room || '').trim();
    if(!room) throw new Error('room required');
    next.activeRoom=room;
    return appendHistory(next,{featureId,type,value:room});
  }

  if(type === 'set-mode'){
    requireFeature(state,featureId,'set-mode');
    const mode=String(action.mode || '').trim();
    if(!mode) throw new Error('mode required');
    next.mode=mode;
    return appendHistory(next,{featureId,type,value:mode});
  }

  throw new Error('unsupported residential action: ' + type);
}

export function residentialFeatureState(state,featureId){
  const feature=RESIDENTIAL_FEATURES[featureId] || null;
  if(!feature) return null;
  return {
    id:featureId,
    kind:feature.kind,
    available:Boolean(state?.available?.[featureId]),
    open:hasOwn(state?.open||{},featureId) ? Boolean(state.open[featureId]) : null,
    powered:hasOwn(state?.powered||{},featureId) ? Boolean(state.powered[featureId]) : null
  };
}
