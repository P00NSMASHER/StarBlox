import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const baseUrl = process.env.STARBLOX_QA_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.STARBLOX_QA_OUTPUT || 'artifacts/catalog-mobile-changed-qa';
const sourceHead = process.env.GITHUB_SHA || execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const strict = process.env.STARBLOX_QA_STRICT !== '0';
const allCollections = ['tops','bottoms','shoes','headwear','facegear','backgear','handgear','auras','companions','beds','seating','desks','lighting','wall','rugs','decor'];
const viewports = [
  {name:'desktop-1408x1056',width:1408,height:1056},
  {name:'tablet-1024x768',width:1024,height:768},
  {name:'phone-390x844',width:390,height:844},
  {name:'phone-320x568',width:320,height:568}
];
const motionModes = [
  {name:'reduced',value:'reduce'},
  {name:'normal',value:'no-preference'}
];

function gitBlob(file){ return execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim(); }
function loadJson(file){ return JSON.parse(fs.readFileSync(file,'utf8')); }
function blobJson(sha){ return JSON.parse(execFileSync('git',['cat-file','blob',sha],{encoding:'utf8'})); }
function stableString(v){ return JSON.stringify(v ?? null); }
function itemCollection(id){ return String(id).split('-')[0]; }
function currentScope(){
  const manifestPath='catalog-art-manifest.json';
  const mobilePath='docs/preproduction/catalog-sprint/mobile-qa.json';
  const currentManifest=loadJson(manifestPath);
  const currentManifestBlobSha=gitBlob(manifestPath);
  let prior=null,priorBlobSha=null,baselineStatus='AVAILABLE';
  try{
    const mobile=loadJson(mobilePath);
    priorBlobSha=mobile?.canonicalIntegration?.manifestBlobSha ?? mobile?.canonicalIntegration?.manifestBlob ?? null;
    if(priorBlobSha) prior=blobJson(priorBlobSha);
    else baselineStatus='MISSING_PRIOR_MANIFEST_HASH';
  }catch(error){ baselineStatus=`BASELINE_READ_FAILED:${error?.message||error}`; }
  if(priorBlobSha===currentManifestBlobSha){
    return {changed:false,reason:'CANONICAL_MANIFEST_UNCHANGED',sourceHead,currentManifestBlobSha,priorManifestBlobSha:priorBlobSha,manifestVersion:currentManifest.version,collections:[],changedIds:[],stableControl:null,fullMatrix:false,baselineStatus};
  }
  let changedIds=[];
  if(prior){
    const ids=new Set([...Object.keys(prior.items??{}),...Object.keys(currentManifest.items??{})]);
    for(const id of ids){
      const a=prior.items?.[id],b=currentManifest.items?.[id];
      if(stableString(a)!==stableString(b)) changedIds.push(id);
    }
  }else{
    changedIds=Object.keys(currentManifest.items??{});
  }
  let changedCollections=[...new Set(changedIds.map(itemCollection).filter(x=>allCollections.includes(x)))];
  const fullMatrix=!prior || changedCollections.length>=8 || changedIds.length>=48;
  if(fullMatrix) changedCollections=[...allCollections];
  const stableControl=allCollections.find(x=>!changedCollections.includes(x)) || 'tops';
  const collections=fullMatrix?[...allCollections]:[...changedCollections,stableControl];
  return {changed:true,reason:prior?'CANONICAL_MANIFEST_DELTA':'BASELINE_UNAVAILABLE_FULL_MATRIX',sourceHead,currentManifestBlobSha,priorManifestBlobSha:priorBlobSha,manifestVersion:currentManifest.version,collections,changedCollections,changedIds,stableControl,fullMatrix,baselineStatus};
}

const scope=currentScope();
if(process.argv.includes('--scope-only')){
  process.stdout.write(JSON.stringify(scope));
  process.exit(0);
}

await fsp.mkdir(outputDir,{recursive:true});
await fsp.writeFile(path.join(outputDir,'scope.json'),JSON.stringify(scope,null,2)+'\n');
if(!scope.changed){
  const report={schemaVersion:1,status:'SKIPPED_UNCHANGED_CANONICAL_HASHES',generatedAt:new Date().toISOString(),sourceHead,scope,releaseBlockingCount:0,results:[]};
  await fsp.writeFile(path.join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  await fsp.writeFile(path.join(outputDir,'summary.txt'),'SKIPPED: canonical manifest hash unchanged from last Workstream-10 proof.\n');
  process.exit(0);
}

const { chromium } = await import('playwright');
const manifest=loadJson('catalog-art-manifest.json');
const results=[];
let releaseBlockingCount=0;
function record(entry){
  results.push(entry);
  if(entry.releaseBlocking) releaseBlockingCount+=1;
  console.log(`[${entry.status}] ${entry.motion||''} ${entry.viewport||''} ${entry.collection||''} ${entry.check}: ${entry.message}`);
}
function visibleSelector(id){ return `.marketPage.sbStoreMatch .storeGrid .storeCard[data-store-item-id="${id}"]`; }
async function clickNav(page,label){
  const buttons=page.locator('.sidebar .navBtn');
  for(let i=0;i<await buttons.count();i++){
    const b=buttons.nth(i), text=(await b.innerText().catch(()=>'' )).trim(), aria=(await b.getAttribute('aria-label').catch(()=>''))||'';
    if(text.toLowerCase()===label.toLowerCase()||aria.toLowerCase()===label.toLowerCase()){ await b.click(); return true; }
  }
  return false;
}
async function openStore(page){
  if(!await clickNav(page,'Store')) return false;
  await page.waitForSelector('.marketPage.sbStoreMatch .storeGrid',{state:'attached',timeout:8000});
  await page.waitForTimeout(140);
  return true;
}
async function activateCollection(page,id){
  const b=page.locator(`.sbStoreCategoryRow button[data-collection-id="${id}"]`).first();
  if(!await b.count()) return false;
  await b.click();
  await page.waitForTimeout(100);
  return true;
}
async function settleImages(page){
  return page.evaluate(async()=>{
    if(document.fonts?.ready) await document.fonts.ready;
    const imgs=[...document.images];
    await Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{const done=()=>resolve();img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});setTimeout(done,5000);} )));
    await Promise.all(imgs.map(img=>typeof img.decode==='function'?img.decode().catch(()=>{}):Promise.resolve()));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  });
}
async function collect(page,collection,viewport){
  return page.evaluate(({collection,width})=>{
    const visible=node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0&&r.width>0&&r.height>0;};
    const cards=[...document.querySelectorAll('.marketPage.sbStoreMatch .storeGrid .storeCard')].filter(visible);
    const cardMetrics=cards.map(card=>{const r=card.getBoundingClientRect(),h3=card.querySelector('.itemCopy h3'),price=card.querySelector('.price,.sbStorePrice'),badge=card.querySelector('.sbStoreStateBadge'),img=card.querySelector('img');return{id:card.dataset.storeItemId||'',rect:{x:r.x,y:r.y,w:r.width,h:r.height},name:(h3?.textContent||'').trim(),nameFont:h3?parseFloat(getComputedStyle(h3).fontSize):0,price:(price?.textContent||'').replace(/\s+/g,' ').trim(),priceFont:price?parseFloat(getComputedStyle(price).fontSize):0,state:(badge?.textContent||'').trim(),stateCode:badge?.dataset?.state||'',aria:card.getAttribute('aria-label')||'',role:card.getAttribute('role')||'',tabindex:card.getAttribute('tabindex'),img:img?{src:img.getAttribute('src')||'',alt:img.getAttribute('alt'),loading:img.getAttribute('loading'),widthAttr:img.getAttribute('width'),heightAttr:img.getAttribute('height'),naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,rendered:[img.getBoundingClientRect().width,img.getBoundingClientRect().height]}:null,fallback:Boolean(card.querySelector('.sbStoreFallbackArt'))};});
    const doc=document.documentElement,body=document.body;
    const firstY=cardMetrics[0]?.rect?.y;
    const firstRow=cardMetrics.filter(c=>Math.abs(c.rect.y-firstY)<3);
    const category=document.querySelector(`.sbStoreCategoryRow button[data-collection-id="${collection}"]`);
    const categoryRect=category?.getBoundingClientRect();
    const tiers=[...document.querySelectorAll('.sbStoreTierRow button')].filter(visible).map(b=>{const r=b.getBoundingClientRect();return{w:r.width,h:r.height};});
    return {cards:cardMetrics,selected:[...document.querySelectorAll('.sbStoreCategoryRow button')].find(b=>b.classList.contains('selectedFilter'))?.dataset.collectionId||null,horizontalExcess:Math.max(doc.scrollWidth,body.scrollWidth)-innerWidth,scrollHeight:Math.max(doc.scrollHeight,body.scrollHeight),firstRowColumns:firstRow.length,category:categoryRect?{w:categoryRect.width,h:categoryRect.height}:null,tiers,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,viewportWidth:width};
  },{collection,width:viewport.width});
}
async function measureScroll(page){
  return page.evaluate(async()=>{
    const root=document.documentElement,maxY=Math.max(0,root.scrollHeight-innerHeight),samples=[];let prev=performance.now();
    for(let i=0;i<=60;i++){await new Promise(resolve=>requestAnimationFrame(now=>{samples.push(now-prev);prev=now;scrollTo(0,maxY*(i/60));resolve();}));}
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const resources=performance.getEntriesByType('resource').filter(e=>String(e.name).includes('/assets/catalog/'));
    scrollTo(0,0);
    return{maxScrollY:maxY,frames:samples.length,avgFrameMs:samples.reduce((a,b)=>a+b,0)/Math.max(1,samples.length),maxFrameMs:Math.max(...samples),slowFramesOver34ms:samples.filter(x=>x>34).length,verySlowFramesOver50ms:samples.filter(x=>x>50).length,catalogResourceCount:resources.length,catalogResourceDurationMs:resources.reduce((a,b)=>a+(Number(b.duration)||0),0),catalogDecodedBodyBytes:resources.reduce((a,b)=>a+(Number(b.decodedBodySize)||0),0)};
  });
}
async function selectedDetail(page,itemId){
  const card=page.locator(visibleSelector(itemId)).first();
  if(!await card.count()) return {present:false,reason:'changed-card-not-visible'};
  await card.scrollIntoViewIfNeeded();
  await card.click({position:{x:18,y:18}});
  await page.waitForTimeout(100);
  return page.evaluate(id=>{
    const card=document.querySelector(`.storeCard[data-store-item-id="${id}"]`),rail=document.querySelector('.sbStoreRightRail'),detail=document.querySelector('.sbStoreSelectedDetail'),preview=document.querySelector('.sbStorePreviewArt'),img=preview?.querySelector('img');
    const rr=rail?.getBoundingClientRect(),dr=detail?.getBoundingClientRect();
    const visible=node=>{if(!node)return false;const s=getComputedStyle(node),r=node.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;};
    return{present:Boolean(card&&rail&&detail),railVisible:visible(rail),detailVisible:visible(detail),selected:card?.getAttribute('aria-selected'),text:(detail?.textContent||'').replace(/\s+/g,' ').trim().slice(0,500),railRect:rr?{x:rr.x,y:rr.y,w:rr.width,h:rr.height}:null,detailRect:dr?{x:dr.x,y:dr.y,w:dr.width,h:dr.height}:null,previewImage:img?{src:img.getAttribute('src')||'',alt:img.getAttribute('alt'),loading:img.getAttribute('loading'),widthAttr:img.getAttribute('width'),heightAttr:img.getAttribute('height'),naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,rendered:[img.getBoundingClientRect().width,img.getBoundingClientRect().height]}:null,previewFallback:Boolean(preview?.querySelector('.sbStoreFallbackArt')),horizontalExcess:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth};
  },itemId);
}
async function keyboardReach(page){
  const card=page.locator('.marketPage.sbStoreMatch .storeGrid .storeCard:visible').last();
  if(!await card.count()) return {pass:false,reason:'no-card'};
  await card.focus(); await card.evaluate(n=>n.scrollIntoView({block:'center',inline:'nearest'})); await page.waitForTimeout(50);
  return card.evaluate(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);const overlays=[...document.querySelectorAll('.sidebar,.topbar')].filter(el=>{const q=el.getBoundingClientRect(),cs=getComputedStyle(el);return(cs.position==='fixed'||cs.position==='sticky')&&q.width>0&&q.height>0&&cs.visibility!=='hidden';});const overlap=overlays.some(el=>{if(el.contains(n))return false;const q=el.getBoundingClientRect();return Math.max(0,Math.min(r.right,q.right)-Math.max(r.left,q.left))*Math.max(0,Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top))>4;});const focusVisible=(parseFloat(s.outlineWidth)||0)>=2||(s.boxShadow&&s.boxShadow!=='none');return{pass:document.activeElement===n&&r.left>=-2&&r.right<=innerWidth+2&&r.top>=-2&&r.bottom<=innerHeight+2&&!overlap&&focusVisible,active:document.activeElement===n,focusVisible,overlap,rect:{x:r.x,y:r.y,w:r.width,h:r.height},scrollY};});
}
function changedIdsFor(collection){ return scope.changedIds.filter(id=>itemCollection(id)===collection); }

const browser=await chromium.launch({headless:true});
try{
  for(const motion of motionModes){
    for(const viewport of viewports){
      const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},deviceScaleFactor:1,reducedMotion:motion.value,colorScheme:'light',locale:'en-US',timezoneId:'UTC'});
      await context.addInitScript(()=>{globalThis.__sbCls=0;try{const po=new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)globalThis.__sbCls+=(e.value||0);});po.observe({type:'layout-shift',buffered:true});}catch{}});
      const page=await context.newPage(),pageErrors=[],consoleErrors=[];
      page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)));
      page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
      try{
        await page.goto(baseUrl,{waitUntil:'networkidle',timeout:20000});
        await page.waitForSelector('.sidebar .navBtn',{timeout:8000});
        if(!await openStore(page)) throw new Error('Could not open Store');
        for(const collection of scope.collections){
          if(!await activateCollection(page,collection)){record({motion:motion.name,viewport:viewport.name,collection,check:'category-navigation',status:'FAIL',releaseBlocking:true,message:'Category control not found.'});continue;}
          await settleImages(page);
          const beforeCls=await page.evaluate(()=>globalThis.__sbCls||0);
          const m=await collect(page,collection,viewport),cards=m.cards,imageCards=cards.filter(c=>c.img);
          const navigation=m.selected===collection&&cards.length>0;
          record({motion:motion.name,viewport:viewport.name,collection,check:'category-navigation',status:navigation?'PASS':'FAIL',releaseBlocking:!navigation,message:`selected=${m.selected}; cards=${cards.length}.`});
          const overflow=m.horizontalExcess<=1; record({motion:motion.name,viewport:viewport.name,collection,check:'horizontal-overflow',status:overflow?'PASS':'FAIL',releaseBlocking:!overflow,message:`page horizontal overflow=${m.horizontalExcess}px.`});
          if(viewport.width<=390){const pass=m.firstRowColumns===2;record({motion:motion.name,viewport:viewport.name,collection,check:'two-column-phone-grid',status:pass?'PASS':'FAIL',releaseBlocking:!pass,message:`first-row columns=${m.firstRowColumns}; expected 2.`});}
          const touch=cards.every(c=>c.rect.h>=44&&c.rect.w>=120)&&(m.category?.h||0)>=44&&m.tiers.length>0&&m.tiers.every(x=>x.h>=44); record({motion:motion.name,viewport:viewport.name,collection,check:'touch-targets',status:touch?'PASS':'FAIL',releaseBlocking:!touch,message:`cards/category/tier controls >=44px=${touch}.`});
          const minName=viewport.width<=320?12:viewport.width<=390?12.5:13; const readable=cards.every(c=>c.name&&c.price&&c.state&&c.nameFont>=minName&&c.priceFont>=11); record({motion:motion.name,viewport:viewport.name,collection,check:'card-readability',status:readable?'PASS':'FAIL',releaseBlocking:!readable,message:`names/prices/states readable=${readable}.`,metrics:{minName,sample:cards.slice(0,3).map(c=>({id:c.id,nameFont:c.nameFont,priceFont:c.priceFont,state:c.state}))}});
          const semantics=cards.every(c=>c.role==='button'&&c.tabindex!==null&&Boolean(c.aria)); record({motion:motion.name,viewport:viewport.name,collection,check:'card-semantics',status:semantics?'PASS':'FAIL',releaseBlocking:!semantics,message:`button role/focus/accessible label=${semantics}.`});
          const imgPass=imageCards.every(c=>c.img.loading==='lazy'&&c.img.naturalWidth>0&&c.img.naturalHeight>0&&c.img.alt!==null&&Boolean(c.img.widthAttr)&&Boolean(c.img.heightAttr)); record({motion:motion.name,viewport:viewport.name,collection,check:'image-loading-decode-alt-dimensions',status:imgPass?'PASS':'FAIL',releaseBlocking:!imgPass,message:`image-backed cards=${imageCards.length}; loaded/decoded/lazy/alt/intrinsic-dimensions=${imgPass}.`,metrics:{sample:imageCards.slice(0,4).map(c=>({id:c.id,natural:[c.img.naturalWidth,c.img.naturalHeight],attrs:[c.img.widthAttr,c.img.heightAttr],rendered:c.img.rendered}))}});
          const first=page.locator('.marketPage.sbStoreMatch .storeGrid .storeCard:visible').first(); if(await first.count()){await first.focus();const before=await first.getAttribute('aria-selected');await first.press('Enter');await page.waitForTimeout(50);const after=await first.getAttribute('aria-selected');const fsx=await first.evaluate(n=>{const s=getComputedStyle(n);return{active:document.activeElement===n,outlineWidth:s.outlineWidth,outlineStyle:s.outlineStyle,boxShadow:s.boxShadow};});const focusPass=fsx.active&&((parseFloat(fsx.outlineWidth)||0)>=2||(fsx.boxShadow&&fsx.boxShadow!=='none'))&&(after==='true'||before==='true');record({motion:motion.name,viewport:viewport.name,collection,check:'focus-keyboard-activation',status:focusPass?'PASS':'FAIL',releaseBlocking:!focusPass,message:`visible focus + Enter activation=${focusPass}.`,metrics:{before,after,...fsx}});}
          const reach=await keyboardReach(page);record({motion:motion.name,viewport:viewport.name,collection,check:'full-scroll-keyboard-reachability',status:reach.pass?'PASS':'FAIL',releaseBlocking:!reach.pass,message:`last card reachable clear of fixed HUD/dock=${reach.pass}.`,metrics:reach});
          const representative=changedIdsFor(collection)[0] || cards[0]?.id;
          if(representative){const detail=await selectedDetail(page,representative);const manifestItem=manifest.items?.[representative];const nameOk=detail.text?.includes(manifestItem?.name||'');const detailImgOk=!detail.previewImage||(detail.previewImage.naturalWidth>0&&detail.previewImage.naturalHeight>0&&detail.previewImage.alt!==null);const detailPass=detail.present&&detail.railVisible&&detail.detailVisible&&detail.selected==='true'&&nameOk&&detail.horizontalExcess<=1&&detailImgOk;record({motion:motion.name,viewport:viewport.name,collection,check:'selected-detail-readability',status:detailPass?'PASS':'FAIL',releaseBlocking:!detailPass,message:`representative ${representative} detail visible/readable/loaded/no-overflow=${detailPass}.`,metrics:detail});}
          const scroll=await measureScroll(page);const scrollPass=scroll.slowFramesOver34ms<=6;record({motion:motion.name,viewport:viewport.name,collection,check:'scroll-performance',status:scrollPass?'PASS':'FAIL',releaseBlocking:!scrollPass,message:`Chromium emulation avg=${scroll.avgFrameMs.toFixed(1)}ms; >34ms=${scroll.slowFramesOver34ms}/${scroll.frames}.`,metrics:{...scroll,conditions:'Playwright Chromium headless GitHub Actions; not physical-device performance'}});
          await page.waitForTimeout(40);const afterCls=await page.evaluate(()=>globalThis.__sbCls||0);const clsDelta=Math.max(0,afterCls-beforeCls);const clsPass=clsDelta<=0.1;record({motion:motion.name,viewport:viewport.name,collection,check:'layout-stability',status:clsPass?'PASS':'FAIL',releaseBlocking:!clsPass,message:`CLS delta=${clsDelta.toFixed(4)}.`,metrics:{clsDelta}});
          const shot=path.join(outputDir,`${motion.name}-${viewport.name}-${collection}.png`);await page.screenshot({path:shot,fullPage:false,animations:'disabled',caret:'hide'});
        }
        const errorPass=pageErrors.length===0&&consoleErrors.length===0;record({motion:motion.name,viewport:viewport.name,check:'runtime-errors',status:errorPass?'PASS':'FAIL',releaseBlocking:!errorPass,message:errorPass?'No pageerror/console.error events.':`${pageErrors.length} page errors; ${consoleErrors.length} console errors.`,metrics:{pageErrors,consoleErrors}});
      }catch(error){record({motion:motion.name,viewport:viewport.name,check:'run',status:'FAIL',releaseBlocking:true,message:String(error?.stack||error)});}finally{await context.close();}
    }
  }

  const changedImageId=scope.changedIds.find(id=>manifest.items?.[id]?.assetPath);
  if(changedImageId){
    const assetPath=manifest.items[changedImageId].assetPath;
    const collection=itemCollection(changedImageId);
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();
    await page.route(`**${assetPath}`,route=>route.abort());
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    try{await page.goto(baseUrl,{waitUntil:'networkidle',timeout:20000});await page.waitForSelector('.sidebar .navBtn',{timeout:8000});await openStore(page);await activateCollection(page,collection);await page.waitForTimeout(250);const state=await page.locator(visibleSelector(changedImageId)).first().evaluate(card=>({visible:Boolean(card.getBoundingClientRect().width&&card.getBoundingClientRect().height),aria:card.getAttribute('aria-label')||'',name:(card.querySelector('.itemCopy h3')?.textContent||'').trim(),fallback:Boolean(card.querySelector('.sbStoreFallbackArt')),imgNatural:card.querySelector('img')?.naturalWidth||0}));const pass=state.visible&&Boolean(state.aria)&&Boolean(state.name)&&errors.length===0;record({motion:'reduced',viewport:'phone-390x844',collection,check:'missing-image-behavior',status:pass?'PASS':'FAIL',releaseBlocking:!pass,message:`Aborted ${changedImageId} artwork keeps a usable labeled card without runtime error=${pass}.`,metrics:{changedImageId,assetPath,...state,errors}});}catch(error){record({motion:'reduced',viewport:'phone-390x844',collection,check:'missing-image-behavior',status:'FAIL',releaseBlocking:true,message:String(error?.stack||error)});}finally{await context.close();}
  }
} finally { await browser.close(); }

const report={schemaVersion:1,status:releaseBlockingCount===0?'PASS_CHANGED_CANONICAL_COLLECTIONS_BROWSER_EMULATION':'FAIL_CHANGED_CANONICAL_COLLECTIONS_BROWSER_EMULATION',generatedAt:new Date().toISOString(),sourceHead,scope,manifestVersion:manifest.version,currentManifestBlobSha:gitBlob('catalog-art-manifest.json'),runtimeBlobSha:gitBlob('src/catalogArtRuntime.js'),qaScriptBlobSha:gitBlob('scripts/catalogMobileChangedQa.mjs'),emulation:'Playwright Chromium headless on GitHub Actions ubuntu-24.04; normal and reduced-motion; not physical-device or screen-reader evidence',releaseBlockingCount,results,physicalDevicePerformanceTested:false,screenReaderTested:false};
await fsp.writeFile(path.join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
await fsp.writeFile(path.join(outputDir,'summary.txt'),`${report.status}\nsource=${sourceHead}\nmanifest=${report.currentManifestBlobSha} v${manifest.version}\nruntime=${report.runtimeBlobSha}\nchangedIds=${scope.changedIds.join(',')}\ncollections=${scope.collections.join(',')}\nreleaseBlockingCount=${releaseBlockingCount}\nphysical-device=NOT TESTED\nscreen-reader=NOT TESTED\n`);
if(strict&&releaseBlockingCount>0) process.exitCode=1;
