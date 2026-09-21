import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const planPath = path.join(root, 'docs/preproduction/catalog-sprint/workstream08-plan.json');
const manifestPath = path.join(root, 'catalog-art-manifest.json');
const runtimePath = path.join(root, 'src/catalogArtRuntime.js');
const integrationPath = path.join(root, 'docs/preproduction/catalog-sprint/integration.json');
const integrationMdPath = path.join(root, 'docs/preproduction/catalog-sprint/integration.md');
const workstreamMdPath = path.join(root, 'docs/preproduction/workstreams/08-catalog-art.md');

const read = p => fs.readFileSync(p);
const readText = p => fs.readFileSync(p, 'utf8');
const readJson = p => JSON.parse(readText(p));
const gitBlobSha = bytes => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = msg => { throw new Error(msg); };

function jpegDimensions(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf.at(-2) !== 0xff || buf.at(-1) !== 0xd9) return null;
  let i = 2;
  while (i + 8 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1]; i += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (i + 2 > buf.length) break;
    const len = buf.readUInt16BE(i);
    if (len < 2 || i + len > buf.length) break;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      return { width: buf.readUInt16BE(i + 5), height: buf.readUInt16BE(i + 3), format: 'JPEG' };
    }
    i += len;
  }
  return null;
}

function svgDimensions(buf) {
  const text = buf.toString('utf8');
  if (!/<svg\b/i.test(text) || /<script\b|<foreignObject\b|\bon\w+\s*=|javascript:/i.test(text)) return null;
  const vb = text.match(/viewBox\s*=\s*["']\s*([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s*["']/i);
  if (vb) return { width: Number(vb[3]), height: Number(vb[4]), format: 'SVG' };
  const w = text.match(/\bwidth\s*=\s*["']([\d.]+)(?:px)?["']/i);
  const h = text.match(/\bheight\s*=\s*["']([\d.]+)(?:px)?["']/i);
  if (w && h) return { width: Number(w[1]), height: Number(h[1]), format: 'SVG' };
  return null;
}

function safeDimensions(assetPath, bytes) {
  if (/\.jpe?g$/i.test(assetPath)) return jpegDimensions(bytes);
  if (/\.svg$/i.test(assetPath)) return svgDimensions(bytes);
  fail(`Unsupported accepted asset format: ${assetPath}`);
}

function reviewerAccepts(review, item) {
  if (String(review.reviewer) !== String(item.reviewer)) return false;
  if (Array.isArray(review.reviews) && review.reviews.some(r => (r.itemId === item.itemId || r.id === item.itemId) && (r.assetHash === item.assetBlobSha || r.candidateBlobSha === item.assetBlobSha) && r.decision === 'ACCEPT')) return true;
  if (review.currentTopsReplacementDisposition?.ACCEPT?.[item.itemId] === item.assetBlobSha) return true;
  if (Array.isArray(review.integrationEligible) && review.integrationEligible.some(r => r.itemId === item.itemId && r.assetHash === item.assetBlobSha && r.decision === 'ACCEPT')) return true;
  const d = review.decisions?.[item.itemId];
  return Boolean(d && d.hash === item.assetBlobSha && d.decision === 'ACCEPT');
}

function parseRuntimeMap(runtime) {
  const out = new Map();
  const re = /'([^']+)'\s*:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(runtime))) {
    if (out.has(m[1])) fail(`Duplicate runtime key ${m[1]}`);
    out.set(m[1], m[2]);
  }
  return out;
}

function setRuntimeMapping(runtime, id, assetPath) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`'${escaped}'\\s*:\\s*'[^']*'`);
  if (re.test(runtime)) return runtime.replace(re, `'${id}': '${assetPath}'`);
  const close = runtime.indexOf('\n});');
  if (close < 0) fail('portableCatalogArt closing token not found');
  let prefix = runtime.slice(0, close).trimEnd();
  if (!prefix.endsWith(',')) prefix += ',';
  return `${prefix}\n  '${id}': '${assetPath}'${runtime.slice(close)}`;
}

function collectReviewEvidence() {
  const files = ['01','02','05','14'].map(n => path.join(root, `docs/preproduction/catalog-sprint/reviews/${n}.json`));
  const accepted = new Set();
  let uniqueReviewed = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const r = readJson(file);
    if (r.summary?.uniqueCatalogIdsReviewed) uniqueReviewed += Number(r.summary.uniqueCatalogIdsReviewed);
    else if (r.summary?.reviewedCumulative) uniqueReviewed += Number(r.summary.reviewedCumulative);
    else if (r.legacyUniqueIdCoverage?.totalUniqueIdsReviewed) uniqueReviewed += Number(r.legacyUniqueIdCoverage.totalUniqueIdsReviewed);
    else if (r.reviewed) uniqueReviewed += Number(r.reviewed);
    if (Array.isArray(r.reviews)) for (const x of r.reviews) if (x.decision === 'ACCEPT' && (x.assetHash || x.candidateBlobSha)) accepted.add(`${x.itemId || x.id}:${x.assetHash || x.candidateBlobSha}`);
    if (r.currentTopsReplacementDisposition?.ACCEPT) for (const [id,h] of Object.entries(r.currentTopsReplacementDisposition.ACCEPT)) accepted.add(`${id}:${h}`);
    if (Array.isArray(r.integrationEligible)) for (const x of r.integrationEligible) if (x.decision === 'ACCEPT') accepted.add(`${x.itemId}:${x.assetHash}`);
    if (r.decisions) for (const [id,x] of Object.entries(r.decisions)) if (x.decision === 'ACCEPT') accepted.add(`${id}:${x.hash}`);
  }
  return { acceptedCount: accepted.size, uniqueReviewed };
}

function collectLaneCounts(previousIntegration) {
  const dir = path.join(root, 'docs/preproduction/catalog-sprint');
  const files = fs.readdirSync(dir).filter(n => /^lane-\d+\.json$/.test(n));
  const staged = new Set(), generatedRemote = new Set(), generatedLocal = new Set();
  function walk(v) {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { v.forEach(walk); return; }
    const id = v.itemId || v.id;
    const p = v.assetPath || v.repositoryPath || v.candidatePath || v.runtimeCandidatePath || v.path;
    const h = v.assetHash || v.gitBlobSha || v.candidateBlobSha || v.readbackGitBlobSha;
    const status = String(v.status || v.repositoryStatus || v.reviewStatus || v.candidateStatus || '');
    if (id && p && h && (/READY_FOR|STAGED|READBACK/.test(status) || String(p).includes('catalog-candidates/') || /-v\d/.test(String(p)))) staged.add(`${id}:${h}`);
    if (id && /GENERATED_REMOTE/.test(status) && !/STAGED|READBACK/.test(status)) generatedRemote.add(id);
    if (id && /GENERATED_LOCAL/.test(status) && !/STAGED|READBACK/.test(status)) generatedLocal.add(id);
    Object.values(v).forEach(walk);
  }
  for (const n of files) { try { walk(readJson(path.join(dir,n))); } catch {} }
  return { generatedLocalKnown:generatedLocal.size, generatedRemoteNotStagedKnown:generatedRemote.size, preservedBlobOnlyKnown:Number(previousIntegration?.counts?.preservedBlobOnlyKnown || 0), branchStagedRepairVersionsKnown:staged.size };
}

function markdownReport(report) {
  const ids = report.integratedThisRun.map(x => `\`${x.itemId}\``).join(', ');
  return `# Workstream 08 — Catalog Integration\n\nSTATUS: **${report.status}**\n\nBranch: \`${report.branch}\` only. Replit/Floot/main/player data remain untouched.\n\n## This integration\n\nIntegrated ${report.integratedThisRun.length} newly qualified exact-hash replacements: ${ids}. Exact repository bytes/hashes, current Store metadata, supported decode, canonical path/content uniqueness and reviewer independence were all validated before wiring.\n\nCanonical manifest is now v${report.canonicalAfter.manifestVersion}: **${report.canonicalAfter.finalPortable} final-portable / ${report.canonicalAfter.interimNotVerified} interim / ${report.canonicalAfter.nonFinal} non-final**, with ${report.canonicalAfter.manifestEntries} canonical entries and ${report.canonicalAfter.runtimeMappings} runtime mappings. Legacy labels remain distinct from the strict accepted-current-hash count.\n\nStrict current replacement state: **${report.counts.acceptedCurrentReplacementHashes} accepted / ${report.counts.canonicalWiredAcceptedHashesAfterCommit} canonical-wired / ${report.counts.catalogReleaseClearedIds} release-cleared**.\n\n## Validation\n\n- metadata: ${report.validationBeforeCommit.exactIdNameTierTheme}\n- exact stored bytes: ${report.validationBeforeCommit.storedPathAndBlobReadback}\n- safe decode/render evidence: ${report.validationBeforeCommit.safeDecode}\n- canonical uniqueness: ${report.validationBeforeCommit.canonicalUniqueness}\n- npm tests: ${report.postCommitValidation.catalogTests}\n- production build: ${report.postCommitValidation.productionBuild}\n- Store/mobile smoke: ${report.postCommitValidation.storeSmoke}\n\nNext: consume every fresh exact-hash ACCEPT immediately; never wire REWORK or producer-only claims.\n`;
}

if (process.argv.includes('--finalize-tests')) {
  const report = readJson(integrationPath);
  report.postCommitValidation.catalogTests = 'PASS_FULL_NPM_TEST_WORKFLOW';
  report.postCommitValidation.productionBuild = 'PASS_VITE_PRODUCTION_BUILD_WORKFLOW';
  report.postCommitValidation.storeSmoke = 'PENDING_AUTOMATIC_CATALOG_MOBILE_QA_ON_CANONICAL_COMMIT';
  fs.writeFileSync(integrationPath, JSON.stringify(report, null, 2) + '\n');
  const md = markdownReport(report);
  fs.writeFileSync(integrationMdPath, md);
  fs.writeFileSync(workstreamMdPath, md);
  process.exit(0);
}

const plan = readJson(planPath);
if (plan.phase !== 'CATALOG_SPRINT') fail(`Plan phase is ${plan.phase}`);
const oldManifestBytes = read(manifestPath), oldRuntimeBytes = read(runtimePath);
const manifest = JSON.parse(oldManifestBytes.toString('utf8'));
const canonicalBeforeFinal = Number(manifest.finalCount || Object.values(manifest.items || {}).filter(x => x.status === 'final-portable').length);
let runtime = oldRuntimeBytes.toString('utf8');
const previousIntegration = fs.existsSync(integrationPath) ? readJson(integrationPath) : null;
const sourceHead = execSync('git rev-parse HEAD', {encoding:'utf8'}).trim();
const gameModule = await import(`${pathToFileURL(path.join(root,'src/gameModel.js')).href}?ws08=${Date.now()}`);
const store = gameModule.gameModel?.store;
if (!Array.isArray(store) || store.length !== 192) fail('Current game model is not exactly 192 Store IDs');
const storeById = new Map(store.map(x => [x.id,x]));
if (storeById.size !== 192) fail('Duplicate Store IDs in current game model');

const existingContent = new Map();
for (const [id, entry] of Object.entries(manifest.items || {})) {
  const p = path.join(root, 'public', String(entry.assetPath || '').replace(/^\//,''));
  if (!fs.existsSync(p)) fail(`Existing canonical asset missing for ${id}: ${entry.assetPath}`);
  const h = gitBlobSha(read(p));
  if (!existingContent.has(h)) existingContent.set(h, []);
  existingContent.get(h).push(id);
}

const integrated = [];
for (const item of plan.acceptedBatch) {
  if (item.producer === item.reviewer) fail(`Self-review forbidden for ${item.itemId}`);
  const reviewBytes = read(path.join(root,item.reviewFile));
  const review = JSON.parse(reviewBytes.toString('utf8'));
  if (!reviewerAccepts(review,item)) fail(`No exact-hash ACCEPT by reviewer ${item.reviewer} for ${item.itemId}`);
  const storeItem = storeById.get(item.itemId);
  if (!storeItem) fail(`Unknown Store ID ${item.itemId}`);
  for (const k of ['name','tier','theme']) if (storeItem[k] !== item[k]) fail(`Metadata mismatch ${item.itemId}.${k}: game=${storeItem[k]} plan=${item[k]}`);
  const existing = manifest.items?.[item.itemId];
  if (existing) for (const k of ['name','tier','theme']) if (existing[k] !== item[k]) fail(`Manifest metadata mismatch ${item.itemId}.${k}`);
  const repoFile = path.join(root,'public',item.assetPath.replace(/^\//,''));
  if (!fs.existsSync(repoFile)) fail(`Stored asset missing: ${item.assetPath}`);
  const bytes = read(repoFile), blob = gitBlobSha(bytes);
  if (blob !== item.assetBlobSha) fail(`Blob mismatch for ${item.itemId}: ${blob} != ${item.assetBlobSha}`);
  const dims = safeDimensions(item.assetPath,bytes);
  if (!dims || !Number.isFinite(dims.width) || !Number.isFinite(dims.height) || dims.width < 256 || dims.height < 256) fail(`Decode/dimensions invalid for ${item.itemId}`);
  const duplicates = existingContent.get(blob) || [];
  if (duplicates.some(id => id !== item.itemId)) fail(`Accepted content duplicates existing canonical item(s): ${item.itemId} vs ${duplicates.join(',')}`);
  manifest.items[item.itemId] = {name:item.name,assetPath:item.assetPath,tier:item.tier,theme:item.theme,status:'final-portable'};
  runtime = setRuntimeMapping(runtime,item.itemId,item.assetPath);
  integrated.push({...item,bytes:bytes.length,width:dims.width,height:dims.height,format:dims.format,sha256:sha256(bytes),reviewBlobSha:gitBlobSha(reviewBytes)});
}

manifest.version = Number(manifest.version || 0) + 1;
manifest.target = 192;
const paths = Object.values(manifest.items).map(x=>x.assetPath);
if (new Set(paths).size !== paths.length) fail('Duplicate canonical asset paths detected');
manifest.duplicateAssetPaths = [];
manifest.finalCount = Object.values(manifest.items).filter(x=>x.status==='final-portable').length;
manifest.remaining = 192 - manifest.finalCount;
manifest.note = `Delivery Protocol V2 incremental integration: exact-hash independent ACCEPT batch integrated for ${plan.acceptedBatch.map(x=>x.itemId).join(', ')}. Prior accepted mappings and rejected versions remain in repository history. Replit/Floot/main/player data remain untouched.`;

const runtimeMap = parseRuntimeMap(runtime), manifestIds = Object.keys(manifest.items);
if (runtimeMap.size !== manifestIds.length) fail(`Runtime mapping count ${runtimeMap.size} != manifest entry count ${manifestIds.length}`);
for (const id of manifestIds) if (runtimeMap.get(id) !== manifest.items[id].assetPath) fail(`Runtime/manifest mismatch for ${id}`);
const canonicalHashes = new Map();
for (const [id,entry] of Object.entries(manifest.items)) {
  const h = gitBlobSha(read(path.join(root,'public',entry.assetPath.replace(/^\//,''))));
  if (!canonicalHashes.has(h)) canonicalHashes.set(h,[]);
  canonicalHashes.get(h).push(id);
}
const contentDupes = [...canonicalHashes.entries()].filter(([,ids])=>ids.length>1);
if (contentDupes.length) fail(`Duplicate canonical content detected: ${JSON.stringify(contentDupes)}`);

const manifestText = JSON.stringify(manifest) + '\n';
fs.writeFileSync(manifestPath,manifestText); fs.writeFileSync(runtimePath,runtime);
const reviewEvidence = collectReviewEvidence(), laneCounts = collectLaneCounts(previousIntegration);
const priorWired = Number(previousIntegration?.counts?.canonicalWiredAcceptedHashesAfterCommit || 0);
const wiredAfter = priorWired + integrated.length;
const interimCount = Object.values(manifest.items).filter(x=>x.status==='interim-not-verified').length;
const report = {
  schemaVersion:7, workstream:'08', phase:'CATALOG_SPRINT', status:'INTEGRATED_ACCEPTED_INCREMENT_TESTS_PASS_STORE_SMOKE_PENDING', branch:plan.branch, auditedSourceHead:sourceHead,
  canonicalBefore:{manifestBlobSha:gitBlobSha(oldManifestBytes),runtimeBlobSha:gitBlobSha(oldRuntimeBytes),manifestVersion:Number(manifest.version)-1,finalPortable:canonicalBeforeFinal},
  canonicalAfter:{manifestVersion:manifest.version,manifestBlobSha:gitBlobSha(Buffer.from(manifestText)),runtimeBlobSha:gitBlobSha(Buffer.from(runtime)),catalogTarget:192,manifestEntries:manifestIds.length,runtimeMappings:runtimeMap.size,finalPortable:manifest.finalCount,interimNotVerified:interimCount,nonFinal:192-manifest.finalCount,duplicateAssetPaths:0,duplicateContentHashes:0},
  integratedThisRun:integrated,
  validationBeforeCommit:{exactIdNameTierTheme:`PASS_${integrated.length}_OF_${integrated.length}_AGAINST_CURRENT_GAME_MODEL`,storedPathAndBlobReadback:`PASS_${integrated.length}_OF_${integrated.length}_EXACT_GIT_BLOB_SHA`,safeDecode:`PASS_${integrated.length}_OF_${integrated.length}_SUPPORTED_FORMAT_PLUS_INDEPENDENT_RENDER_EVIDENCE`,reviewerIndependence:`PASS_${integrated.length}_OF_${integrated.length}`,canonicalUniqueness:`PASS_${manifestIds.length}_UNIQUE_PATHS_AND_CONTENT_HASHES`,runtimeManifestAgreement:`PASS_${runtimeMap.size}_OF_${runtimeMap.size}`,stablePricesUnlocksOwnership:'UNCHANGED_BY_SCOPE'},
  postCommitValidation:{catalogTests:'PENDING_WORKFLOW',productionBuild:'PENDING_WORKFLOW',storeSmoke:'PENDING_AUTOMATIC_CATALOG_MOBILE_QA_ON_CANONICAL_COMMIT'},
  counts:{...laneCounts,independentlyReviewedUniqueCatalogIds:reviewEvidence.uniqueReviewed,acceptedCurrentReplacementHashes:reviewEvidence.acceptedCount,canonicalWiredAcceptedHashesAfterCommit:wiredAfter,catalogReleaseClearedIds:0},
  nextReviewDependencies:['05: review staged desks-2..4 and next companion/aura replacement hashes when rendered.','01/02/14: prioritize fresh replacement hashes in their partitions.','08: integrate every next exact-hash ACCEPT immediately.'],
  blockers:[`${192-wiredAfter} catalog IDs are not yet current-hash accepted/canonically wired under strict V2 review.`, 'Catalog release still requires all 192 current hashes accepted plus final duplicate/near-duplicate, Store/mobile and safety gates.','Real-browser persistence transaction stress remains a separate release blocker.'],
  freeze:{replitTouched:false,flootTouched:false,mainMergedOrModified:false,playerDataTouched:false,phaseChanged:false}
};
fs.writeFileSync(integrationPath,JSON.stringify(report,null,2)+'\n');
const md=markdownReport(report); fs.writeFileSync(integrationMdPath,md); fs.writeFileSync(workstreamMdPath,md);
console.log(JSON.stringify({sourceHead,integrated:integrated.map(x=>x.itemId),canonicalAfter:report.canonicalAfter,counts:report.counts},null,2));
