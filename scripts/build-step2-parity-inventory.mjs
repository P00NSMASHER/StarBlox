import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root = resolve(import.meta.dirname, '..');
const docs = resolve(root, 'docs/roblox-world');
const read = async name => JSON.parse(await readFile(resolve(docs, name), 'utf8'));
const source = await read('LEGACY_BROOKHAVEN_SOURCE_INVENTORY.json');
const catalog = await read('LEGACY_BROOKHAVEN_CATALOG_BASELINE.json');
const ui = await read('LEGACY_BROOKHAVEN_CATALOG_DISCOVERY.json');
const profile = await read('LEGACY_BROOKHAVEN_PROFILE.json');
const records = [];

function add(domain, row, sourceFile, sourcePath, expectedResult) {
  records.push({
    id: `PAR-${String(records.length + 1).padStart(5, '0')}`,
    domain,
    name: row.name,
    className: row.className ?? null,
    sourcePath,
    sourceFile,
    expectedResult,
    referenceClient: 'not-captured-on-same-device',
    starBloxClient: 'not-individually-verified',
    parityResult: 'unverified'
  });
}

for (const row of source.services.workspaceChildren) {
  add('world-root', row, 'LEGACY_BROOKHAVEN_SOURCE_INVENTORY.json',
    `DataModel/Workspace/${row.name}`,
    'Present at the pinned source transform; visually identifiable and traversable where applicable.');
}
for (const [domain, rows] of [
  ['lot-model', source.keySubtrees.lots.models],
  ['vehicle-model', source.keySubtrees.vehicles.models]
]) {
  for (const row of rows) add(domain, row, 'LEGACY_BROOKHAVEN_SOURCE_INVENTORY.json',
    `DataModel/Workspace/${row.path}`,
    'Corresponding model renders at the source location and supports its intended interaction.');
}
for (const [kind, rows] of Object.entries(source.namedCandidates)) {
  for (const row of rows) add(`named-${kind}`, row,
    'LEGACY_BROOKHAVEN_SOURCE_INVENTORY.json', row.path,
    'Review classification, then verify the corresponding in-client visual and interaction outcome.');
}
for (const row of ui.relevantUi) {
  add('ui-candidate', row, 'LEGACY_BROOKHAVEN_CATALOG_DISCOVERY.json', row.path,
    'Visible state, layout, asset, input response, and close/back result match the pinned client reference.');
}
for (const row of catalog.vehicles.templates) {
  add('vehicle-catalog', row, 'LEGACY_BROOKHAVEN_CATALOG_BASELINE.json',
    `${row.source}/${row.name}`,
    'Catalog tile, preview, spawn, driving, camera, and despawn complete without error.');
}
for (const row of catalog.tools.entries) {
  add('tool-catalog', row, 'LEGACY_BROOKHAVEN_CATALOG_BASELINE.json',
    `DataModel/Workspace/WorkspaceCom/001_GiveTools/${row.name}`,
    'Catalog tile, equip, usable effect, and unequip complete without error.');
}
for (const row of catalog.houseUi.catalogButtons) {
  add('house-catalog-button', row, 'LEGACY_BROOKHAVEN_CATALOG_BASELINE.json',
    `DataModel/StarterGui/MainGUIHandler/MainHouseMenu/${row.path}`,
    'Tile preview, selection, placement, enter, and return flow complete without error.');
}

const counts = Object.fromEntries([...new Set(records.map(row => row.domain))].sort()
  .map(domain => [domain, records.filter(row => row.domain === domain).length]));
const metadata = {
  schemaVersion: 1,
  status: 'source-indexed-client-parity-unverified',
  source: profile.source,
  sourceIndex: {
    recordCount: records.length,
    counts,
    note: 'Candidate-name lists were capped at 500 per category by the prior extractor; rows may overlap and do not enumerate every source instance.'
  },
  coverageLimits: {
    currentLiveBrookhavenVersionPinned: false,
    sameDeviceBrookhavenCapturePresent: false,
    sameDeviceStarBloxCapturePresent: true,
    comprehensiveWorldInstancePathsPresent: false,
    individualSoundAndAnimationPathsPresent: false,
    uiImagePropertiesCaptured: false,
    automatedComparisonComplete: false,
    exactParityClaimAllowed: false
  }
};
if (records.some((row, index) => row.id !== `PAR-${String(index + 1).padStart(5, '0')}`)) {
  throw new Error('Non-contiguous inventory IDs');
}
const columns = ['id', 'domain', 'name', 'className', 'sourcePath', 'sourceFile',
  'expectedResult', 'referenceClient', 'starBloxClient', 'parityResult'];
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const csv = [columns.join(','), ...records.map(row => columns.map(key => csvCell(row[key])).join(','))]
  .join('\n') + '\n';
const out = resolve(docs, 'STEP2_PARITY_SOURCE_LEDGER.csv');
await writeFile(out, csv);
await writeFile(resolve(docs, 'STEP2_PARITY_SOURCE_LEDGER_META.json'),
  `${JSON.stringify(metadata, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({output: out, records: records.length, counts}, null, 2)}\n`);
