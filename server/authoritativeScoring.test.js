import { describe,expect,it } from 'vitest';
import { canonicalizeLegacyQuestion } from '../src/domainSchemas';
import { gameModel } from '../src/gameModel';
import { DeterministicSimulation,SIM_ENGINE_VERSION } from '../src/sim/deterministicCore';
import { ReplayActionRecorder } from '../src/replay/replayCodec';
import { createReplayRecording } from '../src/replay/reSimulate';
import {
  scoreGameplaySubmissionAuthoritatively,
  scoreQuestionSubmissionAuthoritatively,
  validateCompleteOrdinalSet
} from './authoritativeScoring';

function canonicalQuestion(id='vocab-transfer-invited'){
  const source = gameModel.buildQuestions().find(question => question.id === id);
  if(!source) throw new Error('fixture question missing');
  return canonicalizeLegacyQuestion(source);
}

function questionSession(question,overrides={}){
  return {
    sessionId:'question-session-1',
    playerId:'player-1',
    questionId:question.id,
    questionVersion:question.currentVersion,
    questionHash:question.currentVersionHash,
    wasRetry:false,
    startedAt:1000,
    dailyId:'daily-2026-09-24',
    gameContext:{district:question.district},
    ...overrides
  };
}

function gameplayReducer(state,event,ctx){
  if(event.kind === 'action'){
    if(event.action.type === 'collect'){
      state.score += event.action.value;
      state.tokens.push({id:ctx.nextEntityId(),value:event.action.value});
    }else if(event.action.type === 'random-bonus'){
      state.score += ctx.randomInt(1,3);
    }else{
      throw new Error('unsupported action');
    }
  }
  if(event.kind === 'tick') state.elapsedTicks++;
}

function buildGameplayRecording(){
  const initialState={score:0,tokens:[],elapsedTicks:0};
  const simulation=new DeterministicSimulation({
    seed:77,
    initialState,
    reducer:gameplayReducer
  });
  const recorder=new ReplayActionRecorder();
  const schedule=(action,tick) => {
    const entry=simulation.schedule(action,{tick});
    recorder.recordScheduled(entry);
  };
  schedule({type:'collect',value:5},0);
  schedule({type:'random-bonus'},2);
  simulation.advanceTicks(5);

  const summary={score:simulation.getState().score,tokens:simulation.getState().tokens.length};
  const recording=createReplayRecording({
    replayId:'gameplay-authority-1',
    initialState,
    simulation,
    actions:recorder.entries(),
    summary,
    createdAt:'2026-09-24T04:00:00Z'
  });

  return {initialState,simulation,summary,recording};
}

describe('server-authoritative question scoring', () => {
  it('derives correctness and rewards from the server-owned canonical answer', () => {
    const question=canonicalQuestion();
    const result=scoreQuestionSubmissionAuthoritatively({
      session:questionSession(question),
      question,
      playerProgress:{stats:{},mastered:[]},
      submission:{
        sessionId:'question-session-1',
        attemptId:'attempt-1',
        selectedAnswer:question.version.answer
      },
      answeredAt:2400
    });

    expect(result.accepted).toBe(true);
    expect(result.result.correct).toBe(true);
    expect(result.attempt.playerId).toBe('player-1');
    expect(result.attempt.questionId).toBe(question.id);
    expect(result.progressPatch.coinsDelta).toBeGreaterThan(0);
    expect(result.progressPatch.transferWinsDelta).toBe(1);
  });

  it('does not accept client-claimed correctness, rewards, player, or question identity', () => {
    const question=canonicalQuestion();

    expect(() => scoreQuestionSubmissionAuthoritatively({
      session:questionSession(question),
      question,
      playerProgress:{stats:{},mastered:[]},
      submission:{
        sessionId:'question-session-1',
        attemptId:'attempt-2',
        selectedAnswer:question.version.answer,
        correct:true,
        coins:999999,
        playerId:'someone-else',
        questionId:'easier-question'
      },
      answeredAt:2400
    })).toThrow(/client-controlled outcome fields/);
  });

  it('rejects answers that were not among the issued choices', () => {
    const question=canonicalQuestion();
    expect(() => scoreQuestionSubmissionAuthoritatively({
      session:questionSession(question),
      question,
      playerProgress:{stats:{},mastered:[]},
      submission:{
        sessionId:'question-session-1',
        attemptId:'attempt-3',
        selectedAnswer:'secret fourth option'
      },
      answeredAt:2400
    })).toThrow(/issued choice/);
  });

  it('preserves the existing retry rule: retries cannot earn coins, mastery, or transfer evidence', () => {
    const question=canonicalQuestion();
    const result=scoreQuestionSubmissionAuthoritatively({
      session:questionSession(question,{wasRetry:true}),
      question,
      playerProgress:{
        stats:{[question.version.skill]:{seen:3,correct:3,masteryCorrect:3}},
        mastered:[]
      },
      submission:{
        sessionId:'question-session-1',
        attemptId:'attempt-retry',
        selectedAnswer:question.version.answer
      },
      answeredAt:2600
    });

    expect(result.result.correct).toBe(true);
    expect(result.result.retry).toBe(true);
    expect(result.progressPatch.coinsDelta).toBe(0);
    expect(result.progressPatch.starsDelta).toBe(0);
    expect(result.progressPatch.transferWinsDelta).toBe(0);
    expect(result.progressPatch.masteredSkill).toBeNull();
  });

  it('awards mastery only from trusted independent evidence', () => {
    const question=canonicalQuestion();
    const result=scoreQuestionSubmissionAuthoritatively({
      session:questionSession(question),
      question,
      playerProgress:{
        stats:{[question.version.skill]:{seen:3,correct:3,masteryCorrect:3}},
        mastered:[]
      },
      submission:{
        sessionId:'question-session-1',
        attemptId:'attempt-mastery',
        selectedAnswer:question.version.answer
      },
      answeredAt:2600
    });

    expect(result.progressPatch.skillStat.masteryCorrect).toBe(4);
    expect(result.progressPatch.masteredSkill).toBe(question.version.skill);
    expect(result.progressPatch.starsDelta).toBe(1);
  });
});

describe('server-owned ordinal completeness', () => {
  it('requires an exact contiguous 1..N set rather than only unique in-range values', () => {
    expect(validateCompleteOrdinalSet([
      {round:1},{round:2},{round:3}
    ],{expectedCount:3})).toEqual({ok:true});

    expect(validateCompleteOrdinalSet([
      {round:1},{round:2},{round:4}
    ],{expectedCount:3}).ok).toBe(false);

    expect(validateCompleteOrdinalSet([
      {round:1},{round:1},{round:2}
    ],{expectedCount:3}).ok).toBe(false);
  });
});

describe('server-authoritative deterministic gameplay scoring', () => {
  it('returns only the summary independently reconstructed from trusted setup + actions', () => {
    const {initialState,recording,summary}=buildGameplayRecording();
    const result=scoreGameplaySubmissionAuthoritatively({
      session:{
        sessionId:'game-session-1',
        playerId:'player-1',
        seed:77,
        engineVersion:SIM_ENGINE_VERSION,
        initialState,
        maxTicks:100
      },
      submission:{
        sessionId:'game-session-1',
        recording
      },
      reducer:gameplayReducer,
      summaryBuilder:state => ({score:state.score,tokens:state.tokens.length})
    });

    expect(result.accepted).toBe(true);
    expect(result.verdict).toBe('verified');
    expect(result.authoritativeSummary).toEqual(summary);
    expect(result.playerId).toBe('player-1');
  });

  it('rejects client-supplied score/final-state claims at the request boundary', () => {
    const {initialState,recording}=buildGameplayRecording();
    expect(() => scoreGameplaySubmissionAuthoritatively({
      session:{
        sessionId:'game-session-1',
        playerId:'player-1',
        seed:77,
        engineVersion:SIM_ENGINE_VERSION,
        initialState
      },
      submission:{
        sessionId:'game-session-1',
        recording,
        score:999999,
        finalState:{score:999999}
      },
      reducer:gameplayReducer,
      summaryBuilder:state => ({score:state.score,tokens:state.tokens.length})
    })).toThrow(/client-controlled outcome fields/);
  });

  it('rejects a replay seed that differs from the server-issued session seed', () => {
    const {initialState,recording}=buildGameplayRecording();
    const changed=JSON.parse(JSON.stringify(recording));
    changed.manifest.seed=78;

    const result=scoreGameplaySubmissionAuthoritatively({
      session:{
        sessionId:'game-session-1',
        playerId:'player-1',
        seed:77,
        engineVersion:SIM_ENGINE_VERSION,
        initialState
      },
      submission:{sessionId:'game-session-1',recording:changed},
      reducer:gameplayReducer
    });

    expect(result.accepted).toBe(false);
    expect(result.verdict).toBe('unverifiable');
    expect(result.reason).toMatch(/seed/);
  });
});
