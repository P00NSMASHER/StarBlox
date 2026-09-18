const SAVE_KEYS = ['starblox-save-v2','abvm-brightside-floot-v2','abvm-brightside-floot-v1'];
let queued = false;
let questStart = null;
let lastQuestSignature = '';

function readSave(){
  for(const key of SAVE_KEYS){
    try{
      const raw = localStorage.getItem(key);
      if(raw) return JSON.parse(raw);
    }catch{}
  }
  return {};
}

function numberFromText(value){
  const match = String(value || '').replace(/,/g,'').match(/-?\d+/);
  return match ? Number(match[0]) : 0;
}

function currentHud(){
  const currencies = [...document.querySelectorAll('.hud .currency')];
  const coinNode = currencies.find(node => /coins/i.test(node.textContent));
  const starNode = currencies.find(node => /stars/i.test(node.textContent));
  const xpNode = document.querySelector('.hud .levelBox small');
  return {
    coins:numberFromText(coinNode?.textContent),
    stars:numberFromText(starNode?.textContent),
    xp:numberFromText(xpNode?.textContent)
  };
}

function roleFromKicker(kicker){
  const pieces = String(kicker || '').split('·').map(value => value.trim().toLowerCase());
  return pieces[1] || 'practice';
}

function skillKey(label){
  return String(label || '').trim().toLowerCase().replace(/\s+/g,'-');
}

function evidenceLabel(stat,mastered){
  if(mastered) return 'Strong in Practice';
  if((stat?.masteryCorrect || 0) >= 2) return 'Growing';
  if((stat?.seen || 0) > 0) return 'Learning';
  return 'New';
}

function getOrCreate(parent,className,tag='div'){
  let node = parent.querySelector(':scope > .' + className);
  if(!node){
    node = document.createElement(tag);
    node.className = className;
    parent.appendChild(node);
  }
  return node;
}

function setHtmlIfChanged(node,signature,html){
  if(node.dataset.signature === signature) return;
  node.innerHTML = html;
  node.dataset.signature = signature;
}

function splitPrompt(text){
  const chunks = String(text || '').split(/\n\s*\n/).map(value => value.trim()).filter(Boolean);
  if(chunks.length > 1){
    return {passage:chunks.slice(0,-1).join('\n\n'),stem:chunks[chunks.length-1]};
  }
  return {passage:'',stem:chunks[0] || ''};
}

function updatePhaseStrip(board,role){
  const strip = getOrCreate(board,'questPhaseStrip','div');
  const phases = [
    ['diagnose','Diagnose','Find what you know'],
    ['practice','Practice','Build the skill'],
    ['review','Review','Bring it back'],
    ['transfer','Transfer','Use it somewhere new']
  ];
  const active = role === 'teach' ? 'practice' : role;
  const signature = active;
  setHtmlIfChanged(strip,signature,phases.map(([id,label,detail],index) => `
    <div class="questPhase ${id === active ? 'isActive' : ''}">
      <span>${index + 1}</span><div><b>${label}</b><small>${detail}</small></div>
    </div>
  `).join('<i class="questPhaseLink" aria-hidden="true"></i>'));
  strip.setAttribute('aria-label','Learning sequence: Diagnose, Practice, Review, Transfer');
}

function updateCharacter(board,feedback){
  const stage = getOrCreate(board,'questCharacterStage','aside');
  const reaction = feedback?.classList.contains('good')
    ? 'That thinking made Brightside glow!'
    : feedback?.classList.contains('learn')
      ? 'Good try. Use the clue, then show what you know.'
      : 'Take your time. Learning beats guessing.';
  const signature = reaction;
  setHtmlIfChanged(stage,signature,`
    <div class="questAvatarHalo" aria-hidden="true"></div>
    <img class="questGuideAvatar" src="/assets/quest/guide-avatar.svg" alt="StarBlox learning guide with her buddy" />
    <div class="questGuideSpeech"><span>★</span><b>${reaction}</b></div>
  `);
}

function updateLesson(questionCard){
  const original = questionCard.querySelector('.questionText');
  if(!original) return;
  const {passage,stem} = splitPrompt(original.textContent);
  original.classList.add('questOriginalText');

  const lesson = getOrCreate(questionCard,'questLessonCard','section');
  const signature = passage + '||' + stem;
  if(lesson.dataset.signature !== signature){
    lesson.replaceChildren();
    const copy = document.createElement('div');
    copy.className = 'questLessonCopy';
    const label = document.createElement('span');
    label.className = 'questLessonLabel';
    label.textContent = passage ? 'READING MISSION' : 'SKILL MISSION';
    copy.appendChild(label);
    if(passage){
      const passageNode = document.createElement('p');
      passageNode.className = 'questPassage';
      passageNode.textContent = passage;
      copy.appendChild(passageNode);
    }
    const stemNode = document.createElement('h3');
    stemNode.className = 'questStem';
    stemNode.textContent = stem;
    copy.appendChild(stemNode);
    lesson.appendChild(copy);

    const art = document.createElement('div');
    art.className = 'questLessonArt';
    art.innerHTML = '<img src="/assets/quest/learning-vignette.svg" alt="Colorful StarBlox reading, thinking, and learning illustration" />';
    lesson.appendChild(art);
    lesson.dataset.signature = signature;
  }

  const answers = questionCard.querySelector('.answers');
  answers?.classList.add('questAnswerStack');
  const readAloud = questionCard.querySelector('.readAloud');
  readAloud?.classList.add('questReadAloud');

  let hintReady = questionCard.querySelector(':scope > .questHintReady');
  const feedback = questionCard.querySelector('.feedback');
  if(!feedback){
    if(!hintReady){
      hintReady = document.createElement('div');
      hintReady.className = 'questHintReady';
      hintReady.innerHTML = '<b>Need help?</b><span>Make one calm try. If it misses, a clue appears and nothing is taken away.</span>';
      questionCard.appendChild(hintReady);
    }
  }else if(hintReady){
    hintReady.remove();
  }
}

function updateEvidenceRail(board,skill,role,qCounter){
  const save = readSave();
  const stat = save.stats?.[skill] || {};
  const mastered = Array.isArray(save.mastered) && save.mastered.includes(skill);
  const status = evidenceLabel(stat,mastered);
  const rail = getOrCreate(board,'questEvidenceRail','aside');
  const districts = save.districtProgress || {};
  const signature = JSON.stringify({skill,role,qCounter,status,mastery:stat.masteryCorrect || 0,ind:stat.independentCorrect || 0,seen:stat.seen || 0,wrong:stat.wrong || 0,districts});
  setHtmlIfChanged(rail,signature,`
    <section class="questEvidenceCard">
      <span class="questRailKicker">MASTERY EVIDENCE</span>
      <div class="questEvidenceStatus"><i></i><b>${status}</b></div>
      <h3>${String(skill).replace(/-/g,' ')}</h3>
      <div class="questEvidenceNumbers">
        <span><b>${stat.masteryCorrect || 0}</b><small>Mastery-ready wins</small></span>
        <span><b>${stat.independentCorrect || 0}</b><small>First-try answers</small></span>
      </div>
      <small class="questEvidenceNote">Only eligible first-try answers build mastery. Clue-assisted success never counts as mastery or transfer evidence.</small>
    </section>
    <section class="questTodayCard">
      <span class="questRailKicker">TODAY'S LEARNING</span>
      <div><i class="${(districts['Lantern Lane'] || 0) > 0 ? 'done' : ''}"></i><span><b>Word Power</b><small>Phonics, spelling, weekly words</small></span></div>
      <div><i class="${(districts['Story Street'] || 0) > 0 ? 'done' : ''}"></i><span><b>Reading Thinking</b><small>Main idea, inference, evidence</small></span></div>
      <div><i class="${(districts['Wordwood Garden'] || 0) > 0 ? 'done' : ''}"></i><span><b>Religion Unit 1</b><small>Source-grounded practice</small></span></div>
      <div class="questCurrentAction"><strong>${qCounter}</strong><span><b>${role.charAt(0).toUpperCase() + role.slice(1)} action</b><small>Current quest step</small></span></div>
    </section>
  `);
}

function updateEarnedBar(board){
  const hud = currentHud();
  if(!questStart) questStart = hud;
  const bar = getOrCreate(board,'questEarnedBar','footer');
  const coins = Math.max(0,hud.coins - questStart.coins);
  const stars = Math.max(0,hud.stars - questStart.stars);
  const xp = Math.max(0,hud.xp - questStart.xp);
  const signature = [coins,stars,xp].join('|');
  setHtmlIfChanged(bar,signature,`
    <span class="questEarnedTitle">THIS QUEST</span>
    <span><i>●</i><b>+${coins}</b><small>Coins</small></span>
    <span><i>★</i><b>+${stars}</b><small>Stars</small></span>
    <span><i>◆</i><b>+${xp}</b><small>XP this level</small></span>
    <em>No speed bonus. Careful thinking wins.</em>
  `);
}

function decorateQuest(){
  const page = document.querySelector('.questPage');
  if(!page){
    questStart = null;
    lastQuestSignature = '';
    return;
  }
  page.classList.add('questIllustratedPage');
  const board = page.querySelector('.questBoard');
  if(!board){
    page.classList.add('questLaunchPage');
    questStart = null;
    lastQuestSignature = '';
    return;
  }
  page.classList.remove('questLaunchPage');
  board.classList.add('questExperience');

  const kicker = board.querySelector('.questTop .kicker')?.textContent || '';
  const role = roleFromKicker(kicker);
  const skillLabel = board.querySelector('.questTop h2')?.textContent || 'Current skill';
  const skill = skillKey(skillLabel);
  const qCounter = board.querySelector('.qCounter')?.textContent?.trim() || '1/5';
  const questionText = board.querySelector('.questionText')?.textContent || '';
  const signature = [role,skill,qCounter,questionText].join('|');

  updatePhaseStrip(board,role);
  const questionCard = board.querySelector('.questionCard');
  if(questionCard) updateLesson(questionCard);
  const feedback = questionCard?.querySelector('.feedback');
  updateCharacter(board,feedback);
  updateEvidenceRail(board,skill,role,qCounter);
  updateEarnedBar(board);

  if(lastQuestSignature !== signature){
    lastQuestSignature = signature;
    window.setTimeout(scheduleRefresh,80);
  }
}

function decorateStudy(){
  const heading = [...document.querySelectorAll('.heroPanel h1')].find(node => node.textContent.trim() === 'Study Lab');
  const page = heading?.closest('.page');
  if(!page) return;
  page.classList.add('studyIllustratedPage');
  const hero = heading.closest('.heroPanel');
  if(hero && !page.querySelector(':scope > .studySequenceStrip')){
    const strip = document.createElement('div');
    strip.className = 'studySequenceStrip';
    strip.innerHTML = `
      <span><i>1</i><b>LOOK</b><small>Spot the pattern or idea</small></span>
      <strong>→</strong>
      <span><i>2</i><b>SAY</b><small>Read it in your own words</small></span>
      <strong>→</strong>
      <span><i>3</i><b>USE</b><small>Try it later in a Quest</small></span>
    `;
    hero.insertAdjacentElement('afterend',strip);
  }
}

function refresh(){
  queued = false;
  decorateQuest();
  decorateStudy();
}

function scheduleRefresh(){
  if(queued) return;
  queued = true;
  window.requestAnimationFrame(refresh);
}

const observer = new MutationObserver(scheduleRefresh);
observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.addEventListener('storage',scheduleRefresh);
scheduleRefresh();
