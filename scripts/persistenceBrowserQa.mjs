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

function count(list,value){
  return Array.isArray(list) ? list.filter(item => item === value).length : 0;
}

function critical(snapshot){
  return {
    coins:snapshot?.coins, stars:snapshot?.stars, xp:snapshot?.xp, starWorth:snapshot?.starWorth,
    owned:[...(snapshot?.owned || [])], purchaseReceipts:[...(snapshot?.purchaseReceipts || [])],
    equipped:{...(snapshot?.equipped || {})}, roomDecor:[...(snapshot?.roomDecor || [])],
    dreamGoalId:snapshot?.dreamGoalId, questsCompleted:snapshot?.questsCompleted,
    daily:{...(snapshot?.daily || {})}, mastered:[...(snapshot?.mastered || [])],
    transferWins:snapshot?.transferWins, companionBond:snapshot?.companionBond,
    districtProgress:{...(snapshot?.districtProgress || {})},
    activeQuestReceipt:snapshot?.activeQuestReceipt,
    lastCompletedQuestReceipt:snapshot?.lastCompletedQuestReceipt
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

async function waitForSave(page,predicate,args=[],timeout=5000){
  await page.waitForFunction(({key,args,source}) => {
    const raw = localStorage.getItem(key);
    if(!raw) return false;
    const value = JSON.parse(raw);
    return Function('value','args',`return (${source})(value,args)`)(value,args);
  },{key:SAVE_KEY,args,source:predicate.toString()},{timeout});
  return readSave(page);
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

async function openStore(page){
  const nav = page.locator('.navBtn').filter({hasText:/Store|Market/i}).first();
  await nav.click();
  await page.locator('.storeGrid').waitFor({state:'visible'});
  await page.locator('.sbStoreRightRail').waitFor({state:'visible'});
}

async function filterCollection(page,collectionId){
  const decorated = page.locator(`.sbStoreCategoryRow button[data-collection-id="${collectionId}"]`).first();
  if(await decorated.count()){
    await decorated.click();
  }else{
    const label = gameModel.collections.find(([id]) => id === collectionId)?.[1] || collectionId;
    await page.getByRole('button',{name:new RegExp(`^${label}$`,'i')}).last().click();
  }
}

async function selectStoreItem(page,collectionId,itemId){
  await openStore(page);
  await filterCollection(page,collectionId);
  const card = page.locator(`.storeCard[data-store-item-id="${itemId}"]`).first();
  await card.waitFor({state:'visible'});
  await card.scrollIntoViewIfNeeded();
  await card.focus();
  await card.press('Enter');
  const selectedName = gameModel.store.find(item => item.id === itemId)?.name;
  const heading = page.locator('.sbStoreSelectedDetail .sbStoreDetailHead b').first();
  await heading.waitFor({state:'visible'});
  if(selectedName) await page.waitForFunction(name => document.querySelector('.sbStoreSelectedDetail .sbStoreDetailHead b')?.textContent?.trim() === name,selectedName);
  return card;
}

async function selectedBuy(page,collectionId,itemId){
  await selectStoreItem(page,collectionId,itemId);
  const button = page.locator('.sbStoreSelectedDetail .sbStoreBuy').first();
  await button.waitFor({state:'visible'});
  return button;
}

async function selectedTry(page,collectionId,itemId){
  await selectStoreItem(page,collectionId,itemId);
  const button = page.locator('.sbStoreSelectedDetail .sbStoreTry').first();
  await button.waitFor({state:'visible'});
  return button;
}

async function openStudy(page){
  await page.locator('.navBtn').filter({hasText:/^Study$/i}).first().click();
  await page.locator('.dataCard').waitFor({state:'visible'});
}

async function openQuest(page){
  await page.locator('.navBtn').filter({hasText:/Quest/i}).first().click();
  const begin = page.getByRole('button',{name:/Begin Quest|Start 5-Action Quest/i}).first();
  if(await begin.count()) await begin.click();
  await page.locator('.qCounter').waitFor({state:'visible'});
}

async function currentQuestion(page){
  const prompt = (await page.locator('.questionText').textContent())?.trim();
  const question = questionByPrompt.get(prompt);
  assert(question,'Could not resolve current Quest prompt against source bank',{prompt});
  return question;
}

async function clickAnswer(page,choice,{rapid=false}={}){
  const button = page.getByRole('button',{name:choice,exact:true}).first();
  if(rapid) await button.evaluate(el => { el.click(); el.click(); });
  else await button.click();
  await page.locator('.feedback').waitFor({state:'visible'});
}

async function solveCorrect(page,{rapid=false,waitForAdvance=true}={}){
  const question = await currentQuestion(page);
  const counter = (await page.locator('.qCounter').textContent())?.trim();
  const before = await readSave(page);
  const old = before.stats?.[question.skill] || {seen:0,correct:0,wrong:0,independentCorrect:0,masteryCorrect:0};
  await clickAnswer(page,question.answer,{rapid});
  assert(await page.locator('.feedback.good').count(),'Known correct answer did not produce success',{id:question.id});
  const after = await waitForSave(page,value => Boolean(value.stats),[],1200);
  const next = after.stats?.[question.skill] || {};
  if(rapid){
    assert(next.seen === old.seen + 1,'Rapid Quest answer duplicated seen evidence',{old,next});
    assert(next.correct === old.correct + 1,'Rapid Quest answer duplicated correct evidence',{old,next});
    assert(next.independentCorrect === (old.independentCorrect || 0) + 1,'Rapid Quest answer duplicated independent evidence',{old,next});
  }
  if(waitForAdvance){
    await page.waitForFunction(previous => document.querySelector('.qCounter')?.textContent?.trim() !== previous,counter,{timeout:2500});
  }
  return {questionId:question.id,skill:question.skill,before:critical(before),after:critical(after)};
}

async function exerciseWrongRetry(page){
  const question = await currentQuestion(page);
  const wrongChoice = question.choices.find(choice => choice !== question.answer);
  assert(wrongChoice,'No wrong choice available',{id:question.id});
  const before = await readSave(page);
  await clickAnswer(page,wrongChoice);
  assert(await page.locator('.feedback.learn').count(),'Wrong answer did not show learning feedback');
  const afterFirstWrong = await readSave(page);
  assert(afterFirstWrong.coins >= before.coins && afterFirstWrong.xp >= before.xp,'Wrong answer removed currency/XP');
  await page.getByRole('button',{name:/Try again with the clue/i}).click();
  await clickAnswer(page,wrongChoice);
  const afterRepeatedWrong = await readSave(page);
  assert(afterRepeatedWrong.coins === afterFirstWrong.coins,'Repeated wrong retry farmed Coins',{before:critical(before),afterFirstWrong:critical(afterFirstWrong),afterRepeatedWrong:critical(afterRepeatedWrong)});
  assert(afterRepeatedWrong.xp === afterFirstWrong.xp,'Repeated wrong retry farmed XP');
  assert(afterRepeatedWrong.stats?.[question.skill]?.wrong === afterFirstWrong.stats?.[question.skill]?.wrong,'Repeated wrong retry duplicated wrong evidence');
  await page.getByRole('button',{name:/Try again with the clue/i}).click();
  const starsBeforeAssisted = afterRepeatedWrong.stars;
  const transfersBeforeAssisted = afterRepeatedWrong.transferWins;
  const masteredBeforeAssisted = [...(afterRepeatedWrong.mastered || [])];
  await clickAnswer(page,question.answer);
  const afterAssisted = await readSave(page);
  assert(afterAssisted.coins === afterRepeatedWrong.coins,'Assisted success awarded Coins');
  assert(afterAssisted.stars === starsBeforeAssisted,'Assisted success awarded a Mastery Star');
  assert(afterAssisted.transferWins === transfersBeforeAssisted,'Assisted success awarded transfer evidence');
  assert(JSON.stringify(afterAssisted.mastered) === JSON.stringify(masteredBeforeAssisted),'Assisted success changed mastery list');
  const counter = (await page.locator('.qCounter').textContent())?.trim();
  await page.waitForFunction(previous => document.querySelector('.qCounter')?.textContent?.trim() !== previous,counter,{timeout:2500});
  return {questionId:question.id,before:critical(before),afterFirstWrong:critical(afterFirstWrong),afterRepeatedWrong:critical(afterRepeatedWrong),afterAssisted:critical(afterAssisted)};
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
  stats:{},
  mastered:['synthetic-skill'],
  roomDecor:['beds-1','future-no-art-room'],
  questsCompleted:7,
  transferWins:4,
  lastDailyKey:today,
  daily:{quests:0,transfers:0,purchase:0},
  dreamGoalId:'future-no-art-goal',
  districtProgress:{'Lantern Lane':2,'Story Street':3,'Wordwood Garden':4},
  companionBond:5,
  purchaseReceipts:[],
  activeQuestReceipt:'',
  lastCompletedQuestReceipt:''
};

const browser = await chromium.launch({headless:true});
const browserVersion = browser.version();
const context = await browser.newContext({viewport:{width:1408,height:1056}});
await context.addInitScript(({key,seed,marker}) => {
  if(sessionStorage.getItem(marker)) return;
  if(!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(seed));
  sessionStorage.setItem(marker,'1');
},{key:SAVE_KEY,seed:syntheticSeed,marker:'starblox-persistence-seed-once'});
const page = await context.newPage();
page.on('console',message => { if(message.type() === 'error') results.push({name:'browser-console-error',status:'FAIL',text:message.text()}); });
page.on('pageerror',error => results.push({name:'browser-pageerror',status:'FAIL',text:error.message}));

let fatal = null;
try{
  await page.goto(BASE_URL,{waitUntil:'networkidle'});
  await page.waitForTimeout(250);

  await record('initial-synthetic-state-and-catalog-art-invariant',async () => {
    const save = await readSave(page);
    assert(save.coins === 2000 && save.stars === 50 && save.xp === 123,'Synthetic currency/XP changed on boot',{save:critical(save)});
    assert(save.owned.includes('future-no-art-999'),'Unknown/no-art owned ID was pruned');
    assert(save.equipped.back === 'future-no-art-999','Unknown/no-art equipped ID was pruned');
    assert(save.roomDecor.includes('future-no-art-room'),'Unknown/no-art room placement was pruned');
    assert(save.dreamGoalId === 'future-no-art-goal','Unknown/no-art Dream Goal ID was changed');
    assert(save.equipped.companion === 'companions-3' && save.owned.includes('companions-3'),'Accepted companion art integration changed ownership/equipment semantics');
    return {state:critical(save)};
  },page);

  await record('rapid-purchase-exactly-once-and-reload',async () => {
    const before = await readSave(page);
    const buy = await selectedBuy(page,'tops','tops-2');
    await buy.evaluate(el => { el.click(); el.click(); });
    const after = await waitForSave(page,value => value.owned?.includes('tops-2') && value.purchaseReceipts?.includes('tops-2'));
    assert(after.coins === before.coins - 45,'Rapid purchase charged wrong amount',{before:critical(before),after:critical(after)});
    assert(after.starWorth === before.starWorth + 45,'Rapid purchase changed Star Worth incorrectly');
    assert(count(after.owned,'tops-2') === 1 && count(after.purchaseReceipts,'tops-2') === 1,'Rapid purchase duplicated ownership/receipt');
    assert(after.daily.purchase === before.daily.purchase + 1,'Rapid purchase duplicated/missed daily purchase progress');
    await page.reload({waitUntil:'networkidle'});
    const reloaded = await readSave(page);
    assert(reloaded.coins === after.coins && count(reloaded.owned,'tops-2') === 1 && count(reloaded.purchaseReceipts,'tops-2') === 1,'Purchase changed after reload');
    return {before:critical(before),after:critical(after),reloaded:critical(reloaded)};
  },page);

  await record('equip-persists-after-reload',async () => {
    const equip = await selectedTry(page,'tops','tops-2');
    await equip.click();
    const after = await waitForSave(page,value => value.equipped?.top === 'tops-2');
    await page.reload({waitUntil:'networkidle'});
    const reloaded = await readSave(page);
    assert(reloaded.equipped.top === 'tops-2','Equipped top disappeared after reload');
    assert(reloaded.equipped.back === 'future-no-art-999','Unrelated unknown equipped item was pruned');
    return {after:critical(after),reloaded:critical(reloaded)};
  },page);

  await record('room-double-tap-guard-place-put-away-reload',async () => {
    const before = await readSave(page);
    const putAway = await selectedTry(page,'beds','beds-1');
    await putAway.evaluate(el => { el.click(); el.click(); });
    const removed = await waitForSave(page,value => !value.roomDecor?.includes('beds-1'));
    assert(removed.roomDecor.includes('future-no-art-room'),'Unknown/no-art room placement was pruned by room toggle');
    await page.reload({waitUntil:'networkidle'});
    const place = await selectedTry(page,'beds','beds-1');
    await place.click();
    const restored = await waitForSave(page,value => value.roomDecor?.includes('beds-1'));
    await page.reload({waitUntil:'networkidle'});
    const reloaded = await readSave(page);
    assert(count(reloaded.roomDecor,'beds-1') === 1 && reloaded.roomDecor.includes('future-no-art-room'),'Room placement failed reload/no-art invariant');
    return {before:critical(before),removed:critical(removed),restored:critical(restored),reloaded:critical(reloaded)};
  },page);

  await record('multi-tab-same-purchase-replay-exactly-once',async () => {
    const tab2 = await context.newPage();
    await tab2.goto(BASE_URL,{waitUntil:'networkidle'});
    const before = await readSave(page);
    const first = await selectedBuy(page,'tops','tops-3');
    const second = await selectedBuy(tab2,'tops','tops-3');
    await Promise.all([first.click(),second.click()]);
    const after = await waitForSave(page,value => value.owned?.includes('tops-3') && value.purchaseReceipts?.includes('tops-3'));
    await page.waitForTimeout(250);
    const settled = await readSave(page);
    assert(settled.coins === before.coins - 65,'Multi-tab replay charged purchase more than once',{before:critical(before),after:critical(settled)});
    assert(count(settled.owned,'tops-3') === 1 && count(settled.purchaseReceipts,'tops-3') === 1,'Multi-tab replay duplicated ownership/receipt');
    assert(settled.daily.purchase === before.daily.purchase + 1,'Multi-tab replay duplicated daily purchase progress');
    await tab2.reload({waitUntil:'networkidle'});
    const tab2Reloaded = await readSave(tab2);
    assert(tab2Reloaded.coins === settled.coins && count(tab2Reloaded.owned,'tops-3') === 1,'Second tab did not converge after reload');
    await tab2.close();
    return {before:critical(before),after:critical(after),settled:critical(settled),tab2Reloaded:critical(tab2Reloaded)};
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
    await page.waitForTimeout(500);
    const before = await readSave(page);
    const backup = await readIndexedBackup(page);
    assert(backup && backup.coins === before.coins,'IndexedDB backup did not contain current synthetic state',{before:critical(before),backup:backup ? critical(backup) : null});
    await page.evaluate(key => localStorage.removeItem(key),SAVE_KEY);
    await page.reload({waitUntil:'networkidle'});
    const recovered = await waitForSave(page,value => value.owned?.includes('future-no-art-999') && value.equipped?.back === 'future-no-art-999',[],5000);
    assert(recovered.coins === before.coins && recovered.xp === before.xp && recovered.stars === before.stars,'IndexedDB recovery changed currency/XP');
    assert(recovered.roomDecor.includes('future-no-art-room') && recovered.dreamGoalId === 'future-no-art-goal','IndexedDB recovery pruned no-art placement/Dream Goal');
    return {before:critical(before),recovered:critical(recovered)};
  },page);

  await record('quest-retry-rapid-answer-and-final-refresh-exactly-once',async () => {
    await openQuest(page);
    const beforeQuest = await readSave(page);
    const retry = await exerciseWrongRetry(page);
    const rapid = await solveCorrect(page,{rapid:true});
    await solveCorrect(page);
    await solveCorrect(page);

    const finalQuestion = await currentQuestion(page);
    const beforeFinal = await readSave(page);
    const started = Date.now();
    await clickAnswer(page,finalQuestion.answer);
    const committed = await waitForSave(page,value => Boolean(value.lastCompletedQuestReceipt) && value.questsCompleted >= 8,[],850);
    const commitMs = Date.now() - started;
    assert(commitMs < 900,'Final Quest completion was not durable before 950ms presentation transition',{commitMs});
    assert(committed.questsCompleted === beforeFinal.questsCompleted + 1,'Final Quest completion count was not committed exactly once');
    assert(committed.companionBond === beforeFinal.companionBond + 1,'Buddy Bond completion reward was not committed exactly once');
    assert(committed.daily.quests === beforeFinal.daily.quests + 1,'Daily Quest completion was not committed exactly once');
    assert(committed.coins >= beforeFinal.coins + 30 && committed.xp >= beforeFinal.xp + 30,'Final Quest completion reward missing before refresh');
    await page.reload({waitUntil:'networkidle'});
    const afterRefresh = await readSave(page);
    assert(afterRefresh.questsCompleted === committed.questsCompleted,'Quest completion duplicated/disappeared after refresh');
    assert(afterRefresh.companionBond === committed.companionBond && afterRefresh.daily.quests === committed.daily.quests,'Quest completion side effects changed after refresh');
    assert(afterRefresh.lastCompletedQuestReceipt === committed.lastCompletedQuestReceipt,'Quest completion receipt disappeared after refresh');
    return {beforeQuest:critical(beforeQuest),retry,rapid,beforeFinal:critical(beforeFinal),commitMs,committed:critical(committed),afterRefresh:critical(afterRefresh)};
  },page);

  await record('final-core-progress-and-no-art-invariants',async () => {
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
    browser:`Chromium ${browserVersion} via Playwright`,
    cases:results
  };
  await fs.writeFile(path.join(OUTPUT,'report.json'),JSON.stringify(report,null,2));
  await fs.writeFile(path.join(OUTPUT,'summary.txt'),[
    `PERSISTENCE_BROWSER_QA_STATUS=${report.status}`,
    `SOURCE_HEAD=${report.sourceHead || 'unknown'}`,
    `BROWSER=${report.browser}`,
    `PASS=${results.filter(result => result.status === 'PASS').length}`,
    `FAIL=${results.filter(result => result.status === 'FAIL').length}`,
    ...results.map(result => `${result.status} ${result.name}${result.error ? ` :: ${result.error}` : ''}`)
  ].join('\n')+'\n');
  await browser.close();
}

if(fatal || results.some(result => result.status === 'FAIL')) process.exit(1);
