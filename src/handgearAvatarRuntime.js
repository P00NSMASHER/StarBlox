const HANDGEAR_ART = Object.freeze({
  'handgear-1': '/assets/catalog/handgear-1.svg',
  'handgear-2': '/assets/catalog/handgear-2.svg',
  'handgear-3': '/assets/catalog/handgear-3.svg',
  'handgear-4': '/assets/catalog/handgear-4.svg',
  'handgear-5': '/assets/catalog/handgear-5.svg',
  'handgear-6': '/assets/catalog/handgear-6.svg',
  'handgear-7': '/assets/catalog/handgear-7.svg',
  'handgear-8': '/assets/catalog/handgear-8.svg',
  'handgear-9': '/assets/catalog/handgear-9.svg',
  'handgear-10': '/assets/catalog/handgear-10.svg',
  'handgear-11': '/assets/catalog/handgear-11.svg',
  'handgear-12': '/assets/catalog/handgear-12.svg'
});

function equippedHandgearId(){
  if(typeof localStorage === 'undefined') return '';
  for(const key of ['starblox-save-v2','abvm-brightside-floot-v2','abvm-brightside-floot-v1']){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      const save = JSON.parse(raw);
      if(save?.equipped?.hand) return save.equipped.hand;
    }catch{}
  }
  return '';
}

function syncHandgearArt(){
  if(typeof document === 'undefined') return;
  const node = document.querySelector('.handGear');
  if(!node) return;

  const itemId = equippedHandgearId();
  const assetPath = HANDGEAR_ART[itemId];

  if(assetPath){
    if(node.dataset.portableHandgearId === itemId) return;
    node.dataset.portableHandgearId = itemId;
    node.classList.add('portableHandGear');
    node.textContent = '';
    node.style.setProperty('--handgear-art', `url("${assetPath}")`);
    node.setAttribute('aria-label','Equipped hand gear');
    return;
  }

  if(node.dataset.portableHandgearId){
    delete node.dataset.portableHandgearId;
    node.classList.remove('portableHandGear');
    node.style.removeProperty('--handgear-art');
    if(!node.textContent) node.textContent = '◆';
  }
}

if(typeof document !== 'undefined'){
  const kick = () => window.setTimeout(syncHandgearArt,0);
  document.addEventListener('click',kick,true);
  window.addEventListener('storage',kick);

  const observer = new MutationObserver(() => syncHandgearArt());
  observer.observe(document.documentElement,{childList:true,subtree:true});

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',syncHandgearArt,{once:true});
  }else{
    syncHandgearArt();
  }
}

export { HANDGEAR_ART, syncHandgearArt };
