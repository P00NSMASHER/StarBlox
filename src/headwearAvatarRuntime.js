const HEADWEAR_ART = Object.freeze({
  'headwear-1': '/assets/catalog/headwear-1.svg',
  'headwear-2': '/assets/catalog/headwear-2.svg',
  'headwear-3': '/assets/catalog/headwear-3.svg',
  'headwear-4': '/assets/catalog/headwear-4.svg',
  'headwear-5': '/assets/catalog/headwear-5.svg',
  'headwear-6': '/assets/catalog/headwear-6.svg',
  'headwear-7': '/assets/catalog/headwear-7.svg',
  'headwear-8': '/assets/catalog/headwear-8.svg',
  'headwear-9': '/assets/catalog/headwear-9.svg',
  'headwear-10': '/assets/catalog/headwear-10.svg',
  'headwear-11': '/assets/catalog/headwear-11.svg',
  'headwear-12': '/assets/catalog/headwear-12.svg'
});

function equippedHeadwearId(){
  if(typeof localStorage === 'undefined') return '';
  for(const key of ['starblox-save-v2','abvm-brightside-floot-v2','abvm-brightside-floot-v1']){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      const save = JSON.parse(raw);
      if(save?.equipped?.head) return save.equipped.head;
    }catch{}
  }
  return '';
}

function syncHeadwearArt(){
  if(typeof document === 'undefined') return;
  const node = document.querySelector('.headGear');
  if(!node) return;

  const itemId = equippedHeadwearId();
  const assetPath = HEADWEAR_ART[itemId];

  if(assetPath){
    if(node.dataset.portableHeadwearId === itemId) return;
    node.dataset.portableHeadwearId = itemId;
    node.classList.add('portableHeadGear');
    node.textContent = '';
    node.style.setProperty('--headwear-art', `url("${assetPath}")`);
    node.setAttribute('aria-label','Equipped headwear');
    return;
  }

  if(node.dataset.portableHeadwearId){
    delete node.dataset.portableHeadwearId;
    node.classList.remove('portableHeadGear');
    node.style.removeProperty('--headwear-art');
    if(!node.textContent) node.textContent = '★';
  }
}

if(typeof document !== 'undefined'){
  const kick = () => window.setTimeout(syncHeadwearArt,0);
  document.addEventListener('click',kick,true);
  window.addEventListener('storage',kick);

  const observer = new MutationObserver(() => syncHeadwearArt());
  observer.observe(document.documentElement,{childList:true,subtree:true});

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',syncHeadwearArt,{once:true});
  }else{
    syncHeadwearArt();
  }
}

export { HEADWEAR_ART, syncHeadwearArt };
