const NAV_LABELS = ['Home','Quests','Study','Room','Customize','Store'];

function clickNav(index){
  const buttons = document.querySelectorAll('.sidebar .navBtn');
  buttons[index]?.click();
}

function createSettingsButton(hud){
  if(hud.querySelector('.sbSettingsButton')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sbSettingsButton';
  button.setAttribute('aria-label','Open StarBlox settings');
  button.setAttribute('aria-expanded','false');
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 8.25A3.75 3.75 0 1 0 12 15.75 3.75 3.75 0 0 0 12 8.25Z"/>
      <path d="M19.14 12.94a7.86 7.86 0 0 0 .05-.94 7.86 7.86 0 0 0-.05-.94l2.02-1.58-1.92-3.32-2.38.96a7.28 7.28 0 0 0-1.62-.94L14.88 3.6h-3.84l-.36 2.58c-.57.24-1.11.55-1.62.94l-2.38-.96-1.92 3.32 2.02 1.58a7.86 7.86 0 0 0-.05.94c0 .32.02.63.05.94l-2.02 1.58 1.92 3.32 2.38-.96c.51.39 1.05.7 1.62.94l.36 2.58h3.84l.36-2.58c.57-.24 1.11-.55 1.62-.94l2.38.96 1.92-3.32-2.02-1.58Z"/>
    </svg>`;

  const popover = document.createElement('div');
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
      clickNav(4);
      closePopover();
    }
    if(action === 'study'){
      clickNav(2);
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
    const label = NAV_LABELS[index];
    if(!label) return;
    button.dataset.sbNav = label.toLowerCase();
    button.setAttribute('aria-label',label === 'Customize' ? 'Customize avatar' : label);
    if(button.classList.contains('active')) button.setAttribute('aria-current','page');
    else button.removeAttribute('aria-current');

    const text = button.querySelector('span');
    if(text && text.textContent !== label) text.textContent = label;
  });
}

function decorateBrand(hud){
  const brand = hud.querySelector('.brand');
  if(!brand) return;
  brand.setAttribute('aria-label','Go to StarBlox Home');
  const logo = brand.querySelector('.logo');
  if(logo && logo.textContent !== 'STARBLOX★') logo.textContent = 'STARBLOX★';
  const subtitle = brand.querySelector('small');
  if(subtitle && subtitle.textContent !== 'BRIGHTSIDE CITY') subtitle.textContent = 'BRIGHTSIDE CITY';
}

function applyShellChrome(){
  const hud = document.querySelector('.hud');
  const sidebar = document.querySelector('.sidebar');
  if(hud){
    decorateBrand(hud);
    createSettingsButton(hud);
  }
  if(sidebar) decorateNav(sidebar);
}

let queued = false;
function scheduleApply(){
  if(queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
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
