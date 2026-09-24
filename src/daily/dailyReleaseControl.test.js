
import { describe,expect,it } from 'vitest';
import { gameModel } from '../gameModel.js';
import { importLegacyQuestionBank } from '../questionBank/questionBankV2.js';
import { generateDailyBundleArtifact } from './dailyBundleFactory.js';
import { certifyDailyBundleArtifact } from './dailyCertification.js';
import {
  buildDailyReleaseManifest,
  createDailyReleaseRegistry,
  freezeCertifiedDaily,
  getDailyRelease,
  getPreferredDailyRelease,
  resolveFrozenDaily,
  setPreferredDailyRelease,
  verifyDailyReleaseRegistry
} from './dailyReleaseRegistry.js';
import {
  activateDueDaily,
  createDailyControlPlane,
  dailyReleaseLifecycle,
  deterministicActivationAt,
  retireDailyRelease,
  runDailyControlCycle,
  scheduleDailyRelease,
  verifyDailyControlPlane
} from './dailyControlPlane.js';

function bank(){
  return importLegacyQuestionBank(gameModel.buildQuestions(),{
    bankId:'freeze-control-bank',
    title:'Freeze Control Bank'
  });
}

async function certified(date,spec={}){
  const questions=bank();
  const generated=await generateDailyBundleArtifact({
    date,
    bank:questions,
    spec
  });
  const result=certifyDailyBundleArtifact(generated,{bank:questions});
  if(!result.ok) throw new Error(JSON.stringify(result.report.failures));
  return result.artifact;
}

describe('Step 16: deterministic Daily freeze, fallback and versioning', () => {
  it('freezes a certified Daily exactly once and is idempotent for the same artifact', async () => {
    const artifact=await certified('2026-10-10');
    const empty=createDailyReleaseRegistry();

    const first=freezeCertifiedDaily(empty,artifact,{
      frozenAt:'2026-10-09T23:50:00Z'
    });
    const second=freezeCertifiedDaily(first.registry,artifact,{
      frozenAt:'2026-10-10T00:01:00Z'
    });

    expect(first.created).toBe(true);
    expect(first.release.releaseId).toBe('daily-2026-10-10@v1');
    expect(second.created).toBe(false);
    expect(second.registry).toBe(first.registry);
    expect(second.release).toEqual(first.release);
    expect(verifyDailyReleaseRegistry(first.registry)).toEqual({ok:true,errors:[]});
  });

  it('never overwrites an existing date: changed content requires an explicit new immutable version', async () => {
    const v1Artifact=await certified('2026-10-11');
    const v2Artifact=await certified('2026-10-11',{stageCount:4,optionalCount:2});

    let registry=freezeCertifiedDaily(
      createDailyReleaseRegistry(),
      v1Artifact
    ).registry;

    expect(() => freezeCertifiedDaily(registry,v2Artifact)).toThrow(/new version|overwriting/);

    const added=freezeCertifiedDaily(registry,v2Artifact,{
      allowNewVersion:true,
      reason:'Replace a Daily configuration after pre-release review.'
    });
    registry=added.registry;

    expect(added.release.releaseId).toBe('daily-2026-10-11@v2');
    expect(added.release.supersedesReleaseId).toBe('daily-2026-10-11@v1');
    expect(getDailyRelease(registry,'daily-2026-10-11@v1')).not.toBeNull();
    expect(getDailyRelease(registry,'daily-2026-10-11@v2')).not.toBeNull();
    expect(getPreferredDailyRelease(registry,'2026-10-11').releaseId).toBe('daily-2026-10-11@v2');
  });

  it('supports rollback by switching only the preferred pointer, preserving every release', async () => {
    const a=await certified('2026-10-12');
    const b=await certified('2026-10-12',{stageCount:4,optionalCount:2});

    let registry=freezeCertifiedDaily(createDailyReleaseRegistry(),a).registry;
    registry=freezeCertifiedDaily(registry,b,{
      allowNewVersion:true,
      reason:'Create v2 for test.'
    }).registry;

    registry=setPreferredDailyRelease(
      registry,
      '2026-10-12',
      'daily-2026-10-12@v1',
      {reason:'Rollback after validation signal.'}
    );

    expect(getPreferredDailyRelease(registry,'2026-10-12').releaseId).toBe('daily-2026-10-12@v1');
    expect(registry.dates['2026-10-12'].versions).toHaveLength(2);
  });

  it('builds a sorted manifest and falls back only to an earlier frozen date without regenerating', async () => {
    let registry=createDailyReleaseRegistry();
    for(const date of ['2026-10-10','2026-10-12']){
      registry=freezeCertifiedDaily(registry,await certified(date)).registry;
    }

    const manifest=buildDailyReleaseManifest(registry);
    expect(manifest.dates).toEqual(['2026-10-10','2026-10-12']);

    const exact=resolveFrozenDaily(registry,'2026-10-12');
    expect(exact.fallbackUsed).toBe(false);
    expect(exact.resolvedDate).toBe('2026-10-12');

    const fallback=resolveFrozenDaily(registry,'2026-10-13');
    expect(fallback.fallbackUsed).toBe(true);
    expect(fallback.resolvedDate).toBe('2026-10-12');
    expect(fallback.release.releaseId).toBe('daily-2026-10-12@v1');

    const beforeHistory=resolveFrozenDaily(registry,'2026-10-09');
    expect(beforeHistory.release).toBeNull();

    const noFallback=resolveFrozenDaily(registry,'2026-10-11',{fallback:false});
    expect(noFallback.release).toBeNull();
  });
});

describe('Step 17: Daily schedule and activation control plane', () => {
  it('derives a deterministic activation slot from date + release identity', async () => {
    const artifact=await certified('2026-10-20');
    const frozen=freezeCertifiedDaily(createDailyReleaseRegistry(),artifact);
    const release=frozen.release;

    const first=deterministicActivationAt('2026-10-20',release.releaseId,{
      startHourUtc:13,
      windowMinutes:480,
      slotMinutes:10
    });
    const second=deterministicActivationAt('2026-10-20',release.releaseId,{
      startHourUtc:13,
      windowMinutes:480,
      slotMinutes:10
    });

    expect(first).toBe(second);
    const ms=Date.parse(first);
    expect(ms).toBeGreaterThanOrEqual(Date.parse('2026-10-20T13:00:00Z'));
    expect(ms).toBeLessThanOrEqual(Date.parse('2026-10-20T21:00:00Z'));
  });

  it('schedules idempotently and rejects conflicting replacement unless explicitly authorized', async () => {
    const artifact=await certified('2026-10-21');
    const frozen=freezeCertifiedDaily(createDailyReleaseRegistry(),artifact);
    let control=createDailyControlPlane();

    const first=scheduleDailyRelease(control,frozen.registry,{
      date:'2026-10-21',
      releaseId:frozen.release.releaseId,
      scheduledAt:'2026-10-21T13:30:00Z',
      message:'Daily ready',
      now:'2026-10-21T12:00:00Z'
    });
    control=first.control;

    const same=scheduleDailyRelease(control,frozen.registry,{
      date:'2026-10-21',
      releaseId:frozen.release.releaseId,
      scheduledAt:'2026-10-21T13:30:00Z',
      message:'Daily ready',
      now:'2026-10-21T12:05:00Z'
    });
    expect(same.created).toBe(false);
    expect(same.control).toBe(control);

    expect(() => scheduleDailyRelease(control,frozen.registry,{
      date:'2026-10-21',
      releaseId:frozen.release.releaseId,
      scheduledAt:'2026-10-21T14:00:00Z'
    })).toThrow(/already exists/);

    const replaced=scheduleDailyRelease(control,frozen.registry,{
      date:'2026-10-21',
      releaseId:frozen.release.releaseId,
      scheduledAt:'2026-10-21T14:00:00Z',
      replace:true,
      reason:'Move the activation window.'
    });
    expect(replaced.replaced).toBe(true);
    expect(replaced.schedule.scheduledAt).toBe('2026-10-21T14:00:00.000Z');
  });

  it('does not activate before the scheduled time, then activates exactly once with one idempotent notification intent', async () => {
    const artifact=await certified('2026-10-22');
    const frozen=freezeCertifiedDaily(createDailyReleaseRegistry(),artifact);
    let control=scheduleDailyRelease(createDailyControlPlane(),frozen.registry,{
      date:'2026-10-22',
      releaseId:frozen.release.releaseId,
      scheduledAt:'2026-10-22T13:30:00Z',
      message:'Today\'s StarBlox Daily is live.'
    }).control;

    const early=activateDueDaily(control,frozen.registry,{
      date:'2026-10-22',
      now:'2026-10-22T13:29:59Z'
    });
    expect(early.status).toBe('not_due');
    expect(early.control).toBe(control);

    const active=activateDueDaily(control,frozen.registry,{
      date:'2026-10-22',
      now:'2026-10-22T13:30:00Z'
    });
    control=active.control;

    expect(active.status).toBe('activated');
    expect(active.notificationIntents).toHaveLength(1);
    expect(active.notificationIntents[0].idempotencyKey).toBe(active.activationKey);
    expect(dailyReleaseLifecycle(control,frozen.registry,frozen.release.releaseId)).toBe('active');

    const repeated=activateDueDaily(control,frozen.registry,{
      date:'2026-10-22',
      now:'2026-10-22T14:00:00Z'
    });
    expect(repeated.status).toBe('already_active');
    expect(repeated.notificationIntents).toEqual([]);
    expect(repeated.control).toBe(control);
  });

  it('models the cron cycle as schedule-first, then activate-when-due', async () => {
    const artifact=await certified('2026-10-23');
    const frozen=freezeCertifiedDaily(createDailyReleaseRegistry(),artifact);
    let control=createDailyControlPlane();

    const scheduled=runDailyControlCycle(control,frozen.registry,{
      date:'2026-10-23',
      now:'2026-10-23T00:00:00Z',
      activationWindow:{
        startHourUtc:0,
        startMinuteUtc:5,
        windowMinutes:0
      }
    });
    control=scheduled.control;
    expect(scheduled.status).toBe('scheduled');
    expect(dailyReleaseLifecycle(control,frozen.registry,frozen.release.releaseId)).toBe('scheduled');

    const early=runDailyControlCycle(control,frozen.registry,{
      date:'2026-10-23',
      now:'2026-10-23T00:04:59Z'
    });
    expect(early.status).toBe('not_due');

    const activated=runDailyControlCycle(control,frozen.registry,{
      date:'2026-10-23',
      now:'2026-10-23T00:05:00Z'
    });
    expect(activated.status).toBe('activated');
  });

  it('never schedules yesterday as today when the exact frozen Daily is missing', async () => {
    const yesterday=await certified('2026-10-24');
    const frozen=freezeCertifiedDaily(createDailyReleaseRegistry(),yesterday);

    const result=runDailyControlCycle(createDailyControlPlane(),frozen.registry,{
      date:'2026-10-25',
      now:'2026-10-25T00:00:00Z'
    });

    expect(result.status).toBe('no_release');
    expect(result.release).toBeNull();
    expect(result.control.schedules['2026-10-25']).toBeUndefined();
    expect(result.notificationIntents).toHaveLength(1);
    expect(result.notificationIntents[0].type).toBe('daily-missing-release');
  });

  it('retires an active Daily without deleting its immutable release or history', async () => {
    const artifact=await certified('2026-10-26');
    const frozen=freezeCertifiedDaily(createDailyReleaseRegistry(),artifact);
    let control=scheduleDailyRelease(createDailyControlPlane(),frozen.registry,{
      date:'2026-10-26',
      releaseId:frozen.release.releaseId,
      scheduledAt:'2026-10-26T00:05:00Z'
    }).control;
    control=activateDueDaily(control,frozen.registry,{
      date:'2026-10-26',
      now:'2026-10-26T00:05:00Z'
    }).control;

    control=retireDailyRelease(control,frozen.registry,{
      date:'2026-10-26',
      now:'2026-10-27T00:00:00Z',
      reason:'Daily window completed.'
    });

    expect(dailyReleaseLifecycle(control,frozen.registry,frozen.release.releaseId)).toBe('retired');
    expect(getDailyRelease(frozen.registry,frozen.release.releaseId)).not.toBeNull();
    expect(control.history.map(event => event.type)).toEqual(['scheduled','activated','retired']);
    expect(verifyDailyControlPlane(control,frozen.registry)).toEqual({ok:true,errors:[]});
  });

  it('rejects scheduling a release under the wrong calendar date', async () => {
    const artifact=await certified('2026-10-27');
    const frozen=freezeCertifiedDaily(createDailyReleaseRegistry(),artifact);

    expect(() => scheduleDailyRelease(createDailyControlPlane(),frozen.registry,{
      date:'2026-10-28',
      releaseId:frozen.release.releaseId,
      scheduledAt:'2026-10-28T00:05:00Z'
    })).toThrow(/belongs to/);
  });
});
