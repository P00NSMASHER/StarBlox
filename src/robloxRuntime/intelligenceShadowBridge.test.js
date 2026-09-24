
import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { gameModel } from '../gameModel.js';
import { importLegacyQuestionBank } from '../questionBank/questionBankV2.js';
import {
  buildRobloxShadowCandidates,
  buildRobloxShadowState,
  verifyShadowOnlyResult
} from './intelligenceShadowBridge.js';
import { authoredDifficultyToIrt, probabilityCorrect } from '../intelligence/irtEngine.js';
import { retrievabilityAt } from '../intelligence/fsrsMemory.js';

function file(path){
  return readFileSync(resolve(process.cwd(),path),'utf8');
}

describe('Step 4: Roblox intelligence shadow bridge', () => {
  it('exports exact published QuestionVersion identity without answer/prompt content', () => {
    const bank=importLegacyQuestionBank(gameModel.buildQuestions());
    const candidates=buildRobloxShadowCandidates(bank);

    expect(candidates).toHaveLength(200);
    expect(candidates.every(item => /^fnv1a32:[a-f0-9]{8}$/.test(item.contentHash))).toBe(true);
    expect(candidates.every(item => item.version === 1)).toBe(true);
    expect(candidates[0]).not.toHaveProperty('answer');
    expect(candidates[0]).not.toHaveProperty('prompt');
    expect(candidates[0]).not.toHaveProperty('choices');
  });

  it('maps durable Roblox learning profile shape into the shadow policy input contract', () => {
    const state=buildRobloxShadowState({
      learning:{
        Concepts:{
          math:{
            exposures:2,
            stability:1,
            lapses:0,
            fsrsDifficulty:5,
            lastSeenAt:1000
          }
        },
        Ability:{Theta:0.4,StandardError:0.7},
        RecentQuestionIds:['q1'],
        RecentConceptIds:['math'],
        WrongStreak:1
      },
      nowMs:2000,
      context:{skills:['math']}
    });

    expect(state.theta).toBe(0.4);
    expect(state.abilityStandardError).toBe(0.7);
    expect(state.memoryByConcept.math.exposures).toBe(2);
    expect(state.context.skills).toEqual(['math']);
  });

  it('pins Luau conformance constants to the existing JavaScript intelligence behavior', () => {
    expect(authoredDifficultyToIrt(3)).toBe(0);
    expect(probabilityCorrect(0,{difficulty:0,discrimination:1})).toBeCloseTo(0.5,12);
    expect(retrievabilityAt({
      exposures:1,
      stability:1,
      lastSeenAt:0
    },86_400_000)).toBeCloseTo(0.9,12);

    const luau=file('roblox/src/shared/PlayerIntelligence.luau');
    expect(luau).toContain('local DAY_MS = 86_400_000');
    expect(luau).toContain('9 * state.stability');
    expect(luau).toContain('0.68 * fit + 0.32 * info');
    expect(luau).toContain('gain / log2(3)');
  });

  it('ports the same six default policy weights into Roblox', () => {
    const luau=file('roblox/src/shared/QuestionPolicyShadow.luau');
    expect(luau).toMatch(/memory = 0\.28/);
    expect(luau).toMatch(/irt = 0\.24/);
    expect(luau).toMatch(/entropy = 0\.18/);
    expect(luau).toMatch(/novelty = 0\.12/);
    expect(luau).toMatch(/gameplay = 0\.12/);
    expect(luau).toMatch(/quality = 0\.06/);
    expect(luau).toMatch(/recentWrongStreak/);
    expect(luau).toMatch(/0\.55/);
    expect(luau).toMatch(/0\.92/);
  });

  it('enforces shadow-only authority at the service boundary', () => {
    expect(verifyShadowOnlyResult({
      selectedQuestionId:'control-q',
      authoritative:'control',
      shadow:{mode:'shadow',shadowQuestionId:'experiment-q'}
    },'control-q')).toEqual({ok:true,errors:[]});

    const bad=verifyShadowOnlyResult({
      selectedQuestionId:'experiment-q',
      authoritative:'experimental',
      shadow:{mode:'shadow'}
    },'control-q');

    expect(bad.ok).toBe(false);
    expect(bad.errors.join(' ')).toMatch(/authoritative|control question/);

    const service=file('roblox/src/server/IntelligenceShadowService.luau');
    expect(service).toContain('authoritative = "control"');
    expect(service).toContain('selectedQuestionId = args.controlQuestionId');
  });

  it('includes a Studio-runnable conformance spec for the Step 2 test runner', () => {
    const spec=file('roblox/src/server/Tests/IntelligenceConformance.spec.luau');
    expect(spec).toMatch(/difficulty prior/);
    expect(spec).toMatch(/IRT midpoint/);
    expect(spec).toMatch(/FSRS 90% stability definition/);
    expect(spec).toMatch(/ability-matched question should rank first/);
  });
});
