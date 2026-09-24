
import { readFile,writeFile } from 'node:fs/promises';
import { resolve,isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createGenerationCheckpoint,
  runOfflineGeneration
} from '../src/questionFactory/offlineQuestionFactory.js';

function arg(name,required=false){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (() => {
    const index=process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}

function pathFromRoot(value){
  return isAbsolute(value) ? value : resolve(process.cwd(),value);
}

const chunksPath=pathFromRoot(arg('--chunks',true));
const providerPath=pathFromRoot(arg('--provider',true));
const checkpointPath=pathFromRoot(arg('--checkpoint') || 'question-factory.checkpoint.json');
const requestedRunId=arg('--run-id');

const chunks=JSON.parse(await readFile(chunksPath,'utf8'));
const providerModule=await import(pathToFileURL(providerPath).href);
const provider=providerModule.default || providerModule.provider || providerModule;
if(!provider || typeof provider.generate !== 'function'){
  throw new Error('provider module must export generate(request)');
}

let checkpoint=null;
try{
  checkpoint=JSON.parse(await readFile(checkpointPath,'utf8'));
}catch{}

const runId=requestedRunId || checkpoint?.runId || ('manual-' + new Date().toISOString().replace(/[:.]/g,'-'));
if(!checkpoint) checkpoint=createGenerationCheckpoint({runId});

const result=await runOfflineGeneration({
  chunks,
  provider,
  runId,
  checkpoint,
  onCheckpoint:value => writeFile(checkpointPath,JSON.stringify(value,null,2))
});

await writeFile(checkpointPath,JSON.stringify(result,null,2));
console.log(
  'Question generation complete: ' +
  result.candidates.length +
  ' candidates; ' +
  result.errors.length +
  ' errors. Checkpoint: ' +
  checkpointPath
);
