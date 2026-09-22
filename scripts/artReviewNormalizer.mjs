#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export const FAILURE_CODES = Object.freeze({
  TECHNICAL_INTEGRITY: 'File/decode/hash/path/readback or blank/corrupt evidence problem.',
  FLAT_COMPOSITION: 'Artwork reads as a flat ring/icon/sticker/diagram instead of a dimensional object/effect.',
  WEAK_DEPTH: 'Insufficient near/mid/far separation, occlusion, volume, parallax, overlap, or grounded depth.',
  WEAK_MATERIAL_LIGHTING: 'Material response, shadows, highlights, translucency, specularity, or lighting do not explain the form.',
  THEME_MISMATCH: 'Exact Store theme is missing, generic, or expressed mostly as a palette swap.',
  TIER_INSUFFICIENT: 'Visual richness/spectacle does not match the item tier.',
  SMALL_CARD_READABILITY: 'Silhouette, contrast, crop, or critical detail does not survive Store-card scale.',
  NEAR_DUPLICATE_TEMPLATE: 'Candidate is too close to another asset/template/recolor or lacks originality.',
  WEAK_SILHOUETTE_IDENTITY: 'Item/category identity or silhouette is unclear.',
  EXCESSIVE_BLOOM: 'Glow/bloom washes out edges or local contrast.',
  UNKNOWN_REWORK: 'REWORK lacks a recognized structured defect; human reason remains authoritative.'
});

const RULES = [
  ['TECHNICAL_INTEGRITY', /corrupt|signature|decode|blank|transparent failure|missing(?: file| asset)?|404|wrong mime|readback|hash mismatch|invalid[- ]file|broken/i],
  ['FLAT_COMPOSITION', /\bflat\b|flat circular|flat ring|ring topology|icon|sticker|diagrammatic|vector[- ]?like|floating emblem|badge/i],
  ['WEAK_DEPTH', /depth|volum|parallax|near\/far|near[- ]?mid[- ]?far|foreground|background|occlusion|overlap|spatial|grounded|contact shadow|depth staggering/i],
  ['WEAK_MATERIAL_LIGHTING', /material|lighting|light spill|glow|emissive|specular|transluc|reflection|refraction|highlight|shadow|surface response|fabric folds|weave|pile|thickness/i],
  ['THEME_MISMATCH', /theme mismatch|theme.*(?:weak|generic|missing|fail)|generic theme|specificity.*weak|palette[- ]only|palette swap|exact theme/i],
  ['TIER_INSUFFICIENT', /tier.*(?:weak|fail|needs|requires|insufficient)|premium.*(?:weak|needs)|spectacle|step[- ]?up|luxe.*(?:needs|weak)/i],
  ['SMALL_CARD_READABILITY', /card readability|small[- ]card|card scale|thumbnail|contrast|reduction|legib|readab|crop/i],
  ['NEAR_DUPLICATE_TEMPLATE', /duplicate|near[- ]duplicate|template|recolor|palette swap|clone|repeated silhouette|interchangeable/i],
  ['WEAK_SILHOUETTE_IDENTITY', /silhouette.*(?:weak|unclear|fail)|identity.*(?:weak|unclear|fail)|category.*(?:unclear|fail)|recogniz/i],
  ['EXCESSIVE_BLOOM', /excessive bloom|washed out|bloom.*(?:too|excess)|glow.*wash/i]
];

const uniq = values => [...new Set(values.filter(Boolean))];
const upper = value => String(value || '').trim().toUpperCase();

function checkFailureCodes(checks = {}) {
  const codes = [];
  for (const [key, raw] of Object.entries(checks || {})) {
    const state = upper(raw);
    if (!['FAIL', 'PARTIAL', 'REWORK', 'BLOCKED'].includes(state)) continue;
    if (/identity|silhouette/i.test(key)) codes.push('WEAK_SILHOUETTE_IDENTITY');
    if (/theme/i.test(key)) codes.push('THEME_MISMATCH');
    if (/tier/i.test(key)) codes.push('TIER_INSUFFICIENT');
    if (/material|lighting/i.test(key)) codes.push('WEAK_MATERIAL_LIGHTING');
    if (/depth|volume|spatial/i.test(key)) codes.push('WEAK_DEPTH');
    if (/card|readab|contrast/i.test(key)) codes.push('SMALL_CARD_READABILITY');
    if (/original|duplicate/i.test(key)) codes.push('NEAR_DUPLICATE_TEMPLATE');
    if (/technical|decode|hash|signature|render/i.test(key)) codes.push('TECHNICAL_INTEGRITY');
  }
  return codes;
}

export function classifyFailure(review = {}) {
  const decision = upper(review.decision);
  if (decision === 'ACCEPT') return [];
  const text = [review.reason, review.reasonCode, ...(review.defects || [])].filter(Boolean).join(' ');
  const codes = [];
  for (const [code, rx] of RULES) if (rx.test(text)) codes.push(code);
  codes.push(...checkFailureCodes(review.checks));
  const unique = uniq(codes);
  if ((decision === 'REWORK' || decision === 'BLOCKED') && unique.length === 0) unique.push('UNKNOWN_REWORK');
  return unique;
}

export function normalizeReviewDocuments(docs = []) {
  const observations = [];
  const current = new Map();
  const conflicts = [];
  for (const doc of docs) {
    const data = doc.data || {};
    const reviewer = String(data.reviewer || '');
    for (const row of data.reviews || []) {
      if (!row.itemId || !row.assetHash || !row.decision) continue;
      observations.push({...row, reviewer, sourcePath: doc.path});
    }
    for (const [itemId, row] of Object.entries(data.decisions || {})) {
      if (!row?.hash || !row?.decision) continue;
      const detail = (data.reviews || []).find(x => x.itemId === itemId && x.assetHash === row.hash);
      const normalized = {
        itemId,
        assetHash: row.hash,
        assetPath: row.path || detail?.assetPath || null,
        producer: row.producer ?? detail?.producer ?? null,
        decision: row.decision,
        reason: detail?.reason || row.reason || row.reasonCode || '',
        reasonCode: row.reasonCode || detail?.reasonCode || null,
        checks: detail?.checks || row.checks || {},
        reviewedAt: detail?.reviewedAt || data.reviewedAt || '',
        reviewer,
        sourcePath: doc.path,
        authoritativeDecisionMap: true
      };
      observations.push(normalized);
      current.set(itemId, normalized);
    }
  }

  const dedup = new Map();
  for (const row of observations) {
    const key = [row.itemId, row.assetHash, row.reviewer, upper(row.decision)].join('|');
    if (!dedup.has(key)) dedup.set(key, row);
  }
  const unique = [...dedup.values()];
  const grouped = new Map();
  for (const row of unique) {
    const key = [row.itemId, row.assetHash, row.reviewer].join('|');
    const decisions = grouped.get(key) || new Set();
    decisions.add(upper(row.decision));
    grouped.set(key, decisions);
  }
  for (const [key, decisions] of grouped) if (decisions.size > 1) conflicts.push({key, decisions:[...decisions].sort()});

  const byItem = new Map();
  for (const row of unique) {
    if (!byItem.has(row.itemId)) byItem.set(row.itemId, []);
    byItem.get(row.itemId).push(row);
  }
  for (const [itemId, rows] of byItem) {
    if (current.has(itemId)) continue;
    rows.sort((a,b) => String(a.reviewedAt || '').localeCompare(String(b.reviewedAt || '')) || String(a.sourcePath).localeCompare(String(b.sourcePath)));
    current.set(itemId, rows.at(-1));
  }

  return {observations: unique, current, conflicts};
}

export function buildReviewCorpus({docs = [], items = []} = {}) {
  const itemMap = new Map(items.map(item => [item.id, item]));
  const {observations, current, conflicts} = normalizeReviewDocuments(docs);
  const rows = observations.map(row => {
    const item = itemMap.get(row.itemId) || {};
    const producer = row.producer == null ? null : String(row.producer);
    const reviewer = row.reviewer == null ? '' : String(row.reviewer);
    const independent = Boolean(reviewer) && (!producer || reviewer !== producer);
    return {
      itemId: row.itemId,
      collectionId: item.collectionId || String(row.itemId).split('-')[0],
      name: item.name || row.name || null,
      tier: item.tier ?? row.tier ?? null,
      theme: item.theme || row.theme || null,
      assetHash: row.assetHash,
      assetPath: row.assetPath || null,
      producer,
      reviewer,
      independent,
      decision: upper(row.decision),
      reason: row.reason || '',
      failureCodes: classifyFailure(row),
      checks: row.checks || {},
      sourcePath: row.sourcePath,
      reviewedAt: row.reviewedAt || null
    };
  });

  const currentRows = [...current.values()].map(row => rows.find(x => x.itemId === row.itemId && x.assetHash === row.assetHash && x.reviewer === String(row.reviewer || '')) || null).filter(Boolean);
  const byCollection = {};
  for (const row of currentRows) {
    const c = byCollection[row.collectionId] ||= {accepted:0,rework:0,blocked:0,other:0,failureCodes:{},currentItems:[]};
    if (row.decision === 'ACCEPT') c.accepted++;
    else if (row.decision === 'REWORK') c.rework++;
    else if (row.decision === 'BLOCKED') c.blocked++;
    else c.other++;
    for (const code of row.failureCodes) c.failureCodes[code] = (c.failureCodes[code] || 0) + 1;
    c.currentItems.push({itemId:row.itemId,assetHash:row.assetHash,decision:row.decision,failureCodes:row.failureCodes});
  }
  for (const c of Object.values(byCollection)) c.currentItems.sort((a,b)=>a.itemId.localeCompare(b.itemId));

  const failureCodeCounts = {};
  for (const row of currentRows) for (const code of row.failureCodes) failureCodeCounts[code] = (failureCodeCounts[code] || 0) + 1;

  return {
    schemaVersion: 1,
    generatedFrom: 'independent exact-hash review ledgers',
    policy: {
      humanReviewAuthoritative: true,
      oldVerdictNeverTransfersAcrossHash: true,
      selfReviewExcludedFromLearning: true,
      failureCodesAreDerivedLabelsNotReplacementForHumanReason: true
    },
    failureCodeDefinitions: FAILURE_CODES,
    conflicts,
    observations: rows,
    current: currentRows.sort((a,b)=>a.itemId.localeCompare(b.itemId)),
    summary: {
      observationCount: rows.length,
      currentCount: currentRows.length,
      independentObservationCount: rows.filter(x=>x.independent).length,
      selfReviewObservationCount: rows.filter(x=>!x.independent).length,
      decisionCounts: currentRows.reduce((acc,row)=>(acc[row.decision]=(acc[row.decision]||0)+1,acc),{}),
      failureCodeCounts,
      byCollection
    }
  };
}

function parseArgs(argv) {
  const out={};
  for (let i=0;i<argv.length;i++) {
    const x=argv[i];
    if (!x.startsWith('--')) continue;
    const key=x.slice(2), value=argv[i+1];
    if (value && !value.startsWith('--')) { out[key]=value; i++; } else out[key]=true;
  }
  return out;
}

async function main() {
  const args=parseArgs(process.argv.slice(2));
  const root=path.resolve(args['repo-root'] || '.');
  const reviewDir=path.join(root,'docs/preproduction/catalog-sprint/reviews');
  const docs=fs.readdirSync(reviewDir).filter(x=>/^\d+\.json$/.test(x)).sort().map(name=>({path:path.relative(root,path.join(reviewDir,name)),data:JSON.parse(fs.readFileSync(path.join(reviewDir,name),'utf8'))}));
  const mod=await import(pathToFileURL(path.join(root,'src/gameModel.js')).href+`?reviewCorpus=${Date.now()}`);
  const items=mod.store || mod.gameModel?.store || [];
  const corpus=buildReviewCorpus({docs,items});
  if (corpus.conflicts.length) throw new Error(`review decision conflicts detected: ${JSON.stringify(corpus.conflicts)}`);
  const text=JSON.stringify(corpus,null,2)+'\n';
  if (args.output) {
    const dest=path.resolve(args.output); fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.writeFileSync(dest,text);
  } else process.stdout.write(text);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(err=>{console.error(err.stack||err);process.exit(1)});
