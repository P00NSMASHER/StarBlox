import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {buildPilotBaseline} from './pilotLearningBaseline.js';
import {buildPilotMetricsProbeScript} from './pilotLiveMetrics.js';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}
function bank(){
  return {
    generatedFrom:{bankSnapshotId:'abvm-baseline-test'},
    questions:[
      {id:'q1',subject:'Reading / ELA',domain:'Comprehension',skill:'inference',difficulty:3},
      {id:'q2',subject:'Math',domain:'Numbers',skill:'place-value',difficulty:2}
    ]
  };
}
function row(overrides={}){
  return {
    pilotAttempts:100,pilotCorrect:90,pilotWrong:10,
    firstPilotAttempts:80,firstPilotCorrect:72,
    pilotRubricPoints:180,pilotRubricMaxPoints:200,
    pilotResponseTimeBands:{'5-15s':90,'30s-plus':10},
    pilotMisconceptionCounts:{'post-baseline':10},

    baselinePilotAttempts:30,baselinePilotCorrect:18,baselinePilotWrong:12,
    baselineFirstAttempts:27,baselineFirstCorrect:16,
    baselineRubricPoints:42,baselineRubricMaxPoints:60,
    baselineFirstBucketCounts:{current:9,spaced:6,'star-reading':6,'star-math':6},
    baselineResponseTimeBands:{'5-15s':20,'15-30s':7,'30s-plus':3},
    baselineMisconceptionCounts:{'unsupported-inference':5},
    ...overrides
  };
}

describe('Step 3: frozen learning baseline integrity',()=>{
  it('freezes adaptive difficulty during the baseline cohort only',()=>{
    const config=read('roblox/src/shared/CoreLoopConfig.luau');
    const server=read('roblox/src/server/CoreGameLoopService.luau');
    expect(config).toContain('FreezeAdaptiveDifficultyDuringBaseline = true');
    expect(server).toContain('pilotState.SessionsCompleted < Config.PilotMode.BaselineMinCompletedSessions');
    expect(server).toContain('not (session.baselinePhase == true)');
    expect(server).toContain('local mutateAdaptive = updateAdaptive ~= false');
    expect(server).toContain('if mutateAdaptive then');
  });

  it('buffers baseline attempts until a full pilot completes',()=>{
    const telemetry=read('roblox/src/server/PrivatePlaytestTelemetryService.luau');
    expect(telemetry).toContain('baselinePending = {}');
    expect(telemetry).toContain('ensureBaselinePending');
    expect(telemetry).toContain('commitBaselinePending');
    expect(telemetry).toContain('elseif eventName == "pilot_completed" then');
    expect(telemetry).toContain('commitBaselinePending(report, pilotSessionNumber)');
    expect(telemetry).toContain('baselinePilotSessionsCompleted += 1');
  });

  it('uses attemptIndex=1 rather than runtime-session uniqueness for baseline first attempts',()=>{
    const telemetry=read('roblox/src/server/PrivatePlaytestTelemetryService.luau');
    expect(telemetry).toContain('local attemptIndex = clampInteger(source.attemptIndex, 1, 100)');
    expect(telemetry).toContain('if attemptIndex == 1 then');
    expect(telemetry).toContain('baselinePendingItem.firstAttempts += 1');
  });

  it('builds the baseline only from frozen baseline fields, excluding later pilot performance',()=>{
    const report=buildPilotBaseline({
      liveMetrics:{
        placeVersion:25,
        metricsVersion:'starblox-question-item-metrics-v2-pilot-baseline',
        itemMetrics:{
          q1:row(),
          q2:row({
            baselinePilotAttempts:30,
            baselinePilotCorrect:20,
            baselinePilotWrong:10,
            baselineFirstAttempts:27,
            baselineFirstCorrect:18
          })
        },
        retention:{
          pilotSessionsStarted:9,
          pilotSessionsCompleted:9,
          baselinePilotSessionsStarted:3,
          baselinePilotSessionsCompleted:3
        }
      },
      bankSource:bank()
    });
    expect(report.status).toBe('baseline-established');
    expect(report.readiness.completedSessions).toBe(3);
    expect(report.readiness.firstAttempts).toBe(54);
    expect(report.overall.firstCorrect).toBe(34);
    expect(report.overall.attempts).toBe(60);
    expect(report.source.frozen).toBe(true);
    expect(report.source.cohort).toBe('first-3-completed-pilot-sessions');
    expect(report.governance.postBaselinePilotDataExcluded).toBe(true);
  });

  it('reads baseline session counts from cross-version item metrics',()=>{
    const probe=buildPilotMetricsProbeScript();
    expect(probe).toContain('metrics.baselinePilotSessionsStarted');
    expect(probe).toContain('metrics.baselinePilotSessionsCompleted');
    expect(probe).toContain('baselineFirstAttempts');
    expect(probe).toContain('baselineResponseTimeBands');
  });

  it('keeps the baseline report privacy-minimized',()=>{
    const report=buildPilotBaseline({
      liveMetrics:{
        itemMetrics:{},
        retention:{baselinePilotSessionsStarted:0,baselinePilotSessionsCompleted:0}
      },
      bankSource:bank()
    });
    expect(report.privacy.containsUsernames).toBe(false);
    expect(report.privacy.containsUserIds).toBe(false);
    expect(report.privacy.containsRawAnswers).toBe(false);
    expect(report.privacy.containsChat).toBe(false);
  });
});
