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

const qaOwned=['tops-1','bottoms-1','shoes-1','beds-1','desks-1','companions-1',...targets.map(([id])=>id)];
const syntheticSave={
  stateVersion:2,coins:999999,stars:999,xp:0,starWorth:999,
  owned:qaOwned,
  equipped:{top:'tops-1',bottom:'bottoms-1',shoes:'shoes-1',companion:'companions-1'},
  stats:{},mastered:[],roomDecor:['beds-1','desks-1'],
  questsCompleted:0,transferWins:0,lastDailyKey:'',
  daily:{quests:0,transfers:0,purchase:0},
  dreamGoalId:'companions-8',
  districtProgress:{'Lantern Lane':0,'Story Street':0,'Wordwood Garden':0},
  companionBond:0,purchaseReceipts:[],activeQuestReceipt:'',lastCompletedQuestReceipt:''
};
// This state exists only inside this disposable browser context. No server,
// account, purchase, or real-player persistence is touched.
await context.addInitScript(save=>{
  try{ localStorage.setItem('starblox-save-v2',JSON.stringify(save)); }catch{}
},syntheticSave);

async function clickNav(label){
  const nav=page.locator('.sidebar .navBtn').filter({hasText:new RegExp(label,'i')}).first();
  await nav.waitFor({state:'visible',timeout:10000});
  await nav.click();
}

async function captureArt(container,file){
  const metrics=await container.evaluate(node=>{
    const img=node.querySelector('.itemArt img, img');
    const fallback=node.querySelector('.itemArtFallback,.sbStoreFallbackArt');
    const art=node.querySelector('.itemArt')||node;
    const r=art.getBoundingClientRect();
    return {
      fallback:Boolean(fallback),
      rect:{width:r.width,height:r.height},
      image:img?{
        src:img.getAttribute('src')||'',
        naturalWidth:img.naturalWidth,
        naturalHeight:img.naturalHeight,
        renderedWidth:img.getBoundingClientRect().width,
        renderedHeight:img.getBoundingClientRect().height
      }:null
    };
  });
  await container.screenshot({path:path.join(outputDir,file)});
  return metrics;
}

let report;
try{
  await page.goto(baseUrl,{waitUntil:'networkidle',timeout:30000});
  await page.waitForSelector('.sidebar .navBtn',{timeout:10000});

  // STORE: live product-card pixels.
  await clickNav('Market|Store');
  await page.waitForSelector('.page.marketPage,.marketPage',{state:'attached',timeout:10000});
  await page.waitForSelector('.storeGrid',{state:'attached',timeout:10000});
  const buddyFilter=page.locator('.filterRow button').filter({hasText:/^Buddies$/i}).first();
  await buddyFilter.waitFor({state:'visible',timeout:8000});
  await buddyFilter.click();
  await page.waitForTimeout(250);

  const byId={};
  for(const [id,name] of targets){
    const card=page.locator('.storeGrid .storeCard').filter({has:page.locator('h3',{hasText:name})}).first();
    await card.waitFor({state:'visible',timeout:8000});
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(80);
    const cardArt=await captureArt(card,`${id}-store-card.png`);
    const text=(await card.textContent()||'').replace(/\s+/g,' ').trim();
    byId[id]={id,name,store:{text,art:cardArt}};
  }
  await page.screenshot({path:path.join(outputDir,'companions-store.png'),fullPage:false});

  // AVATAR: same live assets in the owned-companion closet. Synthetic local
  // ownership is confined to this disposable context and is not a purchase.
  await clickNav('Avatar');
  await page.waitForSelector('.page.avatarPage,.avatarPage',{state:'attached',timeout:10000});
  const closetRows=page.locator('.closetRow');
  const buddyRow=closetRows.filter({has:page.locator('h3',{hasText:/^Buddies$/i})}).first();
  await buddyRow.waitFor({state:'visible',timeout:8000});
  for(const [id,name] of targets){
    const button=buddyRow.locator('button').filter({hasText:name}).first();
    await button.waitFor({state:'visible',timeout:8000});
    await button.scrollIntoViewIfNeeded();
    const closetArt=await captureArt(button,`${id}-avatar-closet.png`);
    byId[id].avatarCloset={art:closetArt};
  }

  const results=targets.map(([id])=>{
    const row=byId[id];
    const store=row.store.art, avatar=row.avatarCloset.art;
    const storePass=Boolean(store.image?.naturalWidth>0)&&!store.fallback&&store.rect.width>0&&store.rect.height>0;
    const avatarPass=Boolean(avatar.image?.naturalWidth>0)&&!avatar.fallback&&avatar.rect.width>0&&avatar.rect.height>0;
    return {...row,storePass,avatarPass,technicalPass:storePass&&avatarPass};
  });

  report={
    generatedAt:new Date().toISOString(),baseUrl,
    liveAuthority:'REPLIT_PUBLIC_DEPLOYMENT',
    statePolicy:'SYNTHETIC_LOCAL_STORAGE_IN_DISPOSABLE_QA_CONTEXT_ONLY__NO_SERVER_OR_REAL_PLAYER_MUTATION',
    surfaces:['STORE_CARD','AVATAR_OWNED_COMPANION_CLOSET'],
    targets:results,
    consoleErrors,pageErrors,requestFailures,
    technicalPassCount:results.filter(x=>x.technicalPass).length
  };
}catch(error){
  report={
    generatedAt:new Date().toISOString(),baseUrl,
    liveAuthority:'REPLIT_PUBLIC_DEPLOYMENT',
    statePolicy:'SYNTHETIC_LOCAL_STORAGE_IN_DISPOSABLE_QA_CONTEXT_ONLY__NO_SERVER_OR_REAL_PLAYER_MUTATION',
    fatalError:String(error?.stack||error),
    consoleErrors,pageErrors,requestFailures,
    technicalPassCount:0,targets:[]
  };
}finally{
  await fs.writeFile(path.join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  await fs.writeFile(path.join(outputDir,'summary.txt'),[
    'LIVE_REPLIT_COMPANION_QA',
    `BASE_URL=${baseUrl}`,
    `TECHNICAL_PASS=${report.technicalPassCount}/7`,
    `PAGE_ERRORS=${pageErrors.length}`,
    `CONSOLE_ERRORS=${consoleErrors.length}`,
    `FATAL_ERROR=${report.fatalError||''}`
  ].join('\n')+'\n');
  await context.close();
  await browser.close();
}
console.log(JSON.stringify(report,null,2));
if(report.technicalPassCount!==7||pageErrors.length||report.fatalError)process.exitCode=1;
