export const TOWN_STATE_SCHEMA = 'starblox-town-state-v1';

const ROWS = [
  ['town-hall','Town Hall','civic',true],
  ['school','School','education',true],
  ['daycare','Daycare','education',true],
  ['hospital','Hospital','health',true],
  ['fire-department','Fire Department','emergency',true],
  ['bank','Bank','civic',true],
  ['commercial-stores','Commercial Stores','commerce',true],
  ['auto-shop','Auto Shop','commerce',true],
  ['auto-mall','Auto Mall','commerce',true],
  ['church','Church','community',true],
  ['subway','Subway','transport',true],
  ['airport','Airport','transport',true],
  ['yacht','Yacht','recreation',true],
  ['horse-stables','Horse Stables','recreation',true],
  ['burger-barn','Burger Barn','commerce',true],
  ['mystery-zone','Mystery Zone','research-deferred',false],
  ['restricted-zone','Restricted Zone','research-deferred',false]
];

export const TOWN_LOCATION_CATALOG = Object.freeze(Object.fromEntries(
  ROWS.map(([id,label,category,playerFacingEligible]) => [
    id,
    Object.freeze({id,label,category,playerFacingEligible})
  ])
));

export const STARBLOX_PROXY_TOWN_EDGES = Object.freeze([
  ['town-hall','school'],['town-hall','hospital'],['town-hall','bank'],
  ['town-hall','commercial-stores'],['town-hall','church'],['town-hall','subway'],
  ['school','daycare'],['school','burger-barn'],['hospital','fire-department'],
  ['commercial-stores','auto-shop'],['commercial-stores','auto-mall'],
  ['commercial-stores','horse-stables'],['subway','airport'],['airport','yacht']
].map(edge => Object.freeze(edge)));

function uniqueKnown(ids){
  return [...new Set((ids || []).map(String).filter(id => TOWN_LOCATION_CATALOG[id]))];
}

export function createTownState({
  unlockedLocationIds=['town-hall','school','commercial-stores']
}={}){
  const unlocked={};
  for(const id of uniqueKnown(unlockedLocationIds)){
    if(TOWN_LOCATION_CATALOG[id].playerFacingEligible) unlocked[id]=true;
  }
  return {
    schemaVersion:TOWN_STATE_SCHEMA,
    unlocked,
    visits:{},
    lastVisited:null,
    sequence:0,
    history:[]
  };
}

function assertState(state){
  if(state?.schemaVersion !== TOWN_STATE_SCHEMA) throw new Error('invalid town state');
}

function requireLocation(id,{playerFacing=true}={}){
  const location=TOWN_LOCATION_CATALOG[String(id || '')];
  if(!location) throw new Error('unknown town location: ' + id);
  if(playerFacing && !location.playerFacingEligible){
    throw new Error('location is research-deferred: ' + location.id);
  }
  return location;
}

function appendHistory(next,entry){
  const sequence=(Number(next.sequence)||0)+1;
  return {
    ...next,
    sequence,
    history:[...(next.history||[]),{sequence,...entry}].slice(-128)
  };
}

export function unlockTownLocation(state,locationId){
  assertState(state);
  const location=requireLocation(locationId);
  if(state.unlocked?.[location.id]) return state;
  return appendHistory({
    ...state,
    unlocked:{...state.unlocked,[location.id]:true},
    visits:{...state.visits},
    history:[...(state.history||[])]
  },{type:'unlock-location',locationId:location.id});
}

export function visitTownLocation(state,locationId){
  assertState(state);
  const location=requireLocation(locationId);
  if(!state.unlocked?.[location.id]) throw new Error('location locked: ' + location.id);
  const visits={
    ...state.visits,
    [location.id]:(Number(state.visits?.[location.id])||0)+1
  };
  return appendHistory({
    ...state,
    unlocked:{...state.unlocked},
    visits,
    lastVisited:location.id,
    history:[...(state.history||[])]
  },{type:'visit-location',locationId:location.id,visitCount:visits[location.id]});
}

function adjacency(){
  const map={};
  for(const id of Object.keys(TOWN_LOCATION_CATALOG)) map[id]=[];
  for(const [a,b] of STARBLOX_PROXY_TOWN_EDGES){
    map[a].push(b);
    map[b].push(a);
  }
  return map;
}

export function deriveTownRoute(state,fromId,toId){
  assertState(state);
  const from=requireLocation(fromId);
  const to=requireLocation(toId);
  if(!state.unlocked?.[from.id]) throw new Error('route origin locked: ' + from.id);
  if(!state.unlocked?.[to.id]) throw new Error('route destination locked: ' + to.id);
  if(from.id === to.id) return [from.id];

  const graph=adjacency();
  const queue=[[from.id]];
  const seen=new Set([from.id]);
  while(queue.length){
    const path=queue.shift();
    const current=path[path.length-1];
    for(const next of graph[current] || []){
      if(seen.has(next) || !state.unlocked?.[next]) continue;
      const nextPath=[...path,next];
      if(next === to.id) return nextPath;
      seen.add(next);
      queue.push(nextPath);
    }
  }
  return null;
}

export function townLocationView(state,locationId){
  assertState(state);
  const location=requireLocation(locationId,{playerFacing:false});
  return {
    ...location,
    unlocked:Boolean(state.unlocked?.[location.id]),
    visits:Number(state.visits?.[location.id])||0,
    lastVisited:state.lastVisited === location.id
  };
}
