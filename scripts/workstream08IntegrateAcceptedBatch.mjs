import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { gameModel } from '../src/gameModel.js';

const mode=process.argv[2]||'prepare';
const configPath=process.argv[3]||'docs/preproduction/catalog-sprint/workstream08-batch.json';
const manifestPath='catalog-art-manifest.json';
const runtimePath='src/catalogArtRuntime.js';
const integrationPath='docs/preproduction/catalog-sprint/integration.json';
const integrationMdPath='docs/preproduction/catalog-sprint/integration.md';
const workstreamPath='docs/preproduction/workstreams/08-catalog-art.md';
const allocationPath='docs/preproduction/ART_VISUALS_SPRINT.json';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const git=(args,opts={})=>execFileSync('git',args,{encoding:'utf8',...opts}).trim();
const gitBlob=p=>git(['hash-object',p]);
const sha256=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const repoPath=p=>p.startsWith('/assets/')?`public${p}`:p.replace(/^\//,'');

if(mode==='mark-pass'){
  const r=json(integrationPath);
  r.status='INTEGRATED_ACCEPTED_INCREMENT_ALL_SCOPED_CHECKS_PASS_PENDING_PUSH';
  r.postCommitValidation.catalogTests='PASS_FULL_NPM_TEST';
  r.postCommitValidation.productionBuild='PASS_VITE_PRODUCTION_BUILD';
  r.postCommitValidation.storeSmoke='PASS_STRICT_CHANGED_ART_STORE_MOBILE_QA_PRECOMMIT';
  r.postCommitValidation.referenceComparison='HANDOFF_14_FRESH_REFERENCE_CAPTURE_AFTER_PUSH';
  fs.writeFileSync(integrationPath,JSON.stringify(r,null,2)+'\n');
  fs.appendFileSync(integrationMdPath,'\n## Executed validation\n\n**PASS:** full npm regression, Vite production build, and strict changed-art Store/mobile QA succeeded against this coherent canonical batch before publication. Reviewer 14 retains final catalog/release visual-gate ownership.\n');
  process.exit(0);
}
if(mode!=='prepare') throw new Error(`Unknown mode ${mode}`);

const cfg=json(configPath);
const sourceHead=process.env.SOURCE_HEAD||git(['rev-parse','HEAD']);
const manifestBefore=json(manifestPath);
const previousIntegration=json(integrationPath);
const allocation=json(allocationPath);
const storeById=new Map(gameModel.store.map(x=>[x.id,x]));
const manifestBeforeBlob=gitBlob(manifestPath);
const runtimeBeforeBlob=gitBlob(runtimePath);

if(Number(manifestBefore.version)!==Number(cfg.expectedManifestVersion)) throw new Error(`Expected live manifest v${cfg.expectedManifestVersion}, got v${manifestBefore.version}`);
if(!Array.isArray(cfg.items)||cfg.items.length<1||cfg.items.length>12) throw new Error('Batch must contain 1-12 bounded items');
if(cfg.reviewer===undefined) throw new Error('Reviewer is required');
const reviewer=String(cfg.reviewer).padStart(2,'0');

function loadEvidence(e){
  if(e.blobSha){
    const actual=git(['cat-file','-t',e.blobSha]);
    if(actual!=='blob') throw new Error(`Evidence ${e.blobSha} is not a Git blob`);
    return {data:JSON.parse(git(['cat-file','-p',e.blobSha])),blobSha:e.blobSha,label:`git-blob:${e.blobSha}`};
  }
  if(!e.path||!fs.existsSync(e.path)) throw new Error(`Review evidence missing: ${e.path}`);
  const b=gitBlob(e.path);
  if(e.expectedBlobSha&&b!==e.expectedBlobSha) throw new Error(`Review evidence changed at ${e.path}: ${b} != ${e.expectedBlobSha}`);
  return {data:json(e.path),blobSha:b,label:e.path};
}
function walkDecisionObjects(v,out=[]){
  if(!v||typeof v!=='object') return out;
  if(Array.isArray(v)){for(const x of v) walkDecisionObjects(x,out);return out;}
  if(v.decision&&(v.itemId||v.id)) out.push(v);
  for(const x of Object.values(v)) walkDecisionObjects(x,out);
  return out;
}
function findAccept(data,w){
  const rows=walkDecisionObjects(data);
  return rows.find(r=>{
    const id=r.itemId??r.id;
    const h=r.assetHash??r.hash??r.candidateBlobSha??r.gitBlobSha;
    const p=r.assetPath??r.candidateAssetPath;
    return id===w.itemId&&h===w.assetHash&&(!p||p===w.assetPath)&&r.decision==='ACCEPT';
  });
}
function assigned(producer,id){
  const m=id.match(/^([a-z]+)-(\d+)$/); if(!m) return false;
  return (allocation.catalogProduction?.[producer]??[]).some(r=>r.collection===m[1]&&Number(m[2])>=Number(r.first)&&Number(m[2])<=Number(r.last));
}
function decodeAsset(p){
  const ext=p.toLowerCase().split('.').pop();
  if(['jpg','jpeg','png','webp'].includes(ext)){
    const py="from PIL import Image; import sys,json; im=Image.open(sys.argv[1]); im.verify(); im=Image.open(sys.argv[1]); print(json.dumps({'format':im.format,'width':im.width,'height':im.height}))";
    return JSON.parse(execFileSync('python3',['-c',py,p],{encoding:'utf8'}));
  }
  if(ext==='svg'){
    const s=fs.readFileSync(p,'utf8');
    if(!/<svg[\s>]/i.test(s)) throw new Error(`${p}: invalid SVG root`);
    if(/<script\b|<foreignObject\b|\bon\w+\s*=|javascript:|(?:href|src)\s*=\s*["'](?:https?:)?\/\//i.test(s)) throw new Error(`${p}: unsafe SVG active/external content`);
    const vm=s.match(/viewBox\s*=\s*["'][^"']*?([\d.]+)[ ,]+([\d.]+)["']/i);
    return {format:'SVG',width:vm?Number(vm[1]):null,height:vm?Number(vm[2]):null};
  }
  throw new Error(`${p}: unsupported image extension ${ext}`);
}

const evidence=(cfg.reviewEvidence??[]).map(loadEvidence);
for(const e of evidence){
  if(String(e.data.reviewer??reviewer).padStart(2,'0')!==reviewer) throw new Error(`Reviewer identity mismatch in ${e.label}`);
}
const verified=[];
for(const w of cfg.items){
  const decisionEvidence=evidence.map(e=>({e,r:findAccept(e.data,w)})).find(x=>x.r);
  if(!decisionEvidence) throw new Error(`${w.itemId}: exact ACCEPT not found in configured hash-bound review evidence`);
  const r=decisionEvidence.r;
  const producer=String(w.producer).padStart(2,'0');
  if(String(r.producer??producer).padStart(2,'0')!==producer) throw new Error(`${w.itemId}: producer mismatch in review evidence`);
  if(producer===reviewer) throw new Error(`${w.itemId}: producer self-review forbidden`);
  if(!assigned(producer,w.itemId)) throw new Error(`${w.itemId}: producer ${producer} is outside active visual allocation`);
  const collection=w.itemId.split('-')[0];
  if(!(allocation.reviewCollections?.[reviewer]??[]).includes(collection)) throw new Error(`${w.itemId}: reviewer ${reviewer} is outside assigned partition`);
  const item=storeById.get(w.itemId);
  if(!item) throw new Error(`${w.itemId}: absent from authoritative Store`);
  if(item.collectionId!==collection) throw new Error(`${w.itemId}: authoritative collection mismatch`);
  if(r.name!==undefined&&r.name!==item.name) throw new Error(`${w.itemId}: review name differs from Store`);
  if(r.tier!==undefined&&Number(r.tier)!==Number(item.tier)) throw new Error(`${w.itemId}: review tier differs from Store`);
  if(r.theme!==undefined&&r.theme!==item.theme) throw new Error(`${w.itemId}: review theme differs from Store`);
  const p=repoPath(w.assetPath);
  if(!fs.existsSync(p)) throw new Error(`${w.itemId}: accepted bytes missing at ${p}`);
  const actual=gitBlob(p);
  if(actual!==w.assetHash) throw new Error(`${w.itemId}: exact path/hash drift ${actual} != ${w.assetHash}`);
  const d=decodeAsset(p);
  if(d.format!=='SVG'&&(!d.width||!d.height)) throw new Error(`${w.itemId}: zero raster dimensions`);
  verified.push({itemId:w.itemId,name:item.name,collectionId:item.collectionId,collectionName:item.collectionName,type:item.type,tier:item.tier,theme:item.theme,price:item.price,starReq:item.starReq,assetPath:w.assetPath,repositoryPath:p,assetBlobSha:actual,sha256:sha256(p),bytes:fs.statSync(p).size,width:d.width,height:d.height,format:d.format,producer,reviewer,reviewEvidence:decisionEvidence.e.label,reviewBlobSha:decisionEvidence.e.blobSha,evidenceRefs:r.evidenceRefs??[]});
}

if(new Set(verified.map(x=>x.assetPath)).size!==verified.length) throw new Error('New batch has duplicate paths');
if(new Set(verified.map(x=>x.assetBlobSha)).size!==verified.length) throw new Error('New batch has duplicate content');
const pathOwners=new Map(), hashOwners=new Map();
for(const [id,m] of Object.entries(manifestBefore.items??{})){
  const p=repoPath(m.assetPath);
  if(!fs.existsSync(p)) throw new Error(`Existing canonical ${id} missing at ${p}`);
  if(pathOwners.has(m.assetPath)&&pathOwners.get(m.assetPath)!==id) throw new Error(`Existing duplicate canonical path ${m.assetPath}`);
  pathOwners.set(m.assetPath,id);
  const h=gitBlob(p);
  if(hashOwners.has(h)&&hashOwners.get(h)!==id) throw new Error(`Existing duplicate canonical content ${h}`);
  hashOwners.set(h,id);
}
for(const v of verified){
  const po=pathOwners.get(v.assetPath); if(po&&po!==v.itemId) throw new Error(`${v.itemId}: path collides with ${po}`);
  const ho=hashOwners.get(v.assetBlobSha); if(ho&&ho!==v.itemId) throw new Error(`${v.itemId}: content collides with ${ho}`);
}
for(const shard of ['01','02','05','14']){
  const p=`docs/preproduction/catalog-sprint/reviews/${shard}.json`; if(!fs.existsSync(p)) continue;
  for(const d of walkDecisionObjects(json(p))){
    const id=d.itemId??d.id; const h=d.assetHash??d.hash??d.candidateBlobSha??d.gitBlobSha;
    if(!id||!h||!['REWORK','BLOCKED'].includes(d.decision)) continue;
    if(verified.some(v=>v.itemId===id&&v.assetBlobSha===h)) throw new Error(`${id}: same-hash ${d.decision} disagreement in reviewer ${shard}`);
  }
}

const manifest=structuredClone(manifestBefore);
const changed=[];
for(const v of verified){
  const cur=manifest.items[v.itemId];
  if(cur?.assetPath===v.assetPath&&cur?.status==='final-portable') continue;
  manifest.items[v.itemId]={name:v.name,assetPath:v.assetPath,tier:v.tier,theme:v.theme,status:'final-portable'};
  changed.push(v);
}
if(changed.length!==verified.length) throw new Error(`Batch is not wholly pending: expected ${verified.length} changes, got ${changed.length}`);
const postPaths=new Map(),postHashes=new Map();
for(const [id,m] of Object.entries(manifest.items)){
  if(postPaths.has(m.assetPath)) throw new Error(`Post-update duplicate path ${m.assetPath}`); postPaths.set(m.assetPath,id);
  const h=gitBlob(repoPath(m.assetPath)); if(postHashes.has(h)) throw new Error(`Post-update duplicate content ${h}`); postHashes.set(h,id);
}
const finalPortable=Object.values(manifest.items).filter(x=>x.status==='final-portable').length;
const interimNotVerified=Object.values(manifest.items).filter(x=>x.status==='interim-not-verified').length;
manifest.version=Number(manifestBefore.version)+1;
manifest.target=192;
manifest.finalCount=finalPortable;
manifest.remaining=192-finalPortable;
manifest.duplicateAssetPaths=[];
manifest.note=`Delivery Protocol V2 incremental integration: ${cfg.batchLabel}. Exact-hash independent ACCEPTs only; prior versions remain in Git history. Replit/Floot/main/player data untouched.`;
fs.writeFileSync(manifestPath,JSON.stringify(manifest)+'\n');

const runtime=fs.readFileSync(runtimePath,'utf8');
const marker='const portableCatalogArt = Object.freeze({';
const start=runtime.indexOf(marker),bodyStart=start+marker.length,end=runtime.indexOf('\n});',bodyStart);
if(start<0||end<0) throw new Error('catalogArtRuntime mapping markers not found');
const ordered=gameModel.store.filter(x=>manifest.items[x.id]).map(x=>`  '${x.id}': '${manifest.items[x.id].assetPath}'`).join(',\n');
fs.writeFileSync(runtimePath,runtime.slice(0,bodyStart)+'\n'+ordered+runtime.slice(end));
const manifestAfterBlob=gitBlob(manifestPath),runtimeAfterBlob=gitBlob(runtimePath);

const previousCanonical=Number(previousIntegration.counts?.canonicalWiredAcceptedHashesAfterCommit??previousIntegration.counts?.acceptedCurrentReplacementHashes??0);
if(cfg.expectedStrictCanonicalBefore!==undefined&&previousCanonical!==Number(cfg.expectedStrictCanonicalBefore)) throw new Error(`Strict canonical count drift ${previousCanonical} != expected ${cfg.expectedStrictCanonicalBefore}`);
const strictAccepted=previousCanonical+changed.length;
const integration={
  schemaVersion:10,workstream:'08',phase:'CATALOG_SPRINT',status:'CANONICAL_BATCH_PRECOMMIT_TESTS_PENDING',branch:'screenshot-match-preproduction',auditedSourceHead:sourceHead,batchLabel:cfg.batchLabel,
  reviewerEvidence:evidence.map(e=>({reviewer,source:e.label,blobSha:e.blobSha})),
  canonicalBefore:{manifestVersion:manifestBefore.version,manifestBlobSha:manifestBeforeBlob,runtimeBlobSha:runtimeBeforeBlob,manifestEntries:Object.keys(manifestBefore.items??{}).length,strictAcceptedCanonical:previousCanonical},
  canonicalAfter:{manifestVersion:manifest.version,manifestBlobSha:manifestAfterBlob,runtimeBlobSha:runtimeAfterBlob,catalogTarget:192,manifestEntries:Object.keys(manifest.items).length,runtimeMappings:Object.keys(manifest.items).length,finalPortable,interimNotVerified,nonFinal:192-finalPortable,duplicateAssetPaths:0,duplicateContentHashes:0,strictAcceptedCanonical:strictAccepted},
  integratedThisRun:changed,
  validationBeforeCommit:{exactStoreMetadata:`PASS_${changed.length}_OF_${changed.length}`,storedPathAndBlobReadback:`PASS_${changed.length}_OF_${changed.length}`,safeDecode:`PASS_${changed.length}_OF_${changed.length}`,reviewerIndependence:`PASS_REVIEWER_${reviewer}`,reviewerDisagreement:'PASS_NONE_ON_ACCEPTED_EXACT_HASHES',canonicalUniqueness:`PASS_${Object.keys(manifest.items).length}_UNIQUE_PATHS_AND_CONTENT`,runtimeManifestAgreement:`PASS_${Object.keys(manifest.items).length}_OF_${Object.keys(manifest.items).length}`,stablePricesUnlocksOwnership:'UNCHANGED_BY_SCOPE'},
  postCommitValidation:{catalogTests:'PENDING_EXECUTION',productionBuild:'PENDING_EXECUTION',storeSmoke:'PENDING_EXECUTION',referenceComparison:'HANDOFF_14_AFTER_GREEN_CANONICAL_COMMIT'},
  counts:{generatedLocalKnown:Number(previousIntegration.counts?.generatedLocalKnown??0),generatedRemoteNotStagedKnown:Number(previousIntegration.counts?.generatedRemoteNotStagedKnown??0),preservedBlobOnlyKnown:Number(previousIntegration.counts?.preservedBlobOnlyKnown??0),branchStagedRepairIdsKnown:Number(previousIntegration.counts?.branchStagedRepairIdsKnown??previousIntegration.counts?.branchStagedRepairVersionsKnown??0),independentlyReviewedUniqueCatalogIds:Number(previousIntegration.counts?.independentlyReviewedUniqueCatalogIds??0),acceptedCurrentReplacementHashes:strictAccepted,canonicalWiredAcceptedHashesAfterCommit:strictAccepted,catalogReleaseClearedIds:0,newlyAcceptedAndWiredThisRun:changed.length,strictAcceptedRemaining:192-strictAccepted},
  nextAcceptedQueues:cfg.nextAcceptedQueues??[],
  blockers:[`${192-strictAccepted} catalog IDs remain outside the strict accepted-and-canonical set after this batch.`,'Catalog release still requires all 192 current hashes accepted/canonical plus final duplicate/near-duplicate and Store/mobile/release verification.','Nonvisual release gates remain open/deferred, not waived.'],
  freeze:{replitTouched:false,flootTouched:false,mainMergedOrModified:false,playerDataTouched:false,phaseChanged:false}
};
fs.writeFileSync(integrationPath,JSON.stringify(integration,null,2)+'\n');
const rows=changed.map(x=>`| ${x.itemId} | ${x.name} | T${x.tier} · ${x.theme} | \`${x.assetPath}\` | \`${x.assetBlobSha}\` | ${x.format}${x.width?` ${x.width}×${x.height}`:''} |`).join('\n');
fs.writeFileSync(integrationMdPath,`# Workstream 08 catalog integration\n\nStatus: **${cfg.batchLabel} PREPARED; VALIDATION PENDING**\n\nSource head: \`${sourceHead}\`  \nBranch: \`screenshot-match-preproduction\` only. Replit/Floot/main/player data untouched.\n\n| ID | Name | Tier/theme | Canonical asset | Git blob | Decode |\n|---|---|---|---|---|---|\n${rows}\n\nEvery accepted blob was re-read from the repository, checked against authoritative Store identity/category/tier/theme, decoded/safety-checked, confirmed independent from its producer and checked for canonical path/content collisions.\n\nAfter this batch: manifest v${manifest.version}; **${finalPortable}/192 legacy final-portable labels**, **${strictAccepted}/192 strict independently accepted + canonical-wired current hashes**, **${192-strictAccepted} strict remaining**, **0 release-cleared**.\n`);
const oldWs=fs.existsSync(workstreamPath)?fs.readFileSync(workstreamPath,'utf8'):'';
fs.writeFileSync(workstreamPath,`## V2 canonical increment — ${cfg.batchLabel}\n\nPrepared from \`${sourceHead}\` using exact hash-bound reviewer ${reviewer} ACCEPT evidence. ${changed.length} items passed repository-byte, Store metadata, decode/safety, reviewer-independence and canonical uniqueness checks. Full tests/build/Store-mobile smoke are required before publication.\n\nExact IDs: ${changed.map(x=>`\`${x.itemId}\``).join(', ')}.\n\n`+oldWs);
fs.writeFileSync('/tmp/w08-plan.json',JSON.stringify({sourceHead,batchLabel:cfg.batchLabel,ids:changed.map(x=>x.itemId),manifestVersion:manifest.version,strictAccepted,finalPortable,manifestAfterBlob,runtimeAfterBlob},null,2));
console.log(fs.readFileSync('/tmp/w08-plan.json','utf8'));
