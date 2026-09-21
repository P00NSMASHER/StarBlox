// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { gameModel } from './gameModel';
import { decorateStoreScreenshotMatch } from './storeScreenshotMatchRuntime';

function makeStorePage(){
  document.body.innerHTML = `
    <div class="currency">Coins <strong>120</strong></div>
    <div class="currency">Stars <strong>3</strong></div>
    <section class="marketPage">
      <div class="heroPanel marketHero"><div><span class="kicker">STAR MARKET</span><h1>Old Store</h1><p>Old copy</p></div><div class="heroMark">★</div></div>
      <div class="dreamBanner"><div><span>YOUR DREAM GOAL</span><b>Moon Cat</b><small>Keep learning</small></div><div class="progress large"><i></i></div></div>
      <div class="filterRow"><button class="selectedFilter">All</button><button>Tops</button></div>
      <div class="filterRow tierRow"><button class="selectedFilter">All Tiers</button><button>Starter</button></div>
      <div class="storeGrid">
        <article class="storeCard tier1">
          <div class="itemArt"><span>H</span><i>Cloud</i></div>
          <div class="itemCopy"><small>Starter · Cloud Pop</small><h3>Hoodie</h3><div class="price">30 Coins</div>
            <div class="storeActions"><button class="primaryButton small">Buy Forever</button><button class="secondaryButton small">Set Dream Goal</button></div>
          </div>
        </article>
      </div>
    </section>`;
  return document.querySelector('.marketPage');
}

describe('Store screenshot-match runtime', () => {
  it('preserves the 192-item catalog invariant', () => {
    expect(gameModel.store).toHaveLength(192);
    expect(new Set(gameModel.store.map(item => item.id)).size).toBe(192);
  });

  it('adds the selected-item rail, permanent collections, and explicit card state', () => {
    const page = makeStorePage();
    expect(decorateStoreScreenshotMatch(page)).toBe(true);
    expect(page.dataset.screenshotMatchStore).toBe('v1');
    expect(page.querySelector('.sbStoreRightRail')).not.toBeNull();
    expect(page.querySelectorAll('.sbStoreCollectionCard')).toHaveLength(4);
    expect(page.querySelector('.storeCard').dataset.storeItemId).toBe('tops-1');
    expect(page.querySelector('.storeCard').getAttribute('aria-selected')).toBe('true');
    expect(page.querySelector('.sbStoreSelectedDetail').textContent).toContain('Hoodie');
    expect(page.querySelector('.sbStoreSelectedDetail').textContent).toContain('Permanent reward');
  });

  it('is DOM-idempotent when the observer rescans an unchanged Store', () => {
    const page = makeStorePage();
    expect(decorateStoreScreenshotMatch(page)).toBe(true);
    const first = page.innerHTML;
    expect(decorateStoreScreenshotMatch(page)).toBe(true);
    expect(page.innerHTML).toBe(first);
  });
});
