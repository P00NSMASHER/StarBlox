
import { describe,expect,it } from 'vitest';
import { DeterministicSimulation,SIM_ENGINE_VERSION } from '../sim/deterministicCore.js';
import { ReplayActionRecorder } from './replayCodec.js';
import { createReplayRecording } from './reSimulate.js';
import {
  createGhostTrack,
  createShareableChallenge,
  ghostActionsBetween,
  ghostCursorAtTick,
  parseShareableChallenge,
  serializeShareableChallenge,
  validateShareableChallenge,
  verifyGhostTrack,
  verifyShareableChallengeAttempt
} from './replayGhostShare.js';

const INITIAL={score:0,elapsedTicks:0};

function reducer(state,event){
  if(event.kind === 'action'){
    if(event.action.type === 'reward') state.score+=event.action.amount;
    else throw new Error('unsupported action');
  }
  if(event.kind === 'tick') state.elapsedTicks++;
}

function buildRecording({
  replayId='replay-source',
  seed=42,
  rewards=[
    {tick:0,amount:5},
    {tick:2,amount:2}
  ],
  finalTicks=5
}={}){
  const simulation=new DeterministicSimulation({
    seed,
    initialState:INITIAL,
    reducer
  });
  const recorder=new ReplayActionRecorder();

  for(const reward of rewards){
    const entry=simulation.schedule({
      type:'reward',
      amount:reward.amount
    },{tick:reward.tick});
    recorder.recordScheduled(entry);
  }

  simulation.advanceTicks(finalTicks);
  const summary={
    score:simulation.getState().score,
    elapsedTicks:simulation.getState().elapsedTicks
  };
  const recording=createReplayRecording({
    replayId,
    initialState:INITIAL,
    simulation,
    actions:recorder.entries(),
    summary,
    createdAt:'2026-09-24T09:30:00Z'
  });

  return {recording,summary,simulation};
}

describe('Step 19: replay ghosts', () => {
  it('derives a stable tick-addressed ghost track from the replay action stream', () => {
    const {recording}=buildRecording();
    const first=createGhostTrack(recording);
    const second=createGhostTrack(recording);

    expect(second).toEqual(first);
    expect(first.replayId).toBe('replay-source');
    expect(first.engineVersion).toBe(SIM_ENGINE_VERSION);
    expect(first.actions.map(action => action.tick)).toEqual([0,2]);
    expect(first.actions.map(action => action.type)).toEqual(['reward','reward']);
    expect(verifyGhostTrack(first,recording)).toEqual({ok:true,errors:[]});
  });

  it('supports deterministic ghost scrubbing without pretending to know unrecorded state', () => {
    const {recording}=buildRecording();
    const ghost=createGhostTrack(recording);

    expect(ghostActionsBetween(ghost,{fromTick:0,toTick:1})).toHaveLength(1);
    expect(ghostActionsBetween(ghost,{fromTick:2,toTick:4})).toHaveLength(1);

    const start=ghostCursorAtTick(ghost,0);
    expect(start.completedActions).toBe(1);
    expect(start.nextAction.tick).toBe(2);
    expect(start.terminal).toBe(false);

    const end=ghostCursorAtTick(ghost,recording.finalTick);
    expect(end.completedActions).toBe(2);
    expect(end.nextAction).toBeNull();
    expect(end.progress).toBe(1);
    expect(end.terminal).toBe(true);
  });

  it('detects ghost-track tampering independently of the source replay', () => {
    const {recording}=buildRecording();
    const ghost=JSON.parse(JSON.stringify(createGhostTrack(recording)));
    ghost.actions[0].action.amount=999;

    const validation=verifyGhostTrack(ghost,recording);
    expect(validation.ok).toBe(false);
    expect(validation.errors.join(' ')).toMatch(/hash|source replay/);
  });
});

describe('Step 19: self-contained shareable replay challenges', () => {
  it('creates a byte-stable self-contained challenge bound to exact replay setup and benchmark', () => {
    const {recording,summary}=buildRecording();
    const challenge=createShareableChallenge({
      recording,
      benchmarkSummary:summary,
      title:'Beat my StarBlox run'
    });

    expect(challenge.challengeId).toMatch(/^challenge-[a-f0-9]{8}$/);
    expect(challenge.source.replayManifestHash).toBe(recording.manifest.manifestHash);
    expect(challenge.source.actionHash).toBe(recording.manifest.actionHash);
    expect(challenge.source.initialStateHash).toBe(recording.manifest.initialStateHash);
    expect(challenge.ghost.trackHash).toBe(createGhostTrack(recording).trackHash);
    expect(validateShareableChallenge(challenge)).toEqual({ok:true,errors:[]});

    const serialized=serializeShareableChallenge(challenge);
    const parsed=parseShareableChallenge(serialized);
    expect(parsed).toEqual(challenge);
    expect(serializeShareableChallenge(parsed)).toBe(serialized);
  });

  it('rejects a benchmark summary that does not belong to the replay', () => {
    const {recording}=buildRecording();

    expect(() => createShareableChallenge({
      recording,
      benchmarkSummary:{score:999,elapsedTicks:5}
    })).toThrow(/benchmark summary/);
  });

  it('rejects coherent challenge-envelope tampering even when the embedded replay itself remains valid', () => {
    const {recording,summary}=buildRecording();
    const challenge=JSON.parse(JSON.stringify(createShareableChallenge({
      recording,
      benchmarkSummary:summary
    })));

    challenge.title='Forged title without recomputing challenge hash';
    const validation=validateShareableChallenge(challenge);

    expect(validation.ok).toBe(false);
    expect(validation.errors).toContain('challenge hash mismatch');
  });

  it('independently re-simulates a challenger run from the exact shared setup', () => {
    const source=buildRecording();
    const challenge=createShareableChallenge({
      recording:source.recording,
      benchmarkSummary:source.summary
    });

    const attempt=buildRecording({
      replayId:'replay-attempt',
      seed:42,
      rewards:[
        {tick:0,amount:7},
        {tick:2,amount:4}
      ],
      finalTicks:5
    });

    const result=verifyShareableChallengeAttempt(
      challenge,
      attempt.recording,
      {
        initialState:INITIAL,
        reducer,
        summaryBuilder:state => ({
          score:state.score,
          elapsedTicks:state.elapsedTicks
        })
      }
    );

    expect(result.verdict).toBe('verified');
    expect(result.sourceBenchmark).toEqual(source.summary);
    expect(result.attemptSummary).toEqual(attempt.summary);
    expect(result.attemptSummary.score).toBeGreaterThan(result.sourceBenchmark.score);
  });

  it('refuses challenger replays from a different seed/setup', () => {
    const source=buildRecording();
    const challenge=createShareableChallenge({
      recording:source.recording,
      benchmarkSummary:source.summary
    });
    const wrongSeed=buildRecording({
      replayId:'wrong-seed',
      seed:43
    });

    const result=verifyShareableChallengeAttempt(
      challenge,
      wrongSeed.recording,
      {
        initialState:INITIAL,
        reducer,
        summaryBuilder:state => ({
          score:state.score,
          elapsedTicks:state.elapsedTicks
        })
      }
    );

    expect(result.verdict).toBe('unverifiable');
    expect(result.reason).toMatch(/seed/);
  });

  it('detects action-stream tampering in a serialized challenge package', () => {
    const source=buildRecording();
    const challenge=JSON.parse(serializeShareableChallenge(
      createShareableChallenge({
        recording:source.recording,
        benchmarkSummary:source.summary
      })
    ));

    challenge.recording.actions.data += '0';
    const validation=validateShareableChallenge(challenge);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join(' ')).toMatch(/replay invalid|challenge hash|ghost/);
  });
});
