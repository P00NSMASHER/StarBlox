import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {
  buildCurrentBrookhavenBehaviorEvidenceReceipt
} from '../src/robloxWorld/currentBrookhavenBehaviorEvidence.js';

function arg(name){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : null;
}

const renderedPath=arg('--rendered');
const referenceTracePath=arg('--reference-trace');
const candidateTracePath=arg('--candidate-trace');
const out=arg('--out');

if(!renderedPath || !referenceTracePath || !candidateTracePath || !out){
  throw new Error('--rendered, --reference-trace, --candidate-trace, and --out are required');
}

const [renderedParityReceipt,referenceTraceBytes,candidateTraceBytes]=await Promise.all([
  readFile(resolve(renderedPath),'utf8').then(JSON.parse),
  readFile(resolve(referenceTracePath)),
  readFile(resolve(candidateTracePath))
]);

const receipt=buildCurrentBrookhavenBehaviorEvidenceReceipt({
  renderedParityReceipt,
  referenceTraceBytes,
  candidateTraceBytes
});
await writeFile(resolve(out),JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
