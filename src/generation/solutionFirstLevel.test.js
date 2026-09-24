import { describe,expect,it } from 'vitest';
import {
  QUEST_LEVEL_GENERATOR_VERSION,
  certifiedNextNode,
  generateCertifiedQuestLevel,
  verifySolutionCertificate
} from './solutionFirstLevel';

describe('StarBlox solution-first quest-level generation', () => {
  it('generates byte-for-byte deterministic levels from the same seed', () => {
    const first=generateCertifiedQuestLevel({seed:20260924});
    const second=generateCertifiedQuestLevel({seed:20260924});

    expect(second).toEqual(first);
    expect(first.generatorVersion).toBe(QUEST_LEVEL_GENERATOR_VERSION);
    expect(first.certificateVerified).toBe(true);
    expect(first.levelHash).toMatch(/^fnv1a32:[a-f0-9]{8}$/);
  });

  it('produces certified solvable levels across 100 seeds', () => {
    for(let seed=1;seed<=100;seed++){
      const level=generateCertifiedQuestLevel({seed});
      const verified=verifySolutionCertificate(level);

      expect(verified.ok, 'seed ' + seed + ': ' + verified.reason).toBe(true);
      expect(verified.finalState.completed).toBe(true);
      expect(verified.finalState.sparks).toBe(level.stageCount);
    }
  });

  it('lays the winning route as adjacent grid steps with an explicit solution edge', () => {
    const level=generateCertifiedQuestLevel({seed:77,stageCount:6});
    const nodes=new Map(level.nodes.map(node => [node.nodeId,node]));

    for(let index=1;index<level.solutionCertificate.path.length;index++){
      const a=nodes.get(level.solutionCertificate.path[index - 1]);
      const b=nodes.get(level.solutionCertificate.path[index]);
      expect(Math.abs(a.row - b.row) + Math.abs(a.column - b.column)).toBe(1);
      expect(level.edges.some(edge =>
        (edge.a === a.nodeId && edge.b === b.nodeId) ||
        (edge.a === b.nodeId && edge.b === a.nodeId)
      )).toBe(true);
    }
  });

  it('creates the solution plan before optional recovery/bonus decoration', () => {
    const level=generateCertifiedQuestLevel({seed:88,stageCount:5,optionalCount:4});
    const required=level.nodes.filter(node => node.required);
    const optional=level.nodes.filter(node => !node.required);

    expect(required.map(node => node.nodeId)).toEqual([
      'start','challenge-1','challenge-2','challenge-3','challenge-4','challenge-5','boss'
    ]);
    expect(optional).toHaveLength(4);
    expect(optional.every(node => !level.solutionCertificate.path.includes(node.nodeId))).toBe(true);
    expect(level.nodes.find(node => node.nodeId === 'boss').sparkMin).toBe(5);
  });

  it('rejects a tampered level whose certificate no longer proves the final resource state', () => {
    const level=JSON.parse(JSON.stringify(generateCertifiedQuestLevel({seed:19})));
    const challenge=level.nodes.find(node => node.nodeId === 'challenge-3');
    challenge.sparkReward=0;

    const verified=verifySolutionCertificate(level);
    expect(verified.ok).toBe(false);
    expect(verified.reason).toMatch(/sparks|spark/);
  });

  it('rejects a certificate that tries to jump across non-adjacent nodes or missing edges', () => {
    const level=JSON.parse(JSON.stringify(generateCertifiedQuestLevel({seed:29})));
    const path=level.solutionCertificate.path;
    const firstEdge=level.edges.findIndex(edge =>
      (edge.a === path[0] && edge.b === path[1]) ||
      (edge.a === path[1] && edge.b === path[0])
    );
    level.edges.splice(firstEdge,1);

    const verified=verifySolutionCertificate(level);
    expect(verified.ok).toBe(false);
    expect(verified.reason).toMatch(/edge/);
  });

  it('rejects impossible level dimensions before generation', () => {
    expect(() => generateCertifiedQuestLevel({
      seed:1,
      rows:2,
      columns:2,
      stageCount:5
    })).toThrow(/enough cells/);
  });

  it('exposes the next certified required node for deterministic hints/recovery', () => {
    const level=generateCertifiedQuestLevel({seed:101});
    expect(certifiedNextNode(level,[])).toBe('start');
    expect(certifiedNextNode(level,['start'])).toBe('challenge-1');
    expect(certifiedNextNode(level,level.solutionCertificate.path)).toBeNull();
  });

  it('changes the generated layout when the seed changes while preserving solvability', () => {
    const a=generateCertifiedQuestLevel({seed:101});
    const b=generateCertifiedQuestLevel({seed:102});

    expect(a.levelHash).not.toBe(b.levelHash);
    expect(verifySolutionCertificate(a).ok).toBe(true);
    expect(verifySolutionCertificate(b).ok).toBe(true);
  });
});
