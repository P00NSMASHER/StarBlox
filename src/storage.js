const CURRENT_KEY = 'starblox-save-v2';
const FLOOT_V2_KEY = 'abvm-brightside-floot-v2';
const FLOOT_V1_KEY = 'abvm-brightside-floot-v1';
const DB_NAME = 'starblox';
const STORE_NAME = 'state';

function isRecord(value){
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function uniqueStrings(value){
  if(!Array.isArray(value)) return undefined;
  return Array.from(new Set(value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())));
}

function finiteNonNegative(value){
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function cleanNumericRecord(value){
  if(!isRecord(value)) return undefined;
  const cleaned = {};
  for(const [key,raw] of Object.entries(value)){
    const number = finiteNonNegative(raw);
    if(number !== undefined) cleaned[key] = number;
  }
  return cleaned;
}

function cleanEquipped(value){
  if(!isRecord(value)) return undefined;
  const cleaned = {};
  for(const [key,raw] of Object.entries(value)){
    if(typeof raw === 'string' && raw.trim()) cleaned[key] = raw.trim();
  }
  return cleaned;
}

function cleanStats(value){
  if(!isRecord(value)) return undefined;
  const cleaned = {};
  for(const [skill,rawStat] of Object.entries(value)){
    if(!isRecord(rawStat)) continue;
    const stat = {...rawStat};
    for(const key of ['seen','correct','wrong','lastSeen','independentCorrect','masteryCorrect']){
      const number = finiteNonNegative(rawStat[key]);
      stat[key] = number ?? 0;
    }
    cleaned[skill] = stat;
  }
  return cleaned;
}

// Shape-only recovery. This deliberately does not validate inventory IDs against
// the current catalog/art manifest: an owned/equipped item must survive even if
// its art is absent or a future build has not mirrored that asset yet.
export function sanitizeSnapshotShape(raw){
  if(!isRecord(raw)) return {};

  const cleaned = {...raw};
  const owned = uniqueStrings(raw.owned);
  const purchaseReceipts = uniqueStrings(raw.purchaseReceipts);
  const mastered = uniqueStrings(raw.mastered);
  const roomDecor = uniqueStrings(raw.roomDecor);
  const equipped = cleanEquipped(raw.equipped);
  const daily = cleanNumericRecord(raw.daily);
  const districtProgress = cleanNumericRecord(raw.districtProgress);
  const stats = cleanStats(raw.stats);

  if(owned === undefined) delete cleaned.owned; else cleaned.owned = owned;
  if(purchaseReceipts === undefined) delete cleaned.purchaseReceipts; else cleaned.purchaseReceipts = purchaseReceipts;
  if(mastered === undefined) delete cleaned.mastered; else cleaned.mastered = mastered;
  if(roomDecor === undefined) delete cleaned.roomDecor; else cleaned.roomDecor = roomDecor;
  if(equipped === undefined) delete cleaned.equipped; else cleaned.equipped = equipped;
  if(daily === undefined) delete cleaned.daily; else cleaned.daily = daily;
  if(districtProgress === undefined) delete cleaned.districtProgress; else cleaned.districtProgress = districtProgress;
  if(stats === undefined) delete cleaned.stats; else cleaned.stats = stats;

  for(const key of ['coins','stars','xp','starWorth','questsCompleted','transferWins','companionBond']){
    const number = finiteNonNegative(raw[key]);
    if(number === undefined) delete cleaned[key]; else cleaned[key] = number;
  }

  if(typeof raw.dreamGoalId !== 'string' || !raw.dreamGoalId.trim()) delete cleaned.dreamGoalId;
  else cleaned.dreamGoalId = raw.dreamGoalId.trim();

  for(const key of ['activeQuestReceipt','lastCompletedQuestReceipt']){
    if(typeof raw[key] !== 'string') delete cleaned[key];
    else cleaned[key] = raw[key].trim();
  }

  if(typeof raw.lastDailyKey !== 'string') delete cleaned.lastDailyKey;

  return cleaned;
}

export function loadLocalSnapshot(){
  if(typeof localStorage === 'undefined') return null;

  for(const key of [CURRENT_KEY,FLOOT_V2_KEY,FLOOT_V1_KEY]){
    try{
      const raw = localStorage.getItem(key);
      if(raw) return sanitizeSnapshotShape(JSON.parse(raw));
    }catch{}
  }

  return null;
}

function writeLocalSnapshot(value){
  if(typeof localStorage === 'undefined') return false;
  try{
    localStorage.setItem(CURRENT_KEY,JSON.stringify(value));
    return true;
  }catch{
    return false;
  }
}

function writeIndexedDb(value,{preserveExisting=false,onExisting,onMissing,onError}={}){
  if(typeof indexedDB === 'undefined'){
    onError?.();
    return;
  }

  let callbackSettled = false;
  const settle = (callback,arg) => {
    if(callbackSettled) return;
    callbackSettled = true;
    callback?.(arg);
  };

  try{
    const request = indexedDB.open(DB_NAME,1);

    request.onupgradeneeded = () => {
      if(!request.result.objectStoreNames.contains(STORE_NAME)){
        request.result.createObjectStore(STORE_NAME);
      }
    };

    request.onerror = () => settle(onError);

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME,'readwrite');
      const store = tx.objectStore(STORE_NAME);

      if(preserveExisting){
        const get = store.get('current');
        get.onsuccess = () => {
          if(get.result == null){
            store.put(value,'current');
            settle(onMissing);
          }else{
            settle(onExisting,sanitizeSnapshotShape(get.result));
          }
        };
        get.onerror = () => settle(onError);
      }else{
        store.put(value,'current');
      }

      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        settle(onError);
        db.close();
      };
    };
  }catch{
    settle(onError);
  }
}

export function persistSnapshot(value){
  let hadCurrentLocal = false;
  let canUseLocal = typeof localStorage !== 'undefined';

  if(canUseLocal){
    try{
      hadCurrentLocal = localStorage.getItem(CURRENT_KEY) !== null;
    }catch{
      canUseLocal = false;
    }
  }

  // If a current local snapshot exists, normal persistence can update both
  // stores immediately. When IndexedDB is unavailable, localStorage remains
  // the authoritative fallback for both new and returning players.
  if(hadCurrentLocal || typeof indexedDB === 'undefined'){
    if(canUseLocal) writeLocalSnapshot(value);
    writeIndexedDb(value);
    return;
  }

  // Fresh/missing localStorage is a recovery state until IndexedDB has been
  // checked. Do not write the default render into CURRENT_KEY first: a refresh
  // during that async hydration window would make the next boot prefer the
  // default local snapshot and strand a recoverable IndexedDB backup. If a
  // backup exists, mirror that backup into localStorage; otherwise establish
  // this value as the new save in both stores.
  writeIndexedDb(value,{
    preserveExisting:true,
    onExisting:(backup) => {
      if(canUseLocal) writeLocalSnapshot(backup);
    },
    onMissing:() => {
      if(canUseLocal) writeLocalSnapshot(value);
    },
    onError:() => {
      if(canUseLocal) writeLocalSnapshot(value);
    }
  });
}

export function readIndexedDbBackup(){
  if(typeof indexedDB === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    try{
      const request = indexedDB.open(DB_NAME,1);

      request.onupgradeneeded = () => {
        if(!request.result.objectStoreNames.contains(STORE_NAME)){
          request.result.createObjectStore(STORE_NAME);
        }
      };

      request.onerror = () => resolve(null);

      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME,'readonly');
        const get = tx.objectStore(STORE_NAME).get('current');

        get.onsuccess = () => {
          resolve(get.result == null ? null : sanitizeSnapshotShape(get.result));
          db.close();
        };

        get.onerror = () => {
          resolve(null);
          db.close();
        };
      };
    }catch{
      resolve(null);
    }
  });
}

export function exportSave(value){
  return JSON.stringify(value,null,2);
}

export function importSave(raw){
  if(typeof raw !== 'string' || !raw.trim()){
    throw new Error('Choose a StarBlox save file or paste save JSON first.');
  }

  const parsed = JSON.parse(raw);

  if(!isRecord(parsed)){
    throw new Error('That file is not a valid StarBlox save.');
  }

  return sanitizeSnapshotShape(parsed);
}
