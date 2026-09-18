let queued = false;

function artForQuest(){
  const board = document.querySelector('.questExperience');
  if(!board) return null;
  const text = board.querySelector('.questionText')?.textContent || '';
  const skill = board.querySelector('.questTop h2')?.textContent?.trim().toLowerCase() || '';

  if(/After a picnic, Zoe/i.test(text)){
    return ['/assets/quest/story-park-care.svg','Zoe choosing to care for the park in the StarBlox story'];
  }
  if(/During art, Mateo/i.test(text)){
    return ['/assets/quest/story-crayons.svg','Mateo sharing crayons with Priya in the StarBlox story'];
  }
  if(/spelling|phonics|high frequency|high-frequency/i.test(skill)){
    return ['/assets/quest/mission-word-lab.svg','Colorful StarBlox word and sound lab'];
  }
  if(/vocabulary/i.test(skill)){
    return ['/assets/quest/mission-vocabulary.svg','StarBlox invitation and communication vocabulary scene'];
  }
  if(/religion/i.test(skill)){
    return ['/assets/quest/mission-religion-care.svg','StarBlox thoughtful choices and care for creation scene'];
  }
  return null;
}

function refresh(){
  queued = false;
  const art = document.querySelector('.questExperience .questLessonArt img');
  if(!art) return;
  const selection = artForQuest();
  if(!selection) return;
  const [src,alt] = selection;
  if(art.getAttribute('src') !== src) art.setAttribute('src',src);
  art.setAttribute('alt',alt);
  art.closest('.questLessonArt')?.classList.add('questContextArt');
}

function schedule(){
  if(queued) return;
  queued = true;
  window.requestAnimationFrame(refresh);
}

new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
schedule();
