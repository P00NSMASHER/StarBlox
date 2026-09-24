
import { stableHash } from '../domainSchemas.js';

export const AI_NPC_SCHEMA_VERSION=1;
export const AI_NPC_VERSION='starblox-ai-npc-v1';

const DEFAULTS=Object.freeze({
  cooldownSeconds:1.5,
  maxInputChars:280,
  maxOutputChars:420,
  memoryLimit:20,
  maxToolCalls:3
});

const FORBIDDEN_TOOL_TOKENS=new Set([
  'reward','currency','coin','coins','xp','star','stars','mastery',
  'purchase','spend','publish','deploy','execute','script','code',
  'datastore','admin','moderate','moderation','ban','kick','http',
  'secret','credential'
]);
const FORBIDDEN_ARG_TOKENS=new Set([
  'reward','currency','coin','coins','xp','star','stars','mastery',
  'score','correct','answer','publish','purchase','spend','script',
  'source','code','command','password','secret','token','credential'
]);
const FORBIDDEN_COMPACT_KEYS=new Set(['selectedanswer','userid','playerid','apikey']);
const SENSITIVE_MEMORY_RE=/(https?:\/\/|www\.|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b\d{7,}\b|discord|snapchat|phone number|home address|street address|password|real name|school name)/i;

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function id(value,label){
  if(typeof value !== 'string' || !value.trim()) throw new TypeError(label + ' is required.');
  return value.trim();
}

function boundedInt(value,def,min,max){
  const n=Number(value);
  if(!Number.isFinite(n)) return def;
  return Math.min(max,Math.max(min,Math.floor(n)));
}

function boundedNumber(value,def,min,max){
  const n=Number(value);
  if(!Number.isFinite(n)) return def;
  return Math.min(max,Math.max(min,n));
}

function semanticTokens(value){
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g,'$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function forbiddenSemanticKey(value,tokenSet,{compactKeys=null}={}){
  const raw=String(value);
  const compact=raw.toLowerCase().replace(/[^a-z0-9]/g,'');
  if(compactKeys?.has(compact)) return true;
  return semanticTokens(raw).some(token=>tokenSet.has(token));
}

function normalizeToolName(value){
  const name=id(value,'tool name');
  if(!/^[a-z][a-z0-9_]{1,63}$/.test(name)){
    throw new TypeError('tool names must be lower_snake_case.');
  }
  if(forbiddenSemanticKey(name,FORBIDDEN_TOOL_TOKENS)){
    throw new Error('tool is outside the AI NPC authority boundary: ' + name);
  }
  return name;
}

function normalizeNpc(raw,index){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new TypeError('npc ' + index + ' must be an object.');
  }
  const npcId=id(raw.npcId,'npc.npcId');
  const systemPrompt=id(raw.systemPrompt,'npc.systemPrompt').slice(0,2400);
  const tools=[...new Set((raw.allowedTools || []).map(normalizeToolName))].sort();
  return {
    npcId,
    systemPrompt,
    allowedTools:tools,
    knowledgeTags:[...new Set((raw.knowledgeTags || []).map(String).map(v=>v.trim()).filter(Boolean))].sort(),
    cooldownSeconds:boundedNumber(raw.cooldownSeconds,DEFAULTS.cooldownSeconds,0.25,30),
    maxInputChars:boundedInt(raw.maxInputChars,DEFAULTS.maxInputChars,32,1000),
    maxOutputChars:boundedInt(raw.maxOutputChars,DEFAULTS.maxOutputChars,64,1000),
    memoryLimit:boundedInt(raw.memoryLimit,DEFAULTS.memoryLimit,0,50),
    maxToolCalls:boundedInt(raw.maxToolCalls,DEFAULTS.maxToolCalls,0,8)
  };
}

export function createAiNpcCatalog({npcs=[]}={}){
  const rows=npcs.map(normalizeNpc).sort((a,b)=>a.npcId.localeCompare(b.npcId));
  if(new Set(rows.map(row=>row.npcId)).size !== rows.length){
    throw new Error('AI NPC IDs must be unique.');
  }
  const base={
    schemaVersion:AI_NPC_SCHEMA_VERSION,
    aiNpcVersion:AI_NPC_VERSION,
    npcs:rows
  };
  return deepFreeze({...base,catalogHash:stableHash(base)});
}

export function createAiNpcState(){
  return deepFreeze({
    schemaVersion:AI_NPC_SCHEMA_VERSION,
    memories:{},
    processedRequestIds:[]
  });
}

function cleanMessage(value,max,label){
  if(typeof value !== 'string') throw new TypeError(label + ' must be a string.');
  const clean=value.trim();
  if(!clean) throw new TypeError(label + ' cannot be empty.');
  if(clean.length > max) throw new RangeError(label + ' exceeds max length.');
  return clean;
}

function safeContext(raw={}){
  const allowed=['district','questId','dailyId','npcAffinity','friendshipLevel','activeMinigame','learningNeed','roleHint'];
  const out={};
  for(const key of allowed){
    const value=raw?.[key];
    if(value == null) continue;
    if(typeof value === 'string') out[key]=value.slice(0,120);
    else if(typeof value === 'number' && Number.isFinite(value)) out[key]=value;
    else if(typeof value === 'boolean') out[key]=value;
  }
  return out;
}

function npcDef(catalog,npcId){
  if(!catalog || catalog.aiNpcVersion !== AI_NPC_VERSION) throw new TypeError('invalid AI NPC catalog.');
  const def=catalog.npcs.find(row=>row.npcId===npcId);
  if(!def) throw new Error('unknown AI NPC: ' + npcId);
  return def;
}

export function buildAiNpcModelRequest({
  catalog,
  npcId,
  state=createAiNpcState(),
  requestId,
  message,
  gameContext={}
}){
  const def=npcDef(catalog,npcId);
  const rid=id(requestId,'requestId');
  if(state.processedRequestIds?.includes(rid)) throw new Error('duplicate AI NPC requestId.');
  const input=cleanMessage(message,def.maxInputChars,'message');
  const memory=Array.isArray(state.memories?.[npcId]) ? state.memories[npcId].slice(-def.memoryLimit) : [];
  return deepFreeze({
    version:AI_NPC_VERSION,
    npcId:def.npcId,
    requestId:rid,
    system:def.systemPrompt,
    input,
    memory:clone(memory),
    knowledgeTags:clone(def.knowledgeTags),
    gameContext:safeContext(gameContext),
    tools:def.allowedTools.map(name=>({name}))
  });
}

function scanArgs(value,path='args',errors=[]){
  if(value == null || typeof value === 'boolean' || typeof value === 'string') return errors;
  if(typeof value === 'number'){
    if(!Number.isFinite(value)) errors.push(path + ' contains non-finite number');
    return errors;
  }
  if(Array.isArray(value)){
    if(value.length > 30) errors.push(path + ' contains too many array items');
    value.slice(0,30).forEach((child,index)=>scanArgs(child,path + '[' + index + ']',errors));
    return errors;
  }
  if(typeof value !== 'object'){
    errors.push(path + ' contains unsupported value');
    return errors;
  }
  const entries=Object.entries(value);
  if(entries.length > 30) errors.push(path + ' contains too many fields');
  for(const [key,child] of entries.slice(0,30)){
    if(forbiddenSemanticKey(key,FORBIDDEN_ARG_TOKENS,{compactKeys:FORBIDDEN_COMPACT_KEYS})){
      errors.push(path + '.' + key + ' crosses authority boundary');
    }
    scanArgs(child,path + '.' + key,errors);
  }
  return errors;
}

function safeMemoryFact(value){
  if(typeof value !== 'string') return null;
  const fact=value.trim().replace(/\s+/g,' ');
  if(!fact || fact.length > 120 || SENSITIVE_MEMORY_RE.test(fact)) return null;
  return fact;
}

export function validateAiNpcModelResponse(catalog,npcId,response,{allowTools=true}={}){
  const def=npcDef(catalog,npcId);
  const errors=[];
  if(!response || typeof response !== 'object' || Array.isArray(response)){
    return {ok:false,errors:['model response must be an object']};
  }

  let text='';
  if(typeof response.text !== 'string' || !response.text.trim()){
    errors.push('model response text is required');
  }else if(response.text.trim().length > def.maxOutputChars){
    errors.push('model response text exceeds maxOutputChars');
  }else{
    text=response.text.trim();
  }

  const calls=[];
  const rawCalls=Array.isArray(response.toolCalls) ? response.toolCalls : [];
  if(!allowTools && rawCalls.length) errors.push('final model response may not request tools');
  if(rawCalls.length > def.maxToolCalls) errors.push('model requested too many tools');

  for(const [index,raw] of rawCalls.slice(0,def.maxToolCalls).entries()){
    if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
      errors.push('toolCalls[' + index + '] must be an object');
      continue;
    }
    let name;
    try{name=normalizeToolName(raw.name);}catch(error){errors.push(error.message);continue;}
    if(!def.allowedTools.includes(name)){
      errors.push('tool not allowed for NPC: ' + name);
      continue;
    }
    const args=raw.args && typeof raw.args === 'object' && !Array.isArray(raw.args) ? clone(raw.args) : {};
    errors.push(...scanArgs(args,'toolCalls[' + index + '].args'));
    calls.push({name,args});
  }

  const facts=[];
  for(const raw of Array.isArray(response.memoryFacts) ? response.memoryFacts.slice(0,def.memoryLimit) : []){
    const fact=safeMemoryFact(raw);
    if(fact) facts.push(fact);
  }

  return errors.length
    ? {ok:false,errors}
    : {
        ok:true,
        value:deepFreeze({
          text,
          toolCalls:calls,
          memoryFacts:[...new Set(facts)].sort()
        })
      };
}

export function applyAiNpcMemoryFacts(state,catalog,npcId,{requestId,facts=[]}){
  const def=npcDef(catalog,npcId);
  const rid=id(requestId,'requestId');
  const next=clone(state ?? createAiNpcState());
  next.memories ||= {};
  next.processedRequestIds ||= [];

  if(next.processedRequestIds.includes(rid)){
    return deepFreeze({duplicate:true,state:next,memories:clone(next.memories[npcId] || [])});
  }

  const current=Array.isArray(next.memories[npcId]) ? next.memories[npcId] : [];
  const accepted=facts.map(safeMemoryFact).filter(Boolean);
  next.memories[npcId]=[...new Set([...current,...accepted])].slice(-def.memoryLimit);
  next.processedRequestIds.push(rid);
  next.processedRequestIds=next.processedRequestIds.slice(-200);

  return deepFreeze({
    duplicate:false,
    state:next,
    memories:clone(next.memories[npcId])
  });
}

export function aiNpcToolNames(catalog,npcId){
  return clone(npcDef(catalog,npcId).allowedTools);
}
