import { stableStringify } from '../domainSchemas';

export const REPLAY_ACTION_CODEC = 'starblox-r1';
export const REPLAY_ACTION_CHUNK_SIZE = 650;

const PACK_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
const PACK_LOOKUP = new Map([...PACK_ALPHABET].map((char,index) => [char,index]));
const MAX_PACK_DATA_CHARS = 200_000;
const MAX_ACTION_TYPES = 128;
const MAX_ACTION_TYPE_LENGTH = 80;

function cloneJson(value,label='value'){
  try{
    return JSON.parse(JSON.stringify(value));
  }catch{
    throw new TypeError(label + ' must be JSON-compatible.');
  }
}

function cleanTick(value,label='tick'){
  if(!Number.isInteger(value) || value < 0){
    throw new TypeError(label + ' must be a non-negative integer.');
  }
  return value;
}

function normalizeEntry(raw,index){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new TypeError('replay entry ' + index + ' must be an object.');
  }
  const action = cloneJson(raw.action,'replay action');
  if(!action || typeof action !== 'object' || Array.isArray(action)){
    throw new TypeError('replay action ' + index + ' must be an object.');
  }
  if(typeof action.type !== 'string' || !action.type.trim()){
    throw new TypeError('replay action ' + index + ' requires a non-empty type.');
  }
  return {
    tick:cleanTick(raw.tick,'replay entry tick'),
    sequence:Number.isInteger(raw.sequence) && raw.sequence >= 0 ? raw.sequence : index,
    action
  };
}

function normalizeEntries(entries){
  if(!Array.isArray(entries)) throw new TypeError('replay entries must be an array.');
  const normalized = entries.map(normalizeEntry);
  for(let i=1;i<normalized.length;i++){
    const previous = normalized[i - 1];
    const current = normalized[i];
    if(current.tick < previous.tick){
      throw new Error('replay actions require monotonic tick order.');
    }
    if(current.tick === previous.tick && current.sequence < previous.sequence){
      throw new Error('same-tick replay actions require monotonic sequence order.');
    }
  }
  return normalized;
}

function normalizeActionTypes(values){
  if(!Array.isArray(values)) throw new TypeError('actionTypes must be an array.');
  const actionTypes = values.map((value,index) => {
    if(typeof value !== 'string' || !value.trim() || value.length > MAX_ACTION_TYPE_LENGTH){
      throw new TypeError('actionTypes[' + index + '] is invalid.');
    }
    return value;
  });
  if(actionTypes.length > MAX_ACTION_TYPES) throw new RangeError('too many replay action types.');
  if(new Set(actionTypes).size !== actionTypes.length) throw new TypeError('actionTypes must be unique.');
  return actionTypes;
}

function actionPayload(action){
  const payload = {...action};
  delete payload.type;
  return stableStringify(payload);
}

function enc(n){
  let value = Math.max(0,Math.floor(n));
  let out = '';
  do{
    let chunk = value % 32;
    value = Math.floor(value / 32);
    if(value > 0) chunk += 32;
    out += PACK_ALPHABET[chunk];
  }while(value > 0);
  return out;
}

function dec(data,start){
  let value = 0;
  let shift = 1;
  let i = start;

  while(i < data.length){
    const code = PACK_LOOKUP.get(data[i++]);
    if(code == null) return null;
    value += (code % 32) * shift;
    if(code < 32) return {value,next:i};
    shift *= 32;
    if(shift > 1_099_511_627_776) return null;
  }

  return null;
}

function stablePackLine(raw){
  if(!validReplayActionPack(raw)) return 'invalid\n';
  return raw.codec + '|' + raw.count + '|' + raw.actionTypes.join(',') + '|' + raw.data + '\n';
}

function fnv1aHex(lines){
  let hash = 2166136261;
  for(const data of lines){
    for(let i=0;i<data.length;i++){
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash,16777619);
    }
  }
  return (hash >>> 0).toString(16).padStart(8,'0');
}

function packFrom(input){
  return input && typeof input === 'object' && 'actions' in input ? input.actions : input;
}

export function validReplayActionPack(raw){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  if(raw.codec !== REPLAY_ACTION_CODEC) return false;
  if(!Number.isInteger(raw.count) || raw.count < 0 || raw.count > REPLAY_ACTION_CHUNK_SIZE) return false;
  if(!Array.isArray(raw.actionTypes) || raw.actionTypes.length > MAX_ACTION_TYPES) return false;
  if(raw.actionTypes.some(type => typeof type !== 'string' || !type.trim() || type.length > MAX_ACTION_TYPE_LENGTH)) return false;
  if(new Set(raw.actionTypes).size !== raw.actionTypes.length) return false;
  return typeof raw.data === 'string' && raw.data.length <= MAX_PACK_DATA_CHARS;
}

export function encodeReplayActions(entries,{actionTypes}={}){
  const actions = normalizeEntries(entries);
  const types = actionTypes
    ? normalizeActionTypes(actionTypes)
    : Array.from(new Set(actions.map(entry => entry.action.type)));

  for(const entry of actions){
    if(!types.includes(entry.action.type)){
      throw new Error('action type is missing from replay action table: ' + entry.action.type);
    }
  }

  const typeCode = new Map(types.map((type,index) => [type,index]));
  let previousTick = 0;
  let data = '';

  for(const entry of actions){
    if(entry.tick < previousTick) throw new Error('replay actions require monotonic tick order.');
    const payload = actionPayload(entry.action);
    data += enc(entry.tick - previousTick);
    data += enc(typeCode.get(entry.action.type));
    data += enc(payload.length);
    data += payload;
    previousTick = entry.tick;
  }

  if(data.length > MAX_PACK_DATA_CHARS){
    throw new RangeError('encoded replay action pack exceeds size limit.');
  }

  return Object.freeze({
    codec:REPLAY_ACTION_CODEC,
    count:actions.length,
    actionTypes:types,
    data
  });
}

export function decodeReplayActions(pack,{actionTypes}={}){
  if(!validReplayActionPack(pack)) return [];

  let types;
  try{
    types = pack.actionTypes.length
      ? normalizeActionTypes(pack.actionTypes)
      : normalizeActionTypes(actionTypes || []);
  }catch{
    return [];
  }

  const entries = [];
  let index = 0;
  let tick = 0;

  while(index < pack.data.length && entries.length < pack.count){
    const delta = dec(pack.data,index);
    if(!delta) return [];
    index = delta.next;

    const opcode = dec(pack.data,index);
    if(!opcode) return [];
    index = opcode.next;

    const length = dec(pack.data,index);
    if(!length) return [];
    index = length.next;

    const type = types[opcode.value];
    if(!type) return [];
    if(length.value < 0 || index + length.value > pack.data.length) return [];

    const rawPayload = pack.data.slice(index,index + length.value);
    index += length.value;

    let payload;
    try{
      payload = JSON.parse(rawPayload);
    }catch{
      return [];
    }
    if(!payload || typeof payload !== 'object' || Array.isArray(payload)) return [];

    tick += delta.value;
    entries.push({
      tick,
      sequence:entries.length,
      action:{type,...payload}
    });
  }

  if(entries.length !== pack.count || index !== pack.data.length) return [];
  return entries;
}

export function replayActionHash(rootActions,chunks=[]){
  const lines = [
    stablePackLine(rootActions),
    ...chunks.map(chunk => stablePackLine(packFrom(chunk)))
  ];
  return fnv1aHex(lines);
}

export function decodeReplayActionBundle(rootActions,chunks=[]){
  if(!validReplayActionPack(rootActions)) return [];
  const actionTypes = rootActions.actionTypes;
  const entries = [
    ...decodeReplayActions(rootActions,{actionTypes}),
    ...chunks.flatMap(chunk => decodeReplayActions(packFrom(chunk),{actionTypes}))
  ];

  for(let i=1;i<entries.length;i++){
    if(entries[i].tick < entries[i - 1].tick) return [];
  }
  return entries;
}

export function buildReplayActionBundle(entries,{chunkSize=REPLAY_ACTION_CHUNK_SIZE}={}){
  const normalized = normalizeEntries(entries);
  if(!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > REPLAY_ACTION_CHUNK_SIZE){
    throw new RangeError('chunkSize must be between 1 and ' + REPLAY_ACTION_CHUNK_SIZE + '.');
  }

  const actionTypes = Array.from(new Set(normalized.map(entry => entry.action.type)));
  normalizeActionTypes(actionTypes);

  const groups = [];
  for(let i=0;i<normalized.length;i += chunkSize){
    groups.push(normalized.slice(i,i + chunkSize));
  }
  if(groups.length === 0) groups.push([]);

  const rootActions = encodeReplayActions(groups[0],{actionTypes});
  const chunks = groups.slice(1).map((group,index) => Object.freeze({
    schemaVersion:1,
    chunk:index,
    actions:encodeReplayActions(group,{actionTypes})
  }));
  const chunkEventCounts = chunks.map(chunk => chunk.actions.count);
  const actionHash = replayActionHash(rootActions,chunks);

  return Object.freeze({
    rootActions,
    chunks,
    totalCount:normalized.length,
    manifest:Object.freeze({
      complete:true,
      chunkEventCounts,
      actionHash
    })
  });
}

export class ReplayActionRecorder {
  constructor(){
    this.records = [];
  }

  record(action,{tick,sequence}={}){
    const entry = normalizeEntry({
      tick,
      sequence:sequence ?? this.records.length,
      action
    },this.records.length);
    const previous = this.records[this.records.length - 1];
    if(previous && entry.tick < previous.tick){
      throw new Error('recorded replay actions must be monotonic by tick.');
    }
    if(previous && entry.tick === previous.tick && entry.sequence < previous.sequence){
      throw new Error('recorded same-tick replay actions must preserve insertion order.');
    }
    this.records.push(entry);
    return Object.freeze(cloneJson(entry));
  }

  recordScheduled(entry){
    return this.record(entry.action,{tick:entry.tick,sequence:entry.sequence});
  }

  entries(){
    return this.records.map(entry => cloneJson(entry));
  }

  build(options){
    return buildReplayActionBundle(this.entries(),options);
  }
}
