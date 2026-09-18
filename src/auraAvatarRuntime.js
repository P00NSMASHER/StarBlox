const AURA_ART = Object.freeze({
  'auras-1': '/assets/catalog/auras-1.svg',
  'auras-2': '/assets/catalog/auras-2.svg',
  'auras-3': '/assets/catalog/auras-3.svg',
  'auras-4': '/assets/catalog/auras-4.svg',
  'auras-5': '/assets/catalog/auras-5.svg',
  'auras-6': '/assets/catalog/auras-6.svg',
  'auras-7': '/assets/catalog/auras-7.svg',
  'auras-8': '/assets/catalog/auras-8.svg',
  'auras-9': '/assets/catalog/auras-9.svg',
  'auras-10': '/assets/catalog/auras-10.svg',
  'auras-11': '/assets/catalog/auras-11.svg',
  'auras-12': '/assets/catalog/auras-12.svg',
});

function equippedAuraId(){
  if(typeof localStorage === 'undefined') return '';
  for(const key of ['starblox-save-v2','abvm-brightside-floot-v2','abvm-brightside-floot-v1']){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      const save = JSON.parse(raw);
      if(save?.equipped?.aura) return save.equipped.aura;
    }catch{}
  }
  return '';
}

function syncAuraArt(){
  if(typeof document === 'undefined') return;
  const node = document.querySelector('.avatarAura');
  if(!node) return;
  const itemId = equippedAuraId();
  const assetPath = AURA_ART[itemId];
  if(assetPath){
    if(node.dataset.portableAuraId === itemId) return;
    node.dataset.portableAuraId = itemId;
    node.classList.add('portableAura');
    node.textContent = '';
    node.style.setProperty('--aura-art', `url("${assetPath}")`);
    node.setAttribute('aria-label','Equipped aura');
    return;
  }
  if(node.dataset.portableAuraId){
    delete node.dataset.portableAuraId;
    node.classList.remove('portableAura');
    node.style.removeProperty('--aura-art');
    if(!node.textContent) node.textContent = '✦ ✧ ✦';
  }
}

if(typeof document !== 'undefined'){
  const kick = () => window.setTimeout(syncAuraArt,0);
  document.addEventListener('click',kick,true);
  window.addEventListener('storage',kick);
  const observer = new MutationObserver(() => syncAuraArt());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',syncAuraArt,{once:true});
  }else{
    syncAuraArt();
  }
}

export { AURA_ART, syncAuraArt };
