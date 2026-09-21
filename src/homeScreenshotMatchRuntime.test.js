// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { decorateHomeScreenshotMatch, normalizeHomeDestination } from './homeScreenshotMatchRuntime';

describe('Home screenshot-match navigation aliases', () => {
  it('maps legacy Home destinations onto the shared five-item shell labels', () => {
    expect(normalizeHomeDestination('Market')).toBe('store');
    expect(normalizeHomeDestination('Quest')).toBe('quests');
    expect(normalizeHomeDestination('Avatar')).toBe('customize');
  });

  it('leaves already-compatible destinations unchanged', () => {
    expect(normalizeHomeDestination('Study')).toBe('study');
    expect(normalizeHomeDestination('Room')).toBe('room');
    expect(normalizeHomeDestination('Store')).toBe('store');
  });

  it('is DOM-idempotent when the observer rescans an unchanged Home', () => {
    document.body.innerHTML = `
      <div class="homeHeroRuntime">
        <section class="homeRoomProgress"><div class="homePanelHeading"><span>Room</span></div></section>
        <section class="homeDreamGoal"><div class="homePanelHeading"><span>Dream</span></div><div class="homeDreamNumbers"></div></section>
        <section class="homeDailyQuests"></section>
        <section class="homeCustomize"><div class="homePanelHeading"><span>Customize</span></div></section>
        <section class="homeLearning"><div class="homePanelHeading"><span>Learning</span></div></section>
        <div class="homeBuddyBubble"></div>
      </div>`;
    const home = document.querySelector('.homeHeroRuntime');
    expect(decorateHomeScreenshotMatch(home)).toBe(true);
    const first = home.innerHTML;
    expect(decorateHomeScreenshotMatch(home)).toBe(true);
    expect(home.innerHTML).toBe(first);
  });
});
