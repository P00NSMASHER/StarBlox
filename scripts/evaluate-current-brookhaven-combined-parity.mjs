import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {
  buildCurrentBrookhavenCombinedParityGate
} from '../src/robloxWorld/currentBrookhavenCombinedParityGate.js';

function arg(name){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : null;
}

const structuralPath=arg('--structural');
const renderedPath=arg('--rendered');
const behaviorDir=arg('--behavior-dir');
const out=arg('--out');

if(!structuralPath || !renderedPath || !behaviorDir || !out){
  throw new Error('--structural, --rendered, --behavior-dir, and --out are required');
}

const directory=resolve(behaviorDir);
const files=(await readdir(directory))
  .filter(name=>name.endsWith('.json'))
  .sort();
if(files.length===0) throw new Error('behavior-dir contains no JSON receipts');

const [structuralComparison,renderedParityReceipt,behaviorParityReceipts]=await Promise.all([
  readFile(resolve(structuralPath),'utf8').then(JSON.parse),
  readFile(resolve(renderedPath),'utf8').then(JSON.parse),
  Promise.all(files.map(name=>readFile(join(directory,name),'utf8').then(JSON.parse)))
]);

const receipt=buildCurrentBrookhavenCombinedParityGate({
  structuralComparison,
  renderedParityReceipt,
  behaviorParityReceipts
});
await writeFile(resolve(out),JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
