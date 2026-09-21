import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const manifestPath = path.join(root, 'catalog-art-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const gameModule = await import(`${pathToFileURL(path.join(root, 'src/gameModel.js')).href}?normalize=${Date.now()}`);
const store = gameModule.gameModel?.store;
if (!Array.isArray(store) || store.length !== 192) throw new Error('Expected exactly 192 current Store items');
const byId = new Map(store.map(item => [item.id, item]));
const corrections = [];
for (const [id, entry] of Object.entries(manifest.items || {})) {
  const item = byId.get(id);
  if (!item) throw new Error(`Manifest contains unknown Store ID ${id}`);
  for (const field of ['name', 'tier', 'theme']) {
    if (entry[field] !== item[field]) {
      corrections.push({ id, field, from: entry[field], to: item[field] });
      entry[field] = item[field];
    }
  }
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest) + '\n');
console.log(JSON.stringify({ correctedFields: corrections.length, corrections }, null, 2));
