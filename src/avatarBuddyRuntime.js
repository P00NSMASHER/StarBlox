const SAVE_KEYS = Object.freeze([
  'starblox-save-v2',
  'abvm-brightside-floot-v2',
  'abvm-brightside-floot-v1'
]);

const DEFAULT_EQUIPPED = Object.freeze({
  top:'tops-1',
  bottom:'bottoms-1',
  shoes:'shoes-1',
  head:'',
  face:'',
  back:'',
  hand:'',
  aura:'',
  companion:'companions-1'
});

export function companionAsset(itemId){
  return /^companions-(?:[1-9]|1[0-2])$/.test(String(itemId || ''))
    ? `/assets/catalog/${itemId}.svg`
    : '/assets/catalog/companions-1.svg';
}

export function readAvatarPresentationState(storage = typeof localStorage === 'undefined' ? null : localStorage){
  let save = null;
  if(storage){
    for(const key of SAVE_KEYS){
      try{
        const raw = storage.getItem(key);
        if(!raw) continue;
        const parsed = JSON.parse(raw);
        if(parsed && typeof parsed === 'object'){
          save = parsed;
          break;
        }
      }catch{}
    }
  }

  const equipped = {...DEFAULT_EQUIPPED,...(save?.equipped || {})};
  return {
    top:equipped.top || DEFAULT_EQUIPPED.top,
    bottom:equipped.bottom || DEFAULT_EQUIPPED.bottom,
    shoes:equipped.shoes || DEFAULT_EQUIPPED.shoes,
    head:equipped.head || '',
    face:equipped.face || '',
    back:equipped.back || '',
    hand:equipped.hand || '',
    aura:equipped.aura || '',
    companion:equipped.companion || DEFAULT_EQUIPPED.companion,
    companionBond:Number.isFinite(Number(save?.companionBond)) ? Number(save.companionBond) : 0
  };
}

function applyStateToAvatar(root,state){
  if(!root) return;
  root.classList.add('sbPremiumAvatar');
  root.dataset.top = state.top;
  root.dataset.bottom = state.bottom;
  root.dataset.shoes = state.shoes;
  root.dataset.head = state.head;
  root.dataset.face = state.face;
  root.dataset.back = state.back;
  root.dataset.hand = state.hand;
  root.dataset.aura = state.aura;
  root.dataset.companion = state.companion;
  root.classList.toggle('hasHeadGear',!!state.head);
  root.classList.toggle('hasFaceGear',!!state.face);
  root.classList.toggle('hasBackGear',!!state.back);
  root.classList.toggle('hasHandGear',!!state.hand);
  root.classList.toggle('hasAura',!!state.aura);

  const buddy = root.querySelector('.buddy');
  if(buddy) decorateBuddy(buddy,state,'sbBuddyPortrait');
}

function decorateBuddy(node,state,className){
  if(!node) return;
  let image = node.querySelector(`.${className}`);
  if(!image){
    image = document.createElement('img');
    image.className = className;
    image.alt = '';
    image.setAttribute('aria-hidden','true');
    node.prepend(image);
  }
  const src = companionAsset(state.companion);
  if(image.getAttribute('src') !== src) image.setAttribute('src',src);
  node.dataset.companionId = state.companion;
  node.querySelectorAll('svg').forEach(icon => icon.setAttribute('aria-hidden','true'));
}

function decorateCompanionCards(state){
  document.querySelectorAll('.buddyCard').forEach(card => decorateBuddy(card,state,'sbBuddyCardPortrait'));
}

export function syncAvatarBuddyPresentation(){
  if(typeof document === 'undefined') return;
  const state = readAvatarPresentationState();
  document.querySelectorAll('.avatarWrap').forEach(root => applyStateToAvatar(root,state));
  decorateCompanionCards(state);
}

let queued = false;
function queueSync(delay = 0){
  if(typeof window === 'undefined') return;
  if(delay){
    window.setTimeout(syncAvatarBuddyPresentation,delay);
    return;
  }
  if(queued) return;
  queued = true;
  window.requestAnimationFrame(() => {
    queued = false;
    syncAvatarBuddyPresentation();
  });
}

if(typeof document !== 'undefined'){
  const start = () => {
    const observer = new MutationObserver(() => queueSync());
    observer.observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('click',() => {
      queueSync(24);
      queueSync(120);
    },true);
    window.addEventListener('storage',() => queueSync());
    queueSync();
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
}

export { DEFAULT_EQUIPPED, SAVE_KEYS };
