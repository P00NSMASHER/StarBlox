import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { store } from './gameModel';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root,'catalog-art-manifest.json'),'utf8'));
const byId = new Map(store.map(item => [item.id,item]));
const entries = Object.entries(manifest.items || {});

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

  it('uses one unique existing repo asset path per wired item', () => {
    const paths = entries.map(([id,meta]) => {
      expect(meta.assetPath, `${id} assetPath`).toMatch(/^\/assets\/catalog\/[a-z0-9-]+\.svg$/);
      const absolute = path.join(root,'public',meta.assetPath.replace(/^\//,''));
      expect(fs.existsSync(absolute), `${id} missing ${meta.assetPath}`).toBe(true);
      return meta.assetPath;
    });
    expect(new Set(paths).size).toBe(paths.length);
    expect(manifest.duplicateAssetPaths || []).toEqual([]);
  });

  it('does not promote interim aura/companion art to final without manifest review', () => {
    for(const [id,meta] of entries){
      if(id.startsWith('auras-') || (/^companions-(?:[2-9]|1[0-2])$/.test(id))){
        expect(meta.status, `${id} status`).toBe('interim-not-verified');
      }
    }
  });
});
