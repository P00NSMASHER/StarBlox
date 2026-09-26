import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

function read(path) {
  return readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
}

describe('Brookhaven exact post-opening parity contract', () => {
  it('makes exact live Brookhaven parity the Roblox post-opening target', () => {
    const config = read('roblox/src/shared/BrookhavenMirrorConfig.luau');

    expect(config).toContain('SchemaVersion = 2');
    expect(config).toContain('Target = "exact-live-brookhaven"');
    expect(config).toContain('OpeningSequenceIsOnlyPlayerFacingException = true');
    expect(config).toContain('AllowCustomStarBloxHud = false');
    expect(config).toContain('AllowCustomStarBloxNavigation = false');
    expect(config).toContain('AllowCustomStarBloxMenus = false');
    expect(config).toContain('AllowApproximateIconography = false');
    expect(config).toContain('AllowApproximateLayout = false');
    expect(config).toContain('AllowApproximateInteractionBehavior = false');
    expect(config).toContain('RequireCurrentLiveVersionEvidence = true');
  });

  it('does not falsely claim the frozen world baseline is the current live Brookhaven build', () => {
    const config = read('roblox/src/shared/BrookhavenMirrorConfig.luau');
    const contract = read('docs/BROOKHAVEN_EXACT_POST_OPENING_PARITY.md');

    expect(config).toContain('CurrentLiveBrookhavenParityProven = false');
    expect(contract).toContain('No completion claim from a stale world source.');
    expect(contract).toContain('Until then the status is **NOT EXACT**.');
  });

  it('supersedes the legacy custom StarBlox shell for the Roblox runtime', () => {
    const northStar = read('VISUAL_NORTH_STAR.md');

    expect(northStar).toContain('2026-09-26 Roblox runtime override');
    expect(northStar).toContain('exact Brookhaven parity');
    expect(northStar).toContain('docs/BROOKHAVEN_EXACT_POST_OPENING_PARITY.md');
    expect(northStar).toContain('must not be used to justify a custom post-opening Roblox interface');
  });
});
