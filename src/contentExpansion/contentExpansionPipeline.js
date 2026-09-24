
import { stableHash } from '../domainSchemas.js';
import {
  buildRobloxMigrationPlan,
  verifyRobloxMigrationPlan
} from '../robloxMigration/migrationPlanner.js';
import {
  verifyMigrationBundleAgainstPlan
} from '../robloxMigration/migrationBundle.js';
import {
  generateCertifiedQuestLevel,
  verifySolutionCertificate
} from '../generation/solutionFirstLevel.js';
import {
  runOfflineGeneration
} from '../questionFactory/offlineQuestionFactory.js';
import {
  ingestValidatedCandidates,
  validateGeneratedCandidates
} from '../questionFactory/questionQualityPipeline.js';
import {
  runDevelopmentFactory,
  verifyDevelopmentRun
} from '../devFactory/developmentFactory.js';

export const CONTENT_EXPANSION_SCHEMA_VERSION=1;
export const CONTENT_EXPANSION_VERSION='starblox-content-expansion-v1';

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function string(value,label,max=240){
  if(typeof value !== 'string' || !value.trim()){
    throw new TypeError(label + ' is required.');
  }
  return value.trim().slice(0,max);
}

function strings(value){
  if(!Array.isArray(value)) return [];
  return [...new Set(value
    .filter(item=>typeof item === 'string' && item.trim())
    .map(item=>item.trim())
  )].sort();
}

function integer(value,def,min,max){
  const n=Number(value ?? def);
  if(!Number.isInteger(n)) return def;
  return Math.min(max,Math.max(min,n));
}

function normalizeBrief(raw={}){
  const districtName=string(raw.districtName || raw.title,'districtName',120);
  const districtId=typeof raw.districtId === 'string' && raw.districtId.trim()
    ? raw.districtId.trim()
    : districtName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  const subject=string(raw.subject,'subject',80);
  const skills=strings(raw.skills);
  if(!skills.length) throw new TypeError('brief.skills must contain at least one skill.');

  const base={
    districtId:string(districtId,'districtId',100),
    districtName,
    subject,
    skills,
    targetCapabilities:strings(raw.targetCapabilities),
    request:string(raw.request || ('Build the ' + districtName + ' StarBlox district.'),'request',1200),
    stageCount:integer(raw.stageCount,5,1,20),
    optionalCount:integer(raw.optionalCount,3,0,20),
    questionsPerChunk:integer(raw.questionsPerChunk,3,1,20),
    minQuestionScore:integer(raw.minQuestionScore,80,50,100),
    tags:strings(raw.tags)
  };
  const derivedSeed=parseInt(stableHash({
    namespace:'starblox-content-expansion-seed-v1',
    districtId:base.districtId,
    subject:base.subject,
    skills:base.skills
  }).split(':')[1],16) >>> 0;
  return {
    ...base,
    seed:Number.isInteger(raw.seed) && raw.seed >= 0 ? raw.seed >>> 0 : derivedSeed
  };
}

function sourceChunkSummary(chunks=[]){
  return chunks.map(chunk=>({
    id:String(chunk?.id || ''),
    source:String(chunk?.source || ''),
    header:String(chunk?.header || ''),
    hash:stableHash({
      id:String(chunk?.id || ''),
      source:String(chunk?.source || ''),
      header:String(chunk?.header || ''),
      text:String(chunk?.text || '')
    })
  }));
}

function planPayload(plan){
  return {
    schemaVersion:plan.schemaVersion,
    version:plan.version,
    brief:plan.brief,
    migration:plan.migration,
    blueprint:plan.blueprint,
    sourceChunks:plan.sourceChunks,
    gates:plan.gates
  };
}

export function buildContentExpansionPlan({
  brief,
  catalog,
  chunks=[],
  migrationRules={}
}){
  const normalized=normalizeBrief(brief);
  const rules={
    ...migrationRules,
    includeCapabilities:normalized.targetCapabilities.length
      ? normalized.targetCapabilities
      : migrationRules.includeCapabilities
  };
  const migrationPlan=buildRobloxMigrationPlan(catalog,rules);
  const migrationValidation=verifyRobloxMigrationPlan(migrationPlan);
  if(!migrationValidation.ok){
    throw new Error('content expansion migration plan invalid: ' + migrationValidation.errors[0]);
  }

  const level=generateCertifiedQuestLevel({
    seed:normalized.seed,
    stageCount:normalized.stageCount,
    optionalCount:normalized.optionalCount
  });
  const solution=verifySolutionCertificate(level);
  if(!solution.ok){
    throw new Error('content expansion level certificate failed: ' + solution.reason);
  }

  const questionSlots=(level.nodes || []).filter(node=>node.questionSlot);
  const selected=migrationPlan.units.filter(unit=>unit.selected);
  const selectedSystems=selected.map(unit=>({
    unitId:unit.unitId,
    systemName:unit.systemName,
    sourceId:unit.sourceId,
    capabilities:clone(unit.capabilities),
    strategy:unit.migrationStrategy,
    disposition:unit.exportDisposition,
    suggestedTarget:unit.suggestedTarget,
    blockers:clone(unit.blockers || [])
  }));

  const gates=[];
  if(normalized.targetCapabilities.length && selectedSystems.length === 0){
    gates.push('no reusable systems selected for requested capabilities');
  }
  if(questionSlots.length && (!Array.isArray(chunks) || chunks.length === 0)){
    gates.push('question source chunks are required');
  }

  const blueprint={
    blueprintVersion:'starblox-district-blueprint-v1',
    districtId:normalized.districtId,
    districtName:normalized.districtName,
    subject:normalized.subject,
    skills:normalized.skills,
    seed:normalized.seed,
    selectedSystems,
    levelHash:level.levelHash,
    level,
    questionSlots:questionSlots.map(node=>({
      nodeId:node.nodeId,
      slot:clone(node.questionSlot)
    })),
    developmentTask:{
      id:'expand-' + normalized.districtId,
      request:[
        normalized.request,
        'Use only staged/authorized migration assets and systems.',
        'Implement the certified level structure with level hash ' + level.levelHash + '.',
        'Do not publish, purchase, spend, or activate production content.'
      ].join(' '),
      searchQuery:normalized.districtName,
      inspectCalls:[]
    }
  };

  const base={
    schemaVersion:CONTENT_EXPANSION_SCHEMA_VERSION,
    version:CONTENT_EXPANSION_VERSION,
    brief:normalized,
    migration:{
      planId:migrationPlan.planId,
      planHash:migrationPlan.planHash,
      selectedUnitIds:selected.map(unit=>unit.unitId),
      selectedCount:selected.length,
      stagingCount:selected.filter(unit=>unit.exportDisposition === 'staging').length,
      quarantineCount:selected.filter(unit=>unit.exportDisposition === 'quarantine').length,
      blockerCount:selected.reduce((sum,unit)=>sum+(unit.blockers?.length || 0),0)
    },
    blueprint,
    sourceChunks:sourceChunkSummary(chunks),
    gates
  };

  const hash=stableHash(planPayload(base));
  return deepFreeze({
    ...base,
    expansionId:'content-expansion-' + hash.split(':')[1],
    planHash:hash,
    migrationPlan
  });
}

export function verifyContentExpansionPlan(plan){
  const errors=[];
  if(!plan || typeof plan !== 'object' || Array.isArray(plan)){
    return {ok:false,errors:['plan must be an object']};
  }
  if(plan.schemaVersion !== CONTENT_EXPANSION_SCHEMA_VERSION){
    errors.push('unsupported content expansion plan schema');
  }
  if(plan.version !== CONTENT_EXPANSION_VERSION){
    errors.push('unsupported content expansion plan version');
  }
  const migrationValidation=verifyRobloxMigrationPlan(plan.migrationPlan);
  if(!migrationValidation.ok){
    errors.push('migration plan invalid: ' + migrationValidation.errors[0]);
  }else if(plan.migrationPlan.planHash !== plan.migration?.planHash){
    errors.push('migration plan identity mismatch');
  }
  try{
    if(stableHash(planPayload(plan)) !== plan.planHash){
      errors.push('content expansion plan hash mismatch');
    }
  }catch{
    errors.push('content expansion plan is not hashable');
  }
  return {ok:errors.length === 0,errors};
}

function artifactPayload(artifact){
  return {
    schemaVersion:artifact.schemaVersion,
    version:artifact.version,
    expansionId:artifact.expansionId,
    planHash:artifact.planHash,
    brief:artifact.brief,
    migration:artifact.migration,
    blueprint:artifact.blueprint,
    questions:artifact.questions,
    development:artifact.development,
    review:artifact.review
  };
}

function repositoryGatePassed(value){
  return value === true || Boolean(value && typeof value === 'object' && value.ok === true);
}

function repositoryProofComplete(repository){
  return Boolean(
    repository?.ok === true &&
    repositoryGatePassed(repository?.gates?.tests) &&
    repositoryGatePassed(repository?.gates?.certification) &&
    repositoryGatePassed(repository?.gates?.balance) &&
    repositoryGatePassed(repository?.gates?.build)
  );
}

function developmentSummary(run){
  if(!run) return {
    status:'not_run',
    runId:null,
    runHash:null,
    cycleCount:0,
    finalReview:null,
    repository:null,
    repositoryProofComplete:false
  };
  return {
    status:run.status,
    runId:run.runId,
    runHash:run.runHash,
    cycleCount:Array.isArray(run.cycles) ? run.cycles.length : 0,
    finalReview:clone(run.finalReview),
    repository:clone(run.repository),
    repositoryProofComplete:repositoryProofComplete(run.repository)
  };
}

function migrationSummary(bundle,plan,planBindingHash=null){
  if(!bundle){
    return {
      status:plan.migration.selectedCount ? 'not_staged' : 'not_required',
      bundleId:null,
      bundleHash:null,
      exportedUnits:0,
      requiresHumanReview:false,
      liveActivationAllowed:false,
      reasons:[],
      selectedUnitIds:clone(plan.migration.selectedUnitIds || []),
      planBindingHash:null
    };
  }
  return {
    status:'staged',
    bundleId:bundle.bundleId,
    bundleHash:bundle.bundleHash,
    exportedUnits:bundle.summary?.exportedUnits ?? 0,
    requiresHumanReview:Boolean(bundle.review?.requiresHumanReview),
    liveActivationAllowed:false,
    reasons:clone(bundle.review?.reasons || []),
    selectedUnitIds:clone(plan.migration.selectedUnitIds || []),
    planBindingHash
  };
}

export async function runContentExpansionPipeline({
  brief,
  catalog,
  bank,
  chunks=[],
  questionProvider=null,
  questionReviewer=null,
  migrationStage=null,
  studio=null,
  agents=null,
  repositoryGate=null,
  startedAt='2000-01-01T00:00:00.000Z',
  migrationRules={},
  config={}
}){
  const plan=buildContentExpansionPlan({brief,catalog,chunks,migrationRules});
  const blockers=[...plan.gates];
  let nextBank=bank;

  let migrationBundle=null;
  let migrationBindingHash=null;
  if(plan.migration.selectedCount > 0){
    if(!migrationStage || typeof migrationStage.stage !== 'function'){
      blockers.push('selected migration systems have not been staged');
    }else{
      try{
        migrationBundle=await migrationStage.stage({
          expansionId:plan.expansionId,
          plan:plan.migrationPlan,
          catalog
        });
        const validation=verifyMigrationBundleAgainstPlan(
          migrationBundle,
          plan.migrationPlan
        );
        if(!validation.ok){
          blockers.push('migration staging/plan binding invalid: ' + validation.errors[0]);
          migrationBundle=null;
        }else{
          migrationBindingHash=validation.bindingHash;
        }
        if(migrationBundle && migrationBundle.review?.liveActivationAllowed !== false){
          blockers.push('migration staging attempted live activation');
        }else if(migrationBundle && migrationBundle.review?.requiresHumanReview){
          blockers.push('migration staging contains unresolved human-review items');
        }
      }catch(error){
        blockers.push('migration staging failed: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
  }

  const requiredQuestions=plan.blueprint.questionSlots.length;
  const questions={
    status:'not_run',
    generated:0,
    accepted:0,
    rejected:0,
    duplicates:0,
    inserted:[],
    bankHash:bank?.bankHash ?? null
  };

  if(requiredQuestions > 0){
    if(!bank || !questionProvider || typeof questionProvider.generate !== 'function' ||
       !questionReviewer || typeof questionReviewer.review !== 'function'){
      blockers.push('strict question generation/reviewer adapters are required');
    }else if(!chunks.length){
      blockers.push('question source chunks are required');
    }else{
      try{
        const generation=await runOfflineGeneration({
          chunks,
          provider:questionProvider,
          runId:plan.expansionId,
          questionsPerChunk:plan.brief.questionsPerChunk,
          maxRetries:integer(config.questionRetries,2,1,5)
        });
        const quality=await validateGeneratedCandidates({
          candidates:generation.candidates,
          chunks,
          reviewer:questionReviewer,
          bank,
          mode:'strict',
          minScore:plan.brief.minQuestionScore,
          allowRewrite:true
        });
        const chosen=quality.accepted.slice(0,requiredQuestions);
        questions.status=chosen.length >= requiredQuestions ? 'validated' : 'insufficient';
        questions.generated=generation.candidates.length;
        questions.accepted=quality.accepted.length;
        questions.rejected=quality.rejected.length;
        questions.duplicates=quality.duplicates.length;

        if(chosen.length < requiredQuestions){
          blockers.push(
            'strict question QA produced ' + chosen.length +
            ' questions for ' + requiredQuestions + ' required slots'
          );
        }else{
          const ingested=ingestValidatedCandidates(bank,chosen,{
            tags:['generated','content-expansion',...plan.brief.tags]
          });
          nextBank=ingested.bank;
          questions.inserted=ingested.inserted.map(clone);
          questions.bankHash=nextBank.bankHash;
          if(questions.inserted.some(item=>item.lifecycle !== 'pending')){
            blockers.push('generated questions escaped pending lifecycle');
          }
        }
      }catch(error){
        blockers.push('question generation/QA failed: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
  }

  let developmentRun=null;
  if(config.executeStudio === true){
    if(!studio || !agents){
      blockers.push('Studio execution requested without Studio/agent adapters');
    }else if(!repositoryGate || typeof repositoryGate.run !== 'function'){
      blockers.push('repository test/balance/build gate is required for Studio expansion review');
    }else{
      try{
        developmentRun=await runDevelopmentFactory({
          task:plan.blueprint.developmentTask,
          studio,
          agents,
          repositoryGate,
          startedAt,
          config:{
            maxRepairCycles:integer(config.maxRepairCycles,2,0,5),
            maxTotalMutationCalls:integer(config.maxTotalMutationCalls,120,1,500),
            maxToolCallsPerBatch:integer(config.maxToolCallsPerBatch,50,1,100),
            requiredRepositoryGates:['tests','certification','balance','build'],
            allowDestructive:false,
            allowExecuteLuau:false,
            allowUnrollbackable:false,
            keepFailedChanges:false,
            confirmed:Boolean(config.confirmed)
          }
        });
        const validation=verifyDevelopmentRun(developmentRun);
        if(!validation.ok){
          blockers.push('development run integrity failed: ' + validation.errors[0]);
        }else if(developmentRun.status !== 'verified'){
          blockers.push('Studio development run did not verify');
        }else if(!repositoryProofComplete(developmentRun.repository)){
          blockers.push('repository proof must include passing tests, certification, balance gate, and production build');
        }
      }catch(error){
        blockers.push('Studio development run failed: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
  }else{
    blockers.push('Studio build/playtest verification has not been executed');
  }

  const migration=migrationSummary(migrationBundle,plan,migrationBindingHash);
  const development=developmentSummary(developmentRun);

  const questionEvidence=deepFreeze({
    status:questions.status,
    required:requiredQuestions,
    generated:questions.generated,
    accepted:questions.accepted,
    rejected:questions.rejected,
    duplicates:questions.duplicates,
    inserted:clone(questions.inserted),
    bankHash:questions.bankHash
  });

  const review={
    autoPublish:false,
    liveActivationAllowed:false,
    readyForHumanReview:blockers.length === 0,
    blockers:[...new Set(blockers)].sort(),
    requiredHumanActions:[
      'review staged authorized assets/systems',
      'review pending generated questions',
      'review Studio screenshots/logs/test evidence',
      'explicitly version and promote accepted content through rollout controls'
    ]
  };

  const base={
    schemaVersion:CONTENT_EXPANSION_SCHEMA_VERSION,
    version:CONTENT_EXPANSION_VERSION,
    expansionId:plan.expansionId,
    planHash:plan.planHash,
    brief:clone(plan.brief),
    migration,
    blueprint:{
      blueprintVersion:plan.blueprint.blueprintVersion,
      districtId:plan.blueprint.districtId,
      districtName:plan.blueprint.districtName,
      subject:plan.blueprint.subject,
      skills:clone(plan.blueprint.skills),
      seed:plan.blueprint.seed,
      selectedSystems:clone(plan.blueprint.selectedSystems),
      levelHash:plan.blueprint.levelHash,
      solutionCertificateHash:stableHash(plan.blueprint.level.solutionCertificate),
      questionSlots:clone(plan.blueprint.questionSlots)
    },
    questions:questionEvidence,
    development,
    review
  };

  const artifact=deepFreeze({
    ...base,
    artifactHash:stableHash(artifactPayload(base))
  });

  return {
    artifact,
    nextBank,
    plan,
    migrationBundle,
    developmentRun
  };
}

export function verifyContentExpansionArtifact(artifact){
  const errors=[];
  if(!artifact || typeof artifact !== 'object' || Array.isArray(artifact)){
    return {ok:false,errors:['artifact must be an object']};
  }
  if(artifact.schemaVersion !== CONTENT_EXPANSION_SCHEMA_VERSION){
    errors.push('unsupported content expansion schema');
  }
  if(artifact.version !== CONTENT_EXPANSION_VERSION){
    errors.push('unsupported content expansion version');
  }
  if(artifact.review?.autoPublish !== false){
    errors.push('content expansion may not auto-publish');
  }
  if(artifact.review?.liveActivationAllowed !== false){
    errors.push('content expansion may not activate live content');
  }
  if(artifact.migration?.liveActivationAllowed !== false){
    errors.push('migration evidence is not staging-only');
  }
  if(
    artifact.migration?.status === 'staged' &&
    !/^fnv1a32:[a-f0-9]{8}$/.test(String(artifact.migration?.planBindingHash || ''))
  ){
    errors.push('staged migration is missing exact plan-binding proof');
  }

  const blueprintUnitIds=(artifact.blueprint?.selectedSystems || [])
    .map(item => item?.unitId)
    .filter(Boolean)
    .sort();
  const migrationUnitIds=Array.isArray(artifact.migration?.selectedUnitIds)
    ? [...artifact.migration.selectedUnitIds].sort()
    : [];
  if(JSON.stringify(blueprintUnitIds) !== JSON.stringify(migrationUnitIds)){
    errors.push('migration selected units do not match district blueprint systems');
  }

  if(artifact.review?.readyForHumanReview === true){
    if(Array.isArray(artifact.review?.blockers) && artifact.review.blockers.length){
      errors.push('review cannot be ready while blockers remain');
    }
    if(artifact.development?.status !== 'verified'){
      errors.push('review-ready expansion requires verified Studio development');
    }
    if(artifact.development?.repositoryProofComplete !== true){
      errors.push('review-ready expansion requires complete repository proof');
    }
    if(
      artifact.migration?.status === 'not_staged' ||
      (artifact.migration?.status === 'staged' && !artifact.migration?.bundleHash)
    ){
      errors.push('review-ready expansion requires valid migration staging evidence');
    }
    if(artifact.questions?.status !== 'validated'){
      errors.push('review-ready expansion requires validated questions');
    }
    if(
      Number(artifact.questions?.required ?? 0) !==
      (Array.isArray(artifact.questions?.inserted) ? artifact.questions.inserted.length : 0)
    ){
      errors.push('review-ready expansion requires exact question-slot coverage');
    }
  }
  for(const inserted of artifact.questions?.inserted || []){
    if(inserted.lifecycle !== 'pending'){
      errors.push('generated question is not pending');
    }
  }
  try{
    const expected=stableHash(artifactPayload(artifact));
    if(expected !== artifact.artifactHash) errors.push('content expansion artifact hash mismatch');
  }catch{
    errors.push('content expansion artifact is not hashable');
  }
  return {ok:errors.length === 0,errors};
}

export function assertContentExpansionReviewable(artifact){
  const validation=verifyContentExpansionArtifact(artifact);
  if(!validation.ok){
    throw new Error('invalid content expansion artifact: ' + validation.errors[0]);
  }
  if(!artifact.review.readyForHumanReview){
    throw new Error(
      'content expansion is blocked: ' +
      (artifact.review.blockers || []).join('; ')
    );
  }
  return true;
}
