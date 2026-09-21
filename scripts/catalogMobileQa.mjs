import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.STARBLOX_QA_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.STARBLOX_QA_OUTPUT || 'artifacts/catalog-mobile-qa';
const strict = process.env.STARBLOX_QA_STRICT !== '0';
const sourceHead = process.env.GITHUB_SHA || null;
const viewports = [
  {name:'desktop-1408x1056',width:1408,height:1056},
  {name:'tablet-1024x768',width:1024,height:768},
  {name:'phone-390x844',width:390,height:844},
  {name:'phone-320x568',width:320,height:568}
];
const normalMotionControls = [
  {name:'tablet-1024x768-normal-motion',width:1024,height:768},
  {name:'phone-390x844-normal-motion',width:390,height:844}
];
const collectionIds = ['tops','bottoms','shoes','headwear','facegear','backgear','handgear','auras','companions','beds','seating','desks','lighting','wall','rugs','decor'];
const results=[];
let releaseBlockingCount=0;
await fs.mkdir(outputDir,{recursive:true});

function record(entry){
  results.push(entry);
  if(entry.releaseBlocking) releaseBlockingCount+=1;
  console.log(`[${entry.status}] ${entry.viewport || 'global'} ${entry.collection || ''} ${entry.check}: ${entry.message}`);
}

async function clickNav(page,label){
  const buttons=page.locator('.sidebar .navBtn');
  for(let i=0;i<await buttons.count();i+=1){
    const b=buttons.nth(i);
    const text=(await b.innerText().catch(()=>'' )).trim();
    const aria=(await b.getAttribute('aria-label').catch(()=>''))||'';
    if(text.toLowerCase()===label.toLowerCase()||aria.toLowerCase()===label.toLowerCase()){
      await b.click();
      await page.waitForTimeout(120);
      return true;
    }
  }
  return false;
}

async function openStore(page){
  if(!await clickNav(page,'Store')) return false;
  await page.waitForSelector('.marketPage.sbStoreMatch',{state:'attached',timeout:8000});
  await page.waitForSelector('.marketPage.sbStoreMatch .storeGrid',{state:'attached',timeout:8000});
  await page.waitForTimeout(160);
  return true;
}

async function activateCollection(page,id){
  const button=page.locator(`.sbStoreCategoryRow button[data-collection-id="${id}"]`).first();
  if(!await button.count()) return false;
  await button.click();
  await page.waitForTimeout(120);
  return true;
}

async function collectStoreMetrics(page,viewport,collection){
  return page.evaluate(({width,collection})=>{
    const visible = node => {
      const s=getComputedStyle(node),r=node.getBoundingClientRect();
      return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0&&r.width>0&&r.height>0;
    };
    const cards=[...document.querySelectorAll('.marketPage.sbStoreMatch .storeGrid .storeCard')].filter(visible);
    const cardMetrics=cards.map(card=>{
      const r=card.getBoundingClientRect();
      const h3=card.querySelector('.itemCopy h3');
      const price=card.querySelector('.price,.sbStorePrice');
      const badge=card.querySelector('.sbStoreStateBadge');
      const img=card.querySelector('img');
      const fallback=card.querySelector('.sbStoreFallbackArt');
      return {
        id:card.dataset.storeItemId||'',
        x:r.x,y:r.y,width:r.width,height:r.height,
        name:(h3?.textContent||'').trim(),
        nameFont:h3?parseFloat(getComputedStyle(h3).fontSize):0,
        price:(price?.textContent||'').replace(/\s+/g,' ').trim(),
        priceFont:price?parseFloat(getComputedStyle(price).fontSize):0,
        state:(badge?.textContent||'').trim(),
        aria:card.getAttribute('aria-label')||'',
        role:card.getAttribute('role')||'',
        tabindex:card.getAttribute('tabindex'),
        image:img?{
          src:img.getAttribute('src')||'',
          alt:img.getAttribute('alt'),
          loading:img.getAttribute('loading'),
          widthAttr:img.getAttribute('width'),
          heightAttr:img.getAttribute('height'),
          naturalWidth:img.naturalWidth,
          naturalHeight:img.naturalHeight,
          renderedWidth:img.getBoundingClientRect().width,
          renderedHeight:img.getBoundingClientRect().height
        }:null,
        fallback:Boolean(fallback)
      };
    });
    const doc=document.documentElement,body=document.body;
    const horizontalExcess=Math.max(doc.scrollWidth,body.scrollWidth)-innerWidth;
    const firstY=cardMetrics[0]?.y;
    const firstRow=cardMetrics.filter(c=>Math.abs(c.y-firstY)<3);
    const focusTarget=cards[0]||null;
    let focusStyle=null;
    if(focusTarget){
      focusTarget.focus();
      const s=getComputedStyle(focusTarget);
      focusStyle={outlineWidth:s.outlineWidth,outlineStyle:s.outlineStyle,outlineColor:s.outlineColor,boxShadow:s.boxShadow,active:document.activeElement===focusTarget};
    }
    const categoryButton=document.querySelector(`.sbStoreCategoryRow button[data-collection-id="${collection}"]`);
    const catRect=categoryButton?.getBoundingClientRect();
    const tierRects=[...document.querySelectorAll('.sbStoreTierRow button')].filter(visible).map(b=>{const r=b.getBoundingClientRect();return{w:r.width,h:r.height};});
    return {
      viewportWidth:width,
      innerWidth,
      horizontalExcess,
      cards:cardMetrics,
      firstRowColumns:firstRow.length,
      focusStyle,
      categoryButton:catRect?{w:catRect.width,h:catRect.height,pressed:categoryButton.getAttribute('aria-pressed')}:null,
      tierButtons:tierRects,
      scrollHeight:Math.max(doc.scrollHeight,body.scrollHeight),
      reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
      selectedCategory:[...document.querySelectorAll('.sbStoreCategoryRow button')].find(b=>b.classList.contains('selectedFilter'))?.dataset.collectionId||null
    };
  },{width:viewport.width,collection});
}

async function measureLongScroll(page){
  return page.evaluate(async()=>{
    const root=document.documentElement;
    const maxY=Math.max(0,root.scrollHeight-innerHeight);
    const samples=[];
    let prev=performance.now();
    const frames=60;
    for(let i=0;i<=frames;i+=1){
      await new Promise(resolve=>requestAnimationFrame(now=>{
        const dt=now-prev;prev=now;samples.push(dt);
        scrollTo(0,maxY*(i/frames));
        resolve();
      }));
    }
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const slow=samples.filter(v=>v>34).length;
    const verySlow=samples.filter(v=>v>50).length;
    const max=Math.max(...samples);
    const avg=samples.reduce((a,b)=>a+b,0)/Math.max(1,samples.length);
    const resources=performance.getEntriesByType('resource').filter(e=>String(e.name).includes('/assets/catalog/'));
    const transferBytes=resources.reduce((sum,e)=>sum+(Number(e.transferSize)||0),0);
    const resourceDurationMs=resources.reduce((sum,e)=>sum+(Number(e.duration)||0),0);
    scrollTo(0,0);
    return {maxScrollY:maxY,frames:samples.length,avgFrameMs:avg,maxFrameMs:max,slowFramesOver34ms:slow,verySlowFramesOver50ms:verySlow,catalogResourceCount:resources.length,catalogTransferBytes:transferBytes,catalogResourceDurationMs:resourceDurationMs};
  });
}

async function collectMotionMetrics(page){
  return page.evaluate(()=>{
    const root=document.querySelector('.marketPage.sbStoreMatch');
    const animations=root?.getAnimations?.({subtree:true})||[];
    const durations=animations.map(animation=>{
      try{
        const timing=animation.effect?.getComputedTiming?.();
        const duration=Number(timing?.duration);
        return Number.isFinite(duration)?duration:null;
      }catch{return null;}
    }).filter(v=>v!==null);
    return {
      prefersReducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
      activeAnimationCount:animations.length,
      longestFiniteAnimationMs:durations.length?Math.max(...durations):0,
      animationDurationsMs:durations.slice(0,20)
    };
  });
}

async function collectContrastMetrics(page){
  return page.evaluate(()=>{
    const parseColor=value=>{
      const m=String(value||'').match(/rgba?\(([^)]+)\)/i);
      if(!m) return null;
      const p=m[1].split(',').map(v=>Number.parseFloat(v.trim()));
      if(p.length<3||p.slice(0,3).some(Number.isNaN)) return null;
      return {r:p[0],g:p[1],b:p[2],a:p.length>3&&Number.isFinite(p[3])?p[3]:1};
    };
    const luminance=c=>{
      const channel=v=>{const x=v/255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);};
      return 0.2126*channel(c.r)+0.7152*channel(c.g)+0.0722*channel(c.b);
    };
    const ratio=(a,b)=>{const l1=luminance(a),l2=luminance(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);};
    const solidBackground=node=>{
      for(let el=node?.parentElement;el&&el!==document.documentElement;el=el.parentElement){
        const style=getComputedStyle(el);
        if(style.backgroundImage&&style.backgroundImage!=='none') return null;
        const color=parseColor(style.backgroundColor);
        if(color&&color.a>=0.95) return color;
      }
      const body=parseColor(getComputedStyle(document.body).backgroundColor);
      return body&&body.a>=0.95?body:null;
    };
    const candidates=[
      ...document.querySelectorAll('.marketPage.sbStoreMatch .storeGrid .storeCard .itemCopy h3'),
      ...document.querySelectorAll('.marketPage.sbStoreMatch .storeGrid .storeCard .price,.marketPage.sbStoreMatch .storeGrid .storeCard .sbStorePrice'),
      ...document.querySelectorAll('.marketPage.sbStoreMatch .storeGrid .storeCard .sbStoreStateBadge')
    ].slice(0,24);
    const samples=[];
    for(const el of candidates){
      const fg=parseColor(getComputedStyle(el).color);
      const bg=solidBackground(el);
      if(!fg||!bg) continue;
      samples.push({text:(el.textContent||'').trim().slice(0,60),foreground:getComputedStyle(el).color,background:`rgb(${bg.r}, ${bg.g}, ${bg.b})`,ratio:ratio(fg,bg)});
    }
    return {measured:samples.length,samples,minimum:samples.length?Math.min(...samples.map(x=>x.ratio)):null};
  });
}

async function testKeyboardActivation(page,viewport,collection){
  const card=page.locator('.marketPage.sbStoreMatch .storeGrid .storeCard:visible').first();
  if(!await card.count()) return;
  await card.focus();
  const before=await card.getAttribute('aria-pressed');
  await card.press('Enter');
  await page.waitForTimeout(80);
  const after=await card.getAttribute('aria-pressed');
  const id=await card.getAttribute('data-store-item-id');
  const pass=after==='true' || before==='true';
  record({viewport:viewport.name,collection,check:'keyboard-card-activation',status:pass?'PASS':'FAIL',releaseBlocking:!pass,message:`Card ${id||'unknown'} keyboard activation selected the item=${pass}.`,metrics:{before,after,id}});
}

async function testKeyboardTraversalAndReachability(page,viewport){
  await activateCollection(page,'tops');
  const start=page.locator('.sbStoreCategoryRow button[data-collection-id="tops"]').first();
  if(!await start.count()){
    record({viewport:viewport.name,check:'keyboard-traversal',status:'FAIL',releaseBlocking:true,message:'Could not locate the Tops category control to start traversal.'});
    return;
  }
  await start.focus();
  const visited=[];
  let sawTier=false,sawCard=false,clipped=0,obscured=0;
  for(let i=0;i<40;i+=1){
    await page.keyboard.press('Tab');
    await page.waitForTimeout(20);
    const active=await page.evaluate(()=>{
      const el=document.activeElement;
      if(!el||el===document.body) return null;
      const r=el.getBoundingClientRect();
      const style=getComputedStyle(el);
      const visible=style.display!=='none'&&style.visibility!=='hidden'&&r.width>0&&r.height>0;
      const inStore=Boolean(el.closest('.marketPage.sbStoreMatch'));
      const fits=visible&&r.left>=-2&&r.right<=innerWidth+2&&r.top>=-2&&r.bottom<=innerHeight+2;
      const overlays=[...document.querySelectorAll('.sidebar,.topbar')].filter(node=>{
        const s=getComputedStyle(node),q=node.getBoundingClientRect();
        return (s.position==='fixed'||s.position==='sticky')&&s.display!=='none'&&s.visibility!=='hidden'&&q.width>0&&q.height>0;
      });
      const overlap=overlays.some(node=>{
        if(node.contains(el)) return false;
        const q=node.getBoundingClientRect();
        return Math.max(0,Math.min(r.right,q.right)-Math.max(r.left,q.left))*Math.max(0,Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top))>4;
      });
      return {
        tag:el.tagName,
        text:(el.getAttribute('aria-label')||el.textContent||'').replace(/\s+/g,' ').trim().slice(0,80),
        inStore,
        tier:Boolean(el.closest('.sbStoreTierRow')),
        card:el.classList.contains('storeCard')||Boolean(el.closest('.storeCard')),
        fits,
        overlap,
        rect:{x:r.x,y:r.y,w:r.width,h:r.height}
      };
    });
    if(!active) continue;
    visited.push(active);
    if(active.inStore&&active.tier) sawTier=true;
    if(active.inStore&&active.card) sawCard=true;
    if(active.inStore&&!active.fits) clipped+=1;
    if(active.inStore&&active.overlap) obscured+=1;
    if(sawTier&&sawCard&&visited.length>=8) break;
  }
  const traversalPass=sawTier&&sawCard&&clipped===0&&obscured===0;
  record({viewport:viewport.name,check:'keyboard-traversal',status:traversalPass?'PASS':'FAIL',releaseBlocking:!traversalPass,message:`Tab traversal reached tier controls=${sawTier}, catalog cards=${sawCard}, clipped=${clipped}, obscured-by-fixed-chrome=${obscured}.`,metrics:{visitedCount:visited.length,visited:visited.slice(0,24)}});

  const last=page.locator('.marketPage.sbStoreMatch .storeGrid .storeCard:visible').last();
  if(!await last.count()){
    record({viewport:viewport.name,check:'last-card-keyboard-reachability',status:'FAIL',releaseBlocking:true,message:'No visible last card found.'});
    return;
  }
  await last.focus();
  await last.evaluate(node=>node.scrollIntoView({block:'center',inline:'nearest'}));
  await page.waitForTimeout(80);
  const reach=await last.evaluate(node=>{
    const r=node.getBoundingClientRect();
    const active=document.activeElement===node;
    const fits=r.left>=-2&&r.right<=innerWidth+2&&r.top>=-2&&r.bottom<=innerHeight+2;
    const overlays=[...document.querySelectorAll('.sidebar,.topbar')].filter(el=>{
      const s=getComputedStyle(el),q=el.getBoundingClientRect();
      return (s.position==='fixed'||s.position==='sticky')&&s.display!=='none'&&s.visibility!=='hidden'&&q.width>0&&q.height>0;
    });
    const overlap=overlays.some(el=>{
      if(el.contains(node)) return false;
      const q=el.getBoundingClientRect();
      return Math.max(0,Math.min(r.right,q.right)-Math.max(r.left,q.left))*Math.max(0,Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top))>4;
    });
    return {active,fits,overlap,rect:{x:r.x,y:r.y,w:r.width,h:r.height},scrollY};
  });
  const reachPass=reach.active&&reach.fits&&!reach.overlap;
  record({viewport:viewport.name,check:'last-card-keyboard-reachability',status:reachPass?'PASS':'FAIL',releaseBlocking:!reachPass,message:`Last Tops card can be focused and scrolled clear of fixed HUD/dock=${reachPass}.`,metrics:reach});
}

async function inspectCollection(page,viewport,collection){
  if(!await activateCollection(page,collection)){
    record({viewport:viewport.name,collection,check:'category-navigation',status:'FAIL',releaseBlocking:true,message:'Category control not found.'});
    return;
  }
  const m=await collectStoreMetrics(page,viewport,collection);
  const cards=m.cards;
  record({viewport:viewport.name,collection,check:'category-navigation',status:m.selectedCategory===collection?'PASS':'FAIL',releaseBlocking:m.selectedCategory!==collection,message:`Selected category=${m.selectedCategory}; visible cards=${cards.length}.`});

  const overflowPass=m.horizontalExcess<=1;
  record({viewport:viewport.name,collection,check:'horizontal-overflow',status:overflowPass?'PASS':'FAIL',releaseBlocking:!overflowPass,message:overflowPass?'No page-level horizontal overflow.':`Page exceeds viewport by ${m.horizontalExcess}px.`,metrics:{horizontalExcess:m.horizontalExcess,scrollHeight:m.scrollHeight}});

  const expectedCols=viewport.width<=390?2:null;
  if(expectedCols){
    const pass=m.firstRowColumns===2;
    record({viewport:viewport.name,collection,check:'two-column-phone-grid',status:pass?'PASS':'FAIL',releaseBlocking:!pass,message:`First row columns=${m.firstRowColumns}; expected 2.`});
  }

  const cardTouch=cards.length>0&&cards.every(c=>c.width>=120&&c.height>=44);
  const controlsTouch=(m.categoryButton?.h||0)>=44&&m.tierButtons.length>0&&m.tierButtons.every(b=>b.h>=44);
  record({viewport:viewport.name,collection,check:'touch-targets',status:cardTouch&&controlsTouch?'PASS':'FAIL',releaseBlocking:!(cardTouch&&controlsTouch),message:`Cards touch-safe=${cardTouch}; category/tier controls touch-safe=${controlsTouch}.`});

  const minName=viewport.width<=320?12:viewport.width<=390?12.5:13;
  const readable=cards.length>0&&cards.every(c=>c.name&&c.price&&c.state&&c.nameFont>=minName&&c.priceFont>=11);
  record({viewport:viewport.name,collection,check:'card-readable-state',status:readable?'PASS':'FAIL',releaseBlocking:!readable,message:`Visible cards=${cards.length}; names/prices/states meet minimum readable thresholds=${readable}.`,metrics:{minNameFont:minName,sample:cards.slice(0,3).map(({id,nameFont,priceFont,state})=>({id,nameFont,priceFont,state}))}});

  const semantic=cards.length>0&&cards.every(c=>c.role==='button'&&c.tabindex!==null&&Boolean(c.aria));
  record({viewport:viewport.name,collection,check:'card-semantics',status:semantic?'PASS':'FAIL',releaseBlocking:!semantic,message:`All visible cards have button semantics, keyboard focus and accessible labels=${semantic}.`});

  const imageCards=cards.filter(c=>c.image);
  const lazyPass=imageCards.every(c=>c.image.loading==='lazy');
  const altPass=imageCards.every(c=>c.image.alt!==null && (c.image.alt==='' ? Boolean(c.aria) : true));
  const dimensionsPass=imageCards.every(c=>Boolean(c.image.widthAttr)&&Boolean(c.image.heightAttr));
  const loadedPass=imageCards.every(c=>c.image.naturalWidth>0&&c.image.naturalHeight>0);
  record({viewport:viewport.name,collection,check:'image-loading-and-alternatives',status:lazyPass&&altPass&&loadedPass?'PASS':'FAIL',releaseBlocking:!(lazyPass&&altPass&&loadedPass),message:`Images=${imageCards.length}; lazy=${lazyPass}; alternative semantics=${altPass}; loaded=${loadedPass}.`,metrics:{imageCards:imageCards.length,fallbackCards:cards.filter(c=>c.fallback).length}});
  record({viewport:viewport.name,collection,check:'explicit-image-dimensions',status:dimensionsPass?'PASS':'FAIL',releaseBlocking:!dimensionsPass,message:imageCards.length===0?'No image-backed cards in this category yet.':`All ${imageCards.length} image-backed cards declare width/height attributes=${dimensionsPass}.`,metrics:{sample:imageCards.slice(0,3).map(c=>({id:c.id,width:c.image.widthAttr,height:c.image.heightAttr,rendered:[c.image.renderedWidth,c.image.renderedHeight]}))}});

  const focus=m.focusStyle;
  const focusPass=Boolean(focus?.active)&&((parseFloat(focus?.outlineWidth)||0)>=3||String(focus?.boxShadow||'').toLowerCase()!=='none');
  record({viewport:viewport.name,collection,check:'focus-visible',status:focusPass?'PASS':'FAIL',releaseBlocking:!focusPass,message:`First card receives visible keyboard focus treatment=${focusPass}.`,metrics:focus});

  const motionPass=m.reducedMotion;
  record({viewport:viewport.name,collection,check:'reduced-motion-context',status:motionPass?'PASS':'FAIL',releaseBlocking:!motionPass,message:`Browser emulation reports prefers-reduced-motion=${m.reducedMotion}.`});

  await testKeyboardActivation(page,viewport,collection);
  if(viewport.name==='desktop-1408x1056'||viewport.name==='phone-390x844'){
    await page.screenshot({path:path.join(outputDir,`store-${viewport.name}-${collection}.png`),fullPage:false});
  }
}

async function runNormalMotionControl(browser,viewport){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},reducedMotion:'no-preference'});
  const page=await context.newPage();
  const pageErrors=[],consoleErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)));
  page.on('console',m=>{if(m.type()==='error') consoleErrors.push(m.text());});
  try{
    await page.goto(baseUrl,{waitUntil:'networkidle',timeout:20000});
    await page.waitForSelector('.sidebar .navBtn',{timeout:8000});
    if(!await openStore(page)) throw new Error('Could not open Store from primary navigation.');
    await activateCollection(page,'tops');
    const contextMetrics=await page.evaluate(()=>({reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,horizontalExcess:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,columns:(()=>{const cards=[...document.querySelectorAll('.marketPage.sbStoreMatch .storeGrid .storeCard')].filter(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;});const y=cards[0]?.getBoundingClientRect().y;return cards.filter(c=>Math.abs(c.getBoundingClientRect().y-y)<3).length;})()}));
    const motion=await collectMotionMetrics(page);
    const scroll=await measureLongScroll(page);
    const contextPass=!contextMetrics.reduced&&contextMetrics.horizontalExcess<=1&&(viewport.width>390||contextMetrics.columns===2);
    record({viewport:viewport.name,collection:'tops',check:'normal-motion-context',status:contextPass?'PASS':'FAIL',releaseBlocking:!contextPass,message:`Normal-motion emulation active=${!contextMetrics.reduced}; horizontal overflow=${contextMetrics.horizontalExcess}px; first-row columns=${contextMetrics.columns}.`,metrics:{...contextMetrics,...motion}});
    const scrollPass=viewport.width>767||scroll.slowFramesOver34ms<=6;
    record({viewport:viewport.name,collection:'tops',check:'normal-motion-scroll-probe',status:scrollPass?'PASS':'FAIL',releaseBlocking:!scrollPass,message:`Normal-motion Chromium scroll: avg=${scroll.avgFrameMs.toFixed(1)}ms, >34ms=${scroll.slowFramesOver34ms}/${scroll.frames}.`,metrics:{...scroll,emulation:'Playwright Chromium headless; not physical-device performance'}});
    const errorsPass=pageErrors.length===0&&consoleErrors.length===0;
    record({viewport:viewport.name,collection:'tops',check:'normal-motion-runtime-errors',status:errorsPass?'PASS':'FAIL',releaseBlocking:!errorsPass,message:errorsPass?'No pageerror or console.error in normal-motion control.':`${pageErrors.length} page errors; ${consoleErrors.length} console errors.`,metrics:{pageErrors,consoleErrors}});
    await page.screenshot({path:path.join(outputDir,`store-${viewport.name}-tops.png`),fullPage:false});
  }catch(error){
    record({viewport:viewport.name,collection:'tops',check:'normal-motion-control',status:'FAIL',releaseBlocking:true,message:String(error?.stack||error)});
  }finally{await context.close();}
}

const browser=await chromium.launch({headless:true});
try{
  for(const viewport of viewports){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},reducedMotion:'reduce'});
    await context.addInitScript(()=>{
      globalThis.__sbLayoutShiftValue=0;
      try{
        const observer=new PerformanceObserver(list=>{
          for(const entry of list.getEntries()) if(!entry.hadRecentInput) globalThis.__sbLayoutShiftValue+=(entry.value||0);
        });
        observer.observe({type:'layout-shift',buffered:true});
      }catch{}
    });
    const page=await context.newPage();
    const pageErrors=[],consoleErrors=[];
    page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)));
    page.on('console',m=>{if(m.type()==='error') consoleErrors.push(m.text());});
    try{
      await page.goto(baseUrl,{waitUntil:'networkidle',timeout:20000});
      await page.waitForSelector('.sidebar .navBtn',{timeout:8000});
      if(!await openStore(page)) throw new Error('Could not open Store from primary navigation.');
      for(const collection of collectionIds) await inspectCollection(page,viewport,collection);
      await activateCollection(page,'tops');
      await testKeyboardTraversalAndReachability(page,viewport);
      const contrast=await collectContrastMetrics(page);
      if(contrast.measured===0){
        record({viewport:viewport.name,collection:'tops',check:'computed-contrast',status:'NOT_TESTED',releaseBlocking:false,message:'No text sample had an unambiguous opaque solid CSS background; exact contrast remains for screenshot/device tooling.',metrics:contrast});
      }else{
        const contrastPass=contrast.minimum>=4.5;
        record({viewport:viewport.name,collection:'tops',check:'computed-contrast',status:contrastPass?'PASS':'FAIL',releaseBlocking:!contrastPass,message:`Measured ${contrast.measured} solid-background text samples; minimum contrast=${contrast.minimum.toFixed(2)}:1.`,metrics:contrast});
      }
      const motion=await collectMotionMetrics(page);
      const reducedMotionPass=motion.prefersReducedMotion&&motion.longestFiniteAnimationMs<=100;
      record({viewport:viewport.name,collection:'tops',check:'reduced-motion-behavior',status:reducedMotionPass?'PASS':'FAIL',releaseBlocking:!reducedMotionPass,message:`Reduced-motion active=${motion.prefersReducedMotion}; active animations=${motion.activeAnimationCount}; longest finite animation=${motion.longestFiniteAnimationMs}ms.`,metrics:motion});
      const scroll=await measureLongScroll(page);
      const cls=await page.evaluate(()=>Number(globalThis.__sbLayoutShiftValue||0));
      const scrollPass=viewport.width>767||scroll.slowFramesOver34ms<=6;
      record({viewport:viewport.name,check:'long-scroll-probe',status:scrollPass?'PASS':'FAIL',releaseBlocking:!scrollPass,message:`Chromium ${viewport.width}x${viewport.height}: maxScroll=${Math.round(scroll.maxScrollY)}px, avg frame=${scroll.avgFrameMs.toFixed(1)}ms, >34ms frames=${scroll.slowFramesOver34ms}/${scroll.frames}, catalog resources=${scroll.catalogResourceCount}.`,metrics:{...scroll,cls,emulation:'Playwright Chromium headless; not physical-device performance'}});
      const clsPass=cls<=0.10;
      record({viewport:viewport.name,check:'layout-stability-probe',status:clsPass?'PASS':'FAIL',releaseBlocking:!clsPass,message:`Observed cumulative layout shift=${cls.toFixed(4)} during catalog session.`,metrics:{cls,limit:0.10}});
      if(pageErrors.length||consoleErrors.length){
        record({viewport:viewport.name,check:'runtime-errors',status:'FAIL',releaseBlocking:true,message:`${pageErrors.length} page errors; ${consoleErrors.length} console errors.`,metrics:{pageErrors,consoleErrors}});
      }else record({viewport:viewport.name,check:'runtime-errors',status:'PASS',releaseBlocking:false,message:'No pageerror or console.error events observed.'});
    }catch(error){
      record({viewport:viewport.name,check:'qa-run',status:'FAIL',releaseBlocking:true,message:String(error?.stack||error)});
    }finally{await context.close();}
  }
  for(const viewport of normalMotionControls) await runNormalMotionControl(browser,viewport);
}finally{await browser.close();}

const summary={
  generatedAt:new Date().toISOString(),sourceHead,baseUrl,
  emulation:'Playwright 1.55 Chromium headless on GitHub Actions ubuntu-24.04; reduced-motion full matrix at 1408x1056, 1024x768, 390x844, 320x568; normal-motion Tops controls at 1024x768 and 390x844. This is browser emulation, not physical-device or screen-reader performance.',
  collectionCount:collectionIds.length,
  releaseBlockingCount,
  status:releaseBlockingCount===0?'PASS':'FAIL',
  results
};
await fs.writeFile(path.join(outputDir,'report.json'),JSON.stringify(summary,null,2));
await fs.writeFile(path.join(outputDir,'summary.txt'),`${summary.status}: ${releaseBlockingCount} catalog mobile/accessibility release-blocking checks at ${sourceHead||'unknown head'}\n`);
console.log(`CATALOG_MOBILE_QA_STATUS=${summary.status}`);
console.log(`CATALOG_MOBILE_QA_RELEASE_BLOCKING_COUNT=${releaseBlockingCount}`);
console.log(`CATALOG_MOBILE_QA_SOURCE_HEAD=${sourceHead||'unknown'}`);
if(strict&&releaseBlockingCount>0) process.exitCode=1;
