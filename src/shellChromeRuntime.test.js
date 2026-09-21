// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { applyShellChrome, resolveShellNavTarget } from './shellChromeRuntime';

function mountShell(activeIndex = 3){
  const labels = ['World','Quest','Study','Home','Avatar','Market'];
  document.body.innerHTML = `
    <header class="hud">
      <button class="brand"><span class="logo">Old</span><small>Old City</small></button>
      <div class="hudStats"></div>
    </header>
    <aside class="sidebar">
      ${labels.map((label,index) => `<button class="navBtn ${index === activeIndex ? 'active' : ''}"><span>${label}</span></button>`).join('')}
    </aside>`;
}

describe('screenshot-match shell navigation',() => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('maps the existing app destinations to the five visible reference labels in the correct visual order',() => {
    mountShell();
    applyShellChrome();

    const buttons = [...document.querySelectorAll('.sidebar .navBtn')];
    expect(buttons.map(button => button.dataset.sbNav)).toEqual([
      'room','quests','study','home','customize','store'
    ]);

    const visibleOrder = buttons
      .filter(button => button.dataset.sbNav !== 'customize')
      .sort((a,b) => Number(a.style.order) - Number(b.style.order))
      .map(button => button.querySelector('span').textContent);

    expect(visibleOrder).toEqual(['Home','Quests','Study','Room','Store']);
    expect(document.querySelector('[data-sb-nav="home"]').getAttribute('aria-current')).toBe('page');
    expect(resolveShellNavTarget('home')?.label).toBe('Home');
    expect(resolveShellNavTarget('world')?.label).toBe('Room');
  });

  it('routes the logo to the bedroom Home destination instead of the world screen',() => {
    mountShell();
    applyShellChrome();

    const brand = document.querySelector('.brand');
    const home = document.querySelector('[data-sb-nav="home"]');
    let homeClicks = 0;
    let originalBrandClicks = 0;

    home.addEventListener('click',() => { homeClicks += 1; });
    brand.addEventListener('click',() => { originalBrandClicks += 1; });
    brand.click();

    expect(homeClicks).toBe(1);
    expect(originalBrandClicks).toBe(0);
    expect(brand.getAttribute('aria-label')).toBe('Go to StarBlox Home');
  });

  it('keeps Customize reachable from settings while leaving it out of the five-item primary rail',() => {
    mountShell();
    applyShellChrome();

    const customize = document.querySelector('[data-sb-nav="customize"]');
    let customizeClicks = 0;
    customize.addEventListener('click',() => { customizeClicks += 1; });

    const settings = document.querySelector('.sbSettingsButton');
    settings.click();
    const customizeAction = document.querySelector('[data-sb-action="customize"]');
    customizeAction.click();

    expect(customizeClicks).toBe(1);
    expect(settings.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('.sbSettingsPopover').hidden).toBe(true);
  });
});
