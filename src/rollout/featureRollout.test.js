
import { describe,expect,it } from 'vitest';
import { stableHash } from '../domainSchemas.js';
import {
  cohortPercent,
  createFeatureRolloutConfig,
  deterministicCohortBucket,
  resolveFeatureRollout,
  runSafeRollout,
  verifyFeatureRolloutConfig
} from './featureRollout.js';

function subjectWithMidBucket(featureId='selector-v2'){
  for(let index=0;index<10_000;index++){
    const subjectId='player-' + index;
    const bucket=cohortPercent({featureId,subjectId});
    if(bucket > 10 && bucket < 90) return {subjectId,bucket};
  }
  throw new Error('fixture bucket not found');
}

describe('Step 18: deterministic rollout cohorts and kill switches', () => {
  it('assigns the same subject to the same deterministic cohort', () => {
    const input={featureId:'selector-v2',subjectId:'player-123',salt:'launch-a'};
    expect(deterministicCohortBucket(input)).toBe(deterministicCohortBucket(input));
    expect(cohortPercent(input)).toBe(deterministicCohortBucket(input) / 100);
  });

  it('separates control, shadow, and experimental behavior deterministically', () => {
    const {subjectId,bucket}=subjectWithMidBucket();

    const experimental=createFeatureRolloutConfig({
      features:{
        'selector-v2':{
          enabled:true,
          evaluatePercent:bucket + 1,
          usePercent:bucket + 1
        }
      }
    });
    expect(resolveFeatureRollout(experimental,{
      featureId:'selector-v2',subjectId,callsite:'quest'
    }).mode).toBe('experimental');

    const shadow=createFeatureRolloutConfig({
      features:{
        'selector-v2':{
          enabled:true,
          evaluatePercent:bucket + 1,
          usePercent:0
        }
      }
    });
    expect(resolveFeatureRollout(shadow,{
      featureId:'selector-v2',subjectId,callsite:'quest'
    }).mode).toBe('shadow');

    const control=createFeatureRolloutConfig({
      features:{
        'selector-v2':{
          enabled:true,
          evaluatePercent:bucket - 1,
          usePercent:0
        }
      }
    });
    expect(resolveFeatureRollout(control,{
      featureId:'selector-v2',subjectId,callsite:'quest'
    }).mode).toBe('control');
  });

  it('lets callsites shadow an experimental cohort until explicitly approved for use', () => {
    const {subjectId,bucket}=subjectWithMidBucket();
    const config=createFeatureRolloutConfig({
      features:{
        'selector-v2':{
          enabled:true,
          evaluatePercent:bucket + 1,
          usePercent:bucket + 1,
          useExperimentalCallsites:['daily-factory']
        }
      }
    });

    const quest=resolveFeatureRollout(config,{
      featureId:'selector-v2',
      subjectId,
      callsite:'quest'
    });
    const daily=resolveFeatureRollout(config,{
      featureId:'selector-v2',
      subjectId,
      callsite:'daily-factory'
    });

    expect(quest.mode).toBe('shadow');
    expect(quest.useExperimental).toBe(false);
    expect(daily.mode).toBe('experimental');
    expect(daily.useExperimental).toBe(true);
  });

  it('gives global, contextual, and feature kill switches absolute precedence over allowlists', () => {
    const subjectId='vip-player';

    const global=createFeatureRolloutConfig({
      globalKillSwitch:true,
      features:{
        'selector-v2':{
          enabled:true,
          evaluatePercent:100,
          usePercent:100,
          allowSubjects:[subjectId]
        }
      }
    });
    expect(resolveFeatureRollout(global,{
      featureId:'selector-v2',subjectId
    }).mode).toBe('killed');

    const contextual=createFeatureRolloutConfig({
      features:{
        'selector-v2':{
          enabled:true,
          evaluatePercent:100,
          usePercent:100,
          allowSubjects:[subjectId]
        }
      },
      killSwitches:[
        {
          id:'disable-ios-build',
          featureId:'selector-v2',
          match:{platform:'ios',build:'bad-build'}
        }
      ]
    });
    const killed=resolveFeatureRollout(contextual,{
      featureId:'selector-v2',
      subjectId,
      context:{platform:'ios',build:'bad-build'}
    });
    expect(killed.mode).toBe('killed');
    expect(killed.reason).toMatch(/disable-ios-build/);

    const feature=createFeatureRolloutConfig({
      features:{
        'selector-v2':{
          enabled:true,
          killSwitch:true,
          evaluatePercent:100,
          usePercent:100,
          allowSubjects:[subjectId]
        }
      }
    });
    expect(resolveFeatureRollout(feature,{
      featureId:'selector-v2',subjectId
    }).mode).toBe('killed');
  });

  it('rejects duplicate kill-switch IDs so emergency rules remain uniquely attributable', () => {
    const config=JSON.parse(JSON.stringify(createFeatureRolloutConfig({
      features:{
        'selector-v2':{enabled:true,evaluatePercent:100,usePercent:100}
      },
      killSwitches:[
        {id:'emergency-off',featureId:'selector-v2',match:{platform:'ios'}},
        {id:'another-rule',featureId:'selector-v2',match:{platform:'android'}}
      ]
    })));
    config.killSwitches[1].id='emergency-off';
    config.configHash=stableHash({
      schemaVersion:config.schemaVersion,
      rolloutVersion:config.rolloutVersion,
      globalKillSwitch:config.globalKillSwitch,
      features:config.features,
      killSwitches:config.killSwitches
    });

    const validation=verifyFeatureRolloutConfig(config);
    expect(validation.ok).toBe(false);
    expect(validation.errors.join(' ')).toMatch(/duplicate kill switch ID/);
  });

  it('fails closed to control when rollout config integrity is broken', () => {
    const config=JSON.parse(JSON.stringify(createFeatureRolloutConfig({
      features:{
        'selector-v2':{enabled:true,evaluatePercent:100,usePercent:100}
      }
    })));
    config.features['selector-v2'].usePercent=99;

    expect(verifyFeatureRolloutConfig(config).ok).toBe(false);
    const decision=resolveFeatureRollout(config,{
      featureId:'selector-v2',
      subjectId:'player'
    });
    expect(decision.mode).toBe('control');
    expect(decision.reason).toMatch(/invalid rollout config/);
  });

  it('keeps shadow output on control while comparing the experimental path', async () => {
    const decision={
      evaluateExperimental:true,
      useExperimental:false
    };
    const result=await runSafeRollout({
      decision,
      control:async () => ({selected:'old',score:1}),
      experimental:async () => ({score:1,selected:'old'})
    });

    expect(result.chosen).toBe('control');
    expect(result.value.selected).toBe('old');
    expect(result.comparison.exactMatch).toBe(true);
  });

  it('uses experimental output only when authorized and falls back on experimental errors', async () => {
    const experimental=await runSafeRollout({
      decision:{evaluateExperimental:true,useExperimental:true},
      control:() => 'control',
      experimental:() => 'new'
    });
    expect(experimental.chosen).toBe('experimental');
    expect(experimental.value).toBe('new');

    const failed=await runSafeRollout({
      decision:{evaluateExperimental:true,useExperimental:true},
      control:() => 'control',
      experimental:() => { throw new Error('boom'); }
    });
    expect(failed.chosen).toBe('control');
    expect(failed.value).toBe('control');
    expect(failed.comparison.experimentalError).toMatch(/boom/);
  });
});
