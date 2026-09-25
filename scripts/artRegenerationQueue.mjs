#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {recommend,train} from './artPromptOptimizer.mjs';
import {loadFactoryState} from './artFactoryState.mjs';

const PRODUCER_BY_COLLECTION = Object.freeze({
  tops:'09', bottoms:'05', headwear:'12', facegear:'12',
  shoes:'06', backgear:'12', handgear:'12', seating:'06',
  beds:'02', desks:'03', companions:'06', auras:'11',
  lighting:'04', wall:'05', rugs:'07', decor:'09'
});

function failureCount(itemId,corpus){
  return corpus.observations.filter(x=>x.itemId===itemId && x.independent && x.decision==='REWORK').length;
}
function priorityScore(row,corpus){
  const failures=failureCount(row.itemId,corpus);
  const tier=Number(row.tier)||0;
  const duplicate=row.failureCodes.includes('NEAR_DUPLICATE_TEMPLATE')?8:0;
  const theme=row.failureCodes.includes('THEME_MISMATCH')?6:0;
  const depth=row.failureCodes.includes('WEAK_DEPTH')||row.failureCodes.includes('FLAT_COMPOSITION')?5:0;
  const releaseBlocker=row.sourceState==='UNFILLED_RELEASE_BLOCKER'?10000:0;
  return releaseBlocker+failures*100+tier*10+duplicate+theme+depth;
}
export function buildRegenerationQueue({corpus,authoritativeState=null,fallbackBacklog=null}){
  const actionable=[],blocked=[],pending=[],preserve=[];
  const stateByItem=authoritativeState?.items||{};
  for(const row of corpus.current){
    if(!row.independent){ preserve.push({itemId:row.itemId,reason:'CURRENT_REVIEW_NOT_INDEPENDENT'}); continue; }
    if(row.decision==='ACCEPT'){ preserve.push({itemId:row.itemId,assetHash:row.assetHash,reason:'PRESERVE_ACCEPTED_EXACT_HASH'}); continue; }
    if(row.decision!=='REWORK'){
      blocked.push({itemId:row.itemId,assetHash:row.assetHash,decision:row.decision,reason:'NOT_ART_REGENERATION_DECISION'});
      continue;
    }
    if(row.failureCodes.includes('TECHNICAL_INTEGRITY')){
      blocked.push({itemId:row.itemId,assetHash:row.assetHash,decision:row.decision,failureCodes:row.failureCodes,reason:'TECHNICAL_REPAIR_REQUIRED_NOT_PROMPT_REGEN'});
      continue;
    }
    const pendingCandidate=stateByItem[row.itemId]?.pendingCandidate||null;
    if(pendingCandidate?.assetHash && pendingCandidate.assetHash!==row.assetHash){
      pending.push({itemId:row.itemId,reviewedHash:row.assetHash,pendingCandidates:[pendingCandidate],reason:'AUTHORITATIVE_NEWER_CANDIDATE_PENDING_EXACT_HASH_REVIEW'});
      continue;
    }
    actionable.push({
      itemId:row.itemId,collectionId:row.collectionId,name:row.name,tier:row.tier,theme:row.theme,
      reviewedHash:row.assetHash,reviewer:row.reviewer,producer:String(row.producer||PRODUCER_BY_COLLECTION[row.collectionId]||''),
      failureCodes:row.failureCodes,humanReason:row.reason,
      independentReworkCount:failureCount(row.itemId,corpus),
      priority:priorityScore(row,corpus)
    });
  }

  const currentIds=new Set(corpus.current.map(row=>row.itemId));
  for(const row of fallbackBacklog?.productionQueue||[]){
    if(row.state!=='UNFILLED_NEEDS_PRODUCTION' || currentIds.has(row.itemId)) continue;
    const pendingCandidate=stateByItem[row.itemId]?.pendingCandidate||null;
    if(pendingCandidate?.assetHash){
      pending.push({itemId:row.itemId,reviewedHash:null,pendingCandidates:[pendingCandidate],reason:'UNFILLED_ITEM_HAS_AUTHORITATIVE_PENDING_EXACT_HASH'});
      continue;
    }
    const route=row.route||{};
    const queued={
      itemId:row.itemId,
      collectionId:row.collectionId,
      name:row.name,
      tier:row.tier,
      theme:row.theme,
      reviewedHash:null,
      reviewer:String(route.reviewer||''),
      producer:String(route.producer||PRODUCER_BY_COLLECTION[row.collectionId]||''),
      failureCodes:[],
      humanReason:'Missing canonical art; first independent verdict occurs only after exact staged pixels exist.',
      independentReworkCount:0,
      sourceState:'UNFILLED_RELEASE_BLOCKER',
      releaseBlocking:true
    };
    queued.priority=priorityScore(queued,corpus);
    actionable.push(queued);
  }
  actionable.sort((a,b)=>b.priority-a.priority || String(a.producer).localeCompare(String(b.producer)) || a.itemId.localeCompare(b.itemId));
  const oneBatchPerProducer=new Map(), selected=[];
  for(const row of actionable){
    const producer=row.producer||'UNASSIGNED';
    const batch=oneBatchPerProducer.get(producer)||[];
    if(batch.length>=4) continue;
    batch.push(row); oneBatchPerProducer.set(producer,batch); selected.push(row);
  }
  return {
    schemaVersion:1,
    policy:{
      exactHashCurrentReviewRequired:true,
      acceptedHashesFrozen:true,
      technicalBlockersExcludedFromGeneration:true,
      newerPendingCandidatesExcluded:true,
      pendingSuppressionAuthority:'DERIVED_EXACT_FACTORY_STATE_ONLY',
      laneSnapshotsAuthoritative:false,
      independentReviewRequired:true,
      maxItemsPerProducerBatch:4,
      automaticGeneration:false,
      unfilledFallbacksAllowed:true,
      unfilledFallbacksDoNotFabricateReview:true
    },
    counts:{actionable:actionable.length,selected: selected.length,pending:pending.length,blocked:blocked.length,preserve:preserve.length},
    selected,
    actionable,
    pending,
    blocked,
    preserve
  };
}

export function attachPromptRecommendations(queue,{items=[],reviewDocs=[]}={}){
  const byId=new Map(items.map(item=>[item.id,item]));
  const model=train({reviewDocs});
  return {
    ...queue,
    selected:queue.selected.map(row=>{
      const item=byId.get(row.itemId);
      if(!item) return {...row,promptRecommendation:{action:'HOLD_NOT_REGEN',reason:'ITEM_METADATA_MISSING'}};
      const review=row.sourceState==='UNFILLED_RELEASE_BLOCKER'?null:{
        itemId:row.itemId,
        assetHash:row.reviewedHash,
        producer:row.producer,
        reviewer:row.reviewer,
        decision:'REWORK',
        reason:row.humanReason,
        failureCodes:row.failureCodes
      };
      return {...row,promptRecommendation:recommend(item,review,model,4)};
    }),
    policy:{...queue.policy,promptRecommendationsIncluded:true}
  };
}

function args(argv){const out={};for(let i=0;i<argv.length;i++){const x=argv[i];if(!x.startsWith('--'))continue;const k=x.slice(2),v=argv[i+1];if(v&&!v.startsWith('--')){out[k]=v;i++}else out[k]=true}return out}
async function main(){
  const a=args(process.argv.slice(2)),root=path.resolve(a['repo-root']||'.');
  const reviews=reviewDocs(root);
  const {items,corpus,fallbackBacklog,state}=await loadFactoryState(root);
  const queue=attachPromptRecommendations(
    buildRegenerationQueue({corpus,authoritativeState:state,fallbackBacklog}),
    {items,reviewDocs:reviews}
  );
  const text=JSON.stringify(queue,null,2)+'\n';
  if(a.output){const dest=path.resolve(a.output);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,text)}else process.stdout.write(text);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.stack||e);process.exit(1)});
