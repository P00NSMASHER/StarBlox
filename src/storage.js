const CURRENT_KEY = 'starblox-save-v2';
const FLOOT_V2_KEY = 'abvm-brightside-floot-v2';
const FLOOT_V1_KEY = 'abvm-brightside-floot-v1';
const DB_NAME = 'starblox';
const STORE_NAME = 'state';

export function loadLocalSnapshot(){
  if(typeof localStorage === 'undefined') return null;

  for(const key of [CURRENT_KEY,FLOOT_V2_KEY,FLOOT_V1_KEY]){
    try{
      const raw = localStorage.getItem(key);
      if(raw) return JSON.parse(raw);
    }catch{}
  }

  return null;
}

function writeIndexedDb(value){
  if(typeof indexedDB === 'undefined') return;

  try{
    const request = indexedDB.open(DB_NAME,1);

    request.onupgradeneeded = () => {
      if(!request.result.objectStoreNames.contains(STORE_NAME)){
        request.result.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME,'readwrite');
      tx.objectStore(STORE_NAME).put(value,'current');
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    };
  }catch{}
}

export function persistSnapshot(value){
  if(typeof localStorage !== 'undefined'){
    try{
      const raw = JSON.stringify(value);
      localStorage.setItem(CURRENT_KEY,raw);
    }catch{}
  }

  writeIndexedDb(value);
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
          resolve(get.result ?? null);
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

  if(!parsed || typeof parsed !== 'object'){
    throw new Error('That file is not a valid StarBlox save.');
  }

  return parsed;
}
