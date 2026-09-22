#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {classifyFailure,FAILURE_CODES} from './artReviewNormalizer.mjs';

export const BLOCKS={
 metadata:'Use the exact catalog ID/name/collection/tier/theme. Do not rename, recategorize, or substitute the item.',
 category:'Make the object unmistakably the stated product category with believable proportions and construction.',
 silhouette:'Prioritize a distinctive clean silhouette that reads immediately at small Store-card size.',
 physical:'Show real thickness, seams/joints/edges, layered parts, volume, contact points and functional construction—not a flat icon, emblem or sticker.',
 material:'Use category-appropriate material texture and highlights/shadows that explain the form.',
 depth:'Use occlusion, contact/cast shadows and foreground/midground/background separation so the asset feels spatial.',
 camera:'Use a clean product-style three-quarter view when appropriate so front, side and thickness are visible.',
 theme:'Express the exact theme through material, construction, light and motif—not a palette swap or pasted decal.',
 tier:'Respect tier progression: Starter stays simple and attractive; higher tiers gain richer form/material detail; Luxe gains spectacle without losing identity.',
 card:'Design for both detail view and a 600×600 Store card with strong contrast, uncluttered hierarchy and no tiny critical details.',
 original:'Avoid recolor-only siblings, repeated template silhouettes, generic rings/badges, or interchangeable props.',
 bloom:'Use controlled emissive light/bloom only where appropriate; preserve edges and local contrast.',
 textile:'For textiles, show weave/pile/folds/stitching/edge finish/thickness and believable softness or drape.',
 wall:'For wall decor, show mounting/frame/backing/relief depth and a believable wall-object form—not a floating emblem.',
 light:'For lighting, show a physical base/mount/chassis, emitter or bulb, support structure and believable emitted/reflected light.',
 aura:'For auras, use distinctive spatial geometry, layered particles, translucent/emissive volume, foreground/background depth and readable central negative space—not a flat ring.',
 companion:'For companions, show a charming full body, clear anatomy, expressive face, dimensional materials and a distinctive pose/silhouette.',
 furniture:'For furniture/decor, show supports, joints, cushions/panels/hardware, weight and grounded contact.',
 stage:'Present one isolated subject on a clean premium background. No UI, text, watermark, logo, fake price badge or unrelated props.'
};
const BASE=['metadata','category','silhouette','physical','material','theme','tier','card','original','stage'];
const TECH=/corrupt|signature|decode|transparent|blank|missing file|wrong mime|404|readback|hash mismatch/i;
const FAILURE_BLOCKS=Object.freeze({
  TECHNICAL_INTEGRITY:[],
  FLAT_COMPOSITION:['physical','material','camera','depth','original'],
  WEAK_DEPTH:['physical','depth','camera'],
  WEAK_MATERIAL_LIGHTING:['physical','material','depth'],
  THEME_MISMATCH:['theme','original'],
  TIER_INSUFFICIENT:['tier','material','depth'],
  SMALL_CARD_READABILITY:['silhouette','card'],
  NEAR_DUPLICATE_TEMPLATE:['original','theme','silhouette'],
  WEAK_SILHOUETTE_IDENTITY:['category','silhouette','original'],
  EXCESSIVE_BLOOM:['bloom','card'],
  UNKNOWN_REWORK:[]
});

export const sha=s=>crypto.createHash('sha256').update(String(s)).digest('hex');
const band=t=>Number(t)<=2?'starter':Number(t)<=3?'mid':'luxe';
const uniq=a=>[...new Set(a.filter(Boolean))];

export function inferRepair(review={}){
 const text=[review.reason,review.reasonCode,...(review.defects||[])].filter(Boolean).join(' '), blocks=[];
 const explicitFailureCodes=uniq((review.failureCodes||[]).filter(code=>Object.prototype.hasOwnProperty.call(FAILURE_CODES,code)));
 const failureCodes=explicitFailureCodes.length?explicitFailureCodes:classifyFailure(review);
 for(const code of failureCodes) blocks.push(...(FAILURE_BLOCKS[code]||[]));
 const f=Object.entries(review.checks||{}).filter(([,v])=>['FAIL','PARTIAL','REWORK','BLOCKED'].includes(String(v).toUpperCase())).map(([k])=>k);
 if(f.some(x=>/identity|silhouette/i.test(x))) blocks.push('category','silhouette');
 if(f.some(x=>/materialLighting|material|lighting/i.test(x))) blocks.push('physical','material','depth');
 if(f.some(x=>/cardReadability|readab|contrast/i.test(x))) blocks.push('card');
 if(f.some(x=>/themeTier|theme|tier/i.test(x))) blocks.push('theme','tier');
 if(f.some(x=>/originality|duplicateVisual|duplicate/i.test(x))) blocks.push('original');
 return {technical:TECH.test(text)||failureCodes.includes('TECHNICAL_INTEGRITY'),blocks:uniq(blocks),failureCodes,text};
}

export function normalizeReviews(docs=[]){
 const obs=[],current=new Map();
 for(const {path:sourcePath,data} of docs){
  const reviewer=String(data.reviewer||'');
  for(const r of data.reviews||[]) if(r.itemId&&r.assetHash&&r.decision) obs.push({...r,reviewer,sourcePath});
  for(const [itemId,r] of Object.entries(data.decisions||{})){
   if(!r.hash||!r.decision) continue;
   const detail=(data.reviews||[]).find(x=>x.itemId===itemId&&x.assetHash===r.hash);
   const row={itemId,assetHash:r.hash,assetPath:r.path,producer:r.producer,decision:r.decision,reason:detail?.reason||r.reason||r.reasonCode||'',reasonCode:r.reasonCode,checks:detail?.checks||r.checks||{},reviewedAt:detail?.reviewedAt||data.reviewedAt||'',reviewer,sourcePath};
   obs.push(row); current.set(itemId,row);
  }
 }
 const seen=new Set(),unique=[];
 for(const r of obs){const k=[r.itemId,r.assetHash,r.reviewer,r.decision].join('|');if(!seen.has(k)){seen.add(k);unique.push(r)}}
 const byItem=new Map(); for(const r of unique){if(!byItem.has(r.itemId))byItem.set(r.itemId,[]);byItem.get(r.itemId).push(r)}
 for(const [id,rows] of byItem) if(!current.has(id)){rows.sort((a,b)=>String(a.reviewedAt||'').localeCompare(String(b.reviewedAt||'')));current.set(id,rows.at(-1))}
 return {observations:unique,current};
}

export function train({experiments=[],reviewDocs=[]}={}){
 const {observations,current}=normalizeReviews(reviewDocs), byHash=new Map();
 for(const r of observations){const k=`${r.itemId}|${r.assetHash}`;(byHash.get(k)||byHash.set(k,[]).get(k)).push(r)}
 const stats={global:{},collection:{},tier:{}},excluded=[]; let accepted=0,rework=0;
 const bump=(m,k,ok)=>{m[k]??={accept:0,rework:0};m[k][ok?'accept':'rework']++};
 for(const e of experiments){
  const reviews=(byHash.get(`${e.itemId}|${e.assetHash}`)||[]).filter(r=>String(r.reviewer)!==String(e.producer));
  const ds=uniq(reviews.map(r=>String(r.decision).toUpperCase()).filter(x=>['ACCEPT','REWORK'].includes(x)));
  if(ds.length!==1){excluded.push({attemptId:e.attemptId,reason:ds.length?'REVIEW_DISAGREEMENT':'NO_INDEPENDENT_EXACT_HASH_REVIEW'});continue}
  const blocks=uniq((e.promptBlocks||[]).filter(x=>BLOCKS[x])); if(!blocks.length){excluded.push({attemptId:e.attemptId,reason:'NO_VALID_PROMPT_BLOCKS'});continue}
  const ok=ds[0]==='ACCEPT'; ok?accepted++:rework++;
  for(const b of blocks){bump(stats.global,b,ok);bump(stats.collection,`${e.collectionId||'unknown'}|${b}`,ok);bump(stats.tier,`${band(e.tier)}|${b}`,ok)}
 }
 const decorate=m=>Object.fromEntries(Object.entries(m).map(([k,v])=>{const a=1+v.accept,b=1+v.rework;return[k,{...v,support:v.accept+v.rework,mean:a/(a+b)}]}));
 const repairFrequency={}; for(const r of observations) if(String(r.decision).toUpperCase()==='REWORK') for(const b of inferRepair(r).blocks) repairFrequency[b]=(repairFrequency[b]||0)+1;
 return {schemaVersion:1,trainingExamples:accepted+rework,acceptedExamples:accepted,reworkExamples:rework,excluded,stats:{global:decorate(stats.global),collection:decorate(stats.collection),tier:decorate(stats.tier)},bootstrap:{reviewObservations:observations.length,repairFrequency},current};
}

const defaults=c=>c==='rugs'?['textile','depth']:c==='wall'?['wall','depth']:c==='lighting'?['light','bloom']:c==='auras'?['aura','bloom','depth']:c==='companions'?['companion','camera']:['tops','bottoms'].includes(c)?['textile','camera']:['beds','seating','desks','decor'].includes(c)?['furniture','camera','depth']:['camera'];
function score(model,item,b){
 const g=model.stats.global[b],c=model.stats.collection[`${item.collectionId}|${b}`],t=model.stats.tier[`${band(item.tier)}|${b}`],prior=g?.mean??.5,s=(c?.support||0)+(t?.support||0);
 const mean=s?(((c?.mean??prior)*(c?.support||0)+(t?.mean??prior)*(t?.support||0))/s):prior, support=(g?.support||0)+s;
 return mean+.06/Math.sqrt(1+support);
}
export function compose(item,blocks,variant='A',repairContext={},basePrompt=''){
 const ids=uniq([...BASE,...blocks]).filter(x=>BLOCKS[x]);
 const metadata=`Exact metadata: ${item.id} — ${item.name}; collection ${item.collectionId}; type ${item.type}; tier ${item.tier}; theme ${item.theme}.`;
 const brief=String(basePrompt||'').trim();
 const failureCodes=uniq((repairContext.failureCodes||[]).filter(code=>Object.prototype.hasOwnProperty.call(FAILURE_CODES,code)));
 const repair=[];
 if(failureCodes.length){
  repair.push(`Exact-hash reviewer failure taxonomy: ${failureCodes.join(', ')}.`);
  if(repairContext.humanReason) repair.push(`Human reviewer reason: ${String(repairContext.humanReason).trim()}`);
  repair.push('Repair the documented failure codes while preserving qualities that were not implicated. Do not erase successful identity, silhouette, material depth, or readability merely to make a different image.');
 }
 const text=[`STARBLOX CATALOG ART — ${variant}`,'Create one premium, kid-friendly 2D game catalog asset with polished dimensional quality.',metadata,...(brief?[`Authoritative item-specific design brief:\n${brief}`]:[]),...repair,...ids.map(x=>BLOCKS[x]),'Output a production-worthy source image for exact-byte staging, card/detail rendering and independent review. Do not claim approval; the reviewer decides from rendered pixels.'].join('\n\n');
 return {variant,promptBlocks:ids,promptText:text,promptSha256:sha(text),failureCodes,optimizerInputSha256:brief?sha(brief):null};
}
export function optimizeBrief(item,basePrompt,review,model,variant='REQUEST'){
 const brief=String(basePrompt||'').trim();
 if(!item?.id) throw Error('item.id required');
 if(!brief) throw Error(`item ${item.id} base prompt required`);
 const decision=String(review?.decision||'UNREVIEWED').toUpperCase();
 const repair=inferRepair(review||{});
 if(decision==='ACCEPT') throw Error(`item ${item.id} is already ACCEPTed; refuse request regeneration`);
 if(decision.startsWith('BLOCKED')||repair.technical) throw Error(`item ${item.id} has a technical/blocking review; prompt regeneration is not the remedy`);
 if(!['REWORK','UNREVIEWED'].includes(decision)) throw Error(`item ${item.id} review state ${decision} is not eligible for request planning`);
 const required=uniq([...repair.blocks,...defaults(item.collectionId)]);
 const learned=Object.keys(BLOCKS)
   .filter(x=>!BASE.includes(x)&&!required.includes(x))
   .sort((a,b)=>score(model,item,b)-score(model,item,a))
   .slice(0,4);
 return compose(
   item,
   [...required,...learned],
   variant,
   {failureCodes:repair.failureCodes,humanReason:review?.reason||review?.reasonCode||''},
   brief
 );
}
export function recommend(item,review,model,count=4){
 const decision=String(review?.decision||'UNREVIEWED').toUpperCase(), repair=inferRepair(review||{});
 if(decision==='ACCEPT')return{itemId:item.id,action:'PRESERVE_ACCEPTED_HASH',assetHash:review.assetHash||null};
 if(decision.startsWith('BLOCKED')||repair.technical)return{itemId:item.id,action:'TECHNICAL_REPAIR_NOT_PROMPT_REGEN',assetHash:review?.assetHash||null,reason:review?.reason||review?.reasonCode||'technical blocker'};
 if(!['REWORK','UNREVIEWED'].includes(decision))return{itemId:item.id,action:'HOLD_NOT_REGEN',assetHash:review?.assetHash||null,decision,reason:'Current review state is not an independent art-quality REWORK.'};
 const r=uniq([...repair.blocks,...defaults(item.collectionId)]), learned=Object.keys(BLOCKS).filter(x=>!BASE.includes(x)&&!r.includes(x)).sort((a,b)=>score(model,item,b)-score(model,item,a)).slice(0,4);
 const plans=[['A-PHYSICAL',['physical','material','camera','depth']],['B-READABILITY',['silhouette','card','original','bloom']],['C-THEME-TIER',['theme','tier','original','material']],['D-REPAIR',[...r,...learned]]].slice(0,Math.max(2,Math.min(4,Number(count)||4)));
 return {itemId:item.id,name:item.name,collectionId:item.collectionId,tier:item.tier,theme:item.theme,decision,sourceReviewHash:review?.assetHash||null,failureCodes:repair.failureCodes,repairBlocks:r,variants:plans.map(([id,b])=>compose(item,[...r,...b],id,{failureCodes:repair.failureCodes,humanReason:review?.reason||review?.reasonCode||''}))};
}
export function validateExperiment(e){
 const errors=[]; for(const k of ['attemptId','itemId','assetHash','producer'])if(!e?.[k])errors.push(`missing ${k}`);
 if(!Array.isArray(e?.promptBlocks)||!e.promptBlocks.length)errors.push('promptBlocks must be non-empty');
 for(const b of e?.promptBlocks||[])if(!BLOCKS[b])errors.push(`unknown block ${b}`);
 if(e?.promptText&&e?.promptSha256&&sha(e.promptText)!==e.promptSha256)errors.push('promptSha256 mismatch'); return errors;
}

function args(argv){const o={_:[]};for(let i=0;i<argv.length;i++){const x=argv[i];if(x.startsWith('--')){const k=x.slice(2),n=argv[i+1];if(n&&!n.startsWith('--')){o[k]=n;i++}else o[k]=true}else o._.push(x)}return o}
function jsonl(f){return fs.existsSync(f)?fs.readFileSync(f,'utf8').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(JSON.parse):[]}
function reviewDocs(root){const d=path.join(root,'docs/preproduction/catalog-sprint/reviews');return fs.readdirSync(d).filter(x=>/^\d+\.json$/.test(x)).sort().map(n=>({path:path.relative(root,path.join(d,n)),data:JSON.parse(fs.readFileSync(path.join(d,n),'utf8'))}))}
async function main(){
 const a=args(process.argv.slice(2)),cmd=a._[0]||'validate',root=path.resolve(a['repo-root']||'.'),ledger=path.join(root,'docs/preproduction/art-prompt-optimizer/attempts.jsonl');
 const mod=await import(pathToFileURL(path.join(root,'src/gameModel.js')).href+`?t=${Date.now()}`),items=mod.store||mod.gameModel?.store||[],byId=new Map(items.map(x=>[x.id,x])),experiments=jsonl(ledger),docs=reviewDocs(root);
 for(const e of experiments){const er=validateExperiment(e);if(er.length)throw Error(`${e.attemptId}: ${er.join('; ')}`);if(!byId.has(e.itemId))throw Error(`unknown item ${e.itemId}`)}
 const model=train({experiments,reviewDocs:docs});
 let out;
 if(cmd==='validate')out={reviewFiles:docs.length,reviewObservations:model.bootstrap.reviewObservations,promptExperiments:experiments.length,trainingExamples:model.trainingExamples,promptBlocks:Object.keys(BLOCKS).length,items:items.length,excluded:model.excluded};
 else if(cmd==='train'){const{current,...rest}=model;out={...rest,currentDecisions:Object.fromEntries(current)}}
 else if(cmd==='recommend'){
  const rows=a.item?[recommend(byId.get(a.item),model.current.get(a.item),model,a.variants||4)]:items.filter(i=>model.current.has(i.id)&&String(model.current.get(i.id).decision).toUpperCase()!=='ACCEPT').map(i=>recommend(i,model.current.get(i.id),model,a.variants||4)); out={schemaVersion:1,trainingExamples:model.trainingExamples,recommendations:rows};
 }else if(cmd==='record'){
  const e=JSON.parse(fs.readFileSync(path.resolve(a['attempt-json']),'utf8')),er=validateExperiment(e);if(er.length)throw Error(er.join('; '));if(experiments.some(x=>x.attemptId===e.attemptId))throw Error('duplicate attemptId');fs.appendFileSync(ledger,JSON.stringify(e)+'\n');out={recorded:true,attemptId:e.attemptId};
 }else throw Error('commands: validate | train | recommend | record');
 if(a.output){fs.mkdirSync(path.dirname(path.resolve(a.output)),{recursive:true});fs.writeFileSync(path.resolve(a.output),JSON.stringify(out,null,2)+'\n')}else console.log(JSON.stringify(out,null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.stack||e);process.exit(1)});
