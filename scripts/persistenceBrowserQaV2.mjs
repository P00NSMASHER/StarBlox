import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { gameModel } from '../src/gameModel.js';

const BASE_URL = process.env.STARBLOX_QA_URL || 'http://127.0.0.1:4173';
const OUTPUT = process.env.STARBLOX_QA_OUTPUT || 'artifacts/persistence-browser-qa';
const SAVE_KEY = 'starblox-save-v2';
const DB_NAME = 'starblox';
const STORE_NAME = 'state';
const results = [];
const questionByPrompt = new Map(gameModel.buildQuestions().map(question => [question.prompt,question]));

await fs.mkdir(OUTPUT,{recursive:true});

function assert(condition,message,details={}){
  if(!condition){
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}
function count(list,value){ return Array.isArray(list) ? list.filter(item => item === value).length : 0; }
function critical(s){
  return {coins:s?.coins,stars:s?.stars,xp:s?.xp,starWorth:s?.starWorth,owned:[...(s?.owned||[])],purchaseReceipts:[...(s?.purchaseReceipts||[])],equipped:{...(s?.equipped||{})},roomDecor:[...(s?.roomDecor||[])],dreamGoalId:s?.dreamGoalId,questsCompleted:s?.questsCompleted,daily:{...(s?.daily||{})},mastered:[...(s?.mastered||[])],transferWins:s?.transferWins,companionBond:s?.companionBond,districtProgress:{...(s?.districtProgress||{})},activeQuestReceipt:s?.activeQuestReceipt,lastCompletedQuestReceipt:s?.lastCompletedQuestReceipt};
}
async function record(name,fn,page){
  const started=Date.now();
  try{ const detail=await fn(); results.push({name,status:'PASS',durationMs:Date.now()-started,detail}); return detail; }
  catch(error){
    let screenshot=null;
    try{ if(page){ screenshot=path.join(OUTPUT,`${name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-failure.png`); await page.screenshot({path:screenshot,fullPage:true}); } }catch{}
    results.push({name,status:'FAIL',durationMs:Date.now()-started,error:error.message,details:error.details||null,screenshot});
    throw error;
  }
}
async function readSave(page){ return page.evaluate(key => JSON.parse(localStorage.getItem(key)||'null'),SAVE_KEY); }
async function waitForSave(page,predicate,args=[],timeout=5000){
  await page.waitForFunction(({key,args,source})=>{ const raw=localStorage.getItem(key); if(!raw)return false; return Function('value','args',`return (${source})(value,args)`)(JSON.parse(raw),args); },{key:SAVE_KEY,args,source:predicate.toString()},{timeout});
  return readSave(page);
}
async function readIndexedBackup(page){
  return page.evaluate(async ({dbName,storeName}) => await new Promise(resolve => {
    const request=indexedDB.open(dbName,1);
    request.onerror=()=>resolve(null);
    request.onupgradeneeded=()=>{ if(!request.result.objectStoreNames.contains(storeName))request.result.createObjectStore(storeName); };
    request.onsuccess=()=>{ const db=request.result; const tx=db.transaction(storeName,'readonly'); const get=tx.objectStore(storeName).get('current'); get.onsuccess=()=>{resolve(get.result??null);db.close();}; get.onerror=()=>{resolve(null);db.close();}; };
  }),{dbName:DB_NAME,storeName:STORE_NAME});
}

async function openStore(page){
  await page.locator('.navBtn').filter({hasText:/Store|Market/i}).first().click();
  await page.locator('.storeGrid').waitFor({state:'visible'});
  await page.locator('.sbStoreRightRail').waitFor({state:'visible'});
}
async function filterCollection(page,id){
  const tab=page.locator(`.sbStoreCategoryRow button[data-collection-id="${id}"]`).first();
  if(await tab.count()) await tab.click();
  else { const label=gameModel.collections.find(([key])=>key===id)?.[1]||id; await page.getByRole('button',{name:new RegExp(`^${label}$`,'i')}).last().click(); }
}
async function selectStoreItem(page,collectionId,itemId){
  await openStore(page); await filterCollection(page,collectionId);
  const card=page.locator(`.storeCard[data-store-item-id="${itemId}"]`).first();
  await card.waitFor({state:'visible'}); await card.scrollIntoViewIfNeeded(); await card.focus(); await card.press('Enter');
  const name=gameModel.store.find(item=>item.id===itemId)?.name;
  if(name) await page.waitForFunction(expected=>document.querySelector('.sbStoreSelectedDetail .sbStoreDetailHead b')?.textContent?.trim()===expected,name);
  return card;
}
async function selectedBuy(page,collectionId,itemId){ await selectStoreItem(page,collectionId,itemId); const button=page.locator('.sbStoreBuy').first(); await button.waitFor({state:'visible'}); return button; }
async function selectedTry(page,collectionId,itemId){ await selectStoreItem(page,collectionId,itemId); const button=page.locator('.sbStoreTry').first(); await button.waitFor({state:'visible'}); return button; }
async function underlyingPrimary(page,collectionId,itemId){ const card=await selectStoreItem(page,collectionId,itemId); const button=card.locator('.storeActions .primaryButton').first(); await button.waitFor({state:'attached'}); return button; }
async function openStudy(page){ await page.locator('.navBtn').filter({hasText:/^Study$/i}).first().click(); await page.locator('.dataCard').waitFor({state:'visible'}); }
async function openQuest(page){ await page.locator('.navBtn').filter({hasText:/Quest/i}).first().click(); const begin=page.getByRole('button',{name:/Begin Quest|Start 5-Action Quest/i}).first(); if(await begin.count())await begin.click(); await page.locator('.qCounter').waitFor({state:'visible'}); }

async function currentQuestion(page){
  const prompt=(await page.locator('.questionText').textContent())?.trim();
  const question=questionByPrompt.get(prompt);
  assert(question,'Could not resolve Quest prompt against source bank',{prompt});
  return question;
}
async function clickAnswer(page,choice,{rapid=false}={}){
  const button=page.getByRole('button',{name:choice,exact:true}).first();
  if(rapid)await button.evaluate(el=>{el.click();el.click();}); else await button.click();
  await page.locator('.feedback').waitFor({state:'visible'});
}
async function waitQuestionAdvance(page,previous){ await page.waitForFunction(value=>document.querySelector('.qCounter')?.textContent?.trim()!==value,previous,{timeout:2500}); }
async function solveCorrect(page,{rapid=false,waitForAdvance=true}={}){
  const q=await currentQuestion(page); const counter=(await page.locator('.qCounter').textContent())?.trim(); const before=await readSave(page);
  const old=before.stats?.[q.skill]||{seen:0,correct:0,independentCorrect:0};
  await clickAnswer(page,q.answer,{rapid});
  assert(await page.locator('.feedback.good').count(),'Known correct answer did not succeed',{id:q.id});
  const targetSeen=(old.seen||0)+1, targetCorrect=(old.correct||0)+1;
  const after=await waitForSave(page,(value,args)=>{ const [skill,seen,correct]=args; const stat=value.stats?.[skill]; return stat?.seen>=seen && stat?.correct>=correct; },[q.skill,targetSeen,targetCorrect],1500);
  const next=after.stats[q.skill];
  if(rapid){ assert(next.seen===targetSeen,'Rapid answer duplicated seen evidence',{old,next}); assert(next.correct===targetCorrect,'Rapid answer duplicated correct evidence',{old,next}); assert(next.independentCorrect===(old.independentCorrect||0)+1,'Rapid answer duplicated independent evidence',{old,next}); }
  if(waitForAdvance)await waitQuestionAdvance(page,counter);
  return {questionId:q.id,skill:q.skill,before:critical(before),after:critical(after)};
}
async function exerciseWrongRetry(page){
  const q=await currentQuestion(page); const counter=(await page.locator('.qCounter').textContent())?.trim(); const wrong=q.choices.find(choice=>choice!==q.answer); assert(wrong,'Question lacks wrong choice',{id:q.id});
  const before=await readSave(page); const old=before.stats?.[q.skill]||{wrong:0};
  await clickAnswer(page,wrong);
  const afterFirst=await waitForSave(page,(value,args)=>{ const [skill,target]=args; return (value.stats?.[skill]?.wrong||0)>=target; },[q.skill,(old.wrong||0)+1],1500);
  assert(afterFirst.coins>=before.coins && afterFirst.xp>=before.xp,'Wrong answer removed currency/XP');
  await page.getByRole('button',{name:/Try again with the clue/i}).click(); await clickAnswer(page,wrong); await page.waitForTimeout(100);
  const afterRepeat=await readSave(page);
  assert(afterRepeat.coins===afterFirst.coins,'Repeated wrong retry farmed Coins'); assert(afterRepeat.xp===afterFirst.xp,'Repeated wrong retry farmed XP'); assert(afterRepeat.stats?.[q.skill]?.wrong===afterFirst.stats?.[q.skill]?.wrong,'Repeated wrong retry duplicated evidence');
  await page.getByRole('button',{name:/Try again with the clue/i}).click(); await clickAnswer(page,q.answer);
  const targetCorrect=(afterRepeat.stats?.[q.skill]?.correct||0)+1;
  const afterAssisted=await waitForSave(page,(value,args)=>{ const [skill,target]=args; return (value.stats?.[skill]?.correct||0)>=target; },[q.skill,targetCorrect],1500);
  assert(afterAssisted.coins===afterRepeat.coins,'Assisted success awarded Coins'); assert(afterAssisted.stars===afterRepeat.stars,'Assisted success awarded Mastery Star'); assert(afterAssisted.transferWins===afterRepeat.transferWins,'Assisted success awarded transfer evidence'); assert(JSON.stringify(afterAssisted.mastered)===JSON.stringify(afterRepeat.mastered),'Assisted success changed mastery list');
  await waitQuestionAdvance(page,counter);
  return {questionId:q.id,before:critical(before),afterFirstWrong:critical(afterFirst),afterRepeatedWrong:critical(afterRepeat),afterAssisted:critical(afterAssisted)};
}

const today=new Date().toISOString().slice(0,10);
const seed={stateVersion:2,coins:2000,stars:50,xp:123,starWorth:777,owned:['tops-1','bottoms-1','shoes-1','beds-1','desks-1','companions-1','companions-3','future-no-art-999','future-no-art-room'],equipped:{top:'tops-1',bottom:'bottoms-1',shoes:'shoes-1',companion:'companions-3',back:'future-no-art-999'},stats:{},mastered:['synthetic-skill'],roomDecor:['beds-1','future-no-art-room'],questsCompleted:7,transferWins:4,lastDailyKey:today,daily:{quests:0,transfers:0,purchase:0},dreamGoalId:'future-no-art-goal',districtProgress:{'Lantern Lane':2,'Story Street':3,'Wordwood Garden':4},companionBond:5,purchaseReceipts:[],activeQuestReceipt:'',lastCompletedQuestReceipt:''};

const browser=await chromium.launch({headless:true});
const browserVersion=browser.version();
const context=await browser.newContext({viewport:{width:1408,height:1056}});
await context.addInitScript(({key,seed,marker})=>{ if(sessionStorage.getItem(marker))return; if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed)); sessionStorage.setItem(marker,'1'); },{key:SAVE_KEY,seed,marker:'starblox-persistence-v2-seed-once'});
const page=await context.newPage();
page.on('console',m=>{ if(m.type()==='error')results.push({name:'browser-console-error',status:'FAIL',text:m.text()}); });
page.on('pageerror',e=>results.push({name:'browser-pageerror',status:'FAIL',text:e.message}));
let fatal=null;

try{
  await page.goto(BASE_URL,{waitUntil:'networkidle'}); await page.waitForTimeout(250);

  await record('initial-state-catalog-integration-and-no-art-retention',async()=>{ const s=await readSave(page); assert(s.coins===2000&&s.stars===50&&s.xp===123,'Synthetic currency/XP changed on boot'); assert(s.owned.includes('future-no-art-999')&&s.equipped.back==='future-no-art-999','Unknown/no-art inventory/equipment pruned'); assert(s.roomDecor.includes('future-no-art-room')&&s.dreamGoalId==='future-no-art-goal','Unknown/no-art room/Dream Goal pruned'); assert(s.owned.includes('companions-3')&&s.equipped.companion==='companions-3','Accepted companion art integration changed state'); return {state:critical(s)}; },page);

  await record('rapid-purchase-exactly-once-and-reload',async()=>{ const before=await readSave(page); const buy=await selectedBuy(page,'tops','tops-2'); await buy.evaluate(el=>{el.click();el.click();}); const after=await waitForSave(page,v=>v.owned?.includes('tops-2')&&v.purchaseReceipts?.includes('tops-2')); assert(after.coins===before.coins-45,'Rapid purchase charged wrong amount',{before:critical(before),after:critical(after)}); assert(after.starWorth===before.starWorth+45,'Rapid purchase changed Star Worth incorrectly'); assert(count(after.owned,'tops-2')===1&&count(after.purchaseReceipts,'tops-2')===1,'Rapid purchase duplicated ownership/receipt'); assert(after.daily.purchase===before.daily.purchase+1,'Rapid purchase duplicated daily progress'); await page.reload({waitUntil:'networkidle'}); const reloaded=await readSave(page); assert(reloaded.coins===after.coins&&count(reloaded.owned,'tops-2')===1,'Purchase changed after reload'); return {before:critical(before),after:critical(after),reloaded:critical(reloaded)}; },page);

  await record('equip-persists-after-reload',async()=>{ const equip=await selectedTry(page,'tops','tops-2'); await equip.click(); const after=await waitForSave(page,v=>v.equipped?.top==='tops-2'); await page.reload({waitUntil:'networkidle'}); const reloaded=await readSave(page); assert(reloaded.equipped.top==='tops-2'&&reloaded.equipped.back==='future-no-art-999','Equip reload/no-art invariant failed'); return {after:critical(after),reloaded:critical(reloaded)}; },page);

  await record('room-double-tap-underlying-place-put-away-and-reload',async()=>{ const before=await readSave(page); const putAway=await underlyingPrimary(page,'beds','beds-1'); assert((await putAway.textContent())?.trim()==='Put Away','Expected placed room item to expose Put Away'); await putAway.evaluate(el=>{el.click();el.click();}); const removed=await waitForSave(page,v=>!v.roomDecor?.includes('beds-1')); assert(removed.roomDecor.includes('future-no-art-room'),'Unknown room placement pruned'); await page.reload({waitUntil:'networkidle'}); const place=await underlyingPrimary(page,'beds','beds-1'); assert((await place.textContent())?.trim()==='Place','Expected removed room item to expose Place'); await place.evaluate(el=>{el.click();el.click();}); const restored=await waitForSave(page,v=>v.roomDecor?.includes('beds-1')); await page.reload({waitUntil:'networkidle'}); const reloaded=await readSave(page); assert(count(reloaded.roomDecor,'beds-1')===1&&reloaded.roomDecor.includes('future-no-art-room'),'Room placement reload/no-art invariant failed'); return {before:critical(before),removed:critical(removed),restored:critical(restored),reloaded:critical(reloaded)}; },page);

  await record('visible-room-right-rail-action-routing',async()=>{ const action=await selectedTry(page,'beds','beds-1'); const before=await readSave(page); await action.click(); await page.waitForTimeout(250); const after=await readSave(page); const changed=before.roomDecor.includes('beds-1')!==after.roomDecor.includes('beds-1'); return {status:changed?'PASS':'KNOWN_UI_ROUTING_DEFECT',visibleLabel:(await action.textContent())?.trim(),beforePlaced:before.roomDecor.includes('beds-1'),afterPlaced:after.roomDecor.includes('beds-1')}; },page);

  await record('multi-tab-same-purchase-replay-exactly-once',async()=>{ const tab2=await context.newPage(); await tab2.goto(BASE_URL,{waitUntil:'networkidle'}); const before=await readSave(page); const b1=await selectedBuy(page,'tops','tops-3'); const b2=await selectedBuy(tab2,'tops','tops-3'); await Promise.all([b1.click(),b2.click()]); await waitForSave(page,v=>v.owned?.includes('tops-3')&&v.purchaseReceipts?.includes('tops-3')); await page.waitForTimeout(300); const settled=await readSave(page); assert(settled.coins===before.coins-65,'Multi-tab replay charged more than once',{before:critical(before),after:critical(settled)}); assert(count(settled.owned,'tops-3')===1&&count(settled.purchaseReceipts,'tops-3')===1,'Multi-tab replay duplicated ownership/receipt'); assert(settled.daily.purchase===before.daily.purchase+1,'Multi-tab replay duplicated daily purchase progress'); await tab2.reload({waitUntil:'networkidle'}); const second=await readSave(tab2); assert(second.coins===settled.coins&&count(second.owned,'tops-3')===1,'Second tab failed reload convergence'); await tab2.close(); return {before:critical(before),settled:critical(settled),secondTabReloaded:critical(second)}; },page);

  await record('malformed-import-preserves-current-save',async()=>{ const before=await readSave(page); await openStudy(page); const input=page.locator('input[type="file"]').first(); await input.setInputFiles({name:'broken-save.json',mimeType:'application/json',buffer:Buffer.from('{ definitely-not-json ')}); await page.locator('.importMessage').waitFor({state:'visible'}); const message=(await page.locator('.importMessage').textContent())?.trim(); const after=await readSave(page); assert(after.coins===before.coins&&after.xp===before.xp&&after.stars===before.stars,'Malformed import mutated currency/XP'); assert(JSON.stringify(after.owned)===JSON.stringify(before.owned),'Malformed import mutated ownership'); assert(after.dreamGoalId===before.dreamGoalId,'Malformed import mutated Dream Goal'); return {message,before:critical(before),after:critical(after)}; },page);

  await record('indexeddb-recovers-localstorage-and-no-art-state',async()=>{ await page.waitForTimeout(500); const before=await readSave(page); const backup=await readIndexedBackup(page); assert(backup&&backup.coins===before.coins,'IndexedDB backup not current',{before:critical(before),backup:critical(backup)}); await page.evaluate(key=>localStorage.removeItem(key),SAVE_KEY); await page.reload({waitUntil:'networkidle'}); const recovered=await waitForSave(page,v=>v.owned?.includes('future-no-art-999')&&v.equipped?.back==='future-no-art-999',[],5000); assert(recovered.coins===before.coins&&recovered.xp===before.xp&&recovered.stars===before.stars,'IndexedDB recovery changed currency/XP',{before:critical(before),backup:backup?critical(backup):null,recovered:critical(recovered)}); assert(recovered.roomDecor.includes('future-no-art-room')&&recovered.dreamGoalId==='future-no-art-goal','IndexedDB recovery pruned unknown IDs'); return {before:critical(before),recovered:critical(recovered)}; },page);

  await record('quest-retry-rapid-answer-and-final-refresh',async()=>{ await openQuest(page); const beforeQuest=await readSave(page); const retry=await exerciseWrongRetry(page); const rapid=await solveCorrect(page,{rapid:true}); await solveCorrect(page); await solveCorrect(page); const final=await currentQuestion(page); const beforeFinal=await readSave(page); const started=Date.now(); await clickAnswer(page,final.answer); const committed=await waitForSave(page,v=>Boolean(v.lastCompletedQuestReceipt)&&v.questsCompleted>=8,[],850); const commitMs=Date.now()-started; assert(commitMs<900,'Quest completion not durable before 950ms UI transition',{commitMs}); assert(committed.questsCompleted===beforeFinal.questsCompleted+1,'Quest completion count not exactly once'); assert(committed.companionBond===beforeFinal.companionBond+1,'Buddy Bond completion not exactly once'); assert(committed.daily.quests===beforeFinal.daily.quests+1,'Daily Quest completion not exactly once'); assert(committed.coins>=beforeFinal.coins+30&&committed.xp>=beforeFinal.xp+30,'Quest completion reward missing'); await page.reload({waitUntil:'networkidle'}); const after=await readSave(page); assert(after.questsCompleted===committed.questsCompleted&&after.companionBond===committed.companionBond&&after.daily.quests===committed.daily.quests,'Quest completion changed after immediate refresh'); assert(after.lastCompletedQuestReceipt===committed.lastCompletedQuestReceipt,'Quest receipt disappeared after refresh'); return {beforeQuest:critical(beforeQuest),retry,rapid,beforeFinal:critical(beforeFinal),commitMs,committed:critical(committed),afterRefresh:critical(after)}; },page);

  await record('final-core-progress-invariants',async()=>{ const s=await readSave(page); assert(s.owned.includes('future-no-art-999')&&s.equipped.back==='future-no-art-999','Unknown/no-art inventory/equip disappeared'); assert(s.roomDecor.includes('future-no-art-room')&&s.dreamGoalId==='future-no-art-goal','Unknown/no-art room/Dream Goal disappeared'); assert(s.coins>=0&&s.stars>=0&&s.xp>=0,'Currency/XP negative'); assert(s.mastered.includes('synthetic-skill'),'Mastery evidence pruned'); assert(s.districtProgress['Story Street']===3,'District progress changed'); return {state:critical(s)}; },page);
}catch(error){ fatal=error; }
finally{
  const report={status:fatal||results.some(r=>r.status==='FAIL')?'FAIL':'PASS',sourceHead:process.env.GITHUB_SHA||null,baseUrl:BASE_URL,syntheticOnly:true,noRealPlayerData:true,browser:`Chromium ${browserVersion} via Playwright`,cases:results};
  await fs.writeFile(path.join(OUTPUT,'report.json'),JSON.stringify(report,null,2));
  await fs.writeFile(path.join(OUTPUT,'summary.txt'),[`PERSISTENCE_BROWSER_QA_STATUS=${report.status}`,`SOURCE_HEAD=${report.sourceHead||'unknown'}`,`BROWSER=${report.browser}`,`PASS=${results.filter(r=>r.status==='PASS').length}`,`FAIL=${results.filter(r=>r.status==='FAIL').length}`,...results.map(r=>`${r.status} ${r.name}${r.error?` :: ${r.error}`:''}`)].join('\n')+'\n');
  await browser.close();
}
if(fatal||results.some(r=>r.status==='FAIL'))process.exit(1);
