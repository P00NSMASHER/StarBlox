
import {
  createDailyBundle,
  createQuestionVersion,
  stableHash
} from '../domainSchemas.js';
import {
  generateCertifiedQuestLevel,
  QUEST_LEVEL_GENERATOR_VERSION
} from '../generation/solutionFirstLevel.js';
import {
  createQuestionBankSnapshot
} from '../questionBank/questionBankV2.js';
import {
  IDENTITY_BALANCE,
  balanceQuestStructure,
  resolveBalanceDoc
} from '../balance/balanceConfig.js';
import {
  Mulberry32,
  SIM_ENGINE_VERSION
} from '../sim/deterministicCore.js';

export const DAILY_ARTIFACT_SCHEMA_VERSION=1;
export const DAILY_BUNDLE_GENERATOR_VERSION='starblox-daily-v1';

const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_ROWS=4;
const DEFAULT_COLUMNS=4;
const DEFAULT_STAGE_COUNT=5;
const DEFAULT_OPTIONAL_COUNT=3;

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function requireDate(value){
  if(typeof value !== 'string' || !DATE_RE.test(value)){
    throw new TypeError('date must use YYYY-MM-DD.');
  }
  const parsed=new Date(value + 'T00:00:00Z');
  if(Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value){
    throw new TypeError('date must be a valid calendar date.');
  }
  return value;
}

function cleanStringArray(values){
  return Array.isArray(values)
    ? [...new Set(values.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim()))]
    : [];
}

export function dailySeedFromDate(date){
  const clean=requireDate(date);
  return parseInt(stableHash({
    namespace:'starblox-daily-seed-v1',
    date:clean
  }).split(':')[1],16) >>> 0;
}

function gridForNodeCount(count){
  const size=Math.max(2,Math.ceil(Math.sqrt(count)));
  return {
    rows:Math.min(10,size),
    columns:Math.min(10,size)
  };
}

function roleCompatibility(role,hint){
  if(!hint) return 1;
  if(role === hint) return 1;
  if(hint === 'challenge'){
    if(role === 'transfer') return 1;
    if(role === 'diagnose') return 0.94;
    if(role === 'review') return 0.78;
    if(role === 'practice') return 0.66;
  }
  if(hint === 'practice'){
    if(role === 'review') return 0.90;
    if(role === 'diagnose') return 0.78;
    if(role === 'transfer') return 0.60;
  }
  if(hint === 'review'){
    if(role === 'practice') return 0.88;
    if(role === 'diagnose') return 0.78;
    if(role === 'transfer') return 0.68;
  }
  if(hint === 'transfer'){
    if(role === 'diagnose') return 0.90;
    if(role === 'review') return 0.65;
    if(role === 'practice') return 0.55;
  }
  return 0.60;
}

function refMatchesSpec(entry,version,spec){
  const checks=[
    ['subjects',version.subject],
    ['districts',version.district],
    ['skills',version.skill],
    ['roles',version.role]
  ];
  for(const [key,value] of checks){
    const allowed=cleanStringArray(spec[key]);
    if(allowed.length && !allowed.includes(value)) return false;
  }

  const concepts=cleanStringArray(spec.targetConceptIds);
  if(concepts.length && spec.strictConcept === true){
    if(!entry.conceptIds.some(id => concepts.includes(id))) return false;
  }

  return true;
}

function deterministicQuestionBindings({
  bank,
  snapshot,
  level,
  spec,
  seed
}){
  const rng=new Mulberry32((seed ^ 0x71f2a93d) >>> 0);
  const used=new Set();
  const bindings=[];

  const slots=level.nodes
    .filter(node => node.questionSlot)
    .sort((a,b) => {
      const ao=Number.isInteger(a.questionSlot.ordinal) ? a.questionSlot.ordinal : 1_000_000;
      const bo=Number.isInteger(b.questionSlot.ordinal) ? b.questionSlot.ordinal : 1_000_000;
      return ao - bo || a.nodeId.localeCompare(b.nodeId);
    });

  for(const node of slots){
    const candidates=snapshot.refs
      .filter(ref => !used.has(ref.questionId))
      .map(ref => {
        const entry=bank.questions?.[ref.questionId] || null;
        const version=entry?.versions?.[String(ref.version)] || null;
        return {ref,entry,version};
      })
      .filter(row =>
        row.entry &&
        row.version &&
        refMatchesSpec(row.entry,row.version,spec)
      );

    if(candidates.length === 0){
      throw new Error('no eligible question remains for node ' + node.nodeId);
    }

    const scored=candidates.map(row => ({
      ...row,
      roleFit:roleCompatibility(row.version.role,node.questionSlot.roleHint),
      conceptFit:cleanStringArray(spec.targetConceptIds).length
        ? (row.entry.conceptIds.some(id => spec.targetConceptIds.includes(id)) ? 1 : 0.72)
        : 1,
      jitter:rng.next()
    })).filter(row => row.roleFit >= 0.78).sort((a,b) =>
      (b.roleFit * b.conceptFit) - (a.roleFit * a.conceptFit) ||
      b.jitter - a.jitter ||
      a.ref.questionId.localeCompare(b.ref.questionId)
    );

    const selected=scored[0];
    if(!selected){
      throw new Error(
        'no role-compatible question remains for node ' +
        node.nodeId +
        ' (' + node.questionSlot.roleHint + ')'
      );
    }
    used.add(selected.ref.questionId);
    bindings.push({
      nodeId:node.nodeId,
      slot:clone(node.questionSlot),
      ref:clone(selected.ref),
      selection:{
        roleFit:selected.roleFit,
        conceptFit:selected.conceptFit,
        method:'deterministic-fallback'
      }
    });
  }

  return bindings;
}

async function selectBindings({
  bank,
  snapshot,
  level,
  spec,
  seed,
  questionSelector,
  context
}){
  if(typeof questionSelector !== 'function'){
    return {
      bindings:deterministicQuestionBindings({bank,snapshot,level,spec,seed}),
      fallbackUsed:true,
      fallbackReasons:['no primary question selector supplied']
    };
  }

  try{
    const result=await questionSelector({
      bank,
      snapshot,
      level,
      spec:clone(spec),
      seed,
      context:clone(context || {})
    });

    if(!Array.isArray(result) || result.length === 0){
      throw new Error('primary selector returned no bindings');
    }

    return {
      bindings:clone(result),
      fallbackUsed:false,
      fallbackReasons:[]
    };
  }catch(error){
    return {
      bindings:deterministicQuestionBindings({bank,snapshot,level,spec,seed}),
      fallbackUsed:true,
      fallbackReasons:[
        'primary question selector failed: ' +
        (error instanceof Error ? error.message : 'unknown selector error')
      ]
    };
  }
}

function freezeQuestionSet(bank,bindings){
  return bindings.map(binding => {
    const ref=binding.ref;
    const entry=bank.questions?.[ref.questionId];
    const version=entry?.versions?.[String(ref.version)] || null;
    if(!version) throw new Error('question version missing for ' + ref.questionId);
    if(version.contentHash !== ref.contentHash){
      throw new Error('question content hash mismatch for ' + ref.questionId);
    }
    return {
      nodeId:binding.nodeId,
      slot:clone(binding.slot),
      ref:clone(ref),
      question:clone(version)
    };
  });
}

function resolveBalanceSnapshot(rawBalance){
  if(rawBalance?.schemaVersion === 1 && rawBalance?.economy && rawBalance?.quest){
    const config=clone(rawBalance);
    return {
      config,
      version:config.version || 'identity-v1',
      hash:stableHash(config),
      diagnostics:[]
    };
  }

  const {resolved,diagnostics}=resolveBalanceDoc(rawBalance);
  const config=clone(resolved);
  return {
    config,
    version:config.version || 'identity-v1',
    hash:stableHash(config),
    diagnostics:clone(diagnostics)
  };
}

function buildLevel({
  seed,
  structure,
  spec
}){
  const fallbackReasons=[];
  const requestedRows=Number.isInteger(spec.rows) ? spec.rows : DEFAULT_ROWS;
  const requestedColumns=Number.isInteger(spec.columns) ? spec.columns : DEFAULT_COLUMNS;

  try{
    return {
      level:generateCertifiedQuestLevel({
        seed:(seed ^ 0xa341316c) >>> 0,
        rows:requestedRows,
        columns:requestedColumns,
        stageCount:structure.stageCount,
        optionalCount:structure.optionalCount
      }),
      fallbackUsed:false,
      fallbackReasons
    };
  }catch(error){
    const count=structure.stageCount + 2 + structure.optionalCount;
    const grid=gridForNodeCount(count);
    fallbackReasons.push(
      'requested level layout failed: ' +
      (error instanceof Error ? error.message : 'unknown layout error')
    );

    return {
      level:generateCertifiedQuestLevel({
        seed:(seed ^ 0xa341316c) >>> 0,
        rows:grid.rows,
        columns:grid.columns,
        stageCount:structure.stageCount,
        optionalCount:structure.optionalCount
      }),
      fallbackUsed:true,
      fallbackReasons
    };
  }
}

export async function generateDailyBundleArtifact({
  date,
  bank,
  balance=IDENTITY_BALANCE,
  spec={},
  questionSelector=null,
  selectorContext={}
}){
  const cleanDate=requireDate(date);
  const seed=dailySeedFromDate(cleanDate);
  const snapshot=createQuestionBankSnapshot(bank);
  if(snapshot.questionCount === 0){
    throw new Error('cannot generate Daily from an empty published Question Bank snapshot.');
  }

  const balanceSnapshot=resolveBalanceSnapshot(balance);
  const baseStageCount=Number.isInteger(spec.stageCount)
    ? spec.stageCount
    : DEFAULT_STAGE_COUNT;
  const baseOptionalCount=Number.isInteger(spec.optionalCount)
    ? spec.optionalCount
    : DEFAULT_OPTIONAL_COUNT;
  const structure=balanceQuestStructure({
    stageCount:baseStageCount,
    optionalCount:baseOptionalCount,
    balance:balanceSnapshot.config
  });

  const levelResult=buildLevel({
    seed,
    structure,
    spec
  });

  let bindingResult=await selectBindings({
    bank,
    snapshot,
    level:levelResult.level,
    spec,
    seed,
    questionSelector,
    context:selectorContext
  });

  let questionSet;
  try{
    questionSet=freezeQuestionSet(bank,bindingResult.bindings);
  }catch(error){
    if(bindingResult.fallbackUsed) throw error;
    bindingResult={
      bindings:deterministicQuestionBindings({
        bank,
        snapshot,
        level:levelResult.level,
        spec,
        seed
      }),
      fallbackUsed:true,
      fallbackReasons:[
        ...bindingResult.fallbackReasons,
        'primary question bindings were invalid: ' +
          (error instanceof Error ? error.message : 'unknown binding error')
      ]
    };
    questionSet=freezeQuestionSet(bank,bindingResult.bindings);
  }

  const questionRefs=questionSet.map(item => item.ref);
  const fallbackReasons=[
    ...levelResult.fallbackReasons,
    ...bindingResult.fallbackReasons
  ];

  const compatibility={
    ok:false,
    checks:['pending certification']
  };

  const bundle=createDailyBundle({
    id:'daily-' + cleanDate,
    date:cleanDate,
    seed,
    generatorVersion:DAILY_BUNDLE_GENERATOR_VERSION,
    engineVersion:SIM_ENGINE_VERSION,
    questionBankSnapshot:{
      version:snapshot.version,
      hash:snapshot.hash
    },
    balanceVersion:balanceSnapshot.version,
    questionRefs,
    levelSpec:levelResult.level,
    certifiedSolution:levelResult.level.solutionCertificate,
    compatibility
  });

  const manifestPayload={
    schemaVersion:DAILY_ARTIFACT_SCHEMA_VERSION,
    date:cleanDate,
    seed,
    bundleHash:bundle.bundleHash,
    questionBankSnapshot:snapshot,
    balanceSnapshot,
    questionSet,
    bindings:bindingResult.bindings,
    spec:clone(spec),
    generator:{
      version:DAILY_BUNDLE_GENERATOR_VERSION,
      levelGeneratorVersion:QUEST_LEVEL_GENERATOR_VERSION,
      generatedBy:fallbackReasons.length ? 'fallback-assisted' : 'primary',
      fallbackUsed:fallbackReasons.length > 0,
      fallbackReasons
    }
  };

  return deepFreeze({
    ...manifestPayload,
    status:'generated',
    bundle,
    manifestHash:stableHash(manifestPayload)
  });
}
