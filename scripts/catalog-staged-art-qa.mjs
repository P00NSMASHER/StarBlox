import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const artifactRoot = 'artifacts/catalog-staged-art';
const themes = ['Cloud Pop','Pixel Party','Berry Blast','Garden Glow','Galaxy Glow','Sunny Pop','Aqua Wave','Art Attack','Star Luxe','Midnight Neon','Candy Core','Adventure Club'];
const definitions = {
  lighting: {lane:'docs/preproduction/catalog-sprint/lane-04.json', offset:0, names:['Starter Lamp','Cloud Lamp','Pixel Cube Light','Heart Lamp','Vine Light','Planet Lamp','Sun Lamp','Bubble Lamp','Color Lamp','Neon Strip Tower','Aurora Light','Crystal Chandelier']},
  wall: {lane:'docs/preproduction/catalog-sprint/lane-05.json', offset:3, names:['School Star Poster','Cloud Wall Flag','Pixel Scoreboard','Heart Gallery','Garden Garland','Planet Map','Skate Poster','Ocean Window','Art Gallery Wall','Neon City Sign','Star Mirror','Golden Crest']},
  rugs: {lane:'docs/preproduction/catalog-sprint/lane-07.json', offset:6, names:['Starter Mat','Cloud Rug','Pixel Grid Rug','Heart Rug','Leaf Rug','Orbit Rug','Checker Rug','Wave Rug','Splash Rug','Neon Grid Rug','Dream Cloud Rug','Luxe Star Rug']},
  decor: {lane:'docs/preproduction/catalog-sprint/lane-09.json', offset:9, names:['Book Crate','Cloud Shelf','Arcade Mini','Plush Stack','Plant Wall','Telescope','Skate Rack','Mini Aquarium','Easel Set','Mini Fridge','Dream Vanity Set','Trophy Wall']}
};
const producerLanes = [
  'docs/preproduction/catalog-sprint/lane-01.json',
  'docs/preproduction/catalog-sprint/lane-02.json',
  'docs/preproduction/catalog-sprint/lane-03.json',
  'docs/preproduction/catalog-sprint/lane-04.json',
  'docs/preproduction/catalog-sprint/lane-05.json',
  'docs/preproduction/catalog-sprint/lane-06.json',
  'docs/preproduction/catalog-sprint/lane-07.json',
  'docs/preproduction/catalog-sprint/lane-09.json',
  'docs/preproduction/catalog-sprint/lane-11.json',
  'docs/preproduction/catalog-sprint/lane-12.json'
];
const visualLanes = ['docs/preproduction/visuals/lane-13.json'];
const tierFor = i => i < 3 ? 1 : i < 6 ? 2 : i < 9 ? 3 : i < 11 ? 4 : 5;

function allObjects(value, out=[]) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) { for (const v of value) allObjects(v, out); return out; }
  out.push(value);
  for (const v of Object.values(value)) allObjects(v, out);
  return out;
}
function normalizeRepoPath(p) {
  if (!p || typeof p !== 'string') return null;
  if (p.startsWith('/assets/')) return `public${p}`;
  return p.replace(/^\//, '');
}
function candidatePathFromObject(o) {
  for (const key of ['candidateRepositoryPath','repositoryPath','candidatePath','optimizedPath','publicPath','path','intendedRepositoryPath']) {
    const p = normalizeRepoPath(o?.[key]);
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}
function blobSha(p) { return execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim(); }
function stateText(o) { return ['status','decision','reviewStatus','candidateStatus','repositoryStatus','deliveryStatus','independentDecision'].map(k => String(o?.[k] ?? '').toUpperCase()).join(' '); }
function declaredHash(o) {
  for (const key of ['gitBlobSha','candidateBlobSha','assetHash','blobSha']) {
    const value=String(o?.[key] ?? '').trim().toLowerCase();
    if (/^[0-9a-f]{40}$/.test(value)) return value;
  }
  return null;
}
function looksReviewable(o) {
  const s = stateText(o);
  return s.includes('READY_FOR_REVIEW') || s.includes('READY_FOR_FRESH_REVIEW') || s.includes('READY_FOR_FRESH_INDEPENDENT_PIXEL_REVIEW') || s.includes('STAGED') || /\bPENDING_(?:01|02|05|14)\b/.test(s);
}
function looksAccepted(o) {
  const s=stateText(o);
  return s.includes('ACCEPT') || s.includes('CANONICAL');
}
function replacementFileId(file) { return file.match(/^([a-z]+-\d+)-.+\.(?:svg|png|jpe?g|webp)$/i)?.[1] ?? null; }
function isReplacementPath(id,p) { return p !== `public/assets/catalog/${id}.svg`; }
function signatureCheck(p) {
  try {
    const b=fs.readFileSync(p), ext=path.extname(p).toLowerCase();
    if(ext==='.svg') return {ok:/<svg\b/i.test(b.toString('utf8',0,Math.min(b.length,4096))),reason:'svg'};
    if(ext==='.jpg'||ext==='.jpeg') return {ok:b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff,reason:'jpeg'};
    if(ext==='.png') return {ok:b.length>=8&&b.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])),reason:'png'};
    if(ext==='.webp') return {ok:b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP',reason:'webp'};
    return {ok:false,reason:`unsupported-${ext}`};
  } catch(error) { return {ok:false,reason:String(error)}; }
}
function assetSafetyCheck(p) {
  try {
    const ext=path.extname(p).toLowerCase();
    if(ext!=='.svg') return {ok:true,reason:'raster-self-contained'};
    const text=fs.readFileSync(p,'utf8');
    const patterns=[
      ['script-element',/<script\b/i],
      ['foreign-object',/<foreignObject\b/i],
      ['event-handler',/\son[a-z][\w:-]*\s*=/i],
      ['javascript-url',/\b(?:href|xlink:href)\s*=\s*["']\s*javascript:/i],
      ['external-href',/\b(?:href|xlink:href)\s*=\s*["']\s*(?:https?:)?\/\//i],
      ['external-css-url',/url\(\s*["']?\s*(?:https?:)?\/\//i],
      ['css-import',/@import\b/i],
      ['xml-entity',/<!ENTITY\b/i]
    ];
    const findings=patterns.filter(([,re])=>re.test(text)).map(([name])=>name);
    return {ok:findings.length===0,reason:findings.length?findings.join(','):'svg-self-contained-no-active-content',findings};
  } catch(error) {
    return {ok:false,reason:String(error),findings:['safety-scan-error']};
  }
}
function mimeForPath(p){
  const ext=path.extname(p).toLowerCase();
  if(ext==='.svg') return 'image/svg+xml';
  if(ext==='.jpg'||ext==='.jpeg') return 'image/jpeg';
  if(ext==='.png') return 'image/png';
  if(ext==='.webp') return 'image/webp';
  throw new Error(`Unsupported image extension for fixture: ${ext}`);
}
function dataUriForPath(p){
  const bytes=fs.readFileSync(p);
  return `data:${mimeForPath(p)};base64,${bytes.toString('base64')}`;
}
function readLane(p){try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return {};}}
function laneMetaById(){
  const map=new Map();
  for(const lanePath of producerLanes){
    if(!fs.existsSync(lanePath)) continue;
    const lane=readLane(lanePath);
    const currentItems=new Set(Array.isArray(lane.currentItems)?lane.currentItems:[]);
    for(const o of allObjects(lane)){
      const id=o?.id??o?.itemId;
      if(!id||!/^[a-z]+-\d+$/.test(id)) continue;
      const list=map.get(id)??[];
      list.push({...o,id,producerLane:lanePath,currentBinding:currentItems.has(o)});
      map.set(id,list);
    }
  }
  return map;
}
function selectCurrentReplacementCandidates(report){
  const meta=laneMetaById(), candidates=new Map();
  const add=c=>{
    const actualBlobSha=blobSha(c.repositoryPath), signature=signatureCheck(c.repositoryPath), safety=assetSafetyCheck(c.repositoryPath);
    const bindingHashOk=!c.declaredBlobSha||c.declaredBlobSha===actualBlobSha;
    if(!bindingHashOk){
      report.warnings.push(`${c.id}: authoritative lane binding hash mismatch ${c.repositoryPath}; declared ${c.declaredBlobSha} != actual ${actualBlobSha}`);
    }
    const item={...c,blobSha:actualBlobSha,signature,safety,bindingHashOk};
    const list=candidates.get(c.id)??[];list.push(item);candidates.set(c.id,list);
  };
  for(const [id,objects] of meta.entries()){
    const reviewable=objects.filter(o=>looksReviewable(o));
    const current=objects.filter(o=>o.currentBinding);
    // New pending review work outranks the lane's current binding. When no newer
    // reviewable candidate exists, currentItems is the exact authority even when
    // that current asset is already ACCEPTed. Loose directory discovery is only
    // used when the lane has neither kind of authoritative binding.
    const authoritative=reviewable.length?reviewable:current;
    for(const o of authoritative){
      const repositoryPath=candidatePathFromObject(o);
      if(!repositoryPath||!isReplacementPath(id,repositoryPath)) continue;
      add({id,name:o.name??id,tier:o.tier??null,theme:o.theme??null,producerLane:o.producerLane,discovery:looksReviewable(o)?'lane-reviewable':'lane-current',repositoryPath,declaredBlobSha:declaredHash(o)});
    }
  }
  const root='public/assets/catalog';
  if(fs.existsSync(root)) for(const file of fs.readdirSync(root).sort()){
    const id=replacementFileId(file); if(!id) continue;
    const repositoryPath=path.posix.join(root,file), o=(meta.get(id)??[]).at(-1)??{};
    add({id,name:o.name??id,tier:o.tier??null,theme:o.theme??null,producerLane:o.producerLane??null,discovery:'versioned-file-scan',repositoryPath});
  }
  const selected=[]; report.skippedCandidates=[];
  for(const [id,list] of candidates.entries()){
    // Keep the first occurrence for an identical path/hash. Explicit lane metadata
    // is added before the loose directory scan; allowing the later scan entry to
    // overwrite it erases READY_FOR_REVIEW authority and can resurrect stale files.
    const dedupMap=new Map();
    for(const x of list){
      const key=`${x.repositoryPath}:${x.blobSha}`;
      if(!dedupMap.has(key)) dedupMap.set(key,x);
    }
    const dedup=[...dedupMap.values()];
    // Pending review and explicit currentItems bindings are authoritative. Never
    // substitute a loose historical file when those bytes/hash/safety checks fail.
    const laneBound=dedup.filter(x=>x.discovery==='lane-reviewable'||x.discovery==='lane-current');
    const pool=laneBound.length?laneBound:dedup;
    const valid=pool.filter(x=>x.bindingHashOk!==false&&x.signature.ok&&x.safety.ok);
    const pick=laneBound.length?valid.at(-1):valid.sort((a,b)=>b.repositoryPath.localeCompare(a.repositoryPath))[0];
    if(pick) selected.push(pick);
    for(const c of dedup){
      if(pick&&c.repositoryPath===pick.repositoryPath&&c.blobSha===pick.blobSha) continue;
      const reason=c.bindingHashOk===false?'declared-hash-mismatch':!c.signature.ok?'invalid-file-signature':!c.safety.ok?'unsafe-or-external-svg-content':laneBound.length&&!['lane-reviewable','lane-current'].includes(c.discovery)?'stale-alternate-not-selected-authoritative-lane-binding-present':'alternate-version-not-selected';
      report.skippedCandidates.push({id,repositoryPath:c.repositoryPath,blobSha:c.blobSha,signature:c.signature,safety:c.safety,reason});
    }
    if(!pick){
      const detail=pool.map(x=>`${x.repositoryPath}@${x.blobSha} hashBinding=${x.bindingHashOk===false?'FAIL':'PASS'} signature=${x.signature.ok?'PASS':'FAIL'} safety=${x.safety.ok?'PASS':'FAIL:'+x.safety.reason}`).join(', ');
      report.errors.push(`${id}: authoritative staged replacement is not renderable/safe (${detail}); stale alternates were not substituted`);
    }
  }
  return selected.sort((a,b)=>a.id.localeCompare(b.id));
}
function selectOwnCollectionPath(lane,id,fallback,report){
  const matches=allObjects(lane).filter(o=>o.id===id);
  const viable=[];
  for(let i=0;i<matches.length;i++){
    const o=matches[i], p=candidatePathFromObject(o);
    if(!p) continue;
    const sig=signatureCheck(p), safety=assetSafetyCheck(p);
    if(!sig.ok){report.warnings.push(`${id}: ignored invalid lane candidate ${p} (${sig.reason})`);continue;}
    if(!safety.ok){report.warnings.push(`${id}: ignored unsafe/external-content lane candidate ${p} (${safety.reason})`);continue;}
    const actual=blobSha(p), declared=declaredHash(o);
    if(declared && declared!==actual){report.warnings.push(`${id}: ignored stale lane binding ${p}; declared ${declared} != actual ${actual}`);continue;}
    const replacement=isReplacementPath(id,p);
    const score=(looksReviewable(o)&&replacement)?40:(looksAccepted(o)&&replacement)?30:replacement?20:(looksReviewable(o)?10:0);
    viable.push({p,actual,declared,state:stateText(o),score,index:i,safety});
  }
  viable.sort((a,b)=>b.score-a.score||b.index-a.index);
  const pick=viable[0];
  if(pick){
    report.selectedBindings.push({id,repositoryPath:pick.p,blobSha:pick.actual,declaredBlobSha:pick.declared,state:pick.state,selectionScore:pick.score,safety:pick.safety});
    return pick.p;
  }
  const actual=fs.existsSync(fallback)?blobSha(fallback):null;
  const fallbackSafety=fs.existsSync(fallback)?assetSafetyCheck(fallback):{ok:false,reason:'missing-fallback'};
  report.selectedBindings.push({id,repositoryPath:fallback,blobSha:actual,declaredBlobSha:null,state:'FALLBACK',selectionScore:-1,safety:fallbackSafety});
  if(!fallbackSafety.ok) report.errors.push(`${id}: fallback asset failed active-content/external-dependency safety scan: ${fallbackSafety.reason}`);
  return fallback;
}
function selectVisualCandidates(report){
  const out=[];
  const seen=new Set();
  for(const lanePath of visualLanes){
    if(!fs.existsSync(lanePath)) continue;
    const lane=readLane(lanePath);
    const counters=new Map();
    // Visual lanes may hold multiple simultaneous scene/character candidates in
    // nested handoff structures (for example parallelCandidates). Discover every
    // declared branch-stored visual path rather than only the lane's top-level
    // assets array so fresh scene art cannot be hidden by an older primary entry.
    for(const o of allObjects(lane)){
      const candidateId=String(o?.candidateId??lane.candidateId??path.basename(lanePath,'.json'));
      const candidateType=o?.candidateType??lane.candidateType??null;
      const targetScreen=o?.targetScreen??lane.targetScreen??null;
      const pathFields=[
        ['path',o?.dimensions??null],
        ['desktopPath',o?.desktopDimensions??null],
        ['fullPath',o?.fullDimensions??null],
        ['optimizedPath',o?.optimizedDimensions??null]
      ];
      for(const [field,declaredDimensions] of pathFields){
        const repositoryPath=normalizeRepoPath(o?.[field]);
        if(!repositoryPath||!repositoryPath.startsWith('public/assets/visuals/')||!fs.existsSync(repositoryPath)) continue;
        const actualBlobSha=blobSha(repositoryPath), key=`${repositoryPath}:${actualBlobSha}`;
        if(seen.has(key)) continue;
        seen.add(key);
        const signature=signatureCheck(repositoryPath), safety=assetSafetyCheck(repositoryPath);
        if(!signature.ok){report.warnings.push(`${candidateId}: ignored invalid visual asset ${repositoryPath} (${signature.reason})`);continue;}
        if(!safety.ok){report.errors.push(`${candidateId}: blocked unsafe/external-content visual asset ${repositoryPath} (${safety.reason})`);continue;}
        const n=(counters.get(candidateId)??0)+1;counters.set(candidateId,n);
        out.push({id:`${candidateId}-${n}`,name:`${candidateId} ${n}`,tier:null,theme:targetScreen??candidateType,producerLane:lanePath,discovery:'visual-lane-recursive',repositoryPath,blobSha:actualBlobSha,signature,safety,declaredDimensions,candidateId,candidateType,targetScreen});
      }
    }
  }
  return out.sort((a,b)=>a.id.localeCompare(b.id)||a.repositoryPath.localeCompare(b.repositoryPath));
}

async function settleImages(page,timeoutMs=7000){
  return page.evaluate(async timeout=>{
    const images=[...document.images];
    await Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{const done=()=>resolve();img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});setTimeout(done,timeout);} )));
    return images.map(img=>{
      let opaqueFraction=null,pixelProbeError=null;
      try{const c=document.createElement('canvas');c.width=48;c.height=48;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,48,48);ctx.drawImage(img,0,0,48,48);const d=ctx.getImageData(0,0,48,48).data;let opaque=0;for(let i=3;i<d.length;i+=4)if(d[i]>8)opaque++;opaqueFraction=opaque/(48*48);}catch(error){pixelProbeError=String(error);}
      return {assetPath:img.dataset.repoPath??null,complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,opaqueFraction,pixelProbeError};
    });
  },timeoutMs);
}
async function renderSet(browser,setName,items,report,detailViewport={width:800,height:800}){
  const out=path.join(artifactRoot,setName);fs.mkdirSync(path.join(out,'detail'),{recursive:true});
  const setReport={items:[],contactSheetErrors:[],contactSheetImageStatus:[]};report.sets[setName]=setReport;if(!items.length)return;
  const page=await browser.newPage({viewport:{width:1200,height:960},deviceScaleFactor:1});page.on('console',m=>{if(m.type()==='error')setReport.contactSheetErrors.push(m.text());});page.on('pageerror',e=>setReport.contactSheetErrors.push(String(e)));
  try{
    const cards=items.map(item=>`<article><img src="${dataUriForPath(item.repositoryPath)}" data-repo-path="${item.repositoryPath}" alt="${item.id}"><div><b>${item.id}</b><br>${item.name}<br><span>${item.tier?`T${item.tier}`:''}${item.theme?` · ${item.theme}`:''} · ${item.blobSha.slice(0,8)}</span><br><small>${item.repositoryPath}</small></div></article>`).join('');
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#081936;color:white;font:14px system-ui,sans-serif}main{box-sizing:border-box;width:1200px;padding:30px;display:grid;grid-template-columns:repeat(4,1fr);gap:18px}article{min-height:310px;background:#102c5d;border:2px solid #39d5ff;border-radius:18px;padding:12px;box-sizing:border-box;overflow:hidden}img{width:100%;height:210px;object-fit:contain;display:block}div{padding-top:7px;line-height:18px}span,small{color:#b9d8ff;font-size:11px;word-break:break-all}</style><main>${cards}</main>`);
    setReport.contactSheetImageStatus=await settleImages(page);
    for(const image of setReport.contactSheetImageStatus){const label=image.assetPath??'unknown-image';if(!image.naturalWidth)setReport.contactSheetErrors.push(`contact-sheet decode failed: ${label}`);else if(image.pixelProbeError)setReport.contactSheetErrors.push(`contact-sheet pixel probe failed: ${label}: ${image.pixelProbeError}`);else if((image.opaqueFraction??0)<0.005)setReport.contactSheetErrors.push(`contact-sheet visually blank/transparent: ${label}`);}
    await page.screenshot({path:path.join(out,`${setName}-contact-sheet.png`),fullPage:true,timeout:15000});
  }catch(error){setReport.contactSheetErrors.push(String(error));}finally{await page.close();}

  const detailPage=await browser.newPage({viewport:detailViewport,deviceScaleFactor:1});
  let currentErrors=[];
  detailPage.on('console',m=>{if(m.type()==='error')currentErrors.push(m.text());});
  detailPage.on('pageerror',e=>currentErrors.push(String(e)));
  try{
    for(const item of items){
      currentErrors=[];const dataUri=dataUriForPath(item.repositoryPath);let status=null,naturalWidth=0,naturalHeight=0,opaqueFraction=null,screenshot=false;
      try{
        await detailPage.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:${detailViewport.width}px;height:${detailViewport.height}px;background:#081936;display:grid;place-items:center}img{width:${detailViewport.width}px;height:${detailViewport.height}px;object-fit:contain}</style><img id="asset" src="${dataUri}" data-repo-path="${item.repositoryPath}" alt="${item.id}">`);
        const imageState=(await settleImages(detailPage))[0];naturalWidth=imageState?.naturalWidth??0;naturalHeight=imageState?.naturalHeight??0;opaqueFraction=imageState?.opaqueFraction??null;status=naturalWidth?200:null;
        if(!naturalWidth)throw new Error('asset image decode failed');if(imageState?.pixelProbeError)throw new Error(`asset pixel probe failed: ${imageState.pixelProbeError}`);if((opaqueFraction??0)<0.005)throw new Error(`asset visually blank/transparent: opaqueFraction=${opaqueFraction}`);
        await detailPage.locator('#asset').screenshot({path:path.join(out,'detail',`${item.id}-${item.blobSha.slice(0,8)}.png`),timeout:15000});screenshot=true;
      }catch(error){currentErrors.push(String(error));}
      setReport.items.push({...item,status,naturalWidth,naturalHeight,opaqueFraction,screenshot,errors:[...currentErrors]});
    }
  }finally{await detailPage.close();}
}
function duplicateHashGroups(items){
  const byHash=new Map();for(const item of items){const list=byHash.get(item.blobSha)??[];list.push(item);byHash.set(item.blobSha,list);}return [...byHash.entries()].filter(([,list])=>list.length>1).map(([hash,list])=>({hash,ids:list.map(x=>x.id),paths:list.map(x=>x.repositoryPath)}));
}

fs.mkdirSync(artifactRoot,{recursive:true});
const report={sourceHead:process.env.GITHUB_SHA,generatedAt:new Date().toISOString(),sets:{},errors:[],warnings:[],skippedCandidates:[],selectedBindings:[]};
const browser=await chromium.launch({headless:true});
try{
  for(const [collection,def] of Object.entries(definitions)){
    const lane=readLane(def.lane);const items=def.names.map((name,i)=>{const id=`${collection}-${i+1}`,fallback=`public/assets/catalog/${id}.svg`,repositoryPath=selectOwnCollectionPath(lane,id,fallback,report);if(!fs.existsSync(repositoryPath))throw new Error(`${id}: no staged file at ${repositoryPath}`);return{id,name,tier:tierFor(i),theme:themes[(i+def.offset)%themes.length],repositoryPath,blobSha:blobSha(repositoryPath)};});await renderSet(browser,collection,items,report);
  }
  const replacements=selectCurrentReplacementCandidates(report);await renderSet(browser,'staged-replacements',replacements,report);report.replacementCount=replacements.length;report.replacementIds=replacements.map(x=>`${x.id}:${x.blobSha}:${x.repositoryPath}`);report.replacementExactDuplicateGroups=duplicateHashGroups(replacements);
  const visuals=selectVisualCandidates(report);await renderSet(browser,'visual-assets',visuals,report,{width:1408,height:1056});report.visualAssetCount=visuals.length;report.visualAssetIds=visuals.map(x=>`${x.id}:${x.blobSha}:${x.repositoryPath}`);report.visualExactDuplicateGroups=duplicateHashGroups(visuals);
}catch(error){report.errors.push(String(error));}finally{await browser.close();fs.writeFileSync(path.join(artifactRoot,'report.json'),JSON.stringify(report,null,2));}
const failures=[...report.errors,...Object.entries(report.sets).flatMap(([name,set])=>[...set.contactSheetErrors.map(e=>`${name}: ${e}`),...set.items.flatMap(i=>(i.status!==200||!i.screenshot||!i.naturalWidth||i.errors.length)?[`${name}/${i.id}/${i.blobSha}: ${JSON.stringify(i)}`]:[])])];
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
