import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { store } from './gameModel';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root,'catalog-art-manifest.json'),'utf8'));
const byId = new Map(store.map(item => [item.id,item]));
const entries = Object.entries(manifest.items || {});
const reviewPaths = ['01','02','05','14'].map(id => path.join(root,'docs','preproduction','catalog-sprint','reviews',`${id}.json`));

function allObjects(value, out=[]) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) { for (const item of value) allObjects(item,out); return out; }
  out.push(value);
  for (const item of Object.values(value)) allObjects(item,out);
  return out;
}
function gitBlobSha(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`);
  return crypto.createHash('sha1').update(header).update(bytes).digest('hex');
}
function acceptedReviewHashes() {
  const accepted = new Map();
  for (const reviewPath of reviewPaths) {
    if (!fs.existsSync(reviewPath)) continue;
    const reviewer = path.basename(reviewPath,'.json');
    const doc = JSON.parse(fs.readFileSync(reviewPath,'utf8'));
    for (const record of allObjects(doc)) {
      const itemId = record.itemId || record.id;
      const assetHash = record.assetHash || record.candidateBlobSha || record.gitBlobSha;
      if (!itemId || !assetHash || record.decision !== 'ACCEPT') continue;
      const list = accepted.get(itemId) || [];
      list.push({ reviewer, assetHash, producer: String(record.producer ?? '') });
      accepted.set(itemId,list);
    }
  }
  return accepted;
}
const accepted = acceptedReviewHashes();

describe('catalog art manifest release invariants', () => {
  it('keeps manifest counts internally consistent with the 192-item Store', () => {
    const finalEntries = entries.filter(([,meta]) => meta.status === 'final-portable');
    expect(store).toHaveLength(192);
    expect(manifest.target).toBe(store.length);
    expect(manifest.finalCount).toBe(finalEntries.length);
    expect(manifest.remaining).toBe(store.length - finalEntries.length);
  });

  it('maps every manifest entry to the exact stable Store item metadata', () => {
    for(const [id,meta] of entries){
      const item = byId.get(id);
      expect(item, `unknown manifest item ${id}`).toBeTruthy();
      expect(meta.name, `${id} name`).toBe(item.name);
      expect(meta.tier, `${id} tier`).toBe(item.tier);
      expect(meta.theme, `${id} theme`).toBe(item.theme);
    }
  });

  it('uses one unique existing repo-owned supported image path per wired item', () => {
    const paths = entries.map(([id,meta]) => {
      expect(meta.assetPath, `${id} assetPath`).toMatch(/^\/assets\/(?:catalog|catalog-candidates)\/[a-z0-9_./-]+\.(?:svg|png|jpe?g|webp)$/i);
      expect(meta.assetPath.includes('..'), `${id} path traversal`).toBe(false);
      const absolute = path.join(root,'public',meta.assetPath.replace(/^\//,''));
      expect(fs.existsSync(absolute), `${id} missing ${meta.assetPath}`).toBe(true);
      return meta.assetPath;
    });
    expect(new Set(paths).size).toBe(paths.length);
    expect(manifest.duplicateAssetPaths || []).toEqual([]);
  });

  it('requires an independent exact-hash ACCEPT before an aura/companion can be final-portable', () => {
    for(const [id,meta] of entries){
      if(!(id.startsWith('auras-') || /^companions-(?:[2-9]|1[0-2])$/.test(id))) continue;
      if(meta.status !== 'final-portable') continue;
      const absolute = path.join(root,'public',meta.assetPath.replace(/^\//,''));
      const currentHash = gitBlobSha(fs.readFileSync(absolute));
      const matches = (accepted.get(id) || []).filter(review => review.assetHash === currentHash && review.reviewer !== review.producer);
      expect(matches.length, `${id} final-portable ${currentHash} lacks independent exact-hash ACCEPT`).toBeGreaterThan(0);
    }
  });
});
