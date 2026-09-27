import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {
  buildCurrentBrookhavenBehaviorParityReceipt
} from '../src/robloxWorld/currentBrookhavenBehaviorParity.js';

function arg(name){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : null;
}

const evidencePath=arg('--evidence');
const referenceTracePath=arg('--reference-trace');
const candidateTracePath=arg('--candidate-trace');
const reviewPath=arg('--review');
const out=arg('--out');

if(!evidencePath || !referenceTracePath || !candidateTracePath || !reviewPath || !out){
  throw new Error('--evidence, --reference-trace, --candidate-trace, --review, and --out are required');
}

const [evidenceReceipt,referenceTraceBytes,candidateTraceBytes,humanReview]=await Promise.all([
  readFile(resolve(evidencePath),'utf8').then(JSON.parse),
  readFile(resolve(referenceTracePath)),
  readFile(resolve(candidateTracePath)),
  readFile(resolve(reviewPath),'utf8').then(JSON.parse)
]);

const receipt=buildCurrentBrookhavenBehaviorParityReceipt({
  evidenceReceipt,
  referenceTraceBytes,
  candidateTraceBytes,
  humanReview
});
await writeFile(resolve(out),JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
