#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const baseUrl=process.env.STARBLOX_QA_URL||'http://127.0.0.1:4173';
const outputDir=process.env.STARBLOX_QA_OUTPUT||'artifacts/store-observer-diagnostic';
const clickTimeout=Number(process.env.STARBLOX_STORE_CLICK_TIMEOUT||5000);
const testedHead=process.env.GITHUB_SHA||process.env.STARBLOX_TESTED_HEAD||null;
const viewports=[
  {name:'desktop-1408x1056',width:1408,height:1056},
  {name:'tablet-1024x768',width:1024,height:768},
  {name:'phone-390x844',width:390,height:844},
  {name:'phone-320x568',width:320,height:568}
];
await fs.mkdir(outputDir,{recursive:true});

const browser=await chromium.launch({headless:true});
const browserVersion=browser.version();
const results=[];

function boundedPush(list,value,max=250){
  if(list.length<max)list.push(value);
}

function metricMap(payload){
  const out={};
  for(const metric of payload?.metrics||[])out[metric.name]=metric.value;
  return out;
}

async function evaluateWithDeadline(page,fn,timeoutMs=1200){
  return Promise.race([
    page.evaluate(fn).catch(error=>({evaluationError:String(error?.message||error)})),
    new Promise(resolve=>setTimeout(()=>resolve({unresponsive:true,timeoutMs}),timeoutMs))
  ]);
}

async function cdpMetricsWithDeadline(cdp,timeoutMs=1200){
  return Promise.race([
    cdp.send('Performance.getMetrics').then(metricMap).catch(error=>({cdpError:String(error?.message||error)})),
    new Promise(resolve=>setTimeout(()=>resolve({cdpUnresponsive:true,timeoutMs}),timeoutMs))
  ]);
}

for(const viewport of viewports){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},reducedMotion:'reduce'});
  const page=await context.newPage();
  const consoleEvents=[];
  const browserErrors=[];
  const requestFailures=[];
  page.on('console',msg=>boundedPush(consoleEvents,{type:msg.type(),text:msg.text()}));
  page.on('pageerror',err=>boundedPush(browserErrors,String(err?.stack||err)));
  page.on('requestfailed',request=>boundedPush(requestFailures,{url:request.url(),failure:request.failure()?.errorText||'unknown'}));

  await page.addInitScript(()=>{
    const state=window.__sbStoreNavDiagnostic={
      tickCount:0,
      lastTickAt:performance.now(),
      maxHeartbeatLagMs:0,
      heartbeatSamples:[],
      clickEvents:[],
      longTasks:[]
    };
    let expected=performance.now()+50;
    setInterval(()=>{
      const now=performance.now();
      const lag=Math.max(0,now-expected);
      state.tickCount+=1;
      state.lastTickAt=now;
      state.maxHeartbeatLagMs=Math.max(state.maxHeartbeatLagMs,lag);
      if(state.heartbeatSamples.length<240)state.heartbeatSamples.push({at:now,lagMs:lag});
      expected=now+50;
    },50);
    document.addEventListener('click',event=>{
      if(state.clickEvents.length>=40)return;
      const target=event.target;
      state.clickEvents.push({
        at:performance.now(),
        isTrusted:event.isTrusted,
        defaultPrevented:event.defaultPrevented,
        target:target?.nodeType===1?`${target.tagName.toLowerCase()}${target.id?'#'+target.id:''}${typeof target.className==='string'&&target.className?'.'+target.className.trim().split(/\s+/).slice(0,5).join('.'):''}`:String(target?.nodeName||'unknown'),
        path:event.composedPath().slice(0,7).map(node=>node?.nodeType===1?`${node.tagName.toLowerCase()}${node.id?'#'+node.id:''}${typeof node.className==='string'&&node.className?'.'+node.className.trim().split(/\s+/).slice(0,4).join('.'):''}`:String(node?.nodeName||'window'))
      });
    },true);
    try{
      const observer=new PerformanceObserver(list=>{
        for(const entry of list.getEntries()){
          if(state.longTasks.length<120)state.longTasks.push({startTime:entry.startTime,duration:entry.duration,name:entry.name});
        }
      });
      observer.observe({type:'longtask',buffered:true});
    }catch{}
  });

  let cdp=null;
  let pre=null;
  let post=null;
  let preMetrics=null;
  let postMetrics=null;
  let clickOutcome={status:'NOT_RUN'};
  let mountOutcome={status:'NOT_RUN'};
  let screenshot=null;
  const startedAt=new Date().toISOString();

  try{
    cdp=await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await page.goto(baseUrl,{waitUntil:'networkidle',timeout:15000});
    await page.waitForSelector('.sidebar .navBtn',{timeout:8000});
    const button=page.locator('.sidebar .navBtn').filter({hasText:/Store|Market/i}).first();
    await button.waitFor({state:'visible',timeout:5000});
    const box=await button.boundingBox();
    const buttonState=await button.evaluate(node=>{
      const rect=node.getBoundingClientRect();
      const style=getComputedStyle(node);
      const cx=rect.left+rect.width/2;
      const cy=rect.top+rect.height/2;
      const hit=document.elementFromPoint(cx,cy);
      const describe=el=>el?{
        tag:el.tagName?.toLowerCase()||null,
        id:el.id||'',
        className:typeof el.className==='string'?el.className:'',
        text:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,120)
      }:null;
      return {
        text:(node.textContent||'').trim(),
        disabled:Boolean(node.disabled),
        ariaDisabled:node.getAttribute('aria-disabled'),
        pointerEvents:style.pointerEvents,
        visibility:style.visibility,
        display:style.display,
        opacity:style.opacity,
        rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height,right:rect.right,bottom:rect.bottom},
        center:{x:cx,y:cy},
        centerOwner:describe(hit),
        centerOwnerIsButton:hit===node||node.contains(hit)
      };
    });
    pre=await page.evaluate(()=>({
      screen:{market:document.querySelectorAll('.marketPage').length,storeMatch:document.querySelectorAll('.marketPage.sbStoreMatch').length,home:document.querySelectorAll('.homeHeroRuntime').length,quest:document.querySelectorAll('.questPage').length},
      diagnostic:window.__sbStoreNavDiagnostic,
      activeElement:document.activeElement?.className||document.activeElement?.tagName||null
    }));
    pre.button=buttonState;
    pre.boundingBox=box;
    preMetrics=await cdpMetricsWithDeadline(cdp);

    const clickStarted=Date.now();
    try{
      await button.click({timeout:clickTimeout});
      clickOutcome={status:'CLICK_RETURNED',durationMs:Date.now()-clickStarted};
    }catch(error){
      clickOutcome={status:'CLICK_TIMEOUT',durationMs:Date.now()-clickStarted,error:String(error?.message||error)};
    }

    if(clickOutcome.status==='CLICK_RETURNED'){
      const mountStarted=Date.now();
      try{
        await page.locator('.marketPage.sbStoreMatch').waitFor({state:'attached',timeout:5000});
        const cards=page.locator('.marketPage.sbStoreMatch .storeCard');
        await cards.first().waitFor({state:'visible',timeout:5000});
        mountOutcome={status:'STORE_MOUNTED',durationMs:Date.now()-mountStarted,cardCount:await cards.count()};
      }catch(error){
        mountOutcome={status:'STORE_MOUNT_TIMEOUT',durationMs:Date.now()-mountStarted,error:String(error?.message||error)};
      }
    }

    post=await evaluateWithDeadline(page,()=>({
      marketCount:document.querySelectorAll('.marketPage').length,
      storeMatchCount:document.querySelectorAll('.marketPage.sbStoreMatch').length,
      cardCount:document.querySelectorAll('.storeCard').length,
      selectedDetailCount:document.querySelectorAll('.sbStoreSelectedDetail').length,
      diagnostic:window.__sbStoreNavDiagnostic,
      activeElement:document.activeElement?.className||document.activeElement?.tagName||null,
      overflow:{innerWidth:window.innerWidth,documentScrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth}
    }));
    postMetrics=await cdpMetricsWithDeadline(cdp);
  }catch(error){
    clickOutcome={status:'SETUP_ERROR',error:String(error?.stack||error)};
    post=await evaluateWithDeadline(page,()=>({diagnostic:window.__sbStoreNavDiagnostic||null})).catch(()=>null);
    if(cdp)postMetrics=await cdpMetricsWithDeadline(cdp);
  }

  if(clickOutcome.status!=='CLICK_RETURNED'||mountOutcome.status!=='STORE_MOUNTED'){
    screenshot=path.join(outputDir,`${viewport.name}-failure.png`);
    try{await page.screenshot({path:screenshot,fullPage:false,timeout:2500});}catch(error){screenshot={path:screenshot,error:String(error?.message||error)};}
  }

  const result={
    viewport,
    startedAt,
    clickTimeout,
    clickOutcome,
    mountOutcome,
    pre,
    post,
    performance:{pre:preMetrics,post:postMetrics},
    consoleEvents,
    browserErrors,
    requestFailures,
    screenshot
  };
  results.push(result);
  console.log(JSON.stringify({
    viewport:viewport.name,
    clickOutcome,
    mountOutcome,
    centerOwner:pre?.button?.centerOwner,
    centerOwnerIsButton:pre?.button?.centerOwnerIsButton,
    heartbeatBefore:{ticks:pre?.diagnostic?.tickCount,maxLagMs:pre?.diagnostic?.maxHeartbeatLagMs,lastTickAt:pre?.diagnostic?.lastTickAt},
    heartbeatAfter:post?.diagnostic?{ticks:post.diagnostic.tickCount,maxLagMs:post.diagnostic.maxHeartbeatLagMs,lastTickAt:post.diagnostic.lastTickAt}:post,
    clickEvents:post?.diagnostic?.clickEvents||null,
    longTasks:(post?.diagnostic?.longTasks||[]).slice(-12),
    consoleErrors:consoleEvents.filter(event=>event.type==='error').slice(-20),
    pageErrors:browserErrors,
    requestFailures
  },null,2));
  await context.close().catch(()=>{});
}

await browser.close().catch(()=>{});
const report={
  generatedAt:new Date().toISOString(),
  testedHead,
  baseUrl,
  browserVersion,
  reducedMotion:'reduce',
  clickTimeout,
  viewports,
  results,
  summary:{
    clickReturned:results.filter(result=>result.clickOutcome.status==='CLICK_RETURNED').length,
    clickTimeouts:results.filter(result=>result.clickOutcome.status==='CLICK_TIMEOUT').length,
    storeMounted:results.filter(result=>result.mountOutcome.status==='STORE_MOUNTED').length,
    setupErrors:results.filter(result=>result.clickOutcome.status==='SETUP_ERROR').length,
    postUnresponsive:results.filter(result=>result.post?.unresponsive).length
  }
};
await fs.writeFile(path.join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
await fs.writeFile(path.join(outputDir,'summary.txt'),[
  'STORE_OBSERVER_DIAGNOSTIC',
  `TESTED_HEAD=${testedHead||'unknown'}`,
  `BROWSER=${browserVersion}`,
  `CLICK_RETURNED=${report.summary.clickReturned}/${results.length}`,
  `CLICK_TIMEOUTS=${report.summary.clickTimeouts}/${results.length}`,
  `STORE_MOUNTED=${report.summary.storeMounted}/${results.length}`,
  `POST_UNRESPONSIVE=${report.summary.postUnresponsive}/${results.length}`
].join('\n')+'\n');
