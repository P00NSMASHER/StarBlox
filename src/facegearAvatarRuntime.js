const FACEGEAR_ART = Object.freeze({
  'facegear-1': '/assets/catalog/facegear-1.svg',
  'facegear-2': '/assets/catalog/facegear-2.svg',
  'facegear-3': '/assets/catalog/facegear-3.svg',
  'facegear-4': '/assets/catalog/facegear-4.svg',
  'facegear-5': '/assets/catalog/facegear-5.svg',
  'facegear-6': '/assets/catalog/facegear-6.svg',
  'facegear-7': '/assets/catalog/facegear-7.svg',
  'facegear-8': '/assets/catalog/facegear-8.svg',
  'facegear-9': '/assets/catalog/facegear-9.svg',
  'facegear-10': '/assets/catalog/facegear-10.svg',
  'facegear-11': '/assets/catalog/facegear-11.svg',
  'facegear-12': '/assets/catalog/facegear-12.svg'
});

function equippedFacegearId(){
  if(typeof localStorage === 'undefined') return '';
  for(const key of ['starblox-save-v2','abvm-brightside-floot-v2','abvm-brightside-floot-v1']){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      const save = JSON.parse(raw);
      if(save?.equipped?.face) return save.equipped.face;
    }catch{}
  }
  return '';
}

function syncFacegearArt(){
  if(typeof document === 'undefined') return;
  const node = document.querySelector('.faceGear');
  if(!node) return;

  const itemId = equippedFacegearId();
  const assetPath = FACEGEAR_ART[itemId];

  if(assetPath){
    if(node.dataset.portableFacegearId === itemId) return;
    node.dataset.portableFacegearId = itemId;
    node.classList.add('portableFaceGear');
    node.textContent = '';
    node.style.setProperty('--facegear-art', `url("${assetPath}")`);
    node.setAttribute('aria-label','Equipped face gear');
    return;
  }

  if(node.dataset.portableFacegearId){
    delete node.dataset.portableFacegearId;
    node.classList.remove('portableFaceGear');
    node.style.removeProperty('--facegear-art');
    if(!node.textContent) node.textContent = '◇';
  }
}

if(typeof document !== 'undefined'){
  const kick = () => window.setTimeout(syncFacegearArt,0);
  document.addEventListener('click',kick,true);
  window.addEventListener('storage',kick);

  const observer = new MutationObserver(() => syncFacegearArt());
  observer.observe(document.documentElement,{childList:true,subtree:true});

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',syncFacegearArt,{once:true});
  }else{
    syncFacegearArt();
  }
}

export { FACEGEAR_ART, syncFacegearArt };
