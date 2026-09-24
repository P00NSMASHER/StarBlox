import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.STARBLOX_QA_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.STARBLOX_QA_OUTPUT || 'artifacts/preproduction-visual-qa';
const strict = process.env.STARBLOX_QA_STRICT !== '0';
const viewports = [
  { name:'desktop-1408x1056', width:1408, height:1056 },
  { name:'landscape-1024x768', width:1024, height:768 },
  { name:'phone-390x844', width:390, height:844 },
  { name:'phone-320x568', width:320, height:568 }
];
const screens = [
  { name:'Home', selector:'.homeHeroRuntime' },
  { name:'Store', selector:'.marketPage.sbStoreMatch' },
  { name:'Quest', selector:'.questPage .questBoard' }
];
const results=[];
let releaseBlockingCount=0;
await fs.mkdir(outputDir,{recursive:true});
function record(entry){results.push(entry);if(entry.releaseBlocking)releaseBlockingCount+=1;console.log(`[${entry.status}] ${entry.viewport||'global'} ${entry.screen||''} ${entry.check}: ${entry.message}`);}
function approx(actual,expected,tolerance){return Number.isFinite(actual)&&Math.abs(actual-expected)<=tolerance;}
function pctTolerance(value,pct=.03,floor=6){return Math.max(floor,Math.abs(value)*pct);}
async function rect(page,selector){return page.locator(selector).first().evaluate((node)=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,display:s.display,visibility:s.visibility,opacity:Number(s.opacity||1)};}).catch(()=>null);}
async function clickNav(page,label){const buttons=page.locator('.sidebar .navBtn');for(let i=0;i<await buttons.count();i+=1){const b=buttons.nth(i),text=(await b.innerText().catch(()=>'' )).trim(),aria=(await b.getAttribute('aria-label').catch(()=>''))||'';if(text.toLowerCase()===label.toLowerCase()||aria.toLowerCase()===label.toLowerCase()){await b.click();await page.waitForTimeout(140);return true;}}return false;}
async function openScreen(page,viewport,screen){
  if(screen.name==='Home'){
    if(!await clickNav(page,'Home')){record({viewport:viewport.name,screen:'Home',check:'home-route-contract',status:'FAIL',releaseBlocking:true,message:'Visible Home navigation control was not found.'});return false;}
    if(await page.locator('.homeHeroRuntime').count()){record({viewport:viewport.name,screen:'Home',check:'home-route-contract',status:'PASS',releaseBlocking:false,message:'Visible Home navigation opens the reference Home composition.'});return true;}
    const worldVisible=await page.locator('.world').count();
    record({viewport:viewport.name,screen:'Home',check:'home-route-contract',status:'FAIL',releaseBlocking:true,message:worldVisible?'Visible Home navigation opens Brightside City/world instead of the reference bedroom Home; the reference Home composition is behind the visible Room navigation.':'Visible Home navigation does not mount the reference Home composition.'});
    if(!await clickNav(page,'Room'))return false;
    await page.waitForSelector('.homeHeroRuntime',{state:'attached',timeout:5000});await page.waitForTimeout(140);return true;
  }
  if(screen.name==='Store'){if(!await clickNav(page,'Store'))return false;await page.waitForSelector(screen.selector,{state:'attached',timeout:5000});await page.waitForTimeout(140);return true;}
  if(screen.name==='Quest'){
    if(!await clickNav(page,'Quests'))return false;
    await page.waitForSelector('.questPage',{state:'attached',timeout:5000});
    const empty=page.locator('.questPage .emptyQuest');
    if(await empty.count()){const begin=empty.locator('.primaryButton').first();if(!await begin.count())return false;await begin.click();}
    await page.waitForSelector(screen.selector,{state:'attached',timeout:5000});await page.waitForTimeout(140);return true;
  }
  return false;
}
async function commonChecks(page,viewport,screen,pageErrors,consoleErrors){
  const overflow=await page.evaluate(()=>({innerWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth}));const excess=Math.max(overflow.scrollWidth,overflow.bodyScrollWidth)-overflow.innerWidth;
  record({viewport:viewport.name,screen:screen.name,check:'page-horizontal-overflow',status:excess<=1?'PASS':'FAIL',releaseBlocking:excess>1,message:excess<=1?'No page-level horizontal overflow.':`Page is ${excess}px wider than viewport.`,metrics:overflow});
  if(pageErrors.length||consoleErrors.length)record({viewport:viewport.name,screen:screen.name,check:'runtime-errors',status:'FAIL',releaseBlocking:true,message:`${pageErrors.length} page errors and ${consoleErrors.length} console errors.`,pageErrors,consoleErrors});else record({viewport:viewport.name,screen:screen.name,check:'runtime-errors',status:'PASS',releaseBlocking:false,message:'No pageerror or console.error events observed.'});
  const nav=await page.evaluate(()=>[...document.querySelectorAll('.sidebar .navBtn')].filter((el)=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;}).map((el)=>{const r=el.getBoundingClientRect();return{text:(el.textContent||'').trim(),aria:el.getAttribute('aria-label')||'',width:r.width,height:r.height};}));
  const named=nav.every((i)=>i.text||i.aria),sized=viewport.width>767||nav.every((i)=>i.width>=44&&i.height>=44),count=nav.length===5;
  record({viewport:viewport.name,screen:screen.name,check:'primary-navigation',status:named&&sized&&count?'PASS':'FAIL',releaseBlocking:!(named&&sized&&count),message:`${nav.length} visible primary nav controls; named=${named}; touch-safe=${sized}.`,nav});
}
function geometryResult(viewport,screen,name,r,expected){
  if(!r){record({viewport,screen,check:`geometry-${name}`,status:'FAIL',releaseBlocking:true,message:'Required region is missing.'});return;}
  const failed=[];for(const [key,actual,target] of [['x',r.x,expected.x],['y',r.y,expected.y],['width',r.width,expected.w],['height',r.height,expected.h]]){if(target==null)continue;const tol=(key==='x'||key==='y')?14:pctTolerance(target);if(!approx(actual,target,tol))failed.push([key,actual,target,tol]);}if(expected.bottom!=null&&!approx(r.bottom,expected.bottom,14))failed.push(['bottom',r.bottom,expected.bottom,14]);
  record({viewport,screen,check:`geometry-${name}`,status:failed.length?'FAIL':'PASS',releaseBlocking:failed.length>0,message:failed.length?`Outside contract: ${failed.map(([k,a,t,tol])=>`${k}=${a.toFixed(1)} target ${t}±${tol.toFixed(1)}`).join('; ')}`:'Within contract tolerances.',rect:r,expected});
}
async function desktopGeometryChecks(page,screen){
  const vp='desktop-1408x1056';
  if(screen.name==='Home')for(const [name,selector,expected] of [
    ['room-progress','.homeRoomProgress',{x:520,y:84,w:610,h:165}],['dream-goal','.homeDreamGoal',{x:1138,y:118,w:255,h:560}],['daily-quests','.homeDailyQuests',{x:14,w:410,bottom:1034}],['customize','.homeCustomize',{x:442,y:822,w:600}],['today-learning','.homeLearning',{x:1062,y:772,w:334}],['motivation','.homeWorldMessage',{x:1062,y:938,w:334,h:90}]
  ])geometryResult(vp,'Home',name,await rect(page,selector),expected);
  if(screen.name==='Store'){
    geometryResult(vp,'Store','main-store-chrome',await rect(page,'.marketPage.sbStoreMatch .marketHero'),{x:178,y:79,w:842});
    const cards=await page.locator('.marketPage.sbStoreMatch .storeGrid .storeCard').evaluateAll((nodes)=>nodes.slice(0,12).map((n)=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};})).catch(()=>[]),firstY=cards[0]?.y,firstRow=cards.filter((c)=>Math.abs(c.y-firstY)<3),sizePass=cards.length>0&&cards.every((c)=>c.width>=122&&c.width<=148&&c.height>=139&&c.height<=164),cols=firstRow.length===6;
    record({viewport:vp,screen:'Store',check:'product-grid-density',status:sizePass&&cols?'PASS':'FAIL',releaseBlocking:!(sizePass&&cols),message:`First row columns=${firstRow.length}; sampled card sizes within tolerance=${sizePass}.`,cards});
    geometryResult(vp,'Store','avatar-stage',await rect(page,'.sbStoreAvatarStage'),{x:1030,y:160,w:378,h:470});
    geometryResult(vp,'Store','selected-detail',await rect(page,'.sbStoreSelectedDetail'),{x:1035,y:630,w:363,h:212});
    geometryResult(vp,'Store','collection-strip',await rect(page,'.sbStoreCollectionCards'),{x:10,y:832,w:1088,h:216});
    geometryResult(vp,'Store','value-panel',await rect(page,'.sbStoreValueCard'),{x:1102,y:850,w:296,h:198});
    const fallbackDetails=await page.evaluate(()=>[...document.querySelectorAll('.marketPage.sbStoreMatch .storeGrid .storeCard')].filter((card)=>{const s=getComputedStyle(card),r=card.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0&&Boolean(card.querySelector('.itemArtFallback'));}).map((card)=>({id:card.dataset.storeItemId||'',name:(card.querySelector('.itemCopy h3')?.textContent||'').trim()})));const fallback=fallbackDetails.length;record({viewport:vp,screen:'Store',check:'visible-final-art-fallbacks',status:fallback===0?'PASS':'FAIL',releaseBlocking:fallback>0,message:fallback===0?'No generic product-card fallback art in the current default category.':`Generic product-card fallback art in current default category: ${fallback} (${fallbackDetails.map(item=>item.id||item.name).join(', ')}).`,fallbackItems:fallbackDetails});
    const top=await page.evaluate(()=>{const h=document.querySelector('.hud'),hs=h?getComputedStyle(h):null;return{hudBackground:hs?.backgroundColor||'',hudBackgroundImage:hs?.backgroundImage||'',elementAtTopCenter:document.elementFromPoint(innerWidth/2,150)?.className||''};});
    record({viewport:vp,screen:'Store',check:'top-scene-under-hud',status:top.hudBackground==='rgba(0, 0, 0, 0)'?'PASS':'FAIL',releaseBlocking:top.hudBackground!=='rgba(0, 0, 0, 0)',message:`Computed HUD background=${top.hudBackground}; element at y=150=${top.elementAtTopCenter}.`,metrics:top});
  }
  if(screen.name==='Quest'){
    for(const [name,selector,expected] of [['header','.questTop',{x:390,y:82,w:782,h:71}],['phase-strip','.questPhaseStrip',{x:390,y:153,w:782,h:71}],['avatar-zone','.questCharacterStage',{x:12,y:205,w:368,h:755}],['learning-body','.questionCard',{x:384,y:238,w:789,h:662}],['mastery-rail','.questEvidenceRail',{x:1182,y:222,w:216,h:678}],['earned-summary','.questEarnedBar',{x:470,y:925,w:385,h:97}]])geometryResult(vp,'Quest',name,await rect(page,selector),expected);
    const q=await page.evaluate(()=>{const c=document.querySelector('.questionCard'),l=c?.querySelector('.questLessonCard'),a=c?.querySelector('.questAnswerStack,.answers');if(!c||!l||!a)return null;const cr=c.getBoundingClientRect(),lr=l.getBoundingClientRect(),ar=a.getBoundingClientRect();return{cardWidth:cr.width,lessonWidth:lr.width,answersWidth:ar.width,lessonRatio:lr.width/cr.width,answerRatio:ar.width/cr.width};});const pass=q&&q.lessonRatio>=.54&&q.lessonRatio<=.63&&q.answerRatio>=.35&&q.answerRatio<=.46;record({viewport:vp,screen:'Quest',check:'lesson-answer-ratio',status:pass?'PASS':'FAIL',releaseBlocking:!pass,message:q?`Lesson/card=${(q.lessonRatio*100).toFixed(1)}%; answers/card=${(q.answerRatio*100).toFixed(1)}%.`:'Could not measure lesson/answers.',metrics:q});
  }
}
async function mobileScreenChecks(page,viewport,screen){
  if(viewport.width>767)return;
  if(screen.name==='Store'){const cards=await page.locator('.marketPage.sbStoreMatch .storeGrid .storeCard').evaluateAll((nodes)=>nodes.slice(0,6).map((n)=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};})).catch(()=>[]),xs=[...new Set(cards.filter((c)=>Math.abs(c.y-(cards[0]?.y||0))<3).map((c)=>Math.round(c.x)))],pass=viewport.width>=390?xs.length===2:xs.length>=1&&xs.length<=2;record({viewport:viewport.name,screen:'Store',check:'mobile-store-columns',status:pass?'PASS':'FAIL',releaseBlocking:!pass,message:`First row has ${xs.length} columns.`,cards});}
  if(screen.name==='Quest'){const answers=await page.locator('.questPage .answerButton:visible').evaluateAll((nodes)=>nodes.map((n)=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return{width:r.width,height:r.height,fontSize:parseFloat(s.fontSize)};})).catch(()=>[]),pass=answers.length===3&&answers.every((a)=>a.height>=44&&a.fontSize>=15&&a.width<=viewport.width);record({viewport:viewport.name,screen:'Quest',check:'mobile-answer-controls',status:pass?'PASS':'FAIL',releaseBlocking:!pass,message:`Visible answers=${answers.length}; all touch/readability safe=${pass}.`,answers});}
  if(screen.name==='Home'){const controls=await page.locator('.homeHeroRuntime button:visible').evaluateAll((nodes)=>nodes.map((n)=>{const r=n.getBoundingClientRect();return{text:(n.textContent||'').trim().slice(0,50),width:r.width,height:r.height};})).catch(()=>[]),critical=controls.filter((c)=>c.text),pass=critical.length>0&&critical.every((c)=>c.height>=44);record({viewport:viewport.name,screen:'Home',check:'mobile-home-actions',status:pass?'PASS':'FAIL',releaseBlocking:!pass,message:`Visible Home actions=${critical.length}; all at least 44px high=${pass}.`,controls:critical});}
}
const browser=await chromium.launch({headless:true});
try{for(const viewport of viewports){for(const screen of screens){const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},reducedMotion:'reduce'}),page=await context.newPage(),pageErrors=[],consoleErrors=[];page.on('pageerror',(e)=>pageErrors.push(String(e?.stack||e)));page.on('console',(m)=>{if(m.type()==='error')consoleErrors.push(m.text());});try{await page.goto(baseUrl,{waitUntil:'networkidle',timeout:15000});await page.waitForSelector('.sidebar .navBtn',{timeout:8000});const opened=await openScreen(page,viewport,screen);if(!opened){record({viewport:viewport.name,screen:screen.name,check:'screen-navigation',status:'FAIL',releaseBlocking:true,message:`Could not mount ${screen.name}.`});continue;}record({viewport:viewport.name,screen:screen.name,check:'screen-navigation',status:'PASS',releaseBlocking:false,message:`${screen.name} mounted successfully for QA.`});await commonChecks(page,viewport,screen,pageErrors,consoleErrors);if(viewport.name==='desktop-1408x1056')await desktopGeometryChecks(page,screen);await mobileScreenChecks(page,viewport,screen);await page.screenshot({path:path.join(outputDir,`${screen.name.toLowerCase()}-${viewport.name}.png`),fullPage:false});}catch(error){record({viewport:viewport.name,screen:screen.name,check:'qa-run',status:'FAIL',releaseBlocking:true,message:String(error?.stack||error)});}finally{await context.close();}}}}finally{await browser.close();}
const summary={generatedAt:new Date().toISOString(),baseUrl,releaseBlockingCount,status:releaseBlockingCount===0?'PASS':'FAIL',results};await fs.writeFile(path.join(outputDir,'report.json'),JSON.stringify(summary,null,2));await fs.writeFile(path.join(outputDir,'summary.txt'),`${summary.status}: ${releaseBlockingCount} release-blocking visual/browser checks\n`);console.log(`\nVISUAL_QA_STATUS=${summary.status}`);console.log(`VISUAL_QA_RELEASE_BLOCKING_COUNT=${releaseBlockingCount}`);if(strict&&releaseBlockingCount>0)process.exitCode=1;
