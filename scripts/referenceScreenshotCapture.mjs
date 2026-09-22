import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.STARBLOX_QA_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.STARBLOX_REFERENCE_OUTPUT || 'artifacts/reference-screenshot-capture';
const referenceDir = process.env.STARBLOX_REFERENCE_DIR || 'docs/preproduction/reference-screenshots';
const referenceRequired = process.env.STARBLOX_REFERENCE_REQUIRED === '1';
const strictDiff = process.env.STARBLOX_REFERENCE_STRICT_DIFF === '1';
const maxDiffRatio = Number(process.env.STARBLOX_REFERENCE_MAX_DIFF_RATIO || '0');
const sourceHead = process.env.GITHUB_SHA || null;

const viewports = [
  { name: 'desktop-1408x1056', width: 1408, height: 1056 },
  { name: 'tablet-1024x768', width: 1024, height: 768 },
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
await fs.mkdir(path.join(outputDir, 'candidate'), { recursive: true });
await fs.mkdir(path.join(outputDir, 'diff'), { recursive: true });
await fs.mkdir(path.join(outputDir, 'compare'), { recursive: true });

function record(entry) {
  results.push(entry);
  if (entry.releaseBlocking) releaseBlockingCount += 1;
  console.log(`[${entry.status}] ${entry.viewport || 'global'} ${entry.screen || ''} ${entry.check}: ${entry.message}`);
}

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

async function sha256(file) {
  const bytes = await fs.readFile(file);
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

async function clickNav(page, label) {
  const buttons = page.locator('.sidebar .navBtn');
  for (let i = 0; i < await buttons.count(); i += 1) {
    const button = buttons.nth(i);
    const text = (await button.innerText().catch(() => '')).trim();
    const aria = (await button.getAttribute('aria-label').catch(() => '')) || '';
    if (text.toLowerCase() === label.toLowerCase() || aria.toLowerCase() === label.toLowerCase()) {
      await button.click();
      await page.waitForTimeout(100);
      return true;
    }
  }
  return false;
}

async function openScreen(page, screen) {
  if (!await clickNav(page, screen.nav)) return false;
  if (screen.name === 'Quest') {
    await page.waitForSelector('.questPage', { state: 'attached', timeout: 8000 });
    const empty = page.locator('.questPage .emptyQuest');
    if (await empty.count()) {
      const begin = empty.locator('.primaryButton').first();
      if (await begin.count()) await begin.click();
    }
  }
  await page.waitForSelector(screen.selector, { state: 'attached', timeout: 8000 });
  if (screen.name === 'Store') {
    const tops = page.locator('.sbStoreCategoryRow button[data-collection-id="tops"]').first();
    if (await tops.count()) await tops.click();
  }
  return true;
}

async function settle(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    const images = [...document.images];
    await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    })));
    await Promise.all(images.map(img => typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve()));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.waitForTimeout(180);
}

async function keyboardProbe(page, screenSelector, viewport) {
  const start = page.locator(screenSelector).first();
  if (!await start.count()) return { tested: false, reason: 'screen-root-missing' };
  await page.locator('body').click({ position: { x: 1, y: 1 } }).catch(() => {});
  const visited = [];
  let clipped = 0;
  let obscured = 0;
  let visibleFocus = 0;
  let inScreen = 0;
  for (let i = 0; i < 36; i += 1) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(12);
    const state = await page.evaluate(({ selector }) => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      const root = document.querySelector(selector);
      const inside = Boolean(root && root.contains(el));
      const focusVisible = (parseFloat(s.outlineWidth) || 0) >= 2 || (s.boxShadow && s.boxShadow !== 'none');
      const fits = r.left >= -2 && r.right <= innerWidth + 2 && r.top >= -2 && r.bottom <= innerHeight + 2;
      const overlays = [...document.querySelectorAll('.sidebar,.topbar')].filter(node => {
        const q = node.getBoundingClientRect();
        const cs = getComputedStyle(node);
        return (cs.position === 'fixed' || cs.position === 'sticky') && q.width > 0 && q.height > 0 && cs.visibility !== 'hidden';
      });
      const overlap = overlays.some(node => {
        if (node.contains(el)) return false;
        const q = node.getBoundingClientRect();
        const area = Math.max(0, Math.min(r.right, q.right) - Math.max(r.left, q.left)) * Math.max(0, Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top));
        return area > 4;
      });
      return {
        inside,
        focusVisible,
        fits,
        overlap,
        text: (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
        tag: el.tagName,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height }
      };
    }, { selector: screenSelector });
    if (!state) continue;
    visited.push(state);
    if (state.inside) {
      inScreen += 1;
      if (state.focusVisible) visibleFocus += 1;
      if (!state.fits) clipped += 1;
      if (state.overlap) obscured += 1;
    }
  }
  return {
    tested: true,
    viewport: `${viewport.width}x${viewport.height}`,
    visitedCount: visited.length,
    screenFocusCount: inScreen,
    visibleFocusCount: visibleFocus,
    clipped,
    obscured,
    pass: inScreen > 0 && clipped === 0 && obscured === 0 && visibleFocus > 0,
    sample: visited.filter(x => x.inside).slice(0, 12)
  };
}

async function axeContrast(page) {
  const report = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  const violations = report.violations.map(v => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.slice(0, 12).map(n => ({ target: n.target, html: n.html.slice(0, 220), summary: n.failureSummary }))
  }));
  const incomplete = report.incomplete.filter(v => v.id === 'color-contrast').map(v => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.slice(0, 12).map(n => ({ target: n.target, html: n.html.slice(0, 220), summary: n.failureSummary }))
  }));
  return { violations, incomplete, passes: report.passes.filter(v => v.id === 'color-contrast').length };
}

function composeTriptych(reference, candidate, diff) {
  const out = new PNG({ width: reference.width * 3, height: reference.height });
  for (let y = 0; y < reference.height; y += 1) {
    for (let x = 0; x < reference.width; x += 1) {
      for (const [source, offset] of [[reference, 0], [candidate, reference.width], [diff, reference.width * 2]]) {
        const si = (y * source.width + x) * 4;
        const di = (y * out.width + x + offset) * 4;
        out.data[di] = source.data[si];
        out.data[di + 1] = source.data[si + 1];
        out.data[di + 2] = source.data[si + 2];
        out.data[di + 3] = source.data[si + 3];
      }
    }
  }
  return out;
}

async function compareReference(screen, viewport, candidatePath) {
  const basename = `${screen.name.toLowerCase()}-${viewport.name}.png`;
  const referencePath = path.join(referenceDir, basename);
  if (!await exists(referencePath)) {
    return { status: 'REFERENCE_MISSING_NOT_TESTED', referencePath, candidateSha256: await sha256(candidatePath) };
  }
  const referenceBytes = await fs.readFile(referencePath);
  const candidateBytes = await fs.readFile(candidatePath);
  const reference = PNG.sync.read(referenceBytes);
  const candidate = PNG.sync.read(candidateBytes);
  const referenceSha256 = crypto.createHash('sha256').update(referenceBytes).digest('hex');
  const candidateSha256 = crypto.createHash('sha256').update(candidateBytes).digest('hex');
  if (reference.width !== candidate.width || reference.height !== candidate.height) {
    return {
      status: 'DIMENSION_MISMATCH',
      referencePath,
      referenceSha256,
      candidateSha256,
      referenceDimensions: [reference.width, reference.height],
      candidateDimensions: [candidate.width, candidate.height]
    };
  }
  const diff = new PNG({ width: reference.width, height: reference.height });
  const mismatchedPixels = pixelmatch(reference.data, candidate.data, diff.data, reference.width, reference.height, { threshold: 0.1, includeAA: false });
  const totalPixels = reference.width * reference.height;
  const diffRatio = mismatchedPixels / totalPixels;
  const diffPath = path.join(outputDir, 'diff', basename);
  const comparePath = path.join(outputDir, 'compare', basename);
  await fs.writeFile(diffPath, PNG.sync.write(diff));
  await fs.writeFile(comparePath, PNG.sync.write(composeTriptych(reference, candidate, diff)));
  return {
    status: 'COMPARED',
    referencePath,
    referenceSha256,
    candidateSha256,
    dimensions: [reference.width, reference.height],
    mismatchedPixels,
    totalPixels,
    diffRatio,
    diffPath,
    comparePath,
    pass: !strictDiff || diffRatio <= maxDiffRatio
  };
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    for (const screen of screens) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
        colorScheme: 'light',
        locale: 'en-US',
        timezoneId: 'UTC'
      });
      const page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];
      page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
      page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      try {
        await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForSelector('.sidebar .navBtn', { timeout: 8000 });
        if (!await openScreen(page, screen)) throw new Error(`Could not open ${screen.name}`);
        await settle(page);

        const candidatePath = path.join(outputDir, 'candidate', `${screen.name.toLowerCase()}-${viewport.name}.png`);
        await page.screenshot({ path: candidatePath, fullPage: false, animations: 'disabled', caret: 'hide' });
        const candidateSha256 = await sha256(candidatePath);
        record({ viewport: viewport.name, screen: screen.name, check: 'deterministic-capture', status: 'PASS', releaseBlocking: false, message: `Captured ${viewport.width}x${viewport.height} viewport screenshot.`, metrics: { candidatePath, candidateSha256 } });

        const errorsPass = pageErrors.length === 0 && consoleErrors.length === 0;
        record({ viewport: viewport.name, screen: screen.name, check: 'runtime-errors', status: errorsPass ? 'PASS' : 'FAIL', releaseBlocking: !errorsPass, message: errorsPass ? 'No pageerror or console.error events.' : `${pageErrors.length} page errors; ${consoleErrors.length} console errors.`, metrics: { pageErrors, consoleErrors } });

        const keyboard = await keyboardProbe(page, screen.selector, viewport);
        record({ viewport: viewport.name, screen: screen.name, check: 'keyboard-focus-reachability', status: keyboard.tested ? (keyboard.pass ? 'PASS' : 'FAIL') : 'NOT_TESTED', releaseBlocking: keyboard.tested && !keyboard.pass, message: keyboard.tested ? `Screen focusables=${keyboard.screenFocusCount}; visible focus=${keyboard.visibleFocusCount}; clipped=${keyboard.clipped}; obscured=${keyboard.obscured}.` : keyboard.reason, metrics: keyboard });

        const contrast = await axeContrast(page);
        const contrastStatus = contrast.violations.length > 0 ? 'FAIL' : (contrast.incomplete.length > 0 ? 'NOT_TESTED' : 'PASS');
        record({ viewport: viewport.name, screen: screen.name, check: 'rendered-color-contrast', status: contrastStatus, releaseBlocking: contrast.violations.length > 0, message: contrast.violations.length ? `${contrast.violations.length} axe color-contrast violation groups.` : (contrast.incomplete.length ? `No confirmed violation; ${contrast.incomplete.length} color-contrast groups require manual/tool-assisted review.` : 'Axe found no color-contrast violations or incomplete nodes.'), metrics: contrast });

        const comparison = await compareReference(screen, viewport, candidatePath);
        const missing = comparison.status === 'REFERENCE_MISSING_NOT_TESTED';
        const dimensionFail = comparison.status === 'DIMENSION_MISMATCH';
        const strictDiffFail = strictDiff && comparison.status === 'COMPARED' && comparison.pass === false;
        const comparedDiagnostic = !strictDiff && comparison.status === 'COMPARED';
        const diffStatus = missing ? 'NOT_TESTED' : (dimensionFail || strictDiffFail) ? 'FAIL' : comparedDiagnostic ? 'DIAGNOSTIC' : 'PASS';
        const diffMessage = missing
          ? `Original reference file is not present at ${comparison.referencePath}.`
          : dimensionFail
            ? 'Reference/candidate dimensions differ.'
            : comparedDiagnostic
              ? `Diagnostic pixel comparison complete; mismatch ratio=${(comparison.diffRatio * 100).toFixed(4)}%. Non-strict comparison is not screenshot-parity or visual approval.`
              : `Strict pixel comparison complete; mismatch ratio=${(comparison.diffRatio * 100).toFixed(4)}% against max ${(maxDiffRatio * 100).toFixed(4)}%.`;
        record({ viewport: viewport.name, screen: screen.name, check: 'reference-pixel-diff', status: diffStatus, releaseBlocking: (referenceRequired && missing) || dimensionFail || strictDiffFail, message: diffMessage, metrics: { ...comparison, comparisonMode: strictDiff ? 'STRICT_RELEASE_GATE' : 'DIAGNOSTIC_ONLY_NOT_VISUAL_APPROVAL' } });
      } catch (error) {
        record({ viewport: viewport.name, screen: screen.name, check: 'capture-run', status: 'FAIL', releaseBlocking: true, message: String(error?.stack || error) });
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

const referenceComparisons = results.filter(r => r.check === 'reference-pixel-diff');
const referencePresentCount = referenceComparisons.filter(r => r.metrics?.status !== 'REFERENCE_MISSING_NOT_TESTED').length;
const summary = {
  generatedAt: new Date().toISOString(),
  sourceHead,
  baseUrl,
  referenceDir,
  emulation: 'Playwright Chromium headless; deviceScaleFactor=1; reduced motion; light color scheme; en-US; UTC; viewport screenshots only. Physical-device and screen-reader behavior are not inferred.',
  viewports,
  screens: screens.map(s => s.name),
  referenceRequired,
  strictDiff,
  maxDiffRatio,
  referenceComparisonMode: strictDiff ? 'STRICT_RELEASE_GATE' : 'DIAGNOSTIC_ONLY_NOT_VISUAL_APPROVAL',
  referencePresentCount,
  referenceExpectedCount: viewports.length * screens.length,
  releaseBlockingCount,
  status: releaseBlockingCount === 0 ? 'PASS' : 'FAIL',
  results
};
await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(summary, null, 2));
await fs.writeFile(path.join(outputDir, 'summary.txt'), `${summary.status}: ${releaseBlockingCount} release-blocking deterministic screenshot/accessibility checks; references present ${referencePresentCount}/${summary.referenceExpectedCount}.\n`);
console.log(`REFERENCE_SCREENSHOT_QA_STATUS=${summary.status}`);
console.log(`REFERENCE_SCREENSHOT_QA_RELEASE_BLOCKING_COUNT=${releaseBlockingCount}`);
console.log(`REFERENCE_SCREENSHOT_QA_REFERENCES_PRESENT=${referencePresentCount}/${summary.referenceExpectedCount}`);
if (releaseBlockingCount > 0) process.exitCode = 1;
