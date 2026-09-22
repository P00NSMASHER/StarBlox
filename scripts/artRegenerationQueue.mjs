#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildReviewCorpus} from './artReviewNormalizer.mjs';
import {recommend,train} from './artPromptOptimizer.mjs';

const PENDING_RX = /READY_FOR_REVIEW|READY_FOR_FRESH_REVIEW|STAGED|PENDING_(?:REVIEW|\d+)|AWAITING_(?:REVIEW|RENDER)|EXACT_BYTES_VERIFIED|RENDER_EVIDENCE_READY|GENERATED|REVIEW_REQUEST/i;
const HASH_KEYS = ['assetHash','gitBlobSha','candidateBlobSha','blobSha','hash'];
const ID_KEYS = ['itemId','id'];
const PRODUCER_BY_COLLECTION = Object.freeze({
  tops:'09', bottoms:'05', headwear:'12', facegear:'12',
  shoes:'06', backgear:'12', handgear:'12', seating:'06',
  beds:'02', desks:'03', companions:'06', auras:'11',
  lighting:'04', wall:'05', rugs:'07', decor:'09'
});

function allObjects(value,out=[]){
  if(!value || typeof value!=='object') return out;
  if(Array.isArray(value)){ for(const v of value) allObjects(v,out); return out; }
  out.push(value); for(const v of Object.values(value)) allObjects(v,out); return out;
}
function first(obj,keys){ for(const k of keys) if(obj?.[k]!=null) return obj[k]; return null; }
function stateText(obj){ return ['status','state','decision','reviewStatus','candidateStatus','deliveryStatus','repositoryStatus','nextGate'].map(k=>String(obj?.[k]??'')).join(' '); }
function reviewDocs(root){
  const dir=path.join(root,'docs/preproduction/catalog-sprint/reviews');
  return fs.readdirSync(dir).filter(x=>/^\d+\.json$/.test(x)).sort().map(name=>({path:path.relative(root,path.join(dir,name)),data:JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'))}));
}
function laneDocs(root){
  const dir=path.join(root,'docs/preproduction/catalog-sprint');
  return fs.readdirSync(dir).filter(x=>/^lane-(?:\d+|CHAT)\.json$/i.test(x)).sort().map(name=>({path:path.relative(root,path.join(dir,name)),data:JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'))}));
}
function pendingForItem(itemId,reviewHash,docs){
  const hits=[];
  for(const doc of docs) for(const obj of allObjects(doc.data)){
    const id=String(first(obj,ID_KEYS)||'');
    if(id!==itemId) continue;
    const hash=String(first(obj,HASH_KEYS)||'').toLowerCase();
    const state=stateText(obj);
    if(!hash || hash===String(reviewHash||'').toLowerCase() || !PENDING_RX.test(state)) continue;
    hits.push({sourcePath:doc.path,hash,state:state.trim().slice(0,240)});
  }
  const seen=new Set();
  return hits.filter(x=>{const k=x.sourcePath+'|'+x.hash;if(seen.has(k))return false;seen.add(k);return true});
}
function failureCount(itemId,corpus){
  return corpus.observations.filter(x=>x.itemId===itemId && x.independent && x.decision==='REWORK').length;
}
function priorityScore(row,corpus){
  const failures=failureCount(row.itemId,corpus);
  const tier=Number(row.tier)||0;
  const duplicate=row.failureCodes.includes('NEAR_DUPLICATE_TEMPLATE')?8:0;
  const theme=row.failureCodes.includes('THEME_MISMATCH')?6:0;
  const depth=row.failureCodes.includes('WEAK_DEPTH')||row.failureCodes.includes('FLAT_COMPOSITION')?5:0;
  return failures*100+tier*10+duplicate+theme+depth;
}
export function buildRegenerationQueue({corpus,laneDocuments=[]}){
  const actionable=[],blocked=[],pending=[],preserve=[];
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
    const newer=pendingForItem(row.itemId,row.assetHash,laneDocuments);
    if(newer.length){
      pending.push({itemId:row.itemId,reviewedHash:row.assetHash,pendingCandidates:newer,reason:'NEWER_CANDIDATE_PENDING_RENDER_OR_REVIEW'});
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
      independentReviewRequired:true,
      maxItemsPerProducerBatch:4,
      automaticGeneration:false
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
      const review={
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
  const mod=await import(pathToFileURL(path.join(root,'src/gameModel.js')).href+`?regen=${Date.now()}`);
  const items=mod.store||mod.gameModel?.store||[];
  const reviews=reviewDocs(root);
  const corpus=buildReviewCorpus({docs:reviews,items});
  if(corpus.conflicts.length) throw Error('review conflicts prevent queue generation');
  const queue=attachPromptRecommendations(buildRegenerationQueue({corpus,laneDocuments:laneDocs(root)}),{items,reviewDocs:reviews});
  const text=JSON.stringify(queue,null,2)+'\n';
  if(a.output){const dest=path.resolve(a.output);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,text)}else process.stdout.write(text);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.stack||e);process.exit(1)});
