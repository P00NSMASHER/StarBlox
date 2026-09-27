import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven parity: legacy learning chrome suppression',()=>{
  it('locks legacy free-roam learning surfaces off in the shared contract',()=>{
    const config=read('roblox/src/shared/BrookhavenMirrorConfig.luau');
    expect(config).toContain('LegacyWorldStationsEnabled = false');
    expect(config).toContain('PersistentStudyPilotButtonEnabled = false');
    expect(config).toContain('LegacyVerticalSliceEnabled = false');
    expect(config).toContain('ContextualQuestionOverlayEnabled = true');
  });

  it('does not remount Study Pilot or the legacy Brightside HUD in ordinary free roam',()=>{
    const core=read('roblox/src/client/CoreGameLoop.client.luau');
    const vertical=read('roblox/src/client/VerticalSlice.client.luau');

    expect(core).toContain('BrookhavenMirrorConfig.LearningPresentation.PersistentStudyPilotButtonEnabled == true');
    expect(core).toContain('player:GetAttribute("StarBloxLearningOverlayVisible") == true');

    const guard=vertical.indexOf('LegacyVerticalSliceEnabled ~= true');
    const remotes=vertical.indexOf('WaitForChild("StarBloxVerticalSlice"');
    expect(guard).toBeGreaterThan(-1);
    expect(remotes).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(remotes);
  });

  it('keeps the old neighborhood station prompts fail-closed server-side',()=>{
    const service=read('roblox/src/server/CoreGameLoopService.luau');
    expect(service).toContain('BrookhavenMirrorConfig.LearningPresentation.LegacyWorldStationsEnabled == true');
    expect(service).toContain('and SchoolConfig.FeatureFlags.SchoolSystemEnabled ~= true');
  });
});
