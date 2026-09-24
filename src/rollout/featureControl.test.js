
import { describe,expect,it } from 'vitest';
import {
  cohortAssignment,
  createFeatureControlConfig,
  evaluateFeature,
  evaluateFeatureSet,
  rolloutBucket,
  verifyFeatureControlConfig
} from './featureControl.js';

function config(overrides={}){
  return createFeatureControlConfig({
    version:'rollout-test-v1',
    features:{
      'question-policy-v1':{
        enabled:true,
        default:false,
        identityFields:['playerId'],
        segments:[
          {
            name:'all-players',
            rollout:50,
            conditions:[]
          }
        ]
      },
      'replay-ghosts':{
        enabled:true,
        default:false,
        identityFields:['playerId'],
        segments:[
          {
            name:'daily-players',
            rollout:100,
            conditions:[
              {property:'mode',operator:'equals',value:'daily'}
            ]
          }
        ]
      },
      ...(overrides.features || {})
    },
    killSwitches:overrides.killSwitches || []
  });
}

describe('Step 18: deterministic cohorts and kill switches', () => {
  it('assigns the same player to a stable rollout bucket across repeated evaluations', () => {
    const cfg=config();
    const feature=cfg.features['question-policy-v1'];
    const context={playerId:'player-stable',mode:'quest'};

    const bucketA=rolloutBucket('question-policy-v1',feature,context);
    const bucketB=rolloutBucket('question-policy-v1',feature,{...context});

    expect(bucketA).toBe(bucketB);
    expect(evaluateFeature(cfg,'question-policy-v1',context)).toEqual(
      evaluateFeature(cfg,'question-policy-v1',{...context})
    );
  });

  it('produces both active and control cohorts under a 50% rollout without session randomness', () => {
    const cfg=config();
    const assignments=Array.from({length:200},(_,index) =>
      cohortAssignment(cfg,'question-policy-v1',{playerId:'p-' + index}).cohort
    );

    expect(assignments).toContain('active');
    expect(assignments).toContain('control');

    const repeated=Array.from({length:10},() =>
      cohortAssignment(cfg,'question-policy-v1',{playerId:'p-42'}).cohort
    );
    expect(new Set(repeated).size).toBe(1);
  });

  it('requires all segment conditions and falls back to the feature default otherwise', () => {
    const cfg=config();

    expect(evaluateFeature(cfg,'replay-ghosts',{
      playerId:'p1',
      mode:'daily'
    }).enabled).toBe(true);

    const off=evaluateFeature(cfg,'replay-ghosts',{
      playerId:'p1',
      mode:'quest'
    });
    expect(off.enabled).toBe(false);
    expect(off.reason).toBe('no_matching_segment');
  });

  it('gives a targeted kill switch precedence over a matching 100% rollout', () => {
    const cfg=config({
      killSwitches:[
        {
          feature:'replay-ghosts',
          playerId:'blocked-player'
        }
      ]
    });

    const blocked=evaluateFeature(cfg,'replay-ghosts',{
      playerId:'blocked-player',
      mode:'daily'
    });
    const allowed=evaluateFeature(cfg,'replay-ghosts',{
      playerId:'other-player',
      mode:'daily'
    });

    expect(blocked.enabled).toBe(false);
    expect(blocked.reason).toBe('kill_switch');
    expect(blocked.matchedKillSwitches).toHaveLength(1);
    expect(allowed.enabled).toBe(true);
  });

  it('supports wildcard kill-switch fields for break-glass shutdowns', () => {
    const cfg=config({
      killSwitches:[
        {
          feature:'question-policy-v1',
          playerId:null
        }
      ]
    });

    expect(evaluateFeature(cfg,'question-policy-v1',{playerId:'a'}).reason).toBe('kill_switch');
    expect(evaluateFeature(cfg,'question-policy-v1',{playerId:'b'}).reason).toBe('kill_switch');
  });

  it('detects config tampering and can evaluate multiple flags from one frozen config', () => {
    const cfg=config();
    expect(verifyFeatureControlConfig(cfg)).toEqual({ok:true,errors:[]});

    const decisions=evaluateFeatureSet(cfg,[
      'question-policy-v1',
      'replay-ghosts'
    ],{
      playerId:'multi-player',
      mode:'daily'
    });
    expect(Object.keys(decisions)).toEqual(['question-policy-v1','replay-ghosts']);

    const tampered=JSON.parse(JSON.stringify(cfg));
    tampered.features['replay-ghosts'].segments[0].rollout=0;
    expect(verifyFeatureControlConfig(tampered).ok).toBe(false);
  });
});
