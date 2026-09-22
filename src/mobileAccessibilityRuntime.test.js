/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyMobileAccessibility, parseXpProgress, revealStoreFocusTarget, storeCardAccessibleLabel } from './mobileAccessibilityRuntime';

describe('mobile accessibility helpers',() => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('parses XP progress without guessing malformed values',() => {
    expect(parseXpProgress('72/180 XP')).toEqual({value:72,max:180});
    expect(parseXpProgress('Level 2')).toBeNull();
  });

  it('adds keyboard/screen-reader semantics to Store cards and filters',() => {
    document.body.innerHTML = `
      <section class="marketPage sbStoreMatch">
        <div class="sbStoreCategoryRow"><button class="selectedFilter">All</button><button>Tops</button></div>
        <div class="sbStoreTierRow"><button class="selectedFilter">All tiers</button></div>
        <div class="storeGrid">
          <article class="storeCard sbStoreSelected"><div class="itemCopy"><h3>Star Hoodie</h3></div><span class="price">120 Coins</span><span class="sbStoreStateBadge">Available</span></article>
        </div>
      </section>`;

    applyMobileAccessibility(document);
    const grid = document.querySelector('.storeGrid');
    const card = document.querySelector('.storeCard');
    const category = document.querySelector('.sbStoreCategoryRow button');

    expect(grid.getAttribute('role')).toBe('group');
    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('aria-pressed')).toBe('true');
    expect(card.hasAttribute('aria-selected')).toBe(false);
    expect(card.getAttribute('aria-label')).toContain('Star Hoodie');
    expect(category.getAttribute('aria-pressed')).toBe('true');
  });

  it('does not rewrite stable Store accessibility state on a second pass',() => {
    document.body.innerHTML = `
      <section class="marketPage sbStoreMatch">
        <div class="sbStoreCategoryRow"><button class="selectedFilter">All</button></div>
        <div class="sbStoreTierRow"><button class="selectedFilter">All tiers</button></div>
        <div class="storeGrid">
          <article class="storeCard sbStoreSelected" aria-selected="true">
            <div class="itemArt"><span class="itemArtFallback">SH</span></div>
            <div class="itemCopy"><h3>Star Hoodie</h3></div>
            <span class="price">120 Coins</span>
            <span class="sbStoreStateBadge">Available</span>
          </article>
        </div>
      </section>`;

    applyMobileAccessibility(document);

    const page=document.querySelector('.marketPage');
    const card=document.querySelector('.storeCard');
    const fallback=document.querySelector('.itemArtFallback');
    const category=document.querySelector('.sbStoreCategoryRow button');

    let mutations=0;
    const observer=new MutationObserver(records => { mutations += records.length; });
    observer.observe(page,{subtree:true,attributes:true,childList:true,characterData:true});

    applyMobileAccessibility(document);

    expect(card.getAttribute('aria-pressed')).toBe('true');
    expect(category.getAttribute('aria-pressed')).toBe('true');
    expect(fallback.classList.contains('sbStoreFallbackArt')).toBe(true);
    expect(mutations).toBe(0);
    observer.disconnect();
  });

  it('reveals keyboard-focused Store filters within their horizontal tray only',() => {
    document.body.innerHTML = '<div class="sbStoreCategoryRow"><button>Room Decor</button></div>';
    const row = document.querySelector('.sbStoreCategoryRow');
    const button = row.querySelector('button');
    Object.defineProperty(row,'scrollLeft',{value:40,writable:true,configurable:true});
    row.getBoundingClientRect = () => ({left:10,right:310,top:0,bottom:64,width:300,height:64,x:10,y:0,toJSON(){}});
    button.getBoundingClientRect = () => ({left:292,right:376,top:0,bottom:64,width:84,height:64,x:292,y:0,toJSON(){}});
    row.scrollTo = vi.fn(({left}) => { row.scrollLeft = left; });

    expect(revealStoreFocusTarget(button)).toBe(true);
    expect(row.scrollTo).toHaveBeenCalledWith({left:114,behavior:'auto'});
    expect(row.scrollLeft).toBe(114);
  });

  it('uses the viewport edge when a Store filter tray itself is wider than a 320px phone',() => {
    const priorWidth = window.innerWidth;
    Object.defineProperty(window,'innerWidth',{value:320,writable:true,configurable:true});
    document.body.innerHTML = '<div class="sbStoreCategoryRow"><button>Shoes</button></div>';
    const row = document.querySelector('.sbStoreCategoryRow');
    const button = row.querySelector('button');
    Object.defineProperty(row,'scrollLeft',{value:0,writable:true,configurable:true});
    row.getBoundingClientRect = () => ({left:9,right:600,top:252,bottom:316,width:591,height:64,x:9,y:252,toJSON(){}});
    button.getBoundingClientRect = () => ({left:264,right:342,top:252,bottom:316,width:78,height:64,x:264,y:252,toJSON(){}});
    row.scrollTo = vi.fn(({left}) => { row.scrollLeft = left; });

    expect(revealStoreFocusTarget(button)).toBe(true);
    expect(row.scrollTo).toHaveBeenCalledWith({left:30,behavior:'auto'});
    expect(row.scrollLeft).toBe(30);
    Object.defineProperty(window,'innerWidth',{value:priorWidth,writable:true,configurable:true});
  });

  it('aligns a clipped snapped category to its own snap point on a narrow phone',() => {
    const priorWidth = window.innerWidth;
    Object.defineProperty(window,'innerWidth',{value:320,writable:true,configurable:true});
    document.body.innerHTML = '<div class="sbStoreCategoryRow"><button>Shoes</button></div>';
    const row = document.querySelector('.sbStoreCategoryRow');
    const button = row.querySelector('button');
    Object.defineProperty(row,'scrollLeft',{value:0,writable:true,configurable:true});
    Object.defineProperty(button,'offsetLeft',{value:179,configurable:true});
    row.getBoundingClientRect = () => ({left:9,right:600,top:252,bottom:316,width:591,height:64,x:9,y:252,toJSON(){}});
    button.getBoundingClientRect = () => ({left:264,right:342,top:252,bottom:316,width:78,height:64,x:264,y:252,toJSON(){}});
    row.scrollTo = vi.fn(({left}) => { row.scrollLeft = left; });

    expect(revealStoreFocusTarget(button)).toBe(true);
    expect(row.scrollTo).toHaveBeenCalledWith({left:171,behavior:'auto'});
    expect(row.scrollLeft).toBe(171);
    Object.defineProperty(window,'innerWidth',{value:priorWidth,writable:true,configurable:true});
  });

  it('labels Quest read-aloud, answers, feedback, and XP progress',() => {
    document.body.innerHTML = `
      <header class="hud"><div class="hudStats"><div class="levelBox"><div class="progress"></div><small>24/180 XP</small></div></div></header>
      <section class="questPage"><div class="questPhaseStrip"><div class="questPhase"></div></div><button class="questReadAloud">Read aloud</button><div class="questAnswerStack"><button class="answerButton" data-choice="A">A careful answer</button></div><div class="feedback">Nice work</div></section>`;

    applyMobileAccessibility(document);
    const progress = document.querySelector('.progress');
    const readAloud = document.querySelector('.questReadAloud');
    const answer = document.querySelector('.answerButton');
    const feedback = document.querySelector('.feedback');

    expect(progress.getAttribute('role')).toBe('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('24');
    expect(progress.getAttribute('aria-valuemax')).toBe('180');
    expect(readAloud.getAttribute('aria-label')).toBe('Read this question aloud');
    expect(answer.getAttribute('aria-label')).toBe('Answer A: A careful answer');
    expect(feedback.getAttribute('aria-live')).toBe('polite');
  });
});

describe('storeCardAccessibleLabel',() => {
  it('combines name, state, and price into one concise label',() => {
    const card = document.createElement('div');
    card.innerHTML = '<div class="itemCopy"><h3>Glow Shoes</h3></div><span class="sbStoreStateBadge">Owned</span><span class="price">90 Coins</span>';
    expect(storeCardAccessibleLabel(card)).toBe('Glow Shoes. Owned. 90 Coins');
  });
});
