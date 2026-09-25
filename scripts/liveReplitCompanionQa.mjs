#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const baseUrl=process.env.STARBLOX_QA_URL||'https://star-blox.replit.app';
const outputDir=process.env.STARBLOX_QA_OUTPUT||'artifacts/live-replit-companion-qa';
// Re-run marker: current deployment-tolerant live companion evidence probe.
// QA replay marker: deterministic-finalization-20260925
const targets=[
  ['companions-2','Moon Cat'],
  ['companions-5','Pebble Turtle'],
  ['companions-6','Comet Fox'],
  ['companions-7','Story Owl'],
  ['companions-8','Bubble Axolotl'],
  ['companions-9','Garden Snail'],
  ['companions-12','Star Unicorn']
];

await fs.mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1408,height:1056},reducedMotion:'reduce'});
const page=await context.newPage();
const consoleErrors=[],pageErrors=[],requestFailures=[];
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
page.on('pageerror',e=>pageErrors.push(String(e?.stack||e)));
page.on('requestfailed',r=>requestFailures.push({url:r.url(),error:r.failure()?.errorText||'unknown'}));

const report={
  generatedAt:null,
  baseUrl,
  liveAuthority:'REPLIT_PUBLIC_DEPLOYMENT',
  mutationPolicy:'READ_ONLY_REMOTE__EPHEMERAL_LOCAL_BROWSER_STATE_ONLY_FOR_BUDDY_PREVIEW',
  storeMounted:false,
  storeSelector:null,
  categorySelector:null,
  targets:[],
  consoleErrors,
  pageErrors,
  requestFailures,
  fatal:null
};

function visible(el){
  if(!el)return false;
  const s=getComputedStyle(el),r=el.getBoundingClientRect();
  return s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity||1)>0&&r.width>0&&r.height>0;
}

async function clickPrimaryNav(re){
  const buttons=page.locator('.sidebar .navBtn');
  for(let i=0;i<await buttons.count();i+=1){
    const b=buttons.nth(i);
    const text=((await b.innerText().catch(()=>''))||'').trim();
    const aria=(await b.getAttribute('aria-label').catch(()=>''))||'';
    if(!re.test(text)&&!re.test(aria))continue;
    await b.scrollIntoViewIfNeeded();
    const box=await b.boundingBox();
    if(!box)continue;
    const point={x:box.x+box.width/2,y:box.y+box.height/2};
    const hit=await page.evaluate(({x,y})=>{
      const e=document.elementFromPoint(x,y);
      const nav=e?.closest?.('.sidebar .navBtn');
      return nav?{text:(nav.textContent||'').replace(/\s+/g,' ').trim(),aria:nav.getAttribute('aria-label')||''}:null;
    },point);
    if(!hit)continue;
    await page.mouse.click(point.x,point.y);
    await page.waitForTimeout(400);
    return {text,aria,point,hit};
  }
  return null;
}

async function findStoreRoot(){
  const selectors=['.marketPage.sbStoreMatch','.marketPage','[data-screen="store"]','.storePage'];
  for(const selector of selectors){
    const loc=page.locator(selector).first();
    if(await loc.count()&&await loc.isVisible().catch(()=>false))return {selector,loc};
  }
  return null;
}

async function findGrid(root){
  const selectors=['.storeGrid','.catalogGrid','[data-store-grid]'];
  for(const selector of selectors){
    const loc=root.locator(selector).first();
    if(await loc.count())return {selector,loc};
  }
  return null;
}

async function activateCompanions(root){
  const selectors=[
    '.sbStoreCategoryRow button[data-collection-id="companions"]',
    '.filterRow button[data-collection-id="companions"]',
    'button[data-collection-id="companions"]'
  ];
  for(const selector of selectors){
    const loc=root.locator(selector).first();
    if(await loc.count()&&await loc.isVisible().catch(()=>false)){
      await loc.click();
      await page.waitForTimeout(300);
      return selector;
    }
  }
  const buttons=root.locator('button');
  for(let i=0;i<await buttons.count();i+=1){
    const b=buttons.nth(i);
    const text=((await b.innerText().catch(()=>''))||'').trim();
    if(/companion|buddy|pet/i.test(text)){
      await b.click();
      await page.waitForTimeout(300);
      return 'button:text-companion';
    }
  }
  return null;
}

async function findCard(root,id,name){
  const selectors=[
    `.storeCard[data-store-item-id="${id}"]`,
    `[data-store-item-id="${id}"]`,
    `.storeCard[data-item-id="${id}"]`,
    `[data-item-id="${id}"]`
  ];
  for(const selector of selectors){
    const loc=root.locator(selector).first();
    if(await loc.count()&&await loc.isVisible().catch(()=>false))return loc;
  }
  const cards=root.locator('.storeCard');
  for(let i=0;i<await cards.count();i+=1){
    const card=cards.nth(i);
    const text=((await card.innerText().catch(()=>''))||'').replace(/\s+/g,' ').trim();
    if(text.toLowerCase().includes(name.toLowerCase()))return card;
  }
  return null;
}

async function inspectCard(card,id,name){
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(80);
  const metrics=await card.evaluate((node,{id,name})=>{
    const img=node.querySelector('img');
    const fallback=node.querySelector('.itemArtFallback,.sbStoreFallbackArt');
    const r=node.getBoundingClientRect();
    return {
      id,name,
      text:(node.textContent||'').replace(/\s+/g,' ').trim().slice(0,500),
      fallback:Boolean(fallback),
      rect:{x:r.x,y:r.y,width:r.width,height:r.height},
      image:img?{
        src:img.getAttribute('src')||'',
        alt:img.getAttribute('alt')||'',
        complete:img.complete,
        naturalWidth:img.naturalWidth,
        naturalHeight:img.naturalHeight,
        renderedWidth:img.getBoundingClientRect().width,
        renderedHeight:img.getBoundingClientRect().height
      }:null,
      backgroundImage:getComputedStyle(node.querySelector('.itemArt,.itemArtFrame,.itemVisual')||node).backgroundImage||''
    };
  },{id,name});
  await card.screenshot({path:path.join(outputDir,`${id}-card.png`)});
  return metrics;
}

async function inspectEnhancedPreview(card,id){
  const rightRail=page.locator('.sbStoreRightRail').first();
  const enhanced=Boolean(await rightRail.count()&&await rightRail.isVisible().catch(()=>false));
  if(!enhanced)return {available:false,detailPresent:false,avatarStagePresent:false};
  await card.click({position:{x:12,y:12}});
  await page.waitForTimeout(250);
  const result=await page.evaluate(expectedId=>{
    const detail=document.querySelector('.sbStoreSelectedDetail');
    const stage=document.querySelector('.sbStoreAvatarStage');
    const detailImg=detail?.querySelector('img');
    const stageImgs=[...(stage?.querySelectorAll('img')||[])].map(img=>({
      src:img.getAttribute('src')||'',
      alt:img.getAttribute('alt')||'',
      naturalWidth:img.naturalWidth,
      naturalHeight:img.naturalHeight
    }));
    return {
      available:true,
      expectedId,
      detailPresent:Boolean(detail),
      detailText:(detail?.textContent||'').replace(/\s+/g,' ').trim().slice(0,500),
      detailImage:detailImg?{
        src:detailImg.getAttribute('src')||'',
        alt:detailImg.getAttribute('alt')||'',
        naturalWidth:detailImg.naturalWidth,
        naturalHeight:detailImg.naturalHeight
      }:null,
      avatarStagePresent:Boolean(stage),
      avatarStageImages:stageImgs
    };
  },id);
  const detail=page.locator('.sbStoreSelectedDetail').first();
  if(await detail.count()&&await detail.isVisible().catch(()=>false))
    await detail.screenshot({path:path.join(outputDir,`${id}-detail.png`)});
  const stage=page.locator('.sbStoreAvatarStage').first();
  if(await stage.count()&&await stage.isVisible().catch(()=>false))
    await stage.screenshot({path:path.join(outputDir,`${id}-avatar-stage.png`)});
  return result;
}

async function inspectBuddy(id){
  const nav=await clickPrimaryNav(/world/i);
  if(!nav)return {available:false,reason:'World nav not found'};
  const avatar=page.locator('.avatarWrap').first();
  if(!(await avatar.count()))return {available:false,reason:'avatarWrap not present on deployed revision'};
  await page.evaluate(({id,key})=>{
    let save={};
    try{save=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{}
    save.stateVersion=2;
    save.owned=Array.from(new Set([...(Array.isArray(save.owned)?save.owned:[]),'companions-1',id]));
    save.equipped={...(save.equipped||{}),companion:id};
    localStorage.setItem(key,JSON.stringify(save));
  },{id,key:'starblox-save-v2'});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForSelector('.sidebar .navBtn',{timeout:10000});
  await clickPrimaryNav(/world/i);
  await page.waitForTimeout(250);
  const root=page.locator('.avatarWrap').first();
  if(!(await root.count()))return {available:false,reason:'avatarWrap absent after reload'};
  const result=await root.evaluate((node,expectedId)=>{
    const buddy=node.querySelector('.buddy');
    const img=buddy?.querySelector('img.sbBuddyPortrait,img');
    return {
      available:Boolean(buddy),
      expectedId,
      rootCompanionId:node.dataset.companion||null,
      buddyCompanionId:buddy?.dataset?.companionId||null,
      image:img?{
        src:img.getAttribute('src')||'',
        naturalWidth:img.naturalWidth,
        naturalHeight:img.naturalHeight
      }:null
    };
  },id);
  await root.screenshot({path:path.join(outputDir,`${id}-buddy.png`)});
  return result;
}

try{
  await page.goto(baseUrl,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('.sidebar .navBtn',{timeout:15000});
  report.initialNav=await page.locator('.sidebar .navBtn').evaluateAll(nodes=>nodes.filter(n=>{
    const style=getComputedStyle(n),rect=n.getBoundingClientRect();
    return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity||1)>0&&rect.width>0&&rect.height>0;
  }).map(n=>({
    text:(n.textContent||'').replace(/\s+/g,' ').trim(),
    aria:n.getAttribute('aria-label')||''
  })));
  report.storeNav=await clickPrimaryNav(/store|market/i);
  await page.waitForTimeout(700);
  let store=await findStoreRoot();
  if(!store){
    await page.screenshot({path:path.join(outputDir,'store-navigation-failure.png'),fullPage:false});
    throw new Error('Store/Market navigation did not mount any recognized Store root');
  }
  report.storeMounted=true;
  report.storeSelector=store.selector;
  const grid=await findGrid(store.loc);
  report.gridSelector=grid?.selector||null;
  report.categorySelector=await activateCompanions(store.loc);
  await page.waitForTimeout(300);
  await store.loc.screenshot({path:path.join(outputDir,'companions-store.png')});

  for(const [id,name] of targets){
    const card=await findCard(store.loc,id,name);
    if(!card){
      report.targets.push({id,name,found:false,technicalPass:false,reason:'Store card not found'});
      continue;
    }
    const cardMetrics=await inspectCard(card,id,name);
    const preview=await inspectEnhancedPreview(card,id);
    const cardImagePass=Boolean(cardMetrics.image?.naturalWidth>0)||(/url\(/.test(cardMetrics.backgroundImage)&&!cardMetrics.fallback);
    const cardPass=cardImagePass&&!cardMetrics.fallback;
    report.targets.push({id,name,found:true,card:cardMetrics,preview,cardPass,technicalPass:cardPass});
  }

  // Buddy preview is optional deployment evidence. Run it after Store cards are
  // fully captured; failure here never erases valid card evidence.
  for(const target of report.targets){
    if(!target.found)continue;
    try{target.buddy=await inspectBuddy(target.id);}
    catch(error){target.buddy={available:false,error:String(error?.message||error)};}
    await page.goto(baseUrl,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForSelector('.sidebar .navBtn',{timeout:10000});
    await clickPrimaryNav(/store|market/i);
    await page.waitForTimeout(350);
    store=await findStoreRoot();
    if(store)await activateCompanions(store.loc);
  }
}catch(error){
  report.fatal=String(error?.stack||error);
  await page.screenshot({path:path.join(outputDir,'fatal.png'),fullPage:false}).catch(()=>{});
}finally{
  report.generatedAt=new Date().toISOString();
  report.consoleErrors=[...consoleErrors];
  report.pageErrors=[...pageErrors];
  report.requestFailures=[...requestFailures];
  report.cardPassCount=report.targets.filter(x=>x.cardPass).length;
  report.technicalPassCount=report.targets.filter(x=>x.technicalPass).length;
  await fs.writeFile(path.join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  await fs.writeFile(path.join(outputDir,'summary.txt'),[
    'LIVE_REPLIT_COMPANION_QA',
    `BASE_URL=${baseUrl}`,
    `STORE_MOUNTED=${report.storeMounted}`,
    `STORE_SELECTOR=${report.storeSelector||'none'}`,
    `CATEGORY_SELECTOR=${report.categorySelector||'none'}`,
    `CARD_PASS=${report.cardPassCount}/${targets.length}`,
    `PAGE_ERRORS=${pageErrors.length}`,
    `FATAL=${report.fatal?'YES':'NO'}`
  ].join('\n')+'\n');
  console.log(JSON.stringify(report,null,2));
  await context.close().catch(()=>{});
  await browser.close().catch(()=>{});
}
if(report.fatal||report.cardPassCount!==targets.length||pageErrors.length)process.exitCode=1;
