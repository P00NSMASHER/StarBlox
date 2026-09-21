import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const BASE_URL = process.env.STARBLOX_QA_URL || 'http://127.0.0.1:4173';
const OUTPUT = process.env.STARBLOX_QA_OUTPUT || 'artifacts/persistence-browser-qa';
const SAVE_KEY = 'starblox-save-v2';
const DB_NAME = 'starblox';
const STORE_NAME = 'state';
const results = [];

await fs.mkdir(OUTPUT,{recursive:true});

function assert(condition,message,details={}){
  if(!condition){
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function count(list,value){
  return Array.isArray(list) ? list.filter(item => item === value).length : 0;
}

function critical(snapshot){
  return {
    coins:snapshot.coins, stars:snapshot.stars, xp:snapshot.xp, starWorth:snapshot.starWorth,
    owned:[...(snapshot.owned || [])], purchaseReceipts:[...(snapshot.purchaseReceipts || [])],
    equipped:{...(snapshot.equipped || {})}, roomDecor:[...(snapshot.roomDecor || [])],
    dreamGoalId:snapshot.dreamGoalId, questsCompleted:snapshot.questsCompleted,
    daily:{...(snapshot.daily || {})}, mastered:[...(snapshot.mastered || [])],
    transferWins:snapshot.transferWins, companionBond:snapshot.companionBond,
    districtProgress:{...(snapshot.districtProgress || {})},
    activeQuestReceipt:snapshot.activeQuestReceipt,
    lastCompletedQuestReceipt:snapshot.lastCompletedQuestReceipt
  };
}

async function record(name,fn,page){
  const started = Date.now();
  try{
    const detail = await fn();
    results.push({name,status:'PASS',durationMs:Date.now()-started,detail});
    return detail;
  }catch(error){
    let screenshot = null;
    if(page){
      try{
        screenshot = path.join(OUTPUT,`${name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-failure.png`);
        await page.screenshot({path:screenshot,fullPage:true});
      }catch{}
    }
    results.push({name,status:'FAIL',durationMs:Date.now()-started,error:error.message,details:error.details || null,screenshot});
    throw error;
  }
}

async function readSave(page){
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'),SAVE_KEY);
}

async function waitSave(page,predicateDescription,predicate,args=[]){
  await page.waitForFunction(({key,args,source}) => {
    const raw = localStorage.getItem(key);
    if(!raw) return false;
    const value = JSON.parse(raw);
    // eslint-disable-next-line no-new-func
    return Function('value','args',`return (${source})(value,args)`)(value,args);
  },{key:SAVE_KEY,args,source:predicate.toString()},{timeout:5000});
  const value = await readSave(page);
  assert(value,predicateDescription);
  return value;
}

async function readIndexedBackup(page){
  return page.evaluate(async ({dbName,storeName}) => await new Promise(resolve => {
    const request = indexedDB.open(dbName,1);
    request.onerror = () => resolve(null);
    request.onupgradeneeded = () => {
      if(!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(storeName,'readonly');
      const get = tx.objectStore(storeName).get('current');
      get.onsuccess = () => { resolve(get.result ?? null); db.close(); };
      get.onerror = () => { resolve(null); db.close(); };
    };
  }),{dbName:DB_NAME,storeName:STORE_NAME});
}

async function openMarket(page){
  const nav = page.getByRole('button',{name:/^(Store|Market)$/i}).first();
  await nav.click();
  await page.locator('.storeGrid').waitFor({state:'visible'});
}

async function openStudy(page){
  await page.getByRole('button',{name:/^Study$/i}).first().click();
  await page.locator('.dataCard').waitFor({state:'visible'});
}

async function filterCollection(page,label){
  const button = page.getByRole('button',{name:new RegExp(`^${label}$`,'i')}).last();
  await button.click();
}

function cardByName(page,name){
  return page.locator('.storeCard').filter({has:page.getByRole('heading',{name,exact:true})}).first();
}

async function actionButton(page,itemName,label){
  const card = cardByName(page,itemName);
  await card.waitFor({state:'visible'});
  return card.getByRole('button',{name:new RegExp(`^${label}$`,'i')}).first();
}

async function solveQuestion(page,{refreshOnCorrect=false,forceWrongFirst=false}={}){
  const counter = (await page.locator('.qCounter').textContent())?.trim();
  const choices = await page.locator('.answerButton').allTextContents();
  assert(choices.length === 3,'Expected three Quest choices',{counter,choices});
  let deliberatelyWrongSnapshot = null;

  for(let index=0; index<choices.length; index++){
    const choice = choices[index].trim();
    const button = page.getByRole('button',{name:choice,exact:true}).first();
    await button.click();
    await page.waitForSelector('.feedback');
    const good = await page.locator('.feedback.good').count();
    if(good){
      if(refreshOnCorrect) return {counter,correctChoice:choice,deliberatelyWrongSnapshot};
      await page.waitForFunction(previous => {
        const node = document.querySelector('.qCounter');
        return !node || node.textContent.trim() !== previous;
      },counter,{timeout:2500}).catch(()=>{});
      return {counter,correctChoice:choice,deliberatelyWrongSnapshot};
    }

    if(forceWrongFirst && deliberatelyWrongSnapshot == null){
      deliberatelyWrongSnapshot = await readSave(page);
    }

    const retry = page.getByRole('button',{name:/Try again with the clue/i}).first();
    if(await retry.count()) await retry.click();
  }

  throw new Error(`Could not solve Quest question ${counter}`);
}

const today = new Date().toISOString().slice(0,10);
const syntheticSeed = {
  stateVersion:2,
  coins:2000,
  stars:50,
  xp:123,
  starWorth:777,
  owned:['tops-1','bottoms-1','shoes-1','beds-1','desks-1','companions-1','companions-3','future-no-art-999','future-no-art-room'],
  equipped:{top:'tops-1',bottom:'bottoms-1',shoes:'shoes-1',companion:'companions-3',back:'future-no-art-999'},
  stats:{}, mastered:['synthetic-skill'], roomDecor:['beds-1','future-no-art-room'],
  questsCompleted:7, transferWins:4, lastDailyKey:today,
  daily:{quests:0,transfers:0,purchase:0}, dreamGoalId:'future-no-art-goal',
  districtProgress:{'Lantern Lane':2,'Story Street':3,'Wordwood Garden':4},
  companionBond:5, purchaseReceipts:[], activeQuestReceipt:'', lastCompletedQuestReceipt:''
};

const browser = await chromium.launch({headless:true});
const context = await browser.newContext({viewport:{width:1408,height:1056}});
await context.addInitScript(({key,seed}) => {
  if(!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(seed));
},{key:SAVE_KEY,seed:syntheticSeed});
const page = await context.newPage();
page.on('console',msg => { if(msg.type() === 'error') results.push({name:'browser-console-error',status:'FAIL',text:msg.text()}); });
page.on('pageerror',error => results.push({name:'browser-pageerror',status:'FAIL',text:error.message}));

let fatal = null;
try{
  await page.goto(BASE_URL,{waitUntil:'networkidle'});

  await record('initial-synthetic-state-and-no-art-retention',async () => {
    const save = await readSave(page);
    assert(save.coins === 2000 && save.stars === 50 && save.xp === 123,'Synthetic currency/XP changed on boot',{save:critical(save)});
    assert(save.owned.includes('future-no-art-999'),'Unknown/no-art owned ID was pruned');
    assert(save.equipped.back === 'future-no-art-999','Unknown/no-art equipped ID was pruned');
    assert(save.roomDecor.includes('future-no-art-room'),'Unknown/no-art room placement was pruned');
    assert(save.dreamGoalId === 'future-no-art-goal','Unknown/no-art Dream Goal ID was changed');
    assert(save.equipped.companion === 'companions-3' && save.owned.includes('companions-3'),'Accepted companion integration changed ownership/equipment semantics');
    return {state:critical(save)};
  },page);

  await record('rapid-purchase-exactly-once-and-reload',async () => {
    await openMarket(page);
    await filterCollection(page,'Tops');
    const before = await readSave(page);
    const buy = await actionButton(page,'Zip Hoodie','Buy Forever');
    await buy.evaluate(el => { el.click(); el.click(); });
    const after = await waitSave(page,'Purchase did not persist exactly once',(value) => value.owned.includes('tops-2') && value.purchaseReceipts.includes('tops-2'));
    assert(after.coins === before.coins - 45,'Rapid purchase charged the wrong amount',{before:critical(before),after:critical(after)});
    assert(after.starWorth === before.starWorth + 45,'Rapid purchase changed Star Worth incorrectly');
    assert(count(after.owned,'tops-2') === 1 && count(after.purchaseReceipts,'tops-2') === 1,'Rapid purchase duplicated ownership/receipt');
    assert(after.daily.purchase === before.daily.purchase + 1,'Rapid purchase duplicated/missed daily purchase progress');
    await page.reload({waitUntil:'networkidle'});
    const reloaded = await readSave(page);
    assert(reloaded.coins === after.coins && count(reloaded.owned,'tops-2') === 1 && count(reloaded.purchaseReceipts,'tops-2') === 1,'Purchase changed after reload');
    return {before:critical(before),after:critical(after),reloaded:critical(reloaded)};
  },page);

  await record('equip-persists-after-reload',async () => {
    await openMarket(page);
    await filterCollection(page,'Tops');
    const equip = await actionButton(page,'Zip Hoodie','Equip');
    await equip.click();
    const after = await waitSave(page,'Equip did not persist',(value) => value.equipped?.top === 'tops-2');
    await page.reload({waitUntil:'networkidle'});
    const reloaded = await readSave(page);
    assert(reloaded.equipped.top === 'tops-2','Equipped top disappeared after reload');
    assert(reloaded.equipped.back === 'future-no-art-999','Unrelated unknown equipped item was pruned');
    return {after:critical(after),reloaded:critical(reloaded)};
  },page);

  await record('room-double-tap-guard-place-put-away-reload',async () => {
    await openMarket(page);
    await filterCollection(page,'Beds');
    const before = await readSave(page);
    const putAway = await actionButton(page,'Starter Bed','Put Away');
    await putAway.evaluate(el => { el.click(); el.click(); });
    const removed = await waitSave(page,'Put Away did not persist once',(value) => !value.roomDecor.includes('beds-1'));
    assert(removed.roomDecor.includes('future-no-art-room'),'Unknown/no-art room placement was pruned by room toggle');
    await page.reload({waitUntil:'networkidle'});
    await openMarket(page);
    await filterCollection(page,'Beds');
    const place = await actionButton(page,'Starter Bed','Place');
    await place.click();
    const restored = await waitSave(page,'Place did not persist',(value) => value.roomDecor.includes('beds-1'));
    await page.reload({waitUntil:'networkidle'});
    const reloaded = await readSave(page);
    assert(count(reloaded.roomDecor,'beds-1') === 1 && reloaded.roomDecor.includes('future-no-art-room'),'Room placement failed reload/no-art invariant');
    return {before:critical(before),removed:critical(removed),restored:critical(restored),reloaded:critical(reloaded)};
  },page);

  await record('multi-tab-same-purchase-replay-exactly-once',async () => {
    const tab2 = await context.newPage();
    await tab2.goto(BASE_URL,{waitUntil:'networkidle'});
    await openMarket(page); await filterCollection(page,'Tops');
    await openMarket(tab2); await filterCollection(tab2,'Tops');
    const before = await readSave(page);
    const b1 = await actionButton(page,'Varsity Tee','Buy Forever');
    const b2 = await actionButton(tab2,'Varsity Tee','Buy Forever');
    await Promise.all([b1.click(),b2.click()]);
    await page.waitForTimeout(250);
    const after = await readSave(page);
    assert(after.coins === before.coins - 65,'Multi-tab replay charged purchase more than once',{before:critical(before),after:critical(after)});
    assert(count(after.owned,'tops-3') === 1 && count(after.purchaseReceipts,'tops-3') === 1,'Multi-tab replay duplicated ownership/receipt');
    assert(after.daily.purchase === before.daily.purchase + 1,'Multi-tab replay duplicated daily purchase progress');
    await tab2.reload({waitUntil:'networkidle'});
    const tab2Reloaded = await readSave(tab2);
    assert(tab2Reloaded.coins === after.coins && count(tab2Reloaded.owned,'tops-3') === 1,'Second tab did not converge after reload');
    await tab2.close();
    return {before:critical(before),after:critical(after),tab2Reloaded:critical(tab2Reloaded)};
  },page);

  await record('malformed-import-preserves-current-save',async () => {
    const before = await readSave(page);
    await openStudy(page);
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles({name:'broken-save.json',mimeType:'application/json',buffer:Buffer.from('{ definitely-not-json ')});
    await page.locator('.importMessage').waitFor({state:'visible'});
    const message = (await page.locator('.importMessage').textContent())?.trim();
    const after = await readSave(page);
    assert(after.coins === before.coins && after.xp === before.xp && after.stars === before.stars,'Malformed import mutated currency/XP');
    assert(JSON.stringify(after.owned) === JSON.stringify(before.owned),'Malformed import mutated ownership');
    assert(after.dreamGoalId === before.dreamGoalId,'Malformed import mutated Dream Goal');
    return {message,before:critical(before),after:critical(after)};
  },page);

  await record('indexeddb-backup-recovers-localstorage-and-no-art-state',async () => {
    await page.waitForTimeout(300);
    const before = await readSave(page);
    const backup = await readIndexedBackup(page);
    assert(backup && backup.coins === before.coins,'IndexedDB backup did not contain current synthetic state',{before:critical(before),backup:backup ? critical(backup) : null});
    await page.evaluate(key => localStorage.removeItem(key),SAVE_KEY);
    await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(key => {
      const raw = localStorage.getItem(key);
      if(!raw) return false;
      const value = JSON.parse(raw);
      return value.owned?.includes('future-no-art-999') && value.equipped?.back === 'future-no-art-999';
    },SAVE_KEY,{timeout:5000});
    const recovered = await readSave(page);
    assert(recovered.coins === before.coins && recovered.xp === before.xp && recovered.stars === before.stars,'IndexedDB recovery changed currency/XP');
    assert(recovered.roomDecor.includes('future-no-art-room') && recovered.dreamGoalId === 'future-no-art-goal','IndexedDB recovery pruned no-art placement/Dream Goal');
    return {before:critical(before),recovered:critical(recovered)};
  },page);

  await record('quest-retry-no-repeat-farming-and-final-refresh-commit',async () => {
    const beforeQuest = await readSave(page);
    const questNav = page.getByRole('button',{name:/^Quests?$/i}).first();
    await questNav.click();
    const begin = page.getByRole('button',{name:/Begin Quest|Start 5-Action Quest/i}).first();
    if(await begin.count()) await begin.click();
    await page.locator('.qCounter').waitFor({state:'visible'});

    let retryCheck = null;
    for(let q=1; q<=4; q++){
      const stateBefore = await readSave(page);
      const solved = await solveQuestion(page,{forceWrongFirst:q===1});
      if(q===1 && solved.deliberatelyWrongSnapshot){
        const afterWrong = solved.deliberatelyWrongSnapshot;
        retryCheck = {before:critical(stateBefore),afterFirstWrong:critical(afterWrong)};
        assert(afterWrong.coins >= stateBefore.coins && afterWrong.xp >= stateBefore.xp,'Wrong answer took away currency/XP');
      }
      await page.waitForSelector('.qCounter');
    }

    const beforeFinal = await readSave(page);
    const finalResult = await solveQuestion(page,{refreshOnCorrect:true});
    await page.waitForFunction(key => {
      const raw = localStorage.getItem(key); if(!raw) return false;
      const value = JSON.parse(raw);
      return Boolean(value.lastCompletedQuestReceipt) && value.questsCompleted >= 8;
    },SAVE_KEY,{timeout:700});
    const committedBeforeRefresh = await readSave(page);
    assert(committedBeforeRefresh.questsCompleted === beforeFinal.questsCompleted + 1,'Final Quest completion count was not committed before UI timer');
    assert(committedBeforeRefresh.companionBond === beforeFinal.companionBond + 1,'Buddy Bond completion reward was not committed exactly once');
    assert(committedBeforeRefresh.daily.quests === beforeFinal.daily.quests + 1,'Daily Quest completion was not committed exactly once');
    assert(committedBeforeRefresh.coins >= beforeFinal.coins + 30 && committedBeforeRefresh.xp >= beforeFinal.xp + 30,'Final Quest completion reward missing before refresh');
    await page.reload({waitUntil:'networkidle'});
    const afterRefresh = await readSave(page);
    assert(afterRefresh.questsCompleted === committedBeforeRefresh.questsCompleted,'Quest completion duplicated/disappeared after refresh');
    assert(afterRefresh.companionBond === committedBeforeRefresh.companionBond && afterRefresh.daily.quests === committedBeforeRefresh.daily.quests,'Quest completion side effects changed after refresh');
    assert(afterRefresh.lastCompletedQuestReceipt === committedBeforeRefresh.lastCompletedQuestReceipt,'Quest completion receipt disappeared after refresh');
    return {beforeQuest:critical(beforeQuest),retryCheck,beforeFinal:critical(beforeFinal),finalResult,committedBeforeRefresh:critical(committedBeforeRefresh),afterRefresh:critical(afterRefresh)};
  },page);

  await record('final-no-art-and-core-progress-invariants',async () => {
    const final = await readSave(page);
    assert(final.owned.includes('future-no-art-999'),'Unknown/no-art ownership disappeared');
    assert(final.equipped.back === 'future-no-art-999','Unknown/no-art equipped state disappeared');
    assert(final.roomDecor.includes('future-no-art-room'),'Unknown/no-art placement disappeared');
    assert(final.dreamGoalId === 'future-no-art-goal','Unknown/no-art Dream Goal disappeared');
    assert(final.stars >= 0 && final.coins >= 0 && final.xp >= 0,'Currency/XP became negative');
    assert(final.mastered.includes('synthetic-skill'),'Mastery evidence was pruned');
    assert(final.districtProgress['Story Street'] === 3,'Unrelated district progress changed unexpectedly');
    return {state:critical(final)};
  },page);
}catch(error){
  fatal = error;
}finally{
  const report = {
    status:fatal || results.some(result => result.status === 'FAIL') ? 'FAIL' : 'PASS',
    sourceHead:process.env.GITHUB_SHA || null,
    baseUrl:BASE_URL,
    syntheticOnly:true,
    noRealPlayerData:true,
    browser:'Chromium via Playwright',
    cases:results
  };
  await fs.writeFile(path.join(OUTPUT,'report.json'),JSON.stringify(report,null,2));
  await fs.writeFile(path.join(OUTPUT,'summary.txt'),[
    `PERSISTENCE_BROWSER_QA_STATUS=${report.status}`,
    `SOURCE_HEAD=${report.sourceHead || 'unknown'}`,
    `PASS=${results.filter(r => r.status === 'PASS').length}`,
    `FAIL=${results.filter(r => r.status === 'FAIL').length}`,
    ...results.map(r => `${r.status} ${r.name}${r.error ? ` :: ${r.error}` : ''}`)
  ].join('\n')+'\n');
  await browser.close();
}

if(fatal || results.some(result => result.status === 'FAIL')) process.exit(1);
