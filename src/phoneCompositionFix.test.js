import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./phoneCompositionFix.css', import.meta.url), 'utf8');

describe('release-critical phone composition contract', () => {
  it('keeps Home tier progression while removing only the redundant phone horizon summary', () => {
    expect(css).toContain('.homeHeroRuntime .homeRoomProgress .homeGoalHorizons');
    expect(css).toContain('display:none!important');
    expect(css).toContain('.homeHeroRuntime .homeRoomProgress .homeTierStrip');
    expect(css).toContain('.homeHeroRuntime .homeRoomProgress .homeTierMeter');
    expect(css).toContain('.homeHeroRuntime .homeRoomProgress .homeTierNext');
  });

  it('puts the Quest action surface before the decorative character stage on phones', () => {
    expect(css).toMatch(/\.questScreenshotMatch \.questionCard\{[\s\S]*?order:3!important/);
    expect(css).toMatch(/\.questScreenshotMatch \.questCharacterStage\{[\s\S]*?order:4!important/);
  });

  it('preserves touch-safe read-aloud and answer controls', () => {
    expect(css).toMatch(/\.questScreenshotMatch \.questReadAloud\{[\s\S]*?min-height:48px!important/);
    expect(css).toMatch(/\.questScreenshotMatch \.questAnswerStack \.answerButton\{[\s\S]*?min-height:56px!important/);
  });

  it('is phone-scoped rather than changing accepted desktop and tablet geometry', () => {
    expect(css.trimStart().includes('@media (max-width:640px)')).toBe(true);
    expect(css).not.toContain('@media (min-width:');
  });
});
