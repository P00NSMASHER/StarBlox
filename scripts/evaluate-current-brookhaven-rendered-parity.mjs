import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {
  buildCurrentBrookhavenRenderedParityReceipt
} from '../src/robloxWorld/currentBrookhavenRenderedParity.js';

function arg(name){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : null;
}

const evidencePath=arg('--evidence');
const automatedPath=arg('--automated');
const reviewPath=arg('--review');
const policyPath=arg('--policy');
const out=arg('--out');

if(!evidencePath || !automatedPath || !reviewPath || !out){
  throw new Error('--evidence, --automated, --review, and --out are required');
}

const [evidenceReceipt,automatedComparison,humanReview,policy]=await Promise.all([
  readFile(resolve(evidencePath),'utf8').then(JSON.parse),
  readFile(resolve(automatedPath),'utf8').then(JSON.parse),
  readFile(resolve(reviewPath),'utf8').then(JSON.parse),
  policyPath
    ? readFile(resolve(policyPath),'utf8').then(JSON.parse)
    : Promise.resolve(undefined)
]);

const receipt=buildCurrentBrookhavenRenderedParityReceipt({
  evidenceReceipt,
  automatedComparison,
  humanReview,
  policy
});

await writeFile(resolve(out),JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
