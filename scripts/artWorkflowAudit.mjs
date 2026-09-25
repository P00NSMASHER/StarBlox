#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {buildRegenerationQueue} from './artRegenerationQueue.mjs';
import {loadFactoryState} from './artFactoryState.mjs';

const uniq = values => [...new Set(values)];
const normalizeAssetPath = value => {
  if(!value) return null;
  let p=String(value).replace(/\\/g,'/').trim();
  if(p.startsWith('/assets/')) p='public'+p;
  else p=p.replace(/^\//,'');
  return p;
};

function push(list,code,detail){list.push({code,...detail});}
function currentMap(corpus){return new Map((corpus.current||[]).map(row=>[row.itemId,row]));}

export function auditWorkflow({items=[],manifest={items:{}},corpus={current:[],observations:[],conflicts:[]},queue={selected:[],pending:[],blocked:[],preserve:[]},fallback={productionQueue:[],acceptedAwaitingCanonical:[],blockedEvidence:[]},authoritativeState=null,activeBatch=null,blobByPath={}}={}){
  const errors=[],warnings=[];
  const ids=items.map(x=>x.id);
  if(ids.length!==192) push(errors,'STORE_COUNT_MISMATCH',{expected:192,actual:ids.length});
  if(new Set(ids).size!==ids.length) push(errors,'DUPLICATE_STORE_IDS',{duplicates:ids.filter((id,i)=>ids.indexOf(id)!==i)});
  if(Number(manifest.target)!==items.length) push(errors,'MANIFEST_TARGET_MISMATCH',{manifestTarget:manifest.target,storeCount:items.length});
  if((corpus.conflicts||[]).length) push(errors,'REVIEW_DECISION_CONFLICT',{conflicts:corpus.conflicts});

  const byId=currentMap(corpus);
  const acceptedAwaitingCanonical=[];
  const currentAcceptedCanonical=[];
  const currentKnownReworkCanonical=[];
  const currentBlockedCanonical=[];

  for(const row of corpus.current||[]){
    const decision=String(row.decision||'').toUpperCase();
    if(['ACCEPT','REWORK'].includes(decision) && !row.independent){
      push(errors,'CURRENT_SELF_REVIEW',{itemId:row.itemId,reviewer:row.reviewer,producer:row.producer,decision});
    }
    const repoPath=normalizeAssetPath(row.assetPath);
    if(repoPath && row.assetHash){
      const actual=blobByPath[repoPath]||null;
      if(['ACCEPT','REWORK'].includes(decision) && !actual){
        push(errors,'CURRENT_REVIEW_ASSET_MISSING',{itemId:row.itemId,repoPath,decision});
      }else if(actual && actual!==row.assetHash){
        push(errors,'CURRENT_REVIEW_HASH_MISMATCH',{itemId:row.itemId,repoPath,decision,reviewHash:row.assetHash,actualBlobSha:actual});
      }
    }

    const canonical=manifest.items?.[row.itemId]||null;
    const canonicalPath=normalizeAssetPath(canonical?.assetPath);
    if(decision==='ACCEPT'){
      if(canonicalPath && repoPath && canonicalPath===repoPath) currentAcceptedCanonical.push(row.itemId);
      else acceptedAwaitingCanonical.push({itemId:row.itemId,acceptedPath:row.assetPath||null,canonicalPath:canonical?.assetPath||null,assetHash:row.assetHash});
    }
    if(decision==='REWORK' && canonicalPath && repoPath && canonicalPath===repoPath){
      currentKnownReworkCanonical.push({itemId:row.itemId,status:canonical?.status||null,assetPath:canonical?.assetPath||null});
      if(String(canonical?.status||'').toLowerCase()==='final-portable'){
        push(errors,'KNOWN_REWORK_MARKED_FINAL',{itemId:row.itemId,assetPath:canonical.assetPath});
      }else{
        push(warnings,'KNOWN_REWORK_CANONICAL_INTERIM',{itemId:row.itemId,status:canonical?.status||null,assetPath:canonical?.assetPath||null});
      }
    }
    if(decision.startsWith('BLOCKED') && canonicalPath && repoPath && canonicalPath===repoPath){
      currentBlockedCanonical.push({itemId:row.itemId,status:canonical?.status||null,assetPath:canonical?.assetPath||null});
      push(warnings,'BLOCKED_EVIDENCE_STILL_CANONICAL',{itemId:row.itemId,status:canonical?.status||null,assetPath:canonical?.assetPath||null});
    }
  }

  const manifestPaths=Object.entries(manifest.items||{}).map(([itemId,row])=>({itemId,path:normalizeAssetPath(row.assetPath)})).filter(x=>x.path);
  const pathOwners=new Map();
  for(const row of manifestPaths){const list=pathOwners.get(row.path)||[];list.push(row.itemId);pathOwners.set(row.path,list);}
  for(const [assetPath,owners] of pathOwners) if(owners.length>1) push(errors,'DUPLICATE_CANONICAL_ASSET_PATH',{assetPath,itemIds:owners});

  const selected=queue.selected||[];
  const selectedIds=selected.map(x=>x.itemId);
  if(new Set(selectedIds).size!==selectedIds.length) push(errors,'DUPLICATE_REGEN_SELECTED_IDS',{selectedIds});
  const selectedByProducer=new Map();
  for(const row of selected){
    const current=byId.get(row.itemId);
    if(String(current?.decision||'').toUpperCase()!=='REWORK') push(errors,'REGEN_NOT_CURRENT_REWORK',{itemId:row.itemId,currentDecision:current?.decision||null});
    if(current?.assetHash!==row.reviewedHash) push(errors,'REGEN_STALE_REVIEW_HASH',{itemId:row.itemId,queueHash:row.reviewedHash,currentHash:current?.assetHash||null});
    if((row.failureCodes||[]).includes('TECHNICAL_INTEGRITY')) push(errors,'TECHNICAL_ITEM_IN_REGEN_QUEUE',{itemId:row.itemId});
    const producer=String(row.producer||'UNASSIGNED');
    const count=(selectedByProducer.get(producer)||0)+1;selectedByProducer.set(producer,count);
  }
  for(const [producer,count] of selectedByProducer) if(count>4) push(errors,'PRODUCER_BATCH_OVERFLOW',{producer,count,max:4});

  const acceptedSet=new Set((corpus.current||[]).filter(x=>x.independent&&String(x.decision).toUpperCase()==='ACCEPT').map(x=>x.itemId));
  for(const id of selectedIds) if(acceptedSet.has(id)) push(errors,'ACCEPTED_ITEM_SELECTED_FOR_REGEN',{itemId:id});

  const fallbackProduction=new Set((fallback.productionQueue||[]).map(x=>x.itemId));
  const fallbackAccepted=new Set((fallback.acceptedAwaitingCanonical||[]).map(x=>x.itemId));
  for(const id of fallbackAccepted) if(fallbackProduction.has(id)) push(errors,'FALLBACK_STATE_CONTRADICTION',{itemId:id});

  if(authoritativeState){
    for(const row of queue.selected||[]){
      const pendingCandidate=authoritativeState.items?.[row.itemId]?.pendingCandidate||null;
      if(pendingCandidate?.assetHash) push(errors,'REGEN_SELECTED_DESPITE_AUTHORITATIVE_PENDING_CANDIDATE',{itemId:row.itemId,pendingHash:pendingCandidate.assetHash});
    }
    for(const row of queue.pending||[]){
      const pendingCandidate=authoritativeState.items?.[row.itemId]?.pendingCandidate||null;
      const queueHash=row.pendingCandidates?.[0]?.assetHash||row.pendingCandidates?.[0]?.hash||null;
      if(!pendingCandidate?.assetHash || pendingCandidate.assetHash!==queueHash){
        push(errors,'REGEN_PENDING_NOT_BACKED_BY_AUTHORITATIVE_STATE',{itemId:row.itemId,queueHash,authoritativeHash:pendingCandidate?.assetHash||null});
      }
    }
  }

  if(activeBatch){
    if(authoritativeState?.sourceHead && activeBatch.sourceHead && activeBatch.sourceHead!==authoritativeState.sourceHead){
      push(warnings,'STALE_ACTIVE_BATCH_SNAPSHOT',{snapshotHead:activeBatch.sourceHead,authoritativeHead:authoritativeState.sourceHead});
    }
    const batches=activeBatch.batches||[];
    const max=Number(activeBatch.policy?.maxConcurrentProductionBatches??4);
    if(batches.length>max) push(errors,'ACTIVE_BATCH_OVER_CAPACITY',{count:batches.length,max});
    const producers=batches.map(x=>String(x.producer||''));
    if(new Set(producers).size!==producers.length) push(errors,'ACTIVE_BATCH_DUPLICATE_PRODUCER',{producers});
    const scopeOwners=new Map();
    for(const batch of batches){
      if((batch.scope||[]).length>Number(activeBatch.policy?.maxItemsPerBatch??4)) push(errors,'ACTIVE_BATCH_ITEM_OVERFLOW',{batchId:batch.batchId,count:(batch.scope||[]).length});
      for(const itemId of batch.scope||[]){const owners=scopeOwners.get(itemId)||[];owners.push(batch.batchId);scopeOwners.set(itemId,owners);}
    }
    for(const [itemId,owners] of scopeOwners) if(owners.length>1) push(errors,'ACTIVE_BATCH_SCOPE_COLLISION',{itemId,batchIds:owners});
  }

  return {
    schemaVersion:1,
    kind:'STARBLOX_ART_WORKFLOW_AUDIT',
    status:errors.length?'FAIL':'PASS',
    errors,
    warnings,
    summary:{
      storeItems:items.length,
      manifestEntries:Object.keys(manifest.items||{}).length,
      currentReviews:(corpus.current||[]).length,
      currentAcceptedCanonical:currentAcceptedCanonical.length,
      acceptedAwaitingCanonical,
      currentKnownReworkCanonical,
      currentBlockedCanonical,
      regenerationSelected:selected.length,
      regenerationPending:(queue.pending||[]).length,
      regenerationBlocked:(queue.blocked||[]).length,
      fallbackProduction:(fallback.productionQueue||[]).length,
      fallbackAcceptedAwaitingCanonical:(fallback.acceptedAwaitingCanonical||[]).length,
      authoritativeStateSourceHead:authoritativeState?.sourceHead??null,
      authoritativeReleaseBlockers:authoritativeState?.releaseBlockerCount??null,
      activeProductionBatches:activeBatch?.batches?.length??null
    }
  };
}

function parseArgs(argv){const o={};for(let i=0;i<argv.length;i++){const t=argv[i];if(!t.startsWith('--'))continue;const k=t.slice(2),n=argv[i+1];if(n&&!n.startsWith('--')){o[k]=n;i++;}else o[k]=true;}return o;}
function blobMap(root,paths){const out={};for(const rel of uniq(paths.map(normalizeAssetPath).filter(Boolean))){try{out[rel]=execFileSync('git',['rev-parse',`HEAD:${rel}`],{cwd:root,encoding:'utf8'}).trim();}catch{}}return out;}

async function main(){
  const args=parseArgs(process.argv.slice(2)),root=path.resolve(args['repo-root']||'.');
  const {items,manifest,corpus,fallbackBacklog,state}=await loadFactoryState(root);
  const queue=buildRegenerationQueue({corpus,authoritativeState:state,fallbackBacklog});
  const activePath=path.join(root,'docs/preproduction/art-factory/ACTIVE_BATCH.json');
  const activeBatch=fs.existsSync(activePath)?JSON.parse(fs.readFileSync(activePath,'utf8')):null;
  const assetPaths=[
    ...(corpus.current||[]).map(x=>x.assetPath),
    ...Object.values(manifest.items||{}).map(x=>x.assetPath)
  ];
  const report=auditWorkflow({items,manifest,corpus,queue,fallback:fallbackBacklog,authoritativeState:state,activeBatch,blobByPath:blobMap(root,assetPaths)});
  report.sourceHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const body=JSON.stringify(report,null,2)+'\n';
  if(args.output){const dest=path.resolve(args.output);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,body);}else process.stdout.write(body);
  if(report.errors.length) process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.stack||e);process.exit(1)});
