const MOTION_DURATIONS = Object.freeze({
  press: 180,
  selection: 520,
  screen: 420,
  roomReveal: 760,
  correct: 920,
  equip: 720,
  spark: 860
});

const INTERACTIVE_SELECTOR = [
  '.sidebar .navBtn',
  '.sbSettingsButton',
  '.homeCta',
  '.homeDailyRow button',
  '.homeCustomizeTabs button',
  '.homeCustomizeItem',
  '.storeCard',
  '.sbStoreCategoryRow button',
  '.sbStoreTierRow button',
  '.sbStoreDetailActions button',
  '.questAnswerStack .answerButton',
  '.questReadAloud',
  '.questHintReady button',
  '.primaryButton',
  '.secondaryButton'
].join(',');

const POSITIVE_PATTERN = /\b(correct|great job|nice work|you got it|that's right|that is right|well done|success)\b/i;
const NEGATIVE_PATTERN = /\b(incorrect|not correct|wrong|try again)\b/i;

export function motionDurationFor(kind, reduced = false){
  if(reduced) return 0;
  return MOTION_DURATIONS[kind] ?? MOTION_DURATIONS.selection;
}

export function isPositiveFeedback(text = '', className = ''){
  const value = `${className} ${text}`.trim();
  return POSITIVE_PATTERN.test(value) && !NEGATIVE_PATTERN.test(value);
}

export function isSemanticCorrectFeedback(node){
  if(!node?.classList) return false;
  return node.classList.contains('feedback') &&
    node.classList.contains('good') &&
    !node.classList.contains('learn');
}

export function prefersReducedMotion(){
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function restartClass(node,className,duration){
  if(!node) return;
  node.classList.remove(className);
  // Force a style read so repeated selections/rewards can replay without touching app state.
  void node.offsetWidth;
  node.classList.add(className);
  if(duration > 0) window.setTimeout(() => node.classList.remove(className),duration);
}

function centerOf(node){
  if(!node?.getBoundingClientRect) return null;
  const rect = node.getBoundingClientRect();
  if(rect.width <= 0 && rect.height <= 0) return null;
  return {x:rect.left + rect.width / 2,y:rect.top + rect.height / 2};
}

function emitStarSparks(origin,target,count = 5){
  if(prefersReducedMotion()){
    target?.classList.add('sbMotionStaticCue');
    window.setTimeout(() => target?.classList.remove('sbMotionStaticCue'),450);
    return;
  }
  const start = centerOf(origin);
  const finish = centerOf(target) || start;
  if(!start || !finish) return;

  const layer = document.createElement('div');
  layer.className = 'sbStarSparkLayer';
  layer.setAttribute('aria-hidden','true');
  document.body.appendChild(layer);

  for(let index = 0; index < count; index += 1){
    const spark = document.createElement('span');
    spark.className = 'sbStarSpark';
    spark.textContent = index % 2 ? '✦' : '★';
    const jitterX = (index - (count - 1) / 2) * 11;
    const jitterY = ((index % 3) - 1) * 10;
    spark.style.left = `${start.x}px`;
    spark.style.top = `${start.y}px`;
    spark.style.setProperty('--spark-x',`${finish.x - start.x + jitterX}px`);
    spark.style.setProperty('--spark-y',`${finish.y - start.y + jitterY}px`);
    spark.style.setProperty('--spark-delay',`${index * 48}ms`);
    spark.style.setProperty('--spark-rot',`${(index - 2) * 42}deg`);
    layer.appendChild(spark);
  }

  window.setTimeout(() => layer.remove(),MOTION_DURATIONS.spark + count * 48 + 100);
}

function screenRootFor(node){
  return node?.closest?.('.homeHeroRuntime,.marketPage.sbStoreMatch,.questScreenshotMatch,.studyPage,.roomPage,.avatarPage') || null;
}

function markScreenEntrance(root){
  if(!root || root.dataset.sbMotionScreenSeen) return;
  root.dataset.sbMotionScreenSeen = 'true';
  if(prefersReducedMotion()){
    root.classList.add('sbMotionStaticReady');
    return;
  }
  restartClass(root,'sbMotionScreenEnter',MOTION_DURATIONS.screen);
}

function revealRoomProgress(root){
  const panel = root?.querySelector?.('.homeRoomProgress');
  if(!panel || panel.dataset.sbMotionRevealed) return;
  panel.dataset.sbMotionRevealed = 'true';
  if(prefersReducedMotion()){
    panel.classList.add('sbMotionStaticReady');
    return;
  }
  restartClass(panel,'sbMotionRoomReveal',MOTION_DURATIONS.roomReveal);
}

export function celebrateFeedback(feedback){
  if(!feedback) return;
  const text = feedback.textContent || '';
  const question = feedback.closest('.questionCard') || feedback.closest('.questScreenshotMatch') || feedback;
  const semanticCorrect = isSemanticCorrectFeedback(feedback);

  // Success styling is semantic state, not a timer artifact. Clear it immediately
  // when Quest moves into wrong/clue/retry so reduced-motion state cannot stick.
  if(!semanticCorrect){
    question.classList.remove('sbMotionCorrect');
    feedback.classList.remove('sbMotionStaticCue');
  }

  const signature = `${feedback.className}|${text.trim()}`;
  if(feedback.dataset.sbMotionFeedbackSignature === signature) return;
  feedback.dataset.sbMotionFeedbackSignature = signature;
  if(!semanticCorrect) return;

  const selected = question.querySelector?.('.answerButton.correctChoice') || feedback;
  restartClass(question,'sbMotionCorrect',motionDurationFor('correct',prefersReducedMotion()));
  emitStarSparks(selected,feedback,6);
}

function syncEquippedCards(page){
  page?.querySelectorAll?.('.storeCard').forEach(card => {
    const equipped = card.classList.contains('sbStoreEquipped');
    const wasEquipped = card.dataset.sbMotionEquipped === 'true';
    card.dataset.sbMotionEquipped = equipped ? 'true' : 'false';
    if(equipped && !wasEquipped && card.dataset.sbMotionInitialized){
      const stage = page.querySelector('.sbStoreAvatarStage');
      restartClass(card,'sbMotionEquip',motionDurationFor('equip',prefersReducedMotion()));
      restartClass(stage,'sbMotionEquipStage',motionDurationFor('equip',prefersReducedMotion()));
      emitStarSparks(card,stage || card,6);
    }
    card.dataset.sbMotionInitialized = 'true';
  });
}

function onPointerDown(event){
  const target = event.target.closest?.(INTERACTIVE_SELECTOR);
  if(!target || prefersReducedMotion()) return;
  restartClass(target,'sbMotionPressed',motionDurationFor('press',false));
}

function onClick(event){
  const target = event.target.closest?.(INTERACTIVE_SELECTOR);
  if(!target) return;

  restartClass(target,'sbMotionSelection',motionDurationFor('selection',prefersReducedMotion()));

  const page = target.closest('.marketPage.sbStoreMatch');
  if(target.matches('.storeCard') && page){
    const stage = page.querySelector('.sbStoreAvatarStage');
    emitStarSparks(target,stage || target,4);
  }

  if(target.matches('.sbStoreTry,.sbStoreBuy,.primaryButton') && page){
    const stage = page.querySelector('.sbStoreAvatarStage');
    restartClass(stage,'sbMotionEquipStage',motionDurationFor('equip',prefersReducedMotion()));
    emitStarSparks(target,stage || target,6);
  }

  if(target.matches('.homeCustomizeItem')){
    const home = target.closest('.homeHeroRuntime');
    emitStarSparks(target,home?.querySelector('.homeAvatarMount') || target,4);
  }

  const screen = screenRootFor(target);
  if(screen) markScreenEntrance(screen);
}

function classTokenSet(value = ''){
  return new Set(String(value).trim().split(/\s+/).filter(Boolean));
}

function hasNonMotionClassDelta(previous = '', current = ''){
  const before = classTokenSet(previous);
  const after = classTokenSet(current);
  const tokens = new Set([...before,...after]);
  for(const token of tokens){
    if(before.has(token) === after.has(token)) continue;
    if(!token.startsWith('sbMotion')) return true;
  }
  return false;
}

export function shouldScheduleMotionScan(records = []){
  return records.some(record => {
    if(record.type === 'childList' || record.type === 'characterData') return true;
    if(record.type !== 'attributes') return false;
    if(record.attributeName === 'aria-pressed') return true;
    if(record.attributeName !== 'class') return false;
    const current = record.target?.getAttribute?.('class') || '';
    return hasNonMotionClassDelta(record.oldValue || '',current);
  });
}

let queued = false;
function scan(){
  queued = false;
  document.querySelectorAll('.homeHeroRuntime,.marketPage.sbStoreMatch,.questScreenshotMatch,.studyPage,.roomPage,.avatarPage').forEach(markScreenEntrance);
  document.querySelectorAll('.homeHeroRuntime').forEach(revealRoomProgress);
  document.querySelectorAll('.feedback').forEach(celebrateFeedback);
  document.querySelectorAll('.marketPage.sbStoreMatch').forEach(syncEquippedCards);
}

function scheduleScan(){
  if(queued) return;
  queued = true;
  queueMicrotask(scan);
}

if(typeof document !== 'undefined'){
  document.documentElement.classList.add('sb-motion-ready');
  document.addEventListener('pointerdown',onPointerDown,true);
  document.addEventListener('click',onClick,true);

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',scheduleScan,{once:true});
  else scheduleScan();

  const host = document.getElementById('root') || document.documentElement;
  new MutationObserver(records => {
    if(shouldScheduleMotionScan(records)) scheduleScan();
  }).observe(host,{
    subtree:true,
    childList:true,
    characterData:true,
    attributes:true,
    attributeOldValue:true,
    attributeFilter:['class','aria-pressed']
  });
}
