/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { applyMobileAccessibility, parseXpProgress, storeCardAccessibleLabel } from './mobileAccessibilityRuntime';

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
