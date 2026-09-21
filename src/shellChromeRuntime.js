const NAV_TARGETS = Object.freeze({
  world: Object.freeze({label:'Room',nav:'room',order:4,ariaLabel:'Room / Brightside City'}),
  quest: Object.freeze({label:'Quests',nav:'quests',order:2,ariaLabel:'Quests'}),
  study: Object.freeze({label:'Study',nav:'study',order:3,ariaLabel:'Study'}),
  home: Object.freeze({label:'Home',nav:'home',order:1,ariaLabel:'Home'}),
  avatar: Object.freeze({label:'Customize',nav:'customize',order:6,ariaLabel:'Customize avatar'}),
  market: Object.freeze({label:'Store',nav:'store',order:5,ariaLabel:'Store'})
});

const NAV_SOURCE_ORDER = Object.freeze(['world','quest','study','home','avatar','market']);

export function resolveShellNavTarget(source){
  return NAV_TARGETS[String(source || '').trim().toLowerCase()] || null;
}

function clickDestination(destination){
  const button = document.querySelector(`.sidebar .navBtn[data-sb-nav="${destination}"]`);
  button?.click();
}

function createSettingsButton(hud){
  if(hud.querySelector('.sbSettingsButton')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sbSettingsButton';
  button.setAttribute('aria-label','Open StarBlox settings');
  button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-controls','sb-settings-popover');
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 8.25A3.75 3.75 0 1 0 12 15.75 3.75 3.75 0 0 0 12 8.25Z"/>
      <path d="M19.14 12.94a7.86 7.86 0 0 0 .05-.94 7.86 7.86 0 0 0-.05-.94l2.02-1.58-1.92-3.32-2.38.96a7.28 7.28 0 0 0-1.62-.94L14.88 3.6h-3.84l-.36 2.58c-.57.24-1.11.55-1.62.94l-2.38-.96-1.92 3.32 2.02 1.58a7.86 7.86 0 0 0-.05.94c0 .32.02.63.05.94l-2.02 1.58 1.92 3.32 2.38-.96c.51.39 1.05.7 1.62.94l.36 2.58h3.84l.36-2.58c.57-.24 1.11-.55 1.62-.94l2.38.96 1.92-3.32-2.02-1.58Z"/>
    </svg>`;

  const popover = document.createElement('div');
  popover.id = 'sb-settings-popover';
  popover.className = 'sbSettingsPopover';
  popover.hidden = true;
  popover.setAttribute('role','dialog');
  popover.setAttribute('aria-label','StarBlox quick settings');
  popover.innerHTML = `
    <strong>StarBlox</strong>
    <span>Quick settings</span>
    <button type="button" data-sb-action="customize">Customize avatar</button>
    <button type="button" data-sb-action="study">Study & backup</button>
    <small>Sound and motion follow your device and browser preferences.</small>`;

  const closePopover = () => {
    popover.hidden = true;
    button.setAttribute('aria-expanded','false');
  };

  button.addEventListener('click',() => {
    const willOpen = popover.hidden;
    popover.hidden = !willOpen;
    button.setAttribute('aria-expanded',String(willOpen));
    if(willOpen) popover.querySelector('button')?.focus();
  });

  popover.addEventListener('click',(event) => {
    const action = event.target?.dataset?.sbAction;
    if(action === 'customize'){
      clickDestination('customize');
      closePopover();
    }
    if(action === 'study'){
      clickDestination('study');
      closePopover();
    }
  });

  document.addEventListener('keydown',(event) => {
    if(event.key === 'Escape' && !popover.hidden){
      closePopover();
      button.focus();
    }
  });

  hud.append(button,popover);
}

function decorateNav(sidebar){
  const buttons = [...sidebar.querySelectorAll('.navBtn')];
  buttons.forEach((button,index) => {
    const source = button.dataset.sbSourceNav || NAV_SOURCE_ORDER[index];
    const target = resolveShellNavTarget(source);
    if(!source || !target) return;

    button.dataset.sbSourceNav = source;
    button.dataset.sbNav = target.nav;
    button.style.order = String(target.order);
    button.setAttribute('aria-label',target.ariaLabel);
    if(button.classList.contains('active')) button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');

    const text = button.querySelector('span');
    if(text && text.textContent !== target.label) text.textContent = target.label;
  });
}

function decorateBrand(hud){
  const brand = hud.querySelector('.brand');
  if(!brand) return;
  brand.setAttribute('aria-label','Go to StarBlox Home');

  if(!brand.dataset.sbHomeRouteGuard){
    brand.dataset.sbHomeRouteGuard = 'true';
    brand.addEventListener('click',(event) => {
      const home = document.querySelector('.sidebar .navBtn[data-sb-nav="home"]');
      if(!home) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      home.click();
    },true);
  }

  const logo = brand.querySelector('.logo');
  if(logo && logo.textContent !== 'STARBLOX★') logo.textContent = 'STARBLOX★';
  const subtitle = brand.querySelector('small');
  if(subtitle && subtitle.textContent !== 'BRIGHTSIDE CITY') subtitle.textContent = 'BRIGHTSIDE CITY';
}

export function applyShellChrome(){
  const hud = document.querySelector('.hud');
  const sidebar = document.querySelector('.sidebar');
  if(sidebar) decorateNav(sidebar);
  if(hud){
    decorateBrand(hud);
    createSettingsButton(hud);
  }
}

let queued = false;
function scheduleApply(){
  if(queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    if(typeof document === 'undefined') return;
    applyShellChrome();
  });
}

if(typeof document !== 'undefined'){
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',scheduleApply,{once:true});
  }else{
    scheduleApply();
  }

  const root = document.getElementById('root');
  if(root){
    new MutationObserver(scheduleApply).observe(root,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:['class']
    });
  }
}
