#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildReviewCorpus} from './artReviewNormalizer.mjs';

export const RELEASE_ROUTES=Object.freeze({
  desks:{producer:'03',reviewer:'05'},
  wall:{producer:'13',reviewer:'14'},
  decor:{producer:'09',reviewer:'14'}
});

export function buildFallbackBacklog({items=[],manifest={items:{}},reviewCorpus=null}={}){
  const mapped=new Set(Object.keys(manifest.items||{}));
  const currentByItem=new Map((reviewCorpus?.current||[]).map(row=>[row.itemId,row]));
  const missing=items.filter(item=>!mapped.has(item.id)).map(item=>{
    const review=currentByItem.get(item.id)||null;
    const decision=String(review?.decision||'').toUpperCase();
    let state='UNFILLED_NEEDS_PRODUCTION';
    if(decision==='ACCEPT') state='ACCEPT_AWAITING_CANONICAL';
    else if(decision==='REWORK') state='REWORK_NEEDS_PRODUCTION';
    else if(decision==='BLOCKED') state='BLOCKED_NEEDS_EVIDENCE_FIX';
    const route=RELEASE_ROUTES[item.collectionId]||{producer:null,reviewer:null};
    return {
      itemId:item.id,
      name:item.name,
      collectionId:item.collectionId,
      tier:item.tier,
      theme:item.theme,
      state,
      currentReview:review?{
        assetHash:review.assetHash,
        assetPath:review.assetPath,
        decision:review.decision,
        reviewer:review.reviewer,
        producer:review.producer,
        failureCodes:review.failureCodes||[],
        sourcePath:review.sourcePath
      }:null,
      route
    };
  });

  const byState={};
  const byCollection={};
  for(const row of missing){
    byState[row.state]=(byState[row.state]||0)+1;
    byCollection[row.collectionId]=(byCollection[row.collectionId]||0)+1;
  }
  const production=missing.filter(x=>['UNFILLED_NEEDS_PRODUCTION','REWORK_NEEDS_PRODUCTION'].includes(x.state));
  const accepted=missing.filter(x=>x.state==='ACCEPT_AWAITING_CANONICAL');
  const blocked=missing.filter(x=>x.state==='BLOCKED_NEEDS_EVIDENCE_FIX');

  return {
    schemaVersion:1,
    kind:'STARBLOX_CATALOG_FALLBACK_BACKLOG',
    policy:{
      missingCanonicalArtIsReleaseBlocking:true,
      doNotMapKnownReworkJustToHideFallback:true,
      exactHashReviewStillRequired:true,
      canonicalWriter:'08',
      automaticApproval:false
    },
    targetCount:items.length,
    canonicalMappedCount:mapped.size,
    fallbackCount:missing.length,
    releaseBlocked:missing.length>0,
    summary:{
      byState,
      byCollection,
      productionCount:production.length,
      acceptedAwaitingCanonicalCount:accepted.length,
      blockedEvidenceCount:blocked.length
    },
    productionQueue:production,
    acceptedAwaitingCanonical:accepted,
    blockedEvidence:blocked,
    allMissing:missing
  };
}

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i++){
    const token=argv[i];
    if(!token.startsWith('--')) continue;
    const key=token.slice(2),next=argv[i+1];
    if(next&&!next.startsWith('--')){out[key]=next;i++;}else out[key]=true;
  }
  return out;
}

async function loadReviewCorpus(root,items){
  const reviewDir=path.join(root,'docs/preproduction/catalog-sprint/reviews');
  const docs=fs.readdirSync(reviewDir)
    .filter(name=>/^\d+\.json$/.test(name))
    .sort()
    .map(name=>({
      path:path.relative(root,path.join(reviewDir,name)),
      data:JSON.parse(fs.readFileSync(path.join(reviewDir,name),'utf8'))
    }));
  return buildReviewCorpus({docs,items});
}

async function main(){
  const args=parseArgs(process.argv.slice(2));
  const root=path.resolve(args['repo-root']||'.');
  const game=await import(pathToFileURL(path.join(root,'src/gameModel.js')).href+'?fallbackBacklog='+Date.now());
  const items=game.store||game.gameModel?.store||[];
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'catalog-art-manifest.json'),'utf8'));
  const reviewCorpus=await loadReviewCorpus(root,items);
  const report=buildFallbackBacklog({items,manifest,reviewCorpus});

  if(args['expect-count']!=null){
    const expected=Number(args['expect-count']);
    if(report.fallbackCount!==expected) throw new Error('fallback count '+report.fallbackCount+' != expected '+expected);
  }
  const body=JSON.stringify(report,null,2)+'\n';
  if(args.output){
    const dest=path.resolve(args.output);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,body);
  }else process.stdout.write(body);

  if(args['fail-on-fallback'] && report.fallbackCount>0) process.exitCode=2;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error(error.stack||error);process.exit(1)});
}
