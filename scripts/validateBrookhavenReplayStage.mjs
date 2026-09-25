import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const manifestPath='docs/preproduction/brookhaven-research/step-11-replay-manifest-v2.json';
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const issues=[];

const requiredGroup1=[
  'docs/preproduction/brookhaven-research/snapshot-v1.json',
  'docs/preproduction/brookhaven-research/asset-graph-v1.json',
  'docs/preproduction/brookhaven-research/resolved-catalogs-v1.json',
  'docs/preproduction/brookhaven-research/reuse-boundary-v1.json',
  'docs/preproduction/brookhaven-research/rights-status-v1.json',
  'docs/preproduction/brookhaven-research/conversion-contract-v1.json',
  'docs/preproduction/brookhaven-research/step-08-vehicle-completion-v2.json',
  'docs/preproduction/brookhaven-research/step-09-town-completion-v2.json',
  'docs/preproduction/brookhaven-research/step-10-progression-completion-v2.json',
  'docs/preproduction/brookhaven-research/step-11-replay-manifest-v2.json',
  'docs/preproduction/brookhaven-research/step-11-reconciliation-readiness-v2.json',
  'docs/preproduction/brookhaven-research/step-12-finalization-v2.json',
  'docs/preproduction/brookhaven-research/program-completion-v1.json',
  'scripts/assertBrookhavenReuseBoundary.mjs',
  'scripts/assertBrookhavenLearningSeparation.mjs',
  'scripts/convertBrookhavenNeutralScene.mjs',
  'scripts/validateBrookhavenProxyVerticalSlice.mjs',
  'scripts/validateBrookhavenResearchArtifacts.mjs',
  'scripts/validateBrookhavenReplayStage.mjs',
  '.github/workflows/brookhaven-research-boundary.yml'
];

for(const path of requiredGroup1){
  if(!fs.existsSync(path)) issues.push('group1-missing:'+path);
}

const replayGroups=manifest.orderedReplayGroups||[];
if(replayGroups.length!==6) issues.push('manifest-group-count');
for(let index=0;index<replayGroups.length;index+=1){
  if(replayGroups[index]?.order!==index+1) issues.push('manifest-group-order:'+(index+1));
}

function fileGroup(id){
  const group=replayGroups.find(row=>row.id===id);
  return (group?.include||[]).filter(path=>path.startsWith('src/'));
}

function presence(paths){
  const present=paths.filter(path=>fs.existsSync(path));
  return {
    total:paths.length,
    present,
    missing:paths.filter(path=>!fs.existsSync(path)),
    complete:paths.length>0&&present.length===paths.length,
    absent:present.length===0,
    partial:present.length>0&&present.length<paths.length
  };
}

const group2=presence(fileGroup('residential-neutral-runtime'));
const group3=presence(fileGroup('hardened-vehicle-layer'));
const group4=presence(fileGroup('hardened-town-layer'));
const group5=presence(fileGroup('hardened-progression-shadow'));

for(const [number,state] of [[2,group2],[3,group3],[4,group4],[5,group5]]){
  if(state.partial) issues.push('partial-replay-group:'+number);
}
if(group3.complete&&!group2.complete) issues.push('replay-order:3-before-2');
if(group4.complete&&(!group2.complete||!group3.complete)) issues.push('replay-order:4-before-prerequisites');
if(group5.complete&&(!group2.complete||!group3.complete||!group4.complete)) issues.push('replay-order:5-before-prerequisites');

const packageJson=JSON.parse(fs.readFileSync('package.json','utf8'));
const requiredScripts=[
  'validate:brookhaven-research',
  'test:brookhaven-residential',
  'test:brookhaven-step-8-10',
  'assert:brookhaven-learning-separation'
];
const presentScripts=requiredScripts.filter(name=>typeof packageJson.scripts?.[name]==='string');
const group6={
  total:requiredScripts.length,
  present:presentScripts,
  missing:requiredScripts.filter(name=>!presentScripts.includes(name)),
  complete:presentScripts.length===requiredScripts.length,
  absent:presentScripts.length===0,
  partial:presentScripts.length>0&&presentScripts.length<requiredScripts.length
};
if(group6.partial) issues.push('partial-replay-group:6');
if(group6.complete&&(!group2.complete||!group3.complete||!group4.complete||!group5.complete)){
  issues.push('replay-order:6-before-prerequisites');
}

let replayStage=1;
if(group2.complete) replayStage=2;
if(group3.complete) replayStage=3;
if(group4.complete) replayStage=4;
if(group5.complete) replayStage=5;
if(group6.complete) replayStage=6;

const productRef=process.env.BROOKHAVEN_REPLAY_PRODUCT_REF||'origin/screenshot-match-preproduction';
let mergeBase='';
let changedFiles=[];
try{
  mergeBase=execFileSync('git',['merge-base','HEAD',productRef],{encoding:'utf8'}).trim();
  changedFiles=execFileSync('git',['diff','--name-only',mergeBase+'..HEAD'],{encoding:'utf8'})
    .trim()
    .split('\n')
    .filter(Boolean);
}catch(error){
  issues.push('git-diff-unavailable');
}

const group1Exact=new Set([
  'scripts/assertBrookhavenReuseBoundary.mjs',
  'scripts/assertBrookhavenLearningSeparation.mjs',
  'scripts/convertBrookhavenNeutralScene.mjs',
  'scripts/validateBrookhavenProxyVerticalSlice.mjs',
  'scripts/validateBrookhavenResearchArtifacts.mjs',
  'scripts/validateBrookhavenReplayStage.mjs',
  '.github/workflows/brookhaven-research-boundary.yml'
]);
const allowed=new Set();
for(const path of changedFiles){
  if(path.startsWith('docs/preproduction/brookhaven-research/')||group1Exact.has(path)){
    allowed.add(path);
  }
}
if(replayStage>=2) for(const path of fileGroup('residential-neutral-runtime')) allowed.add(path);
if(replayStage>=3) for(const path of fileGroup('hardened-vehicle-layer')) allowed.add(path);
if(replayStage>=4) for(const path of fileGroup('hardened-town-layer')) allowed.add(path);
if(replayStage>=5) for(const path of fileGroup('hardened-progression-shadow')) allowed.add(path);
if(replayStage>=6) allowed.add('package.json');

const unexpectedChangedFiles=changedFiles.filter(path=>!allowed.has(path));
for(const path of unexpectedChangedFiles) issues.push('unexpected-changed-file:'+path);

const protectedLiveFiles=['src/App.jsx','src/main.jsx','src/gameModel.js','src/storage.js'];
const protectedLiveFileChanges=changedFiles.filter(path=>protectedLiveFiles.includes(path));
for(const path of protectedLiveFileChanges) issues.push('protected-live-file-change:'+path);

if(changedFiles.includes('scripts/buildBrookhavenResearchWithKnownBaseFix.mjs')){
  issues.push('temporary-build-workaround-replayed');
}

const result={
  schemaVersion:'starblox-brookhaven-replay-stage-validation-v1',
  manifestPath,
  productRef,
  mergeBase,
  replayStage,
  groups:{
    1:{complete:requiredGroup1.every(path=>fs.existsSync(path)),requiredFileCount:requiredGroup1.length},
    2:group2,
    3:group3,
    4:group4,
    5:group5,
    6:group6
  },
  changedFileCount:changedFiles.length,
  unexpectedChangedFiles,
  protectedLiveFileChanges,
  fullResearchValidationEligible:group2.complete&&group3.complete&&group4.complete&&group5.complete,
  issueCount:issues.length,
  issues
};

process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(issues.length) process.exitCode=1;
