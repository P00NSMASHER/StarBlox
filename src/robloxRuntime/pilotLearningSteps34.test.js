import {describe,expect,it} from 'vitest';
import {buildPilotMetricsProbeScript,parsePilotMetricsLogs} from './pilotLiveMetrics.js';
import {buildPilotBaseline} from './pilotLearningBaseline.js';
import {calibratePilotItems} from './pilotItemCalibration.js';

function bank(){
  return {
    generatedFrom:{bankSnapshotId:'abvm-test-bank'},
    questions:[
      {id:'q1',subject:'Reading / ELA',domain:'Comprehension',skill:'inference',difficulty:3},
      {id:'q2',subject:'Math',domain:'Numbers',skill:'place-value',difficulty:2},
      {id:'q3',subject:'Math',domain:'Numbers',skill:'subtraction-within-100',difficulty:3}
    ]
  };
}
function row(overrides={}){
  return {
    pilotAttempts:10,pilotCorrect:6,pilotWrong:4,
    firstPilotAttempts:8,firstPilotCorrect:5,
    pilotRubricPoints:14,pilotRubricMaxPoints:20,
    firstPilotBucketCounts:{current:3,'star-reading':2,spaced:3},
    pilotResponseTimeBands:{'under-5s':1,'5-15s':5,'15-30s':3,'30s-plus':1},
    pilotMisconceptionCounts:{'unsupported-inference':2},
    baselinePilotAttempts:10,baselinePilotCorrect:6,baselinePilotWrong:4,
    baselineFirstAttempts:8,baselineFirstCorrect:5,
    baselineRubricPoints:14,baselineRubricMaxPoints:20,
    baselineFirstBucketCounts:{current:3,'star-reading':2,spaced:3},
    baselineResponseTimeBands:{'under-5s':1,'5-15s':5,'15-30s':3,'30s-plus':1},
    baselineMisconceptionCounts:{'unsupported-inference':2},
    sumPilotSessionAccuracy:5.4,
    sumPilotSessionAccuracySquared:3.9,
    sumPilotItemSessionProduct:3.6,
    ...overrides
  };
}
function live({completed=3,items={q1:row(),q2:row(),q3:row()}}={}){
  return {
    liveMetricsVersion:'starblox-pilot-live-metrics-v1',
    placeVersion:24,
    metricsVersion:'starblox-question-item-metrics-v2-pilot-baseline',
    metricsUpdatedAt:123,
    itemMetrics:items,
    retention:{
      pilotSessionsStarted:completed,
      pilotSessionsCompleted:completed,
      baselinePilotSessionsStarted:completed,
      baselinePilotSessionsCompleted:completed
    }
  };
}

describe('Steps 3-4 pilot learning evidence',()=>{
  it('reads only the privacy-minimized v2 stores through headless Roblox',()=>{
    const script=buildPilotMetricsProbeScript();
    expect(script).toContain('StarBloxQuestionItemMetrics_v2');
    expect(script).toContain('StarBloxPrivateRetention_v1');
    expect(script).toContain('STARBLOX_PILOT_METRICS_CHUNK');
    expect(script).not.toContain('GetPlayerByUserId');
    expect(script).not.toContain('Players:GetPlayers');
  });

  it('reassembles chunked live-metric logs deterministically',()=>{
    const payload={
      schemaVersion:1,
      liveMetricsVersion:'starblox-pilot-live-metrics-v1',
      placeVersion:24,
      metricsVersion:'starblox-question-item-metrics-v2-pilot-baseline',
      itemMetrics:{},
      retention:{pilotSessionsCompleted:0}
    };
    const json=JSON.stringify(payload);
    const cut=Math.floor(json.length/2);
    const logs={logs:[
      {message:'STARBLOX_PILOT_METRICS_CHUNK 2/2 '+json.slice(cut)},
      {message:'STARBLOX_PILOT_METRICS_CHUNK 1/2 '+json.slice(0,cut)}
    ]};
    expect(parsePilotMetricsLogs(logs)).toEqual(payload);
  });

  it('establishes a baseline only after 54 first attempts and 3 completed sessions',()=>{
    const collecting=buildPilotBaseline({
      liveMetrics:live({completed:2,items:{q1:row({firstPilotAttempts:20,firstPilotCorrect:12})}}),
      bankSource:bank()
    });
    expect(collecting.status).toBe('collecting-baseline');
    expect(collecting.readiness.baselineEstablished).toBe(false);

    const established=buildPilotBaseline({
      liveMetrics:live({completed:3,items:{
        q1:row({firstPilotAttempts:18,firstPilotCorrect:12}),
        q2:row({firstPilotAttempts:18,firstPilotCorrect:13}),
        q3:row({firstPilotAttempts:18,firstPilotCorrect:11})
      }}),
      bankSource:bank()
    });
    expect(established.status).toBe('baseline-established');
    expect(established.readiness.firstAttempts).toBe(54);
    expect(established.readiness.baselineEstablished).toBe(true);
    expect(established.privacy.containsUserIds).toBe(false);
    expect(established.privacy.containsRawAnswers).toBe(false);
  });

  it('keeps calibration fail-closed below 100 first attempts / 6 sessions',()=>{
    const baseline=buildPilotBaseline({
      liveMetrics:live({completed:5,items:{
        q1:row({firstPilotAttempts:30,firstPilotCorrect:18}),
        q2:row({firstPilotAttempts:30,firstPilotCorrect:20}),
        q3:row({firstPilotAttempts:30,firstPilotCorrect:17})
      }}),
      bankSource:bank()
    });
    const report=calibratePilotItems({baseline,liveMetrics:live({completed:5}),bankSource:bank()});
    expect(report.status).toBe('collecting-evidence');
    expect(report.readiness.calibrationReady).toBe(false);
    expect(report.governance.autoApply).toBe(false);
    expect(report.governance.questionBankMutationPerformed).toBe(false);
    expect(report.items.every(item=>item.action==='collect-more-data')).toBe(true);
  });

  it('creates review/rewrite/retire candidates after real thresholds but never auto-applies',()=>{
    const metrics=live({completed:6,items:{
      q1:row({
        pilotAttempts:12,pilotCorrect:2,pilotWrong:10,
        firstPilotAttempts:10,firstPilotCorrect:2,
        pilotResponseTimeBands:{'30s-plus':7},
        pilotMisconceptionCounts:{'unsupported-inference':7}
      }),
      q2:row({
        pilotAttempts:10,pilotCorrect:10,pilotWrong:0,
        firstPilotAttempts:10,firstPilotCorrect:10,
        pilotResponseTimeBands:{'5-15s':10},
        pilotMisconceptionCounts:{}
      }),
      q3:row({
        pilotAttempts:86,pilotCorrect:61,pilotWrong:25,
        firstPilotAttempts:80,firstPilotCorrect:56,
        pilotResponseTimeBands:{'5-15s':70,'15-30s':16},
        pilotMisconceptionCounts:{'off-by-one':10}
      })
    }});
    const baseline=buildPilotBaseline({liveMetrics:metrics,bankSource:bank()});
    expect(baseline.readiness.firstAttempts).toBe(100);
    expect(baseline.readiness.calibrationReady).toBe(true);
    const report=calibratePilotItems({baseline,liveMetrics:metrics,bankSource:bank()});
    expect(report.status).toBe('calibration-ready');
    expect(report.items.find(x=>x.questionId==='q1').action).toBe('rewrite-candidate');
    expect(report.items.find(x=>x.questionId==='q2').action).toBe('retire-candidate');
    expect(report.governance.autoApply).toBe(false);
    expect(report.governance.requiresReviewBeforeRewrite).toBe(true);
    expect(report.evidenceHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
