
import {
  createDailyBundle,
  createQuestionVersion,
  stableHash,
  stableStringify
} from '../domainSchemas.js';
import {
  balanceQuestStructure
} from '../balance/balanceConfig.js';
import {
  verifySolutionCertificate
} from '../generation/solutionFirstLevel.js';
import {
  createQuestionBankSnapshot,
  getQuestionVersion
} from '../questionBank/questionBankV2.js';
import {
  DAILY_ARTIFACT_SCHEMA_VERSION,
  DAILY_BUNDLE_GENERATOR_VERSION,
  dailySeedFromDate
} from './dailyBundleFactory.js';
import { SIM_ENGINE_VERSION } from '../sim/deterministicCore.js';

export const DAILY_CERTIFIER_VERSION='daily-certifier-v1';

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function same(a,b){
  return stableStringify(a) === stableStringify(b);
}

function refKey(ref){
  return ref.questionId + '@' + ref.version + '#' + ref.contentHash;
}

function roleCompatible(role,hint){
  if(!hint) return true;
  if(role === hint) return true;

  if(hint === 'challenge'){
    return ['transfer','diagnose','review'].includes(role);
  }
  if(hint === 'transfer'){
    return ['transfer','diagnose'].includes(role);
  }
  if(hint === 'practice'){
    return ['practice','review','diagnose'].includes(role);
  }
  if(hint === 'review'){
    return ['review','practice','diagnose'].includes(role);
  }
  return false;
}

function artifactManifestPayload(artifact,bundleHash=artifact.bundle?.bundleHash){
  return {
    schemaVersion:artifact.schemaVersion,
    date:artifact.date,
    seed:artifact.seed,
    bundleHash,
    questionBankSnapshot:artifact.questionBankSnapshot,
    balanceSnapshot:artifact.balanceSnapshot,
    questionSet:artifact.questionSet,
    bindings:artifact.bindings,
    spec:artifact.spec,
    generator:artifact.generator
  };
}

function check(checks,failures,id,ok,detail){
  checks.push({id,ok:Boolean(ok),detail});
  if(!ok) failures.push({id,detail});
}

function verifyFrozenQuestion(item,index){
  if(!item || typeof item !== 'object'){
    return {ok:false,detail:'questionSet[' + index + '] must be an object'};
  }

  const ref=item.ref;
  const question=item.question;
  if(!ref || !question){
    return {ok:false,detail:'questionSet[' + index + '] is missing ref/question'};
  }

  try{
    const rebuilt=createQuestionVersion({
      ...question,
      questionId:ref.questionId,
      contentVersion:ref.version
    });
    if(rebuilt.contentHash !== ref.contentHash){
      return {ok:false,detail:'frozen question content hash mismatch for ' + ref.questionId};
    }
    if(question.contentHash !== ref.contentHash){
      return {ok:false,detail:'stored question hash mismatch for ' + ref.questionId};
    }
    return {ok:true,detail:refKey(ref)};
  }catch(error){
    return {
      ok:false,
      detail:'invalid frozen question ' + ref.questionId + ': ' +
        (error instanceof Error ? error.message : 'unknown error')
    };
  }
}

function verifyBindings(artifact){
  const failures=[];
  const level=artifact.bundle?.levelSpec;
  const slots=(level?.nodes || [])
    .filter(node => node.questionSlot)
    .sort((a,b) => {
      const ao=Number.isInteger(a.questionSlot.ordinal) ? a.questionSlot.ordinal : 1_000_000;
      const bo=Number.isInteger(b.questionSlot.ordinal) ? b.questionSlot.ordinal : 1_000_000;
      return ao - bo || a.nodeId.localeCompare(b.nodeId);
    });
  const byNode=new Map((artifact.bindings || []).map(binding => [binding.nodeId,binding]));
  const frozenByNode=new Map((artifact.questionSet || []).map(item => [item.nodeId,item]));

  if(byNode.size !== (artifact.bindings || []).length){
    failures.push('duplicate binding node IDs');
  }
  if(frozenByNode.size !== (artifact.questionSet || []).length){
    failures.push('duplicate questionSet node IDs');
  }
  if(slots.length !== (artifact.bindings || []).length){
    failures.push('question binding count does not match level question slots');
  }

  const refKeys=new Set();
  for(const slotNode of slots){
    const binding=byNode.get(slotNode.nodeId);
    const frozen=frozenByNode.get(slotNode.nodeId);

    if(!binding){
      failures.push('missing binding for ' + slotNode.nodeId);
      continue;
    }
    if(!frozen){
      failures.push('missing frozen question for ' + slotNode.nodeId);
      continue;
    }
    if(!same(binding.ref,frozen.ref)){
      failures.push('binding/frozen ref mismatch for ' + slotNode.nodeId);
    }
    if(!same(binding.slot,slotNode.questionSlot)){
      failures.push('binding slot metadata mismatch for ' + slotNode.nodeId);
    }

    const key=refKey(binding.ref);
    if(refKeys.has(key)){
      failures.push('duplicate exact question ref in Daily: ' + key);
    }
    refKeys.add(key);

    const role=frozen.question?.role;
    const hint=slotNode.questionSlot?.roleHint;
    if(!roleCompatible(role,hint)){
      failures.push(
        'question role ' + role +
        ' is incompatible with slot hint ' + hint +
        ' at ' + slotNode.nodeId
      );
    }
  }

  return {ok:failures.length === 0,failures,slotCount:slots.length};
}

function verifyQuestionRefs(artifact){
  const bundleRefs=artifact.bundle?.questionRefs || [];
  const frozenRefs=(artifact.questionSet || []).map(item => item.ref);
  const bindingRefs=(artifact.bindings || []).map(item => item.ref);

  return {
    ok:
      same(bundleRefs,frozenRefs) &&
      same(bundleRefs,bindingRefs),
    detail:'bundle/questionSet/binding refs must be identical and ordered'
  };
}

function verifySnapshot(artifact){
  const snapshot=artifact.questionBankSnapshot;
  if(!snapshot || typeof snapshot !== 'object'){
    return {ok:false,detail:'question bank snapshot missing'};
  }

  const expected=stableHash({
    bankId:snapshot.bankId,
    refs:snapshot.refs
  });

  if(expected !== snapshot.hash){
    return {ok:false,detail:'question bank snapshot hash mismatch'};
  }

  const snapshotKeys=new Set((snapshot.refs || []).map(refKey));
  for(const ref of artifact.bundle?.questionRefs || []){
    if(!snapshotKeys.has(refKey(ref))){
      return {ok:false,detail:'Daily question ref is outside frozen Question Bank snapshot'};
    }
  }

  return {ok:true,detail:snapshot.version + ' / ' + snapshot.hash};
}

function verifyBalance(artifact){
  const snapshot=artifact.balanceSnapshot;
  if(!snapshot || !snapshot.config){
    return {ok:false,detail:'balance snapshot missing'};
  }
  if(stableHash(snapshot.config) !== snapshot.hash){
    return {ok:false,detail:'balance snapshot hash mismatch'};
  }
  if((snapshot.version || 'identity-v1') !== artifact.bundle?.balanceVersion){
    return {ok:false,detail:'balance snapshot version does not match bundle'};
  }
  if(Array.isArray(snapshot.diagnostics) && snapshot.diagnostics.length){
    return {ok:false,detail:'balance snapshot contains unresolved clamp diagnostics'};
  }

  const spec=artifact.spec || {};
  const expected=balanceQuestStructure({
    stageCount:Number.isInteger(spec.stageCount) ? spec.stageCount : 5,
    optionalCount:Number.isInteger(spec.optionalCount) ? spec.optionalCount : 3,
    balance:snapshot.config
  });
  const level=artifact.bundle?.levelSpec;
  const actualOptional=(level?.nodes || []).filter(node => !node.required).length;

  if(level?.stageCount !== expected.stageCount){
    return {
      ok:false,
      detail:'level stageCount does not match frozen balance structure'
    };
  }
  if(actualOptional !== expected.optionalCount){
    return {
      ok:false,
      detail:'level optional-node count does not match frozen balance structure'
    };
  }

  return {
    ok:true,
    detail:'stages=' + expected.stageCount + ', optional=' + expected.optionalCount
  };
}

function verifyCapabilitiesAndModifiers(artifact){
  const failures=[];
  const spec=artifact.spec || {};
  const available=new Set(Array.isArray(spec.availableCapabilities) ? spec.availableCapabilities : []);
  const required=Array.isArray(spec.requiredCapabilities) ? spec.requiredCapabilities : [];

  for(const capability of required){
    if(!available.has(capability)){
      failures.push('required capability unavailable: ' + capability);
    }
  }

  const roles=(artifact.questionSet || []).map(item => item.question?.role);
  const difficulties=(artifact.questionSet || []).map(item => Number(item.question?.difficulty));
  const modifiers=Array.isArray(spec.modifiers) ? spec.modifiers : [];

  for(const modifier of modifiers){
    if(!modifier || typeof modifier !== 'object') continue;
    const id=typeof modifier.id === 'string' ? modifier.id : 'unnamed-modifier';

    for(const capability of modifier.requiresCapabilities || []){
      if(!available.has(capability)){
        failures.push(id + ' requires unavailable capability ' + capability);
      }
    }
    for(const capability of modifier.forbidsCapabilities || []){
      if(available.has(capability)){
        failures.push(id + ' forbids active capability ' + capability);
      }
    }
    for(const role of modifier.forbidsRoles || []){
      if(roles.includes(role)){
        failures.push(id + ' forbids selected question role ' + role);
      }
    }

    if(Array.isArray(modifier.requiresAnyRole) && modifier.requiresAnyRole.length){
      if(!roles.some(role => modifier.requiresAnyRole.includes(role))){
        failures.push(id + ' requires at least one role: ' + modifier.requiresAnyRole.join(', '));
      }
    }

    if(Number.isFinite(modifier.maxQuestionDifficulty)){
      if(difficulties.some(value => value > modifier.maxQuestionDifficulty)){
        failures.push(id + ' max question difficulty exceeded');
      }
    }
  }

  if(spec.requiresRecoveryNode === true){
    const hasRecovery=(artifact.bundle?.levelSpec?.nodes || []).some(node => node.type === 'recovery');
    if(!hasRecovery) failures.push('Daily requires a recovery node but level has none');
  }

  if(Number.isFinite(spec.maxQuestionDifficulty)){
    if(difficulties.some(value => value > spec.maxQuestionDifficulty)){
      failures.push('Daily maxQuestionDifficulty exceeded');
    }
  }

  return {
    ok:failures.length === 0,
    failures
  };
}

function verifyAgainstBank(artifact,bank){
  if(!bank) return {ok:true,detail:'bank cross-check skipped'};

  const currentSnapshot=createQuestionBankSnapshot(bank);
  if(
    currentSnapshot.version !== artifact.questionBankSnapshot.version ||
    currentSnapshot.hash !== artifact.questionBankSnapshot.hash
  ){
    return {
      ok:false,
      detail:'provided bank no longer matches the frozen Daily Question Bank snapshot'
    };
  }

  for(const item of artifact.questionSet || []){
    const current=getQuestionVersion(bank,item.ref.questionId,item.ref.version);
    if(!current || current.contentHash !== item.ref.contentHash){
      return {
        ok:false,
        detail:'provided bank cannot resolve exact frozen ref ' + refKey(item.ref)
      };
    }
  }

  return {ok:true,detail:'provided bank matches frozen snapshot'};
}

export function inspectDailyBundleArtifact(artifact,{bank=null}={}){
  const checks=[];
  const failures=[];

  check(
    checks,failures,'artifact-schema',
    artifact?.schemaVersion === DAILY_ARTIFACT_SCHEMA_VERSION,
    'Daily artifact schema must be ' + DAILY_ARTIFACT_SCHEMA_VERSION
  );
  check(
    checks,failures,'artifact-status',
    artifact?.status === 'generated' || artifact?.status === 'certified',
    'artifact status must be generated/certified'
  );

  const expectedSeed=(() => {
    try{return dailySeedFromDate(artifact?.date);}catch{return null;}
  })();
  check(
    checks,failures,'daily-seed',
    expectedSeed != null && artifact?.seed === expectedSeed && artifact?.bundle?.seed === expectedSeed,
    'date-derived seed must match artifact and bundle'
  );
  check(
    checks,failures,'daily-id',
    artifact?.bundle?.id === 'daily-' + artifact?.date &&
      artifact?.bundle?.date === artifact?.date,
    'bundle ID/date must match artifact date'
  );
  check(
    checks,failures,'generator-version',
    artifact?.bundle?.generatorVersion === DAILY_BUNDLE_GENERATOR_VERSION,
    'bundle generator version must match factory'
  );
  check(
    checks,failures,'engine-version',
    artifact?.bundle?.engineVersion === SIM_ENGINE_VERSION,
    'bundle engine version must match deterministic engine'
  );

  let rebuiltBundle=null;
  try{
    rebuiltBundle=createDailyBundle(artifact.bundle);
  }catch{}
  check(
    checks,failures,'bundle-hash',
    Boolean(rebuiltBundle && rebuiltBundle.bundleHash === artifact?.bundle?.bundleHash),
    'canonical DailyBundle hash must reconstruct exactly'
  );

  const manifestExpected=stableHash(artifactManifestPayload(artifact));
  check(
    checks,failures,'manifest-hash',
    manifestExpected === artifact?.manifestHash,
    'Daily artifact manifest hash must reconstruct exactly'
  );

  const levelResult=verifySolutionCertificate(artifact?.bundle?.levelSpec);
  check(
    checks,failures,'solution-certificate',
    levelResult.ok,
    levelResult.ok ? 'solution certificate verified' : levelResult.reason
  );
  check(
    checks,failures,'certificate-copy',
    same(artifact?.bundle?.certifiedSolution,artifact?.bundle?.levelSpec?.solutionCertificate),
    'bundle certifiedSolution must exactly match level certificate'
  );

  const frozenResults=(artifact?.questionSet || []).map(verifyFrozenQuestion);
  check(
    checks,failures,'frozen-question-integrity',
    frozenResults.every(result => result.ok),
    frozenResults.filter(result => !result.ok).map(result => result.detail).join('; ') ||
      'all frozen question versions verified'
  );

  const snapshot=verifySnapshot(artifact);
  check(checks,failures,'question-bank-snapshot',snapshot.ok,snapshot.detail);

  const refs=verifyQuestionRefs(artifact);
  check(checks,failures,'question-ref-consistency',refs.ok,refs.detail);

  const bindings=verifyBindings(artifact);
  check(
    checks,failures,'question-slot-bindings',
    bindings.ok,
    bindings.ok ? 'all ' + bindings.slotCount + ' question slots bound compatibly' : bindings.failures.join('; ')
  );

  const balance=verifyBalance(artifact);
  check(checks,failures,'balance-snapshot',balance.ok,balance.detail);

  const compatibility=verifyCapabilitiesAndModifiers(artifact);
  check(
    checks,failures,'daily-compatibility',
    compatibility.ok,
    compatibility.ok ? 'capability/modifier rules compatible' : compatibility.failures.join('; ')
  );

  const bankCrossCheck=verifyAgainstBank(artifact,bank);
  check(checks,failures,'bank-cross-check',bankCrossCheck.ok,bankCrossCheck.detail);

  return {
    ok:failures.length === 0,
    certifierVersion:DAILY_CERTIFIER_VERSION,
    checks,
    failures
  };
}

export function certifyDailyBundleArtifact(artifact,{bank=null}={}){
  const initial=inspectDailyBundleArtifact(artifact,{bank});
  if(!initial.ok){
    return deepFreeze({
      ok:false,
      artifact:null,
      report:initial
    });
  }

  const compatibility={
    ok:true,
    checks:initial.checks.map(item => item.id)
  };
  const bundle=createDailyBundle({
    ...artifact.bundle,
    compatibility
  });

  const payload=artifactManifestPayload(artifact,bundle.bundleHash);
  const manifestHash=stableHash(payload);
  const certification={
    certifierVersion:DAILY_CERTIFIER_VERSION,
    certifiedAt:null,
    checks:initial.checks.map(item => ({
      id:item.id,
      ok:item.ok
    }))
  };

  const certified=deepFreeze({
    ...clone(artifact),
    status:'certified',
    bundle,
    certification,
    manifestHash
  });

  const finalInspection=inspectDailyBundleArtifact(certified,{bank});
  if(!finalInspection.ok){
    return deepFreeze({
      ok:false,
      artifact:null,
      report:finalInspection
    });
  }

  return deepFreeze({
    ok:true,
    artifact:certified,
    report:finalInspection
  });
}

export function assertDailyPublishable(artifact){
  if(!artifact || artifact.status !== 'certified'){
    throw new Error('Daily artifact must be certified before publication.');
  }
  if(artifact.bundle?.compatibility?.ok !== true){
    throw new Error('Daily artifact compatibility certificate is not valid.');
  }
  return true;
}
