#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {recommend,sha,train} from './artPromptOptimizer.mjs';

export const FACTORY_BRANCH='screenshot-match-preproduction';
export const RIGHTS_BASIS='USER_ATTESTED_FULL_RIGHTS';
export const DEFAULT_RUNTIME={
  repo:'huggingface/diffusers',
  commit:'7263f3317f6b392d62f41e9d75ed9d7e21fc5a5c'
};

const uniq=a=>[...new Set(a)];

export function deriveSeed(itemId,promptSha256,variant){
  const h=crypto.createHash('sha256').update(`${itemId}|${promptSha256}|${variant}`).digest();
  return 1+(h.readUInt32BE(0)%2147483646);
}

export function buildJobPlan({
  item,recommendation,producer,sourceHead,modelId,modelRevision,
  runtime=DEFAULT_RUNTIME,referenceAssetSha256=null,controlImageSha256=null,
  adapterScale=null,promptRecipeVersion='artPromptOptimizer-v1'
}){
  if(!item?.id) throw Error('item.id required');
  if(!producer) throw Error('producer required');
  if(!sourceHead) throw Error('sourceHead required');
  if(!modelId||!modelRevision) throw Error('exact modelId and modelRevision required');
  if(!Array.isArray(recommendation?.variants)||recommendation.variants.length<2||recommendation.variants.length>4){
    throw Error(`item ${item.id} is not eligible for bounded generation; expected 2-4 prompt variants`);
  }
  const attempts=recommendation.variants.map(v=>{
    const seed=deriveSeed(item.id,v.promptSha256,v.variant);
    const attemptId=`${item.id}-w${producer}-${v.variant.toLowerCase()}-${v.promptSha256.slice(0,10)}`;
    return {
      attemptId,itemId:item.id,producer:String(producer),variant:v.variant,
      promptBlocks:v.promptBlocks,promptText:v.promptText,promptSha256:v.promptSha256,
      promptRecipeVersion,seed,
      runtime:{repo:runtime.repo,commit:runtime.commit},
      model:{modelId,revision:modelRevision,rightsBasis:RIGHTS_BASIS},
      conditioning:{referenceAssetSha256,controlImageSha256,adapterScale},
      output:{repoPath:null,sha256:null,gitBlobSha:null,bytes:null,width:null,height:null},
      status:'PLANNED_NOT_GENERATED'
    };
  });
  const plan={
    schemaVersion:1,kind:'STARBLOX_ART_FACTORY_JOB',
    repository:'P00NSMASHER/StarBlox',branch:FACTORY_BRANCH,sourceHead,
    item:{id:item.id,name:item.name,collectionId:item.collectionId,type:item.type,tier:item.tier,theme:item.theme},
    sourceReviewHash:recommendation.sourceReviewHash??null,
    rightsBasis:RIGHTS_BASIS,
    attempts
  };
  plan.planSha256=sha(JSON.stringify(plan));
  return plan;
}

export function validateJobPlan(plan){
  const errors=[];
  if(plan?.kind!=='STARBLOX_ART_FACTORY_JOB') errors.push('wrong kind');
  if(plan?.branch!==FACTORY_BRANCH) errors.push(`branch must be ${FACTORY_BRANCH}`);
  if(!plan?.sourceHead) errors.push('sourceHead missing');
  if(plan?.rightsBasis!==RIGHTS_BASIS) errors.push('rightsBasis mismatch');
  const attempts=Array.isArray(plan?.attempts)?plan.attempts:[];
  if(attempts.length<2||attempts.length>4) errors.push('attempts must contain 2-4 variants');
  const ids=[],seeds=[],prompts=[];
  for(const a of attempts){
    if(!a.attemptId) errors.push('attemptId missing'); else ids.push(a.attemptId);
    if(!a.promptText||!a.promptSha256||sha(a.promptText)!==a.promptSha256) errors.push(`${a.attemptId||'attempt'} prompt hash mismatch`);
    const expected=deriveSeed(plan?.item?.id,a.promptSha256,a.variant);
    if(a.seed!==expected) errors.push(`${a.attemptId||'attempt'} deterministic seed mismatch`);
    seeds.push(a.seed); prompts.push(a.promptSha256);
    if(a?.model?.rightsBasis!==RIGHTS_BASIS) errors.push(`${a.attemptId||'attempt'} model rights basis mismatch`);
    if(!a?.model?.modelId||!a?.model?.revision) errors.push(`${a.attemptId||'attempt'} exact model identity/revision missing`);
    if(!a?.runtime?.repo||!a?.runtime?.commit) errors.push(`${a.attemptId||'attempt'} runtime repo/commit missing`);
    if(a.status!=='PLANNED_NOT_GENERATED') errors.push(`${a.attemptId||'attempt'} planner may only emit PLANNED_NOT_GENERATED`);
  }
  if(uniq(ids).length!==ids.length) errors.push('attemptIds must be unique');
  if(uniq(seeds).length!==seeds.length) errors.push('seeds must be unique');
  if(uniq(prompts).length!==prompts.length) errors.push('prompt variants must be distinct');
  if(plan?.planSha256){
    const copy={...plan}; delete copy.planSha256;
    if(sha(JSON.stringify(copy))!==plan.planSha256) errors.push('planSha256 mismatch');
  }
  return errors;
}

function parseArgs(argv){const o={_:[]};for(let i=0;i<argv.length;i++){const x=argv[i];if(x.startsWith('--')){const k=x.slice(2),n=argv[i+1];if(n&&!n.startsWith('--')){o[k]=n;i++}else o[k]=true}else o._.push(x)}return o}
function reviewDocs(root){
  const dir=path.join(root,'docs/preproduction/catalog-sprint/reviews');
  if(!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(x=>/^\\d+\\.json$/.test(x)).sort().map(n=>({path:path.relative(root,path.join(dir,n)),data:JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'))}));
}
function head(root){return execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()}

export function buildBatchPlans({
  queue,items,producer,sourceHead,modelId,modelRevision,
  runtime=DEFAULT_RUNTIME,referenceAssetSha256=null,controlImageSha256=null,adapterScale=null
}){
  if(!queue?.selected||!Array.isArray(queue.selected)) throw Error('queue.selected required');
  const byId=new Map(items.map(item=>[item.id,item]));
  const selected=queue.selected.filter(row=>String(row.producer)===String(producer));
  if(!selected.length) throw Error(`no selected queue items for producer ${producer}`);
  if(selected.length>4) throw Error('producer batch exceeds 4 items');
  const plans=selected.map(row=>{
    const item=byId.get(row.itemId);
    if(!item) throw Error(`unknown item ${row.itemId}`);
    const recommendation=row.promptRecommendation;
    if(!Array.isArray(recommendation?.variants)) throw Error(`queue item ${row.itemId} missing promptRecommendation variants`);
    return buildJobPlan({
      item,recommendation,producer:String(producer),sourceHead,modelId,modelRevision,runtime,
      referenceAssetSha256,controlImageSha256,adapterScale
    });
  });
  const index={
    schemaVersion:1,
    kind:'STARBLOX_ART_FACTORY_BATCH_PLAN',
    repository:'P00NSMASHER/StarBlox',
    branch:FACTORY_BRANCH,
    sourceHead,
    producer:String(producer),
    model:{modelId,revision:modelRevision,rightsBasis:RIGHTS_BASIS},
    runtime:{repo:runtime.repo,commit:runtime.commit},
    itemCount:plans.length,
    jobs:plans.map(plan=>({itemId:plan.item.id,sourceReviewHash:plan.sourceReviewHash,planSha256:plan.planSha256,attempts:plan.attempts.length}))
  };
  index.batchSha256=sha(JSON.stringify(index));
  return {index,plans};
}

async function main(){
  const a=parseArgs(process.argv.slice(2)),cmd=a._[0]||'validate',root=path.resolve(a['repo-root']||'.');
  if(cmd==='validate'){
    if(!a.job) throw Error('--job required');
    const plan=JSON.parse(fs.readFileSync(path.resolve(a.job),'utf8')),errors=validateJobPlan(plan);
    if(errors.length) throw Error(errors.join('; '));
    console.log(JSON.stringify({valid:true,itemId:plan.item.id,attempts:plan.attempts.length,planSha256:plan.planSha256},null,2));
    return;
  }
  if(!['plan','plan-batch'].includes(cmd)) throw Error('commands: plan | plan-batch | validate');
  for(const k of ['producer','model-id','model-revision']) if(!a[k]) throw Error(`--${k} required`);
  const mod=await import(pathToFileURL(path.join(root,'src/gameModel.js')).href+`?t=${Date.now()}`);
  const items=mod.store||mod.gameModel?.store||[];

  if(cmd==='plan-batch'){
    if(!a.queue) throw Error('--queue required');
    if(!a['output-dir']) throw Error('--output-dir required');
    const queue=JSON.parse(fs.readFileSync(path.resolve(a.queue),'utf8'));
    const batch=buildBatchPlans({
      queue,items,producer:a.producer,sourceHead:head(root),
      modelId:a['model-id'],modelRevision:a['model-revision'],
      runtime:{repo:a['runtime-repo']||DEFAULT_RUNTIME.repo,commit:a['runtime-commit']||DEFAULT_RUNTIME.commit},
      referenceAssetSha256:a['reference-sha256']||null,
      controlImageSha256:a['control-sha256']||null,
      adapterScale:a['adapter-scale']===undefined?null:Number(a['adapter-scale'])
    });
    const outDir=path.resolve(a['output-dir']);
    fs.mkdirSync(outDir,{recursive:true});
    for(const plan of batch.plans){
      const errors=validateJobPlan(plan); if(errors.length) throw Error(`${plan.item.id}: ${errors.join('; ')}`);
      fs.writeFileSync(path.join(outDir,`${plan.item.id}.json`),JSON.stringify(plan,null,2)+'\n');
    }
    fs.writeFileSync(path.join(outDir,'batch-index.json'),JSON.stringify(batch.index,null,2)+'\n');
    console.log(JSON.stringify({planned:true,producer:String(a.producer),itemCount:batch.plans.length,batchSha256:batch.index.batchSha256,outputDir:outDir},null,2));
    return;
  }

  if(!a.item) throw Error('--item required');
  const item=items.find(x=>x.id===a.item);
  if(!item) throw Error(`unknown item ${a.item}`);
  const model=train({reviewDocs:reviewDocs(root)});
  const rec=recommend(item,model.current.get(item.id),model,a.variants||4);
  const plan=buildJobPlan({
    item,recommendation:rec,producer:a.producer,sourceHead:head(root),
    modelId:a['model-id'],modelRevision:a['model-revision'],
    runtime:{repo:a['runtime-repo']||DEFAULT_RUNTIME.repo,commit:a['runtime-commit']||DEFAULT_RUNTIME.commit},
    referenceAssetSha256:a['reference-sha256']||null,
    controlImageSha256:a['control-sha256']||null,
    adapterScale:a['adapter-scale']===undefined?null:Number(a['adapter-scale'])
  });
  const errors=validateJobPlan(plan); if(errors.length) throw Error(errors.join('; '));
  const out=JSON.stringify(plan,null,2)+'\n';
  if(a.output){const dest=path.resolve(a.output);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,out)}
  else process.stdout.write(out);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.stack||e);process.exit(1)});
