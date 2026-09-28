/** Offline-only build/test entry point. No deployment, credentials, downloads or paid calls. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
function argument(name, fallback) {
  const at = argv.indexOf(name);
  if (at === -1) return fallback;
  if (!argv[at + 1] || argv[at + 1].startsWith('--')) throw new Error(`Missing ${name} value`);
  return argv[at + 1];
}
const commands = {
  rojo: argument('--rojo', 'rojo'), luau: argument('--luau', 'luau'),
  compile: argument('--compile', 'luau-compile'), analyze: argument('--analyze', 'luau-analyze'),
};
function run(executable, args) {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${path.basename(executable)} failed: ${result.error?.message ?? ''}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  if (result.stdout?.trim()) console.log(result.stdout.trim());
  if (result.stderr?.trim()) console.log(result.stderr.trim());
  return result.stdout ?? '';
}
function filesUnder(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink forbidden in isolated build: ${full}`);
    return entry.isDirectory() ? filesUnder(full) : [full];
  }).sort();
}
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
try {
  const projectFile = path.join(root, 'default.project.json');
  const project = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
  const approvedPaths = new Set(['src/shared', 'src/server', 'src/client']);
  function verify(node) {
    if (!node || typeof node !== 'object') return;
    if ('$path' in node) {
      if (!approvedPaths.has(node.$path)) throw new Error(`Unapproved project mapping: ${node.$path}`);
      const resolved = fs.realpathSync(path.resolve(root, node.$path));
      if (!resolved.startsWith(root + path.sep)) throw new Error('Project mapping escapes isolated directory');
    }
    for (const value of Object.values(node)) verify(value);
  }
  verify(project.tree);
  const sources = filesUnder(path.join(root, 'src')).filter(name => name.endsWith('.luau') || name.endsWith('.lua'));
  const hashes = Object.fromEntries([projectFile, ...sources].map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))]));
  const sourceFingerprint = sha(JSON.stringify(hashes));
  run(commands.compile, ['--null', ...sources]);
  run(commands.analyze, ['src/shared/Protocol.luau', 'tests/runtime_protocol.spec.luau']);
  const output = run(commands.luau, ['tests/runtime_protocol.spec.luau']);
  const match = output.match(/RESULT (\d+) protocol behavior tests passed/);
  if (!match) throw new Error('Missing explicit protocol-test completion');
  const rojoVersion = run(commands.rojo, ['--version']).trim();
  project.tree.ServerScriptService.LanternIslandServer.BuildIdentity.$properties.Value = sourceFingerprint;
  const generatedProject = path.join(root, '.foundation-build.project.json');
  const dist = path.join(root, 'dist');
  fs.mkdirSync(dist, { recursive: true });
  fs.writeFileSync(generatedProject, JSON.stringify(project, null, 2));
  const artifact = path.join(dist, 'LanternIsland-Foundation.rbxlx');
  try { run(commands.rojo, ['build', generatedProject, '-o', artifact]); }
  finally { fs.rmSync(generatedProject, { force: true }); }
  const bytes = fs.readFileSync(artifact);
  if (!bytes.toString('utf8', 0, 100).includes('<roblox')) throw new Error('Output is not an XML Roblox artifact');
  const receipt = {
    status: 'FOUNDATION_ONLY', builtAt: new Date().toISOString(), sourceFingerprint, sourceHashes: hashes,
    artifact: path.basename(artifact), artifactSha256: sha(bytes), bytes: bytes.length,
    toolchain: { rojo: rojoVersion, luau: '0.740 (externally checksum-verified)' },
    tests: { protocolBehaviorPassed: Number(match[1]), sourcesCompiled: sources.length, pureProtocolTypecheck: 'PASS' },
    robloxEngineExecution: 'NOT_RUN', physicalDeviceInput: 'NOT_RUN', dataStoreRejoin: 'NOT_RUN',
    schoolworkIntegration: 'NOT_INTEGRATED', playableMission: 'NOT_INTEGRATED', publishedTarget: null,
  };
  fs.writeFileSync(path.join(dist, 'foundation-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  console.error(`BUILD FAILED: ${error.message}`);
  process.exitCode = 1;
}
