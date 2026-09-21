const DESTINATION_ALIASES = Object.freeze({
  market: 'store',
  quest: 'quests',
  avatar: 'customize'
});

export function normalizeHomeDestination(label){
  const normalized = String(label || '').trim().toLowerCase();
  return DESTINATION_ALIASES[normalized] || normalized;
}

function clickDestination(label){
  const destination = normalizeHomeDestination(label);
  const buttons = [...document.querySelectorAll('.sidebar .navBtn')];
  const target = buttons.find(button => {
    const dataLabel = String(button.dataset.sbNav || '').toLowerCase();
    const textLabel = String(button.textContent || '').trim().toLowerCase();
    return dataLabel === destination || textLabel === destination || textLabel.includes(destination);
  });
  target?.click();
}

function ensureDailySafetyNote(root){
  const panel = root.querySelector('.homeDailyQuests');
  if(!panel || panel.querySelector('.homeDailySafeNote')) return;
  const note = document.createElement('div');
  note.className = 'homeDailySafeNote';
  note.innerHTML = `
    <span aria-hidden="true">♥</span>
    <p><b>Wrong answers are okay!</b><small>Practice still helps you grow, and nothing you own is ever lost.</small></p>`;
  panel.appendChild(note);
}

function ensureDreamBenefits(root){
  const panel = root.querySelector('.homeDreamGoal');
  if(!panel || panel.querySelector('.homeDreamBenefits')) return;
  const benefits = document.createElement('ul');
  benefits.className = 'homeDreamBenefits';
  benefits.setAttribute('aria-label','Dream Goal benefits');
  benefits.innerHTML = `
    <li>Earn it through learning</li>
    <li>Keep it forever once unlocked</li>
    <li>Your progress is never taken away</li>`;
  const progress = panel.querySelector('.homeDreamProgress');
  panel.insertBefore(benefits,progress || panel.querySelector('.homeDreamNumbers'));
}

function ensureWorldMessage(root){
  if(root.querySelector('.homeWorldMessage')) return;
  const message = document.createElement('aside');
  message.className = 'homeWorldMessage glassPanel';
  message.setAttribute('aria-label','StarBlox encouragement');
  message.innerHTML = `
    <span class="homeWorldStar" aria-hidden="true">★</span>
    <p><strong>Smart Kids Change the World!</strong><small>What you learn today helps build a brighter tomorrow.</small></p>`;
  root.appendChild(message);
}

function decorateBuddy(root){
  const bubble = root.querySelector('.homeBuddyBubble');
  if(!bubble || bubble.querySelector('.homeBuddyRole')) return;
  const role = document.createElement('span');
  role.className = 'homeBuddyRole';
  role.textContent = 'My Best Buddy';
  bubble.prepend(role);
}

function repairDestinations(root){
  root.querySelectorAll('[data-go]').forEach(button => {
    const normalized = normalizeHomeDestination(button.dataset.go);
    if(normalized) button.dataset.go = normalized[0].toUpperCase() + normalized.slice(1);
  });

  const dreamButton = root.querySelector('.homeKeepLearning');
  if(dreamButton && !dreamButton.dataset.screenshotRouteGuard){
    dreamButton.dataset.screenshotRouteGuard = 'true';
    dreamButton.addEventListener('click',event => {
      if(!/choose next dream/i.test(dreamButton.textContent || '')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      clickDestination('store');
    },true);
  }
}

export function decorateHomeScreenshotMatch(root){
  if(!root) return false;

  const roomHeading = root.querySelector('.homeRoomProgress .homePanelHeading > span');
  if(roomHeading) roomHeading.textContent = 'ROOM PROGRESS — 5 TIERS';

  const dreamHeading = root.querySelector('.homeDreamGoal .homePanelHeading > span');
  if(dreamHeading) dreamHeading.textContent = 'MY DREAM GOAL';

  const customizeHeading = root.querySelector('.homeCustomize .homePanelHeading > span');
  if(customizeHeading) customizeHeading.textContent = 'CUSTOMIZE ME!';

  const learningHeading = root.querySelector('.homeLearning .homePanelHeading > span');
  if(learningHeading) learningHeading.textContent = 'TODAY I’M LEARNING…';

  ensureDailySafetyNote(root);
  ensureDreamBenefits(root);
  ensureWorldMessage(root);
  decorateBuddy(root);
  repairDestinations(root);
  root.dataset.screenshotMatchHome = 'v1';
  return true;
}

let queued = false;
function scan(){
  queued = false;
  document.querySelectorAll('.homeHeroRuntime').forEach(root => decorateHomeScreenshotMatch(root));
}

function scheduleScan(){
  if(queued) return;
  queued = true;
  queueMicrotask(scan);
}

if(typeof document !== 'undefined'){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',scheduleScan,{once:true});
  else scheduleScan();

  const host = document.getElementById('root') || document.documentElement;
  new MutationObserver(scheduleScan).observe(host,{subtree:true,childList:true});
}
