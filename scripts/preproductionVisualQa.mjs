import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.STARBLOX_QA_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.STARBLOX_QA_OUTPUT || 'artifacts/preproduction-visual-qa';
const strict = process.env.STARBLOX_QA_STRICT !== '0';

const viewports = [
  { name: 'desktop-1408x1056', width: 1408, height: 1056 },
  { name: 'landscape-1024x768', width: 1024, height: 768 },
  { name: 'phone-390x844', width: 390, height: 844 },
  { name: 'phone-320x568', width: 320, height: 568 }
];

const screens = [
  { name: 'Home', nav: 'Home', selector: '.homeHeroRuntime' },
  { name: 'Store', nav: 'Store', selector: '.marketPage.sbStoreMatch' },
  { name: 'Quest', nav: 'Quests', selector: '.questPage .questBoard' }
];

const results = [];
let releaseBlockingCount = 0;

await fs.mkdir(outputDir, { recursive: true });

function record(entry){
  results.push(entry);
  if(entry.releaseBlocking) releaseBlockingCount += 1;
  const marker = entry.status === 'PASS' ? 'PASS' : entry.status;
  console.log(`[${marker}] ${entry.viewport || 'global'} ${entry.screen || ''} ${entry.check}: ${entry.message}`);
}

function approx(actual, expected, tolerance){
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

function pctTolerance(value, pct = 0.03, floor = 6){
  return Math.max(floor, Math.abs(value) * pct);
}

async function rect(page, selector){
  return page.locator(selector).first().evaluate((node) => {
    const r = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      right: r.right,
      bottom: r.bottom,
      display: style.display,
      visibility: style.visibility,
      opacity: Number(style.opacity || 1)
    };
  }).catch(() => null);
}

async function openScreen(page, screen){
  if(await page.locator(screen.selector).count()) return true;
  const buttons = page.locator('.sidebar .navBtn');
  const count = await buttons.count();
  for(let i = 0; i < count; i += 1){
    const button = buttons.nth(i);
    const text = (await button.innerText().catch(() => '')).trim();
    const aria = (await button.getAttribute('aria-label').catch(() => '')) || '';
    if(text.toLowerCase() === screen.nav.toLowerCase() || aria.toLowerCase() === screen.nav.toLowerCase()){
      await button.click();
      await page.waitForSelector(screen.selector, { state: 'attached', timeout: 5000 });
      await page.waitForTimeout(120);
      return true;
    }
  }
  return false;
}

async function commonChecks(page, viewport, screen, pageErrors, consoleErrors){
  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth
  }));
  const excess = Math.max(overflow.scrollWidth, overflow.bodyScrollWidth) - overflow.innerWidth;
  record({
    viewport: viewport.name,
    screen: screen.name,
    check: 'page-horizontal-overflow',
    status: excess <= 1 ? 'PASS' : 'FAIL',
    releaseBlocking: excess > 1,
    message: excess <= 1 ? 'No page-level horizontal overflow.' : `Page is ${excess}px wider than viewport.` ,
    metrics: overflow
  });

  if(pageErrors.length || consoleErrors.length){
    record({
      viewport: viewport.name,
      screen: screen.name,
      check: 'runtime-errors',
      status: 'FAIL',
      releaseBlocking: true,
      message: `${pageErrors.length} page errors and ${consoleErrors.length} console errors.`,
      pageErrors,
      consoleErrors
    });
  }else{
    record({viewport:viewport.name,screen:screen.name,check:'runtime-errors',status:'PASS',releaseBlocking:false,message:'No pageerror or console.error events observed.'});
  }

  const nav = await page.evaluate(() => [...document.querySelectorAll('.sidebar .navBtn')].filter((el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  }).map((el) => {
    const r = el.getBoundingClientRect();
    return { text:(el.textContent || '').trim(), aria:el.getAttribute('aria-label') || '', width:r.width, height:r.height };
  }));
  const navNamed = nav.every((item) => item.text || item.aria);
  const navSized = viewport.width > 767 || nav.every((item) => item.width >= 44 && item.height >= 44);
  const navCountPass = nav.length === 5;
  record({
    viewport:viewport.name,
    screen:screen.name,
    check:'primary-navigation',
    status:navNamed && navSized && navCountPass ? 'PASS':'FAIL',
    releaseBlocking:!(navNamed && navSized && navCountPass),
    message:`${nav.length} visible primary nav controls; named=${navNamed}; touch-safe=${navSized}.`,
    nav
  });
}

async function desktopGeometryChecks(page, screen){
  if(screen.name === 'Home'){
    const checks = [
      ['room-progress','.homeRoomProgress',{x:520,y:84,w:610,h:165}],
      ['dream-goal','.homeDreamGoal',{x:1138,y:118,w:255,h:560}],
      ['daily-quests','.homeDailyQuests',{x:14,w:410,bottom:1034}],
      ['customize','.homeCustomize',{x:442,y:822,w:600}],
      ['today-learning','.homeLearning',{x:1062,y:772,w:334}],
      ['motivation','.homeWorldMessage',{x:1062,y:938,w:334,h:90}]
    ];
    for(const [name, selector, expected] of checks){
      const r = await rect(page, selector);
      if(!r){
        record({viewport:'desktop-1408x1056',screen:'Home',check:`geometry-${name}`,status:'FAIL',releaseBlocking:true,message:`Missing ${selector}.`});
        continue;
      }
      const comparisons = [];
      if(expected.x != null) comparisons.push(['x',r.x,expected.x,14]);
      if(expected.y != null) comparisons.push(['y',r.y,expected.y,14]);
      if(expected.w != null) comparisons.push(['width',r.width,expected.w,pctTolerance(expected.w)]);
      if(expected.h != null) comparisons.push(['height',r.height,expected.h,pctTolerance(expected.h)]);
      if(expected.bottom != null) comparisons.push(['bottom',r.bottom,expected.bottom,14]);
      const failed = comparisons.filter(([,actual,target,tol]) => !approx(actual,target,tol));
      record({
        viewport:'desktop-1408x1056',screen:'Home',check:`geometry-${name}`,
        status:failed.length ? 'FAIL':'PASS',releaseBlocking:failed.length > 0,
        message:failed.length ? `Outside contract: ${failed.map(([key,a,t,tol]) => `${key}=${a.toFixed(1)} target ${t}±${tol.toFixed(1)}`).join('; ')}` : 'Within desktop contract tolerances.',
        rect:r, expected
      });
    }
  }

  if(screen.name === 'Store'){
    const hero = await rect(page,'.marketPage.sbStoreMatch .marketHero');
    if(hero){
      const failed = !approx(hero.x,178,14) || !approx(hero.y,79,14) || !approx(hero.width,842,pctTolerance(842));
      record({viewport:'desktop-1408x1056',screen:'Store',check:'geometry-main-store-chrome',status:failed?'FAIL':'PASS',releaseBlocking:failed,message:failed?`Hero rect ${JSON.stringify(hero)} is outside x/y/width contract.`:'Main Store x/y/width is within contract.',rect:hero});
    }else record({viewport:'desktop-1408x1056',screen:'Store',check:'geometry-main-store-chrome',status:'FAIL',releaseBlocking:true,message:'Missing Store hero.'});

    const cards = await page.locator('.marketPage.sbStoreMatch .storeGrid .storeCard').evaluateAll((nodes) => nodes.slice(0,12).map((node) => {
      const r=node.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height};
    })).catch(() => []);
    const firstRowY = cards[0]?.y;
    const firstRow = cards.filter((c) => Math.abs(c.y-firstRowY) < 3);
    const cardSizePass = cards.length > 0 && cards.every((c) => c.width >= 122 && c.width <= 148 && c.height >= 139 && c.height <= 164);
    const columnsPass = firstRow.length === 6;
    record({viewport:'desktop-1408x1056',screen:'Store',check:'product-grid-density',status:cardSizePass&&columnsPass?'PASS':'FAIL',releaseBlocking:!(cardSizePass&&columnsPass),message:`First row columns=${firstRow.length}; sampled card sizes within tolerance=${cardSizePass}.`,cards});

    for(const [name,selector,expected] of [
      ['avatar-stage','.sbStoreAvatarStage',{x:1030,y:160,w:378,h:470}],
      ['selected-detail','.sbStoreSelectedDetail',{x:1035,y:630,w:363,h:212}]
    ]){
      const r=await rect(page,selector);
      if(!r){record({viewport:'desktop-1408x1056',screen:'Store',check:`geometry-${name}`,status:'FAIL',releaseBlocking:true,message:`Missing ${selector}.`});continue;}
      const failed=[];
      for(const [key,actual,target] of [['x',r.x,expected.x],['y',r.y,expected.y],['width',r.width,expected.w],['height',r.height,expected.h]]){
        const tol = key === 'x' || key === 'y' ? 14 : pctTolerance(target);
        if(!approx(actual,target,tol)) failed.push([key,actual,target,tol]);
      }
      record({viewport:'desktop-1408x1056',screen:'Store',check:`geometry-${name}`,status:failed.length?'FAIL':'PASS',releaseBlocking:failed.length>0,message:failed.length?`Outside contract: ${failed.map(([k,a,t,tol])=>`${k}=${a.toFixed(1)} target ${t}±${tol.toFixed(1)}`).join('; ')}`:'Within desktop contract tolerances.',rect:r,expected});
    }

    const fallbackVisible = await page.locator('.marketPage.sbStoreMatch .sbStoreFallbackArt:visible').count().catch(() => 0);
    record({viewport:'desktop-1408x1056',screen:'Store',check:'visible-final-art-fallbacks',status:fallbackVisible===0?'PASS':'FAIL',releaseBlocking:fallbackVisible>0,message:`Visible generic fallback art instances: ${fallbackVisible}.`});
  }

  if(screen.name === 'Quest'){
    const checks = [
      ['header','.questTop',{x:390,y:82,w:782,h:71}],
      ['phase-strip','.questPhaseStrip',{x:390,y:153,w:782,h:71}],
      ['avatar-zone','.questCharacterStage',{x:12,y:205,w:368,h:755}],
      ['learning-body','.questionCard',{x:384,y:238,w:789,h:662}],
      ['mastery-rail','.questEvidenceRail',{x:1182,y:222,w:216,h:678}],
      ['earned-summary','.questEarnedBar',{x:470,y:925,w:385,h:97}]
    ];
    for(const [name,selector,expected] of checks){
      const r=await rect(page,selector);
      if(!r){record({viewport:'desktop-1408x1056',screen:'Quest',check:`geometry-${name}`,status:'FAIL',releaseBlocking:true,message:`Missing ${selector}.`});continue;}
      const failed=[];
      for(const [key,actual,target] of [['x',r.x,expected.x],['y',r.y,expected.y],['width',r.width,expected.w],['height',r.height,expected.h]]){
        const tol = key === 'x' || key === 'y' ? 14 : pctTolerance(target);
        if(!approx(actual,target,tol)) failed.push([key,actual,target,tol]);
      }
      record({viewport:'desktop-1408x1056',screen:'Quest',check:`geometry-${name}`,status:failed.length?'FAIL':'PASS',releaseBlocking:failed.length>0,message:failed.length?`Outside contract: ${failed.map(([k,a,t,tol])=>`${k}=${a.toFixed(1)} target ${t}±${tol.toFixed(1)}`).join('; ')}`:'Within desktop contract tolerances.',rect:r,expected});
    }

    const question = await page.evaluate(() => {
      const card=document.querySelector('.questionCard');
      const lesson=card?.querySelector('.questLessonCard');
      const answers=card?.querySelector('.questAnswerStack,.answers');
      if(!card||!lesson||!answers) return null;
      const c=card.getBoundingClientRect(), l=lesson.getBoundingClientRect(), a=answers.getBoundingClientRect();
      return {cardWidth:c.width,lessonWidth:l.width,answersWidth:a.width,lessonRatio:l.width/c.width,answerRatio:a.width/c.width};
    });
    const ratioPass = question && question.lessonRatio >= .54 && question.lessonRatio <= .63 && question.answerRatio >= .35 && question.answerRatio <= .46;
    record({viewport:'desktop-1408x1056',screen:'Quest',check:'lesson-answer-ratio',status:ratioPass?'PASS':'FAIL',releaseBlocking:!ratioPass,message:question?`Lesson/card=${(question.lessonRatio*100).toFixed(1)}%; answers/card=${(question.answerRatio*100).toFixed(1)}%.`:'Could not measure lesson/answers.',metrics:question});
  }
}

async function mobileScreenChecks(page, viewport, screen){
  if(viewport.width > 767) return;
  if(screen.name === 'Store'){
    const cards = await page.locator('.marketPage.sbStoreMatch .storeGrid .storeCard').evaluateAll((nodes) => nodes.slice(0,6).map((node)=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};})).catch(()=>[]);
    const xs=[...new Set(cards.filter((c)=>Math.abs(c.y-(cards[0]?.y||0))<3).map((c)=>Math.round(c.x)))];
    const columnPass = viewport.width >= 390 ? xs.length===2 : xs.length>=1 && xs.length<=2;
    record({viewport:viewport.name,screen:'Store',check:'mobile-store-columns',status:columnPass?'PASS':'FAIL',releaseBlocking:!columnPass,message:`First row has ${xs.length} columns.`,cards});
  }
  if(screen.name === 'Quest'){
    const answers=await page.locator('.questPage .answerButton:visible').evaluateAll((nodes)=>nodes.map((node)=>{const r=node.getBoundingClientRect();const s=getComputedStyle(node);return{width:r.width,height:r.height,fontSize:parseFloat(s.fontSize)};})).catch(()=>[]);
    const pass=answers.length===3 && answers.every((a)=>a.height>=44 && a.fontSize>=15 && a.width<=viewport.width);
    record({viewport:viewport.name,screen:'Quest',check:'mobile-answer-controls',status:pass?'PASS':'FAIL',releaseBlocking:!pass,message:`Visible answers=${answers.length}; all touch/readability safe=${pass}.`,answers});
  }
}

const browser = await chromium.launch({ headless: true });
try{
  for(const viewport of viewports){
    for(const screen of screens){
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const pageErrors=[];
      const consoleErrors=[];
      page.on('pageerror',(error)=>pageErrors.push(String(error?.stack || error)));
      page.on('console',(msg)=>{ if(msg.type()==='error') consoleErrors.push(msg.text()); });
      try{
        await page.goto(baseUrl,{waitUntil:'networkidle',timeout:15000});
        await page.waitForSelector('.sidebar .navBtn',{timeout:8000});
        const opened=await openScreen(page,screen);
        if(!opened){
          record({viewport:viewport.name,screen:screen.name,check:'screen-navigation',status:'FAIL',releaseBlocking:true,message:`Could not navigate to ${screen.name}.`});
          await context.close();
          continue;
        }
        record({viewport:viewport.name,screen:screen.name,check:'screen-navigation',status:'PASS',releaseBlocking:false,message:`${screen.name} mounted successfully.`});
        await commonChecks(page,viewport,screen,pageErrors,consoleErrors);
        if(viewport.name==='desktop-1408x1056') await desktopGeometryChecks(page,screen);
        await mobileScreenChecks(page,viewport,screen);
        const shot=path.join(outputDir,`${screen.name.toLowerCase()}-${viewport.name}.png`);
        await page.screenshot({path:shot,fullPage:false});
      }catch(error){
        record({viewport:viewport.name,screen:screen.name,check:'qa-run',status:'FAIL',releaseBlocking:true,message:String(error?.stack || error)});
      }finally{
        await context.close();
      }
    }
  }
}finally{
  await browser.close();
}

const summary={
  generatedAt:new Date().toISOString(),
  baseUrl,
  releaseBlockingCount,
  status:releaseBlockingCount===0?'PASS':'FAIL',
  results
};
await fs.writeFile(path.join(outputDir,'report.json'),JSON.stringify(summary,null,2));
await fs.writeFile(path.join(outputDir,'summary.txt'),`${summary.status}: ${releaseBlockingCount} release-blocking visual/browser checks\n`);
console.log(`\nVISUAL_QA_STATUS=${summary.status}`);
console.log(`VISUAL_QA_RELEASE_BLOCKING_COUNT=${releaseBlockingCount}`);
if(strict && releaseBlockingCount>0) process.exitCode=1;
