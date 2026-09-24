
import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function file(path){
  return readFileSync(resolve(process.cwd(),path),'utf8');
}

describe('Step 4: Roblox server artifact/replay boundaries', () => {
  it('requires exact QuestionVersion identity before activating a certified Daily', () => {
    const source=file('roblox/src/server/RuntimeArtifactService.luau');
    expect(source).toMatch(/questionId/);
    expect(source).toMatch(/version/);
    expect(source).toMatch(/contentHash/);
    expect(source).toMatch(/duplicate exact QuestionVersion/);
    expect(source).toMatch(/payload\.certified == true/);
    expect(source).toMatch(/Daily references unknown QuestionVersion/);
  });

  it('keeps full answer content server-side while the shadow candidate projection omits it', () => {
    const source=file('roblox/src/server/RuntimeArtifactService.luau');
    expect(source).toMatch(/question\.answer/);
    const projection=source.slice(source.indexOf('function RuntimeArtifactService:GetDailyShadowCandidates'));
    expect(projection).toContain('questionId = question.questionId');
    expect(projection).not.toContain('answer = question.answer');
    expect(projection).not.toContain('prompt = question.prompt');
    expect(projection).not.toContain('choices = question.choices');
  });

  it('accepts bounded replay evidence without any client score/final-result fields', () => {
    const source=file('roblox/src/server/ReplayIngressService.luau');
    expect(source).toMatch(/chunks must be contiguous and ordered/);
    expect(source).toMatch(/maxReplayBytes/);
    expect(source).toMatch(/maxChunkBytes/);
    expect(source).not.toMatch(/clientScore|claimedScore|finalScore|authoritativeSummary/);
    expect(source).toMatch(/authoritative verification remains the deterministic/);
  });
});
