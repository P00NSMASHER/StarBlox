
import {
  createQuestionBankSnapshot,
  getQuestionEntry,
  getQuestionVersion
} from '../questionBank/questionBankV2.js';
import { authoredDifficultyToIrt } from '../intelligence/irtEngine.js';
import { assertDailyPublishable } from '../daily/dailyCertification.js';

export const ROBLOX_SHADOW_BRIDGE_VERSION='starblox-roblox-shadow-v1';

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function lookup(table,key){
  if(table instanceof Map) return table.get(key);
  return table?.[key];
}


export function buildRobloxQuestionBankRuntimePayload(bank,{
  itemCalibrations={},
  qualityByQuestionId={}
}={}){
  const snapshot=createQuestionBankSnapshot(bank);
  const questions=[];

  for(const ref of snapshot.refs){
    const entry=getQuestionEntry(bank,ref.questionId);
    const version=getQuestionVersion(bank,ref.questionId,ref.version);
    if(!entry || !version || version.contentHash !== ref.contentHash) continue;

    const calibration=
      lookup(itemCalibrations,ref.questionId + '@' + ref.version) ||
      lookup(itemCalibrations,ref.questionId) ||
      null;
    const quality=lookup(qualityByQuestionId,ref.questionId);

    questions.push({
      questionId:ref.questionId,
      version:ref.version,
      contentHash:ref.contentHash,
      prompt:version.prompt,
      choices:clone(version.choices),
      answer:version.answer,
      explanation:version.explanation,
      hint:version.hint,
      subject:version.subject,
      district:version.district,
      skill:version.skill,
      role:version.role,
      conceptIds:clone(entry.conceptIds?.length ? entry.conceptIds : [version.skill]),
      difficulty:version.difficulty,
      reward:version.reward,
      masteryEligible:version.masteryEligible !== false,
      irtDifficulty:calibration?.difficulty ?? authoredDifficultyToIrt(version.difficulty),
      irtDiscrimination:calibration?.discrimination ?? 1,
      quality:typeof quality === 'number'
        ? Math.max(0,Math.min(1,quality > 1 ? quality / 100 : quality))
        : 1
    });
  }

  return {
    bankId:snapshot.bankId,
    version:snapshot.version,
    hash:snapshot.hash,
    questions
  };
}

export function buildRobloxDailyRuntimePayload({artifact,releaseId}){
  assertDailyPublishable(artifact);
  if(typeof releaseId !== 'string' || !releaseId.trim()){
    throw new TypeError('releaseId is required.');
  }

  return {
    certified:true,
    dailyId:artifact.bundle.id,
    releaseId:releaseId.trim(),
    bundleHash:artifact.bundle.bundleHash,
    questionBankVersion:artifact.questionBankSnapshot.version,
    questionBankHash:artifact.questionBankSnapshot.hash,
    balanceVersion:artifact.bundle.balanceVersion,
    questionRefs:clone(artifact.bundle.questionRefs),
    levelSpec:clone(artifact.bundle.levelSpec)
  };
}

export function buildRobloxShadowCandidates(bank,{
  candidateRefs=null,
  itemCalibrations={},
  qualityByQuestionId={}
}={}){
  const refs=Array.isArray(candidateRefs)
    ? candidateRefs
    : createQuestionBankSnapshot(bank).refs;

  const out=[];
  for(const ref of refs){
    const entry=getQuestionEntry(bank,ref.questionId);
    const version=getQuestionVersion(bank,ref.questionId,ref.version);
    if(!entry || entry.lifecycle !== 'published' || !version) continue;
    if(version.contentHash !== ref.contentHash) continue;

    const calibration=
      lookup(itemCalibrations,ref.questionId + '@' + ref.version) ||
      lookup(itemCalibrations,ref.questionId) ||
      null;
    const quality=lookup(qualityByQuestionId,ref.questionId);

    out.push({
      questionId:ref.questionId,
      version:ref.version,
      contentHash:ref.contentHash,
      subject:version.subject,
      district:version.district,
      skill:version.skill,
      role:version.role,
      conceptIds:clone(entry.conceptIds?.length ? entry.conceptIds : [version.skill]),
      difficulty:version.difficulty,
      irtDifficulty:calibration?.difficulty ?? authoredDifficultyToIrt(version.difficulty),
      irtDiscrimination:calibration?.discrimination ?? 1,
      quality:typeof quality === 'number'
        ? Math.max(0,Math.min(1,quality > 1 ? quality / 100 : quality))
        : 1
    });
  }

  return out.sort((a,b) => a.questionId.localeCompare(b.questionId));
}

export function buildRobloxShadowState({
  learning,
  nowMs,
  context={},
  weights=null,
  introduceNewConcepts=false
}){
  if(typeof nowMs !== 'number' || !Number.isFinite(nowMs) || nowMs < 0){
    throw new TypeError('nowMs must be a non-negative finite number.');
  }
  const source=learning || {};
  return {
    memoryByConcept:clone(source.Concepts || source.concepts || {}),
    theta:Number(source.Ability?.Theta ?? source.ability?.theta ?? 0),
    abilityStandardError:Number(
      source.Ability?.StandardError ??
      source.ability?.standardError ??
      1
    ),
    recentQuestionIds:clone(source.RecentQuestionIds || source.recentQuestionIds || []),
    recentConceptIds:clone(source.RecentConceptIds || source.recentConceptIds || []),
    recentWrongStreak:Number(source.WrongStreak ?? source.wrongStreak ?? 0),
    nowMs:Number(nowMs),
    desiredRetention:0.90,
    introduceNewConcepts:Boolean(introduceNewConcepts),
    context:clone(context),
    weights:weights ? clone(weights) : null
  };
}

export function verifyShadowOnlyResult(result,controlQuestionId){
  const errors=[];
  if(!result || typeof result !== 'object'){
    return {ok:false,errors:['shadow result must be an object']};
  }
  if(result.authoritative !== 'control'){
    errors.push('shadow result attempted to become authoritative');
  }
  if(result.selectedQuestionId !== controlQuestionId){
    errors.push('shadow result changed the control question');
  }
  if(result.shadow?.mode !== 'shadow'){
    errors.push('shadow comparison mode is not shadow');
  }
  return {ok:errors.length === 0,errors};
}
