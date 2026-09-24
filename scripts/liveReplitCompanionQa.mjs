#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const baseUrl=process.env.STARBLOX_QA_URL||'https://star-blox.replit.app';
const outputDir=process.env.STARBLOX_QA_OUTPUT||'artifacts/live-replit-companion-qa';
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

async function openStore(){
  await page.goto(baseUrl,{waitUntil:'networkidle',timeout:30000});
  await page.waitForSelector('.sidebar .navBtn',{timeout:10000});
  const nav=page.locator('.sidebar .navBtn').filter({hasText:/Store|Market/i}).first();
  await nav.waitFor({state:'visible',timeout:8000});
  await nav.click();
  await page.waitForSelector('.marketPage .storeGrid',{state:'attached',timeout:10000});
  const companions=page.locator('.marketPage .filterRow').first().locator('button').filter({hasText:/^Companions$/i}).first();
  await companions.waitFor({state:'visible',timeout:8000});
  await companions.click();
  await page.waitForTimeout(500);
}

await openStore();
const results=[];
for(const [id,name] of targets){
  const card=page.locator('.marketPage .storeGrid .storeCard').filter({has:page.locator('h3',{hasText:name})}).first();
  await card.waitFor({state:'visible',timeout:8000});
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);

  const cardMetrics=await card.evaluate(node=>{
    const img=node.querySelector('img');
    const fallback=node.querySelector('.itemArtFallback,.sbStoreFallbackArt');
    const r=node.getBoundingClientRect();
    return {
      text:(node.textContent||'').replace(/\s+/g,' ').trim(),
      fallback:Boolean(fallback),
      rect:{x:r.x,y:r.y,width:r.width,height:r.height},
      image:img?{
        src:img.getAttribute('src')||'',
        alt:img.getAttribute('alt')||'',
        naturalWidth:img.naturalWidth,
        naturalHeight:img.naturalHeight,
        renderedWidth:img.getBoundingClientRect().width,
        renderedHeight:img.getBoundingClientRect().height
      }:null
    };
  });
  await card.screenshot({path:path.join(outputDir,`${id}-card.png`)});

  const hasEnhancedPreview=await page.locator('.sbStoreRightRail').count()>0;
  if(hasEnhancedPreview){
    await card.click();
    await page.waitForTimeout(250);
  }
  const selected=await page.evaluate(({expectedId,hasEnhancedPreview})=>{
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
      expectedId,
      hasEnhancedPreview,
      selectedId:document.querySelector('.storeCard.selectedCard,.storeCard[aria-selected="true"]')?.dataset?.storeItemId||null,
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
  },{expectedId:id,hasEnhancedPreview});

  const detail=page.locator('.sbStoreSelectedDetail').first();
  if(await detail.count()) await detail.screenshot({path:path.join(outputDir,`${id}-detail.png`)});
  const stage=page.locator('.sbStoreAvatarStage').first();
  if(await stage.count()) await stage.screenshot({path:path.join(outputDir,`${id}-avatar-stage.png`)});

  results.push({
    id,name,card:cardMetrics,selected,
    cardPass:Boolean(cardMetrics.image?.naturalWidth>0)&&!cardMetrics.fallback,
    enhancedPreviewAvailable:selected.hasEnhancedPreview,
    technicalPass:Boolean(cardMetrics.image?.naturalWidth>0)&&!cardMetrics.fallback&&(!selected.hasEnhancedPreview||(selected.detailPresent&&selected.avatarStagePresent))
  });
}

await page.screenshot({path:path.join(outputDir,'companions-store.png'),fullPage:false});
const report={
  generatedAt:new Date().toISOString(),
  baseUrl,
  liveAuthority:'REPLIT_PUBLIC_DEPLOYMENT',
  mutationPolicy:'READ_ONLY_NAVIGATION_AND_SELECTION_ONLY__NO_PURCHASE_NO_EQUIP_NO_SIGNIN',
  targets:results,
  consoleErrors,pageErrors,requestFailures,
  technicalPassCount:results.filter(x=>x.technicalPass).length,
  cardPassCount:results.filter(x=>x.cardPass).length,
  enhancedPreviewAvailable:results.some(x=>x.enhancedPreviewAvailable)
};
await fs.writeFile(path.join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
await fs.writeFile(path.join(outputDir,'summary.txt'),[
  'LIVE_REPLIT_COMPANION_QA',
  `BASE_URL=${baseUrl}`,
  `TECHNICAL_PASS=${report.technicalPassCount}/${results.length}`,
  `CARD_PASS=${report.cardPassCount}/${results.length}`,
  `ENHANCED_PREVIEW_AVAILABLE=${report.enhancedPreviewAvailable}`,
  `PAGE_ERRORS=${pageErrors.length}`,
  `CONSOLE_ERRORS=${consoleErrors.length}`
].join('\n')+'\n');
console.log(JSON.stringify(report,null,2));
await context.close();
await browser.close();
if(report.technicalPassCount!==results.length||pageErrors.length)process.exitCode=1;
