#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const SHA1=/^[0-9a-f]{40}$/i;
const SHA256=/^[0-9a-f]{64}$/i;

export function buildStagedHandoff({
  queue,
  stagedOutputs,
  stagedCommitSha,
  generationSourceSha,
  workflowRunId=null,
  blobAtPath={}
}={}){
  if(!queue || queue.kind!=='STARBLOX_ART_FACTORY_CPU_GENERATION_QUEUE') throw new Error('invalid generation queue');
  if(!SHA1.test(String(stagedCommitSha||''))) throw new Error('immutable staged commit SHA required');
  if(!SHA1.test(String(generationSourceSha||''))) throw new Error('generation source SHA required');
  const items=queue.items||[];
  if(!items.length || new Set(items).size!==items.length) throw new Error('queue items invalid');

  const byItem=new Map();
  for(const row of stagedOutputs||[]){
    const itemId=row?.item?.id;
    if(!itemId) continue;
    if(byItem.has(itemId)) throw new Error(`duplicate staged output for ${itemId}`);
    byItem.set(itemId,row);
  }

  const exactItems=items.map(itemId=>{
    const staged=byItem.get(itemId);
    if(!staged) throw new Error(`missing staged output for ${itemId}`);
    if(staged.kind!=='STARBLOX_ART_FACTORY_STAGED_OUTPUT') throw new Error(`${itemId}: wrong staged output kind`);
    if(staged.status!=='STAGED_EXACT_BYTES_VERIFIED') throw new Error(`${itemId}: staged output not exact-verified`);
    const repoPath=String(staged.output?.repoPath||'');
    const blobSha=String(staged.output?.gitBlobSha||'').toLowerCase();
    const sha256=String(staged.output?.sha256||'').toLowerCase();
    if(!repoPath || !SHA1.test(blobSha) || !SHA256.test(sha256)) throw new Error(`${itemId}: invalid output hashes`);
    const actual=String(blobAtPath[repoPath]||'').toLowerCase();
    if(actual!==blobSha) throw new Error(`${itemId}: immutable commit blob mismatch for ${repoPath}`);
    const reviewer=String(staged.review?.reviewer||'');
    const expectedReviewer=String(queue.reviewerByItem?.[itemId]||'');
    if(!reviewer || reviewer!==expectedReviewer) throw new Error(`${itemId}: reviewer route mismatch`);
    return {
      itemId,
      repositoryPath:repoPath,
      gitBlobSha:blobSha,
      sha256,
      reviewer,
      producer:String(staged.attempt?.producer||queue.producer||''),
      queueId:String(staged.review?.routing?.queueId||queue.queueId||'')
    };
  });

  return {
    schemaVersion:1,
    kind:'STARBLOX_ART_FACTORY_STAGED_HANDOFF',
    branch:String(queue.branch||''),
    queueId:String(queue.queueId||''),
    generationSourceSha:String(generationSourceSha).toLowerCase(),
    stagedCommitSha:String(stagedCommitSha).toLowerCase(),
    workflowRunId:workflowRunId==null?null:String(workflowRunId),
    policy:{
      stagedCommitImmutable:true,
      exactCandidateBlobBoundToCommit:true,
      downstreamQaMustUseStagedCommitSha:true,
      automaticApproval:false
    },
    items:exactItems
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

function collectStaged(root,items){
  const wanted=new Set(items);
  const found=[];
  const walk=dir=>{
    if(!fs.existsSync(dir)) return;
    for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
      const p=path.join(dir,ent.name);
      if(ent.isDirectory()) walk(p);
      else if(ent.isFile()&&ent.name==='staged-output.json'){
        const data=JSON.parse(fs.readFileSync(p,'utf8'));
        if(wanted.has(data?.item?.id)) found.push(data);
      }
    }
  };
  walk(root);
  return found;
}

function blobMapAtCommit(repoRoot,commit,stagedOutputs){
  const out={};
  for(const row of stagedOutputs){
    const repoPath=String(row?.output?.repoPath||'');
    if(!repoPath) continue;
    out[repoPath]=execFileSync('git',['rev-parse',`${commit}:${repoPath}`],{cwd:repoRoot,encoding:'utf8'}).trim();
  }
  return out;
}

async function main(){
  const [command,...rest]=process.argv.slice(2);
  if(command!=='create') throw new Error('usage: artFactoryStagedHandoff.mjs create --queue FILE --staged-root DIR --staged-commit SHA --generation-source SHA --output FILE');
  const args=parseArgs(rest);
  const repoRoot=path.resolve(args['repo-root']||'.');
  const queuePath=path.resolve(repoRoot,args.queue);
  const stagedRoot=path.resolve(repoRoot,args['staged-root']);
  const output=path.resolve(repoRoot,args.output);
  const queue=JSON.parse(fs.readFileSync(queuePath,'utf8'));
  const stagedOutputs=collectStaged(stagedRoot,queue.items||[]);
  const stagedCommitSha=String(args['staged-commit']||'');
  const handoff=buildStagedHandoff({
    queue,
    stagedOutputs,
    stagedCommitSha,
    generationSourceSha:String(args['generation-source']||''),
    workflowRunId:args['workflow-run']||null,
    blobAtPath:blobMapAtCommit(repoRoot,stagedCommitSha,stagedOutputs)
  });
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(handoff,null,2)+'\n');
  process.stdout.write(JSON.stringify({stagedCommitSha:handoff.stagedCommitSha,itemCount:handoff.items.length})+'\n');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main().catch(error=>{console.error(error.stack||error);process.exit(1)});
}
