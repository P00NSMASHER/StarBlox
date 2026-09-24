export const VEHICLE_STATE_SCHEMA = 'starblox-vehicle-state-v1';

const CURRENT = [
  ['school-bus','SchoolBus','transit'],
  ['smart-car','SmartCar','compact'],
  ['farm-truck','FarmTruck','utility'],
  ['cadillac','Cadillac','luxury'],
  ['excavator','Excavator','work'],
  ['jeep','Jeep','utility'],
  ['nascar-truck','NascarTruck','sport'],
  ['tow-truck','TowTruck','service'],
  ['snowplow','Snowplow','service'],
  ['military-truck','MilitaryTruck','utility'],
  ['tank','Tank','display-only'],
  ['limo','Limo','luxury'],
  ['fire-truck','FireTruck','emergency']
];

const LEGACY = [
  ['thunderbird','Thunderbird'],
  ['ladybug','Ladybug'],
  ['offroader','Offroader'],
  ['golf-cart','Golf Cart']
];

function capabilitiesFor(archetype){
  const base=['spawn','despawn','headlights','hazards','paint-token','wheel-style','driving-mode'];
  if(archetype === 'emergency') return [...base,'emergency-lights','emergency-siren'];
  if(archetype === 'display-only') return ['spawn','despawn','paint-token'];
  return base;
}

export const VEHICLE_CATALOG = Object.freeze(Object.fromEntries(
  CURRENT.map(([id,sourceName,archetype]) => [
    id,
    Object.freeze({
      id,
      sourceName,
      archetype,
      era:'current',
      assetStatus:'identifier-only',
      capabilities:Object.freeze(capabilitiesFor(archetype))
    })
  ])
));

export const LEGACY_VEHICLE_CATALOG = Object.freeze(Object.fromEntries(
  LEGACY.map(([id,sourceName]) => [
    id,
    Object.freeze({
      id,
      sourceName,
      archetype:'legacy',
      era:'legacy',
      assetStatus:'identifier-only',
      capabilities:Object.freeze(['spawn','despawn'])
    })
  ])
));

function uniqueStrings(values){
  return [...new Set((values || []).map(String).filter(Boolean))];
}

export function createVehicleState({
  availableVehicleIds=Object.keys(VEHICLE_CATALOG),
  allowLegacy=false
}={}){
  const allowedCatalog = allowLegacy
    ? {...VEHICLE_CATALOG,...LEGACY_VEHICLE_CATALOG}
    : VEHICLE_CATALOG;
  const available={};
  for(const id of uniqueStrings(availableVehicleIds)){
    if(allowedCatalog[id]) available[id]=true;
  }
  return {
    schemaVersion:VEHICLE_STATE_SCHEMA,
    allowLegacy:Boolean(allowLegacy),
    available,
    active:{},
    sequence:0,
    history:[]
  };
}

function assertState(state){
  if(state?.schemaVersion !== VEHICLE_STATE_SCHEMA) throw new Error('invalid vehicle state');
}

function catalogForState(state){
  return state.allowLegacy
    ? {...VEHICLE_CATALOG,...LEGACY_VEHICLE_CATALOG}
    : VEHICLE_CATALOG;
}

function requireVehicle(state,vehicleId){
  const id=String(vehicleId || '');
  const catalog=catalogForState(state);
  const definition=catalog[id];
  if(!definition) throw new Error('unknown vehicle: ' + id);
  if(!state.available?.[id]) throw new Error('vehicle unavailable: ' + id);
  return definition;
}

function appendHistory(next,entry){
  const sequence=(Number(next.sequence)||0)+1;
  return {
    ...next,
    sequence,
    history:[...(next.history||[]),{sequence,...entry}].slice(-128)
  };
}

export function spawnNeutralVehicle(state,{vehicleId,instanceId}={}){
  assertState(state);
  const definition=requireVehicle(state,vehicleId);
  const id=String(instanceId || (vehicleId + '-1'));
  if(state.active?.[id]) throw new Error('vehicle instance already active: ' + id);

  const instance={
    instanceId:id,
    vehicleId:definition.id,
    archetype:definition.archetype,
    assetStatus:definition.assetStatus,
    controls:{
      headlights:false,
      hazards:false,
      emergencyLights:false,
      emergencySiren:false,
      paintToken:'default',
      wheelStyle:'default',
      drivingMode:'normal'
    }
  };

  const next={
    ...state,
    available:{...state.available},
    active:{...state.active,[id]:instance},
    history:[...(state.history||[])]
  };
  return appendHistory(next,{type:'spawn',vehicleId:definition.id,instanceId:id});
}

export function despawnNeutralVehicle(state,{instanceId}={}){
  assertState(state);
  const id=String(instanceId || '');
  if(!state.active?.[id]) throw new Error('vehicle instance not active: ' + id);
  const vehicleId=state.active[id].vehicleId;
  const active={...state.active};
  delete active[id];
  return appendHistory({
    ...state,
    available:{...state.available},
    active,
    history:[...(state.history||[])]
  },{type:'despawn',vehicleId,instanceId:id});
}

export function applyVehicleAction(state,{instanceId,type,value}={}){
  assertState(state);
  const id=String(instanceId || '');
  const instance=state.active?.[id];
  if(!instance) throw new Error('vehicle instance not active: ' + id);
  const definition=(state.allowLegacy ? {...VEHICLE_CATALOG,...LEGACY_VEHICLE_CATALOG} : VEHICLE_CATALOG)[instance.vehicleId];
  const capabilityByType={
    'set-headlights':'headlights',
    'set-hazards':'hazards',
    'set-emergency-lights':'emergency-lights',
    'set-emergency-siren':'emergency-siren',
    'set-paint-token':'paint-token',
    'set-wheel-style':'wheel-style',
    'set-driving-mode':'driving-mode'
  };
  const capability=capabilityByType[type];
  if(!capability) throw new Error('unsupported vehicle action: ' + type);
  if(!definition.capabilities.includes(capability)){
    throw new Error('vehicle ' + instance.vehicleId + ' does not support ' + capability);
  }

  const controls={...instance.controls};
  if(type === 'set-headlights') controls.headlights=Boolean(value);
  if(type === 'set-hazards') controls.hazards=Boolean(value);
  if(type === 'set-emergency-lights') controls.emergencyLights=Boolean(value);
  if(type === 'set-emergency-siren') controls.emergencySiren=Boolean(value);
  if(type === 'set-paint-token') controls.paintToken=String(value || 'default');
  if(type === 'set-wheel-style') controls.wheelStyle=String(value || 'default');
  if(type === 'set-driving-mode') controls.drivingMode=String(value || 'normal');

  return appendHistory({
    ...state,
    available:{...state.available},
    active:{
      ...state.active,
      [id]:{...instance,controls}
    },
    history:[...(state.history||[])]
  },{type,vehicleId:instance.vehicleId,instanceId:id,value:controls});
}

export function vehicleInstanceView(state,instanceId){
  assertState(state);
  const instance=state.active?.[String(instanceId || '')];
  if(!instance) return null;
  const definition=(state.allowLegacy ? {...VEHICLE_CATALOG,...LEGACY_VEHICLE_CATALOG} : VEHICLE_CATALOG)[instance.vehicleId];
  return {
    ...instance,
    sourceName:definition.sourceName,
    era:definition.era,
    capabilities:[...definition.capabilities]
  };
}
