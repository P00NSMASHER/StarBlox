
import { stableHash } from '../domainSchemas.js';
import { assertDailyPublishable } from './dailyCertification.js';
import {
  getDailyRelease,
  getPreferredDailyRelease,
  verifyDailyReleaseRegistry
} from './dailyReleaseRegistry.js';

export const DAILY_CONTROL_SCHEMA_VERSION=1;
export const DAILY_CONTROL_VERSION='daily-control-v1';

const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function requireDate(value,label='date'){
  if(typeof value !== 'string' || !DATE_RE.test(value)){
    throw new TypeError(label + ' must use YYYY-MM-DD.');
  }
  const parsed=new Date(value + 'T00:00:00Z');
  if(Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value){
    throw new TypeError(label + ' must be a valid calendar date.');
  }
  return value;
}

function iso(value,label){
  const source=value instanceof Date ? value : new Date(value);
  if(Number.isNaN(source.getTime())) throw new TypeError(label + ' must be a valid date/time.');
  return source.toISOString();
}

function requireString(value,label){
  if(typeof value !== 'string' || !value.trim()) throw new TypeError(label + ' must be a non-empty string.');
  return value.trim();
}

function schedulePayload(schedule){
  return {
    date:schedule.date,
    releaseId:schedule.releaseId,
    scheduledAt:schedule.scheduledAt,
    message:schedule.message ?? null
  };
}

function controlPayload(control){
  return {
    schemaVersion:control.schemaVersion,
    controlVersion:control.controlVersion,
    schedules:control.schedules,
    activeByDate:control.activeByDate,
    history:control.history
  };
}

function finalize(raw){
  const base={
    schemaVersion:DAILY_CONTROL_SCHEMA_VERSION,
    controlVersion:DAILY_CONTROL_VERSION,
    schedules:clone(raw.schedules || {}),
    activeByDate:clone(raw.activeByDate || {}),
    history:clone(raw.history || [])
  };
  return deepFreeze({
    ...base,
    controlHash:stableHash(controlPayload(base))
  });
}

export function createDailyControlPlane(){
  return finalize({
    schedules:{},
    activeByDate:{},
    history:[]
  });
}

export function verifyDailyControlPlane(control,registry=null){
  const errors=[];
  if(!control || typeof control !== 'object' || Array.isArray(control)){
    return {ok:false,errors:['control plane must be an object']};
  }
  if(control.schemaVersion !== DAILY_CONTROL_SCHEMA_VERSION){
    errors.push('unsupported control schema version');
  }
  if(control.controlVersion !== DAILY_CONTROL_VERSION){
    errors.push('unsupported control implementation version');
  }
  if(!control.schedules || typeof control.schedules !== 'object' || Array.isArray(control.schedules)){
    errors.push('schedules must be an object');
  }
  if(!control.activeByDate || typeof control.activeByDate !== 'object' || Array.isArray(control.activeByDate)){
    errors.push('activeByDate must be an object');
  }
  if(!Array.isArray(control.history)) errors.push('history must be an array');

  if(registry){
    const rv=verifyDailyReleaseRegistry(registry);
    if(!rv.ok) errors.push('invalid release registry: ' + rv.errors[0]);
  }

  for(const [date,schedule] of Object.entries(control.schedules || {})){
    try{ requireDate(date,'schedule date'); }
    catch(error){ errors.push(error.message); continue; }

    if(schedule.date !== date) errors.push('schedule date mismatch for ' + date);
    try{
      const scheduledIso=iso(schedule.scheduledAt,'scheduledAt');
      if(scheduledIso.slice(0,10) !== date){
        errors.push('scheduledAt falls outside schedule date ' + date);
      }
    }catch(error){ errors.push(error.message); }

    const expectedHash=stableHash(schedulePayload(schedule));
    if(schedule.scheduleHash !== expectedHash){
      errors.push('schedule hash mismatch for ' + date);
    }

    if(schedule.triggeredAt != null){
      try{ iso(schedule.triggeredAt,'triggeredAt'); }
      catch(error){ errors.push(error.message); }
    }
    if(schedule.retiredAt != null){
      try{ iso(schedule.retiredAt,'retiredAt'); }
      catch(error){ errors.push(error.message); }
    }

    if(registry){
      const release=getDailyRelease(registry,schedule.releaseId);
      if(!release) errors.push('scheduled release missing: ' + schedule.releaseId);
      else if(release.date !== date) errors.push('scheduled release/date mismatch: ' + schedule.releaseId);
    }
  }

  for(const [date,schedule] of Object.entries(control.schedules || {})){
    if(schedule.triggeredAt && !schedule.retiredAt && control.activeByDate?.[date] !== schedule.releaseId){
      errors.push('triggered schedule is missing from activeByDate for ' + date);
    }
    if(schedule.retiredAt && control.activeByDate?.[date]){
      errors.push('retired schedule remains active for ' + date);
    }
  }

  const activationKeys=new Set();
  for(const [index,event] of (control.history || []).entries()){
    if(!event || typeof event !== 'object' || Array.isArray(event)){
      errors.push('history event ' + index + ' must be an object');
      continue;
    }
    const payload={...event};
    delete payload.eventHash;
    if(event.eventHash !== stableHash(payload)){
      errors.push('history event hash mismatch at index ' + index);
    }
    if(event.type === 'activated'){
      if(typeof event.activationKey !== 'string' || !event.activationKey){
        errors.push('activation event missing activationKey at index ' + index);
      }else if(activationKeys.has(event.activationKey)){
        errors.push('duplicate activationKey in history: ' + event.activationKey);
      }else{
        activationKeys.add(event.activationKey);
      }
    }
  }

  for(const [date,releaseId] of Object.entries(control.activeByDate || {})){
    const schedule=control.schedules?.[date];
    if(!schedule || schedule.releaseId !== releaseId || !schedule.triggeredAt || schedule.retiredAt){
      errors.push('activeByDate is inconsistent for ' + date);
    }
  }

  const expected=stableHash(controlPayload(control));
  if(control.controlHash !== expected) errors.push('control hash mismatch');

  return {ok:errors.length === 0,errors};
}

function historyEvent(type,payload){
  const base={
    type,
    ...clone(payload)
  };
  return {
    ...base,
    eventHash:stableHash(base)
  };
}

export function deterministicActivationAt(date,releaseId,{
  startHourUtc=0,
  startMinuteUtc=5,
  windowMinutes=0,
  slotMinutes=10
}={}){
  const clean=requireDate(date);
  requireString(releaseId,'releaseId');

  for(const [value,label,min,max] of [
    [startHourUtc,'startHourUtc',0,23],
    [startMinuteUtc,'startMinuteUtc',0,59],
    [windowMinutes,'windowMinutes',0,24 * 60],
    [slotMinutes,'slotMinutes',1,24 * 60]
  ]){
    if(!Number.isInteger(value) || value < min || value > max){
      throw new RangeError(label + ' is out of range.');
    }
  }

  const start=Date.parse(
    clean + 'T' +
    String(startHourUtc).padStart(2,'0') + ':' +
    String(startMinuteUtc).padStart(2,'0') +
    ':00.000Z'
  );

  const startMinutes=startHourUtc * 60 + startMinuteUtc;
  if(startMinutes + windowMinutes > 23 * 60 + 59){
    throw new RangeError('activation window crosses the UTC calendar day.');
  }

  const slots=Math.floor(windowMinutes / slotMinutes) + 1;
  const seed=parseInt(stableHash({
    namespace:'daily-activation-slot-v1',
    date:clean,
    releaseId
  }).split(':')[1],16) >>> 0;
  const slot=slots <= 1 ? 0 : seed % slots;

  return new Date(start + slot * slotMinutes * 60_000).toISOString();
}

function assertRegistry(registry){
  const validation=verifyDailyReleaseRegistry(registry);
  if(!validation.ok) throw new Error('invalid Daily release registry: ' + validation.errors[0]);
}

function assertControl(control,registry){
  const validation=verifyDailyControlPlane(control,registry);
  if(!validation.ok) throw new Error('invalid Daily control plane: ' + validation.errors[0]);
}

function assertReleaseForDate(registry,date,releaseId){
  const release=getDailyRelease(registry,releaseId);
  if(!release) throw new Error('unknown Daily release: ' + releaseId);
  if(release.date !== date){
    throw new Error('Daily release belongs to ' + release.date + ', not ' + date + '.');
  }
  assertDailyPublishable(release.artifact);
  return release;
}

export function scheduleDailyRelease(control,registry,{
  date,
  releaseId,
  scheduledAt,
  message=null,
  replace=false,
  reason=null,
  now=null
}){
  assertRegistry(registry);
  assertControl(control,registry);

  const clean=requireDate(date);
  const release=assertReleaseForDate(registry,clean,requireString(releaseId,'releaseId'));
  const when=iso(scheduledAt,'scheduledAt');
  if(when.slice(0,10) !== clean){
    throw new Error('scheduledAt must fall on the same UTC calendar date as the Daily.');
  }
  const existing=control.schedules[clean] || null;

  const candidateBase={
    date:clean,
    releaseId:release.releaseId,
    scheduledAt:when,
    message:message == null ? null : String(message).slice(0,500)
  };
  const candidate={
    ...candidateBase,
    scheduleHash:stableHash(candidateBase),
    triggeredAt:null,
    retiredAt:null
  };

  if(existing){
    const same=
      existing.releaseId === candidate.releaseId &&
      existing.scheduledAt === candidate.scheduledAt &&
      (existing.message ?? null) === candidate.message;

    if(same){
      return {
        control,
        schedule:existing,
        created:false,
        replaced:false
      };
    }

    if(existing.triggeredAt){
      throw new Error('cannot replace an already-triggered Daily schedule for ' + clean);
    }
    if(!replace){
      throw new Error('a different Daily schedule already exists for ' + clean);
    }
    if(!String(reason || '').trim()){
      throw new Error('schedule replacement requires a reason.');
    }
  }

  const schedules=clone(control.schedules);
  schedules[clean]=candidate;
  const history=[
    ...control.history,
    historyEvent(existing ? 'schedule-replaced' : 'scheduled',{
      date:clean,
      releaseId:release.releaseId,
      scheduledAt:when,
      previousReleaseId:existing?.releaseId ?? null,
      reason:existing ? String(reason).trim() : null,
      recordedAt:now == null ? null : iso(now,'now')
    })
  ];

  const next=finalize({
    schedules,
    activeByDate:control.activeByDate,
    history
  });
  assertControl(next,registry);

  return {
    control:next,
    schedule:next.schedules[clean],
    created:!existing,
    replaced:Boolean(existing)
  };
}

export function activateDueDaily(control,registry,{
  date,
  now
}){
  assertRegistry(registry);
  assertControl(control,registry);
  const clean=requireDate(date);
  const currentTime=iso(now,'now');
  const schedule=control.schedules[clean];

  if(!schedule){
    return {
      status:'not_scheduled',
      control,
      release:null,
      notificationIntents:[]
    };
  }

  const release=assertReleaseForDate(registry,clean,schedule.releaseId);

  if(schedule.retiredAt){
    return {
      status:'retired',
      control,
      release,
      notificationIntents:[]
    };
  }

  if(schedule.triggeredAt){
    return {
      status:'already_active',
      control,
      release,
      notificationIntents:[]
    };
  }

  if(Date.parse(currentTime) < Date.parse(schedule.scheduledAt)){
    return {
      status:'not_due',
      control,
      release,
      notificationIntents:[]
    };
  }

  const schedules=clone(control.schedules);
  schedules[clean].triggeredAt=currentTime;
  const activeByDate={
    ...clone(control.activeByDate),
    [clean]:release.releaseId
  };
  const activationKey=stableHash({
    type:'daily-activation',
    date:clean,
    releaseId:release.releaseId,
    scheduledAt:schedule.scheduledAt
  });

  const history=[
    ...control.history,
    historyEvent('activated',{
      date:clean,
      releaseId:release.releaseId,
      activatedAt:currentTime,
      activationKey
    })
  ];

  const next=finalize({schedules,activeByDate,history});
  assertControl(next,registry);

  return {
    status:'activated',
    control:next,
    release,
    activationKey,
    notificationIntents:[
      {
        type:'daily-activated',
        idempotencyKey:activationKey,
        date:clean,
        releaseId:release.releaseId,
        message:schedule.message
      }
    ]
  };
}

export function retireDailyRelease(control,registry,{
  date,
  now,
  reason
}){
  assertRegistry(registry);
  assertControl(control,registry);
  const clean=requireDate(date);
  const when=iso(now,'now');
  const schedule=control.schedules[clean];

  if(!schedule || !schedule.triggeredAt){
    throw new Error('Daily must be active before it can be retired.');
  }
  if(schedule.retiredAt) return control;
  if(!String(reason || '').trim()) throw new Error('retirement requires a reason.');

  const schedules=clone(control.schedules);
  schedules[clean].retiredAt=when;
  const activeByDate=clone(control.activeByDate);
  delete activeByDate[clean];

  const history=[
    ...control.history,
    historyEvent('retired',{
      date:clean,
      releaseId:schedule.releaseId,
      retiredAt:when,
      reason:String(reason).trim()
    })
  ];

  const next=finalize({schedules,activeByDate,history});
  assertControl(next,registry);
  return next;
}

export function dailyReleaseLifecycle(control,registry,releaseId){
  assertRegistry(registry);
  assertControl(control,registry);
  const release=getDailyRelease(registry,releaseId);
  if(!release) return null;

  const schedule=control.schedules[release.date];
  if(!schedule || schedule.releaseId !== releaseId) return 'certified';
  if(schedule.retiredAt) return 'retired';
  if(schedule.triggeredAt) return 'active';
  return 'scheduled';
}

/**
 * One idempotent cron-style cycle, modeled after Sabeo's "schedule if missing,
 * otherwise activate if due" control flow.
 *
 * The first cycle with a frozen release creates the schedule. A later cycle
 * activates it when due. Missing release content produces an intent instead of
 * silently substituting yesterday's Daily.
 */
export function runDailyControlCycle(control,registry,{
  date,
  now,
  autoSchedule=true,
  activationWindow={},
  message=null
}){
  assertRegistry(registry);
  assertControl(control,registry);
  const clean=requireDate(date);
  const currentTime=iso(now,'now');
  const existing=control.schedules[clean];

  if(existing){
    return activateDueDaily(control,registry,{date:clean,now:currentTime});
  }

  if(!autoSchedule){
    return {
      status:'not_scheduled',
      control,
      release:null,
      notificationIntents:[]
    };
  }

  const release=getPreferredDailyRelease(registry,clean);
  if(!release){
    const key=stableHash({
      type:'daily-missing-release',
      date:clean
    });
    return {
      status:'no_release',
      control,
      release:null,
      notificationIntents:[
        {
          type:'daily-missing-release',
          idempotencyKey:key,
          date:clean
        }
      ]
    };
  }

  const scheduledAt=deterministicActivationAt(
    clean,
    release.releaseId,
    activationWindow
  );
  const result=scheduleDailyRelease(control,registry,{
    date:clean,
    releaseId:release.releaseId,
    scheduledAt,
    message,
    now:currentTime
  });

  return {
    status:'scheduled',
    control:result.control,
    release,
    schedule:result.schedule,
    notificationIntents:[]
  };
}
