import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

function arg(name, fallback = null) {
  const inline = process.argv.find(value => value.startsWith(name + '='));
  if (inline) return inline.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function className(node) {
  return String(node?.class ?? node?.className ?? 'Unknown');
}

function nodeName(node) {
  return String(node?.name ?? className(node));
}

function walk(node, path = [], rows = []) {
  if (!node || typeof node !== 'object') return rows;
  const next = [...path, nodeName(node)];
  rows.push({node, path: next});
  for (const child of Array.isArray(node.children) ? node.children : []) {
    walk(child, next, rows);
  }
  return rows;
}

function vector(node, propertyName) {
  const value = node?.properties?.[propertyName]?.Vector3;
  return Array.isArray(value) && value.length === 3 ? value.map(Number) : null;
}

function position(node) {
  const value = node?.properties?.CFrame?.CFrame?.position;
  return Array.isArray(value) && value.length === 3 ? value.map(Number) : null;
}

export function inspectLegacySchoolStructure(dom, acquisition) {
  if (!dom || typeof dom !== 'object') throw new Error('legacy DOM is required');
  if (acquisition?.status !== 'legacy-reference-acquired'
      || !/^[a-f0-9]{64}$/i.test(acquisition?.source?.sha256 ?? '')) {
    throw new Error('verified pinned legacy-source acquisition receipt is required');
  }

  const allRows = walk(dom);
  const workspace = allRows.find(row =>
    className(row.node) === 'Workspace' && nodeName(row.node) === 'Workspace');
  if (!workspace) throw new Error('Workspace root is missing');

  const workspaceRows = walk(workspace.node, []);
  const schoolRoots = workspaceRows.filter(row =>
    row.path.slice(-3).join('/') === 'Workspace/WorkspaceCom/001_School');
  if (schoolRoots.length !== 1) {
    throw new Error('expected one school model at Workspace/WorkspaceCom/001_School; found ' + schoolRoots.length);
  }

  const school = schoolRoots[0];
  const schoolRows = workspaceRows.filter(row =>
    row.path.length >= school.path.length
    && school.path.every((segment, index) => row.path[index] === segment));
  const geometryClasses = new Set([
    'Part', 'MeshPart', 'WedgePart', 'CornerWedgePart', 'UnionOperation',
    'TrussPart', 'Seat', 'VehicleSeat'
  ]);
  const geometry = schoolRows.filter(row => geometryClasses.has(className(row.node)));
  const candidateGeometry = geometry
    .filter(row => /door|entrance|cafeteria|lunch|library|classroom|room/i
      .test([...row.path, nodeName(row.node)].join('/')))
    .map(row => ({
      className: className(row.node),
      name: nodeName(row.node),
      path: row.path.join('/'),
      position: position(row.node),
      size: vector(row.node, 'Size')
    }));
  const structure = schoolRows
    .filter(row => ['Model', 'Folder', 'Configuration'].includes(className(row.node)))
    .map(row => ({className: className(row.node), name: nodeName(row.node), path: row.path.join('/')}));

  return {
    schemaVersion: 1,
    status: 'pinned-legacy-school-structure-inspected',
    source: {
      repository: acquisition.source.repository,
      path: acquisition.source.path,
      sourceCommit: acquisition.source.sourceCommit,
      sha256: acquisition.source.sha256,
      bytes: acquisition.source.bytes
    },
    school: {
      path: school.path.join('/'),
      name: nodeName(school.node),
      className: className(school.node),
      instanceCount: schoolRows.length,
      geometryCount: geometry.length,
      structure,
      candidateGeometry
    },
    interpretation: {
      roomRoleAssignmentsVerified: false,
      note: 'This report exposes source hierarchy and transforms. It does not infer classroom, entrance, cafeteria, or library roles.'
    }
  };
}

const domPath = arg('--dom');
const acquisitionPath = arg('--acquisition');
const outPath = resolve(arg('--out', '/tmp/legacy-school-structure.json'));
if (!domPath || !acquisitionPath) throw new Error('--dom and --acquisition are required');
const [dom, acquisition] = await Promise.all([
  readFile(resolve(domPath), 'utf8').then(JSON.parse),
  readFile(resolve(acquisitionPath), 'utf8').then(JSON.parse)
]);
const report = inspectLegacySchoolStructure(dom, acquisition);
await mkdir(dirname(outPath), {recursive: true});
await writeFile(outPath, JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify({
  status: report.status,
  sourceCommit: report.source.sourceCommit,
  schoolPath: report.school.path,
  instanceCount: report.school.instanceCount,
  geometryCount: report.school.geometryCount,
  structure: report.school.structure,
  candidateGeometry: report.school.candidateGeometry,
  roomRoleAssignmentsVerified: false
}, null, 2) + '\n');
