export const BALANCE_CONFIG_SCHEMA_VERSION = 1;

const LIMITS = Object.freeze({
  coinsMult:[0.75,1.25],
  xpMult:[0.75,1.25],
  wrongXpMult:[0.5,1.5],
  retryXpMult:[0.5,1.5],
  difficultyMult:[0.8,1.25],
  stageCountOffset:[-1,2],
  optionalCountOffset:[-2,3]
});

const IDENTITY = Object.freeze({
  schemaVersion:BALANCE_CONFIG_SCHEMA_VERSION,
  version:'',
  economy:Object.freeze({
    coinsMult:1,
    xpMult:1,
    wrongXpMult:1,
    retryXpMult:1
  }),
  quest:Object.freeze({
    difficultyMult:1,
    stageCountOffset:0,
    optionalCountOffset:0
  })
});

let current=IDENTITY;
let currentDoc=null;
let currentDiagnostics=[];

function isObject(value){
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanVersion(value){
  return typeof value === 'string'
    ? value.replace(/[^A-Za-z0-9._-]/g,'').slice(0,40)
    : '';
}

function clampNumber(value,def,min,max,path,diagnostics,{integer=false}={}){
  const numeric=typeof value === 'number' && Number.isFinite(value)
    ? value
    : def;
  let resolved=integer ? Math.round(numeric) : numeric;
  const before=resolved;
  resolved=Math.min(max,Math.max(min,resolved));
  if(value !== undefined && (!Number.isFinite(value) || resolved !== before)){
    diagnostics.push({type:'clamped',path,requested:value,resolved});
  }
  return resolved;
}

function clone(value){
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function resolveBalanceDoc(raw){
  if(!isObject(raw)){
    return {resolved:IDENTITY,sanitizedDoc:null,diagnostics:[]};
  }

  const diagnostics=[];
  const economy=isObject(raw.economy) ? raw.economy : {};
  const quest=isObject(raw.quest) ? raw.quest : {};

  const resolved=Object.freeze({
    schemaVersion:BALANCE_CONFIG_SCHEMA_VERSION,
    version:cleanVersion(raw.version),
    economy:Object.freeze({
      coinsMult:clampNumber(economy.coinsMult,1,...LIMITS.coinsMult,'economy.coinsMult',diagnostics),
      xpMult:clampNumber(economy.xpMult,1,...LIMITS.xpMult,'economy.xpMult',diagnostics),
      wrongXpMult:clampNumber(economy.wrongXpMult,1,...LIMITS.wrongXpMult,'economy.wrongXpMult',diagnostics),
      retryXpMult:clampNumber(economy.retryXpMult,1,...LIMITS.retryXpMult,'economy.retryXpMult',diagnostics)
    }),
    quest:Object.freeze({
      difficultyMult:clampNumber(quest.difficultyMult,1,...LIMITS.difficultyMult,'quest.difficultyMult',diagnostics),
      stageCountOffset:clampNumber(quest.stageCountOffset,0,...LIMITS.stageCountOffset,'quest.stageCountOffset',diagnostics,{integer:true}),
      optionalCountOffset:clampNumber(quest.optionalCountOffset,0,...LIMITS.optionalCountOffset,'quest.optionalCountOffset',diagnostics,{integer:true})
    })
  });

  const sanitizedDoc={
    version:resolved.version,
    economy:{...resolved.economy},
    quest:{...resolved.quest}
  };

  return {
    resolved,
    sanitizedDoc,
    diagnostics:Object.freeze(diagnostics.map(item => Object.freeze({...item})))
  };
}

export function setBalanceDoc(raw){
  const {resolved,sanitizedDoc,diagnostics}=resolveBalanceDoc(raw);
  current=resolved;
  currentDoc=sanitizedDoc ? clone(sanitizedDoc) : null;
  currentDiagnostics=[...diagnostics];
  return current;
}

export function resetBalance(){
  current=IDENTITY;
  currentDoc=null;
  currentDiagnostics=[];
}

export function getBalance(){
  return current;
}

export function balanceVersion(){
  return current.version;
}

export function balanceDocSnapshot(){
  return currentDoc ? clone(currentDoc) : null;
}

export function balanceDiagnostics(){
  return currentDiagnostics.map(item => ({...item}));
}

export function balanceQuestReward(reward,{correct,wasRetry=false,balance=current}={}){
  const source=reward && typeof reward === 'object' ? reward : {};
  const xpMultiplier=!correct
    ? balance.economy.wrongXpMult
    : wasRetry
      ? balance.economy.retryXpMult
      : balance.economy.xpMult;

  return {
    ...source,
    coins:Math.max(0,Math.round((Number(source.coins) || 0) * balance.economy.coinsMult)),
    xp:Math.max(0,Math.round((Number(source.xp) || 0) * xpMultiplier)),
    // These are evidence/state signals, not economy knobs. Remote balance cannot
    // manufacture mastery, transfer evidence, Stars, or district progress.
    stars:Number(source.stars) || 0,
    transferEvidence:Number(source.transferEvidence) || 0,
    districtProgress:Number(source.districtProgress) || 0,
    masteryAwarded:Boolean(source.masteryAwarded)
  };
}

export function balanceQuestStructure({
  stageCount=5,
  optionalCount=3,
  balance=current
}={}){
  const stages=Math.max(1,Math.round(stageCount + balance.quest.stageCountOffset));
  const optional=Math.max(0,Math.round(optionalCount + balance.quest.optionalCountOffset));
  return {stageCount:stages,optionalCount:optional};
}

export function effectiveQuestionDifficulty(difficulty,{balance=current}={}){
  const base=typeof difficulty === 'number' && Number.isFinite(difficulty) ? difficulty : 1;
  return Math.max(0.1,base * balance.quest.difficultyMult);
}

/**
 * Provider-neutral remote loader. The caller supplies a function that retrieves
 * a config document from whatever backend is eventually chosen.
 *
 * Missing/error/timeout => identity config. Remote data can override numbers,
 * never define executable behavior.
 */
export async function loadRemoteBalance(fetchDoc,{timeoutMs=6000}={}){
  if(typeof fetchDoc !== 'function') throw new TypeError('fetchDoc must be a function.');
  const ms=Number.isFinite(timeoutMs) ? Math.max(1,Math.floor(timeoutMs)) : 6000;

  try{
    const raw=await Promise.race([
      Promise.resolve().then(() => fetchDoc()),
      new Promise((_,reject) => setTimeout(() => reject(new Error('timeout')),ms))
    ]);
    return setBalanceDoc(raw);
  }catch{
    resetBalance();
    return getBalance();
  }
}

export const BALANCE_LIMITS=LIMITS;
export const IDENTITY_BALANCE=IDENTITY;
