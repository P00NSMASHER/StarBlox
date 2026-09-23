import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { gameModel } from '../src/gameModel.js';
import '../src/questionQualityRuntime.js';
import '../src/semanticQuestionGuardRuntime.js';
import '../src/diagnosticQuestionGuardRuntime.js';

const BASE_URL = process.env.STARBLOX_QA_URL || 'http://127.0.0.1:4173';
const OUTPUT = process.env.STARBLOX_QA_OUTPUT || 'artifacts/persistence-quest-timing-qa';
const SAVE_KEY = 'starblox-save-v2';
const allQuestions = gameModel.buildQuestions();

await fs.mkdir(OUTPUT, { recursive: true });

function assert(ok, message, details = {}) {
  if (!ok) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function errorDetail(error) {
  return error ? { name: error.name || 'Error', message: error.message || String(error), details: error.details || null } : null;
}

function critical(save) {
  return {
    coins: save?.coins,
    stars: save?.stars,
    xp: save?.xp,
    starWorth: save?.starWorth,
    owned: [...(save?.owned || [])],
    equipped: { ...(save?.equipped || {}) },
    roomDecor: [...(save?.roomDecor || [])],
    dreamGoalId: save?.dreamGoalId,
    questsCompleted: save?.questsCompleted,
    daily: { ...(save?.daily || {}) },
    mastered: [...(save?.mastered || [])],
    transferWins: save?.transferWins,
    companionBond: save?.companionBond,
    districtProgress: { ...(save?.districtProgress || {}) },
    activeQuestReceipt: save?.activeQuestReceipt,
    lastCompletedQuestReceipt: save?.lastCompletedQuestReceipt
  };
}

async function readSave(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), SAVE_KEY);
}

async function waitSave(page, predicate, args = [], timeout = 2500) {
  await page.waitForFunction(
    ({ key, args, src }) => {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      return Function('value', 'args', `return (${src})(value,args)`)(JSON.parse(raw), args);
    },
    { key: SAVE_KEY, args, src: predicate.toString() },
    { timeout }
  );
  return readSave(page);
}

function sameChoices(a, b) {
  if (a.length !== b.length) return false;
  const aa = [...a].map(String).sort();
  const bb = [...b].map(String).sort();
  return aa.every((value, index) => value === bb[index]);
}

async function currentQuestion(page) {
  const prompt = (await page.locator('.questionText').textContent())?.trim();
  const visibleChoices = (await page.locator('.answers .answerButton').allTextContents()).map(value => value.trim());
  const candidates = allQuestions.filter(question => question.prompt === prompt);
  const question = candidates.find(candidate => sameChoices(candidate.choices, visibleChoices));
  assert(question, 'Rendered Quest question could not be matched to hardened source by prompt+choices', {
    prompt,
    visibleChoices,
    candidateIds: candidates.map(candidate => candidate.id),
    candidateChoices: candidates.map(candidate => candidate.choices)
  });
  assert(visibleChoices.includes(question.answer), 'Hardened source answer is not one of the rendered choices', {
    questionId: question.id,
    answer: question.answer,
    visibleChoices
  });
  return { question, visibleChoices };
}

async function findChoiceButton(page, choice) {
  const buttons = page.locator('.answers .answerButton');
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if ((await button.textContent())?.trim() === choice) return button;
  }
  return null;
}

async function clickChoice(page, choice, { rapid = false } = {}) {
  const target = await findChoiceButton(page, choice);
  assert(target, 'Rendered answer button not found', {
    choice,
    rendered: (await page.locator('.answers .answerButton').allTextContents()).map(value => value.trim())
  });
  if (rapid) {
    await target.evaluate(element => { element.click(); element.click(); });
  } else {
    await target.click();
  }
  await page.locator('.feedback').waitFor({ state: 'visible' });
}

async function waitForNextQuestion(page, previousCounter) {
  await page.waitForFunction(
    previous => document.querySelector('.qCounter')?.textContent?.trim() !== previous,
    previousCounter,
    { timeout: 2500 }
  );
}

async function answerCorrect(page, { rapid = false } = {}) {
  const { question } = await currentQuestion(page);
  const counter = (await page.locator('.qCounter').textContent())?.trim();
  const before = await readSave(page);
  const old = before.stats?.[question.skill] || { seen: 0, correct: 0, independentCorrect: 0 };
  await clickChoice(page, question.answer, { rapid });
  const after = await waitSave(
    page,
    (value, args) => {
      const [skill, seen, correct] = args;
      const stat = value.stats?.[skill];
      return stat?.seen >= seen && stat?.correct >= correct;
    },
    [question.skill, (old.seen || 0) + 1, (old.correct || 0) + 1]
  );
  if (rapid) {
    const stat = after.stats[question.skill];
    assert(stat.seen === (old.seen || 0) + 1, 'Rapid correct double-click duplicated seen evidence', { old, stat });
    assert(stat.correct === (old.correct || 0) + 1, 'Rapid correct double-click duplicated correct evidence', { old, stat });
    assert(stat.independentCorrect === (old.independentCorrect || 0) + 1, 'Rapid correct double-click duplicated independent evidence', { old, stat });
  }
  await waitForNextQuestion(page, counter);
  return { id: question.id, before: critical(before), after: critical(after) };
}

async function wrongRetryThenAssisted(page) {
  const { question } = await currentQuestion(page);
  const counter = (await page.locator('.qCounter').textContent())?.trim();
  const wrong = question.choices.find(choice => choice !== question.answer);
  const before = await readSave(page);
  const oldStat = before.stats?.[question.skill] || { wrong: 0, correct: 0 };

  await clickChoice(page, wrong);
  const firstWrong = await waitSave(
    page,
    (value, args) => (value.stats?.[args[0]]?.wrong || 0) >= args[1],
    [question.skill, (oldStat.wrong || 0) + 1]
  );

  await page.getByRole('button', { name: /Try again with the clue/i }).click();
  await clickChoice(page, wrong);
  await page.waitForTimeout(100);
  const repeatedWrong = await readSave(page);

  assert(repeatedWrong.coins === firstWrong.coins, 'Repeated wrong retry farmed Coins');
  assert(repeatedWrong.stars === firstWrong.stars, 'Repeated wrong retry farmed Mastery Stars');
  assert(repeatedWrong.xp === firstWrong.xp, 'Repeated wrong retry farmed XP');
  assert((repeatedWrong.stats?.[question.skill]?.wrong || 0) === (firstWrong.stats?.[question.skill]?.wrong || 0), 'Repeated wrong retry duplicated wrong evidence');

  await page.getByRole('button', { name: /Try again with the clue/i }).click();
  const masteryBefore = JSON.stringify(repeatedWrong.mastered || []);
  const transferBefore = repeatedWrong.transferWins || 0;
  const correctBefore = repeatedWrong.stats?.[question.skill]?.correct || 0;
  const independentBefore = repeatedWrong.stats?.[question.skill]?.independentCorrect || 0;

  await clickChoice(page, question.answer);
  const assisted = await waitSave(
    page,
    (value, args) => (value.stats?.[args[0]]?.correct || 0) >= args[1],
    [question.skill, correctBefore + 1]
  );

  assert(assisted.coins === repeatedWrong.coins, 'Assisted retry awarded Coins');
  assert(assisted.stars === repeatedWrong.stars, 'Assisted retry awarded Mastery Star');
  assert((assisted.transferWins || 0) === transferBefore, 'Assisted retry awarded transfer evidence');
  assert(JSON.stringify(assisted.mastered || []) === masteryBefore, 'Assisted retry changed mastery');
  assert((assisted.stats?.[question.skill]?.independentCorrect || 0) === independentBefore, 'Assisted retry counted as independent evidence');

  await waitForNextQuestion(page, counter);
  return {
    id: question.id,
    before: critical(before),
    firstWrong: critical(firstWrong),
    repeatedWrong: critical(repeatedWrong),
    assisted: critical(assisted)
  };
}

const today = new Date().toISOString().slice(0, 10);
const seed = {
  stateVersion: 2,
  coins: 1890,
  stars: 50,
  xp: 123,
  starWorth: 887,
  owned: ['tops-1', 'bottoms-1', 'shoes-1', 'beds-1', 'desks-1', 'companions-1', 'future-no-art-999', 'future-no-art-room'],
  purchaseReceipts: [],
  equipped: { top: 'tops-1', bottom: 'bottoms-1', shoes: 'shoes-1', companion: 'companions-1', back: 'future-no-art-999' },
  stats: {},
  mastered: ['synthetic-skill'],
  roomDecor: ['beds-1', 'future-no-art-room'],
  questsCompleted: 7,
  transferWins: 4,
  lastDailyKey: today,
  daily: { quests: 0, transfers: 0, purchase: 0 },
  dreamGoalId: 'future-no-art-goal',
  districtProgress: { 'Lantern Lane': 2, 'Story Street': 3, 'Wordwood Garden': 4 },
  companionBond: 5,
  activeQuestReceipt: '',
  lastCompletedQuestReceipt: ''
};

function summarizeProbeStream(stream, clickStartedAt, clickEndedAt) {
  const heartbeats = stream.filter(entry => entry.kind === 'heartbeat');
  const inputEvents = stream.filter(entry => entry.kind === 'input');
  const mutations = stream.filter(entry => entry.kind === 'mutation');
  const longTasks = stream.filter(entry => entry.kind === 'longtask');
  const lastHeartbeat = heartbeats.at(-1) || null;
  return {
    heartbeatCount: heartbeats.length,
    maxHeartbeatLagMs: heartbeats.reduce((max, entry) => Math.max(max, Number(entry.lagMs) || 0), 0),
    lastHeartbeatNodeAt: lastHeartbeat?.nodeAt || null,
    heartbeatLiveNearClickEnd: Boolean(lastHeartbeat && clickEndedAt - lastHeartbeat.nodeAt <= 750),
    inputEvents,
    mutations: mutations.slice(-80),
    longTasks: longTasks.slice(-30),
    heartbeatTail: heartbeats.slice(-30)
  };
}

async function installQuestClickProbe(page, stream) {
  await page.exposeFunction('__sbQaProbeEmit', payload => {
    stream.push({ ...payload, nodeAt: Date.now() });
    if (stream.length > 1600) stream.splice(0, stream.length - 1600);
  });
  await page.evaluate(() => {
    const describe = element => element ? {
      tag: element.tagName,
      id: element.id || '',
      className: typeof element.className === 'string' ? element.className : '',
      text: (element.textContent || '').trim().slice(0, 120)
    } : null;
    const findTarget = () => [...document.querySelectorAll('.answers .answerButton')].find(button => (button.textContent || '').trim() === window.__sbQaTargetChoice) || null;
    let last = performance.now();
    window.__sbQaProbeTimer = setInterval(() => {
      const now = performance.now();
      const lagMs = Math.max(0, now - last - 50);
      last = now;
      const target = findTarget();
      const feedback = document.querySelector('.feedback');
      window.__sbQaProbeEmit({
        kind: 'heartbeat',
        phase: window.__sbQaProbePhase || 'unset',
        perfAt: now,
        lagMs,
        targetConnected: Boolean(target?.isConnected),
        targetClass: target?.className || '',
        targetDisabled: Boolean(target?.disabled),
        feedbackClass: feedback?.className || '',
        feedbackText: (feedback?.textContent || '').trim().slice(0, 120),
        runningAnimationCount: document.getAnimations().filter(animation => animation.playState === 'running').length
      });
    }, 50);
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      document.addEventListener(type, event => {
        window.__sbQaProbeEmit({
          kind: 'input',
          phase: window.__sbQaProbePhase || 'unset',
          type,
          perfAt: performance.now(),
          isTrusted: event.isTrusted,
          eventTarget: describe(event.target),
          answerTarget: describe(findTarget())
        });
      }, true);
    }
    const observer = new MutationObserver(records => {
      for (const record of records) {
        const element = record.target?.nodeType === Node.ELEMENT_NODE ? record.target : record.target?.parentElement;
        if (!element) continue;
        const relevant = element.closest?.('.answers, .feedback, .questPage, .quest-shell') || element.matches?.('.answerButton, .feedback');
        if (!relevant) continue;
        window.__sbQaProbeEmit({
          kind: 'mutation',
          phase: window.__sbQaProbePhase || 'unset',
          perfAt: performance.now(),
          type: record.type,
          attributeName: record.attributeName || null,
          target: describe(element)
        });
      }
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'disabled', 'aria-disabled'] });
    window.__sbQaProbeObserver = observer;
    if (window.PerformanceObserver?.supportedEntryTypes?.includes('longtask')) {
      const perfObserver = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          window.__sbQaProbeEmit({ kind: 'longtask', phase: window.__sbQaProbePhase || 'unset', perfAt: performance.now(), startTime: entry.startTime, duration: entry.duration });
        }
      });
      perfObserver.observe({ entryTypes: ['longtask'] });
      window.__sbQaLongTaskObserver = perfObserver;
    }
  });
}

async function stopQuestClickProbe(page) {
  await page.evaluate(() => {
    if (window.__sbQaProbeTimer) clearInterval(window.__sbQaProbeTimer);
    window.__sbQaProbeObserver?.disconnect?.();
    window.__sbQaLongTaskObserver?.disconnect?.();
  }).catch(() => {});
}

async function interactionSnapshot(page, choice) {
  return page.evaluate(targetChoice => {
    const describe = element => element ? {
      tag: element.tagName,
      id: element.id || '',
      className: typeof element.className === 'string' ? element.className : '',
      text: (element.textContent || '').trim().slice(0, 180)
    } : null;
    const target = [...document.querySelectorAll('.answers .answerButton')].find(button => (button.textContent || '').trim() === targetChoice) || null;
    if (!target) return { targetFound: false, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
    const rect = target.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const hit = document.elementFromPoint(center.x, center.y);
    const style = getComputedStyle(target);
    const animations = document.getAnimations().map(animation => {
      const timing = animation.effect?.getComputedTiming?.() || {};
      const animationTarget = animation.effect?.target || null;
      const finite = value => Number.isFinite(Number(value)) ? Number(value) : String(value);
      return {
        playState: animation.playState,
        currentTime: finite(animation.currentTime),
        target: describe(animationTarget),
        duration: finite(timing.duration),
        endTime: finite(timing.endTime)
      };
    }).slice(0, 80);
    return {
      targetFound: true,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      target: describe(target),
      targetRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      center,
      hitTarget: describe(hit),
      hitIsTargetOrDescendant: hit === target || Boolean(target.contains(hit)),
      targetDisabled: Boolean(target.disabled),
      ariaDisabled: target.getAttribute('aria-disabled'),
      style: {
        pointerEvents: style.pointerEvents,
        visibility: style.visibility,
        display: style.display,
        opacity: style.opacity,
        position: style.position,
        zIndex: style.zIndex,
        transform: style.transform,
        animationName: style.animationName,
        animationDuration: style.animationDuration,
        transitionProperty: style.transitionProperty,
        transitionDuration: style.transitionDuration
      },
      feedback: describe(document.querySelector('.feedback')),
      activeElement: describe(document.activeElement),
      runningAnimationCount: animations.filter(animation => animation.playState === 'running').length,
      animations
    };
  }, choice);
}

async function runPointerStage(page, stream, phase, choice) {
  await page.evaluate(({ nextPhase, nextChoice }) => {
    window.__sbQaProbePhase = nextPhase;
    window.__sbQaTargetChoice = nextChoice;
  }, { nextPhase: phase, nextChoice: choice });
  const before = await interactionSnapshot(page, choice);
  const target = await findChoiceButton(page, choice);
  assert(target, 'Pointer-stage target answer button not found', { phase, choice });
  const streamStart = stream.length;
  const clickStartedAt = Date.now();
  let clickError = null;
  try {
    await target.click({ timeout: 30000 });
  } catch (error) {
    clickError = error;
  }
  const clickEndedAt = Date.now();
  const stageStream = stream.slice(streamStart);
  const probe = summarizeProbeStream(stageStream, clickStartedAt, clickEndedAt);
  return {
    phase,
    choice,
    status: clickError ? 'FAIL' : 'PASS',
    clickDurationMs: clickEndedAt - clickStartedAt,
    clickError: errorDetail(clickError),
    before,
    probe
  };
}

async function runWrongRetryIsolation(browser, reducedMotion) {
  const mode = reducedMotion === 'reduce' ? 'reduced-motion' : 'normal-motion';
  const context = await browser.newContext({ viewport: { width: 1408, height: 1056 }, reducedMotion });
  const page = await context.newPage();
  const stream = [];
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const stages = [];
  let question = null;
  let screenshot = null;
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => requestFailures.push({ url: request.url(), error: request.failure()?.errorText || null }));

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(({ key, seedValue }) => localStorage.setItem(key, JSON.stringify(seedValue)), { key: SAVE_KEY, seedValue: seed });
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.navBtn').filter({ hasText: /^Quests$/ }).first().click();
    const begin = page.getByRole('button', { name: /Begin Quest|Start 5-Action Quest/i }).first();
    if (await begin.count()) await begin.click();
    await page.locator('.qCounter').waitFor({ state: 'visible' });

    ({ question } = await currentQuestion(page));
    const wrong = question.choices.find(choice => choice !== question.answer);
    const before = await readSave(page);
    const oldStat = before.stats?.[question.skill] || { wrong: 0, correct: 0 };
    await installQuestClickProbe(page, stream);

    const firstWrongStage = await runPointerStage(page, stream, 'first-wrong', wrong);
    stages.push(firstWrongStage);
    if (firstWrongStage.status === 'FAIL') throw Object.assign(new Error('Real pointer failed on first intentional wrong answer'), { details: { failedStage: 'first-wrong', stage: firstWrongStage } });
    await page.locator('.feedback').waitFor({ state: 'visible' });
    const firstWrong = await waitSave(
      page,
      (value, args) => (value.stats?.[args[0]]?.wrong || 0) >= args[1],
      [question.skill, (oldStat.wrong || 0) + 1]
    );

    await page.getByRole('button', { name: /Try again with the clue/i }).click();
    const repeatedWrongStage = await runPointerStage(page, stream, 'repeated-wrong', wrong);
    stages.push(repeatedWrongStage);
    if (repeatedWrongStage.status === 'FAIL') throw Object.assign(new Error('Real pointer failed on repeated intentional wrong retry'), { details: { failedStage: 'repeated-wrong', stage: repeatedWrongStage } });
    await page.locator('.feedback').waitFor({ state: 'visible' });
    await page.waitForTimeout(100);
    const repeatedWrong = await readSave(page);
    assert(repeatedWrong.coins === firstWrong.coins, 'Isolation repeated wrong retry farmed Coins');
    assert(repeatedWrong.stars === firstWrong.stars, 'Isolation repeated wrong retry farmed Mastery Stars');
    assert(repeatedWrong.xp === firstWrong.xp, 'Isolation repeated wrong retry farmed XP');
    assert((repeatedWrong.stats?.[question.skill]?.wrong || 0) === (firstWrong.stats?.[question.skill]?.wrong || 0), 'Isolation repeated wrong retry duplicated wrong evidence');

    await page.getByRole('button', { name: /Try again with the clue/i }).click();
    const masteryBefore = JSON.stringify(repeatedWrong.mastered || []);
    const transferBefore = repeatedWrong.transferWins || 0;
    const correctBefore = repeatedWrong.stats?.[question.skill]?.correct || 0;
    const independentBefore = repeatedWrong.stats?.[question.skill]?.independentCorrect || 0;
    const assistedStage = await runPointerStage(page, stream, 'assisted-correct', question.answer);
    stages.push(assistedStage);
    if (assistedStage.status === 'FAIL') throw Object.assign(new Error('Real pointer failed on assisted-correct retry'), { details: { failedStage: 'assisted-correct', stage: assistedStage } });
    await page.locator('.feedback').waitFor({ state: 'visible' });
    const assisted = await waitSave(
      page,
      (value, args) => (value.stats?.[args[0]]?.correct || 0) >= args[1],
      [question.skill, correctBefore + 1]
    );
    assert(assisted.coins === repeatedWrong.coins, 'Isolation assisted retry awarded Coins');
    assert(assisted.stars === repeatedWrong.stars, 'Isolation assisted retry awarded Mastery Star');
    assert((assisted.transferWins || 0) === transferBefore, 'Isolation assisted retry awarded transfer evidence');
    assert(JSON.stringify(assisted.mastered || []) === masteryBefore, 'Isolation assisted retry changed mastery');
    assert((assisted.stats?.[question.skill]?.independentCorrect || 0) === independentBefore, 'Isolation assisted retry counted as independent evidence');

    await stopQuestClickProbe(page);
    await context.close();
    return {
      status: 'PASS',
      mode,
      viewport: { width: 1408, height: 1056 },
      questionId: question.id,
      prompt: question.prompt,
      answer: question.answer,
      wrong,
      stages,
      consoleErrors,
      pageErrors,
      requestFailures,
      screenshot
    };
  } catch (error) {
    const failedStage = error.details?.failedStage || stages.find(stage => stage.status === 'FAIL')?.phase || null;
    const failed = stages.find(stage => stage.phase === failedStage) || stages.at(-1) || null;
    const safeToInteract = Boolean(failed?.probe?.heartbeatLiveNearClickEnd);
    if (safeToInteract) {
      screenshot = path.join(OUTPUT, `quest-wrong-retry-${mode}-${failedStage || 'failure'}.png`);
      await page.screenshot({ path: screenshot, fullPage: true, timeout: 5000 }).catch(() => { screenshot = null; });
      await stopQuestClickProbe(page);
      await context.close().catch(() => {});
    }
    return {
      status: 'FAIL',
      mode,
      viewport: { width: 1408, height: 1056 },
      questionId: question?.id || null,
      prompt: question?.prompt || null,
      answer: question?.answer || null,
      wrong: question?.choices?.find(choice => choice !== question.answer) || null,
      failedStage,
      error: errorDetail(error),
      stages,
      consoleErrors,
      pageErrors,
      requestFailures,
      screenshot
    };
  }
}

const results = [];
let fatal = null;
const browser = await chromium.launch({ headless: true });
const browserVersion = browser.version();

for (const reducedMotion of ['no-preference', 'reduce']) {
  const started = Date.now();
  const detail = await runWrongRetryIsolation(browser, reducedMotion);
  results.push({
    name: `quest-wrong-retry-pointer-isolation-${detail.mode}`,
    status: detail.status,
    durationMs: Date.now() - started,
    error: detail.error?.message || null,
    screenshot: detail.screenshot || null,
    detail
  });
}

const context = await browser.newContext({ viewport: { width: 1408, height: 1056 } });
const page = await context.newPage();

async function record(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    results.push({ name, status: 'PASS', durationMs: Date.now() - started, detail });
    return detail;
  } catch (error) {
    let screenshot = null;
    try {
      screenshot = path.join(OUTPUT, `${name}-failure.png`);
      await page.screenshot({ path: screenshot, fullPage: true, timeout: 5000 });
    } catch {}
    results.push({ name, status: 'FAIL', durationMs: Date.now() - started, error: error.message, details: error.details || null, screenshot });
    throw error;
  }
}

try {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.evaluate(({ key, seedValue }) => localStorage.setItem(key, JSON.stringify(seedValue)), { key: SAVE_KEY, seedValue: seed });
  await page.reload({ waitUntil: 'networkidle' });

  await record('quest-wrong-retry-rapid-correct-final-refresh', async () => {
    await page.locator('.navBtn').filter({ hasText: /^Quests$/ }).first().click();
    const begin = page.getByRole('button', { name: /Begin Quest|Start 5-Action Quest/i }).first();
    if (await begin.count()) await begin.click();
    await page.locator('.qCounter').waitFor({ state: 'visible' });

    const beforeQuest = await readSave(page);
    assert(Boolean(beforeQuest.activeQuestReceipt), 'Quest did not persist an active receipt before answering');

    const retry = await wrongRetryThenAssisted(page);
    const rapid = await answerCorrect(page, { rapid: true });
    await answerCorrect(page);
    await answerCorrect(page);

    const { question: finalQuestion } = await currentQuestion(page);
    const beforeFinal = await readSave(page);
    const started = Date.now();
    await clickChoice(page, finalQuestion.answer);
    const committed = await waitSave(
      page,
      value => Boolean(value.lastCompletedQuestReceipt) && value.questsCompleted >= 8,
      [],
      850
    );
    const commitMs = Date.now() - started;

    assert(commitMs < 900, 'Final Quest completion was not durable before the 950ms presentation timer', { commitMs });
    assert(committed.questsCompleted === beforeFinal.questsCompleted + 1, 'Quest completion count missed or duplicated');
    assert(committed.companionBond === beforeFinal.companionBond + 1, 'Buddy Bond completion missed or duplicated');
    assert(committed.daily.quests === beforeFinal.daily.quests + 1, 'Daily Quest completion missed or duplicated');
    assert(committed.coins >= beforeFinal.coins + 30, 'Final Quest completion Coins missing');
    assert(committed.xp >= beforeFinal.xp + 30, 'Final Quest completion XP missing');
    assert(committed.activeQuestReceipt === '', 'Active Quest receipt was not cleared on completion');

    await page.reload({ waitUntil: 'networkidle' });
    const reloaded = await readSave(page);
    assert(reloaded.questsCompleted === committed.questsCompleted, 'Immediate refresh changed Quest completion count');
    assert(reloaded.companionBond === committed.companionBond, 'Immediate refresh changed Buddy Bond completion');
    assert(reloaded.daily.quests === committed.daily.quests, 'Immediate refresh changed daily Quest completion');
    assert(reloaded.coins === committed.coins && reloaded.xp === committed.xp && reloaded.stars === committed.stars, 'Immediate refresh changed completion rewards');
    assert(reloaded.lastCompletedQuestReceipt === committed.lastCompletedQuestReceipt, 'Completion receipt was lost on immediate refresh');
    assert(reloaded.owned.includes('future-no-art-999') && reloaded.equipped.back === 'future-no-art-999', 'Unknown/no-art owned/equipped state was pruned during Quest reload');
    assert(reloaded.roomDecor.includes('future-no-art-room') && reloaded.dreamGoalId === 'future-no-art-goal', 'Unknown/no-art room/Dream Goal state was pruned during Quest reload');

    return {
      beforeQuest: critical(beforeQuest),
      retry,
      rapid,
      finalQuestionId: finalQuestion.id,
      beforeFinal: critical(beforeFinal),
      commitMs,
      committed: critical(committed),
      reloaded: critical(reloaded)
    };
  });
} catch (error) {
  fatal = error;
} finally {
  const isolationCases = results.filter(result => result.name.startsWith('quest-wrong-retry-pointer-isolation-'));
  const report = {
    status: fatal || results.some(result => result.status === 'FAIL') ? 'FAIL' : 'PASS',
    sourceHead: process.env.GITHUB_SHA || null,
    syntheticOnly: true,
    noRealPlayerData: true,
    browser: `Chromium ${browserVersion} via Playwright`,
    wrongRetryPointerIsolation: {
      realPointerOnly: true,
      forceClickUsed: false,
      directRouteInjectionUsed: false,
      modes: isolationCases.map(result => result.detail)
    },
    cases: results
  };
  await fs.writeFile(path.join(OUTPUT, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(OUTPUT, 'summary.txt'), [
    `PERSISTENCE_QUEST_TIMING_QA_STATUS=${report.status}`,
    `SOURCE_HEAD=${report.sourceHead || 'unknown'}`,
    `BROWSER=${report.browser}`,
    `PASS=${results.filter(result => result.status === 'PASS').length}`,
    `FAIL=${results.filter(result => result.status === 'FAIL').length}`,
    ...results.map(result => `${result.status} ${result.name}${result.error ? ` :: ${result.error}` : ''}`)
  ].join('\n') + '\n');
  await context.close().catch(() => {});
  await browser.close();
}

if (fatal || results.some(result => result.status === 'FAIL')) process.exit(1);
