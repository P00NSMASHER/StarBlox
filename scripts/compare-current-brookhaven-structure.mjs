import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {buildCurrentBrookhavenStructureComparison} from '../src/robloxWorld/currentBrookhavenStructureCompare.js';

function arg(name){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : null;
}

const candidateDomPath=arg('--candidate-dom');
const referenceDomPath=arg('--reference-dom');
const candidateReceiptPath=arg('--candidate-receipt');
const out=arg('--out');

if(!candidateDomPath || !referenceDomPath || !candidateReceiptPath || !out){
  throw new Error('--candidate-dom, --reference-dom, --candidate-receipt, and --out are required');
}

const [candidateDom,referenceDom,candidateReceipt]=await Promise.all([
  readFile(resolve(candidateDomPath),'utf8').then(JSON.parse),
  readFile(resolve(referenceDomPath),'utf8').then(JSON.parse),
  readFile(resolve(candidateReceiptPath),'utf8').then(JSON.parse)
]);

const receipt=buildCurrentBrookhavenStructureComparison({
  candidateDom,
  referenceDom,
  candidateReceipt
});

await writeFile(resolve(out),JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
