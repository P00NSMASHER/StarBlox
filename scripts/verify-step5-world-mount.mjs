import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { verifyStep5MountedWorld } from '../src/robloxWorld/worldMountVerification.js';

function arg(name){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : null;
}
function sha256(bytes){return createHash('sha256').update(bytes).digest('hex');}

const isolatedPath=arg('--isolated-dom');
const mountedPath=arg('--mounted-dom');
const lockPath=arg('--lock');
const baselinePath=arg('--baseline');
const before=arg('--baseline-sha-before');
const out=arg('--out');
if(!isolatedPath || !mountedPath || !lockPath || !baselinePath || !before || !out){
  throw new Error('--isolated-dom, --mounted-dom, --lock, --baseline, --baseline-sha-before, and --out are required');
}
const [isolatedDom,mountedDom,lock,baselineBytes]=await Promise.all([
  readFile(isolatedPath,'utf8').then(JSON.parse),
  readFile(mountedPath,'utf8').then(JSON.parse),
  readFile(lockPath,'utf8').then(JSON.parse),
  readFile(baselinePath)
]);
const receipt=verifyStep5MountedWorld({
  isolatedDom,
  mountedDom,
  exactnessLock:lock,
  baselineShaBefore:before,
  baselineShaAfter:sha256(baselineBytes)
});
await writeFile(out,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
