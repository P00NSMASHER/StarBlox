#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const baseUrl=process.env.STARBLOX_QA_URL||'http://127.0.0.1:4173';
const outputDir=process.env.STARBLOX_QA_OUTPUT||'artifacts/store-observer-diagnostic';
const clickTimeout=Number(process.env.STARBLOX_STORE_CLICK_TIMEOUT||5000);
await fs.mkdir(outputDir,{recursive:true});

const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1408,height:1056},reducedMotion:'reduce'});
const page=await context.newPage();
const hotEvents=[];
const browserErrors=[];
page.on('console',msg=>{
  const text=msg.text();
  if(text.startsWith('SB_OBSERVER_HOT ')||text.startsWith('SB_MICROTASK_HOT ')){
    hotEvents.push({type:msg.type(),text});
    console.log(text);
  }
});
page.on('pageerror',err=>browserErrors.push(String(err?.stack||err)));

await page.addInitScript(() => {
  const thresholds=new Set([1,10,100,1000,10000,100000]);
  const shortStack=stack=>String(stack||'').split('\n').slice(1,8).join(' | ');
  const safeTarget=node=>{
    if(!node) return 'null';
    if(node.nodeType===3) return '#text';
    const name=(node.nodeName||'node').toLowerCase();
    const id=node.id?('#'+node.id):'';
    const cls=typeof node.className==='string'&&node.className?('.'+node.className.trim().split(/\s+/).slice(0,4).join('.')):'';
    return name+id+cls;
  };

  window.__sbObserverDiagnostic={observers:[],microtasks:{}};

  const NativeMutationObserver=window.MutationObserver;
  let nextObserverId=1;
  window.MutationObserver=class InstrumentedMutationObserver extends NativeMutationObserver{
    constructor(callback){
      const stat={
        id:nextObserverId++,
        createdStack:shortStack(new Error('MutationObserver created').stack),
        callbacks:0,
        records:0,
        maxBatch:0,
        types:{},
        lastTargets:[]
      };
      window.__sbObserverDiagnostic.observers.push(stat);
      super((records,observer)=>{
        stat.callbacks+=1;
        stat.records+=records.length;
        stat.maxBatch=Math.max(stat.maxBatch,records.length);
        for(const record of records) stat.types[record.type]=(stat.types[record.type]||0)+1;
        stat.lastTargets=records.slice(-5).map(record=>safeTarget(record.target));
        if(thresholds.has(stat.callbacks)){
          console.warn('SB_OBSERVER_HOT '+JSON.stringify({
            id:stat.id,callbacks:stat.callbacks,records:stat.records,maxBatch:stat.maxBatch,
            types:stat.types,lastTargets:stat.lastTargets,createdStack:stat.createdStack
          }));
        }
        return callback(records,observer);
      });
    }
  };

  const nativeQueueMicrotask=window.queueMicrotask.bind(window);
  window.queueMicrotask=callback=>{
    const stack=shortStack(new Error('queueMicrotask scheduled').stack);
    const key=stack||'unknown';
    const stat=window.__sbObserverDiagnostic.microtasks[key]||={scheduled:0,executed:0,stack:key};
    stat.scheduled+=1;
    if(thresholds.has(stat.scheduled)){
      console.warn('SB_MICROTASK_HOT '+JSON.stringify({scheduled:stat.scheduled,executed:stat.executed,stack:stat.stack}));
    }
    return nativeQueueMicrotask(()=>{
      stat.executed+=1;
      return callback();
    });
  };
});

let clickOutcome={status:'NOT_RUN'};
let pre=null;
let post=null;
try{
  await page.goto(baseUrl,{waitUntil:'networkidle',timeout:15000});
  await page.waitForSelector('.sidebar .navBtn',{timeout:8000});
  pre=await page.evaluate(()=>({
    screen:{
      market:document.querySelectorAll('.marketPage').length,
      home:document.querySelectorAll('.homeHeroRuntime').length,
      quest:document.querySelectorAll('.questPage').length
    },
    observerCount:window.__sbObserverDiagnostic?.observers?.length||0
  }));
  const button=page.locator('.sidebar .navBtn').filter({hasText:/Store|Market/i}).first();
  const started=Date.now();
  try{
    await button.click({timeout:clickTimeout});
    clickOutcome={status:'CLICK_RETURNED',durationMs:Date.now()-started};
  }catch(error){
    clickOutcome={status:'CLICK_TIMEOUT',durationMs:Date.now()-started,error:String(error?.message||error)};
  }

  await new Promise(resolve=>setTimeout(resolve,1200));
  const snapshotPromise=page.evaluate(()=>({
    marketCount:document.querySelectorAll('.marketPage').length,
    storeMatchCount:document.querySelectorAll('.marketPage.sbStoreMatch').length,
    cardCount:document.querySelectorAll('.storeCard').length,
    observerStats:window.__sbObserverDiagnostic?.observers||[],
    microtaskStats:Object.values(window.__sbObserverDiagnostic?.microtasks||{}).sort((a,b)=>b.scheduled-a.scheduled).slice(0,20)
  })).catch(error=>({evaluationError:String(error?.message||error)}));
  post=await Promise.race([
    snapshotPromise,
    new Promise(resolve=>setTimeout(()=>resolve({unresponsive:true}),1200))
  ]);
}catch(error){
  clickOutcome={status:'SETUP_ERROR',error:String(error?.stack||error)};
}

const report={
  generatedAt:new Date().toISOString(),
  baseUrl,
  clickTimeout,
  clickOutcome,
  pre,
  post,
  hotEvents,
  browserErrors
};
await fs.writeFile(path.join(outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
await fs.writeFile(path.join(outputDir,'summary.txt'),[
  'STORE_OBSERVER_DIAGNOSTIC',
  'STATUS='+clickOutcome.status,
  'DURATION_MS='+(clickOutcome.durationMs??'n/a'),
  'HOT_EVENTS='+hotEvents.length,
  'POST_UNRESPONSIVE='+Boolean(post?.unresponsive)
].join('\n')+'\n');
console.log(JSON.stringify({
  clickOutcome,
  observerHotEvents:hotEvents.filter(x=>x.text.startsWith('SB_OBSERVER_HOT ')).slice(-20),
  microtaskHotEvents:hotEvents.filter(x=>x.text.startsWith('SB_MICROTASK_HOT ')).slice(-20),
  post
},null,2));

await context.close().catch(()=>{});
await browser.close().catch(()=>{});
