#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {recommend,sha,train,validateExperiment} from './artPromptOptimizer.mjs';

const uniq=values=>[...new Set(values)];

export function recommendFromExplicitBriefs(item,review,model,briefs=[]){
  if(!Array.isArray(briefs)||briefs.length<2||briefs.length>4){
    throw Error(`item ${item?.id||'unknown'} explicit planner briefs must contain 2-4 variants`);
  }
  const upstream=recommend(item,review,model,briefs.length);
  if(!Array.isArray(upstream?.variants)) return upstream;
  if(upstream.variants.length!==briefs.length) throw Error(`item ${item.id} upstream optimizer returned unexpected variant count`);
  const variants=briefs.map((brief,index)=>{
    const input=String(brief?.optimizerInput||brief?.baseBrief||'').trim();
    const variant=String(brief?.variantId||brief?.variant||`BRIEF-${index+1}`).trim();
    if(!input) throw Error(`item ${item.id} ${variant||index+1} missing optimizerInput`);
    if(!variant) throw Error(`item ${item.id} planner brief ${index+1} missing variantId`);
    const inputSha=sha(input);
    if(brief?.optimizerInputSha256&&String(brief.optimizerInputSha256)!==inputSha){
      throw Error(`item ${item.id} ${variant} optimizerInputSha256 mismatch`);
    }
    const base=upstream.variants[index];
    const promptText=[
      base.promptText,
      `Planner variant ID: ${variant}.`,
      `Planner concept brief (preserve this requested physical concept while applying the upstream optimizer quality and repair blocks): ${input}`
    ].join('\n\n');
    return {
      ...base,
      variant,
      promptText,
      promptSha256:sha(promptText),
      optimizerInput:input,
      optimizerInputSha256:inputSha,
      plannerSeed:brief?.seed??null,
      upstreamVariant:base.variant,
      upstreamPromptSha256:base.promptSha256
    };
  });
  if(uniq(variants.map(v=>v.variant)).length!==variants.length) throw Error(`item ${item.id} planner variant IDs must be unique`);
  if(uniq(variants.map(v=>v.promptSha256)).length!==variants.length) throw Error(`item ${item.id} final optimized planner prompts must be distinct`);
  return {...upstream,plannerBriefsPreserved:true,variants};
}

function args(argv){const out={_:[]};for(let i=0;i<argv.length;i++){const token=argv[i];if(token.startsWith('--')){const key=token.slice(2),next=argv[i+1];if(next&&!next.startsWith('--')){out[key]=next;i++;}else out[key]=true;}else out._.push(token);}return out;}
function jsonl(file){return fs.existsSync(file)?fs.readFileSync(file,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(JSON.parse):[];}
function reviewDocs(root){const dir=path.join(root,'docs/preproduction/catalog-sprint/reviews');return fs.readdirSync(dir).filter(x=>/^\d+\.json$/.test(x)).sort().map(name=>({path:path.relative(root,path.join(dir,name)),data:JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'))}));}

async function main(){
  const a=args(process.argv.slice(2));
  const cmd=a._[0]||'compile';
  if(cmd!=='compile') throw Error('command: compile');
  if(!a.request) throw Error('--request required');
  const root=path.resolve(a['repo-root']||'.');
  const requestPath=path.resolve(a.request);
  const requestText=fs.readFileSync(requestPath,'utf8');
  const request=JSON.parse(requestText);
  const producer=String(request.producer||'');
  if(!producer) throw Error('request.producer required');
  const scope=Array.isArray(request.scope)?request.scope:[];
  if(scope.length<1||scope.length>4) throw Error('request.scope must contain 1-4 items');
  const game=await import(pathToFileURL(path.join(root,'src/gameModel.js')).href+`?briefQueue=${Date.now()}`);
  const items=game.store||game.gameModel?.store||[];
  const byId=new Map(items.map(item=>[item.id,item]));
  const ledger=path.join(root,'docs/preproduction/art-prompt-optimizer/attempts.jsonl');
  const experiments=jsonl(ledger);
  for(const e of experiments){const errors=validateExperiment(e);if(errors.length)throw Error(`${e.attemptId}: ${errors.join('; ')}`);}
  const model=train({experiments,reviewDocs:reviewDocs(root)});
  const selected=scope.map(itemId=>{
    const item=byId.get(itemId); if(!item) throw Error(`unknown item ${itemId}`);
    const promptRecommendation=recommendFromExplicitBriefs(item,model.current.get(itemId),model,request.items?.[itemId]?.variants);
    if(!Array.isArray(promptRecommendation?.variants)){
      throw Error(`item ${itemId} is no longer eligible for generation: ${promptRecommendation?.action||promptRecommendation?.decision||'HOLD'}`);
    }
    return {itemId,producer,promptRecommendation};
  });
  const out={
    schemaVersion:1,
    kind:'STARBLOX_ART_FACTORY_OPTIMIZED_QUEUE',
    branch:'screenshot-match-preproduction',
    producer,
    sourceRequest:path.relative(root,requestPath),
    sourceRequestSha256:sha(requestText),
    policy:{upstreamOptimizer:'scripts/artPromptOptimizer.mjs',explicitBriefHashesVerified:true,oldVerdictNeverTransfersAcrossHash:true},
    selected
  };
  const text=JSON.stringify(out,null,2)+'\n';
  if(a.output){const dest=path.resolve(a.output);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,text);}else process.stdout.write(text);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(err=>{console.error(err.stack||err);process.exit(1)});
