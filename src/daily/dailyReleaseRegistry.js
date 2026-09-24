
import { stableHash } from '../domainSchemas.js';
import { assertDailyPublishable } from './dailyCertification.js';

export const DAILY_RELEASE_REGISTRY_SCHEMA_VERSION=1;
export const DAILY_RELEASE_REGISTRY_VERSION='daily-release-registry-v1';

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

function requireString(value,label){
  if(typeof value !== 'string' || !value.trim()){
    throw new TypeError(label + ' must be a non-empty string.');
  }
  return value.trim();
}

function cleanTimestamp(value,label){
  if(value == null) return null;
  const text=requireString(value,label);
  const parsed=new Date(text);
  if(Number.isNaN(parsed.getTime())) throw new TypeError(label + ' must be an ISO timestamp.');
  return parsed.toISOString();
}

function registryPayload(registry){
  return {
    schemaVersion:registry.schemaVersion,
    registryVersion:registry.registryVersion,
    dates:registry.dates
  };
}

function finalize(raw){
  const base={
    schemaVersion:DAILY_RELEASE_REGISTRY_SCHEMA_VERSION,
    registryVersion:DAILY_RELEASE_REGISTRY_VERSION,
    dates:clone(raw.dates || {})
  };
  return deepFreeze({
    ...base,
    registryHash:stableHash(registryPayload(base))
  });
}

export function createDailyReleaseRegistry(){
  return finalize({dates:{}});
}

function releaseIdentity(artifact){
  return {
    manifestHash:artifact.manifestHash,
    bundleHash:artifact.bundle?.bundleHash,
    artifactHash:stableHash(artifact)
  };
}

function dateEntry(registry,date){
  return registry.dates?.[date] || null;
}

export function getDailyRelease(registry,releaseId){
  for(const entry of Object.values(registry?.dates || {})){
    const release=(entry.versions || []).find(item => item.releaseId === releaseId);
    if(release) return release;
  }
  return null;
}

export function getPreferredDailyRelease(registry,date){
  const clean=requireDate(date);
  const entry=dateEntry(registry,clean);
  if(!entry?.preferredReleaseId) return null;
  return (entry.versions || []).find(item => item.releaseId === entry.preferredReleaseId) || null;
}

export function verifyDailyReleaseRegistry(registry){
  const errors=[];
  if(!registry || typeof registry !== 'object' || Array.isArray(registry)){
    return {ok:false,errors:['registry must be an object']};
  }
  if(registry.schemaVersion !== DAILY_RELEASE_REGISTRY_SCHEMA_VERSION){
    errors.push('unsupported registry schema version');
  }
  if(registry.registryVersion !== DAILY_RELEASE_REGISTRY_VERSION){
    errors.push('unsupported registry implementation version');
  }
  if(!registry.dates || typeof registry.dates !== 'object' || Array.isArray(registry.dates)){
    errors.push('registry dates must be an object');
  }

  const globalIds=new Set();
  for(const [date,entry] of Object.entries(registry.dates || {})){
    try{ requireDate(date,'registry date'); }
    catch(error){ errors.push(error.message); continue; }

    if(entry.date !== date) errors.push('date entry mismatch for ' + date);
    if(!Array.isArray(entry.versions) || entry.versions.length === 0){
      errors.push('date has no frozen versions: ' + date);
      continue;
    }

    for(let index=0;index<entry.versions.length;index++){
      const release=entry.versions[index];
      const expectedVersion=index + 1;
      const expectedId='daily-' + date + '@v' + expectedVersion;
      if(release.version !== expectedVersion){
        errors.push('release version sequence mismatch for ' + date);
      }
      if(release.releaseId !== expectedId){
        errors.push('release ID mismatch: ' + release.releaseId);
      }
      if(globalIds.has(release.releaseId)){
        errors.push('duplicate release ID: ' + release.releaseId);
      }
      globalIds.add(release.releaseId);

      if(release.date !== date || release.dailyId !== 'daily-' + date){
        errors.push('release date/daily ID mismatch: ' + release.releaseId);
      }
      if(release.artifact?.status !== 'certified' || release.artifact?.bundle?.compatibility?.ok !== true){
        errors.push('release artifact is not certified: ' + release.releaseId);
      }
      const identity=releaseIdentity(release.artifact || {});
      if(identity.manifestHash !== release.manifestHash){
        errors.push('release manifest hash mismatch: ' + release.releaseId);
      }
      if(identity.bundleHash !== release.bundleHash){
        errors.push('release bundle hash mismatch: ' + release.releaseId);
      }
      if(identity.artifactHash !== release.artifactHash){
        errors.push('release artifact hash mismatch: ' + release.releaseId);
      }
      if(index > 0 && release.supersedesReleaseId !== entry.versions[index - 1].releaseId){
        errors.push('release lineage mismatch: ' + release.releaseId);
      }
    }

    if(!entry.versions.some(item => item.releaseId === entry.preferredReleaseId)){
      errors.push('preferred release missing for ' + date);
    }
  }

  const expectedHash=stableHash(registryPayload(registry));
  if(registry.registryHash !== expectedHash){
    errors.push('registry hash mismatch');
  }

  return {ok:errors.length === 0,errors};
}

/**
 * Freeze one already-certified Daily.
 *
 * Same artifact + same date is idempotent. A different artifact never overwrites
 * the old one: callers must explicitly create a new immutable version.
 */
export function freezeCertifiedDaily(registry,artifact,{
  allowNewVersion=false,
  reason=null,
  frozenAt=null
}={}){
  const validation=verifyDailyReleaseRegistry(registry);
  if(!validation.ok) throw new Error('invalid Daily release registry: ' + validation.errors[0]);
  assertDailyPublishable(artifact);

  const date=requireDate(artifact.date);
  if(artifact.bundle?.id !== 'daily-' + date){
    throw new Error('certified artifact Daily ID/date mismatch.');
  }

  const identity=releaseIdentity(artifact);
  const existing=dateEntry(registry,date);
  const versions=existing ? [...existing.versions] : [];

  const identical=versions.find(release =>
    release.manifestHash === identity.manifestHash &&
    release.bundleHash === identity.bundleHash &&
    release.artifactHash === identity.artifactHash
  );
  if(identical){
    return {
      registry,
      release:identical,
      created:false
    };
  }

  if(versions.length && !allowNewVersion){
    throw new Error(
      'a different certified Daily is already frozen for ' + date +
      '; create a new version explicitly instead of overwriting it.'
    );
  }

  if(versions.length && !String(reason || '').trim()){
    throw new Error('a reason is required when creating a new Daily version.');
  }

  const version=versions.length + 1;
  const releaseId='daily-' + date + '@v' + version;
  const prior=versions[versions.length - 1] || null;
  const release=deepFreeze({
    schemaVersion:1,
    releaseId,
    date,
    dailyId:'daily-' + date,
    version,
    manifestHash:identity.manifestHash,
    bundleHash:identity.bundleHash,
    artifactHash:identity.artifactHash,
    frozenAt:cleanTimestamp(frozenAt,'frozenAt'),
    reason:version === 1 ? null : String(reason).trim(),
    supersedesReleaseId:prior?.releaseId ?? null,
    artifact:clone(artifact)
  });

  versions.push(release);
  const dates=clone(registry.dates);
  dates[date]={
    date,
    versions:clone(versions),
    preferredReleaseId:releaseId
  };

  const next=finalize({dates});
  const nextValidation=verifyDailyReleaseRegistry(next);
  if(!nextValidation.ok) throw new Error('created invalid Daily release registry: ' + nextValidation.errors[0]);

  return {
    registry:next,
    release:getDailyRelease(next,releaseId),
    created:true
  };
}

/**
 * Change the preferred immutable version for one date without rewriting any
 * release. This is the rollback mechanism.
 */
export function setPreferredDailyRelease(registry,date,releaseId,{reason}={}){
  const validation=verifyDailyReleaseRegistry(registry);
  if(!validation.ok) throw new Error('invalid Daily release registry: ' + validation.errors[0]);
  const clean=requireDate(date);
  const entry=dateEntry(registry,clean);
  if(!entry) throw new Error('no frozen Daily exists for ' + clean);
  if(entry.preferredReleaseId === releaseId) return registry;
  if(!String(reason || '').trim()) throw new Error('rollback/preference changes require a reason.');

  const target=(entry.versions || []).find(item => item.releaseId === releaseId);
  if(!target) throw new Error('release does not belong to date ' + clean + ': ' + releaseId);

  const dates=clone(registry.dates);
  dates[clean].preferredReleaseId=releaseId;
  dates[clean].preferenceReason=String(reason).trim();
  return finalize({dates});
}

export function buildDailyReleaseManifest(registry){
  const validation=verifyDailyReleaseRegistry(registry);
  if(!validation.ok) throw new Error('invalid Daily release registry: ' + validation.errors[0]);

  const dates=Object.keys(registry.dates).sort();
  const entries=dates.map(date => {
    const entry=registry.dates[date];
    const preferred=entry.versions.find(item => item.releaseId === entry.preferredReleaseId);
    return {
      date,
      preferredReleaseId:entry.preferredReleaseId,
      versionCount:entry.versions.length,
      manifestHash:preferred.manifestHash,
      bundleHash:preferred.bundleHash
    };
  });

  const payload={
    schemaVersion:1,
    registryVersion:registry.registryVersion,
    dates,
    entries
  };

  return deepFreeze({
    ...payload,
    manifestHash:stableHash(payload)
  });
}

/**
 * Resolve a frozen release. Missing dates may fall back only to the most recent
 * *earlier* frozen date, never to a future Daily and never by regeneration.
 */
export function resolveFrozenDaily(registry,date,{fallback=true}={}){
  const validation=verifyDailyReleaseRegistry(registry);
  if(!validation.ok) throw new Error('invalid Daily release registry: ' + validation.errors[0]);
  const requestedDate=requireDate(date);
  const exact=getPreferredDailyRelease(registry,requestedDate);
  if(exact){
    return {
      requestedDate,
      resolvedDate:requestedDate,
      fallbackUsed:false,
      release:exact
    };
  }

  if(!fallback){
    return {
      requestedDate,
      resolvedDate:null,
      fallbackUsed:false,
      release:null
    };
  }

  const earlier=Object.keys(registry.dates)
    .filter(candidate => candidate < requestedDate)
    .sort()
    .reverse();
  const resolvedDate=earlier[0] || null;
  const release=resolvedDate ? getPreferredDailyRelease(registry,resolvedDate) : null;

  return {
    requestedDate,
    resolvedDate,
    fallbackUsed:Boolean(release),
    release
  };
}
