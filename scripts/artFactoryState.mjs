#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {buildReviewCorpus} from './artReviewNormalizer.mjs';
import {buildFallbackBacklog} from './catalogFallbackBacklog.mjs';

const TERMINAL_DECISIONS = new Set(['ACCEPT','REWORK','BLOCKED']);
const normalizePath = value => {
  if(!value) return null;
  let p=String(value).replace(/\\/g,'/').trim();
  if(p.startsWith('/assets/')) p='public'+p;
  else p=p.replace(/^\//,'');
  return p;
};
const upper = value => String(value||'').trim().toUpperCase();

export function versionFrom(...values){
  let best=null;
  for(const value of values){
    const text=String(value||'');
    for(const match of text.matchAll(/(?:^|[-_/])v(\d+)(?=[-_/\.\s]|$)/ig)){
      const n=Number(match[1]);
      if(Number.isInteger(n) && (best==null || n>best)) best=n;
    }
  }
  return best;
}

function candidateKey(row){ return `${row.itemId}|${String(row.assetHash||'').toLowerCase()}`; }

export function buildFactoryState({
  items=[],
  manifest={items:{}},
  corpus={observations:[],current:[]},
  stagedCandidates=[],
  sourceHead=null,
  fallbackBacklog=null
}={}){
  const currentByItem=new Map((corpus.current||[]).map(row=>[row.itemId,row]));
  const terminalExact=new Set(
    (corpus.observations||[])
      .filter(row=>row.independent && TERMINAL_DECISIONS.has(upper(row.decision)) && row.itemId && row.assetHash)
      .map(candidateKey)
  );
  const stagedByItem=new Map();
  for(const row of stagedCandidates||[]){
    if(!row?.itemId || !row?.assetHash || row.valid===false) continue;
    if(terminalExact.has(candidateKey(row))) continue;
    const list=stagedByItem.get(row.itemId)||[];
    list.push({...row,version:row.version??versionFrom(row.queueId,row.repositoryPath,row.evidencePath)});
    stagedByItem.set(row.itemId,list);
  }
  for(const list of stagedByItem.values()){
    list.sort((a,b)=>(b.version??-1)-(a.version??-1) || String(b.evidencePath||'').localeCompare(String(a.evidencePath||'')));
  }

  const fallback=fallbackBacklog||buildFallbackBacklog({items,manifest,reviewCorpus:corpus});
  const fallbackByItem=new Map((fallback.allMissing||[]).map(row=>[row.itemId,row]));
  const states={};
  const counts={};
  const releaseBlockers=[];

  for(const item of items){
    const review=currentByItem.get(item.id)||null;
    const reviewVersion=versionFrom(review?.assetPath,review?.sourcePath);
    const candidates=(stagedByItem.get(item.id)||[]).filter(candidate=>{
      if(!review) return true;
      if(candidate.assetHash===review.assetHash) return false;
      if(candidate.version!=null && reviewVersion!=null) return candidate.version>reviewVersion;
      return false;
    });
    const pendingCandidate=candidates[0]||null;
    const canonical=manifest.items?.[item.id]||null;
    const canonicalPath=normalizePath(canonical?.assetPath);
    const reviewPath=normalizePath(review?.assetPath);
    const decision=upper(review?.decision);
    const canonicalStatus=String(canonical?.status||'').toLowerCase();
    let state;
    if(canonicalStatus==='interim-not-verified') state='CANONICAL_INTERIM_NEEDS_LIVE_VERIFICATION';
    else if(pendingCandidate) state='PENDING_EXACT_HASH_REVIEW';
    else if(decision==='REWORK') state='REWORK_NEEDS_PRODUCTION';
    else if(decision==='BLOCKED') state='BLOCKED_NEEDS_EVIDENCE_FIX';
    else if(decision==='ACCEPT' && (!canonicalPath || !reviewPath || canonicalPath!==reviewPath)) state='ACCEPT_AWAITING_CANONICAL';
    else if(decision==='ACCEPT') state=canonicalStatus==='final-portable' ? 'CANONICAL_ACCEPTED' : 'CANONICAL_ACCEPTED_NEEDS_RELEASE_VERIFICATION';
    else if(canonical) state='CANONICAL_PRESENT_UNREVIEWED';
    else state='UNFILLED_NEEDS_PRODUCTION';

    const fallbackRoute=fallbackByItem.get(item.id)?.route||{};
    const route={
      producer:String(pendingCandidate?.producer ?? review?.producer ?? fallbackRoute.producer ?? ''),
      reviewer:String(pendingCandidate?.reviewer ?? review?.reviewer ?? fallbackRoute.reviewer ?? '')
    };
    const releaseBlocking=[
      'PENDING_EXACT_HASH_REVIEW',
      'REWORK_NEEDS_PRODUCTION',
      'BLOCKED_NEEDS_EVIDENCE_FIX',
      'ACCEPT_AWAITING_CANONICAL',
      'CANONICAL_ACCEPTED_NEEDS_RELEASE_VERIFICATION',
      'CANONICAL_INTERIM_NEEDS_LIVE_VERIFICATION',
      'UNFILLED_NEEDS_PRODUCTION'
    ].includes(state);

    states[item.id]={
      itemId:item.id,
      name:item.name,
      collectionId:item.collectionId,
      tier:item.tier,
      theme:item.theme,
      state,
      releaseBlocking,
      canonical:canonical?{assetPath:canonical.assetPath,status:canonical.status||null}:null,
      currentReview:review?{
        decision,
        assetHash:review.assetHash,
        assetPath:review.assetPath||null,
        reviewer:String(review.reviewer||''),
        producer:review.producer==null?null:String(review.producer),
        reviewedAt:review.reviewedAt||null,
        failureCodes:review.failureCodes||[]
      }:null,
      pendingCandidate:pendingCandidate?{
        assetHash:pendingCandidate.assetHash,
        sha256:pendingCandidate.sha256||null,
        repositoryPath:pendingCandidate.repositoryPath||null,
        queueId:pendingCandidate.queueId||null,
        version:pendingCandidate.version??null,
        producer:String(pendingCandidate.producer||''),
        reviewer:String(pendingCandidate.reviewer||''),
        evidencePath:pendingCandidate.evidencePath||null
      }:null,
      route
    };
    counts[state]=(counts[state]||0)+1;
    if(releaseBlocking) releaseBlockers.push(item.id);
  }

  return {
    schemaVersion:1,
    kind:'STARBLOX_ART_FACTORY_AUTHORITATIVE_STATE',
    sourceHead,
    policy:{
      authority:'DERIVED_EXACT_STATE',
      authoritativeInputs:[
        'src/gameModel.js',
        'catalog-art-manifest.json',
        'docs/preproduction/catalog-sprint/reviews/*.json',
        'docs/preproduction/art-factory/generated-evidence/**/staged-output.json'
      ],
      nonAuthoritativeSnapshots:[
        'docs/preproduction/catalog-sprint/lane-*.json',
        'docs/preproduction/art-factory/ACTIVE_BATCH.json',
        'docs/preproduction/art-factory/RELEASE_BLOCKERS_CURRENT.json'
      ],
      staleLaneCandidateCannotSuppressRegeneration:true,
      canonicalInterimReleaseGateOverridesAlternateCandidateReview:true,
      exactHashTerminalReviewWinsOverStagedEvidence:true,
      automaticApproval:false
    },
    counts,
    releaseBlockerCount:releaseBlockers.length,
    releaseBlockerIds:releaseBlockers.sort(),
    items:states
  };
}

export function collectStagedCandidates(root){
  const base=path.join(root,'docs/preproduction/art-factory/generated-evidence');
  if(!fs.existsSync(base)) return [];
  const files=[];
  const walk=dir=>{
    for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
      const p=path.join(dir,ent.name);
      if(ent.isDirectory()) walk(p);
      else if(ent.isFile() && ent.name==='staged-output.json') files.push(p);
    }
  };
  walk(base);
  const out=[];
  for(const file of files.sort()){
    let data;
    try{ data=JSON.parse(fs.readFileSync(file,'utf8')); }catch{ continue; }
    if(data?.kind!=='STARBLOX_ART_FACTORY_STAGED_OUTPUT' || data?.status!=='STAGED_EXACT_BYTES_VERIFIED') continue;
    const itemId=data?.item?.id;
    const repositoryPath=normalizePath(data?.output?.repoPath);
    const assetHash=String(data?.output?.gitBlobSha||'');
    if(!itemId || !repositoryPath || !assetHash) continue;
    let actualBlobSha=null;
    try{ actualBlobSha=execFileSync('git',['rev-parse',`HEAD:${repositoryPath}`],{cwd:root,encoding:'utf8'}).trim(); }catch{}
    const queueId=data?.review?.routing?.queueId||null;
    out.push({
      itemId,
      assetHash,
      sha256:data?.output?.sha256||null,
      repositoryPath,
      queueId,
      version:versionFrom(queueId,repositoryPath),
      producer:String(data?.attempt?.producer||''),
      reviewer:String(data?.review?.reviewer||''),
      evidencePath:path.relative(root,file).replace(/\\/g,'/'),
      valid:Boolean(actualBlobSha && actualBlobSha===assetHash),
      actualBlobSha
    });
  }
  return out;
}

function reviewDocs(root){
  const dir=path.join(root,'docs/preproduction/catalog-sprint/reviews');
  return fs.readdirSync(dir).filter(name=>/^\d+\.json$/.test(name)).sort().map(name=>({
    path:path.relative(root,path.join(dir,name)),
    data:JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'))
  }));
}

export async function loadFactoryState(root){
  const game=await import(pathToFileURL(path.join(root,'src/gameModel.js')).href+`?factoryState=${Date.now()}`);
  const items=game.store||game.gameModel?.store||[];
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'catalog-art-manifest.json'),'utf8'));
  const corpus=buildReviewCorpus({docs:reviewDocs(root),items});
  if(corpus.conflicts.length) throw new Error(`review decision conflicts detected: ${JSON.stringify(corpus.conflicts)}`);
  const fallbackBacklog=buildFallbackBacklog({items,manifest,reviewCorpus:corpus});
  const sourceHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const state=buildFactoryState({
    items,manifest,corpus,
    stagedCandidates:collectStagedCandidates(root),
    sourceHead,
    fallbackBacklog
  });
  return {items,manifest,corpus,fallbackBacklog,state};
}

function parseArgs(argv){
  const out={};
  for(let i=0;i<argv.length;i++){
    const t=argv[i];
    if(!t.startsWith('--')) continue;
    const k=t.slice(2),n=argv[i+1];
    if(n&&!n.startsWith('--')){out[k]=n;i++;}else out[k]=true;
  }
  return out;
}

async function main(){
  const args=parseArgs(process.argv.slice(2));
  const root=path.resolve(args['repo-root']||'.');
  const {state}=await loadFactoryState(root);
  const body=JSON.stringify(state,null,2)+'\n';
  if(args.output){
    const dest=path.resolve(args.output);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,body);
  }else process.stdout.write(body);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error(error.stack||error);process.exit(1)});
}
