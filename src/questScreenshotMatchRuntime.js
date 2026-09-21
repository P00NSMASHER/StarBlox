const QUEST_SELECTOR = '.questPage .questBoard';
let queued = false;

function titleCase(value){
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g,' ')
    .replace(/\b\w/g,letter => letter.toUpperCase());
}

export function parseQuestKicker(value){
  const [district = 'Brightside City',role = 'practice'] = String(value || '')
    .split('·')
    .map(part => part.trim())
    .filter(Boolean);
  return {district:titleCase(district),role:titleCase(role)};
}

export function questMasteryLabel(skill){
  const value = String(skill || '').toLowerCase();
  return /(story|reading|main idea|inference|evidence|character)/.test(value)
    ? 'READING MASTERY'
    : 'SKILL MASTERY';
}

function setTextIfChanged(node,value){
  if(node && node.textContent !== value) node.textContent = value;
}

function ensureHeader(board){
  const top = board.querySelector('.questTop');
  if(!top) return;
  const core = top.firstElementChild;
  const kicker = core?.querySelector('.kicker');
  const skill = core?.querySelector('h2');
  if(!core || !kicker || !skill) return;

  core.classList.add('questCoreHeader');
  const {district,role} = parseQuestKicker(kicker.textContent);

  let screenTitle = core.querySelector('.questScreenTitle');
  if(!screenTitle){
    screenTitle = document.createElement('span');
    screenTitle.className = 'questScreenTitle';
    screenTitle.textContent = 'QUEST';
    core.prepend(screenTitle);
  }

  let breadcrumb = core.querySelector('.questBreadcrumb');
  if(!breadcrumb){
    breadcrumb = document.createElement('div');
    breadcrumb.className = 'questBreadcrumb';
    core.appendChild(breadcrumb);
  }
  setTextIfChanged(breadcrumb,`${district}  ›  ${skill.textContent.trim()}  ›  ${role}`);

  const counter = top.querySelector('.qCounter');
  if(counter){
    const [step,total] = counter.textContent.trim().split('/');
    counter.setAttribute('aria-label',`Quest action ${step || '1'} of ${total || '5'}`);
    counter.dataset.label = 'ACTION';
  }
}

function decoratePhaseStrip(board){
  const strip = board.querySelector('.questPhaseStrip');
  if(!strip) return;
  strip.querySelectorAll('.questPhase').forEach(phase => {
    const label = phase.querySelector('b')?.textContent?.trim() || '';
    phase.dataset.phase = label.toLowerCase();
    if(phase.classList.contains('isActive')) phase.setAttribute('aria-current','step');
    else phase.removeAttribute('aria-current');
  });
}

function decorateQuestion(board){
  const card = board.querySelector('.questionCard');
  if(!card) return;

  const lesson = card.querySelector('.questLessonCard');
  if(lesson){
    const copy = lesson.querySelector('.questLessonCopy');
    if(copy && !copy.querySelector('.questLearningRhythm')){
      const rhythm = document.createElement('div');
      rhythm.className = 'questLearningRhythm';
      rhythm.innerHTML = '<span>READ</span><i>★</i><span>THINK</span><i>★</i><span>PROVE IT</span>';
      const label = copy.querySelector('.questLessonLabel');
      label?.insertAdjacentElement('afterend',rhythm);
    }
  }

  const answers = card.querySelector('.questAnswerStack, .answers');
  if(answers){
    answers.classList.add('questAnswerStack');
    if(!answers.querySelector('.questAnswerHeading')){
      const heading = document.createElement('div');
      heading.className = 'questAnswerHeading';
      heading.style.order = '-1';
      heading.innerHTML = '<b>CHOOSE THE BEST ANSWER</b><small>Tap one answer. Your choice checks right away.</small>';
      answers.appendChild(heading);
    }

    [...answers.querySelectorAll('.answerButton')].forEach((button,index) => {
      button.dataset.choice = String.fromCharCode(65 + index);
      button.setAttribute('aria-pressed',String(button.classList.contains('correctChoice') || button.classList.contains('wrongChoice')));
    });
  }

  const hint = card.querySelector('.questHintReady');
  if(hint){
    setTextIfChanged(hint.querySelector('b'),'HINT');
    setTextIfChanged(hint.querySelector('span'),'Make one calm try. If it misses, a clue appears — nothing is taken away.');
  }

  const feedback = card.querySelector('.feedback');
  if(feedback){
    feedback.setAttribute('role','status');
    feedback.setAttribute('aria-live','polite');
  }
}

function decorateRail(board){
  const rail = board.querySelector('.questEvidenceRail');
  if(!rail) return;

  const skill = board.querySelector('.questTop h2')?.textContent || '';
  const evidence = rail.querySelector('.questEvidenceCard');
  setTextIfChanged(evidence?.querySelector('.questRailKicker'),questMasteryLabel(skill));

  const today = rail.querySelector('.questTodayCard');
  if(today) setTextIfChanged(today.querySelector('.questRailKicker'),'TODAY’S LEARNING');

  let buddy = rail.querySelector('.questBuddyPanel');
  if(!buddy){
    buddy = document.createElement('section');
    buddy.className = 'questBuddyPanel';
    buddy.innerHTML = '<span class="questBuddyFace" aria-hidden="true">★</span><div><b>YOU’VE GOT THIS!</b><small>Take your time. A careful answer beats a fast guess.</small></div>';
    rail.appendChild(buddy);
  }
}

function decorateEarned(board){
  const bar = board.querySelector('.questEarnedBar');
  if(!bar) return;
  bar.setAttribute('aria-label','Rewards earned during this Quest');
  setTextIfChanged(bar.querySelector('em'),'Earned here stays yours • no speed bonus • no loss for mistakes');
}

export function decorateQuestScreenshotMatch(board){
  if(!board) return false;
  board.classList.add('questScreenshotMatch');
  ensureHeader(board);
  decoratePhaseStrip(board);
  decorateQuestion(board);
  decorateRail(board);
  decorateEarned(board);
  board.dataset.questScreenshotMatch = 'v2';
  return true;
}

function scan(){
  queued = false;
  document.querySelectorAll(QUEST_SELECTOR).forEach(decorateQuestScreenshotMatch);
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
  new MutationObserver(scheduleScan).observe(host,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
}
