
import { beforeAll,describe,expect,it } from 'vitest';
import { gameModel } from '../gameModel.js';
import { importLegacyQuestionBank } from '../questionBank/questionBankV2.js';
import { generateDailyBundleArtifact } from '../daily/dailyBundleFactory.js';
import { certifyDailyBundleArtifact } from '../daily/dailyCertification.js';
import {
  createDailyReleaseRegistry,
  freezeCertifiedDaily
} from '../daily/dailyReleaseRegistry.js';
import { DeterministicSimulation } from '../sim/deterministicCore.js';
import { ReplayActionRecorder } from '../replay/replayCodec.js';
import { createReplayRecording } from '../replay/reSimulate.js';
import {
  challengeSharePath,
  createShareableChallengeCapsule,
  createVerifiedReplayGhost,
  decodeShareableChallengeCapsule,
  encodeShareableChallengeCapsule,
  ghostAtTick,
  verifyReplayGhost,
  verifyShareableChallengeCapsule
} from './replayGhostChallenge.js';

const INITIAL={
  progress:0,
  score:0,
  elapsedTicks:0
};

function reducer(state,event){
  if(event.kind === 'action'){
    if(event.action.type === 'advance'){
      state.progress+=event.action.amount;
    }else if(event.action.type === 'reward'){
      state.score+=event.action.amount;
    }else{
      throw new Error('unsupported action ' + event.action.type);
    }
  }
  if(event.kind === 'tick') state.elapsedTicks++;
}

function summaryBuilder(state){
  return {
    progress:state.progress,
    score:state.score
  };
}

function sampleState(state){
  return {
    progress:state.progress,
    score:state.score,
    elapsedTicks:state.elapsedTicks
  };
}

let registry;
let release;

beforeAll(async () => {
  const bank=importLegacyQuestionBank(gameModel.buildQuestions(),{
    bankId:'share-test-bank',
    title:'Share Test Bank'
  });
  const generated=await generateDailyBundleArtifact({
    date:'2026-11-01',
    bank
  });
  const certified=certifyDailyBundleArtifact(generated,{bank});
  if(!certified.ok) throw new Error(JSON.stringify(certified.report.failures));

  const frozen=freezeCertifiedDaily(
    createDailyReleaseRegistry(),
    certified.artifact
  );
  registry=frozen.registry;
  release=frozen.release;
});

function recordedRun(){
  const simulation=new DeterministicSimulation({
    seed:release.artifact.bundle.seed,
    initialState:INITIAL,
    reducer
  });
  const recorder=new ReplayActionRecorder();

  const schedule=(action,tick) => {
    const entry=simulation.schedule(action,{tick});
    recorder.recordScheduled(entry);
  };

  schedule({type:'advance',amount:2},0);
  schedule({type:'advance',amount:3},2);
  schedule({type:'reward',amount:7},4);
  simulation.advanceTicks(8);

  const recording=createReplayRecording({
    replayId:'share-replay-1',
    initialState:INITIAL,
    simulation,
    actions:recorder.entries(),
    summary:summaryBuilder(simulation.getState()),
    createdAt:'2026-11-01T12:00:00Z'
  });

  return {simulation,recording};
}

function releaseContext(){
  return {
    releaseId:release.releaseId,
    bundleHash:release.bundleHash,
    levelHash:release.artifact.bundle.levelSpec.levelHash
  };
}

describe('Step 19: verified replay ghosts', () => {
  it('builds a deterministic sampled ghost only after authoritative replay verification', () => {
    const {recording}=recordedRun();

    const first=createVerifiedReplayGhost(recording,{
      initialState:INITIAL,
      reducer,
      summaryBuilder,
      sampleState,
      sampleEveryTicks:2,
      challengeContext:releaseContext()
    });
    const second=createVerifiedReplayGhost(recording,{
      initialState:INITIAL,
      reducer,
      summaryBuilder,
      sampleState,
      sampleEveryTicks:2,
      challengeContext:releaseContext()
    });

    expect(first.ok).toBe(true);
    expect(first.verdict).toBe('verified');
    expect(second.ghost).toEqual(first.ghost);
    expect(verifyReplayGhost(first.ghost)).toEqual({ok:true,errors:[]});
    expect(first.ghost.points.map(point => point.tick)).toEqual([0,2,4,6,8]);
    expect(first.ghost.points.at(-1).sample).toEqual({
      progress:5,
      score:7,
      elapsedTicks:8
    });
  });

  it('refuses to create a ghost from a replay whose package integrity is broken', () => {
    const {recording}=recordedRun();
    const tampered=JSON.parse(JSON.stringify(recording));
    tampered.actions.data+='0';

    const result=createVerifiedReplayGhost(tampered,{
      initialState:INITIAL,
      reducer,
      summaryBuilder,
      sampleState,
      challengeContext:releaseContext()
    });

    expect(result.ok).toBe(false);
    expect(result.verdict).toBe('unverifiable');
    expect(result.ghost).toBeNull();
  });

  it('returns the nearest prior ghost keyframe for race/HUD rendering', () => {
    const {recording}=recordedRun();
    const result=createVerifiedReplayGhost(recording,{
      initialState:INITIAL,
      reducer,
      summaryBuilder,
      sampleState,
      sampleEveryTicks:2,
      challengeContext:releaseContext()
    });

    expect(ghostAtTick(result.ghost,0).tick).toBe(0);
    expect(ghostAtTick(result.ghost,5).tick).toBe(4);
    expect(ghostAtTick(result.ghost,999).tick).toBe(8);
  });

  it('caps ghost point counts deterministically for long replays', () => {
    const simulation=new DeterministicSimulation({
      seed:release.artifact.bundle.seed,
      initialState:INITIAL,
      reducer
    });
    const recorder=new ReplayActionRecorder();
    const entry=simulation.schedule({type:'advance',amount:1},{tick:0});
    recorder.recordScheduled(entry);
    simulation.advanceTicks(100);

    const recording=createReplayRecording({
      replayId:'long-ghost',
      initialState:INITIAL,
      simulation,
      actions:recorder.entries(),
      summary:summaryBuilder(simulation.getState()),
      createdAt:'2026-11-01T12:00:00Z'
    });

    const result=createVerifiedReplayGhost(recording,{
      initialState:INITIAL,
      reducer,
      summaryBuilder,
      sampleState,
      sampleEveryTicks:1,
      maxPoints:6,
      challengeContext:releaseContext()
    });

    expect(result.ok).toBe(true);
    expect(result.ghost.points.length).toBeLessThanOrEqual(6);
    expect(result.ghost.sampleEveryTicks).toBeGreaterThanOrEqual(20);
    expect(result.ghost.points.at(-1).tick).toBe(100);
  });
});

describe('Step 19: shareable challenge capsules', () => {
  function verifiedGhost(context=releaseContext()){
    const {recording}=recordedRun();
    const result=createVerifiedReplayGhost(recording,{
      initialState:INITIAL,
      reducer,
      summaryBuilder,
      sampleState,
      sampleEveryTicks:2,
      challengeContext:context
    });
    if(!result.ok) throw new Error(result.reason);
    return result.ghost;
  }

  it('binds an immutable Daily release to an exact verified ghost reference', () => {
    const ghost=verifiedGhost();
    const capsule=createShareableChallengeCapsule({
      registry,
      releaseId:release.releaseId,
      ghost,
      label:'Beat my route'
    });

    expect(verifyShareableChallengeCapsule(capsule,{registry,ghost})).toEqual({
      ok:true,
      errors:[]
    });
    expect(capsule.release.releaseId).toBe(release.releaseId);
    expect(capsule.release.bundleHash).toBe(release.bundleHash);
    expect(capsule.ghost.ghostHash).toBe(ghost.ghostHash);
    expect(capsule.challengeId).toMatch(/^challenge-[a-f0-9]{8}$/);
  });

  it('encodes and decodes a deterministic URL-safe share token', () => {
    const ghost=verifiedGhost();
    const capsule=createShareableChallengeCapsule({
      registry,
      releaseId:release.releaseId,
      ghost,
      label:'Daily race'
    });

    const first=encodeShareableChallengeCapsule(capsule);
    const second=encodeShareableChallengeCapsule(capsule);

    expect(first).toBe(second);
    expect(first).toMatch(/^sbx1\.[A-Za-z0-9_-]+$/);
    expect(decodeShareableChallengeCapsule(first)).toEqual(capsule);
    expect(challengeSharePath(capsule)).toContain('?challenge=');
  });

  it('contains no trusted score, correctness, or player identity claims', () => {
    const capsule=createShareableChallengeCapsule({
      registry,
      releaseId:release.releaseId,
      ghost:verifiedGhost()
    });
    const json=JSON.stringify(capsule);

    expect(json).not.toContain('"score"');
    expect(json).not.toContain('"correct"');
    expect(json).not.toContain('"playerId"');
    expect(json).not.toContain('"selectedAnswer"');
  });

  it('rejects a ghost bound to a different immutable release context', () => {
    const wrong=verifiedGhost({
      ...releaseContext(),
      releaseId:'daily-2099-01-01@v1'
    });

    expect(() => createShareableChallengeCapsule({
      registry,
      releaseId:release.releaseId,
      ghost:wrong
    })).toThrow(/ghost release context/);
  });

  it('detects capsule tampering and frozen-release identity drift', () => {
    const ghost=verifiedGhost();
    const capsule=createShareableChallengeCapsule({
      registry,
      releaseId:release.releaseId,
      ghost
    });
    const tampered=JSON.parse(JSON.stringify(capsule));
    tampered.release.bundleHash='fnv1a32:00000000';

    const validation=verifyShareableChallengeCapsule(tampered,{registry,ghost});
    expect(validation.ok).toBe(false);
    expect(validation.errors.join(' ')).toMatch(/hash mismatch|release identity/);
  });

  it('rejects malformed or modified share tokens', () => {
    const capsule=createShareableChallengeCapsule({
      registry,
      releaseId:release.releaseId,
      ghost:verifiedGhost()
    });
    const token=encodeShareableChallengeCapsule(capsule);
    const mutated=token.slice(0,-1) + (token.endsWith('A') ? 'B' : 'A');

    expect(() => decodeShareableChallengeCapsule(mutated)).toThrow();
  });
});
